import DevelopmentPricingTables from "@/components/services/DevelopmentPricingTables";
import PricingComparisonTable from "@/components/services/PricingComparisonTable";

export default function PricingGrid() {
  return (
    <section className="border-t border-border/50 bg-[#f4f5f7] pb-24 lg:pb-32">
      <div className="mx-auto max-w-7xl px-6 pt-12 lg:px-8 lg:pt-16">
        <DevelopmentPricingTables />
        <PricingComparisonTable />
      </div>
    </section>
  );
}
