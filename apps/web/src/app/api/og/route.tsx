import { type NextRequest } from 'next/server';

function escapeXml(unsafe: string): string {
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
      default: return c;
    }
  });
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const title = searchParams.get('title') || 'پوروشکا | مرجع تخصصی پرامپت‌های هوش مصنوعی';
    const desc = searchParams.get('desc') || 'کامل‌ترین آرشیو پرامپت‌های مهندسی‌شده ChatGPT، میدجورنی و کلود برای بازار ایران';
    const category = searchParams.get('category') || 'پرامپت فارسی';
    const badge = searchParams.get('badge') || 'رایگان و تست‌شده';

    const cleanTitle = escapeXml(title.slice(0, 75));
    const cleanDesc = escapeXml(desc.slice(0, 140));
    const cleanCategory = escapeXml(category.slice(0, 30));
    const cleanBadge = escapeXml(badge.slice(0, 30));

    const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="1200" height="630" viewBox="0 0 1200 630" fill="none" xmlns="http://www.w3.org/2000/svg" direction="rtl">
  <defs>
    <linearGradient id="bgGrad" x1="0" y1="0" x2="1200" y2="630" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#10265D" />
      <stop offset="60%" stop-color="#0E1E45" />
      <stop offset="100%" stop-color="#09142E" />
    </linearGradient>
    <linearGradient id="ribbonGrad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#2864F0" />
      <stop offset="50%" stop-color="#4B55F2" />
      <stop offset="100%" stop-color="#7548F5" />
    </linearGradient>
    <linearGradient id="foldGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#7FB0FF" />
      <stop offset="100%" stop-color="#2864F0" />
    </linearGradient>
    <radialGradient id="glow" cx="0.8" cy="0.2" r="0.6">
      <stop offset="0%" stop-color="#2864F0" stop-opacity="0.35" />
      <stop offset="100%" stop-color="#10265D" stop-opacity="0" />
    </radialGradient>
  </defs>

  <!-- Background -->
  <rect width="1200" height="630" fill="url(#bgGrad)" />
  <rect width="1200" height="630" fill="url(#glow)" />

  <!-- Outer Framing Line -->
  <rect x="24" y="24" width="1152" height="582" rx="28" stroke="rgba(255, 255, 255, 0.12)" stroke-width="2" fill="none" />

  <!-- Top Header Bar -->
  <g transform="translate(80, 70)">
    <!-- Brand Logo Mark -->
    <g transform="translate(970, 0) scale(0.65)">
      <path fill="url(#ribbonGrad)" fill-rule="evenodd" d="M44 12C24 12 12 26 12 44L12 74C12 92 26 104 44 104L52 104C88 104 118 88 118 56L118 44C118 26 104 12 86 12ZM50 42L84 36C92 34.5 98 40 98 48L98 54C98 66 86 74 70 76L56 78C50 79 46 75 46 69L46 50C46 46 47 43 50 42Z" />
      <path fill="url(#foldGrad)" d="M12 74C12 92 26 104 44 104L46 104L46 78C32 78 20 70 12 56Z" />
      <rect x="40" y="112" width="22" height="22" rx="4" transform="rotate(45 51 123)" fill="#FFFFFF" />
      <path fill="#FFB51B" d="M120 2C122.2 12.4 126.6 16.8 137 19C126.6 21.2 122.2 25.6 120 36C117.8 25.6 113.4 21.2 103 19C113.4 16.8 117.8 12.4 120 2Z" />
    </g>

    <!-- Brand Typography -->
    <text x="945" y="44" text-anchor="end" fill="#FFFFFF" font-family="Vazirmatn, system-ui, -apple-system, sans-serif" font-size="36" font-weight="900">پوروشکا</text>
    <text x="945" y="74" text-anchor="end" fill="#9BB1D8" font-family="system-ui, -apple-system, sans-serif" font-size="16" font-weight="700">Poroshka.ir</text>

    <!-- Badges (Left Side) -->
    <g transform="translate(0, 20)">
      <!-- Badge 1: Category -->
      <rect x="0" y="0" width="160" height="42" rx="21" fill="#2864F0" />
      <text x="80" y="27" text-anchor="middle" fill="#FFFFFF" font-family="Vazirmatn, system-ui, -apple-system, sans-serif" font-size="16" font-weight="700">${cleanCategory}</text>

      <!-- Badge 2: Status / Copies -->
      <rect x="175" y="0" width="180" height="42" rx="21" fill="rgba(255, 255, 255, 0.1)" stroke="rgba(255, 181, 27, 0.5)" stroke-width="1.5" />
      <text x="265" y="27" text-anchor="middle" fill="#FFB51B" font-family="Vazirmatn, system-ui, -apple-system, sans-serif" font-size="16" font-weight="700">${cleanBadge}</text>
    </g>
  </g>

  <!-- Divider Line -->
  <line x1="80" y1="180" x2="1120" y2="180" stroke="rgba(255, 255, 255, 0.12)" stroke-width="1" />

  <!-- Center Content Area -->
  <g transform="translate(80, 250)">
    <!-- Primary Title -->
    <text x="1040" y="60" text-anchor="end" fill="#FFFFFF" font-family="Vazirmatn, system-ui, -apple-system, sans-serif" font-size="44" font-weight="900" letter-spacing="-0.5">${cleanTitle}</text>

    <!-- Short Description -->
    <text x="1040" y="130" text-anchor="end" fill="#D1DBEE" font-family="Vazirmatn, system-ui, -apple-system, sans-serif" font-size="22" font-weight="400" opacity="0.9">${cleanDesc}</text>
  </g>

  <!-- Footer Bar -->
  <g transform="translate(80, 520)">
    <line x1="0" y1="0" x2="1040" y2="0" stroke="rgba(255, 255, 255, 0.12)" stroke-width="1" />

    <!-- Feature Tags (Right) -->
    <text x="1040" y="44" text-anchor="end" fill="#8EA8D8" font-family="Vazirmatn, system-ui, -apple-system, sans-serif" font-size="16" font-weight="600">
      دسته‌بندی موضوعی   •   کپی فوری با یک کلیک   •   هزینه صفر توکن هوش مصنوعی
    </text>

    <!-- Domain (Left) -->
    <text x="0" y="44" text-anchor="start" fill="#FFB51B" font-family="system-ui, -apple-system, sans-serif" font-size="20" font-weight="800">
      POROSHKA.IR
    </text>
  </g>
</svg>`;

    return new Response(svg, {
      status: 200,
      headers: {
        'Content-Type': 'image/svg+xml; charset=utf-8',
        'Cache-Control': 'public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400'
      }
    });
  } catch (_err: unknown) {
    return new Response(`Failed to generate social card`, { status: 500 });
  }
}
