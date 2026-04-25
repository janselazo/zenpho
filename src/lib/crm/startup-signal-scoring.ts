import { tierFromScore } from "@/lib/crm/prospect-intel-tech-signals";
import type {
  StartupSignalFitScore,
  StartupSignalHit,
} from "@/lib/crm/startup-signal-types";

type RawHit = Omit<StartupSignalHit, "fit" | "detectedAt">;

const URGENT_DEV_RE =
  /\b(looking for|need|hiring|recommend|anyone know).{0,40}\b(dev|developer|engineer|agency|cto|technical co[-\s]?founder)\b/i;
const FUNDING_RE =
  /\b(raised|funding|funded|pre[-\s]?seed|seed round|series a|series b|angel round)\b/i;
const LAUNCH_RE =
  /\b(launched|launching|just shipped|just built|product hunt|techcrunch|show hn|mvp|prototype)\b/i;
const NO_CODE_RE = /\b(no[-\s]?code|bubble|webflow|framer|wix|squarespace|carrd)\b/i;
const FRUSTRATION_RE =
  /\b(frustrated|stuck|broken|slow|bugs?|technical debt|scal(e|ing)|rebuild|outgrew|outgrown)\b/i;

function hoursSince(iso: string | null): number {
  if (!iso) return Infinity;
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return Infinity;
  return (Date.now() - t) / (1000 * 60 * 60);
}

function textFor(hit: RawHit): string {
  return `${hit.title}\n${hit.excerpt ?? ""}\n${hit.company ?? ""}`.toLowerCase();
}

export function computeStartupSignalFitScore(hit: RawHit): StartupSignalFitScore {
  const breakdown: { label: string; points: number }[] = [];
  const intentKeys: string[] = [];
  const text = textFor(hit);

  if (URGENT_DEV_RE.test(text)) {
    breakdown.push({ label: "Explicitly looking for technical help", points: 35 });
    intentKeys.push("needs_dev");
  }

  if (FUNDING_RE.test(text) || hit.channel === "funding") {
    breakdown.push({ label: "Funding / fresh budget signal", points: 25 });
    intentKeys.push("funding");
  }

  if (LAUNCH_RE.test(text) || hit.channel === "launches") {
    breakdown.push({ label: "Recent launch / MVP moment", points: 20 });
    intentKeys.push("launch");
  }

  if (NO_CODE_RE.test(text)) {
    breakdown.push({ label: "No-code or starter-stack signal", points: 15 });
    intentKeys.push("no_code");
  }

  if (FRUSTRATION_RE.test(text)) {
    breakdown.push({ label: "Development pain / rebuild language", points: 20 });
    intentKeys.push("dev_pain");
  }

  if (hit.authorName || hit.authorUrl) {
    breakdown.push({ label: "Reachable founder/person signal", points: 10 });
  }

  if (hit.companyDomain) {
    breakdown.push({ label: "Company domain available", points: 10 });
  }

  const hours = hoursSince(hit.postedAt);
  if (hours <= 24 * 7) {
    breakdown.push({ label: "Signal from last 7 days", points: 15 });
    intentKeys.push("recent");
  } else if (hours <= 24 * 30) {
    breakdown.push({ label: "Signal from last 30 days", points: 5 });
  }

  const score = Math.min(
    100,
    breakdown.reduce((sum, item) => sum + item.points, 0)
  );

  return {
    score,
    tier: tierFromScore(score),
    breakdown,
    intentKeys: [...new Set(intentKeys)],
  };
}

export function scoreStartupSignalHit(
  hit: RawHit,
  now = new Date()
): StartupSignalHit {
  return {
    ...hit,
    detectedAt: now.toISOString(),
    fit: computeStartupSignalFitScore(hit),
  };
}
