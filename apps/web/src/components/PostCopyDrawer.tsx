'use client';

import React, { useEffect } from 'react';
import { X, ExternalLink, Sparkles, CheckCircle2, MessageSquare, Bot } from 'lucide-react';
import { AdBanner } from './AdBanner';

interface PostCopyDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  compiledText: string;
  promptTitle: string;
}

export function PostCopyDrawer({ isOpen, onClose, compiledText, promptTitle }: PostCopyDrawerProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const chatGptUrl = `https://chatgpt.com/?q=${encodeURIComponent(compiledText)}`;
  const claudeUrl = 'https://claude.ai/new';
  const geminiUrl = 'https://gemini.google.com/app';

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:justify-end bg-slate-900/40 backdrop-blur-md animate-fade-in">
      <div className="w-full sm:max-w-md h-[88vh] sm:h-full glass-dropdown rounded-t-[32px] sm:rounded-none sm:rounded-r-none sm:rounded-l-3xl border-t sm:border-t-0 sm:border-r border-slate-200/80 p-6 flex flex-col justify-between overflow-y-auto animate-fade-in shadow-2xl">
        <div>
          {/* Tactile Mobile Grab Handle */}
          <div className="sm:hidden w-12 h-1.5 rounded-full bg-slate-300 active:bg-slate-400 mb-4 mx-auto pressable" />

          {/* Top Header */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-200/80 mb-4">
            <div className="flex items-center gap-2 text-emerald-600">
              <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
              <div className="flex flex-col">
                <span className="text-sm font-bold text-slate-900">پرامپت در حافظه کپی شد!</span>
                <span className="text-[11px] text-emerald-600 font-medium">آماده جایگذاری در هوش مصنوعی</span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="pressable p-1.5 rounded-full text-slate-400 hover:text-slate-800 hover:bg-slate-100 spring-transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <p className="text-xs text-slate-600 mb-4 leading-relaxed">
            اکنون می‌توانید متن آماده را در مدل هوش مصنوعی دلخواه خود قرار داده و گفتگو را فوراً آغاز کنید:
          </p>

          {/* Quick Launch Buttons */}
          <div className="space-y-2.5 mb-6">
            <a
              href={chatGptUrl}
              target="_blank"
              rel="noreferrer"
              className="pressable flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 border border-slate-200/90 hover:border-emerald-400 hover:bg-emerald-50/40 group spring-transition"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 border border-emerald-200 flex items-center justify-center text-emerald-700">
                  <Bot className="w-4 h-4" />
                </div>
                <div className="text-right">
                  <div className="text-xs font-bold text-slate-900 group-hover:text-emerald-700 spring-transition">اجرا در ChatGPT 4o</div>
                  <div className="text-[10px] text-slate-500">ارسال خودکار متن پرامپت به چت</div>
                </div>
              </div>
              <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 spring-transition" />
            </a>

            <a
              href={geminiUrl}
              target="_blank"
              rel="noreferrer"
              className="pressable flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 border border-slate-200/90 hover:border-blue-400 hover:bg-blue-50/40 group spring-transition"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-100 border border-blue-200 flex items-center justify-center text-blue-700">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div className="text-right">
                  <div className="text-xs font-bold text-slate-900 group-hover:text-blue-700 spring-transition">اجرا در Google Gemini</div>
                  <div className="text-[10px] text-slate-500">پشتیبانی همزمان از متن و فایل تصویری</div>
                </div>
              </div>
              <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-blue-600 spring-transition" />
            </a>

            <a
              href={claudeUrl}
              target="_blank"
              rel="noreferrer"
              className="pressable flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 border border-slate-200/90 hover:border-amber-400 hover:bg-amber-50/40 group spring-transition"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-100 border border-amber-200 flex items-center justify-center text-amber-700">
                  <MessageSquare className="w-4 h-4" />
                </div>
                <div className="text-right">
                  <div className="text-xs font-bold text-slate-900 group-hover:text-amber-700 spring-transition">اجرا در Claude 3.5 Sonnet</div>
                  <div className="text-[10px] text-slate-500">تحلیل عمیق، متون خلاقانه و کدنویسی دقیق</div>
                </div>
              </div>
              <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-amber-600 spring-transition" />
            </a>
          </div>

          {/* Bilingual Isolated Copied Text Snippet */}
          <div className="mb-4">
            <span className="text-xs font-bold text-slate-700 block mb-2">پیش‌نمایش متن کپی شده:</span>
            <pre className="bilingual-code text-[11px] bg-slate-100 p-3.5 rounded-2xl border border-slate-200 text-slate-800 max-h-36 overflow-y-auto leading-relaxed">
              {compiledText}
            </pre>
          </div>

          {/* Ad Placement Slot */}
          <div className="my-2">
            <AdBanner placementSlot="POST_COPY_DRAWER" />
          </div>
        </div>

        <button
          onClick={onClose}
          className="pressable w-full py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700 spring-transition border border-slate-200 mt-4"
        >
          بستن پنجره
        </button>
      </div>
    </div>
  );
}
