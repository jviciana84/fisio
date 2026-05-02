import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /**
   * Puppeteer + Chromium binario (brotli en node_modules). Sin esto, el trace de Vercel
   * puede no incluir `@sparticuz/chromium/bin` y `executablePath()` falla → 503 NO_CHROME.
   */
  serverExternalPackages: ["@sparticuz/chromium", "puppeteer-core"],
  outputFileTracingIncludes: {
    "/api/**/*": ["./node_modules/@sparticuz/chromium/**/*"],
  },

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
