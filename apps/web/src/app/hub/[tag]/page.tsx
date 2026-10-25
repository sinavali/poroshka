import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { 
  Sparkles, MessageSquare, Brain, Cpu, ArrowRight, 
  Layers, CheckCircle, Shield, Search 
} from 'lucide-react';
import { PromptCard, PromptCardData } from '../../../components/PromptCard';
import { AdPlacement } from '../../../components/AdPlacement';

interface HubTagConfig {
  slug: string;
  name_en: string;
  name_fa: string;
  badge_label: string;
  h1_title: string;
  meta_title: string;
  meta_description: string;
  description_fa: string;
  highlights: string[];
}

export const HUB_TAGS: Record<string, HubTagConfig> = {
  chatgpt: {
    slug: 'chatgpt',
    name_en: 'ChatGPT',
    name_fa: 'چت جی‌پی‌تی',
    badge_label: 'مدل‌های زبانی OpenAI',
    h1_title: 'مجموعه پرامپت‌های آماده هوش مصنوعی ChatGPT',
    meta_title: 'پرامپت‌های ChatGPT | پوروشکا',
    meta_description: 'کامل‌ترین آرشیو پرامپت‌های مهندسی‌شده ChatGPT (چت جی‌پی‌تی) به زبان فارسی، آماده کپی رایگان و شخصی‌سازی متغیرها در مرجع پوروشکا.',
    description_fa: 'آرشیو تخصصی و کاربردی پرامپت‌های تست‌شده برای چت جی‌پی‌تی (ChatGPT 4o و مدل‌های استدلال OpenAI). همراه با تنظیم متغیرهای اختصاصی برند و کپی مستقیم بدون نیاز به فرمول‌های پیچیده.',
    highlights: ['پشتیبانی از GPT-4o و GPT-4o mini', 'ساختار گام‌به‌گام (Chain-of-Thought)', 'خروجی فارسی روان و بدون لحن ترجمه']
  },
  midjourney: {
    slug: 'midjourney',
    name_en: 'Midjourney',
    name_fa: 'میدجورنی',
    badge_label: 'تصویرسازی و فتورئالیسم',
    h1_title: 'پرامپت‌های تولید تصویر و عکاسی میدجورنی (Midjourney)',
    meta_title: 'پرامپت‌های میدجورنی | پوروشکا',
    meta_description: 'مجموعه پرامپت‌های حرفه‌ای و تست‌شده Midjourney v6 برای خلق تصاویر خارق‌العاده و فتورئالیستیک با پارامترهای دقیق و کپی رایگان.',
    description_fa: 'کالکشن کامل الگوهای تولید عکس تبلیغاتی، طراحی کاراکتر، معماری مدرن و رندرهای واقع‌گرایانه با میدجورنی (Midjourney) همراه با پارامترهای دقیق نورپردازی، لنز دوربین و نسبت تصویر.',
    highlights: ['فرمول‌های بهینه‌سازی‌شده نسخه v6 و v6.1', 'پارامترهای نسبت تصویر (--ar) و کیفیت', 'سبک‌های عکاسی مد، صنعتی و سینمایی']
  },
  claude: {
    slug: 'claude',
    name_en: 'Claude',
    name_fa: 'کلود آنتروپیک',
    badge_label: 'استدلال عمیق و نگارش ادبی',
    h1_title: 'پرامپت‌های نگارش تحلیلی و استدلال عمیق کلود (Claude)',
    meta_title: 'پرامپت‌های کلود | پوروشکا',
    meta_description: 'پرامپت‌های تحلیلی و مهندسی‌شده Claude 3.5 Sonnet برای تولید محتوای ادبی، تحلیل اسناد و کدنویسی دقیق با کپی رایگان در پوروشکا.',
    description_fa: 'پرامپت‌های بهینه‌سازی‌شده برای مدل‌های Claude (سونت و اوپوس) آنتروپیک. طراحی‌شده برای نگارش مقالات عمیق بدون لحن کلیشه‌ای ماشینی، بازنویسی حرفه‌ای و پردازش منطقی سناریوها.',
    highlights: ['سازگاری کامل با Claude 3.5 Sonnet', 'لحن طبیعی، انسانی و پرحرارت در زبان فارسی', 'تحلیل متن‌های طولانی و خلاصه مقالات']
  },
  gemini: {
    slug: 'gemini',
    name_en: 'Gemini',
    name_fa: 'گوگل جمینای',
    badge_label: 'هوش مصنوعی چندحالته گوگل',
    h1_title: 'پرامپت‌های چندحالته و جستجوی هوشمند گوگل جمینای (Gemini)',
    meta_title: 'پرامپت‌های جمینای | پوروشکا',
    meta_description: 'پرامپت‌های چندحالته و پیشرفته Google Gemini برای تحلیل همزمان متن و تصویر و سناریونویسی محتوا با کپی رایگان در پوروشکا.',
    description_fa: 'مجموعه پرامپت‌های تخصصی برای گوگل جمینای (Gemini 1.5 Pro و Flash). بهره‌گیری از پنجره کانتکست فوق‌طولانی جهت درک سناریوهای پیچیده تجاری، بازاریابی اینستاگرام و استخراج داده.',
    highlights: ['پشتیبانی از کانتکست طولانی تا ۱ میلیون توکن', 'درک چندحالته تصویر، ویدیو و فایل‌های متنی', 'تحلیل سناریوهای بومی بازار ایران']
  },
  deepseek: {
    slug: 'deepseek',
    name_en: 'DeepSeek',
    name_fa: 'دیپ‌سیک',
    badge_label: 'استدلال پیشرفته و کدنویسی',
    h1_title: 'پرامپت‌های استدلال عمیق و برنامه‌نویسی دیپ‌سیک (DeepSeek)',
    meta_title: 'پرامپت‌های دیپ‌سیک | پوروشکا',
    meta_description: 'پرامپت‌های قدرتمند DeepSeek R1 برای حل مسائل پیچیده ریاضی، برنامه‌نویسی تخصصی و منطق تجاری با کپی سریع و رایگان در پوروشکا.',
    description_fa: 'پرامپت‌های طراحی‌شده برای مدل‌های پیشرفته استدلالی DeepSeek R1 و DeepSeek V3. حل الگوریتم‌های پیچیده نرم‌افزاری، اشکال‌زدایی کد، پرس‌وجوهای پایگاه داده و استنتاج گام‌به‌گام تجاری.',
    highlights: ['بهینه‌سازی‌شده برای الگوریتم‌های DeepSeek R1', 'دیباگینگ، ریفکتورینگ و بهینه‌سازی کد', 'استدلال گام‌به‌گام در مسائل ریاضی و تحلیلی']
  }
};

