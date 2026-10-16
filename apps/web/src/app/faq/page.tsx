import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { HelpCircle, Sparkles, ArrowRight, CheckCircle2, ChevronDown } from 'lucide-react';

export const metadata: Metadata = {
  title: 'پرسش‌های متداول (FAQ) | پرامپت‌جو',
  description: 'پاسخ به سوالات متداول درباره نحوه کپی و اجرای پرامپت‌ها در ChatGPT، Midjourney، Claude، متغیرهای شخصی و حافظه برند.',
  alternates: {
    canonical: 'https://promptjoo.ir/faq'
  },
  openGraph: {
    title: 'پرسش‌های متداول و راهنمای کار با پرامپت‌جو',
    description: 'همه چیز درباره استفاده حرفه‌ای از پرامپت‌های مهندسی‌شده هوش مصنوعی در ایران.',
    url: 'https://promptjoo.ir/faq',
    siteName: 'پرامپت‌جو',
    locale: 'fa_IR',
    type: 'article'
  }
};

const FAQ_ITEMS = [
  {
    q: 'پرامپت (Prompt) چیست و چرا استفاده از قالب‌های مهندسی‌شده مهم است؟',
    a: 'پرامپت دستور یا متنی است که شما به یک مدل هوش مصنوعی (مانند ChatGPT یا Midjourney) می‌دهید. مدل‌های هوش مصنوعی بر اساس کیفیت و جزئیات دستور ورودی پاسخ می‌دهند. پرامپت‌های مهندسی‌شده پرامپت‌جو شامل نقش دقیق (Role)، زمینه تخصصی (Context)، گام‌های منطقی (Chain-of-Thought) و ساختار خروجی استاندارد هستند که خروجی را از سطحی و کلیشه‌ای به حرفه‌ای و آماده استفاده تبدیل می‌کنند.'
  },
  {
    q: 'آیا برای استفاده از پرامپت‌های پرامپت‌جو باید هزینه‌ای پرداخت کنم؟',
    a: 'خیر! دسترسی به تمام پرامپت‌های کاتالوگ، موتور کامپایل و ابزار ترکیب بلوک‌ها برای تمامی کاربران کاملاً رایگان است.'
  },
  {
    q: 'متغیرها یا اسلات‌های داخل پرامپت (مثل {{brand_name}}) چگونه کار می‌کنند؟',
    a: 'هر پرامپت دارای چند متغیر کلیدی است. در صفحه هر پرامپت می‌توانید این فیلدها را با مقادیر مورد نظر خود پر کنید. سیستم بلافاصله متن نهایی پرامپت را جایگزین کرده و به شما تحویل می‌دهد تا نیازی به ویرایش دستی کدها یا متن انگلیسی نداشته باشید.'
  },
  {
    q: 'حافظه شخصی (Personal Memory) چیست و چه کاربردی دارد؟',
    a: 'حافظه شخصی به شما امکان می‌دهد پروفایل برند یا کسب‌وکار خود (نام برند، مخاطبان هدف، لحن صحبت و دعوت به اقدام) را یک‌بار ذخیره کنید. سپس در ساخت هر پرامپت، کافی است پروفایل مورد نظر را از منوی کشویی انتخاب کنید تا تمام فیلدهای مرتبط خودکار پر شوند.'
  },
  {
    q: 'چرا برخی پرامپت‌ها به زبان انگلیسی اما خروجی به زبان فارسی است؟',
    a: 'بسیاری از مدل‌های هوش مصنوعی قدرتمند (به‌خصوص مدل‌های تصویرساز مانند Midjourney یا موتورهای کدنویسی) زبان انگلیسی را با دقت مفهومی بالاتری نسبت به فارسی درک می‌کنند. الگوهای پرامپت‌جو ساختار دستور را به دقیق‌ترین فرم انگلیسی تنظیم می‌کنند اما با دستورهای تکمیلی، مدل متنی را ملزم می‌کنند خروجی نهایی را به فارسی روان، بدون غلط و باکیفیت بنویسد.'
  },
  {
    q: 'چگونه می‌توانم پرامپت‌های کپی‌شده قبلی خود را پیدا کنم؟',
    a: 'کافی است از منوی بالای سایت یا پایین صفحه به بخش «پرامپت‌های من» (/my-prompts) مراجعه کنید. تمام پرامپت‌هایی که کپی کرده‌اید به همراه تعداد دفعات استفاده و مقادیر ذخیره‌شده شما در آنجا نگهداری می‌شوند.'
  },
  {
    q: 'آیا خروجی پرامپت‌ها در پروژه‌های تجاری قابل استفاده است؟',
    a: 'بله، کلیه محتواها، کدها و تصاویر تولیدشده با این پرامپت‌ها متعلق به خود شماست و می‌توانید در پروژه‌های تجاری، وب‌سایت‌ها، شبکه‌های اجتماعی و تبلیغات بدون هیچ محدودیتی از آن‌ها استفاده کنید.'
  }
];

export default function FaqPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQ_ITEMS.map((item) => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.a
      }
    }))
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 space-y-10 animate-fade-in">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Header */}
      <div className="space-y-3 border-b border-slate-200/80 pb-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-purple-50 text-purple-600 border border-purple-200/60">
          <HelpCircle className="w-3.5 h-3.5" />
          <span>راهنما و پاسخ به سؤالات</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
          پرسش‌های متداول پرامپت‌جو
        </h1>
        <p className="text-sm text-slate-500 leading-relaxed">
          پاسخ سریع به متداول‌ترین سؤالات کاربران درباره نحوه کارکرد پرامپت‌ها، هوش مصنوعی و حافظه برند.
        </p>
      </div>

      {/* Accordion / FAQ List */}
      <div className="space-y-4">
        {FAQ_ITEMS.map((item, index) => (
          <details
            key={index}
            className="group glass-panel rounded-2xl border border-slate-200/80 p-5 open:bg-white open:shadow-md spring-transition"
          >
            <summary className="flex items-center justify-between cursor-pointer list-none select-none font-bold text-sm text-slate-900 group-hover:text-blue-600 spring-transition">
              <span className="flex items-center gap-2">
                <span className="text-xs font-mono text-slate-400">۰{index + 1}.</span>
                <span>{item.q}</span>
              </span>
              <ChevronDown className="w-4 h-4 text-slate-400 group-open:rotate-180 spring-transition flex-shrink-0 mr-2" />
            </summary>
            <div className="mt-4 pt-3 border-t border-slate-100 text-xs sm:text-sm text-slate-600 leading-relaxed mr-6">
              {item.a}
            </div>
          </details>
        ))}
      </div>

      {/* Call to action */}
      <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-blue-100 bg-blue-50/40 text-center space-y-3">
        <h3 className="text-base font-bold text-slate-900">سؤال دیگری دارید که اینجا نیست؟</h3>
        <p className="text-xs text-slate-600 max-w-md mx-auto leading-relaxed">
          تیم پشتیبانی و جامعه کاربری پرامپت‌جو در تلگرام و بله همواره پاسخگوی سؤالات فنی شما هستند.
        </p>
        <div className="pt-2">
          <Link
            href="/contact"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-sm shadow-blue-500/20 spring-transition"
          >
            <span>تماس با پشتیبانی</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
