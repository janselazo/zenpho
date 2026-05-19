"use client";

import Link from "next/link";
import { Reveal } from "@/components/marketing/renaissance/Reveal";
import { Ornament, Starfield } from "@/components/marketing/renaissance/Ornament";
import { HeraldTrumpet } from "@/components/marketing/renaissance/RenaissanceArt";
import Phone from "@/components/marketing/renaissance/Phone";
import PageHero from "@/components/marketing/sections/PageHero";
import SectionHead from "@/components/marketing/sections/SectionHead";
import CTABanner from "@/components/marketing/sections/CTABanner";
import FAQList from "@/components/marketing/sections/FAQList";
import TrustedBy from "@/components/marketing/sections/TrustedBy";

const PATRONS = [
  {
    r: "I",
    h: "Local",
    em: "Botteghe.",
    p: "From dental clinics to restaurants — creatives tuned for geo-targeted Meta campaigns that book seats, calls and visits.",
    list: [
      "Geo·targeted offer ads",
      "Founder & team intros",
      "Behind·the·counter UGC",
      "Walk·in & call·tracking CTAs",
    ],
  },
  {
    r: "II",
    h: "Mercantile",
    em: "Brands.",
    p: "Catalog-aware, hook-driven creatives that lift CTR and ROAS on Meta and TikTok. We obsess over the first 1.5 seconds.",
    list: [
      "UGC unboxing & reviews",
      "Catalog product demos",
      "Static & animated bundles",
      "Conversion·focused variants",
    ],
  },
  {
    r: "III",
    h: "Tech",
    em: "Studios.",
    p: "Explain the product without sounding like a product. We turn dense features into ads that actually convert on socials.",
    list: [
      "Founder·led storytelling",
      "UI motion explainers",
      "Use·case scenario videos",
      "Onboarding·loop creatives",
    ],
  },
];

type PhoneTone =
  | "warm"
  | "coral"
  | "ink"
  | "cream"
  | "forest"
  | "plum"
  | "sun"
  | "sea";

const STYLES: Array<{
  r: string;
  h: string;
  em: string;
  tone: PhoneTone;
  handle: string;
  caption: string;
  cta: string;
  label: string;
  price: string;
  time: string;
}> = [
  { r: "I", h: "UGC", em: "Vérité.", tone: "coral", handle: "@realmaya", caption: "Honestly didn't expect it to actually work…", cta: "Shop now", label: "UGC creator", price: "$250", time: "15·30s" },
  { r: "II", h: "Talking", em: "Head.", tone: "warm", handle: "@founder.alex", caption: "Why we built this. And why we almost didn't.", cta: "Read story", label: "Founder POV", price: "$350", time: "20·45s" },
  { r: "III", h: "Product", em: "Demo.", tone: "ink", handle: "@flux.app", caption: "Drag, drop, ship. No tutorial required.", cta: "Try free", label: "Hands·on UI", price: "$500", time: "20·40s" },
  { r: "IV", h: "Motion", em: "Graphics.", tone: "sun", handle: "@northbloom", caption: "Three steps. Six weeks. One glow·up.", cta: "Shop now", label: "Animated", price: "$650", time: "15·30s" },
  { r: "V", h: "AI", em: "Generated.", tone: "plum", handle: "@studiokyo", caption: "When the brief is wild and the budget isn't.", cta: "See more", label: "AI visuals", price: "$300", time: "10·25s" },
  { r: "VI", h: "Founder", em: "Led.", tone: "forest", handle: "@haus.coffee", caption: "Day 1 · roasting in my kitchen. Day 412 · this.", cta: "Order beans", label: "Authentic", price: "$400", time: "30·60s" },
];

const PRACTICES = [
  { r: "I", h: "Hook in 1·5 seconds.", p: "If the first frame doesn't earn the second, nothing else matters. Every creative we ship is hook-first: motion, face, question, or pattern interrupt before frame 45." },
  { r: "II", h: "Native to the platform.", p: "TikTok feels like TikTok. Reels feels like Reels. We don't recycle a horizontal master across every surface and call it a day." },
  { r: "III", h: "Built for variants.", p: "One concept, ten iterations. Different hooks, different proofs, different CTAs — so your media buyer always has fresh fuel for the algorithm." },
  { r: "IV", h: "Captions by default.", p: "85% of social video is watched on mute. Captions are part of the design, not an afterthought — typography that earns its place on screen." },
  { r: "V", h: "Proof before polish.", p: "A scrappy UGC review will out·convert a glossy spot nine times out of ten. We optimize for believability first, beauty second." },
  { r: "VI", h: "Test, kill, repeat.", p: "We ship in packs of 3–5 variants and look at the data with you. Winners scale. Losers get cut. The brief evolves every two weeks." },
];

