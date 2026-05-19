"use client";

import Link from "next/link";
import { Reveal } from "@/components/marketing/renaissance/Reveal";
import { Ornament } from "@/components/marketing/renaissance/Ornament";
import {
  Astrolabe,
  CompassRose,
  HeraldTrumpet,
  LaurelWreath,
  Obelisk,
  Sunburst,
} from "@/components/marketing/renaissance/RenaissanceArt";
import PageHero from "@/components/marketing/sections/PageHero";
import SectionHead from "@/components/marketing/sections/SectionHead";
import CTABanner from "@/components/marketing/sections/CTABanner";
import { blogPosts, type BlogPost } from "@/lib/marketing/blog-posts";

const ART_BY_CATEGORY: Record<string, React.ReactNode> = {
  Product: (
    <CompassRose
      width={140}
      height={140}
      color="rgba(244,240,228,.92)"
      accent="#E6CB85"
      className="ra-spin-slow"
    />
  ),
  Marketing: (
    <HeraldTrumpet
      width={150}
      height={150}
      color="rgba(244,240,228,.92)"
      accent="#E6CB85"
    />
  ),
  Engineering: (
    <Astrolabe
      width={150}
      height={150}
      color="rgba(244,240,228,.92)"
      accent="#E6CB85"
    />
  ),
  Mobile: (
    <Obelisk width={120} height={200} color="rgba(244,240,228,.92)" accent="#E6CB85" />
  ),
  Playbooks: (
    <Sunburst
      width={140}
      height={140}
      color="rgba(244,240,228,.92)"
      accent="#E6CB85"
    />
  ),
};

const FALLBACK_ART = (
  <LaurelWreath
    width={140}
    height={140}
    color="rgba(244,240,228,.92)"
    accent="#E6CB85"
    content="✦"
  />
);

function artFor(category: string) {
  return ART_BY_CATEGORY[category] ?? FALLBACK_ART;
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function FeaturedArticle({ post }: { post: BlogPost }) {
  return (
    <Reveal as="article" className="blog-featured">
      <div className="blog-featured-art">{artFor(post.category)}</div>
      <div className="blog-featured-body">
        <div className="blog-tag-row">
          <span className="blog-tag">{post.category}</span>
          <span className="blog-tag accent">Latest</span>
        </div>
        <h2 className="blog-featured-title">{post.title}</h2>
        <p className="blog-featured-dek">{post.excerpt}</p>
        <div className="blog-meta">
          <div className="blog-stats">
            <span>{formatDate(post.date)}</span>
            <span className="dot" />
            <span>{post.readTime}</span>
          </div>
        </div>
        <Link href={`/blog/${post.slug}`} className="btn-primary">
          Read article <span className="btn-arrow">↗</span>
        </Link>
      </div>
    </Reveal>
  );
}

function ArticleCard({ post }: { post: BlogPost }) {
  return (
    <Link href={`/blog/${post.slug}`} className="blog-card">
      <div className="blog-card-head">
        <div className="blog-card-art">{artFor(post.category)}</div>
        <div className="blog-card-cat">{post.category}</div>
      </div>
      <h3 className="blog-card-title">{post.title}</h3>
      <p className="blog-card-dek">{post.excerpt}</p>
      <div className="blog-card-foot">
        <span className="blog-stats">
          {formatDate(post.date)}
          <span className="dot" />
          {post.readTime}
        </span>
        <span className="blog-card-arr">→</span>
      </div>
    </Link>
  );
}

export default function BlogPageContent() {
  const [featured, ...rest] = blogPosts;

  return (
    <>
      <PageHero
        eyebrow="Blog · MMXXVI"
        headline={<>Field notes <em>from</em> the studio.</>}
        lead="Tactical writing on MVPs, websites, apps, ad creatives and product launches — from the team that ships them, with the rough edges left in."
        art={
          <LaurelWreath
            width={420}
            height={420}
            color="rgba(244,240,228,.92)"
            accent="#E6D6A8"
            content="IV"
          />
        }
        ctaSecondary={{ label: "Browse case studies", href: "/case-studies" }}
      />

      <section className="section" id="blog-index">
        <div className="shell">
          <SectionHead
            eyebrow="Field notes · MMXXVI"
            title={<>Notes from <em>the studio</em>.</>}
            blurb="Tactical writing on MVPs, websites, apps, ad creatives and launches — from the team actually shipping them."
          />
          {featured ? <FeaturedArticle post={featured} /> : null}
          {rest.length > 0 ? (
            <Reveal as="div" className="blog-grid" stagger>
              {rest.map((post) => (
                <ArticleCard post={post} key={post.slug} />
              ))}
            </Reveal>
          ) : null}
        </div>
      </section>

      <section className="section section-light" id="newsletter">
        <div className="shell">
          <Reveal as="div" className="newsletter">
            <div className="newsletter-body">
              <div className="eyebrow">Field notes · monthly</div>
              <Ornament variant="fleuron" width={80} height={20} />
              <h2>
                One letter a month. <em>Zero</em> noise.
              </h2>
              <p>
                The same notes we write to ourselves — what&apos;s working in client
                builds, what is changing in the stack, and the occasional teardown of a
                creative or product flow we ran.
              </p>
            </div>
            <Link
              href="/contact"
              className="btn-primary"
              style={{ alignSelf: "center" }}
            >
              Get in touch <span className="btn-arrow">↗</span>
            </Link>
          </Reveal>
        </div>
      </section>

      <CTABanner
        title={<>Want a deeper read <em>on your stack?</em></>}
        lead="Book a free thirty-minute call. We will share what's working in similar builds — your stack, your industry, your launch window."
      />
    </>
  );
}
