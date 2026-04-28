export default function PricingComparisonTable() {
  return (
    <div className="mx-auto mt-16 max-w-4xl overflow-x-auto rounded-2xl border border-border/80 bg-white shadow-soft lg:mt-20">
      <table className="min-w-full border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-border bg-surface/80">
            <th className="px-5 py-4 font-semibold text-text-primary sm:px-6">
              Service
            </th>
            <th className="hidden px-4 py-4 font-semibold text-text-primary sm:table-cell md:min-w-[12rem]">
              Best For
            </th>
            <th className="whitespace-nowrap px-4 py-4 font-semibold text-text-primary">
              Starting Price
            </th>
            <th className="whitespace-nowrap px-5 py-4 font-semibold text-text-primary sm:px-6">
              Typical Range
            </th>
          </tr>
        </thead>
        <tbody className="text-text-secondary [&_td]:border-t [&_td]:border-border/70">
          <tr>
            <td className="px-5 py-4 font-medium text-text-primary sm:px-6">
              MVP Development
            </td>
            <td className="hidden px-4 py-4 sm:table-cell">
              Building your AI-powered MVP, web app, SaaS, mobile-first app, internal tool, or marketplace
            </td>
            <td className="px-4 py-4 font-semibold tabular-nums text-text-primary">
              From $3,000
            </td>
            <td className="whitespace-nowrap px-5 py-4 font-semibold tabular-nums text-text-primary sm:px-6">
              $3,000–$30,000+
            </td>
          </tr>
          <tr>
            <td className="px-5 py-4 font-medium text-text-primary sm:px-6">
              MVP Growth
            </td>
            <td className="hidden px-4 py-4 sm:table-cell">
              Launching your MVP, getting beta users, improving messaging, and testing growth channels
            </td>
            <td className="px-4 py-4 tabular-nums font-medium text-text-primary">$2,500</td>
            <td className="whitespace-nowrap px-5 py-4 tabular-nums sm:px-6">$2.5k–$25k+</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
