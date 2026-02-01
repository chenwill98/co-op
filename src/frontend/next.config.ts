import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.zillowstatic.com',
      },
      {
        protocol: 'https',
        hostname: '*.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'api.mapbox.com',
      }
    ]
  },
};

export default nextConfig;
