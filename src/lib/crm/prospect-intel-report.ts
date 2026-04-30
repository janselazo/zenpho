/**
 * Rule-based market intel (custom websites / web apps / mobile apps / AI automations)
 * from public signals. No LLM — extend later with optional OpenAI over extracted text.
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
  customWebsites: string[];
  webApps: string[];
  mobileApps: string[];
  aiAutomations: string[];
  summary: string;
};

function nonEmpty(s: string | null | undefined): boolean {
  return Boolean(s && s.trim().length > 0);
}

const typesHaystack = (placeTypes: string[] | null | undefined): string =>
  (placeTypes ?? []).join(" ").toLowerCase();

function humanizePlaceType(t: string): string {
  return t
    .split("_")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/** Primary Google categories for outreach copy (drops generic types). */
export function formatPrimaryCategories(placeTypes: string[] | null | undefined): string | null {
  const skip = new Set(["point_of_interest", "establishment", "geocode"]);
  const picked = (placeTypes ?? []).filter((t) => !skip.has(t));
  const s = picked.slice(0, 4).map(humanizePlaceType).join(" · ");
  return s || null;
}

function hostnameOnly(raw: string): string | null {
  try {
    const u = new URL(/^https?:/i.test(raw) ? raw : `https://${raw}`);
    const h = u.hostname.replace(/^www\./i, "");
    return h || null;
  } catch {
    return null;
  }
}

/** Prepend highly specific lines so Highlights lead with this business, not only playbooks. */
function injectObservedContext(
  signals: IntelSignals,
  customWebsites: string[],
  aiAutomations: string[]
) {
  const name = signals.name?.trim() || "This business";

  function prependUnique(arr: string[], line: string) {
    const t = line.trim();
    if (!t || arr.includes(t)) return;
    arr.unshift(t);
  }

  const primary = formatPrimaryCategories(signals.placeTypes);
  if (primary) {
    prependUnique(
      customWebsites,
      `Google categories for ${name}: ${primary}. Scope marketing site, landing pages, and proof around how buyers compare in that segment.`
    );
  }

  if (signals.rating != null || (signals.reviewCount != null && signals.reviewCount > 0)) {
    const parts: string[] = [];
    if (signals.rating != null) parts.push(`${signals.rating.toFixed(1)}★`);
    if (signals.reviewCount != null) parts.push(`${signals.reviewCount} Google reviews`);
    prependUnique(
      customWebsites,
      `${name} shows ${parts.join(", ")} — surface reviews, guarantees, and CTAs on-site so search and ad traffic converts.`
    );
  }

  if (signals.formattedAddress?.trim()) {
    const a = signals.formattedAddress.trim();
    const short = a.length > 90 ? `${a.slice(0, 88)}…` : a;
    prependUnique(
      customWebsites,
      `Listed address: ${short} — tie local SEO, landing pages, and paid geo to this service area.`
    );
  }

  if (!signals.hasWebsite) {
    prependUnique(
      aiAutomations,
      `${name} has no website on the Google listing — a single high-trust landing + chat or SMS capture is the fastest wedge to prove ROI before broader automation.`
    );
  } else {
    const host = signals.websiteUrl ? hostnameOnly(signals.websiteUrl) : null;
    const scheme =
      signals.https === false ? "http" : signals.https === true ? "https" : null;
    const tail = [host, scheme].filter(Boolean).join(" · ");
    prependUnique(
      customWebsites,
      tail
        ? `Their public URL today (${tail}) — prioritize fixes and CTAs on that path before pitching net-new properties.`
        : `${name} has a site linked from Google — anchor improvements to that live funnel first.`
    );
  }

  if (nonEmpty(signals.pageTitle)) {
    const pt = signals.pageTitle!.trim();
    const clip = pt.length > 110 ? `${pt.slice(0, 108)}…` : pt;
    prependUnique(
      customWebsites,
      `Homepage title observed: “${clip}” — echo this positioning in proposed UX and outbound.`
    );
  }

  if (nonEmpty(signals.metaDescription)) {
    const md = signals.metaDescription!.trim();
    const clip = md.length > 100 ? `${md.slice(0, 98)}…` : md;
    prependUnique(
      customWebsites,
      `Meta description (${md.length} chars): “${clip}” — sharpen outcome + locale if CTR from search is a goal.`
    );
  }
}

function isAutomotive(types: string): boolean {
  return /car_dealer|car_repair|car_wash|gas_station/.test(types);
}

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

