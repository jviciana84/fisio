import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/favicon.ico",
        destination: "/favicon-32x32.png",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
