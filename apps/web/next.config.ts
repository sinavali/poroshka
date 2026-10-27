import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  distDir: 'dist-next',
  transpilePackages: [
    '@promptjoo/contracts',
    '@promptjoo/persian-normalizer',
    '@promptjoo/prompt-compiler'
  ],
  async rewrites() {
    const internalApi = process.env.INTERNAL_API_URL || 'http://127.0.0.1:4000';
    return [
      {
        source: '/api/v1/:path*',
        destination: `${internalApi}/api/v1/:path*`,
      },
      {
        source: '/healthz',
        destination: `${internalApi}/healthz`,
      },
      {
        source: '/livez',
        destination: `${internalApi}/livez`,
      },
      {
        source: '/readyz',
        destination: `${internalApi}/readyz`,
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'poroshka.ir',
      },
      {
        protocol: 'https',
        hostname: 'poroshka.localme.ir',
      },
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
