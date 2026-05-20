import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { DEFAULT_SITE_ORIGIN, SITE_ORIGIN, buildMarketingMetadata } from "@/lib/marketing/seo";
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

export const metadata: Metadata = {
  metadataBase: new URL(SITE_ORIGIN || DEFAULT_SITE_ORIGIN),
  ...buildMarketingMetadata({
    title: "Zenpho — MVP Development Agency | Miami",
    description:
      "Zenpho is a Miami-based MVP development agency working with founders and operators across the US and worldwide. Websites, web apps, mobile apps and ad creatives shipped in as little as two weeks.",
    path: "/",
  }),
  verification: {
    google: process.env.NEXT_PUBLIC_GSC_VERIFICATION,
    other: {
      "msvalidate.01": process.env.NEXT_PUBLIC_BING_VERIFICATION ?? "",
    },
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
        className={`${inter.variable} ${jetbrainsMono.variable} min-h-screen bg-background font-sans text-foreground antialiased`}
      >
        {children}
        <SpeedInsights />
      </body>
    </html>
  );
}
