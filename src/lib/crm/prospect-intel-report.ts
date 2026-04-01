/**
 * Rule-based market intel (software / AI / growth) from public signals.
 * No LLM — extend later with optional OpenAI over extracted text.
 */

export type IntelSignals = {
  name?: string | null;
  hasWebsite: boolean;
  websiteUrl?: string | null;
  https?: boolean;
  pageTitle?: string | null;
  metaDescription?: string | null;
  rating?: number | null;
  reviewCount?: number | null;
  placeTypes?: string[] | null;
  formattedAddress?: string | null;
};

export type MarketIntelReport = {
  software: string[];
  aiAutomations: string[];
  productGrowth: string[];
  summary: string;
};

function nonEmpty(s: string | null | undefined): boolean {
  return Boolean(s && s.trim().length > 0);
}

const typesHaystack = (placeTypes: string[] | null | undefined): string =>
  (placeTypes ?? []).join(" ").toLowerCase();

/** Broad local / high-touch businesses (Google Places type substrings). */
function isLocalService(types: string): boolean {
  return /restaurant|cafe|meal_takeaway|bakery|food|store|gym|spa|salon|hair_care|beauty|plumber|electrician|roofing|contractor|dentist|doctor|physician|health|lawyer|attorney|real_estate|car_repair|car_dealer|lodging|travel_agency|pharmacy|veterinary/.test(
    types
  );
}

function isRestaurant(types: string): boolean {
  return /restaurant|cafe|meal_takeaway|bakery|bar|meal_delivery/.test(types);
}

function isFitnessWellness(types: string): boolean {
  return /gym|fitness|yoga|spa|beauty_salon|hair_care/.test(types);
}

function isHealthMedical(types: string): boolean {
  return /dentist|doctor|physician|hospital|pharmacy|veterinary|health/.test(types);
}

function isLegal(types: string): boolean {
  return /lawyer|attorney/.test(types);
}

function isRealEstate(types: string): boolean {
  return /real_estate/.test(types);
}

function isHomeTrade(types: string): boolean {
  return /plumber|electrician|roofing|locksmith|hvac|general_contractor|painter/.test(
    types
  );
}

function isRetail(types: string): boolean {
  return /store|shopping_mall|clothing_store|jewelry_store|furniture_store|book_store/.test(
    types
  );
}

const DEFAULT_AI_GTM: string[] = [
  "Website assistant (rules-first or light AI): answer services, hours, service area, and “how much does X cost?” with guardrails — capture name + phone + job type, then SMS the owner. Strong angle for after-hours and mobile Google traffic.",
  "Lead magnet tailored to the niche: printable checklist, cost estimator, or “questions to ask before you hire” PDF — one landing page + email capture. Use as your outreach hook (“we sketched a magnet idea for [their segment]”).",
  "Speed-to-lead automation: form or chat submit → instant SMS + email to the prospect (“we got your request”) and a task for staff — optional AI draft of a personalized follow-up the owner edits before send.",
  "Repeatable doc flow: AI-assisted first drafts of quotes, scopes, or proposals from a short intake form — cuts turnaround vs competitors still copying Word templates.",
];

const DEFAULT_SOFTWARE: string[] = [
  "Ship or tighten a conversion-focused web surface: fast mobile experience, clear primary CTA (call, book, quote), and structured data for local/organic — reduces bounce from high-intent clicks.",
  "Integrations that stop lead leakage: form/chat → CRM or spreadsheet, calendar holds for estimates, optional payments for deposits — fewer “forgot to call back” losses.",
];

const DEFAULT_GROWTH: string[] = [
  "Baseline funnel measurement: conversion events on calls, forms, and chat; monthly review of top queries and landing pages — so growth bets are tied to real demand, not guesses.",
  "Offer packaging tests: headline + guarantee + one proof block on the hero — small A/B or before/after on the same traffic often beats new ad spend.",
];

function pushUnique(arr: string[], line: string, max: number) {
  const t = line.trim();
  if (!t || arr.includes(t) || arr.length >= max) return;
  arr.push(t);
}

/** AI / GTM bullets can run longer; allow more items per carousel slide. */
function pushAi(arr: string[], line: string) {
  pushUnique(arr, line, 10);
}

function pushSoft(arr: string[], line: string) {
  pushUnique(arr, line, 7);
}

function pushGrowth(arr: string[], line: string) {
  pushUnique(arr, line, 7);
}

function ensureMinimum(
  arr: string[],
  defaults: readonly string[],
  min: number,
  maxLen: number
) {
  for (const line of defaults) {
    if (arr.length >= min) break;
    pushUnique(arr, line, maxLen);
  }
}

