import type { Metadata } from "next";
import Script from "next/script";
import {
  Inter,
  Instrument_Serif,
  JetBrains_Mono,
  Plus_Jakarta_Sans,
} from "next/font/google";
import { SpeedInsights } from "@vercel/speed-insights/next";
import GoogleTagManager from "@/components/analytics/GoogleTagManager";
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

// Marketing-scoped fonts (Renaissance/Editorial redesign).
// Consumed only inside .marketing-page-bg via marketing.css.
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

const gtmId = process.env.NEXT_PUBLIC_GTM_ID?.trim();

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
      {gtmId ? (
        <head>
          <link rel="preconnect" href="https://www.googletagmanager.com" />
          <link rel="preconnect" href="https://www.google-analytics.com" />
        </head>
      ) : null}
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} ${instrumentSerif.variable} ${plusJakartaSans.variable} ${marketingMono.variable} min-h-screen bg-background font-sans text-foreground antialiased`}
      >
        <GoogleTagManager />
        {children}
        <SpeedInsights />
        <Script id="zenpho-data-layer-context" strategy="afterInteractive">
          {`window.dataLayer=window.dataLayer||[];window.dataLayer.push({event:"zenpho_context",site_host:window.location.hostname,site_section:window.location.hostname==="app.zenpho.com"?"app":"marketing"});`}
        </Script>
      </body>
    </html>
  );
}