const PORTFOLIO: Array<{
  client: string;
  cat: string;
  tone: PhoneTone;
  handle: string;
  caption: string;
  cta: string;
  label: string;
  badge: string;
}> = [
  { client: "Northbloom", cat: "Skincare · DTC", tone: "coral", handle: "@northbloom", caption: "14 days. Real skin. No filters.", cta: "Shop now", label: "UGC review", badge: "+312% CTR" },
  { client: "Flux", cat: "SaaS · Productivity", tone: "ink", handle: "@flux.app", caption: "The note that writes itself.", cta: "Try free", label: "Product demo", badge: "3·4× ROAS" },
  { client: "Haus Coffee", cat: "Local · F&B", tone: "forest", handle: "@haus.coffee", caption: "Roasted yesterday. In your cup tomorrow.", cta: "Order", label: "Founder POV", badge: "+48% visits" },
  { client: "Lumen", cat: "Wellness · DTC", tone: "sun", handle: "@trylumen", caption: "Sleep. Like, actually sleep.", cta: "Shop now", label: "Motion", badge: "$0·41 CPC" },
  { client: "Tako", cat: "Ecom · Apparel", tone: "plum", handle: "@takofits", caption: "Fits weird. On purpose.", cta: "Shop the drop", label: "UGC styling", badge: "+87% AOV" },
  { client: "Mast", cat: "Tech · Startup", tone: "sea", handle: "@mast.ai", caption: "Cold emails, but they actually work.", cta: "Get demo", label: "Talking head", badge: "+5·2× leads" },
  { client: "Bocca", cat: "Local · Restaurant", tone: "warm", handle: "@boccatable", caption: "Saturday. 7pm. Last 4 seats.", cta: "Book table", label: "Geo offer", badge: "94 books/wk" },
  { client: "Pebble", cat: "DTC · Home", tone: "cream", handle: "@pebble.home", caption: "Soft on you. Hard on stains.", cta: "Shop now", label: "AI", badge: "$0·22 CPM" },
];

const TIERS = [
  {
    name: "Studio",
    eyebrow: "One commission",
    price: 350,
    unit: "/ work",
    features: [
      "Pick any discipline (UGC, talking head, motion…)",
      "Script · storyboard · production",
      "1 hook variant · 2 revision rounds",
      "Delivered in 9:16, 1:1 and 4:5",
      "Royalty-free music & sound design",
      "Captions in EN, ES or PT",
    ],
    cta: "Commission a piece",
    featured: false,
    tag: null as string | null,
  },
  {
    name: "Studio",
    eyebrow: "A folio · five works",
    price: 1490,
    unit: "/ folio",
    tag: "Most chosen",
    featured: true,
    features: [
      "5 creatives — any disciplines, any mix",
      "3 hook variants per piece",
      "Performance brief · media·buyer notes",
      "All aspect ratios · thumbnail kit",
      "2 revision rounds per video",
      "Delivered in seven days",
    ],
    cta: "Begin the folio",
  },
  {
    name: "Patronage",
    eyebrow: "Retainer · ten/month",
    price: 2790,
    unit: "/ month",
    features: [
      "10 works per month — any disciplines",
      "Bi·weekly strategy & ideation calls",
      "Cross·platform variants included",
      "Trend monitoring & reactive briefs",
      "Unlimited revisions within scope",
      "Slack channel · 24h response",
    ],
    cta: "Begin patronage",
    featured: false,
    tag: null as string | null,
  },
];

const PROCESS = [
  { r: "I", h: "Brief", p: "Sixty-minute call. We unpack the offer, the audience, the funnel and what's currently failing in your ad account.", t: "Day I" },
  { r: "II", h: "Concept", p: "We come back with three hook directions per work and a creative matrix mapped to your funnel stages.", t: "Day II — III" },
  { r: "III", h: "Produce", p: "Shoot day, UGC hand-off or motion edit — depending on the discipline. You see dailies as we go.", t: "Day IV — VI" },
  { r: "IV", h: "Ship", p: "Final cuts in every aspect ratio, with captions, alt versions and a media-buyer hand-off folio.", t: "Day VII" },
  { r: "V", h: "Iterate", p: "We watch the ad account with you. Winners get scaled, losers get killed, new variants get briefed.", t: "Day VIII+" },
];

const STATS = [
  { n: <>240<sup>+</sup></>, l: "Works shipped", d: "Across UGC, motion and founder-led disciplines." },
  { n: <>3·2<sup>×</sup></>, l: "Average CTR lift", d: "Versus the previous best-performing ad in the account." },
  { n: <>48<sup>h</sup></>, l: "Express turnaround", d: "On single·work commissions when the brief is locked." },
  { n: "XII", l: "Industries served", d: "From skincare and SaaS to coffee shops and clinics." },
];

