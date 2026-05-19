import type { Metadata } from "next";
import AboutPageContent from "./AboutPageContent";

export const metadata: Metadata = {
  title: {
    absolute: "About · Zenpho · MVP Product Studio",
  },
  description:
    "Who we are, how we work, and how Zenpho helps founders and businesses turn ideas into launch-ready digital products.",
};

export default function AboutPage() {
  return <AboutPageContent />;
}
