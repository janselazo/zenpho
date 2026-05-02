export interface BlogPost {
  slug: string;
  title: string;
  excerpt: string;
  date: string;
  readTime: string;
  category: string;
  content: string;
}

export const blogPosts: BlogPost[] = [
  {
    slug: "local-service-revenue-leaks-most-teams-miss",
    title: "The revenue leaks most local service businesses miss",
    excerpt:
      "Clicks and impressions feel productive—until you ask what happened to the lead after the click. Here is where money quietly disappears.",
    date: "2026-04-22",
    readTime: "6 min read",
    category: "Local growth",
    content: `Many local operators already get found. The harder question is what happens after someone shows intent.

## Leaks start before the CRM

A call goes to voicemail and no one calls back within minutes. A form fires but lands in a generic inbox. A chat widget promises "we'll get back to you" and the thread dies. None of that shows up as "bad marketing" in a dashboard—because nothing was measured as a lead in the first place.

## Leaks live in the handoff

The business that answers fast, books the job, sends the proposal, and follows up like clockwork wins even when the ad account looks identical to a competitor's. When handoffs are fuzzy—who owns the lead, which script gets used, whether a missed call gets a text—revenue falls through in Week One, not in the campaign report.

## Leaks hide in "we're busy"

Being booked out feels like success until you look at wait times, price leaks, callbacks you never made, or referrals you never asked for. Busy teams often stop logging, stop tagging sources, and stop asking why someone chose you. That is when you cannot say which channel is actually paying for itself.

## What to do first

Before spending more on reach, tighten the spine: **capture, tag, follow up, and close the loop** so you can see leads, appointments, and jobs in one place. When that spine exists, every channel—Google Business Profile, paid search, landing pages, referrals—can be improved with numbers instead of opinions.

That is the shift from marketing activity to **clear growth**.`,
  },
  {
    slug: "what-revenue-leak-audit-really-shows",
    title: "What a Revenue Leak Audit really shows you",
    excerpt:
      "It is not a PDF trophy. It is a prioritized picture of visibility, conversion, follow-up, reviews, referrals, and where opportunity is slipping away.",
    date: "2026-04-10",
    readTime: "5 min read",
    category: "Playbooks",
    content: `A Revenue Leak Audit is built for owners who are tired of guessing whether marketing is working.

## Beyond a single tactic

SEO alone cannot explain a slow callback. A pretty website cannot fix a broken intake form. The audit looks across the **local growth journey**: how you show up, how you convert, how you track, how you follow up, how reviews and referrals reinforce trust, and whether you can tie outcomes back to spend.

## What we actually inspect

Typical inputs include your Google Business Profile, competitive context, reviews, website and key landing pages, photo and category signals, basic readiness for paid campaigns, and whether tracking matches how customers really contact you. The output is not a list of shame—it is a **ranked view** of what is most likely costing you money right now.

## How teams use it

Some audits end in a one-time setup: dashboards, CRM hygiene, call and form tracking, a review request flow, and a first ROI report. Others hand off into monthly growth management once the foundation is in place. In both cases, the goal is the same: **replace vague activity with visible opportunity.**

If you have not run one yet, treat it as a reset on clarity—not another subscription you adopt before you know what is broken.`,
  },
  {
    slug: "tracking-from-lead-to-job-won",
    title: "Tracking that matters: from lead to job won",
    excerpt:
      "Vanity metrics peak early. Durable growth needs source tags, stages, and a honest link between marketing, sales, and the work you actually invoice.",
    date: "2026-03-28",
    readTime: "6 min read",
    category: "Operations",
    content: `"Traffic is up" is not a strategy. For local service businesses, the scoreboard needs to read in **business units**, not only analytics events.

## Define the spine

Start with a simple chain: **source → lead → response time → appointment → proposal or quote → won job → revenue (and review / referral)**. If you cannot draw that chain on a whiteboard and match each step to a field or tag in your systems, your reporting will always feel fuzzy.

## Tag sources honestly

UTM parameters, call-tracking numbers, and CRM picklists only help when people use them. Make the **default** path the accurate one—a receptionist should not have to become a data steward to log "this came from Google Local Services."

## Close the loop weekly

Pick one rhythm—weekly or biweekly—and ask: which sources produced booked appointments, which stalled at estimate, and which produced nothing but noise? That meeting should be short, blunt, and tied to **one or two fixes** (page speed, script, offer, tighter follow-up), not a twelve-initiative wish list.

## Prove ROI without fantasy math

ROI is not "divide spend by clicks." It is **spend against attributed jobs** (even if attribution is imperfect at first). Directionally correct beats precisely wrong. Start conservative, improve tagging every month, and let the model get sharper over time.

When tracking matches how you actually run the business, marketing stops being a debate and becomes a set of levers you can pull with intent.`,
  },
  {
    slug: "reviews-referrals-and-follow-up-systems",
    title: "Reviews, referrals, and the systems behind them",
    excerpt:
      "Happy customers do not always leave five stars or send friends your way unless you make it easy, timely, and consistent—without sounding desperate.",
    date: "2026-03-12",
    readTime: "5 min read",
    category: "Growth",
    content: `Reviews and referrals look like "brand" work. For local services, they are **conversion and repeat revenue** dressed in a nicer label.

## Reviews need a moment, not a campaign

The best time to ask is right after a solved problem—when the truck rolls away, the treatment is done, or the invoice is paid. A lightweight SMS or email sequence, tied to the job record, beats a quarterly blast that lands cold. Make one tap to Google (or your Reviews link of choice) and keep the copy human.

## Referrals need a reason to share

People refer when they trust you, when it is easy to describe what you do for someone similar to them, and when there is a simple way to make the introduction—whether that is a shared link, a call tree, or a small thank-you you actually honor.

## Follow-up protects both

Missed callbacks erode reviews before you ever ask. Slow invoicing kills referral energy. Treat **speed and closure** as part of the same system you use to ask for public proof.

## Measure both like leads

Count **asks sent**, **reviews gained**, **referrals logged**, just like you count form fills. If you are not logging it, you are not improving it—you are hoping.

Done well, reviews and referrals compound: they lower cost per acquisition on everything else you run, because trust shows up before the ad does.`,
  },
  {
    slug: "before-you-scale-ads-fix-the-foundation",
    title: "Before you scale ads, fix the foundation",
    excerpt:
      "Pouring budget into Google or Meta without tracking, landing pages, and follow-up is how busy teams get expensive lessons instead of booked jobs.",
    date: "2026-02-20",
    readTime: "5 min read",
    category: "Strategy",
    content: `Paid media can scale what already works. It rarely invents demand that your operations cannot serve.

## What "ready" looks like

You can answer calls and web leads quickly. Forms hit a system that alerts the right people. Landing pages match the promise in the ad (service, geography, proof). You know which conversion actions matter—calls, forms, bookings—and those events actually fire in your analytics stack. If any of those are broken, increasing spend mostly increases **leak volume**.

## Start with offers that survive contact

If your offer is vague ("contact us for a quote") and your competitor names the outcome and the timeline, you will pay more for the click and still lose the appointment. Tighten the offer first; then widen the funnel.

## Use tests that teach

Small geo tests or budget ladders beat a hero launch where nobody knows what failed. Change one variable at a time—creative, keyword theme, landing headline, callback SLA—and read the result against **appointments and cost per booked job**, not just CTR.

## Protect margin with discipline

Daily checks on spend, search terms, and lead quality beat a monthly "how did we do?" surprise. Build a rhythm where the person signing the check can see **cost, lead count, booking rate, and rough revenue** without a data science degree.

If the foundation is shaky, fix the leaks first. Then scaling ads becomes an investment with a scoreboard—not a hope.`,
  },
];
