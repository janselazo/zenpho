import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {
    root: __dirname,
  },
  serverExternalPackages: ["pdf-lib", "@pdf-lib/fontkit"],
  experimental: {
    optimizePackageImports: [
      "lucide-react",
      "recharts",
      "framer-motion",
      "@fullcalendar/react",
      "@fullcalendar/core",
    ],
    // Default Server Action body limit is 1mb; see nextjs.org/docs/app/api-reference/config/next-config-js/serverActions
    serverActions: {
      bodySizeLimit: "25mb",
    },
  },
  async redirects() {
    return [
      { source: "/studio", destination: "/", permanent: true },
      { source: "/portfolio", destination: "/case-studies", permanent: true },
      { source: "/agency", destination: "/services", permanent: true },
      { source: "/methodology", destination: "/about", permanent: true },
      {
        source: "/services/websites-development",
        destination: "/services/mvp-development",
        permanent: true,
      },
      {
        source: "/services/websites-ecommerce",
        destination: "/services/mvp-development",
        permanent: true,
      },
      {
        source: "/services/websites",
        destination: "/services/mvp-development",
        permanent: true,
      },
      {
        source: "/services/web-applications",
        destination: "/services/mvp-development",
        permanent: true,
      },
      {
        source: "/services/mobile-apps",
        destination: "/services/mvp-development",
        permanent: true,
      },
      {
        source: "/services/ai-automations",
        destination: "/services/mvp-growth",
        permanent: true,
      },
      {
        source: "/services/ai-in-your-product",
        destination: "/services/mvp-development",
        permanent: true,
      },
      {
        source: "/services/automation-integrations",
        destination: "/services/mvp-growth",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
