import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://poroshka.ir';

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin', '/api/'],
      },
      {
        userAgent: [
          'GPTBot',
          'ChatGPT-User',
          'ClaudeBot',
          'anthropic-ai',
          'PerplexityBot',
          'Google-Extended',
          'Applebot',
          'Applebot-Extended',
          'CCBot',
          'cohere-ai',
          'Diffbot',
          'FacebookBot',
          'Bytespider'
        ],
        allow: '/',
        disallow: ['/admin', '/api/'],
      }
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
