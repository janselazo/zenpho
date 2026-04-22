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
    serverActions: {
      // Brand guidelines PDF embeds 7 PNGs; response (base64) can reach ~15 MB.
      bodySizeLimit: "25mb",
    },
  },
  async redirects() {
    return [
      { source: "/portfolio", destination: "/case-studies", permanent: true },
      { source: "/agency", destination: "/services", permanent: true },
      { source: "/methodology", destination: "/about", permanent: true },
      {
        source: "/services/mvp-development",
        destination: "/services/websites-development",
        permanent: true,
      },
      {
        source: "/services/websites-ecommerce",
        destination: "/services/websites-development",
        permanent: true,
      },
      {
        source: "/services/websites",
        destination: "/services/websites-development",
        permanent: true,
      },
      {
        source: "/services/ai-in-your-product",
        destination: "/services/ai-automations",
        permanent: true,
      },
      {
        source: "/services/automation-integrations",
        destination: "/services/ai-automations",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
