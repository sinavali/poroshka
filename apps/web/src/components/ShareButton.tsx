'use client';

import React, { useState } from 'react';
import { Share2, Check } from 'lucide-react';
import { showDynamicToast } from './DynamicIslandToast';
import { fetchFromApi } from '../lib/api-client';

interface ShareButtonProps {
  slug: string;
  title: string;
  size?: 'sm' | 'md';
  showLabel?: boolean;
}

export function ShareButton({ slug, title, size = 'sm', showLabel = false }: ShareButtonProps) {
  const [copied, setCopied] = useState(false);

  const getUrl = () => {
    if (typeof window !== 'undefined') {
      return `${window.location.origin}/p/${slug}`;
    }
    return `https://promptjoo.ir/p/${slug}`;
  };

  const handleShare = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Asynchronously record share metric without blocking UI
    fetchFromApi(`/api/v1/catalog/prompts/${slug}/share`, { method: 'POST' }).catch(() => {});

    const url = getUrl();

    // On mobile devices supporting native share sheet
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share({
          title: `${title} | پرامپت‌جو`,
          text: `پرامپت مهندسی‌شده «${title}» در پرامپت‌جو:`,
          url
        });
        return;
      } catch {
        // Fallback to clipboard copy if user dismissed or cancelled share sheet
      }
    }

    // Direct clipboard copy with instant tactile feedback
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(url);
      }
      setCopied(true);
      showDynamicToast({
        title: 'لینک پرامپت کپی شد',
        message: 'لینک مستقیم جهت اشتراک‌گذاری در کلیپ‌بورد ذخیره شد.',
        type: 'copy'
      });
      setTimeout(() => setCopied(false), 2200);
    } catch {
      showDynamicToast({
        title: 'خطا در کپی',
        message: 'امکان دسترسی به کلیپ‌بورد مرورگر فراهم نشد.',
        type: 'error'
      });
    }
  };

  return (
    <button
      onClick={handleShare}
      className={`pressable flex items-center justify-center gap-1.5 rounded-xl spring-transition ${
        copied
          ? 'bg-emerald-50 text-emerald-600 border border-emerald-200 shadow-2xs'
          : 'bg-slate-100/90 hover:bg-slate-200/90 text-slate-600 hover:text-slate-900 border border-slate-200/80 shadow-2xs'
      } ${
        size === 'sm'
          ? showLabel ? 'px-2.5 py-1 text-xs' : 'w-8 h-8'
          : showLabel ? 'px-3.5 py-2 text-xs font-bold' : 'w-10 h-10'
      }`}
      title={copied ? 'لینک کپی شد!' : 'اشتراک‌گذاری پرامپت'}
      aria-label="اشتراک‌گذاری پرامپت"
    >
      {copied ? (
        <Check className={size === 'sm' ? 'w-3.5 h-3.5 text-emerald-600' : 'w-4 h-4 text-emerald-600'} />
      ) : (
        <Share2 className={size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4'} />
      )}
      {showLabel && (
        <span className={copied ? 'text-emerald-700' : ''}>
          {copied ? 'کپی شد' : 'اشتراک‌گذاری'}
        </span>
      )}
    </button>
  );
}
