import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: [
    '@promptjoo/contracts',
    '@promptjoo/persian-normalizer',
    '@promptjoo/prompt-compiler'
  ],
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${process.env.INTERNAL_API_URL || 'http://localhost:3000'}/api/:path*`,
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
