import Link from "next/link";
import PageHero from "@/components/marketing/sections/PageHero";
import SectionHead from "@/components/marketing/sections/SectionHead";
import TrustedBy from "@/components/marketing/sections/TrustedBy";
import CTABanner from "@/components/marketing/sections/CTABanner";
import { Reveal } from "@/components/marketing/renaissance/Reveal";
import { Ornament } from "@/components/marketing/renaissance/Ornament";
import {
  ArchColonnade,
  Astrolabe,
  Cartouche,
  HeraldTrumpet,
  Obelisk,
  Putti,
  VitruvianMark,
} from "@/components/marketing/renaissance/RenaissanceArt";

const CANONS = [
  {
    r: "I",
    h: "Clarity before code.",
    p: "Every product, internal or external, opens with a brief — not a backlog. We pin the version that ships, in writing, before we build a thing.",
  },
  {
    r: "II",
    h: "Ship to learn.",
    p: "A working v1 beats a perfect v2 in deck form. We launch fast on purpose — the market is the only critic that matters.",
  },
  {
    r: "III",
    h: "Own the whole pipeline.",
    p: "Strategy, design, build, deploy, operate. One team, one repo, one accountable lead. No hand-offs that drop on the floor.",
  },
  {
    r: "IV",
    h: "Bespoke, not boilerplate.",
    p: "Every product we ship — ours or yours — is built for the patron in front of us. We don't recycle a \"good enough\" template.",
  },
  {
    r: "V",
    h: "Stay after launch.",
    p: "Launch is the start, not the finish. We run our own products in production, so we know what it takes to keep yours alive.",
  },
  {
    r: "VI",
    h: "Beautiful is functional.",
    p: "A site that converts. An app that retains. A product that compounds. Craft isn't decoration — it's the moat.",
  },
];

const STATS = [
  {
    n: <>3</>,
    l: "Products in the studio",
    d: "Zenpho CRM, SoldTools, 305 Car Deals.",
  },
  {
    n: (
      <>
        50<sup>+</sup>
      </>
    ),
    l: "Patrons served",
    d: "From local businesses to funded startups.",
  },
  {
    n: (
      <>
        200<sup>+</sup>
      </>
    ),
    l: "Works shipped",
    d: "Sites, apps, MVPs and ad creatives.",
  },
  {
    n: "MMXX",
    l: "Studio founded",
    d: "Six years of commissions, no two alike.",
  },
];

const PORTFOLIO = [
  {
    name: "Zenpho CRM",
    status: "In development" as const,
    subtitle: "Digital agencies · marketing · software · creative",
    tagline: "Prospect, manage clients, run projects, report — one workspace.",
    description:
      "The tool Zenpho uses every day — prospecting, client management, project delivery and reporting in one place. Built for marketing agencies, software development shops and creative studios that need pipeline, delivery and visibility without juggling five subscriptions.",
    why: "We outgrew CRMs that couldn't prospect, PM tools that couldn't manage clients, and spreadsheets that couldn't report. So we built the stack we run on every commission — and we're opening it to agencies like ours.",
    href: "https://app.zenpho.com",
    art: <Astrolabe width={120} height={120} accent="#C19D5A" />,
  },
  {
    name: "SoldTools",
    status: "Live" as const,
    subtitle: "Built for automotive sales pros",
    tagline: "Software for the people on the floor.",
    description:
      "Finance calculators, deal structuring, lease math, customer follow-up scripts and AI-assisted outreach for car salespeople. Built by someone who's worked the floor, not someone who's read about it.",
    why: "The automotive sales industry runs on spreadsheets, group chats and memory. SoldTools turns the top 1% of salesperson's workflow into software the other 99% can run.",
    href: "https://soldtools.com",
    art: <HeraldTrumpet width={130} height={120} accent="#C19D5A" />,
  },
  {
    name: "305 Car Deals",
    status: "Live" as const,
    subtitle: "Personal brand turned product",
    tagline: "A Miami-first automotive marketplace.",
    description:
      "Bilingual, mobile-first, built around how South Florida actually buys cars. Listings, walkarounds, lease specials and a direct line to a real sales pro, without the dealer-site nonsense.",
    why: "Miami has a Spanish-speaking, deal-driven car market and no digital experience that actually serves it. So we made one.",
    href: "https://305cardeals.com",
    art: <ArchColonnade width={150} height={100} accent="#C19D5A" />,
  },
];

