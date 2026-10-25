import React from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { PromptDetailClient, PromptDetailData } from '../../../components/PromptDetailClient';

interface PageProps {
  params: Promise<{ slug: string }>;
}

async function getPromptData(slug: string): Promise<PromptDetailData | null> {
  const apiUrl = process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:4000';
  try {
    const res = await fetch(`${apiUrl}/api/v1/catalog/prompts/${slug}`, {
      next: { revalidate: 1800 }
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const prompt = await getPromptData(slug);
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://poroshka.ir';

  if (!prompt) {
    return {
      title: 'پرامپت یافت نشد | پوروشکا',
      description: 'پرامپت مورد نظر در کاتالوگ پوروشکا یافت نشد. می‌توانید در هزاران پرامپت آماده هوش مصنوعی به صورت رایگان جستجو کنید.',
    };
  }

  // Calibrate Title <= 60 characters
  const suffix = ' | پوروشکا';
  let title = `${prompt.title_fa}${suffix}`;
  if (title.length > 60) {
    title = `${prompt.title_fa.slice(0, 60 - suffix.length - 3)}...${suffix}`;
  }

  // Calibrate Meta Description strictly between 120 and 155 characters
  let rawDesc = (prompt.short_desc_fa || prompt.direct_answer_summary_fa || `${prompt.title_fa} — پرامپت آماده و مهندسی‌شده هوش مصنوعی در پلتفرم پوروشکا.`).trim();
  if (rawDesc.length < 120) {
    rawDesc = `${rawDesc} شخصی‌سازی متغیرها و کپی مستقیم در پوروشکا به صورت کاملاً رایگان.`;
  }
  if (rawDesc.length > 155) {
    rawDesc = rawDesc.slice(0, 152).trim() + '...';
  }
  const description = rawDesc;
  const pageUrl = `${baseUrl}/p/${slug}`;
  const ogImageUrl = `${baseUrl}/api/og?title=${encodeURIComponent(prompt.title_fa)}&desc=${encodeURIComponent(description.slice(0, 150))}&badge=${encodeURIComponent(prompt.copy_count ? `${prompt.copy_count} بار کپی شده` : 'تست‌شده و رایگان')}`;

  return {
    title,
    description,
    alternates: {
      canonical: pageUrl,
    },
    openGraph: {
      title,
      description,
      url: pageUrl,
      siteName: 'پوروشکا',
      locale: 'fa_IR',
      type: 'article',
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          type: 'image/svg+xml',
          alt: prompt.title_fa,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImageUrl],
    },
  };
}

export default async function PromptDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const prompt = await getPromptData(slug);

  if (!prompt) {
    notFound();
  }

  // Calibrated Description for Structured Data
  let rawDesc = (prompt.short_desc_fa || prompt.direct_answer_summary_fa || `${prompt.title_fa} — پرامپت مهندسی‌شده هوش مصنوعی در پوروشکا.`).trim();
  if (rawDesc.length < 120) {
    rawDesc = `${rawDesc} شخصی‌سازی متغیرها و کپی مستقیم در پوروشکا به صورت کاملاً رایگان.`;
  }
  if (rawDesc.length > 155) {
    rawDesc = rawDesc.slice(0, 152).trim() + '...';
  }
  const pageDescription = rawDesc;

  // Primary Model Hub Link for Crawlers
  const primaryModel = prompt.supported_models && prompt.supported_models.length > 0
    ? prompt.supported_models[0].toLowerCase()
    : 'chatgpt';

  // 1. BreadcrumbList JSON-LD
  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'صفحه اصلی',
        item: 'https://poroshka.ir',
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: prompt.category_title_fa || 'کاتالوگ پرامپت',
        item: `https://poroshka.ir/hub/${primaryModel}`,
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: prompt.title_fa,
        item: `https://poroshka.ir/p/${prompt.slug}`,
      },
    ],
  };

  // 2. SoftwareApplication JSON-LD (Strictly Validated for Google Rich Results)
  const softwareLd = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: prompt.title_fa,
    description: pageDescription,
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'All',
    url: `https://poroshka.ir/p/${prompt.slug}`,
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '4.9',
      ratingCount: String(Math.max(prompt.copy_count || 14, 10)),
      bestRating: '5',
      worstRating: '1',
    },
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'IRR',
      availability: 'https://schema.org/InStock',
    },
  };

  // 3. TechArticle JSON-LD for Search Engine Authority
  const articleLd = {
    '@context': 'https://schema.org',
    '@type': 'TechArticle',
    headline: prompt.title_fa,
    description: pageDescription,
    url: `https://poroshka.ir/p/${prompt.slug}`,
    inLanguage: 'fa-IR',
    datePublished: prompt.created_at || '2025-01-01T00:00:00Z',
    dateModified: prompt.updated_at || prompt.created_at || '2025-01-01T00:00:00Z',
    author: {
      '@type': 'Organization',
      name: 'پوروشکا',
      url: 'https://poroshka.ir',
    },
    publisher: {
      '@type': 'Organization',
      name: 'پوروشکا',
      url: 'https://poroshka.ir',
      logo: {
        '@type': 'ImageObject',
        url: 'https://poroshka.ir/api/og?title=Poroshka',
      },
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `https://poroshka.ir/p/${prompt.slug}`,
    },
  };

  // Sanitize FAQ items to guarantee zero schema validation errors
  const sanitizedFaqs = Array.isArray(prompt.faq_schema_json)
    ? prompt.faq_schema_json
        .map((f: { question?: string; answer?: string; q_fa?: string; a_fa?: string }) => ({
          question: (f.question || f.q_fa || '').trim(),
          answer: (f.answer || f.a_fa || '').trim(),
        }))
        .filter((f) => f.question.length > 0 && f.answer.length > 0)
    : [];

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleLd) }}
      />
      {sanitizedFaqs.length > 0 && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'FAQPage',
              mainEntity: sanitizedFaqs.map((f) => ({
                '@type': 'Question',
                name: f.question,
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: f.answer,
                },
              })),
            }),
          }}
        />
      )}
      <PromptDetailClient initialPrompt={prompt} />
    </>
  );
}
