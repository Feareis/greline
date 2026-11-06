import type { NextConfig } from "next";
import packageJson from "./package.json";

const nextConfig: NextConfig = {
  transpilePackages: ["@greline/types", "@greline/validation", "@greline/services", "@greline/hooks", "@greline/gtfs", "@greline/theme", "@greline/i18n"],
  env: {
    NEXT_PUBLIC_APP_VERSION: packageJson.version,
    // Vercel sets VERCEL_ENV to "production" on the production deployment only.
    NEXT_PUBLIC_APP_ENV: process.env.VERCEL_ENV === "production" ? "prod" : "dev",
  },
  cacheComponents: true,
  // The floating dev badge would cover our own top bar controls.
  devIndicators: false,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
