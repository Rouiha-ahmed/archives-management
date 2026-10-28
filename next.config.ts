import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep the development-only Next.js status panel from covering application UI.
  // Compile and runtime errors are still surfaced by Next.js.
  devIndicators: false,
  experimental: {
    agentFeedback: true,
  },
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
