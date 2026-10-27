export const dynamic = 'force-dynamic';
export const revalidate = 1800;

interface PromptSummary {
  slug: string;
  updated_at?: string;
  created_at?: string;
}

export async function GET() {
  const baseUrl = 'https://poroshka.ir';
  const now = new Date().toISOString();

  let prompts: PromptSummary[] = [];

  try {
    const apiUrl = process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:4000';
    const res = await fetch(`${apiUrl}/api/v1/catalog/prompts?limit=500`, {
      next: { revalidate: 1800 }
    });
    if (res.ok) {
      const data = await res.json();
      prompts = Array.isArray(data.items) ? data.items : (Array.isArray(data.prompts) ? data.prompts : []);
    }
  } catch {
    // API not reachable during static build, return empty or fallback
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${prompts.map(p => {
  const lastmod = p.updated_at ? new Date(p.updated_at).toISOString() : (p.created_at ? new Date(p.created_at).toISOString() : now);
  return `  <url>
    <loc>${baseUrl}/p/${p.slug}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>`;
}).join('\n')}
</urlset>`.trim();

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=1800, s-maxage=1800',
    },
  });
}
