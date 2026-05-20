import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import GoogleTagManager from "@/components/analytics/GoogleTagManager";
import JsonLd from "@/components/marketing/seo/JsonLd";
import {
  LOCAL_BUSINESS_ID,
  ORGANIZATION_ID,
  SITE_ORIGIN,
  WEBSITE_ID,
  siteUrl,
} from "@/lib/marketing/seo";
import {
  ZENPHO_CONTACT_EMAIL,
  ZENPHO_PHONE_DISPLAY,
} from "@/lib/zenpho-contact";
import "@/styles/marketing.css";
import "@/styles/marketing-art.css";

const sitewideSchema = [
  {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": ORGANIZATION_ID,
    name: "Zenpho",
    url: SITE_ORIGIN,
    logo: siteUrl("/marketing/logo-white.png"),
    email: ZENPHO_CONTACT_EMAIL,
    telephone: ZENPHO_PHONE_DISPLAY,
    sameAs: [
      "https://x.com/zenpho",
      "https://www.linkedin.com/company/zenpho",
      "https://www.instagram.com/zenpho",
      "https://github.com/janselazo",
    ],
  },
  {
    "@context": "https://schema.org",
    "@type": ["LocalBusiness", "ProfessionalService"],
    "@id": LOCAL_BUSINESS_ID,
    name: "Zenpho",
    url: SITE_ORIGIN,
    email: ZENPHO_CONTACT_EMAIL,
    telephone: ZENPHO_PHONE_DISPLAY,
    image: siteUrl("/opengraph-image"),
    address: {
      "@type": "PostalAddress",
      addressLocality: "Miami",
      addressRegion: "FL",
      addressCountry: "US",
    },
    areaServed: ["United States", { "@type": "Place", name: "Worldwide" }],
    parentOrganization: { "@id": ORGANIZATION_ID },
  },
  {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": WEBSITE_ID,
    name: "Zenpho",
    url: SITE_ORIGIN,
    publisher: { "@id": ORGANIZATION_ID },
    potentialAction: {
      "@type": "SearchAction",
      target: `${SITE_ORIGIN}/blog?search={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  },
];

export default function MarketingShell({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="marketing-page-bg relative min-h-screen">
      <GoogleTagManager />
      <JsonLd data={sitewideSchema} />
      <Navbar />
      <main className="relative z-10 isolate overflow-x-hidden">{children}</main>
      <Footer />
    </div>
  );
}
