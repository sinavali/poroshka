import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Lock, Shield, ArrowRight, Smartphone, EyeOff, Server, Database } from 'lucide-react';
import { AdPlacement } from '../../components/AdPlacement';

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://poroshka.ir';

export const metadata: Metadata = {
  title: 'حریم خصوصی کاربران | پوروشکا',
  description: 'سیاست‌های حفاظت از داده‌ها، رمزنگاری شماره‌های تماس، عدم فروش اطلاعات شخصی و تضمین پردازش محرمانه در پلتفرم هوش مصنوعی پوروشکا.',
  alternates: {
    canonical: `${baseUrl}/privacy`
  },
  openGraph: {
    title: 'حریم خصوصی کاربران | پوروشکا',
    description: 'تعهد رسمی پوروشکا به حفظ حریم شخصی، امنیت شماره موبایل و پردازش محرمانه داده‌های کاربران در ایران.',
    url: `${baseUrl}/privacy`,
    siteName: 'پوروشکا',
    locale: 'fa_IR',
    type: 'article'
  }
};

export default function PrivacyPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: 'سیاست حفظ حریم خصوصی در پوروشکا',
    description: 'تعهد پوروشکا به امنیت داده‌ها و حفاظت کامل از اطلاعات هویتی و پرامپت‌های کاربران.',
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
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-600 border border-emerald-200/60">
          <Lock className="w-3.5 h-3.5" />
          <span>امنیت و محرمانگی</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
          حریم خصوصی کاربران
        </h1>
        <p className="text-sm text-slate-500 leading-relaxed">
          ما در پوروشکا متعهد هستیم که داده‌های هویتی و پرامپت‌های شما را با بالاترین استانداردهای امنیتی محافظت کنیم.
        </p>
      </div>

      {/* Ad Placement 1 */}
      <AdPlacement slot="privacy_1" />

      {/* Sections */}
      <div className="space-y-8 text-sm text-slate-700 leading-relaxed">
        {/* Section 1 */}
        <section className="glass-panel p-6 sm:p-8 rounded-3xl space-y-4 border border-slate-200/80">
          <div className="flex items-center gap-2.5 text-base font-bold text-slate-900">
            <Smartphone className="w-5 h-5 text-blue-600" />
            <h2>۱. اطلاعاتی که جمع‌آوری می‌کنیم</h2>
          </div>
          <p>
            برای استفاده از پرامپت‌ها هیچ نیازی به ثبت اطلاعات حساس نیست. تنها در صورت تمایل به ذخیره چندگانه حافظه شخصی یا استفاده از امکانات پیشرفته، ثبت شماره موبایل برای ارسال کد یک‌بارمصرف (OTP) الزامی است.
          </p>
          <ul className="list-disc list-inside space-y-1.5 text-xs text-slate-600 mr-2">
            <li><strong>شماره همراه:</strong> صرفاً برای اعتبارسنجی ورود و جلوگیری از حملات رباتیک استفاده می‌شود.</li>
            <li><strong>حافظه برند (Brand Memory):</strong> مقادیر شخصی‌سازی شده شما مانند نام برند، لحن و مخاطب هدف.</li>
            <li><strong>تاریخچه پرامپت‌های کپی‌شده:</strong> صرفاً برای دسترسی مجدد شما در صفحه «پرامپت‌های من».</li>
          </ul>
        </section>

        {/* Section 2 */}
        <section className="glass-panel p-6 sm:p-8 rounded-3xl space-y-4 border border-slate-200/80">
          <div className="flex items-center gap-2.5 text-base font-bold text-slate-900">
            <EyeOff className="w-5 h-5 text-purple-600" />
            <h2>۲. تعهد قطعی عدم فروش داده‌ها</h2>
          </div>
          <p>
            پوروشکا تحت هیچ شرایطی اطلاعات تماس، ورودی‌های متنی، یا داده‌های شخصی کاربران را به هیچ شرکت واسط، آژانس بازاریابی یا نهاد شخص ثالث نمی‌فروشد و اجاره نمی‌دهد. درآمد پایدار این سرویس صرفاً از طریق تبلیغات محلی با شفافیت کامل تأمین می‌شود.
          </p>
        </section>

        {/* Ad Placement 2 */}
        <AdPlacement slot="privacy_2" />

        {/* Section 3 */}
        <section className="glass-panel p-6 sm:p-8 rounded-3xl space-y-4 border border-slate-200/80">
          <div className="flex items-center gap-2.5 text-base font-bold text-slate-900">
            <Server className="w-5 h-5 text-emerald-600" />
            <h2>۳. زیرساخت محلی و پردازش امن</h2>
          </div>
          <p>
            تمام پایگاه‌های داده و سرورهای پردازش پرامپت بر بستر مراکز داده معتبر میزبانی شده و توکن‌های ورود با استاندارد هش‌کردن یک‌طرفه (SHA-256 و Argon2id) ذخیره می‌شوند. لاگ‌های امنیتی سرور نیز به صورت خودکار شماره‌های تلفن را ماسک می‌کنند (مانند ۰۹۱۲***۱۲۳).
          </p>
        </section>

        {/* Section 4 */}
        <section className="glass-panel p-6 sm:p-8 rounded-3xl space-y-4 border border-slate-200/80">
          <div className="flex items-center gap-2.5 text-base font-bold text-slate-900">
            <Database className="w-5 h-5 text-amber-600" />
            <h2>۴. کنترل کامل شما بر اطلاعات شخصی</h2>
          </div>
          <p>
            شما در هر زمان می‌توانید از طریق بخش تنظیمات یا دکمه‌های پاک‌سازی حافظه در مرورگر، داده‌های ذخیره‌شده را حذف کنید. برای حذف کامل حساب کاربری و تمامی سوابق کپی نیز کافی است از طریق صفحه تماس با پشتیبانی درخواست خود را ارسال فرمایید.
          </p>
        </section>
      </div>

      {/* Ad Placement 3 */}
      <AdPlacement slot="privacy_3" />

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
          href="/terms"
          className="text-xs text-slate-500 hover:text-slate-800"
        >
          مشاهده شرایط استفاده و کپی‌رایت ←
        </Link>
      </div>
    </div>
  );
}
