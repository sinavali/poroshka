import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { ShieldCheck, FileText, ArrowRight, CheckCircle2, AlertTriangle, Scale, Sparkles } from 'lucide-react';
import { AdPlacement } from '../../components/AdPlacement';

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://poroshka.ir';

export const metadata: Metadata = {
  title: 'قوانین و شرایط استفاده | پوروشکا',
  description: 'قوانین استفاده از پرامپت‌ها، حق مالکیت معنوی قالب‌ها، عدم سوءاستفاده و ضوابط حقوقی پلتفرم مهندسی پرامپت پوروشکا در ایران.',
  alternates: {
    canonical: `${baseUrl}/terms`
  },
  openGraph: {
    title: 'قوانین و شرایط استفاده | پوروشکا',
    description: 'ضوابط شفاف حقوقی و شرایط استفاده از کاتالوگ و ابزارهای مهندسی پرامپت هوش مصنوعی در پلتفرم پوروشکا.',
    url: `${baseUrl}/terms`,
    siteName: 'پوروشکا',
    locale: 'fa_IR',
    type: 'article'
  }
};

export default function TermsPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: 'قوانین و شرایط استفاده از پوروشکا',
    description: 'قوانین و ضوابط شفاف استفاده از کاتالوگ و ابزارهای مهندسی پرامپت پوروشکا.',
    inLanguage: 'fa-IR',
    publisher: {
      '@type': 'Organization',
      name: 'پوروشکا',
      url: 'https://poroshka.ir'
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
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-600 border border-blue-200/60">
          <Scale className="w-3.5 h-3.5" />
          <span>ضوابط و قوانین رسمی</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
          شرایط استفاده و کپی‌رایت
        </h1>
        <p className="text-sm text-slate-500 leading-relaxed">
          آخرین به‌روزرسانی: مهر ۱۴۰۵ · مطالعه این ضوابط به شما کمک می‌کند با حقوق و تعهدات خود در پوروشکا آشنا شوید.
        </p>
      </div>

      {/* Ad Placement 1 */}
      <AdPlacement slot="terms_1" />

      {/* Content Blocks */}
      <div className="space-y-8 text-sm text-slate-700 leading-relaxed">
        {/* Section 1 */}
        <section className="glass-panel p-6 sm:p-8 rounded-3xl space-y-4 border border-slate-200/80">
          <div className="flex items-center gap-2.5 text-base font-bold text-slate-900">
            <CheckCircle2 className="w-5 h-5 text-blue-600" />
            <h2>۱. پذیرش شرایط و ضوابط عمومی</h2>
          </div>
          <p>
            استفاده شما از خدمات سامانه «پوروشکا» (شامل وب‌سایت و کاتالوگ پرامپت‌ها) به معنای پذیرش کامل و بدون قید و شرط این شرایط است. هدف پوروشکا، توانمندسازی متخصصان، طراحان و تولیدکنندگان محتوا در به‌کارگیری بهینه ابزارهای هوش مصنوعی مانند ChatGPT، Claude، Midjourney و Gemini است.
          </p>
        </section>

        {/* Section 2 */}
        <section className="glass-panel p-6 sm:p-8 rounded-3xl space-y-4 border border-slate-200/80">
          <div className="flex items-center gap-2.5 text-base font-bold text-slate-900">
            <Sparkles className="w-5 h-5 text-purple-600" />
            <h2>۲. مالکیت فکری و حق بهره‌برداری از پرامپت‌ها</h2>
          </div>
          <p>
            کلیه الگوهای پرامپت‌های کاتالوگ به صورت آزاد برای اهداف شخصی، آموزشی و تجاری قابل کپی و استفاده در مدل‌های هوش مصنوعی هستند. شما مالک کامل کلیه خروجی‌ها (متن‌ها، تصاویر، کدها و تحلیل‌ها) حاصل از اجرای پرامپت‌ها در ابزارهای هوش مصنوعی شخصی خود هستید.
          </p>
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 text-xs text-slate-600 space-y-2">
            <p className="font-bold text-slate-800">محدودیت استخراج داده (Anti-Scraping):</p>
            <p>
              هرگونه استخراج ماشینی (اسکرپینگ توده‌ای)، بازتولید کل پایگاه‌داده پرامپت‌ها، یا فروش مستقیم کاتالوگ پوروشکا بدون مجوز کتبی ممنوع بوده و طبق قانون جرایم رایانه‌ای و قانون حمایت از پدیدآورندگان نرم‌افزارهای رایانه‌ای پیگرد قانونی دارد.
            </p>
          </div>
        </section>

        {/* Ad Placement 2 */}
        <AdPlacement slot="terms_2" />

        {/* Section 3 */}
        <section className="glass-panel p-6 sm:p-8 rounded-3xl space-y-4 border border-slate-200/80">
          <div className="flex items-center gap-2.5 text-base font-bold text-slate-900">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
            <h2>۳. استفاده مسئولانه و خطوط قرمز اخلاقی</h2>
          </div>
          <p>
            کاربران متعهد هستند که از پرامپت‌ها و موتور ترکیب بلوک در چارچوب قوانین موضوعه کشور و استانداردهای ایمنی هوش مصنوعی استفاده کنند. ساخت هرگونه پرامپت برای تولید محتوای مخرب، بدافزار، فیشینگ، نقض حریم خصوصی دیگران، ترویج خشونت یا نفرت‌پراکنی اکیداً ممنوع است.
          </p>
        </section>

        {/* Section 4 */}
        <section className="glass-panel p-6 sm:p-8 rounded-3xl space-y-4 border border-slate-200/80">
          <div className="flex items-center gap-2.5 text-base font-bold text-slate-900">
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
            <h2>۴. رفع مسئولیت در قبال خروجی‌های مدل‌های هوش مصنوعی</h2>
          </div>
          <p>
            پوروشکا با بالاترین استانداردهای مهندسی پرامپت، قالب‌ها را بهینه‌سازی می‌کند؛ با این حال از آنجا که عملکرد مدل‌های هوش مصنوعی مولد بر پایه احتمالات آماری است، مسئولیت بازبینی و اعتبارسنجی نهایی خروجی پرامپت‌ها (به‌ویژه در موضوعات پزشکی، حقوقی و مالی حساس) بر عهده شخص کاربر است.
          </p>
        </section>
      </div>

      {/* Ad Placement 3 */}
      <AdPlacement slot="terms_3" />

      {/* Footer Navigation */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-slate-200">
        <Link
          href="/"
          className="text-xs font-bold text-blue-600 hover:text-blue-500 flex items-center gap-1.5"
        >
          <ArrowRight className="w-4 h-4" />
          <span>بازگشت به کاتالوگ پرامپت‌ها</span>
        </Link>
        <Link
          href="/privacy"
          className="text-xs text-slate-500 hover:text-slate-800"
        >
          مطالعه سیاست حفظ حریم خصوصی کاربران ←
        </Link>
      </div>
    </div>
  );
}
