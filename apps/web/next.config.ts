import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@greline/types", "@greline/validation", "@greline/services", "@greline/hooks", "@greline/gtfs", "@greline/theme", "@greline/i18n"],
  /* config options here */
  cacheComponents: true,
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
