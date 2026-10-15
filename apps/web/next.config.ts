import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: [
    '@promptjoo/contracts',
    '@promptjoo/persian-normalizer',
    '@promptjoo/prompt-compiler'
  ],
  async rewrites() {
    const internalApi = process.env.INTERNAL_API_URL || 'http://127.0.0.1:4000';
    return [
      {
        source: '/api/:path*',
        destination: `${internalApi}/api/:path*`,
      },
      {
        source: '/healthz',
        destination: `${internalApi}/healthz`,
      },
    ];
  },
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
