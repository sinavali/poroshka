'use client';

import React from 'react';
import { X, ExternalLink, Sparkles, CheckCircle2, MessageSquare, Bot } from 'lucide-react';
import { AdBanner } from './AdBanner';

interface PostCopyDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  compiledText: string;
  promptTitle: string;
}

export function PostCopyDrawer({ isOpen, onClose, compiledText, promptTitle }: PostCopyDrawerProps) {
  if (!isOpen) return null;

  const chatGptUrl = `https://chatgpt.com/?q=${encodeURIComponent(compiledText)}`;
  const claudeUrl = 'https://claude.ai/new';
  const geminiUrl = 'https://gemini.google.com/app';

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md h-full glass-dropdown border-r border-white/10 p-6 flex flex-col justify-between overflow-y-auto">
        <div>
          {/* Top Header */}
          <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-4">
            <div className="flex items-center gap-2 text-emerald-400">
              <CheckCircle2 className="w-5 h-5" />
              <span className="text-sm font-bold">پرامپت در کلیپ‌بورد کپی شد!</span>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-full text-gray-400 hover:text-white hover:bg-slate-800 spring-transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <p className="text-xs text-gray-400 mb-4 leading-relaxed">
            اکنون می‌توانید متن کپی‌شده را مستقیماً در هوش مصنوعی دلخواه خود قرار داده و گفتگو را شروع کنید:
          </p>

          {/* Quick Launch Buttons */}
          <div className="space-y-2.5 mb-6">
            <a
              href={chatGptUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-between p-3.5 rounded-xl bg-slate-900 border border-white/10 hover:border-emerald-500/50 hover:bg-slate-800/80 group spring-transition"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                  <Bot className="w-4 h-4" />
                </div>
                <div className="text-right">
                  <div className="text-xs font-bold text-white group-hover:text-emerald-400 spring-transition">اجرا مستقیم در ChatGPT</div>
                  <div className="text-[10px] text-gray-400">ارسال خودکار متن پرامپت به چت</div>
                </div>
              </div>
              <ExternalLink className="w-4 h-4 text-gray-500 group-hover:text-emerald-400 spring-transition" />
            </a>

            <a
              href={geminiUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-between p-3.5 rounded-xl bg-slate-900 border border-white/10 hover:border-blue-500/50 hover:bg-slate-800/80 group spring-transition"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div className="text-right">
                  <div className="text-xs font-bold text-white group-hover:text-blue-400 spring-transition">باز کردن Google Gemini</div>
                  <div className="text-[10px] text-gray-400">پشتیبانی چندحالته از تصاویر و متن</div>
                </div>
              </div>
              <ExternalLink className="w-4 h-4 text-gray-500 group-hover:text-blue-400 spring-transition" />
            </a>

            <a
              href={claudeUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-between p-3.5 rounded-xl bg-slate-900 border border-white/10 hover:border-amber-500/50 hover:bg-slate-800/80 group spring-transition"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-400">
                  <MessageSquare className="w-4 h-4" />
                </div>
                <div className="text-right">
                  <div className="text-xs font-bold text-white group-hover:text-amber-400 spring-transition">باز کردن Claude 3.5 Sonnet</div>
                  <div className="text-[10px] text-gray-400">بهترین تحلیل متن و کدنویسی</div>
                </div>
              </div>
              <ExternalLink className="w-4 h-4 text-gray-500 group-hover:text-amber-400 spring-transition" />
            </a>
          </div>

          {/* Bilingual Isolated Copied Text Snippet */}
          <div className="mb-6">
            <span className="text-xs font-bold text-gray-300 block mb-2">متن پرامپت کپی شده:</span>
            <pre className="bilingual-code text-[11px] bg-slate-950 p-3.5 rounded-xl border border-white/10 text-gray-300 max-h-40 overflow-y-auto">
              {compiledText}
            </pre>
          </div>

          {/* Ad Placement Slot */}
          <div className="my-4">
            <AdBanner placementSlot="POST_COPY_DRAWER" />
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white spring-transition"
        >
          بستن پنجره
        </button>
      </div>
    </div>
  );
}