const TESTIMONIALS = [
  { q: "We were burning four thousand a week on stale creatives. Zenpho shipped a folio of five and our CPA dropped thirty-eight percent in the first weekend.", a: "Maya R.", r: "Head of Growth · Northbloom", i: "M", res: "−38% CPA" },
  { q: "The first founder-led piece they cut for us became the top-performing TikTok ad we've ever run. Period.", a: "Daniel K.", r: "Founder · Flux", i: "D", res: "Top ad ever" },
  { q: "I run a single coffee shop. They treated my brief like I was a Florentine merchant prince. Saturday traffic is up forty-eight percent.", a: "Sara L.", r: "Owner · Haus Coffee", i: "S", res: "+48% visits" },
];

const FAQ = [
  { q: "How fast can you turn around a single work?", a: "Express commissions ship in 48 hours once the brief is signed off. Standard turnaround on a single piece is four to five working days. Folios and patronages run on a seven-day production cadence." },
  { q: "Do I own the creatives outright?", a: "Yes. All footage, edits, audio licensing and source files are handed over with full perpetual usage rights for paid media, organic and your website. UGC creator likeness is licensed for 12 months by default — extendable on request." },
  { q: "Which aspect ratios do you deliver?", a: "Every work ships in 9:16 (Reels, TikTok, Stories), 1:1 (feed) and 4:5 (feed long-form). Need 16:9 for YouTube or 4:3 for legacy display? Add it at no extra cost." },
  { q: "Do you handle the media buying too?", a: "We do not run media. But every delivery includes a media-buyer brief — hook themes, audience hypotheses and a recommended test matrix — so your in-house buyer or studio can plug straight in." },
  { q: "What if the first round is not working?", a: "We watch the ad account with you. If a creative under-performs on day seven, we replace it. Patronage clients get unlimited iteration within scope. Folio and single commissions include two revision rounds." },
  { q: "Languages?", a: "We deliver in English, Spanish and Portuguese natively. Other languages on request — typically via subtitle/voiceover localization rather than a re-shoot." },
];

