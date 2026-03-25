import Link from "next/link";
import {
  PROSPECTING_SECTIONS,
  type ProspectingSection,
} from "@/lib/crm/prospecting-nav";
import SoonBadge from "@/components/crm/prospecting/SoonBadge";

function HubCard({ section }: { section: ProspectingSection }) {
  const Icon = section.icon;
  return (
    <Link
      href={section.href}
      className="group flex flex-col rounded-2xl border border-border bg-white p-5 shadow-sm transition-all hover:border-accent/25 hover:shadow-md dark:border-zinc-800/80 dark:bg-zinc-900/40 dark:hover:border-blue-500/30"
    >
      <div className="flex items-start justify-between gap-2">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10 text-accent dark:bg-blue-500/15 dark:text-blue-400">
          <Icon className="h-5 w-5" strokeWidth={1.5} aria-hidden />
        </span>
        {section.soon ? <SoonBadge /> : null}
      </div>
      <h2 className="mt-4 text-base font-semibold text-text-primary group-hover:text-accent dark:text-zinc-100 dark:group-hover:text-blue-400">
        {section.label}
      </h2>
      <p className="mt-1 flex-1 text-sm leading-relaxed text-text-secondary dark:text-zinc-400">
        {section.description}
      </p>
      <span className="mt-4 text-sm font-medium text-accent dark:text-blue-400">
        Open →
      </span>
    </Link>
  );
}

export default function ProspectingHub() {
  return (
    <div>
      <h1 className="heading-display text-2xl font-bold text-text-primary dark:text-zinc-100">
        Prospecting
      </h1>
      <p className="mt-1 max-w-2xl text-sm text-text-secondary dark:text-zinc-400">
        Generate B2B leads and book agency appointments — playbook, content,
        campaigns, and growth channels in one hub. Pick a module to get started.
      </p>
      <div className="mt-10 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {PROSPECTING_SECTIONS.map((section) => (
          <HubCard key={section.slug} section={section} />
        ))}
      </div>
    </div>
  );
}
