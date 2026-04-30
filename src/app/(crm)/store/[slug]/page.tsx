import { notFound } from "next/navigation";
import { getProductBySlug } from "@/lib/store/catalog";
import { StoreHeader } from "@/components/store/StoreHeader";
import { StoreProductDetailClient } from "@/components/store/StoreProductDetailClient";

export const dynamic = "force-dynamic";

export default async function StoreProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();
  return (
    <div className="flex flex-col">
      <StoreHeader showOrders={false} />
      <StoreProductDetailClient product={product} />
    </div>
  );
}
