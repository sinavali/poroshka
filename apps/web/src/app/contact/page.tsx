'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Mail, MessageCircle, Send, ArrowRight, CheckCircle, HelpCircle, Phone, MapPin } from 'lucide-react';
import { showDynamicToast } from '../../components/DynamicIslandToast';

export default function ContactPage() {
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
    name: 'تماس با ما | پرامپت‌جو',
    description: 'راه‌های ارتباطی و کانال‌های پشتیبانی پلتفرم پرامپت‌جو.',
    inLanguage: 'fa-IR',
    mainEntity: {
      '@type': 'Organization',
      name: 'پرامپت‌جو',
      url: 'https://promptjoo.ir',
      contactPoint: {
        '@type': 'ContactPoint',
        contactType: 'customer support',
        availableLanguage: ['Persian', 'English']
      }
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
          <MessageCircle className="w-3.5 h-3.5" />
          <span>پشتیبانی و ارتباط مستقیم</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
          تماس با پرامپت‌جو
        </h1>
        <p className="text-sm text-slate-500 leading-relaxed">
          سؤالی دارید؟ پرامپت جدیدی مد نظرتان است یا مایل به همکاری هستید؟ خوشحال می‌شویم با ما در ارتباط باشید.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Contact Information & Channels */}
        <div className="space-y-4">
          <h2 className="text-sm font-bold text-slate-900">کانال‌های ارتباطی سریع</h2>

          <div className="glass-panel p-5 rounded-2xl border border-slate-200/80 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center border border-sky-200/60">
                <Send className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-slate-900">پشتیبانی تلگرام</h3>
                <p className="text-[11px] text-slate-500">پاسخ‌گویی سریع و معرفی پرامپت‌های روز</p>
              </div>
            </div>
            <a
              href="https://t.me/promptjoo_bot"
              target="_blank"
              rel="noreferrer"
              className="block w-full py-2 px-3 text-center text-xs font-bold bg-sky-600 hover:bg-sky-500 text-white rounded-xl spring-transition"
            >
              ارسال پیام به بات تلگرام (@promptjoo_bot)
            </a>
          </div>

          <div className="glass-panel p-5 rounded-2xl border border-slate-200/80 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-200/60">
                <MessageCircle className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-slate-900">بازوی بله (پیام‌رسان بومی)</h3>
                <p className="text-[11px] text-slate-500">دسترسی بدون فیلتر بر بستر شبکه ملی</p>
              </div>
            </div>
            <a
              href="https://ble.ir/promptjoo_bot"
              target="_blank"
              rel="noreferrer"
              className="block w-full py-2 px-3 text-center text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl spring-transition"
            >
              اتصال به بازوی بله
            </a>
          </div>

          <div className="glass-panel p-5 rounded-2xl border border-slate-200/80 space-y-2 text-xs text-slate-600">
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-slate-400" />
              <span>ایمیل رسمی: </span>
              <a href="mailto:support@promptjoo.ir" className="font-mono text-blue-600 hover:underline">support@promptjoo.ir</a>
            </div>
            <div className="flex items-center gap-2 pt-1">
              <MapPin className="w-4 h-4 text-slate-400" />
              <span>مرکز میزبانی: تهران، شبکه ملی اطلاعات</span>
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
                <label className="block text-xs font-medium text-slate-700 mb-1">نام یا عنوان شما (اختیاری)</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="مثال: علی رضایی"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">شماره تماس یا ایمیل (برای پاسخ)</label>
                <input
                  type="text"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="0912... یا email@example.com"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">متن پیام یا پرامپت پیشنهادی *</label>
                <textarea
                  rows={4}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  required
                  placeholder="دیدگاه، پیشنهاد یا پرامپتی که می‌خواهید به پرامپت‌جو اضافه شود را بنویسید..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-500"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl spring-transition shadow-sm shadow-blue-500/20"
              >
                ارسال پیام
              </button>
            </form>
          )}
        </div>
      </div>

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
          href="/faq"
          className="text-xs text-slate-500 hover:text-slate-800"
        >
          پرسش‌های متداول و راهنمای کاربری ←
        </Link>
      </div>
    </div>
  );
}