export function buildMarketIntelReport(signals: IntelSignals): MarketIntelReport {
  const software: string[] = [];
  const aiAutomations: string[] = [];
  const productGrowth: string[] = [];

  const types = typesHaystack(signals.placeTypes);

  if (!signals.hasWebsite) {
    pushSoft(
      software,
      "No public website listed — start with a single high-converting landing (offer, proof, one CTA) plus click-to-call; expand to full site once messaging converts."
    );
    pushGrowth(
      productGrowth,
      "Own your funnel: first-party site + UTM-tagged links from GMB/social so you can attribute calls and forms — essential before scaling paid search or partners."
    );
    pushAi(
      aiAutomations,
      "GTM wedge: “free homepage + chat” pitch — launch a minimal page with FAQ chat and quote form; proves value fast and creates upsell path to booking, payments, and CRM hooks."
    );
  } else {
    if (signals.https === false) {
      pushSoft(
        software,
        "Site not served over HTTPS — fix for trust, SEO, and form security; quick win before adding chat, payments, or lead capture."
      );
    }
    pushAi(
      aiAutomations,
      "On-site chat or embedded assistant on the existing URL: qualify service + urgency, offer scheduling or callback — reduces abandonment when people don’t want to call."
    );
    if (nonEmpty(signals.metaDescription) && signals.metaDescription!.trim().length < 80) {
      pushGrowth(
        productGrowth,
        "Meta description is thin — rewrite for one clear outcome + geography/service; lifts organic CTR and aligns ad/organic messaging for the same landing page."
      );
    }
    if (!nonEmpty(signals.pageTitle)) {
      pushSoft(
        software,
        "Weak or missing page title — hurts SEO and link previews; pair with Open Graph tags when you pitch a content or social referral program."
      );
    }
  }

  if (
    signals.reviewCount != null &&
    signals.reviewCount < 20 &&
    signals.rating != null &&
    signals.rating >= 3.5
  ) {
    pushGrowth(
      productGrowth,
      "Review volume is modest — automate post-job SMS/email (“How did we do?”) with a direct link; stack with a simple referral incentive in the same flow."
    );
    pushAi(
      aiAutomations,
      "AI-drafted personalized review requests from job type + customer name (owner approves send) — increases completion rate vs generic blast templates."
    );
  }

  if (signals.rating != null && signals.rating < 4) {
    pushGrowth(
      productGrowth,
      "Rating headroom — pair operational fixes with visible response on reviews; ticketing + SLA reminders prevent issues that show up as one-star spikes."
    );
    pushSoft(
      software,
      "Customer comms hub: shared inbox for SMS/email/reviews with assignment — so nothing falls through while you improve the underlying service."
    );
  }

  if (isRestaurant(types)) {
    pushAi(
      aiAutomations,
      "Menu, hours, and dietary FAQ bot + “Book a table” / ordering deep links — captures tourists and voice-searchers who won’t read a PDF menu."
    );
    pushGrowth(
      productGrowth,
      "Lead magnet: “private event / catering one-pager” or seasonal menu PDF behind email — fuels B2B and party inquiries beyond walk-in traffic."
    );
    pushSoft(
      software,
      "Reservations or waitlist integration on the hero — if they still rely on phone-only peak hours, that’s revenue left on the table."
    );
  } else if (isFitnessWellness(types)) {
    pushAi(
      aiAutomations,
      "Trial or class-pack assistant: goals, schedule, location → suggest program + book intro — reduces front-desk back-and-forth and no-shows with SMS reminders."
    );
    pushGrowth(
      productGrowth,
      "Magnet: free “7-day reset” or mobility checklist PDF — segment leads by goal for email/SMS nurture into membership."
    );
  } else if (isHealthMedical(types)) {
    pushAi(
      aiAutomations,
      "Pre-visit intake and insurance FAQ assistant — collects demographics and reason for visit; staff gets a structured summary (HIPAA-scoped design in scope)."
    );
    pushGrowth(
      productGrowth,
      "Trust content as magnet: “what to expect first visit” or condition-specific checklist — captures high-intent searchers comparing providers."
    );
  } else if (isLegal(types)) {
    pushAi(
      aiAutomations,
      "Intake bot triages practice area and urgency — routes to the right form and discourages off-scope leads early; owner reviews sensitive replies before client-facing send."
    );
    pushGrowth(
      productGrowth,
      "Gated guide: “before you sign / questions for your [practice area] consult” — positions you as educator and gives a natural reason to follow up."
    );
  } else if (isRealEstate(types)) {
    pushAi(
      aiAutomations,
      "Listing Q&A + buyer/seller assistant (neighborhood, schools, process timeline) with handoff to agent calendar — scales first-touch without losing human close."
    );
    pushGrowth(
      productGrowth,
      "Valuation or “what’s my home worth” mini-flow as lead magnet — pair with automated market snapshot email sequence."
    );
  } else if (isHomeTrade(types)) {
    pushAi(
      aiAutomations,
      "Emergency vs routine triage chat: zip + issue type + photos upload prompt → dispatches to on-call tech and sends ETA template — wins “need someone now” searches."
    );
    pushSoft(
      software,
      "Estimate request → calendar slot + crew assignment — reduces phone tag and makes same-day response a competitive differentiator."
    );
  } else if (isRetail(types)) {
    pushAi(
      aiAutomations,
      "Store assistant: hours, parking, inventory FAQs (“Do you carry X?”), and promotions — bridge online discovery to in-store visit or BOPIS if they add ecommerce later."
    );
    pushGrowth(
      productGrowth,
      "Local SEO + structured events/sales pages; magnet could be loyalty signup or stylist/design consult for high-AOV categories."
    );
  }

  if (isLocalService(types) && !isRestaurant(types) && !isRetail(types)) {
    pushAi(
      aiAutomations,
      "Missed-call SMS + booking reminders + review requests in one automation stack — classic local GTM stack; position as “done in two weeks” implementation."
    );
    pushSoft(
      software,
      "Customer booking portal or embedded scheduler if they’re phone-heavy — unlocks 24/7 capture without more headcount."
    );
  }

  ensureMinimum(software, DEFAULT_SOFTWARE, 2, 7);
  ensureMinimum(aiAutomations, DEFAULT_AI_GTM, 4, 10);
  ensureMinimum(productGrowth, DEFAULT_GROWTH, 2, 7);

  const name = signals.name?.trim() || "This business";
  const summary = `${name}: lead with a tangible wedge (on-site chat, niche lead magnet, or speed-to-lead automation), back it with a credible web surface and integrations so leads don’t leak, then instrument conversions and iterate offers — frame every touch as measurable GTM, not generic “AI.”`;

  return { software, aiAutomations, productGrowth, summary };
}
