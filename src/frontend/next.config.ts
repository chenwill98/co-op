import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  eslint: {
    // Disable ESLint during production builds
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Disable TypeScript errors during production builds
    ignoreBuildErrors: true,
  },
  // Optional: Uncomment if you're using images and need to customize domains
  // images: {
  //   domains: ['your-domain.com'],
  // },
};

export default nextConfig;
