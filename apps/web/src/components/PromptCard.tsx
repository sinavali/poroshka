'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Copy, Check, ArrowLeft } from 'lucide-react';
import { fetchFromApi } from '../lib/api-client';
import { showDynamicToast } from './DynamicIslandToast';
import { ShareButton } from './ShareButton';

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
  image_edit: { label: 'ادیت عکس', color: 'bg-emerald-50 text-emerald-700', border: 'border-emerald-200' },
  text_to_image: { label: 'تولید تصویر', color: 'bg-purple-50 text-purple-700', border: 'border-purple-200' },
  text_writing: { label: 'تولید محتوا', color: 'bg-blue-50 text-blue-700', border: 'border-blue-200' },
  data_structuring: { label: 'اکسل و داده', color: 'bg-amber-50 text-amber-700', border: 'border-amber-200' },
  video_audio: { label: 'ویدیو و ریلز', color: 'bg-rose-50 text-rose-700', border: 'border-rose-200' },
  code_tech: { label: 'برنامه‌نویسی', color: 'bg-cyan-50 text-cyan-700', border: 'border-cyan-200' },
};

export function PromptCard({ prompt, onQuickCopied }: PromptCardProps) {
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);

  const modalityBadge = MODALITY_LABELS[prompt.modality] || {
    label: prompt.modality,
    color: 'bg-slate-100 text-slate-700',
    border: 'border-slate-200'
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
      showDynamicToast({
        title: 'پرامپت در کلیپ‌بورد کپی شد',
        message: prompt.title_fa,
        type: 'copy'
      });
      setTimeout(() => setCopied(false), 2200);

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
    <div className="glass-panel rounded-3xl overflow-hidden border border-slate-200/80 hover:border-blue-500/40 hover:shadow-xl hover:shadow-blue-500/5 hover:-translate-y-1 flex flex-col justify-between group spring-transition pressable-subtle">
      <Link href={`/p/${prompt.slug}`} className="block p-6 flex-1">
        {/* Top Badges */}
        <div className="flex items-center justify-between gap-2 mb-3.5">
          <span className={`text-[11px] font-bold px-3 py-1 rounded-full border ${modalityBadge.color} ${modalityBadge.border}`}>
            {modalityBadge.label}
          </span>
          <div className="flex items-center gap-1 text-[11px] text-slate-500 font-medium">
            <Copy className="w-3 h-3 text-slate-400" />
            <span dir="ltr">{prompt.copy_count.toLocaleString('fa-IR')} کپی</span>
          </div>
        </div>

        {/* Title */}
        <h3 className="text-base font-bold text-slate-900 group-hover:text-blue-600 spring-transition mb-2 leading-snug">
          {prompt.title_fa}
        </h3>

        {/* Short Description */}
        <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed mb-4">
          {prompt.short_desc_fa}
        </p>

        {/* Models supported */}
        {prompt.supported_models && prompt.supported_models.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            {prompt.supported_models.map((m) => (
              <span
                key={m}
                className="text-[10px] uppercase font-mono px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200"
              >
                {m}
              </span>
            ))}
          </div>
        )}
      </Link>

      {/* Card Action Footer */}
      <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/70 flex items-center justify-between gap-2">
        <Link
          href={`/p/${prompt.slug}`}
          className="text-xs font-semibold text-slate-500 hover:text-slate-900 flex items-center gap-1 group-hover:text-blue-600 spring-transition"
        >
          <span>تنظیم و کپی</span>
          <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-1 spring-transition" />
        </Link>

        <div className="flex items-center gap-1.5">
          <ShareButton slug={prompt.slug} title={prompt.title_fa} size="sm" />

          {/* 1-Click Quick Copy Button with Tactile Press */}
          <button
            onClick={handleQuickCopy}
            disabled={loading}
            className={`pressable flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold spring-transition ${
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
    </div>
  );
}
