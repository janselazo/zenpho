import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
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
  title: {
    default: "Janse Lazo — AI Software Development Agency & Studio",
    template: "%s | Janse Lazo",
  },
  description:
    "AI software development agency: AI apps, web, mobile, automation, and integrations — MVP from $1,999 or Scale from $3,999/mo. Studio for in-house products.",
  openGraph: {
    title: "Janse Lazo — AI Software Development Agency & Studio",
    description:
      "Design, build, and launch products that scale. Transparent pricing, weekly output, Studio for in-house builds.",
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
        className={`${inter.variable} ${jetbrainsMono.variable} min-h-screen bg-background font-sans text-foreground antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