const DEFAULT_AI_AUTOMATIONS: string[] = [
  "Website assistant (rules-first or light AI): answer services, hours, service area, and “how much does X cost?” with guardrails — capture name + phone + job type, then SMS the owner. Strong angle for after-hours and mobile Google traffic.",
  "Lead magnet tailored to the niche: printable checklist, cost estimator, or “questions to ask before you hire” PDF — one landing page + email capture. Use as your outreach hook (“we sketched a magnet idea for [their segment]”).",
  "Speed-to-lead automation: form or chat submit → instant SMS + email to the prospect (“we got your request”) and a task for staff — optional AI draft of a personalized follow-up the owner edits before send.",
  "Repeatable doc flow: AI-assisted first drafts of quotes, scopes, or proposals from a short intake form — cuts turnaround vs competitors still copying Word templates.",
];

const DEFAULT_CUSTOM_WEBSITES: string[] = [
  "High-converting marketing site or landing: clear offer, proof, primary CTA (call, book, quote), fast mobile, and structured data for local search.",
  "Baseline measurement on the site: conversion events on calls, forms, and chat; monthly review of top queries and landing pages — so bets tie to real demand.",
];

const DEFAULT_WEB_APPS: string[] = [
  "Web booking, client portal, or intake that works 24/7: schedules, forms, and confirmations without more phone load.",
  "Integrations that stop lead leakage: form or chat → CRM or spreadsheet, calendar holds for estimates, optional deposits — fewer dropped follow-ups.",
];

