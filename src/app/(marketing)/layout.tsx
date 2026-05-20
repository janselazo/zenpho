import {
  Instrument_Serif,
  JetBrains_Mono,
  Plus_Jakarta_Sans,
} from "next/font/google";
import MarketingShell from "@/components/layout/MarketingShell";

const instrumentSerif = Instrument_Serif({
  variable: "--font-marketing-serif",
  subsets: ["latin"],
  weight: ["400"],
  style: ["normal", "italic"],
  display: "swap",
});

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-marketing-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  display: "swap",
});

const marketingMono = JetBrains_Mono({
  variable: "--font-marketing-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      className={`${instrumentSerif.variable} ${plusJakartaSans.variable} ${marketingMono.variable}`}
    >
      <MarketingShell>{children}</MarketingShell>
    </div>
  );
}
