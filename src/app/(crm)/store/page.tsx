import { getActiveProducts } from "@/lib/store/catalog";
import { StoreHeader } from "@/components/store/StoreHeader";
import { StoreMarketplaceClient } from "@/components/store/StoreMarketplaceClient";

export const dynamic = "force-dynamic";

export default async function StorePage() {
  const products = await getActiveProducts();
  return (
    <div className="flex flex-col">
      <StoreHeader />
      <StoreMarketplaceClient products={products} />
    </div>
  );
}
