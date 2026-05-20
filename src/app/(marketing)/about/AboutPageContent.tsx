import PageHero from "@/components/marketing/sections/PageHero";
import SectionHead from "@/components/marketing/sections/SectionHead";
import TrustedBy from "@/components/marketing/sections/TrustedBy";
import CTABanner from "@/components/marketing/sections/CTABanner";
import { Reveal } from "@/components/marketing/renaissance/Reveal";
import { Ornament } from "@/components/marketing/renaissance/Ornament";
import {
  Cartouche,
  CelestialField,
  Shield,
  VitruvianMark,
} from "@/components/marketing/renaissance/RenaissanceArt";

const CANONS = [
  {
    r: "I",
    h: "Clarity beats thrash.",
    p: "We document assumptions, sequencing and tradeoffs early so builders and stakeholders share the same picture of scope, milestones and risk.",
  },
  {
    r: "II",
    h: "The smallest coherent release wins.",
    p: "We bias toward scopes that prove value quickly — experience, integrations and quality included — over spreadsheets that balloon before users ever click.",
  },
  {
    r: "III",
    h: "Instrumentation is part of MVP.",
    p: "If you cannot see adoption, friction or errors, you cannot iterate. Observability hooks are planned alongside features — not bolted on after launch surprises.",
  },
  {
    r: "IV",
    h: "Partnership ends with usable software.",
    p: "We ship code your team can run: handoffs, runbooks and pragmatic documentation so launches do not evaporate when the sprint ends.",
  },
  {
    r: "V",
    h: "Your stack should evolve with you.",
    p: "We integrate sensibly with what you already rely on — auth providers, commerce platforms, CRMs, workspaces — and focus on the seams that unblock product velocity.",
  },
];

const AUDIENCE = [
  "Founders turning a concept into a demo, MVP, or first paying customers",
  "Small product teams that need senior hands across UX, engineering and release",
  "Operators modernizing a legacy site or internal tool into a web or mobile experience",
  "Brands launching ecommerce, membership or content systems that must work on day one",
  "Studios looking for a disciplined build partner without hiring a full bench",
  "Teams that already shipped v1 and need stabilization, instrumentation or a v2 roadmap",
  "Non-technical leaders who want weekly visibility into scope, milestones and tradeoffs",
  "Builders who value documentation, handoff and pragmatic maintainability",
];

const SHIP = [
  {
    r: "I",
    cat: "Discovery",
    blurb: "Pin the right problem first.",
    items: [
      "Discovery workshops",
      "Journey mapping",
      "Information architecture",
      "Prioritized screen plans",
    ],
  },
  {
    r: "II",
    cat: "Design",
    blurb: "Translate the brief into screens that ship.",
    items: [
      "UX / UI artifacts",
      "Design system & tokens",
      "Dev-ready notes",
      "Component library",
    ],
  },
  {
    r: "III",
    cat: "Engineering",
    blurb: "Build the product, not a prototype.",
    items: [
      "Frontends · web & mobile",
      "APIs & data models",
      "Auth & accounts",
      "Admin consoles",
    ],
  },
  {
    r: "IV",
    cat: "Integrations",
    blurb: "Connect to the systems you already run.",
    items: [
      "Stripe & payments",
      "CRMs & email",
      "Messaging & comms",
      "Analytics & 3rd-party APIs",
    ],
  },
  {
    r: "V",
    cat: "Release",
    blurb: "Get it live without surprises.",
    items: [
      "Staging environments",
      "QA passes",
      "Instrumentation",
      "DNS / hosting cutover",
    ],
  },
  {
    r: "VI",
    cat: "After launch",
    blurb: "Iterate from real usage, not assumptions.",
    items: [
      "Stabilization sprints",
      "Backlog grooming",
      "Roadmap for v2",
      "Milestone demos",
    ],
  },
];

const MILESTONES = [
  {
    y: "MMXVIII",
    h: "Software craft",
    p: "Years building and releasing software reinforced a simple rhythm: clarify the problem, design the smallest coherent experience, build with observable quality, ship, learn, tighten the loop.",
  },
  {
    y: "MMXX",
    h: "Taptok",
    p: "A chapter that shaped our discipline — growing from zero to fifteen thousand customers across Authentic Brands Group, Coral Gables City and thousands of SMBs.",
  },
  {
    y: "MMXXII",
    h: "Full-stack rhythm",
    p: "Living inside support, product and growth as one system is what we carry into every Zenpho engagement.",
  },
  {
    y: "MMXXIII",
    h: "SoldTools live",
    p: "Owning production software keeps us honest about maintenance, support and what happens after launch — the same bar we hold for client engagements.",
  },
  {
    y: "MMXXVI",
    h: "Zenpho today",
    p: "An MVP development studio — Design, Build, Launch engagements plus focused tools like Revenue Leak Audits — backed by engineers who still ship production software.",
  },
];

