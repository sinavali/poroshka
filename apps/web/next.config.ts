import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: [
    '@promptjoo/contracts',
    '@promptjoo/persian-normalizer',
    '@promptjoo/prompt-compiler'
  ],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'promptjoo.ir',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      }
    ]
  }
};

export default nextConfig;
