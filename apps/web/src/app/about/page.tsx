import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Sparkles, Heart, ArrowRight, Zap, Target, Shield, Users } from 'lucide-react';
import { AdPlacement } from '../../components/AdPlacement';

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://poroshka.ir';

export const metadata: Metadata = {
  title: 'درباره ما | پوروشکا',
  description: 'داستان شکل‌گیری پوروشکا؛ مرجع پرامپت‌های مهندسی‌شده هوش مصنوعی در ایران جهت ارتقای بهره‌وری متخصصان و کپی رایگان قالب‌های کاربردی.',
  alternates: {
    canonical: `${baseUrl}/about`
  },
  openGraph: {
    title: 'درباره پوروشکا — پیشگام مهندسی پرامپت در ایران',
    description: 'چگونه پوروشکا کار با مدل‌های هوش مصنوعی را برای کاربران فارسی‌زبان ساده، حرفه‌ای و بدون هزینه توکن می‌کند.',
    url: `${baseUrl}/about`,
    siteName: 'پوروشکا',
    locale: 'fa_IR',
    type: 'website'
  }
};

export default function AboutPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'AboutPage',
    name: 'درباره پوروشکا',
    description: 'معرفی پلتفرم پوروشکا، رسالت و تیم توسعه‌دهنده.',
    inLanguage: 'fa-IR',
    mainEntity: {
      '@type': 'Organization',
      name: 'پوروشکا',
      url: 'https://poroshka.ir',
      slogan: 'مهندسی پرامپت برای خروجی‌های شگفت‌انگیز هوش مصنوعی'
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 space-y-10 animate-fade-in">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Header */}
      <div className="space-y-3 border-b border-slate-200/80 pb-6 text-center sm:text-right">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-600 border border-blue-200/60">
          <Sparkles className="w-3.5 h-3.5" />
          <span>داستان و مأموریت ما</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
          درباره پوروشکا
        </h1>
        <p className="text-sm text-slate-500 leading-relaxed max-w-2xl">
          ما پوروشکا را ساختیم تا فاصله میان یک ایده معمولی و یک نتیجه بی‌نظیر از هوش مصنوعی را برای هر کاربر فارسی‌زبان به صفر برسانیم.
        </p>
      </div>

      {/* Ad Placement 1 */}
      <AdPlacement slot="about_1" />

      {/* Main Narrative */}
      <div className="space-y-6 text-sm text-slate-700 leading-relaxed">
        <section className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-200/80 space-y-4">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Target className="w-5 h-5 text-blue-600" />
            <span>چرا پوروشکا شکل گرفت؟</span>
          </h2>
          <p>
            با پیدایش مدل‌های پیشرفته هوش مصنوعی مانند ChatGPT و Midjourney، بزرگ‌ترین چالش کاربران ایرانی دیگر «دسترسی» به این ابزارها نبود؛ بلکه «چگونگی دستور دادن» یا همان مهندسی پرامپت بود. بسیاری از کاربران به دلیل عدم تسلط به اصول پرامپت‌نویسی حرفه‌ای یا ضعف مدل‌ها در پردازش دستورات خام فارسی، به خروجی‌های سطحی و کلیشه‌ای بسنده می‌کردند.
          </p>
          <p>
            پوروشکا با هدف گردآوری، مهندسی و استانداردسازی بهترین الگوهای دستوردهی متولد شد. تمام پرامپت‌های موجود در این پلتفرم با تکیه بر چارچوب‌های شناختی علمی، الگوهای چندمرحله‌ای (Few-Shot & Chain-of-Thought) و ساختارهای صنعتی طراحی شده‌اند.
          </p>
        </section>

        {/* Ad Placement 2 */}
        <AdPlacement slot="about_2" />

        {/* Pillars Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
          <div className="glass-panel p-5 rounded-2xl border border-slate-200/80 space-y-2">
            <Zap className="w-5 h-5 text-amber-500" />
            <h3 className="font-bold text-slate-900 text-xs">سریع و بدون معطلی</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              با یک کلیک متغیرها را پر کنید، پرامپت شخصی‌سازی شده را کپی کنید و در چت‌بات اجرا کنید.
            </p>
          </div>

          <div className="glass-panel p-5 rounded-2xl border border-slate-200/80 space-y-2">
            <Shield className="w-5 h-5 text-emerald-500" />
            <h3 className="font-bold text-slate-900 text-xs">زبان فارسی طبیعی</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              دستورات به گونه‌ای مهندسی شده‌اند که مدل‌ها پاسخی روان، شیوا و استاندارد به زبان فارسی بازگردانند.
            </p>
          </div>

          <div className="glass-panel p-5 rounded-2xl border border-slate-200/80 space-y-2">
            <Users className="w-5 h-5 text-purple-500" />
            <h3 className="font-bold text-slate-900 text-xs">رایگان برای جامعه</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              دسترسی همگانی و رایگان برای همه دانشجویان، طراحان و کارآفرینان ایرانی در سراسر کشور.
            </p>
          </div>
        </div>
      </div>

      {/* Ad Placement 3 */}
      <AdPlacement slot="about_3" />

      {/* Footer Navigation */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-slate-200">
        <Link
          href="/"
          className="text-xs font-bold text-blue-600 hover:text-blue-500 flex items-center gap-1.5"
        >
          <ArrowRight className="w-4 h-4" />
          <span>کاوش در پرامپت‌ها</span>
        </Link>
        <Link
          href="/contact"
          className="text-xs text-slate-500 hover:text-slate-800"
        >
          ارتباط با تیم و پشتیبانی ←
        </Link>
      </div>
    </div>
  );
}