export default function CreativesGenerationPageContent() {
  return (
    <>
      <PageHero
        eyebrow="Service · Creatives Generation"
        headline={<>Ad creatives <em>that stop</em> the scroll.</>}
        lead="Performance-grade UGC, talking-head, motion and AI creatives for Meta, Instagram and TikTok — for local businesses, ecommerce brands and tech startups."
        art={
          <HeraldTrumpet
            width={460}
            height={460}
            color="rgba(244,240,228,.92)"
            accent="#E6D6A8"
            className="ra-float-slow"
          />
        }
        ctaSecondary={{ label: "Compare packages", href: "/pricing" }}
      />

      <TrustedBy />

      <section className="section" id="who">
        <div className="shell">
          <SectionHead
            eyebrow="Three patrons"
            title={<>One studio. <em>Three</em> patrons.</>}
            blurb="A workshop for the businesses that built their brand on word-of-mouth, now scaled by algorithm."
          />
          <Reveal as="div" className="who-grid" stagger>
            {PATRONS.map((c) => (
              <div className="who-card" key={c.r}>
                <div className="who-roman">№ {c.r}</div>
                <Ornament className="who-orn" variant="rule" width={36} height={14} />
                <h3>
                  {c.h}
                  <em>{c.em}</em>
                </h3>
                <p>{c.p}</p>
                <ul>
                  {c.list.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              </div>
            ))}
          </Reveal>
        </div>
      </section>

      <section className="section" id="styles">
        <div className="shell">
          <SectionHead
            eyebrow="The studio · six disciplines"
            title={<>Six disciplines, <em>one</em> master plan.</>}
            blurb="Pick a format. We'll handle the script, the shoot, the edit — and the variants your media buyer will need by next week."
          />
          <Reveal as="div" className="styles-grid" stagger>
            {STYLES.map((s) => (
              <div className="style-card" key={s.r}>
                <div className="style-card-meta">
                  <h3>
                    {s.h}
                    <em>{s.em}</em>
                  </h3>
                  <div className="style-card-num">№ {s.r} / VI</div>
                </div>
                <Phone
                  scale={0.82}
                  tone={s.tone}
                  handle={s.handle}
                  caption={s.caption}
                  cta={s.cta}
                  label={s.label}
                />
                <div className="style-card-price">
                  <span>{s.time} · 9:16 / 1:1 / 4:5</span>
                  <b>From {s.price}</b>
                </div>
              </div>
            ))}
          </Reveal>
        </div>
      </section>

      <section className="section" id="practices">
        <div className="shell">
          <SectionHead
            eyebrow="Six canons"
            title={<>Six rules <em>we</em> never break.</>}
            blurb="The unspoken laws every good media buyer wishes their creative team already knew."
          />
          <Reveal as="div" className="practices-wrap" stagger>
            {PRACTICES.map((it) => (
              <div className="practice" key={it.r}>
                <div className="practice-roman">
                  {it.r}
                  <span className="num">canon</span>
                </div>
                <h4>{it.h}</h4>
                <p>{it.p}</p>
              </div>
            ))}
          </Reveal>
        </div>
      </section>

      <section className="section portfolio-section" id="portfolio">
        <Starfield count={50} seed={3} />
        <div className="shell">
          <SectionHead
            eyebrow="Selected works · MMXXIV–VI"
            title={<>Real <em>patrons.</em> Real receipts.</>}
            blurb="A sample of what we've shipped across local, DTC and tech. Every figure pulled from the patron's own ad account — not from a deck."
            light
          />
          <Reveal as="div" className="portfolio-grid" stagger>
            {PORTFOLIO.map((it, i) => (
              <div className="portfolio-item" key={i}>
                <Phone
                  scale={0.92}
                  tone={it.tone}
                  handle={it.handle}
                  caption={it.caption}
                  cta={it.cta}
                  label={it.label}
                  badge={it.badge}
                />
                <div className="portfolio-meta">
                  <b>{it.client}</b>
                  <em>{it.cat}</em>
                </div>
              </div>
            ))}
          </Reveal>
        </div>
      </section>

      <section className="section" id="pricing">
        <div className="shell">
          <SectionHead
            eyebrow="Tariffs"
            title={<>Commission a work. <em>Or</em> become a patron.</>}
            blurb="Three ways to work together — from a single commission to a long-standing patronage of the studio."
          />
          <Reveal as="div" className="pricing-grid" stagger>
            {TIERS.map((t, i) => (
              <div className={`price-card ${t.featured ? "featured" : ""}`} key={i}>
                {t.tag ? <div className="price-tag">{t.tag}</div> : null}
                <div className="price-eyebrow">{t.eyebrow}</div>
                <h3>{t.name}</h3>
                <div className="price-amount">
                  <sup>$</sup>
                  {t.price.toLocaleString()}
                  <small>USD {t.unit}</small>
                </div>
                <ul className="price-features">
                  {t.features.map((f, j) => (
                    <li className="price-feature" key={j}>
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/contact"
                  className="btn-primary"
                  style={{ width: "100%", justifyContent: "center" }}
                >
                  {t.cta} <span className="btn-arrow">↗</span>
                </Link>
              </div>
            ))}
          </Reveal>
          <div className="price-note">
            All tariffs include media·buyer-ready exports · custom commissions on request.
          </div>
        </div>
      </section>

      <section className="section" id="process">
        <div className="shell">
          <SectionHead
            eyebrow="The method"
            title={<>From brief <em>to first work</em> in seven days.</>}
            blurb="A method honed across two hundred commissions — fast enough for ecommerce, deliberate enough for a brand book."
          />
          <Reveal as="div" className="process-track" stagger>
            {PROCESS.map((s) => (
              <div className="process-step" key={s.r}>
                <div className="process-roman">{s.r}</div>
                <h4>{s.h}</h4>
                <p>{s.p}</p>
                <div className="process-step-time">{s.t}</div>
              </div>
            ))}
          </Reveal>
        </div>
      </section>

      <section className="stats-grid">
        {STATS.map((s, i) => (
          <Reveal as="div" className="stat" key={i}>
            <div className="stat-num">{s.n}</div>
            <Ornament className="stat-orn" variant="rule" width={44} height={14} />
            <div className="stat-label">{s.l}</div>
            <div className="stat-desc">{s.d}</div>
          </Reveal>
        ))}
      </section>

      <section className="section" id="testimonials">
        <div className="shell">
          <SectionHead
            eyebrow="Voices of the patrons"
            title={<>Receipts <em>over</em> promises.</>}
          />
          <Reveal as="div" className="test-grid" stagger>
            {TESTIMONIALS.map((t, i) => (
              <div className="test-card" key={i}>
                <div className="test-result">{t.res}</div>
                <span className="test-quote-mark">“</span>
                <p className="test-quote">{t.q}</p>
                <div className="test-author">
                  <div className="test-avatar">{t.i}</div>
                  <div className="test-author-info">
                    <span className="test-author-name">{t.a}</span>
                    <span className="test-author-role">{t.r}</span>
                  </div>
                </div>
              </div>
            ))}
          </Reveal>
        </div>
      </section>

      <FAQList items={FAQ} />

      <CTABanner
        title={<>Ready to make ads <em>they cannot</em> scroll past?</>}
        lead="Tell us what you want to launch — one video, a folio of five, or an ongoing patronage. We will come back with a fixed quote in 48 hours."
      />
    </>
  );
}
