/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      { source: "/portfolio", destination: "/case-studies", permanent: true },
      { source: "/agency", destination: "/services", permanent: true },
      { source: "/methodology", destination: "/about", permanent: true },
    ];
  },
};

export default nextConfig;
