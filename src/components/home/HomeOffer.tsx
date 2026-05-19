"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { Reveal } from "@/components/marketing/renaissance/Reveal";
import SectionHead from "@/components/marketing/sections/SectionHead";
import {
  ArchColonnade,
  Astrolabe,
  CompassRose,
  LaurelWreath,
  Obelisk,
  Sunburst,
} from "@/components/marketing/renaissance/RenaissanceArt";

type Offer = {
  art: ReactNode;
  h: string;
  p: string;
  href: string;
};

const OFFERS: Offer[] = [
  {
    art: <ArchColonnade width={180} height={120} accent="#C19D5A" />,
    h: "Custom Websites",
    p: "A professional business or ecommerce website that explains your offer, builds trust, and gives visitors a clear path to take action.",
    href: "/solutions/custom-websites",
  },
  {
    art: <Astrolabe width={130} height={130} accent="#C19D5A" />,
    h: "Functional Web Apps",
    p: "Turn your idea into a working web app with user login, dashboards, admin tools, databases, payments and integrations.",
    href: "/solutions/web-apps",
  },
  {
    art: <Obelisk width={70} height={140} accent="#C19D5A" />,
    h: "Mobile App MVPs",
    p: "A focused mobile app experience for iOS and Android users with clean onboarding, core features, and a smooth user flow.",
    href: "/solutions/mobile-apps",
  },
  {
    art: <CompassRose width={130} height={130} accent="#C19D5A" />,
    h: "Clear Product Roadmaps",
    p: "Define what needs to be built first, what can wait, and how to avoid wasting time and budget on unnecessary features.",
    href: "/studio",
  },
  {
    art: <LaurelWreath width={130} height={130} accent="#C19D5A" content="✓" />,
    h: "Faster Market Validation",
    p: "Get your first version in front of real users quickly so you can collect feedback, test demand, and improve with confidence.",
    href: "/pricing",
  },
  {
    art: <Sunburst width={130} height={130} accent="#C19D5A" />,
    h: "Post-Launch Improvements",
    p: "After launch, we help you improve features, fix friction, add integrations, and build the next version based on real feedback.",
    href: "/contact",
  },
];

export default function HomeOffer() {
  return (
    <section className="section" id="offer">
      <div className="shell">
        <SectionHead
          eyebrow="What we help you launch"
          title={
            <>
              Websites, apps & MVPs <em>built to go live</em> fast.
            </>
          }
          blurb="We do not just design screens or write code. We help you clarify the idea, define the first version, build the product, and launch with a clear path for improvement."
        />

        <Reveal className="offer-grid" stagger>
          {OFFERS.map((o, i) => (
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
  );
}
