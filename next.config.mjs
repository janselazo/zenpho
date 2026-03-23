import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {
    root: __dirname,
  },
  async redirects() {
    return [
      { source: "/portfolio", destination: "/case-studies", permanent: true },
      { source: "/agency", destination: "/services", permanent: true },
      { source: "/methodology", destination: "/about", permanent: true },
    ];
  },
};

export default nextConfig;
