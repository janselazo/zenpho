import type {
  StartupSignalChannel,
  StartupSignalSource,
} from "@/lib/crm/startup-signal-types";

export const STARTUP_SIGNAL_DEFAULT_KEYWORDS = [
  "seed funding",
  "raised",
  "excited to announce",
  "looking for developer",
  "need an agency",
  "MVP",
  "technical cofounder",
  "no-code",
  "developer recommendation",
] as const;

export const SIGNAL_QUERY_PRESETS: Record<StartupSignalSource, string[]> = {
  crunchbase: ["seed funding", "pre-seed funding", "series a funding", "raised"],
  wellfound: ["new startup", "hiring founder", "MVP", "developer tools"],
  product_hunt: ["MVP", "AI", "SaaS", "productivity", "developer tools"],
  techcrunch: ["raises seed", "raises series a", "launches", "startup funding"],
  reddit: ["looking for a developer", "need a developer", "MVP", "no-code"],
  x_twitter: [
    "\"looking for developer\"",
    "\"need an agency\"",
    "\"MVP\"",
    "\"seed funding\"",
    "\"raised\"",
  ],
  linkedin_public: [
    "\"excited to announce\" \"seed funding\" \"raised\"",
    "\"looking for developer\" startup",
    "\"need an agency\" MVP",
  ],
  linkedin_activity: ["profile visitor", "post engager", "notification"],
  facebook_groups: [
    "\"does anyone know a good developer\"",
    "\"looking for developer\"",
    "\"need an agency\"",
  ],
  indie_hackers: ["development frustration", "MVP", "no-code", "looking for developer"],
};

export const SOURCES_BY_CHANNEL: Record<StartupSignalChannel, StartupSignalSource[]> = {
  funding: ["crunchbase", "wellfound"],
  launches: ["product_hunt", "techcrunch"],
  social_intent: [
    "linkedin_public",
    "x_twitter",
    "facebook_groups",
    "reddit",
    "indie_hackers",
  ],
  linkedin_activity: ["linkedin_activity"],
};

export function defaultKeywordsForSources(sources: StartupSignalSource[]): string[] {
  const out = new Set<string>();
  for (const source of sources) {
    for (const keyword of SIGNAL_QUERY_PRESETS[source] ?? []) out.add(keyword);
  }
  if (out.size === 0) {
    STARTUP_SIGNAL_DEFAULT_KEYWORDS.forEach((keyword) => out.add(keyword));
  }
  return [...out];
}

export function sourcesForChannels(channels: StartupSignalChannel[]): StartupSignalSource[] {
  const out = new Set<StartupSignalSource>();
  for (const channel of channels) {
    (SOURCES_BY_CHANNEL[channel] ?? []).forEach((source) => out.add(source));
  }
  return [...out];
}
