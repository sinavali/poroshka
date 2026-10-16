import type { MetadataRoute } from 'next';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://promptjoo.ir';

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${baseUrl}/my-prompts`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/faq`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/about`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/terms`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${baseUrl}/privacy`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${baseUrl}/api-docs`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.7,
    },
  ];

  try {
    const apiUrl = process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:4000';
    const res = await fetch(`${apiUrl}/api/v1/catalog/prompts?limit=200`, {
      next: { revalidate: 3600 }
    });
    if (res.ok) {
      const data = await res.json();
      const prompts = Array.isArray(data.items) ? data.items : (Array.isArray(data.prompts) ? data.prompts : (Array.isArray(data) ? data : []));
      const promptRoutes: MetadataRoute.Sitemap = prompts.map((p: { slug: string; updated_at?: string }) => ({
        url: `${baseUrl}/p/${p.slug}`,
        lastModified: p.updated_at ? new Date(p.updated_at) : new Date(),
        changeFrequency: 'weekly',
        priority: 0.9,
      }));
      return [...staticRoutes, ...promptRoutes];
    }
  } catch {
    // Return static routes if API unavailable at build time
  }

  return staticRoutes;
}
