"use client";

import {
  Mails,
  Megaphone,
  Users,
  Share2,
  Briefcase,
  FileSearch,
  FileText,
  Gauge,
  Newspaper,
  Mail,
} from "lucide-react";
import {
  getProspectingSection,
  type ProspectingSectionSlug,
} from "@/lib/crm/prospecting-nav";
import ColdOutreachView from "@/components/crm/prospecting/ColdOutreachView";
import ProspectsIntelligenceView from "@/components/crm/prospecting/ProspectsIntelligenceView";
import type { MergedCrmFieldOptions } from "@/lib/crm/field-options";
import NetworkingEventsView from "@/components/crm/prospecting/NetworkingEventsView";
import SocialMediaProspectingPlaceholder from "@/components/crm/prospecting/SocialMediaProspectingPlaceholder";
import ComingSoonModule from "@/components/crm/prospecting/ComingSoonModule";
import ProspectingTabbedShell, {
  PlaceholderPanel,
} from "@/components/crm/prospecting/ProspectingTabbedShell";

export default function ProspectingSectionClient({
  slug,
  fieldOptions,
}: {
  slug: ProspectingSectionSlug;
  fieldOptions: MergedCrmFieldOptions;
}) {
  const section = getProspectingSection(slug);
  if (!section) return null;

  if (slug === "playbook") {
    return <ColdOutreachView />;
  }

  if (slug === "prospects") {
    return <ProspectsIntelligenceView fieldOptions={fieldOptions} />;
  }

  if (slug === "networking") {
    return <NetworkingEventsView />;
  }

  if (slug === "social-media") {
    return (
      <div>
        <h1 className="heading-display text-2xl font-bold text-text-primary dark:text-zinc-100">
          Social Media
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-text-secondary dark:text-zinc-400">
          Plan and publish B2B content to grow trust and inbound leads from
          social channels.
        </p>
        <div className="mt-8">
          <SocialMediaProspectingPlaceholder />
        </div>
      </div>
    );
  }

  if (section.soon && section.comingSoonFeatures?.length) {
    return (
      <ComingSoonModule
        title={section.label}
        description={section.description}
        features={section.comingSoonFeatures}
        icon={section.icon}
      />
    );
  }

  if (slug === "campaigns") {
    return (
      <ProspectingTabbedShell
        title="Campaigns"
        description={section.description}
        ariaLabel="Campaigns"
        tabs={[
          {
            id: "email-marketing",
            label: "Email Marketing",
            icon: Mails,
            body: (
              <PlaceholderPanel text="Newsletters, nurture sequences, and one-to-one outreach — templates, sends, and replies will connect to Leads and Deals in a later phase." />
            ),
          },
          {
            id: "paid-ads",
            label: "Paid Ads",
            icon: Megaphone,
            body: (
              <PlaceholderPanel text="LinkedIn, Meta, and search campaigns — budgets, creatives, and conversion tracking will live here once integrations are wired." />
            ),
          },
        ]}
      />
    );
  }

  if (slug === "partnerships") {
    return (
      <ProspectingTabbedShell
        title="Partnerships"
        description={section.description}
        ariaLabel="Partnerships"
        tabs={[
          {
            id: "partners",
            label: "Partners",
            icon: Users,
            body: (
              <PlaceholderPanel text="Directory of agencies, tech partners, and referrers with status and owner." />
            ),
          },
          {
            id: "programs",
            label: "Programs",
            icon: Share2,
            body: (
              <PlaceholderPanel text="Co-marketing motions, rev-share agreements, and joint GTM plays." />
            ),
          },
          {
            id: "pipeline",
            label: "Pipeline",
            icon: Briefcase,
            body: (
              <PlaceholderPanel text="Opportunities sourced or influenced by partners, linked to Deals." />
            ),
          },
        ]}
      />
    );
  }

  if (slug === "seo") {
    return (
      <ProspectingTabbedShell
        title="SEO"
        description={section.description}
        ariaLabel="SEO"
        tabs={[
          {
            id: "keywords",
            label: "Keywords",
            icon: FileSearch,
            body: (
              <PlaceholderPanel text="Target terms, intent, and ranking snapshots for your agency pages and pillar content." />
            ),
          },
          {
            id: "content",
            label: "Content",
            icon: FileText,
            body: (
              <PlaceholderPanel text="Content calendar tied to clusters, briefs, and publish status." />
            ),
          },
          {
            id: "blog",
            label: "Blog",
            icon: Newspaper,
            body: (
              <PlaceholderPanel text="Blog post ideas, outlines, drafts, and published articles — map posts to target keywords and internal links." />
            ),
          },
          {
            id: "newsletter",
            label: "Newsletter",
            icon: Mail,
            body: (
              <PlaceholderPanel text="Subscriber list health, issue drafts, send schedule, and archive — tie sends to campaigns and re-use blog or SEO themes." />
            ),
          },
          {
            id: "technical",
            label: "Technical",
            icon: Gauge,
            body: (
              <PlaceholderPanel text="Core Web Vitals, indexation, and crawl issues — integrations TBD." />
            ),
          },
        ]}
      />
    );
  }

  return null;
}
