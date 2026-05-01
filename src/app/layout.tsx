import type { Metadata } from "next";
import { Inter, JetBrains_Mono, Caveat, Lora } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

const caveat = Caveat({
  variable: "--font-caveat",
  subsets: ["latin"],
  display: "swap",
});

/** Italic serif accent on marketing pages (e.g. pricing headline). */
const pricingSerif = Lora({
  variable: "--font-pricing-serif",
  subsets: ["latin"],
  style: ["italic", "normal"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Zenpho · Growth for local service businesses",
  description:
    "Zenpho helps local service businesses generate qualified leads, book more appointments, collect Google reviews, grow referrals, and track which marketing produces revenue—with our web app and expert support.",
  openGraph: {
    title: "Zenpho · Growth for local service businesses",
    description:
      "Qualified leads, appointments, reviews, referrals, and revenue clarity for local service businesses—product plus solutions from Zenpho.",
    type: "website",
    locale: "en_US",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} ${caveat.variable} ${pricingSerif.variable} min-h-screen bg-background font-sans text-foreground antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
