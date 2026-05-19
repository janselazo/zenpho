import type { Metadata } from "next";
import {
  Inter,
  Instrument_Serif,
  JetBrains_Mono,
  Plus_Jakarta_Sans,
} from "next/font/google";
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

export const metadata: Metadata = {
  title: "Zenpho • AI Product Studio",
  description:
    "Website and mobile MVP development—marketing sites, ecommerce, and apps—from discovery through deployment for founders shipping credible launches fast.",
  openGraph: {
    title: "Zenpho • AI Product Studio",
    description:
      "Websites, ecommerce, mobile, and launch support—strategy, UX, engineering, and handoff from Zenpho.",
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
        className={`${inter.variable} ${jetbrainsMono.variable} ${instrumentSerif.variable} ${plusJakartaSans.variable} ${marketingMono.variable} min-h-screen bg-background font-sans text-foreground antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