const STATS = [
  {
    n: (
      <>
        15<sup>k</sup>
      </>
    ),
    l: "Customers",
    d: "Across Taptok, SoldTools and client products.",
  },
  {
    n: (
      <>
        200<sup>+</sup>
      </>
    ),
    l: "Engagements",
    d: "Discovery, build and launch projects shipped.",
  },
  {
    n: (
      <>
        2<sup>wk</sup>
      </>
    ),
    l: "Avg sprint",
    d: "From signed brief to first staged demo.",
  },
  {
    n: (
      <>
        1<sup>×</sup>
      </>
    ),
    l: "Principal",
    d: "You talk to the person doing the work.",
  },
];

function AboutStory() {
  return (
    <section className="section section-light" id="story">
      <div className="shell">
        <div className="manifesto-grid">
          <Reveal className="manifesto-art ra-draw">
            <Cartouche
              width={380}
              height={460}
              color="var(--navy)"
              accent="#C19D5A"
            >
              <VitruvianMark
                width={180}
                height={180}
                color="var(--navy)"
                accent="#C19D5A"
              />
            </Cartouche>
          </Reveal>
          <div>
            <SectionHead
              eyebrow="Our story"
              title={
                <>
                  Built for teams <em>shipping</em> under pressure.
                </>
              }
              blurb="Most product ideas fail slowly — scope creeps, UX stays fuzzy, engineering restarts, or launch day arrives without a plan to learn from users. We founded Zenpho to compress that risk."
            />
            <Reveal className="manifesto-prose">
              <p>
                Our work sits at the intersection of studio craft and operator
                reality: a <strong>Design → Build → Launch</strong> cadence you
                can read. What is scoped, what shipped this week, what is
                waiting on feedback, and what should wait for v2.
              </p>
              <p>
                Founded in Miami, Zenpho serves founders and operators across
                the United States and worldwide.
              </p>
              <p>
                We apply the same loops we use shipping our own SaaS: prioritize
                the riskiest assumptions, instrument the product, demo on
                staging often, and tighten after real traffic — not slide decks.
              </p>
              <Ornament variant="fleuron" width={80} height={24} />
              <p className="manifesto-quote">
                Speed without clarity is just expensive motion.
              </p>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}

function AboutPhilosophy() {
  return (
    <section className="section" id="philosophy">
      <div className="shell">
        <SectionHead
          eyebrow="Philosophy"
          title={
            <>
              How we think <em>about</em> product delivery.
            </>
          }
          blurb="Five working principles, lifted from years of shipping software in production — both for clients and for ourselves."
        />
        <Reveal className="practices-wrap" stagger>
          {CANONS.map((c) => (
            <div className="practice" key={c.r}>
              <div className="practice-roman">
                {c.r}
                <span className="num">canon</span>
              </div>
              <h4>{c.h}</h4>
              <p>{c.p}</p>
            </div>
          ))}
        </Reveal>
      </div>
    </section>
  );
}

function AboutWho() {
  return (
    <section className="section section-dark" id="who-for">
      <CelestialField count={8} color="var(--marble)" accent="#E6D6A8" />
      <div className="shell" style={{ position: "relative", zIndex: 1 }}>
        <SectionHead
          eyebrow="Who we serve"
          title={
            <>
              Built for teams <em>shipping</em> digital products.
            </>
          }
          blurb="If you are moving from idea to launch for a website, ecommerce, mobile experience or MVP — we are built for you."
          light
        />
        <Reveal className="who-fit-grid" stagger>
          {AUDIENCE.map((a, i) => (
            <div className="who-fit-row" key={i}>
              <span className="who-fit-num">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="who-fit-text">{a}</span>
            </div>
          ))}
        </Reveal>
      </div>
    </section>
  );
}

function AboutDeliverables() {
  return (
    <section className="section" id="ship">
      <div className="shell">
        <SectionHead
          eyebrow="What we ship"
          title={
            <>
              From idea <em>to operating</em> product.
            </>
          }
          blurb="The practical mix of discovery, design, engineering, release and iteration — what goes into every Zenpho engagement."
        />
        <Reveal className="ship-grid" stagger>
          {SHIP.map((g) => (
            <div className="ship-card" key={g.r}>
              <div className="ship-card-head">
                <span className="ship-roman">№ {g.r}</span>
                <span className="ship-cat">{g.cat}</span>
              </div>
              <p className="ship-blurb">{g.blurb}</p>
              <ul className="ship-items">
                {g.items.map((x, i) => (
                  <li key={i}>{x}</li>
                ))}
              </ul>
            </div>
          ))}
        </Reveal>
      </div>
    </section>
  );
}

function AboutFounder() {
  return (
    <section className="section section-light" id="founder">
      <div className="shell">
        <div className="founder-grid">
          <Reveal className="founder-art">
            <Cartouche
              width={360}
              height={460}
              color="var(--navy)"
              accent="#C19D5A"
            >
              <Shield
                width={160}
                height={210}
                color="var(--navy)"
                accent="#C19D5A"
                content="JL"
              />
            </Cartouche>
          </Reveal>
          <div>
            <SectionHead
              eyebrow="Founder"
              title={
                <>
                  Janse <em>Lazo</em>.
                </>
              }
              blurb="Founder and principal of Zenpho — software engineer with an MBA. Background shipping products from zero to thousands of customers and building systems that hold up in the real world."
            />
            <Reveal className="manifesto-prose">
              <p>
                I started Zenpho because most local operators do not need
                another vague marketing report — they need a clear picture of
                opportunities, leaks and ROI. When calls, forms and referrals
                are not tied to follow-up and reporting, money gets left on the
                table.
              </p>
              <p>
                My work ties engineering to go-to-market discipline:
                instrumentation, onboarding, campaigns and iteration. What we
                ship for clients is held to the same standard as what we run in
                production ourselves.
              </p>
              <Ornament variant="fleuron" width={80} height={24} />
              <div className="founder-meta">
                <a
                  href="https://x.com/zenpho"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  X · @zenpho
                </a>
                <a
                  href="https://www.linkedin.com/company/zenpho"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  LinkedIn
                </a>
                <a
                  href="https://github.com/janselazo"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  GitHub
                </a>
              </div>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}

function AboutJourney() {
  return (
    <section className="section" id="journey">
      <div className="shell">
        <SectionHead
          eyebrow="Journey"
          title={
            <>
              From software craft <em>to shipping</em> products.
            </>
          }
          blurb="A short timeline of the chapters that shaped how we work."
        />
        <Reveal className="journey-track" stagger>
          {MILESTONES.map((m, i) => (
            <div className="journey-step" key={i}>
              <div className="journey-year">{m.y}</div>
              <h4>{m.h}</h4>
              <p>{m.p}</p>
            </div>
          ))}
        </Reveal>
      </div>
    </section>
  );
}

function AboutStats() {
  return (
    <section className="stats-grid">
      {STATS.map((s, i) => (
        <Reveal className="stat" key={i}>
          <div className="stat-num">{s.n}</div>
          <Ornament
            className="stat-orn"
            variant="rule"
            width={44}
            height={14}
          />
          <div className="stat-label">{s.l}</div>
          <div className="stat-desc">{s.d}</div>
        </Reveal>
      ))}
    </section>
  );
}

export default function AboutPageContent() {
  return (
    <>
      <PageHero
        eyebrow="About · MMXXVI"
        headline={
          <>
            We help founders <em>turn ideas</em> into launch-ready products.
          </>
        }
        lead="Zenpho is an MVP development studio — clarifying scope, crafting the experience, engineering what matters, and supporting you after release so you learn from real usage, not assumptions."
        art={
          <VitruvianMark
            width={440}
            height={440}
            color="rgba(244,240,228,.92)"
            accent="#E6D6A8"
          />
        }
        ctaPrimary="Book a free build call"
        ctaSecondary={{
          label: "Run a Revenue Leak audit",
          href: "/tools/business-audit",
        }}
      />
      <TrustedBy />
      <AboutStory />
      <AboutPhilosophy />
      <AboutWho />
      <AboutDeliverables />
      <AboutFounder />
      <AboutStats />
      <AboutJourney />
      <CTABanner
        title={
          <>
            Plan your next <em>website or product</em> milestone.
          </>
        }
        lead="Book a working session — scope, stack, roadmap, and concrete next steps for your MVP or storefront build."
      />
    </>
  );
}
