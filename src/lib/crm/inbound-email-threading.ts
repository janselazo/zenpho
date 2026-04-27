/**
 * Helpers for SendGrid Inbound Parse: match prospect replies to outbound Message-IDs and
 * parse RFC 5322-style header blocks (including folded lines).
 */

import type { SupabaseClient } from "@supabase/supabase-js";

/** Variants to try when matching In-Reply-To / References to our stored `email_message_id`. */
export function messageIdMatchCandidates(raw: string | null | undefined): string[] {
  if (!raw?.trim()) return [];
  const seen = new Set<string>();
  const add = (s: string) => {
    const t = s.trim();
    if (t) seen.add(t);
  };

  for (const token of raw.split(/\s+/)) {
    const t = token.trim();
    if (!t) continue;
    add(t);
    const unbr = t.replace(/^<|>$/g, "").trim();
    if (unbr) {
      add(unbr);
      add(`<${unbr}>`);
    }
  }
  return [...seen];
}

/**
 * Parse a raw header block (as SendGrid sends in the `headers` field) into lowercase keys.
 * Continuation lines (starting with WSP) are folded into the previous header value.
 */
export function parseRawHeaderBlock(raw: string): Record<string, string> {
  const out: Record<string, string> = {};
  if (!raw?.trim()) return out;

  const lines = raw.split(/\r?\n/);
  let currentKey: string | null = null;

  for (const line of lines) {
    if (/^[ \t]/.test(line) && currentKey) {
      out[currentKey] += " " + line.trim();
      continue;
    }
    const m = line.match(/^([^:]+):\s*(.*)$/);
    if (m) {
      currentKey = m[1].trim().toLowerCase();
      out[currentKey] = m[2].trim();
    } else {
      currentKey = null;
    }
  }
  return out;
}

function extractAllMessageIdLikeTokens(refs: string): string[] {
  const re = /<[^>\s]+>/g;
  const found: string[] = [];
  let m: RegExpExecArray | null;
  const s = refs.trim();
  while ((m = re.exec(s)) !== null) {
    found.push(m[0]);
  }
  return found;
}

/**
 * Resolve `conversation_id` by matching In-Reply-To and References to stored outbound IDs.
 */
export async function findConversationIdByThreading(
  supabase: SupabaseClient,
  inReplyTo: string | null,
  references: string | null
): Promise<string | null> {
  const keys = new Set<string>();
  if (inReplyTo) {
    for (const c of messageIdMatchCandidates(inReplyTo)) keys.add(c);
  }
  if (references?.trim()) {
    for (const t of extractAllMessageIdLikeTokens(references)) {
      for (const c of messageIdMatchCandidates(t)) keys.add(c);
    }
  }

  const list = [...keys].filter(Boolean);
  if (list.length === 0) return null;

  const { data: rows } = await supabase
    .from("conversation_message")
    .select("conversation_id, email_message_id")
    .in("email_message_id", list)
    .limit(5);

  if (rows && rows.length > 0) {
    return (rows[0] as { conversation_id: string }).conversation_id;
  }
  return null;
}
