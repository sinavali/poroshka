'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Mail, MessageCircle, ArrowRight, CheckCircle, HelpCircle, Phone, MapPin, LifeBuoy } from 'lucide-react';
import { showDynamicToast } from '../../components/DynamicIslandToast';
import { AdPlacement } from '../../components/AdPlacement';
import { usePublicSettings } from '../../lib/public-settings';

export default function ContactPage() {
  const { general } = usePublicSettings();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    setSubmitted(true);
    showDynamicToast({
      title: 'پیام شما دریافت شد',
      message: 'کارشناسان ما در سریع‌ترین زمان پاسخ خواهند داد.',
      type: 'success'
    });
  };

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ContactPage',
    name: 'تماس با ما | پوروشکا',
    description: 'راه‌های ارتباطی و کانال‌های پشتیبانی پلتفرم پوروشکا.',
    inLanguage: 'fa-IR',
    mainEntity: {
      '@type': 'Organization',
      name: 'پوروشکا',
      url: 'https://poroshka.ir',
      contactPoint: {
        '@type': 'ContactPoint',
        contactType: 'customer support',
        telephone: general.contact_phone,
        email: general.contact_email,
        availableLanguage: ['Persian', 'English']
      }
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 space-y-10 animate-fade-in" dir="rtl">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Header */}
      <div className="space-y-3 border-b border-slate-200/80 pb-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-600 border border-blue-200/60">
          <MessageCircle className="w-3.5 h-3.5" />
          <span>پشتیبانی و ارتباط مستقیم</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
          تماس با پوروشکا
        </h1>
        <p className="text-sm text-slate-500 leading-relaxed">
          سؤالی دارید؟ پرامپت جدیدی مد نظرتان است یا مایل به همکاری هستید؟ خوشحال می‌شویم با ما در ارتباط باشید.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Contact Information & Channels */}
        <div className="space-y-4">
          <h2 className="text-sm font-bold text-slate-900">کانال‌های ارتباطی و پشتیبانی</h2>

          <div className="glass-panel p-5 rounded-2xl border border-slate-200/80 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-200/60">
                <LifeBuoy className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-slate-900">ثبت تیکت پشتیبانی آنلاین</h3>
                <p className="text-[11px] text-slate-500">پاسخ‌گویی مستقیم کارشناسان فنی و بررسی گزارش‌ها</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                if (typeof window !== 'undefined') {
                  window.dispatchEvent(new CustomEvent('poroshka:open-tickets'));
                  window.dispatchEvent(new CustomEvent('promptjoo:open-tickets'));
                }
              }}
              className="w-full py-2 px-3 text-center text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white rounded-xl spring-transition"
            >
              باز کردن مرکز تیکت‌های پشتیبانی
            </button>
          </div>

          <div className="glass-panel p-5 rounded-2xl border border-slate-200/80 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-200/60">
                <Phone className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-slate-900">تماس تلفنی با پشتیبانی</h3>
                <p className="text-[11px] text-slate-500">پاسخ‌گویی به سوالات و راهنمایی کاربران</p>
              </div>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-50 flex items-center justify-between text-xs">
              <span className="text-slate-500">تلفن پشتیبانی:</span>
              <a href={`tel:${general.contact_phone}`} className="font-bold font-mono text-blue-600 hover:underline dir-ltr">
                {general.contact_phone}
              </a>
            </div>
          </div>

          <div className="glass-panel p-5 rounded-2xl border border-slate-200/80 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-200/60">
                <Mail className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-slate-900">ایمیل مستقیم پشتیبانی</h3>
                <p className="text-[11px] text-slate-500">پیشنهاد پرامپت، گزارش باگ یا درخواست همکاری</p>
              </div>
            </div>
            <div className="space-y-1 text-xs">
              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 font-mono text-[11px]">
                <span className="text-slate-500">پشتیبانی:</span>
                <a href={`mailto:${general.contact_email}`} className="text-blue-600 font-bold hover:underline">{general.contact_email}</a>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 font-mono text-[11px]">
                <span className="text-slate-500">کانال اطلاع‌رسانی:</span>
                <span className="text-slate-700 font-bold">{general.telegram_channel}</span>
              </div>
            </div>
          </div>

          <AdPlacement slot="contact_1" />

          <div className="glass-panel p-5 rounded-2xl border border-slate-200/80 space-y-2 text-xs text-slate-600">
            <div className="flex items-center gap-2 pt-1">
              <MapPin className="w-4 h-4 text-slate-400" />
              <span>مرکز میزبانی: تهران، شبکه ملی اطلاعات ایران</span>
            </div>
          </div>
        </div>

        {/* Contact Form */}
        <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-200/80">
          {submitted ? (
            <div className="py-12 text-center space-y-3">
              <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900">پیام شما با موفقیت ثبت شد</h3>
              <p className="text-xs text-slate-500">از همراهی شما صمیمانه سپاسگزاریم.</p>
              <button
                onClick={() => { setSubmitted(false); setMessage(''); }}
                className="mt-4 text-xs font-bold text-blue-600 hover:underline"
              >
                ارسال پیام دیگر
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <h3 className="text-sm font-bold text-slate-900 mb-2">ارسال پیام مستقیم</h3>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">نام شما</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="مثلاً: سینا والی"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">ایمیل یا شماره تماس</label>
                <input
                  type="text"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="sina@example.com یا ۰۹۱۲..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800"
                  dir="ltr"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">متن پیام یا بازخورد شما</label>
                <textarea
                  rows={4}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="دیدگاه، پیشنهاد یا پرامپتی که می‌خواهید به پوروشکا اضافه شود را بنویسید..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 leading-relaxed"
                  required
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md shadow-blue-600/20 spring-transition"
              >
                ارسال پیام به تیم فنی
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
