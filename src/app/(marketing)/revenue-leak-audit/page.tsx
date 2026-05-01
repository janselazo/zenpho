import { permanentRedirect } from "next/navigation";

export default function LegacyRevenueLeakAuditPathPage() {
  permanentRedirect("/revenue");
}
