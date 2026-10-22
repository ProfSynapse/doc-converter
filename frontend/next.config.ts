import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  experimental: { cpus: 2 },
};

export default nextConfig;
