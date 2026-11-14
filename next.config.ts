import type { NextConfig } from "next";

// Static export → the whole site is plain files in /out, deployable to
// Cloudflare Pages / Netlify / Vercel / any CDN with zero server.
const nextConfig: NextConfig = {
  output: "export",
  reactStrictMode: true,
  images: { unoptimized: true },
  transpilePackages: ["three"],
};

export default nextConfig;
