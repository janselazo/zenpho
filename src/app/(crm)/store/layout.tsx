import type { ReactNode } from "react";
import { StoreCartProvider } from "@/components/store/StoreCartProvider";

export default function StoreLayout({ children }: { children: ReactNode }) {
  return <StoreCartProvider>{children}</StoreCartProvider>;
}