const DEFAULT_MOBILE_APPS: string[] = [
  "Native or cross-platform mobile when repeat usage, maps, camera, or push notifications justify a home-screen app beyond the website.",
  "Crew or customer companion: today’s route or bookings, photos, sign-offs, or reschedule reminders — matched to how the business works on-site.",
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

function pushSlide(arr: string[], line: string) {
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

function clipSummaryText(s: string, max: number): string {
  const t = s.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, Math.max(0, max - 1))}…`;
}

/**
 * Plain-language snapshot for the Business snapshot card: what they do (categories / homepage),
 * reputation, and web presence — not generic agency jargon.
 */
function buildInsightSummary(signals: IntelSignals): string {
  const name = signals.name?.trim() || "This business";
  const primary = formatPrimaryCategories(signals.placeTypes);
  const addr = signals.formattedAddress?.trim();
  const loc = addr ? clipSummaryText(addr, 100) : null;
  const fromPlaceListing = Boolean(
    (signals.placeTypes && signals.placeTypes.length > 0) ||
      signals.rating != null ||
      signals.reviewCount != null ||
      nonEmpty(signals.formattedAddress)
  );

  /** Shown in Business snapshot header; keep summary prose from repeating the same facts. */
  const listingFactsInSnapshot =
    Boolean(primary) ||
    signals.rating != null ||
    (signals.reviewCount != null && signals.reviewCount > 0);

  const sentences: string[] = [];

  if (primary) {
    if (listingFactsInSnapshot) {
      sentences.push(`${name}${loc ? ` is listed at ${loc}` : "."}`);
    } else {
      sentences.push(
        `${name} shows on Google as ${primary}${loc ? `, located at ${loc}` : ""}.`
      );
    }
  } else if (signals.placeTypes && signals.placeTypes.length > 0) {
    sentences.push(
      `${name} has a Google Business listing${loc ? ` (${loc})` : ""}; categories on Maps are generic, so confirm services on a call or site visit.`
    );
  } else if (signals.hasWebsite && (nonEmpty(signals.pageTitle) || nonEmpty(signals.metaDescription))) {
    const host = signals.websiteUrl ? hostnameOnly(signals.websiteUrl) : null;
    const title = signals.pageTitle?.trim();
    if (title) {
      sentences.push(
        `${clipSummaryText(title, 120)}${host ? ` (${host})` : ""} — that title is how the business frames itself on its homepage.`
      );
    }
    const md = signals.metaDescription?.trim();
    if (md && md.length >= 24) {
      sentences.push(`From the site’s meta description: ${clipSummaryText(md, 240)}`);
    }
    if (sentences.length === 0) {
      sentences.push(
        host
          ? `This prospect’s public site is ${host}; scan key pages for services, audience, and proof.`
          : `Use their public website to infer what they sell and who they serve.`
      );
    }
  } else {
    sentences.push(`${name} is a prospect you’re researching; add a listing or URL to sharpen this summary.`);
  }

  if (!listingFactsInSnapshot) {
    if (signals.rating != null && signals.reviewCount != null) {
      sentences.push(
        `On Google they show ${signals.rating.toFixed(1)}★ from ${signals.reviewCount} reviews.`
      );
    } else if (signals.rating != null) {
      sentences.push(`Google lists an average rating of ${signals.rating.toFixed(1)}★.`);
    } else if (signals.reviewCount != null && signals.reviewCount > 0) {
      sentences.push(`The Maps listing has ${signals.reviewCount} reviews.`);
    }
  }

  if (fromPlaceListing) {
    if (!signals.hasWebsite) {
      sentences.push(
        "There’s no website on the Google listing, so most customers likely find them through Maps, phone, and referrals."
      );
    } else if (signals.https === false) {
      sentences.push(
        "A site is linked from Maps but still loads over HTTP — moving to HTTPS helps trust, SEO, and any forms you add."
      );
    } else {
      sentences.push(
        "The listing links to a live site; anchor your pitch in the services, hours, and proof already published there."
      );
    }
  } else if (signals.hasWebsite && signals.https === false) {
    sentences.push(
      "The homepage is not served over HTTPS yet — fix that before pitching chat, lead capture, or payments."
    );
  }

  sentences.push(
    "Agency angle: make the real offer obvious online (what they do, for whom, how to book or buy), then layer simple capture and follow-up so search traffic converts."
  );

  return sentences.join(" ");
}

export function buildMarketIntelReport(signals: IntelSignals): MarketIntelReport {
  const customWebsites: string[] = [];
  const webApps: string[] = [];
  const mobileApps: string[] = [];
  const aiAutomations: string[] = [];

  const types = typesHaystack(signals.placeTypes);

  if (!signals.hasWebsite) {
    pushSlide(
      customWebsites,
      "No public website listed — start with a single high-converting landing (offer, proof, one CTA) plus click-to-call; expand to full site once messaging converts."
    );
    pushSlide(
      customWebsites,
      "Own your funnel: first-party site + UTM-tagged links from GMB/social so you can attribute calls and forms — essential before scaling paid search or partners."
    );
    pushAi(
      aiAutomations,
      "GTM wedge: “free homepage + chat” pitch — launch a minimal page with FAQ chat and quote form; proves value fast and creates upsell path to booking, payments, and CRM hooks."
    );
  } else {
    if (signals.https === false) {
      pushSlide(
        customWebsites,
        "Site not served over HTTPS — fix for trust, SEO, and form security; quick win before adding chat, payments, or lead capture."
      );
    }
    pushAi(
      aiAutomations,
      "On-site chat or embedded assistant on the existing URL: qualify service + urgency, offer scheduling or callback — reduces abandonment when people don’t want to call."
    );
    if (nonEmpty(signals.metaDescription) && signals.metaDescription!.trim().length < 80) {
      pushSlide(
        customWebsites,
        "Meta description is thin — rewrite for one clear outcome + geography/service; lifts organic CTR and aligns ad/organic messaging for the same landing page."
      );
    }
    if (!nonEmpty(signals.pageTitle)) {
      pushSlide(
        customWebsites,
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
    pushSlide(
      customWebsites,
      "Review volume is modest — surface proof blocks and post-service follow-up CTAs on the site; pair with SMS/email that deep-links to Google."
    );
    pushAi(
      aiAutomations,
      "AI-drafted personalized review requests from job type + customer name (owner approves send) — increases completion rate vs generic blast templates."
    );
  }

  if (signals.rating != null && signals.rating < 4) {
    pushSlide(
      customWebsites,
      "Rating headroom — pair operational fixes with visible response on reviews; make “how we handle issues” obvious on the homepage and contact paths."
    );
    pushSlide(
      webApps,
      "Customer comms hub: shared inbox for SMS/email/reviews with assignment — so nothing falls through while you improve the underlying service."
    );
  }

  if (isRestaurant(types)) {
    pushAi(
      aiAutomations,
      "Menu, hours, and dietary FAQ bot + “Book a table” / ordering deep links — captures tourists and voice-searchers who won’t read a PDF menu."
    );
    pushSlide(
      customWebsites,
      "Lead magnet: “private event / catering one-pager” or seasonal menu PDF behind email — fuels B2B and party inquiries beyond walk-in traffic."
    );
    pushSlide(
      webApps,
      "Reservations or waitlist integration on the hero — if they still rely on phone-only peak hours, that’s revenue left on the table."
    );
    pushSlide(
      mobileApps,
      "Branded ordering or loyalty app for repeat guests when pickup/delivery and push promos matter more than a one-off web visit."
    );
  } else if (isFitnessWellness(types)) {
    pushAi(
      aiAutomations,
      "Trial or class-pack assistant: goals, schedule, location → suggest program + book intro — reduces front-desk back-and-forth and no-shows with SMS reminders."
    );
    pushSlide(
      customWebsites,
      "Magnet: free “7-day reset” or mobility checklist PDF — segment leads by goal for email/SMS nurture into membership."
    );
    pushSlide(
      mobileApps,
      "Member app for class packs, check-in, and schedule changes — cuts front-desk load when people live on their phones."
    );
  } else if (isHealthMedical(types)) {
    pushAi(
      aiAutomations,
      "Pre-visit intake and insurance FAQ assistant — collects demographics and reason for visit; staff gets a structured summary (HIPAA-scoped design in scope)."
    );
    pushSlide(
      customWebsites,
      "Trust content as magnet: “what to expect first visit” or condition-specific checklist — captures high-intent searchers comparing providers."
    );
  } else if (isLegal(types)) {
    pushAi(
      aiAutomations,
      "Intake bot triages practice area and urgency — routes to the right form and discourages off-scope leads early; owner reviews sensitive replies before client-facing send."
    );
    pushSlide(
      customWebsites,
      "Gated guide: “before you sign / questions for your [practice area] consult” — positions you as educator and gives a natural reason to follow up."
    );
  } else if (isRealEstate(types)) {
    pushAi(
      aiAutomations,
      "Listing Q&A + buyer/seller assistant (neighborhood, schools, process timeline) with handoff to agent calendar — scales first-touch without losing human close."
    );
    pushSlide(
      customWebsites,
      "Valuation or “what’s my home worth” mini-flow as lead magnet — pair with automated market snapshot email sequence."
    );
    pushSlide(
      mobileApps,
      "Pocket listing alerts and saved-search mobile experience for serious buyers — when push and maps beat email-only nurture."
    );
  } else if (isHomeTrade(types)) {
    pushAi(
      aiAutomations,
      "Emergency vs routine triage chat: zip + issue type + photos upload prompt → dispatches to on-call tech and sends ETA template — wins “need someone now” searches."
    );
    pushSlide(
      webApps,
      "Estimate request → calendar slot + crew assignment — reduces phone tag and makes same-day response a competitive differentiator."
    );
    pushSlide(
      mobileApps,
      "Field tech app: today’s route, job photos, and customer sign-off in one flow — fewer clipboard handoffs and disputed completions."
    );
  } else if (isRetail(types)) {
    pushAi(
      aiAutomations,
      "Store assistant: hours, parking, inventory FAQs (“Do you carry X?”), and promotions — bridge online discovery to in-store visit or BOPIS if they add online selling later."
    );
    pushSlide(
      customWebsites,
      "Local SEO + structured events/sales pages; magnet could be loyalty signup or stylist/design consult for high-AOV categories."
    );
    pushSlide(
      mobileApps,
      "Store or loyalty companion when BOPIS, barcode lookup, or repeat purchase reminders belong in-app, not only on the web."
    );
  }

  if (isAutomotive(types)) {
    pushAi(
      aiAutomations,
      "Inventory-aware assistant (make/model trims in stock) + service booking handoff — answers “do you have this?” and routes test-drive vs service intent without burning BDC time."
    );
    pushSlide(
      customWebsites,
      "Fixed-ops lead magnet: service specials, recall checks, or maintenance intervals by mileage — balances floor traffic with repeat repair revenue."
    );
    pushSlide(
      mobileApps,
      "Mobile trade-in / appraisal request + SMS follow-up — meets shoppers comparing dealers before they visit the lot."
    );
  }

  if (isLocalService(types) && !isRestaurant(types) && !isRetail(types)) {
    pushAi(
      aiAutomations,
      "Missed-call SMS + booking reminders + review requests in one automation stack — classic local GTM stack; position as “done in two weeks” implementation."
    );
    pushSlide(
      webApps,
      "Customer booking portal or embedded scheduler if they’re phone-heavy — unlocks 24/7 capture without more headcount."
    );
  }

  injectObservedContext(signals, customWebsites, aiAutomations);

  ensureMinimum(customWebsites, DEFAULT_CUSTOM_WEBSITES, 2, 7);
  ensureMinimum(webApps, DEFAULT_WEB_APPS, 2, 7);
  ensureMinimum(mobileApps, DEFAULT_MOBILE_APPS, 2, 7);
  ensureMinimum(aiAutomations, DEFAULT_AI_AUTOMATIONS, 2, 10);

  const summary = buildInsightSummary(signals);

  return { customWebsites, webApps, mobileApps, aiAutomations, summary };
}
