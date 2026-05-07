import type { Metadata } from "next";
import StudioPageContent from "./StudioPageContent";

export const metadata: Metadata = {
  title: {
    absolute: "Zenpho Studio · In-house products",
  },
  description:
    "Zenpho is a product studio too: Soldtools, Business Audit, Branding Kit—plus client builds for websites, web apps, and MVPs.",
};

export default function StudioPage() {
  return <StudioPageContent />;
}
