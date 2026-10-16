'use client';

import React, { useState } from 'react';
import { Share2, Check, Send, MessageCircle, Copy, X } from 'lucide-react';
import { showDynamicToast } from './DynamicIslandToast';

interface ShareButtonProps {
  slug: string;
  title: string;
  size?: 'sm' | 'md';
}

export function ShareButton({ slug, title, size = 'sm' }: ShareButtonProps) {
  const [open, setOpen] = useState(false);

  const getUrl = () => {
    if (typeof window !== 'undefined') {
      return `${window.location.origin}/p/${slug}`;
    }
    return `https://promptjoo.ir/p/${slug}`;
  };

  const handleShare = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const url = getUrl();
    const shareData = {
      title: `${title} | پرامپت‌جو`,
      text: `پرامپت مهندسی‌شده «${title}» در پرامپت‌جو:`,
      url
    };

    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share(shareData);
        return;
      } catch {
        // User cancelled or share failed, fallback to dropdown modal
      }
    }

    setOpen(true);
  };

  const handleCopyLink = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const url = getUrl();
    await navigator.clipboard.writeText(url);
    showDynamicToast({
      title: 'لینک کپی شد',
      message: 'لینک پرامپت در کلیپ‌بورد ذخیره گردید',
      type: 'copy'
    });
    setOpen(false);
  };

  const shareTelegram = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const url = encodeURIComponent(getUrl());
    const text = encodeURIComponent(`پرامپت مهندسی‌شده «${title}»:\n`);
    window.open(`https://t.me/share/url?url=${url}&text=${text}`, '_blank');
    setOpen(false);
  };

  const shareBale = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const url = encodeURIComponent(getUrl());
    const text = encodeURIComponent(`پرامپت مهندسی‌شده «${title}»:\n${getUrl()}`);
    window.open(`https://ble.ir/share/url?url=${url}&text=${text}`, '_blank');
    setOpen(false);
  };

  const shareWhatsApp = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const text = encodeURIComponent(`پرامپت مهندسی‌شده «${title}» در پرامپت‌جو:\n${getUrl()}`);
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
    setOpen(false);
  };

  return (
    <div className="relative inline-block">
      <button
        onClick={handleShare}
        className={`pressable flex items-center justify-center rounded-xl bg-slate-100/80 hover:bg-slate-200/80 text-slate-600 hover:text-slate-900 border border-slate-200/70 spring-transition ${
          size === 'sm' ? 'w-8 h-8' : 'w-10 h-10'
        }`}
        title="اشتراک‌گذاری پرامپت"
        aria-label="اشتراک‌گذاری"
      >
        <Share2 className={size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4'} />
      </button>

      {/* Share Popover Modal */}
      {open && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[2px]"
            onClick={(e) => { e.stopPropagation(); setOpen(false); }}
          />
          <div
            className="absolute left-0 bottom-full mb-2 z-50 w-56 rounded-2xl glass-panel p-2 shadow-xl border border-slate-200/90 text-right animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-2 py-1 mb-1 border-b border-slate-100">
              <span className="text-[11px] font-bold text-slate-700">اشتراک‌گذاری پرامپت</span>
              <button
                onClick={() => setOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-0.5 rounded-lg"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-1">
              <button
                onClick={handleCopyLink}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs text-slate-700 hover:bg-slate-100 spring-transition"
              >
                <Copy className="w-3.5 h-3.5 text-slate-400" />
                <span>کپی لینک مستقیم</span>
              </button>

              <button
                onClick={shareTelegram}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs text-sky-600 hover:bg-sky-50 spring-transition"
              >
                <Send className="w-3.5 h-3.5" />
                <span>ارسال در تلگرام</span>
              </button>

              <button
                onClick={shareBale}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs text-emerald-600 hover:bg-emerald-50 spring-transition"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                <span>ارسال در بازوی بله</span>
              </button>

              <button
                onClick={shareWhatsApp}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs text-green-600 hover:bg-green-50 spring-transition"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                <span>ارسال در واتساپ</span>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
