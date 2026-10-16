import React from 'react';
import Link from 'next/link';
import { Sparkles, Send, ShieldCheck, Heart } from 'lucide-react';

export function Footer() {
  return (
    <footer className="w-full border-t border-slate-200/80 bg-slate-50/80 backdrop-blur-md pt-12 pb-8 mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
          {/* Brand Info */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-sm">
                <Sparkles className="w-4 h-4" />
              </div>
              <span className="text-lg font-black text-slate-900">پرامپت‌جو</span>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              بزرگ‌ترین مرجع تخصصی پرامپت‌های مهندسی‌شده هوش مصنوعی در ایران. با پرامپت‌جو بدون نیاز به دانش پیچیده پرامپت‌نویسی، به بهترین نتایج در ChatGPT، Midjourney، Gemini و Claude دست پیدا کنید.
            </p>
            <div className="flex items-center gap-3 pt-2">
              <a
                href="https://t.me/promptjoo_bot"
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs bg-sky-50 text-sky-600 border border-sky-200 hover:bg-sky-100 spring-transition"
              >
                <Send className="w-3.5 h-3.5" />
                <span>ربات تلگرام</span>
              </a>
              <a
                href="https://ble.ir/promptjoo_bot"
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs bg-emerald-50 text-emerald-600 border border-emerald-200 hover:bg-emerald-100 spring-transition"
              >
                <Send className="w-3.5 h-3.5" />
                <span>بازوی بله</span>
              </a>
            </div>
          </div>

          {/* Quick Categories */}
          <div>
            <h4 className="text-sm font-bold text-slate-900 mb-4">دسته‌بندی‌های محبوب</h4>
            <ul className="space-y-2 text-xs text-slate-500">
              <li><Link href="/?category=photo-editing" className="hover:text-blue-600 spring-transition">ادیت و ترمیم عکس</Link></li>
              <li><Link href="/?category=image-generation" className="hover:text-blue-600 spring-transition">تولید تصویر خلاقانه</Link></li>
              <li><Link href="/?category=content-writing" className="hover:text-blue-600 spring-transition">کپشن و تولید محتوا</Link></li>
              <li><Link href="/?category=excel-data" className="hover:text-blue-600 spring-transition">فرمول‌نویسی اکسل</Link></li>
              <li><Link href="/?category=coding-tech" className="hover:text-blue-600 spring-transition">برنامه‌نویسی و SQL</Link></li>
            </ul>
          </div>

          {/* Developer & Legal */}
          <div>
            <h4 className="text-sm font-bold text-slate-900 mb-4">قوانین و راهنما</h4>
            <ul className="space-y-2 text-xs text-slate-500">
              <li><Link href="/faq" className="hover:text-blue-600 spring-transition">پرسش‌های متداول (FAQ)</Link></li>
              <li><Link href="/about" className="hover:text-blue-600 spring-transition">درباره پرامپت‌جو</Link></li>
              <li><Link href="/contact" className="hover:text-blue-600 spring-transition">تماس و پشتیبانی</Link></li>
              <li><Link href="/terms" className="hover:text-blue-600 spring-transition">شرایط استفاده و کپی‌رایت</Link></li>
              <li><Link href="/privacy" className="hover:text-blue-600 spring-transition">حریم خصوصی کاربران</Link></li>
              <li><Link href="/api-docs" className="hover:text-blue-600 spring-transition">مستندات OpenAPI و وب‌سرویس</Link></li>
              <li><Link href="/admin" className="hover:text-blue-600 spring-transition">ورود به پنل مدیریت</Link></li>
            </ul>
          </div>

          {/* Domestic Trust & Architecture */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>کیفیت و مهندسی پرامپت</span>
            </h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              پرامپت‌های کاتالوگ با تکنیک‌های پیشرفته مهندسی پرامپت تنظیم شده‌اند تا خروجی دقیق، حرفه‌ای و به زبان فارسی روان را در ChatGPT، Midjourney و Claude تحویل دهند.
            </p>
            <div className="pt-2 text-[11px] text-slate-500 flex items-center gap-1">
              <span>طراحی‌شده با</span>
              <Heart className="w-3 h-3 text-red-500 fill-red-500 inline" />
              <span>برای تولیدکنندگان محتوا و متخصصان ایرانی</span>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-slate-200/80 pt-6 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2">
          <p>© {new Date().toLocaleDateString('fa-IR')} پرامپت‌جو — تمامی حقوق محفوظ است.</p>
          <p className="font-mono text-[11px]">v1.3.0 · Enterprise Node 22 LTS · PostgreSQL 18.1</p>
        </div>
      </div>
    </footer>
  );
}
