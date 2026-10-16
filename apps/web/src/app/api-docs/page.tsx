import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Terminal, Code, ArrowRight, Copy, Check, ExternalLink, Cpu, Layers } from 'lucide-react';

export const metadata: Metadata = {
  title: 'مستندات فنی و API | پرامپت‌جو',
  description: 'مستندات وب‌سرویس RESTful و OpenAPI کاتالوگ پرامپت‌ها و موتور ترکیب بلوک پرامپت‌جو برای توسعه‌دهندگان.',
  alternates: {
    canonical: 'https://promptjoo.ir/api-docs'
  },
  openGraph: {
    title: 'مستندات API پرامپت‌جو برای توسعه‌دهندگان',
    description: 'دسترسی برنامه‌نویسی به هزاران پرامپت مهندسی‌شده و کامپایل هوشمند الگوها.',
    url: 'https://promptjoo.ir/api-docs',
    siteName: 'پرامپت‌جو',
    locale: 'fa_IR',
    type: 'website'
  }
};

export default function ApiDocsPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'TechArticle',
    headline: 'مستندات وب‌سرویس REST و OpenAPI پرامپت‌جو',
    description: 'راهنمای ادغام کاتالوگ پرامپت‌ها و موتور کامپایل با نرم‌افزارهای پایتون، جاوااسکریپت و ربات‌های پیام‌رسان.',
    inLanguage: 'fa-IR',
    publisher: {
      '@type': 'Organization',
      name: 'پرامپت‌جو',
      url: 'https://promptjoo.ir'
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 space-y-10 animate-fade-in">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Header */}
      <div className="space-y-3 border-b border-slate-200/80 pb-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-cyan-50 text-cyan-600 border border-cyan-200/60">
          <Terminal className="w-3.5 h-3.5" />
          <span>توسعه‌دهندگان و اتوماسیون</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
          مستندات OpenAPI و وب‌سرویس REST
        </h1>
        <p className="text-sm text-slate-500 leading-relaxed">
          کلیه امکانات جستجو در کاتالوگ، حل متغیرهای پرامپت و موتور ترکیب بلوک‌ها از طریق پروتکل استاندارد HTTP RESTful در دسترس توسعه‌دهندگان قرار دارد.
        </p>
      </div>

      {/* Endpoints Documentation */}
      <div className="space-y-8 text-sm">
        {/* Base URL Card */}
        <div className="glass-panel p-6 rounded-3xl border border-slate-200/80 space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">آدرس پایه وب‌سرویس (Base URL)</h2>
          <div className="bg-slate-900 text-slate-100 p-4 rounded-2xl font-mono text-xs flex items-center justify-between" dir="ltr">
            <span>https://promptjoo.ir/api/v1</span>
            <span className="text-[10px] text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800">ONLINE</span>
          </div>
        </div>

        {/* Endpoint 1 */}
        <section className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-200/80 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2" dir="ltr">
              <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-100 text-emerald-700">GET</span>
              <span className="font-mono text-xs sm:text-sm text-slate-800 font-bold">/catalog/prompts</span>
            </div>
            <span className="text-xs text-slate-500">فهرست پرامپت‌ها با فیلتر و جستجو</span>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            جستجو بر اساس کلمات کلیدی، فیلتر مدالیته (<code className="font-mono bg-slate-100 px-1 py-0.5 rounded">text_writing</code>, <code className="font-mono bg-slate-100 px-1 py-0.5 rounded">image_edit</code>, ...)، دسته‌بندی و صفحه‌بندی هوشمند.
          </p>
          <div className="space-y-1.5" dir="ltr">
            <p className="text-[11px] font-bold text-slate-500">cURL Example:</p>
            <pre className="bg-slate-900 text-emerald-300 p-3.5 rounded-2xl font-mono text-xs overflow-x-auto">
{`curl -X GET "https://promptjoo.ir/api/v1/catalog/prompts?q=اینستاگرام&limit=5"`}
            </pre>
          </div>
        </section>

        {/* Endpoint 2 */}
        <section className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-200/80 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2" dir="ltr">
              <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-100 text-blue-700">POST</span>
              <span className="font-mono text-xs sm:text-sm text-slate-800 font-bold">/catalog/prompts/:slug/copy</span>
            </div>
            <span className="text-xs text-slate-500">کامپایل متغیرها و کپی پرامپت</span>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            دریافت مقادیر اسلات‌ها، اعمال الزامات زبان فارسی در خروجی و صدور متن نهایی آماده برای تزریق به ChatGPT یا Midjourney.
          </p>
          <div className="space-y-1.5" dir="ltr">
            <p className="text-[11px] font-bold text-slate-500">Payload Example:</p>
            <pre className="bg-slate-900 text-sky-300 p-3.5 rounded-2xl font-mono text-xs overflow-x-auto">
{`{
  "slot_values": {
    "topic": "معماری داخلی مدرن",
    "tone": "حرفه‌ای و ترغیب‌کننده"
  },
  "force_farsi_output": true
}`}
            </pre>
          </div>
        </section>

        {/* Endpoint 3 */}
        <section className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-200/80 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2" dir="ltr">
              <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-purple-100 text-purple-700">POST</span>
              <span className="font-mono text-xs sm:text-sm text-slate-800 font-bold">/catalog/forge</span>
            </div>
            <span className="text-xs text-slate-500">موتور ترکیب بلوک‌های اتمیک</span>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            ساخت داینامیک پرامپت از روی ایده کاربر با ترکیب بلوک‌های نقش، هدف، راهبرد و خروجی.
          </p>
          <div className="space-y-1.5" dir="ltr">
            <p className="text-[11px] font-bold text-slate-500">Payload Example:</p>
            <pre className="bg-slate-900 text-purple-300 p-3.5 rounded-2xl font-mono text-xs overflow-x-auto">
{`{
  "query": "طراحی جدول مقایسه گوشی‌های پرچمدار در اکسل",
  "force_farsi_output": true
}`}
            </pre>
          </div>
        </section>
      </div>

      {/* Footer Navigation */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-slate-200">
        <Link
          href="/"
          className="text-xs font-bold text-blue-600 hover:text-blue-500 flex items-center gap-1.5"
        >
          <ArrowRight className="w-4 h-4" />
          <span>بازگشت به صفحه اصلی</span>
        </Link>
        <Link
          href="/faq"
          className="text-xs text-slate-500 hover:text-slate-800"
        >
          پرسش‌های متداول پرامپت‌نویسی ←
        </Link>
      </div>
    </div>
  );
}
