import ContentMarketingShell from "./ContentMarketingShell";

export default function ContentMarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="p-8">
      <ContentMarketingShell>{children}</ContentMarketingShell>
    </div>
  );
}
