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
  async redirects() {
    return [
      // Legacy API portal route — renamed /developer → /console.
      // Provisioning emails already sent in the wild link to /developer.
      { source: "/developer", destination: "/console", permanent: true },
      { source: "/developer/keys", destination: "/console/keys", permanent: true },
      // Gated product app moved /app/dashboard -> /app. EXACT match only: the
      // unmoved prototype pages /app/dashboard/founder and /app/dashboard/developer
      // must keep resolving, so this must NOT be /app/dashboard/:path*.
      { source: "/app/dashboard", destination: "/app", permanent: true },
    ];
  },
  webpack: (config, { dev }) => {
    if (dev) {
      config.cache = false;
    }
    return config;
  },
};

export default nextConfig;
