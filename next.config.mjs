import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {
    root: __dirname,
  },
  // Tree-shake icon/chart/animation barrels so each route ships less JS (Vercel / Next guidance).
  experimental: {
    optimizePackageImports: [
      "lucide-react",
      "recharts",
      "framer-motion",
      "@fullcalendar/react",
      "@fullcalendar/core",
    ],
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
