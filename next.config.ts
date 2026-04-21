import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/favicon.ico",
        destination: "/favicon-48x48.png",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
