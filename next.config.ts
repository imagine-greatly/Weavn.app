import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /**
   * CSS: no `optimizeCss` / `experimental` flags that defer global CSS. App Router injects
   * `app/globals.css` with the main chunk; FOUC is handled via inline html/body background in layout.
   */
  compiler: {
    removeConsole: process.env.NODE_ENV === "production",
  },
  /** Prevent bundling Puppeteer stack (avoids clone-deep / dynamic require analysis errors). */
  serverExternalPackages: [
    "puppeteer-core",
    "puppeteer-extra",
    "puppeteer-extra-plugin-stealth",
    "@sparticuz/chromium",
  ],
  generateBuildId: async () => {
    return Date.now().toString();
  },
  webpack: (config, { dev }) => {
    if (dev) {
      config.cache = false;
    }
    return config;
  },
};

export default nextConfig;