export const dynamic = 'force-dynamic';
export const revalidate = 300;

interface PageProps {
  params: Promise<{ tag: string }>;
}

async function getHubPrompts(tag: string): Promise<PromptCardData[]> {
  const apiUrl = process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:4000';
  try {
    const res = await fetch(`${apiUrl}/api/v1/catalog/prompts?tag=${encodeURIComponent(tag)}&limit=48`, {
      next: { revalidate: 1800 }
    });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data.items) ? data.items : [];
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { tag } = await params;
  const config = HUB_TAGS[tag.toLowerCase()];
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://poroshka.ir';

  if (!config) {
    return {
      title: 'هاب مدل یافت نشد | پوروشکا',
      description: 'هاب مورد نظر در پرتال هوش مصنوعی پوروشکا یافت نشد.',
    };
  }

  const pageUrl = `${baseUrl}/hub/${config.slug}`;

  return {
    title: config.meta_title,
    description: config.meta_description,
    alternates: {
      canonical: pageUrl,
    },
    openGraph: {
      title: config.meta_title,
      description: config.meta_description,
      url: pageUrl,
      siteName: 'پوروشکا',
      locale: 'fa_IR',
      type: 'website',
      images: [
        {
          url: `${baseUrl}/api/og?title=${encodeURIComponent(config.h1_title)}&badge=${encodeURIComponent(config.name_fa)}`,
          width: 1200,
          height: 630,
          type: 'image/svg+xml',
          alt: config.h1_title,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: config.meta_title,
      description: config.meta_description,
      images: [`${baseUrl}/api/og?title=${encodeURIComponent(config.h1_title)}`],
    },
  };
}

export default async function HubTagPage({ params }: PageProps) {
  const { tag } = await params;
  const tagKey = tag.toLowerCase();
  const config = HUB_TAGS[tagKey];

  if (!config) {
    notFound();
  }

  const prompts = await getHubPrompts(tagKey);

  // Structured Data (JSON-LD) Breadcrumb & CollectionPage
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
        name: 'هاب‌های هوش مصنوعی',
        item: 'https://poroshka.ir/#models',
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: config.name_fa,
        item: `https://poroshka.ir/hub/${config.slug}`,
      },
    ],
  };

  const collectionLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: config.h1_title,
    description: config.meta_description,
    url: `https://poroshka.ir/hub/${config.slug}`,
    inLanguage: 'fa-IR',
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: prompts.length,
      itemListElement: prompts.slice(0, 30).map((p, idx) => ({
        '@type': 'ListItem',
        position: idx + 1,
        url: `https://poroshka.ir/p/${p.slug}`,
        name: p.title_fa,
      })),
    },
  };

  return (
    <div className="space-y-10 animate-fade-in py-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8" dir="rtl">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionLd) }}
      />

      {/* Breadcrumb Navigation */}
      <nav className="flex items-center gap-2 text-xs text-slate-500">
        <Link href="/" className="hover:text-blue-600">صفحه اصلی</Link>
        <span>/</span>
        <span className="text-slate-400">هاب‌های هوش مصنوعی</span>
        <span>/</span>
        <span className="font-bold text-slate-800">{config.name_fa}</span>
      </nav>

      {/* Hub Hero Header */}
      <div className="glass-panel p-6 sm:p-10 rounded-3xl border border-slate-200/80 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200/60">
              <Sparkles className="w-3.5 h-3.5 text-blue-600" />
              <span>{config.badge_label}</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-black text-slate-900 tracking-tight leading-tight">
              {config.h1_title}
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 max-w-3xl leading-relaxed">
              {config.description_fa}
            </p>
          </div>

          <Link
            href="/"
            className="pressable inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-2xs self-start sm:self-auto"
          >
            <span>کاتالوگ کل پرامپت‌ها</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Feature Highlights */}
        <div className="pt-4 border-t border-slate-100 flex flex-wrap gap-4 text-xs font-bold text-slate-600">
          {config.highlights.map((h, i) => (
            <div key={i} className="flex items-center gap-1.5">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
              <span>{h}</span>
            </div>
          ))}
        </div>

        {/* Other Hub Quick Switcher */}
        <div className="pt-4 border-t border-slate-100 flex items-center gap-2 overflow-x-auto pb-1 text-xs">
          <span className="text-slate-400 flex-shrink-0">سایر مدل‌های هوش مصنوعی:</span>
          {Object.entries(HUB_TAGS).map(([k, hub]) => (
            <Link
              key={k}
              href={`/hub/${k}`}
              className={`px-3 py-1 rounded-full text-xs font-bold transition-all flex-shrink-0 ${
                k === tagKey
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              {hub.name_fa}
            </Link>
          ))}
        </div>
      </div>

      {/* Prompts Grid */}
      <section className="space-y-6">
        <div className="flex items-center justify-between border-b border-slate-200 pb-4">
          <h2 className="text-lg sm:text-xl font-black text-slate-900 flex items-center gap-2">
            <span>پرامپت‌های سازگار با {config.name_fa}</span>
            <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700">
              {prompts.length.toLocaleString('fa-IR')} پرامپت
            </span>
          </h2>
        </div>

        {prompts.length === 0 ? (
          <div className="py-16 text-center text-slate-400 glass-panel rounded-3xl border border-slate-200">
            <p className="text-sm">در حال حاضر پرامپتی در این هاب یافت نشد.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {prompts.map((prompt, index) => {
              // Inject ad slots at cards 2 and 5
              if (index === 2) {
                return (
                  <React.Fragment key="ad-slot-1">
                    <div className="glass-panel rounded-3xl p-4 border border-slate-200 flex flex-col justify-center items-center overflow-hidden">
                      <AdPlacement slot="grid_card_1" />
                    </div>
                    <PromptCard prompt={prompt} />
                  </React.Fragment>
                );
              }

              if (index === 5) {
                return (
                  <React.Fragment key="ad-slot-2">
                    <div className="glass-panel rounded-3xl p-4 border border-slate-200 flex flex-col justify-center items-center overflow-hidden">
                      <AdPlacement slot="grid_card_2" />
                    </div>
                    <PromptCard prompt={prompt} />
                  </React.Fragment>
                );
              }

              return <PromptCard key={prompt.id} prompt={prompt} />;
            })}
          </div>
        )}
      </section>
    </div>
  );
}
