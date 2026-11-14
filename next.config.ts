import type { NextConfig } from "next";

// Static export: the whole site is plain files in /out, deployable to any CDN.
const nextConfig: NextConfig = {
  output: "export",
  reactStrictMode: true,
};

export default nextConfig;
