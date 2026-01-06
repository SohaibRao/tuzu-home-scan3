import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Server components can use sharp
  serverExternalPackages: ['sharp'],

  // Increase body parser limit for image uploads
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },

  // Configure image optimization
  images: {
    // Allow images from our API routes
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
      },
    ],
    // Disable image optimization for API-served images (they're already optimized)
    unoptimized: false,
  },
};

export default nextConfig;
