import { StoreHeader } from "@/components/store/StoreHeader";
import { StoreCartView } from "@/components/store/StoreCartView";

export const dynamic = "force-dynamic";

export default function StoreCartPage() {
  return (
    <div className="flex flex-col">
      <StoreHeader showCart={false} />
      <StoreCartView />
    </div>
  );
}