const METHOD = [
  {
    n: "01",
    h: "Define the smallest version",
    p: "We write the brief before we write the code. What's the one thing this product has to do well to earn the right to exist? Everything else waits.",
  },
  {
    n: "02",
    h: "Design in the open",
    p: "Wireframes, brand, UX flows — all locked before engineering starts. Beautiful is functional, and functional starts with clarity.",
  },
  {
    n: "03",
    h: "Build in one sprint",
    p: "Two-week sprints, end-to-end ownership, deploy to production every day. We don't do staging environments that nobody visits.",
  },
  {
    n: "04",
    h: "Launch to learn",
    p: "A working v1 beats a perfect v2 in deck form. We ship, we watch the data, we talk to the first ten users.",
  },
  {
    n: "05",
    h: "Operate and compound",
    p: "Most studios hand off and disappear. We stay. The product earns the next sprint based on what real users actually do.",
  },
];

const COMMISSIONS = [
  {
    art: <ArchColonnade width={120} height={80} accent="#C19D5A" />,
    h: "Custom Websites",
    p: "Marketing sites, ecommerce stores and landing pages.",
    href: "/solutions/custom-websites",
  },
  {
    art: <Astrolabe width={90} height={90} accent="#C19D5A" />,
    h: "Web Apps",
    p: "SaaS MVPs, dashboards, portals, internal tools.",
    href: "/solutions/web-apps",
  },
  {
    art: <Obelisk width={48} height={90} accent="#C19D5A" />,
    h: "Mobile Apps",
    p: "iOS and Android MVPs shipped in one sprint.",
    href: "/solutions/mobile-apps",
  },
  {
    art: <HeraldTrumpet width={100} height={90} accent="#C19D5A" />,
    h: "Creatives Generation",
    p: "Ad creatives for Meta, Instagram & TikTok.",
    href: "/solutions/creatives-generation",
  },
];

function ProductCard({
  product,
}: {
  product: (typeof PORTFOLIO)[number];
}) {
  const badgeClass =
    product.status === "Live"
      ? "studio-product-badge live"
      : "studio-product-badge dev";

  const inner = (
    <>
      <div className="studio-product-head">
        <span className={badgeClass}>{product.status}</span>
        {product.subtitle ? (
          <span className="studio-product-subtitle">{product.subtitle}</span>
        ) : null}
      </div>
      <div className="offer-art">{product.art}</div>
      <h3>{product.name}</h3>
      <p className="studio-product-tagline">{product.tagline}</p>
      <p>{product.description}</p>
      <div className="studio-product-callout">
        <span className="studio-product-callout-label">Why we&apos;re building it</span>
        <p>{product.why}</p>
      </div>
      {product.href ? (
        <span className="offer-link">
          {product.href.startsWith("http") ? "Visit product" : "Learn more"}
        </span>
      ) : (
        <span className="offer-link studio-product-link-muted">Coming soon</span>
      )}
    </>
  );

  if (product.href) {
    const external = product.href.startsWith("http");
    return (
      <Link
        className="offer-card studio-product-card"
        href={product.href}
        {...(external
          ? { target: "_blank", rel: "noopener noreferrer" }
          : {})}
        style={{ textDecoration: "none", color: "inherit" }}
      >
        {inner}
      </Link>
    );
  }

  return <div className="offer-card studio-product-card">{inner}</div>;
}

