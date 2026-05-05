export default function ToolsHubView() {
  return (
    <div>
      <h1 className="heading-display text-2xl font-bold text-text-primary dark:text-zinc-100">
        Tools
      </h1>
      <p className="mt-1 max-w-2xl text-sm text-text-secondary dark:text-zinc-400">
        Small, sharp free utilities for tech and e‑commerce founders — one clear problem, one
        tool, shipped fast. They rank, sit in workflows, and market Zenpho for years (think
        Ahrefs-style free checkers that outlive most ad spend).
      </p>
      <p className="mt-3 max-w-2xl text-sm text-text-secondary dark:text-zinc-400">
        Each tool will have a public page on the marketing site for discovery and SEO; this hub
        is where we track what exists and surface links in the Tools tab as we ship.
      </p>

      <div className="mt-8 rounded-2xl border border-border bg-white p-6 shadow-sm dark:border-zinc-800/80 dark:bg-zinc-900/50 dark:shadow-none">
        <h2 className="text-sm font-semibold text-text-primary dark:text-zinc-100">
          Coming next
        </h2>
        <p className="mt-2 text-sm text-text-secondary dark:text-zinc-400">
          No live tools yet. When we launch a calculator, checker, or similar utility, it will
          appear here under the{" "}
          <strong className="font-medium text-text-primary dark:text-zinc-200">
            Lead Magnets → Tools
          </strong>{" "}
          tab.
        </p>
      </div>

      <div className="mt-6 rounded-2xl border border-dashed border-border/80 bg-surface/40 p-5 dark:border-zinc-700/60 dark:bg-zinc-900/30">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-text-secondary/80 dark:text-zinc-500">
          How we add a tool
        </h2>
        <ul className="mt-3 list-inside list-disc space-y-1.5 text-sm text-text-secondary dark:text-zinc-400">
          <li>
            Add a route (e.g.{" "}
            <code className="rounded bg-surface px-1 py-0.5 font-mono text-xs dark:bg-zinc-800">
              /prospecting/product-led/tools/your-tool
            </code>
            ).
          </li>
          <li>
            Register it in{" "}
            <code className="rounded bg-surface px-1 py-0.5 font-mono text-xs dark:bg-zinc-800">
              src/lib/crm/tools-nav.ts
            </code>{" "}
            so it appears on the Tools tab under Lead Magnets.
          </li>
          <li>Ship the public marketing URL when ready so founders can find it without logging in.</li>
        </ul>
      </div>
    </div>
  );
}
