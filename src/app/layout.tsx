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
  title: "Zenpho | AI MVP Development Studio for Founders",
  description:
    "Zenpho helps founders build and launch AI-powered MVPs in 2 weeks with product strategy, UX/UI, web app development, AI integrations, analytics, and growth support.",
  openGraph: {
    title: "Zenpho | AI MVP Development Studio for Founders",
    description:
      "Zenpho helps founders build and launch AI-powered MVPs in 2 weeks with product strategy, UX/UI, web app development, AI integrations, analytics, and growth support.",
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
