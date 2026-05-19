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
    p: "Every commission opens with a brief, not a backlog. We pin the version that ships, in writing, before we build a thing.",
  },
  {
    r: "II",
    h: "Ship to learn.",
    p: "A working v1 beats a perfect v2 in deck form. We launch fast on purpose — because the market is the only critic that matters.",
  },
  {
    r: "III",
    h: "Own the whole pipeline.",
    p: "Strategy, design, build, deploy, post-launch. One team, one repo, one accountable lead. No hand-offs that drop on the floor.",
  },
  {
    r: "IV",
    h: "Bespoke, not boilerplate.",
    p: "Every site, app and creative we ship is built for the patron in front of us. We do not recycle a 'good enough' template.",
  },
  {
    r: "V",
    h: "Stay after launch.",
    p: "Launch is the start, not the finish. We watch the analytics with you and brief the next sprint based on what real users do.",
  },
  {
    r: "VI",
    h: "Beautiful is functional.",
    p: "A site that converts. An app that retains. A creative that hooks. We aim for craft because craft compounds.",
  },
];

const STATS = [
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
    n: (
      <>
        2<sup>wk</sup>
      </>
    ),
    l: "Average build",
    d: "From signed brief to live MVP.",
  },
  {
    n: "MMXX",
    l: "Studio founded",
    d: "Six years of commissions, no two alike.",
  },
];

const SERVICES = [
  {
    art: <ArchColonnade width={160} height={110} accent="#C19D5A" />,
    h: "Custom Websites",
    p: "Marketing sites, ecommerce stores and landing pages.",
    href: "/solutions/custom-websites",
  },
  {
    art: <Astrolabe width={120} height={120} accent="#C19D5A" />,
    h: "Web Apps",
    p: "SaaS MVPs, dashboards, portals, internal tools.",
    href: "/solutions/web-apps",
  },
  {
    art: <Obelisk width={64} height={120} accent="#C19D5A" />,
    h: "Mobile Apps",
    p: "iOS and Android MVPs shipped in one sprint.",
    href: "/solutions/mobile-apps",
  },
  {
    art: <HeraldTrumpet width={140} height={120} accent="#C19D5A" />,
    h: "Creatives Generation",
    p: "Ad creatives for Meta, Instagram & TikTok.",
    href: "/solutions/creatives-generation",
  },
];

export default function StudioPageContent() {
  return (
    <>
      <PageHero
        eyebrow="The studio · MMXXVI"
        headline={
          <>
            A small <em>studio</em>, with a clear method.
          </>
        }
        lead="Zenpho is a product studio for founders and businesses — strategy, design, engineering and creatives, under one roof, with no studio layers in the middle."
        art={
          <VitruvianMark
            width={420}
            height={420}
            color="rgba(244,240,228,.92)"
            accent="#E6D6A8"
          />
        }
        ctaSecondary={{ label: "Compare packages", href: "/pricing" }}
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
                    An studio <em>for new</em> media.
                  </>
                }
                blurb="We help founders and businesses turn ideas into launch-ready websites, web apps, mobile apps, MVPs and ad creatives — without hiring a full product team."
              />
              <Reveal className="manifesto-prose">
                <p>
                  Zenpho is a small studio with the discipline of an old
                  workshop and the speed of a modern team.
                </p>
                <p>
                  We treat each project like a commission: clarify the brief,
                  define the smallest version that proves the idea, design,
                  build, ship, and stay to improve.
                </p>
                <p>
                  No theme templates. No 30-page proposals. No studio layers
                  between you and the people doing the work.
                </p>
                <Ornament variant="fleuron" width={80} height={24} />
                <p className="manifesto-quote">
                  &ldquo;We help founders move from idea to a working product
                  without wasting time on features they do not need yet.&rdquo;
                </p>
              </Reveal>
            </div>
          </div>
        </div>
      </section>

      <section className="section" id="values">
        <div className="shell">
          <SectionHead
            eyebrow="The studio canons"
            title={
              <>
                Six laws <em>we work</em> by.
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

      <section className="section section-light" id="services">
        <div className="shell">
          <SectionHead
            eyebrow="What we ship"
            title={
              <>
                Four disciplines. <em>One</em> studio.
              </>
            }
            blurb="Different mediums, same method — define the smallest version that proves the idea, then ship it."
          />
          <Reveal className="offer-grid offer-grid-4" stagger>
            {SERVICES.map((o, i) => (
              <Link
                className="offer-card"
                key={i}
                href={o.href}
                style={{ textDecoration: "none", color: "inherit" }}
              >
                <div className="offer-art">{o.art}</div>
                <h3>{o.h}</h3>
                <p>{o.p}</p>
                <span className="offer-link">Learn more</span>
              </Link>
            ))}
          </Reveal>
        </div>
      </section>

      <CTABanner
        title={
          <>
            Like the way we work? <em>Let&apos;s talk.</em>
          </>
        }
        lead="A free thirty-minute build call. No pitch deck, no obligation."
      />
    </>
  );
}
