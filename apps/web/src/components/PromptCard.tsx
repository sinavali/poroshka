'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Copy, Check, Sparkles, Eye, ArrowLeft } from 'lucide-react';
import { fetchFromApi } from '../lib/api-client.ts';

export interface PromptCardData {
  id: string;
  slug: string;
  modality: string;
  category_slug?: string;
  title_fa: string;
  short_desc_fa: string;
  preview_after_webp_url?: string;
  copy_count: number;
  view_count: number;
  slot_count: number;
  supported_models?: string[];
}

interface PromptCardProps {
  prompt: PromptCardData;
  onQuickCopied?: (prompt: PromptCardData, compiledText: string) => void;
}

const MODALITY_LABELS: Record<string, { label: string; color: string; border: string }> = {
  image_edit: { label: 'ادیت عکس', color: 'bg-emerald-500/10 text-emerald-400', border: 'border-emerald-500/20' },
  text_to_image: { label: 'تولید تصویر', color: 'bg-purple-500/10 text-purple-400', border: 'border-purple-500/20' },
  text_writing: { label: 'تولید محتوا', color: 'bg-blue-500/10 text-blue-400', border: 'border-blue-500/20' },
  data_structuring: { label: 'اکسل و داده', color: 'bg-amber-500/10 text-amber-400', border: 'border-amber-500/20' },
  video_audio: { label: 'ویدیو و ریلز', color: 'bg-rose-500/10 text-rose-400', border: 'border-rose-500/20' },
  code_tech: { label: 'برنامه‌نویسی', color: 'bg-cyan-500/10 text-cyan-400', border: 'border-cyan-500/20' },
};

export function PromptCard({ prompt, onQuickCopied }: PromptCardProps) {
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);

  const modalityBadge = MODALITY_LABELS[prompt.modality] || {
    label: prompt.modality,
    color: 'bg-slate-500/10 text-slate-400',
    border: 'border-slate-500/20'
  };

  const handleQuickCopy = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (loading) return;

    setLoading(true);
    try {
      const res = await fetchFromApi<{ compiled_text: string }>(`/api/v1/catalog/prompts/${prompt.slug}/copy`, {
        method: 'POST',
        body: JSON.stringify({ force_farsi_output: false })
      });

      await navigator.clipboard.writeText(res.compiled_text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);

      if (onQuickCopied) {
        onQuickCopied(prompt, res.compiled_text);
      }
    } catch {
      // Fallback
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-panel rounded-2xl overflow-hidden border border-white/10 hover:border-blue-500/40 hover:shadow-xl hover:shadow-blue-500/10 flex flex-col justify-between group spring-transition">
      <Link href={`/p/${prompt.slug}`} className="block p-5 flex-1">
        {/* Top Badges */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${modalityBadge.color} ${modalityBadge.border}`}>
            {modalityBadge.label}
          </span>
          <div className="flex items-center gap-1 text-[11px] text-gray-400 font-medium">
            <Copy className="w-3 h-3 text-gray-400" />
            <span dir="ltr">{prompt.copy_count.toLocaleString('fa-IR')} کپی</span>
          </div>
        </div>

        {/* Title */}
        <h3 className="text-base font-bold text-white group-hover:text-blue-400 spring-transition mb-2 leading-snug">
          {prompt.title_fa}
        </h3>

        {/* Short Description */}
        <p className="text-xs text-gray-400 line-clamp-2 leading-relaxed mb-4">
          {prompt.short_desc_fa}
        </p>

        {/* Models supported */}
        {prompt.supported_models && prompt.supported_models.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            {prompt.supported_models.map((m) => (
              <span
                key={m}
                className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-slate-800/80 text-gray-300 border border-white/5"
              >
                {m}
              </span>
            ))}
          </div>
        )}
      </Link>

      {/* Card Action Footer */}
      <div className="px-5 py-3 border-t border-white/5 bg-slate-900/40 flex items-center justify-between gap-2">
        <Link
          href={`/p/${prompt.slug}`}
          className="text-xs font-semibold text-gray-400 hover:text-white flex items-center gap-1 group-hover:text-blue-300 spring-transition"
        >
          <span>شخصی‌سازی و تنظیم</span>
          <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-1 spring-transition" />
        </Link>

        {/* 1-Click Quick Copy Button */}
        <button
          onClick={handleQuickCopy}
          disabled={loading}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold spring-transition ${
            copied
              ? 'bg-emerald-600 text-white'
              : 'bg-blue-600 hover:bg-blue-500 text-white shadow-sm shadow-blue-600/30'
          }`}
          title="کپی سریع متن پرامپت در حافظه"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5" />
              <span>کپی شد!</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span>کپی سریع</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
