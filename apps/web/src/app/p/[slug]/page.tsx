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

  if (!prompt) {
    return {
      title: 'پرامپت یافت نشد | پرامپت‌جو',
      description: 'پرامپت مورد نظر در کاتالوگ پرامپت‌جو یافت نشد.',
    };
  }

  const title = `${prompt.title_fa} | پرامپت‌جو`;
  const description = prompt.short_desc_fa || `${prompt.title_fa} — کپی و شخصی‌سازی پرامپت مهندسی‌شده هوش مصنوعی در پرامپت‌جو.`;
  const pageUrl = `https://promptjoo.ir/p/${slug}`;
  const ogImageUrl = 'https://promptjoo.ir/og-image.png';

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
      siteName: 'پرامپت‌جو',
      locale: 'fa_IR',
      type: 'article',
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
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

  // Structured Data (JSON-LD) for Maximum SEO & AIO
  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'صفحه اصلی',
        item: 'https://promptjoo.ir',
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: prompt.category_title_fa || 'کاتالوگ پرامپت',
        item: `https://promptjoo.ir/?category=${prompt.category_slug || ''}`,
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: prompt.title_fa,
        item: `https://promptjoo.ir/p/${prompt.slug}`,
      },
    ],
  };

  const softwareLd = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: prompt.title_fa,
    description: prompt.short_desc_fa,
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'All',
    url: `https://promptjoo.ir/p/${prompt.slug}`,
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'IRR',
    },
  };

  const howToLd = {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: `نحوه استفاده از پرامپت ${prompt.title_fa}`,
    description: `راهنمای گام‌به‌گام کپی و اجرای پرامپت در مدل‌های هوش مصنوعی`,
    step: [
      {
        '@type': 'HowToStep',
        name: 'شخصی‌سازی متغیرها',
        text: 'مقادیر مورد نظر خود را در فیلدهای متغیر وارد کنید یا از حافظه شخصی خود استفاده نمایید.',
      },
      {
        '@type': 'HowToStep',
        name: 'کپی پرامپت نهایی',
        text: 'دکمه کپی پرامپت را بزنید تا متن بهینه‌شده به کلیپ‌بورد سیستم منتقل شود.',
      },
      {
        '@type': 'HowToStep',
        name: 'اجرا در هوش مصنوعی',
        text: 'متن را در ChatGPT، Midjourney، Claude یا Gemini الصاق کرده و ارسال کنید.',
      },
    ],
  };

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
        dangerouslySetInnerHTML={{ __html: JSON.stringify(howToLd) }}
      />
      {prompt.faq_schema_json && prompt.faq_schema_json.length > 0 && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'FAQPage',
              mainEntity: prompt.faq_schema_json.map((f) => ({
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
