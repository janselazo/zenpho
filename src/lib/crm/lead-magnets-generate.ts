import OpenAI from "openai";
import {
  type IndustryId,
  type LeadMagnetIdea,
  type NicheId,
  getIndustry,
  getNiche,
  searchQueriesForIndustryAndNiche,
} from "@/lib/crm/lead-magnet-industries";

const SERPER_URL = "https://google.serper.dev/search";
const MAX_SNIPPET_CHARS = 14_000;
const SERPER_NUM = 7;
const OPENAI_TIMEOUT_MS = 55_000;

type SerperOrganic = { title?: string; link?: string; snippet?: string };

type SerperResponse = { organic?: SerperOrganic[] };

function trimContext(blocks: string[]): string {
  const combined = blocks.join("\n\n---\n\n");
  if (combined.length <= MAX_SNIPPET_CHARS) return combined;
  return combined.slice(0, MAX_SNIPPET_CHARS) + "\n…";
}

async function serperSearch(
  apiKey: string,
  query: string,
  signal: AbortSignal
): Promise<SerperOrganic[]> {
  const res = await fetch(SERPER_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-KEY": apiKey,
    },
    body: JSON.stringify({ q: query, num: SERPER_NUM }),
    signal,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Serper HTTP ${res.status}: ${text.slice(0, 200)}`);
  }
  const data = (await res.json()) as SerperResponse;
  return Array.isArray(data.organic) ? data.organic : [];
}

function organicsToText(results: SerperOrganic[]): string {
  return results
    .map((o) => {
      const t = (o.title ?? "").trim();
      const u = (o.link ?? "").trim();
      const s = (o.snippet ?? "").trim();
      if (!t && !s) return "";
      return [t, u, s].filter(Boolean).join("\n");
    })
    .filter(Boolean)
    .join("\n\n");
}

const IDEAS_JSON_SCHEMA = {
  name: "lead_magnet_ideas",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    required: ["ideas"],
    properties: {
      ideas: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["title", "description", "format", "angle"],
          properties: {
            title: { type: "string" },
            description: { type: "string" },
            format: {
              type: "string",
              enum: ["Calculator", "Template", "Assessment", "Toolkit", "Other"],
            },
            angle: { type: "string" },
          },
        },
      },
    },
  },
} as const;

function normalizeIdea(raw: {
  title: string;
  description: string;
  format: string;
  angle: string;
}): LeadMagnetIdea {
  const format =
    raw.format === "Calculator" ||
    raw.format === "Template" ||
    raw.format === "Assessment" ||
    raw.format === "Toolkit" ||
    raw.format === "Other"
      ? raw.format
      : ("Other" as const);
  const idea: LeadMagnetIdea = {
    title: raw.title.trim(),
    description: raw.description.trim(),
    format,
  };
  const angle = raw.angle.trim();
  if (angle) idea.angle = angle;
  return idea;
}

export type GenerateLeadMagnetsResult =
  | { ok: true; ideas: LeadMagnetIdea[]; usedWebSearch: boolean }
  | {
      ok: false;
      code: "missing_serper" | "missing_openai" | "search_failed" | "openai_failed";
      message: string;
    };

export async function generateLeadMagnetIdeas(
  industryId: IndustryId,
  nicheId: NicheId
): Promise<GenerateLeadMagnetsResult> {
  const serperKey = process.env.SERPER_API_KEY?.trim();
  const openaiKey = process.env.OPENAI_API_KEY?.trim();

  if (!serperKey) {
    return {
      ok: false,
      code: "missing_serper",
      message:
        "Set SERPER_API_KEY in .env.local (serper.dev) to enable web-backed idea generation.",
    };
  }
  if (!openaiKey) {
    return {
      ok: false,
      code: "missing_openai",
      message: "Set OPENAI_API_KEY in .env.local for lead magnet generation.",
    };
  }

  const industry = getIndustry(industryId);
  if (!industry) {
    return {
      ok: false,
      code: "search_failed",
      message: "Unknown industry.",
    };
  }

  const niche = getNiche(nicheId);
  if (!niche) {
    return {
      ok: false,
      code: "search_failed",
      message: "Unknown niche.",
    };
  }

  const queries = searchQueriesForIndustryAndNiche(industryId, nicheId);
  const searchController = new AbortController();
  const searchTimeout = setTimeout(() => searchController.abort(), 18_000);

  let contextText: string;
  try {
    const settled = await Promise.allSettled(
      queries.map((q) => serperSearch(serperKey, q, searchController.signal))
    );
    clearTimeout(searchTimeout);

    const chunks: string[] = [];
    for (let i = 0; i < settled.length; i++) {
      const r = settled[i];
      if (r.status === "fulfilled") {
        const text = organicsToText(r.value);
        if (text) chunks.push(`Query ${i + 1} results:\n${text}`);
      }
    }
    if (chunks.length === 0) {
      return {
        ok: false,
        code: "search_failed",
        message:
          "Web search returned no results. Check SERPER_API_KEY quota or try again.",
      };
    }
    contextText = trimContext(chunks);
  } catch (e) {
    clearTimeout(searchTimeout);
    const msg = e instanceof Error ? e.message : "Search failed.";
    return { ok: false, code: "search_failed", message: msg };
  }

  const model =
    process.env.OPENAI_LEAD_MAGNET_MODEL?.trim() || "gpt-4o-mini";

  const openai = new OpenAI({
    apiKey: openaiKey,
    timeout: OPENAI_TIMEOUT_MS,
  });

  const system = `You are a product strategist at Zenpho, a software development agency. Your job is to propose lead magnets—interactive tools, templates, assessments, or kits—that attract qualified B2B leads for clients in a given industry.

Rules:
- Output must follow the JSON schema exactly.
- Propose 6–10 distinct, buildable ideas (web apps, calculators, Notion/Sheet templates, PDF kits, etc.).
- Use the web search snippets only as inspiration for what people discuss and what formats work. Do NOT copy titles or sentences verbatim from sources.
- Each idea should feel specific to the industry (and niche, when provided) and actionable for an agency to scope and sell.
- "angle" is optional context (one short phrase); use empty string if none.`;

  const nicheLine =
    nicheId === "vertical_broad"
      ? "Niche: Full vertical — ideas may span the whole industry."
      : `Niche: ${niche.label} — strongly tailor ideas to this sub-vertical; avoid generic ideas that ignore the niche.`;

  const user = `Industry: ${industry.label}
Industry keywords: ${industry.synonyms.join(", ")}
${nicheLine}

Web search snippets (may be noisy):
${contextText}

Return JSON only via the schema: ideas array with title, description, format, and angle (string, may be empty).`;

  try {
    const completion = await openai.chat.completions.create({
      model,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      response_format: {
        type: "json_schema",
        json_schema: IDEAS_JSON_SCHEMA,
      },
    });

    const raw = completion.choices[0]?.message?.content;
    if (!raw) {
      return {
        ok: false,
        code: "openai_failed",
        message: "OpenAI returned an empty response.",
      };
    }

    const parsed = JSON.parse(raw) as {
      ideas?: Array<{
        title: string;
        description: string;
        format: string;
        angle: string;
      }>;
    };
    const list = parsed.ideas;
    if (!Array.isArray(list) || list.length === 0) {
      return {
        ok: false,
        code: "openai_failed",
        message: "Could not parse ideas from the model response.",
      };
    }

    const ideas = list
      .map((x) =>
        normalizeIdea({
          title: String(x.title ?? ""),
          description: String(x.description ?? ""),
          format: String(x.format ?? "Other"),
          angle: String(x.angle ?? ""),
        })
      )
      .filter((i) => i.title.length > 0 && i.description.length > 0);

    if (ideas.length === 0) {
      return {
        ok: false,
        code: "openai_failed",
        message: "Model returned no usable ideas after validation.",
      };
    }

    return { ok: true, ideas, usedWebSearch: true };
  } catch (e) {
    const msg =
      e instanceof Error ? e.message : "OpenAI request failed.";
    return { ok: false, code: "openai_failed", message: msg };
  }
}
