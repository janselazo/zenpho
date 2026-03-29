import DealsView from "@/components/crm/DealsView";
import { fetchDealsForDealsView } from "@/lib/crm/fetch-deals-for-view";
import { fetchLeadsForDealPicker } from "@/lib/crm/fetch-leads-for-deal-picker";
import { fetchCrmPipelineSettings } from "@/lib/crm/fetch-pipeline-settings";

export const dynamic = "force-dynamic";

export default async function DealsPage() {
  const [deals, leadPickerOptions, pipeline] = await Promise.all([
    fetchDealsForDealsView(),
    fetchLeadsForDealPicker(),
    fetchCrmPipelineSettings(),
  ]);

  return (
    <div className="p-8">
      <DealsView
        deals={deals}
        persistDeals
        leadPickerOptions={leadPickerOptions}
        dealPipelineColumns={pipeline.deal}
      />
    </div>
  );
}
