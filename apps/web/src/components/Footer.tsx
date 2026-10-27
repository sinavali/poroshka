'use client';

import React from 'react';
import Link from 'next/link';
import { ShieldCheck, Heart, Phone, Mail, MessageSquare } from 'lucide-react';
import { PoroshkaLogo } from './PoroshkaLogo';
import { usePublicSettings } from '../lib/public-settings';

export function Footer() {
  const { general } = usePublicSettings();

  return (
    <footer className="w-full border-t border-slate-200/80 bg-slate-50/80 backdrop-blur-md pt-12 pb-8 mt-20" dir="rtl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-8 mb-10">
          {/* Brand Info */}
          <div className="space-y-4 sm:col-span-2 lg:col-span-1">
            <PoroshkaLogo size={32} showWordmark={true} />
            <p className="text-xs text-slate-500 leading-relaxed">
              {general.site_slogan_fa || 'کتابخانه فارسی پرامپت‌های آماده هوش مصنوعی. انتخاب کن، تنظیم کن، با یک کلیک کپی کن. متولد ایران، برای فارسی‌زبانان، همیشه رایگان.'}
            </p>
            <div className="flex items-center gap-2 pt-1 text-[11px] font-bold text-slate-600">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>تمام سرویس‌ها فعال و پایدار</span>
            </div>
          </div>

          {/* AI Model Hubs (Top 5 Models) */}
          <div>
            <h4 className="text-sm font-bold text-slate-900 mb-4">هاب مدل‌های هوش مصنوعی</h4>
            <ul className="space-y-2 text-xs text-slate-500">
              <li><Link href="/hub/chatgpt" className="hover:text-blue-600 spring-transition font-medium">پرامپت‌های ChatGPT (چت جی‌پی‌تی)</Link></li>
              <li><Link href="/hub/midjourney" className="hover:text-blue-600 spring-transition font-medium">پرامپت‌های Midjourney (میدجورنی)</Link></li>
              <li><Link href="/hub/claude" className="hover:text-blue-600 spring-transition font-medium">پرامپت‌های Claude (کلود)</Link></li>
              <li><Link href="/hub/gemini" className="hover:text-blue-600 spring-transition font-medium">پرامپت‌های Gemini (جمینای)</Link></li>
              <li><Link href="/hub/deepseek" className="hover:text-blue-600 spring-transition font-medium">پرامپت‌های DeepSeek (دیپ‌سیک)</Link></li>
            </ul>
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
              <li><Link href="/about" className="hover:text-blue-600 spring-transition">درباره پوروشکا</Link></li>
              <li><Link href="/contact" className="hover:text-blue-600 spring-transition">تماس با ما و پشتیبانی</Link></li>
              <li>
                <button
                  type="button"
                  onClick={() => {
                    if (typeof window !== 'undefined') {
                      window.dispatchEvent(new CustomEvent('poroshka:open-tickets'));
                      window.dispatchEvent(new CustomEvent('promptjoo:open-tickets'));
                    }
                  }}
                  className="hover:text-blue-600 spring-transition text-right cursor-pointer"
                >
                  ثبت تیکت پشتیبانی آنلاین
                </button>
              </li>
              <li><Link href="/terms" className="hover:text-blue-600 spring-transition">شرایط استفاده و کپی‌رایت</Link></li>
              <li><Link href="/privacy" className="hover:text-blue-600 spring-transition">حریم خصوصی کاربران</Link></li>
              <li><Link href="/admin" className="hover:text-blue-600 spring-transition">ورود به پنل مدیریت</Link></li>
            </ul>
          </div>

          {/* Support Contacts & Trust */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>پشتیبانی و ارتباط با ما</span>
            </h4>
            <div className="space-y-2.5 text-xs text-slate-600 bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs">
              <div className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
                <span className="text-slate-400">تماس:</span>
                <a href={`tel:${general.contact_phone}`} className="font-bold font-mono text-slate-800 hover:text-blue-600 dir-ltr">
                  {general.contact_phone}
                </a>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
                <span className="text-slate-400">ایمیل:</span>
                <a href={`mailto:${general.contact_email}`} className="font-bold font-mono text-slate-800 hover:text-blue-600">
                  {general.contact_email}
                </a>
              </div>
            </div>
            <div className="pt-2 text-[11px] text-slate-500 flex items-center gap-1">
              <span>طراحی‌شده با</span>
              <Heart className="w-3 h-3 text-red-500 fill-red-500 inline" />
              <span>برای تولیدکنندگان محتوا و متخصصان ایرانی</span>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-slate-200/80 pt-6 flex items-center justify-center text-xs text-slate-500">
          <p>© {new Date().toLocaleDateString('fa-IR')} پوروشکا (Poroshka) — تمامی حقوق محفوظ است.</p>
        </div>
      </div>
    </footer>
  );
}