export default function StudioPageContent() {
  return (
    <>
      <PageHero
        eyebrow="The studio · MMXXVI"
        headline={
          <>
            A small <em>studio</em>, building its <em>own</em> products.
          </>
        }
        lead="Zenpho Studio is a venture studio. We don't just build for clients — we build, launch and operate our own software products using the same playbooks, infrastructure and team we'd bring to any commission."
        art={
          <VitruvianMark
            width={420}
            height={420}
            color="rgba(244,240,228,.92)"
            accent="#E6D6A8"
          />
        }
        ctaPrimary="See what we're building"
        ctaHref="#portfolio"
        ctaSecondary={{ label: "How the studio works", href: "#method" }}
      />
      <TrustedBy />

      <section className="section section-light" id="manifesto">
        <div className="shell">
          <div className="manifesto-grid">
            <Reveal className="manifesto-art ra-draw">
              <Cartouche
                width={380}
                height={460}
                color="var(--navy)"
                accent="#C19D5A"
              >
                <Putti
                  width={140}
                  height={140}
                  className="ra-float"
                  color="var(--navy)"
                  accent="#C19D5A"
                />
              </Cartouche>
            </Reveal>
            <div>
              <SectionHead
                eyebrow="The studio"
                title={
                  <>
                    A studio that <em>bets on itself</em>.
                  </>
                }
              />
              <Reveal className="manifesto-prose">
                <p>
                  Most agencies sell hours. We sell outcomes — and we prove the
                  method by running it on ourselves.
                </p>
                <p>
                  Zenpho Studio is a small team of operators, designers and
                  engineers who build software products end-to-end: from the
                  first sketch on a whiteboard to a live product with paying
                  users. Some of those products serve our clients. Others are
                  ours to keep.
                </p>
                <p>
                  We treat every internal venture the way an old workshop treats
                  a commission — define the smallest version that proves the
                  idea, design it, build it, ship it, and stay to improve it.
                  The difference is the patron is us.
                </p>
                <p>
                  No outside agencies. No off-the-shelf stacks held together
                  with tape. No waiting on a roadmap somebody else controls. One
                  team, one repo, one accountable lead — across every product
                  we put our name on.
                </p>
                <Ornament variant="fleuron" width={80} height={24} />
                <p className="manifesto-quote">
                  &ldquo;If our playbook can&apos;t build our own products, it
                  has no business building yours.&rdquo;
                </p>
              </Reveal>
            </div>
          </div>
        </div>
      </section>

      <section className="section" id="portfolio">
        <div className="shell">
          <SectionHead
            eyebrow="The portfolio"
            title={
              <>
                Three products. <em>One</em> studio.
              </>
            }
            blurb="Each product below is built, owned and operated by Zenpho Studio. Same team, same method, same standard of craft we'd bring to a client engagement."
          />
          <Reveal className="studio-portfolio-grid" stagger>
            {PORTFOLIO.map((product) => (
              <ProductCard product={product} key={product.name} />
            ))}
          </Reveal>
        </div>
      </section>

      <section className="section section-light" id="method">
        <div className="shell">
          <SectionHead
            eyebrow="How we build"
            title={
              <>
                The same <em>five steps</em>, every time.
              </>
            }
            blurb="Our products move through the same pipeline our client work does. That's the point — the playbook is the product."
          />
          <Reveal className="steps-list" stagger>
            {METHOD.map((step) => (
              <div className="step-block" key={step.n}>
                <div className="studio-step-num">{step.n}</div>
                <h4>{step.h}</h4>
                <p>{step.p}</p>
              </div>
            ))}
          </Reveal>
        </div>
      </section>

      <section className="section" id="values">
        <div className="shell">
          <SectionHead
            eyebrow="The studio canons"
            title={
              <>
                Six laws <em>we build</em> by.
              </>
            }
          />
          <Reveal className="practices-wrap" stagger>
            {CANONS.map((v) => (
              <div className="practice" key={v.r}>
                <div className="practice-roman">
                  {v.r}
                  <span className="num">canon</span>
                </div>
                <h4>{v.h}</h4>
                <p>{v.p}</p>
              </div>
            ))}
          </Reveal>
        </div>
      </section>

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

      <section className="section section-light" id="thesis">
        <div className="shell">
          <SectionHead
            eyebrow="The thesis"
            title={
              <>
                We&apos;d rather <em>own equity</em> than bill hours.
              </>
            }
          />
          <Reveal className="manifesto-prose studio-thesis-prose">
            <p>
              Most agencies hit a ceiling — you&apos;re only worth the hours you
              can sell. A studio compounds. Every product we ship for ourselves
              becomes a long-term asset, a real-world case study, and a forcing
              function that keeps our craft sharp.
            </p>
            <p>
              It also keeps us honest. When you hire Zenpho to build your
              product, you&apos;re hiring a team that ships its own. We feel the
              same things you feel — the bugs at 11pm, the conversion drop after
              a launch, the customer who emails to ask if there&apos;s an Android
              version. That&apos;s not a sales pitch. That&apos;s just the job.
            </p>
          </Reveal>

          <Reveal className="studio-commissions">
            <h3 className="studio-commissions-head">We also take on outside commissions.</h3>
            <p className="studio-commissions-lead">
              When the brief fits, we open the studio to outside work — websites,
              web apps, mobile MVPs and ad creatives. Same team, same method.
            </p>
            <div className="studio-commissions-grid">
              {COMMISSIONS.map((o, i) => (
                <Link
                  className="studio-commission-card"
                  key={i}
                  href={o.href}
                  style={{ textDecoration: "none", color: "inherit" }}
                >
                  <div className="studio-commission-art">{o.art}</div>
                  <h4>{o.h}</h4>
                  <p>{o.p}</p>
                  <span className="studio-commission-link">Learn more →</span>
                </Link>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      <CTABanner
        title={
          <>
            Want the studio to <em>build with you?</em>
          </>
        }
        lead="Bring us a product idea — yours or ours, equity or cash. A free thirty-minute build call, no pitch deck, no obligation."
        primaryLabel="Book a free build call"
        primaryHref="/contact"
        secondaryHref="/case-studies"
        secondaryLabel="See our client work"
      />
    </>
  );
}
