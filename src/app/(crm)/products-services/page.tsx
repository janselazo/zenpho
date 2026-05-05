import ProductsServicesPageClient from "@/components/crm/ProductsServicesPageClient";
import { fetchAllCrmCatalog } from "@/lib/crm/fetch-crm-catalog";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const dynamic = "force-dynamic";

export default async function ProductsServicesPage() {
  if (!isSupabaseConfigured()) {
    return (
      <div className="p-8">
        <h1 className="heading-display text-2xl font-bold text-text-primary dark:text-zinc-100">
          Services
        </h1>
        <p className="mt-2 text-text-secondary">Configure Supabase first.</p>
      </div>
    );
  }

  const items = await fetchAllCrmCatalog();

  return (
    <div className="p-8">
      <h1 className="heading-display text-2xl font-bold text-text-primary dark:text-zinc-100">
        Services
      </h1>
      <p className="mt-2 max-w-2xl text-sm text-text-secondary dark:text-zinc-400">
        Catalog items you sell. Use them on invoices and proposals to pull in default descriptions and pricing; line amounts stay editable after insert.
      </p>
      <ProductsServicesPageClient initialItems={items} />
    </div>
  );
}
