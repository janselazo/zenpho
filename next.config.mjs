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
        source: "/services/websites-ecommerce",
        destination: "/services/mvp-development",
        permanent: true,
      },
      {
        source: "/services/websites",
        destination: "/services/mvp-development",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
