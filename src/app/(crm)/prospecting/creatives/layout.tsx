import { getProspectingSection } from "@/lib/crm/prospecting-nav";
import ContentMarketingShell from "./ContentMarketingShell";

export default function CreativesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const section = getProspectingSection("creatives");

  return (
    <div className="p-8">
      {section ? (
        <>
          <h1 className="heading-display text-2xl font-bold text-text-primary dark:text-zinc-100">
            {section.label}
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-text-secondary dark:text-zinc-400">
            {section.description}
          </p>
          <div className="mt-8">
            <ContentMarketingShell>{children}</ContentMarketingShell>
          </div>
        </>
      ) : (
        <ContentMarketingShell>{children}</ContentMarketingShell>
      )}
    </div>
  );
}
