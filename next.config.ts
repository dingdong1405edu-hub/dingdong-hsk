import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  basePath: "/zh",
  assetPrefix: "/zh",
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      { protocol: "https", hostname: "pub-*.r2.dev" },
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
      // Allow Server Actions when this zone is reached through dingdongspeak.com
      allowedOrigins: ["dingdongspeak.com", "zestful-victory-production-6f4f.up.railway.app"],
    },
  },
};

export default nextConfig;
