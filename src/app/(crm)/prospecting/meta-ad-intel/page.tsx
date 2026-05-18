import { Suspense } from "react";
import MetaAdIntelModule from "@/components/crm/meta-ad-intel/MetaAdIntelModule";

export const dynamic = "force-dynamic";

export default function MetaAdIntelPage() {
  return (
    <div className="p-8">
      <Suspense fallback={<div className="text-sm text-text-secondary">Loading...</div>}>
        <MetaAdIntelModule />
      </Suspense>
    </div>
  );
}
