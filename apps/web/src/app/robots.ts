import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin', '/api/v1/admin'],
      },
      {
        userAgent: ['GPTBot', 'ChatGPT-User', 'ClaudeBot', 'PerplexityBot', 'Applebot'],
        allow: '/',
        disallow: ['/admin'],
      }
    ],
    sitemap: 'https://promptjoo.ir/sitemap.xml',
  };
}
