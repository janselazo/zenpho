#!/usr/bin/env node
// Scope every rule in design-handoff/styles.css under `.marketing-page-bg`
// so it cannot leak into the CRM/web app theme. Run once after every fresh
// export from Claude Design:
//
//   node scripts/scope-marketing-css.mjs
//
// Output: src/styles/marketing.css

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import safeParser from "postcss-safe-parser";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "..");
const SRC = resolve(repoRoot, "design-handoff/styles.css");
const OUT = resolve(repoRoot, "src/styles/marketing.css");
const SCOPE = ".marketing-page-bg";

// Selectors that target the document root / body should *become* the scope.
const ROOT_SELECTORS = new Set([":root", "html", "body", "html, body"]);

// Asset path remap: design-handoff/{assets,uploads}/<file> → /marketing/<file>
function remapAssetUrls(value) {
  if (!value) return value;
  return value
    .replace(/url\(\s*(['"]?)\.\.\/assets\/([^'")]+)\1\s*\)/g, "url($1/marketing/$2$1)")
    .replace(/url\(\s*(['"]?)\.\.\/uploads\/([^'")]+)\1\s*\)/g, "url($1/marketing/uploads/$2$1)")
    .replace(/url\(\s*(['"]?)assets\/([^'")]+)\1\s*\)/g, "url($1/marketing/$2$1)")
    .replace(/url\(\s*(['"]?)uploads\/([^'")]+)\1\s*\)/g, "url($1/marketing/uploads/$2$1)");
}

function scopeSelector(sel) {
  const s = sel.trim();
  if (!s) return s;
  // Leave keyframe percentage selectors (handled by ancestor at-rule walker)
  if (/^\d/.test(s) || s === "from" || s === "to") return s;

  // Root-ish selectors collapse to the scope itself.
  if (ROOT_SELECTORS.has(s)) return SCOPE;
  if (s === "*") return `${SCOPE} *`;
  if (s.startsWith("body.dark")) return s.replace(/^body\.dark/, `${SCOPE}.dark`);
  if (s.startsWith("body ")) return s.replace(/^body\s+/, `${SCOPE} `);
  if (s === "::selection") return `${SCOPE} ::selection`;
  if (s.startsWith("::")) return `${SCOPE} ${s}`;

  // Default: scope as descendant.
  return `${SCOPE} ${s}`;
}

function scopeSelectorList(list) {
  const scoped = list
    .split(",")
    .map((s) => scopeSelector(s));
  // Dedupe so `html, body` doesn't collapse to two identical scopes.
  return [...new Set(scoped)].join(", ");
}

// Remap font-family references from the literal font names (loaded via
// <link> in the design export) to the next/font CSS variables defined in
// src/app/layout.tsx. Marketing site only.
function remapFontFamily(value) {
  if (!value) return value;
  return value
    .replace(/"Plus Jakarta Sans"/g, "var(--font-marketing-sans)")
    .replace(/"Instrument Serif"/g, "var(--font-marketing-serif)")
    .replace(/"JetBrains Mono"/g, "var(--font-marketing-mono)");
}

if (!existsSync(SRC)) {
  console.error(`Source not found: ${SRC}`);
  process.exit(1);
}

const rawCss = readFileSync(SRC, "utf8");

// Claude Design exports occasionally leave declarations + a stray `}` orphaned
// after an already-closed rule, e.g.:
//
//   .a em { color: red; }    <-- already closed
//     font-weight: 500;      <-- orphan
//     font-size: 1.08em;     <-- orphan
//   }                        <-- orphan
//
// Pre-process with a depth-tracking scanner so we drop any tokens that fall
// outside a `{ ... }` block. We strip:
//   - `<ident>:<value>;` declarations at depth 0
//   - stray `}` at depth 0
//
// String literals (`"..."`, `'...'`) and `/* comments */` are skipped so we
// don't break SVG data: URLs containing braces.
function stripOrphans(src) {
  const out = [];
  let depth = 0;
  let i = 0;
  const len = src.length;
  while (i < len) {
    const ch = src[i];

    // Comments.
    if (ch === "/" && src[i + 1] === "*") {
      const end = src.indexOf("*/", i + 2);
      const stop = end === -1 ? len : end + 2;
      out.push(src.slice(i, stop));
      i = stop;
      continue;
    }
    // String literals.
    if (ch === '"' || ch === "'") {
      const quote = ch;
      let j = i + 1;
      while (j < len) {
        if (src[j] === "\\") {
          j += 2;
          continue;
        }
        if (src[j] === quote) {
          j += 1;
          break;
        }
        j += 1;
      }
      out.push(src.slice(i, j));
      i = j;
      continue;
    }

    if (ch === "{") {
      depth += 1;
      out.push(ch);
      i += 1;
      continue;
    }

    if (ch === "}") {
      if (depth === 0) {
        // Drop the orphan closing brace.
        i += 1;
        continue;
      }
      depth -= 1;
      out.push(ch);
      i += 1;
      continue;
    }

    if (depth === 0) {
      // Outside any rule: look for an orphan declaration like `name: value;`.
      // Only treat as orphan if we can find the next `;` or newline-then-`}`
      // before encountering a `{` (which would make it a selector).
      // Find earliest `{`, `;`, `}` after current position.
      const nextOpen = src.indexOf("{", i);
      const nextSemi = src.indexOf(";", i);
      const nextClose = src.indexOf("}", i);
      const candidates = [nextOpen, nextSemi, nextClose].filter((n) => n !== -1);
      if (candidates.length === 0) {
        out.push(src.slice(i));
        break;
      }
      const earliest = Math.min(...candidates);
      // If this run contains a `:` and ends at `;`/`}` BEFORE the next `{`,
      // it's an orphan declaration — drop the run up to (and including) `;`.
      const run = src.slice(i, earliest + 1);
      const hasColon = /\b[a-zA-Z-][\w-]*\s*:/.test(run);
      if (earliest === nextSemi && hasColon && (nextOpen === -1 || nextSemi < nextOpen)) {
        i = nextSemi + 1;
        continue;
      }
      if (earliest === nextClose && hasColon && (nextOpen === -1 || nextClose < nextOpen)) {
        // Orphan declaration that ended at a stray `}` (no semicolon).
        i = nextClose; // let the next iteration drop the `}`.
        continue;
      }
      // Otherwise this is regular at-rule / selector text — keep it.
      out.push(src[i]);
      i += 1;
      continue;
    }

    out.push(ch);
    i += 1;
  }
  return out.join("");
}

const css = stripOrphans(rawCss);
const root = safeParser(css);

root.walkAtRules((at) => {
  if (at.name === "font-face") {
    // Skip — we use next/font instead of @font-face here.
    at.remove();
  }
});

root.walkDecls((decl) => {
  if (typeof decl.value !== "string") return;
  if (decl.value.includes("url(")) {
    decl.value = remapAssetUrls(decl.value);
  }
  // Catches `font-family`, `--display`, `--serif`, `--body`, `--mono`.
  if (
    decl.prop === "font-family" ||
    decl.prop === "font" ||
    decl.prop === "--display" ||
    decl.prop === "--serif" ||
    decl.prop === "--body" ||
    decl.prop === "--mono"
  ) {
    decl.value = remapFontFamily(decl.value);
  }
});

root.walkRules((rule) => {
  // Don't rescope rules inside @keyframes — those use percentage / from/to.
  const parent = rule.parent;
  if (parent && parent.type === "atrule" && parent.name === "keyframes") return;
  rule.selector = scopeSelectorList(rule.selector);
});

// Drop the @import for Google Fonts — next/font owns this now.
root.walkAtRules("import", (at) => {
  if (/fonts\.googleapis\.com/.test(at.params)) at.remove();
});

const header = `/*
 * marketing.css — scoped redesign styles (Renaissance/Editorial).
 *
 * Auto-generated from design-handoff/styles.css by
 * scripts/scope-marketing-css.mjs. Do NOT edit by hand. Re-run the
 * scoping script after every fresh Claude Design export.
 *
 * Every rule below is prefixed with .marketing-page-bg so it cannot leak
 * into the CRM / web app theme.
 */

`;

// Strip any stray top-level closing braces that the safe parser may have
// preserved from malformed input (Claude Design exports sometimes leave
// declarations + a `}` orphaned after an already-closed rule).
let serialized = root.toString();
// 1) any literal `}` at the very end of the file with only whitespace after it.
serialized = serialized.replace(/\}\s*$/, (match) => {
  // Count opening vs closing braces; if unbalanced (more closes), drop one.
  const opens = (serialized.match(/\{/g) || []).length;
  const closes = (serialized.match(/\}/g) || []).length;
  return closes > opens ? match.replace("}", "").trimEnd() + "\n" : match;
});
// 2) any whole-line `}` that isn't preceded by `{` content (defensive).
serialized = serialized.replace(/(\n)\}(\s*\n\s*)\}(?=\s*$)/g, "$1}$2");

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, header + serialized, "utf8");
console.log(`Wrote ${OUT} (${(serialized.length / 1024).toFixed(1)} KB)`);
