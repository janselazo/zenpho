import type { Metadata } from "next";
import StudioPageContent from "./StudioPageContent";

export const metadata: Metadata = {
  title: {
    absolute: "Zenpho Studio | Products Built by Zenpho",
  },
  description:
    "Explore Zenpho Studio — digital products built by Zenpho, including Soldtools, Business Audit, and Branding Kit.",
  openGraph: {
    title: "Zenpho Studio | Products Built by Zenpho",
    description:
      "Explore Zenpho Studio — digital products built by Zenpho, including Soldtools, Business Audit, and Branding Kit.",
  },
};

export default function StudioPage() {
  return <StudioPageContent />;
}
