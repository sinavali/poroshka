'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { ChevronRight, ChevronLeft, Sparkles, Copy, Check, ArrowLeft, ArrowRight } from 'lucide-react';
import { PromptCardData } from './PromptCard';
import { ShareButton } from './ShareButton';
import { fetchFromApi } from '../lib/api-client';
import { showDynamicToast } from './DynamicIslandToast';

interface PromptSearchCarouselProps {
  query: string;
}

const MODALITY_LABELS: Record<string, { label: string; color: string; border: string }> = {
  image_edit: { label: 'ادیت عکس', color: 'bg-emerald-50 text-emerald-700', border: 'border-emerald-200/80' },
  text_to_image: { label: 'تولید تصویر', color: 'bg-purple-50 text-purple-700', border: 'border-purple-200/80' },
  text_writing: { label: 'تولید محتوا', color: 'bg-blue-50 text-blue-700', border: 'border-blue-200/80' },
  data_structuring: { label: 'اکسل و داده', color: 'bg-amber-50 text-amber-700', border: 'border-amber-200/80' },
  video_audio: { label: 'ویدیو و ریلز', color: 'bg-rose-50 text-rose-700', border: 'border-rose-200/80' },
  code_tech: { label: 'برنامه‌نویسی', color: 'bg-cyan-50 text-cyan-700', border: 'border-cyan-200/80' },
};

export function PromptSearchCarousel({ query }: PromptSearchCarouselProps) {
  const [prompts, setPrompts] = useState<PromptCardData[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);

  // Fetch top 12 closest matching prompts
  useEffect(() => {
    let active = true;
    const fetchClosest = async () => {
      setLoading(true);
      try {
        const endpoint = query.trim()
          ? `/api/v1/catalog/prompts?q=${encodeURIComponent(query.trim())}&limit=12`
          : `/api/v1/catalog/prompts?limit=12&sort=trending`;
        const data = await fetchFromApi<{ items?: PromptCardData[]; prompts?: PromptCardData[] } | PromptCardData[]>(endpoint);
        if (!active) return;
        const list = Array.isArray(data)
          ? data
          : (Array.isArray(data.items) ? data.items : (Array.isArray(data.prompts) ? data.prompts : []));
        setPrompts(list.slice(0, 12));
        setCurrentIndex(0);
      } catch {
        if (active) setPrompts([]);
      } finally {
        if (active) setLoading(false);
      }
    };

    const timer = setTimeout(fetchClosest, 350);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [query]);

  // Auto-slide 2-by-2 every 4.5 seconds
  useEffect(() => {
    if (isPaused || prompts.length <= 3) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => {
        const next = prev + 2;
        return next >= prompts.length ? 0 : next;
      });
    }, 4500);

    return () => clearInterval(interval);
  }, [isPaused, prompts.length]);

  const handleNext = () => {
    setCurrentIndex((prev) => {
      const next = prev + 2;
      return next >= prompts.length ? 0 : next;
    });
  };

  const handlePrev = () => {
    setCurrentIndex((prev) => {
      const prevIdx = prev - 2;
      return prevIdx < 0 ? Math.max(0, prompts.length - 2) : prevIdx;
    });
  };

  const handleQuickCopy = async (e: React.MouseEvent, prompt: PromptCardData) => {
    e.preventDefault();
    e.stopPropagation();

    try {
      const res = await fetchFromApi<{ compiled_text: string }>(`/api/v1/catalog/prompts/${prompt.slug}/copy`, {
        method: 'POST',
        body: JSON.stringify({ force_farsi_output: false })
      });
      await navigator.clipboard.writeText(res.compiled_text);
      setCopiedSlug(prompt.slug);
      showDynamicToast({
        title: 'پرامپت کپی شد',
        message: prompt.title_fa,
        type: 'copy'
      });
      setTimeout(() => setCopiedSlug(null), 2000);
    } catch {
      // Fallback
    }
  };

  if (!loading && prompts.length === 0) {
    return null;
  }

  // Calculate slide offset: 3 visible cards on desktop (33.333% each), 2 on tablet (50%), 1 on mobile (100%)
  const maxSlides = Math.ceil(prompts.length / 2);

  return (
    <div
      className="space-y-3 pt-2"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={() => setIsPaused(true)}
      onTouchEnd={() => setIsPaused(false)}
    >
      {/* Carousel Header Controls */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
          <h3 className="text-xs sm:text-sm font-bold text-slate-800">
            {query.trim() ? `نزدیک‌ترین پرامپت‌های آماده به ایده شما (${prompts.length} مورد)` : 'محبوب‌ترین پرامپت‌های پیشنهادی'}
          </h3>
        </div>

        {prompts.length > 3 && (
          <div className="flex items-center gap-1.5">
            <button
              onClick={handlePrev}
              className="w-7 h-7 rounded-full bg-white border border-slate-200 hover:bg-slate-50 flex items-center justify-center text-slate-600 hover:text-slate-900 shadow-xs spring-transition pressable"
              title="قبلی (۲ تا)"
              aria-label="اسلاید قبلی"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              onClick={handleNext}
              className="w-7 h-7 rounded-full bg-white border border-slate-200 hover:bg-slate-50 flex items-center justify-center text-slate-600 hover:text-slate-900 shadow-xs spring-transition pressable"
              title="بعدی (۲ تا)"
              aria-label="اسلاید بعدی"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Carousel Viewport */}
      <div className="relative overflow-hidden rounded-3xl p-1">
        {loading && prompts.length === 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-44 rounded-2xl bg-slate-100 animate-pulse p-4 space-y-2 border border-slate-200/60" />
            ))}
          </div>
        ) : (
          <div
            className="flex gap-4 transition-transform duration-500 ease-out"
            style={{
              transform: `translateX(${currentIndex * (100 / 3)}%)`,
            }}
          >
            {prompts.map((p) => (
              <div
                key={p.id}
                className="w-full sm:w-[calc(50%-8px)] md:w-[calc(33.333%-11px)] flex-shrink-0"
              >
                <div className="glass-panel h-full rounded-2xl p-4 border border-slate-200/90 hover:border-blue-500/50 hover:shadow-md flex flex-col justify-between group spring-transition">
                  <div>
                    <div className="flex items-center justify-between gap-1.5 mb-2">
                      <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${MODALITY_LABELS[p.modality]?.color || 'bg-blue-50 text-blue-700'} ${MODALITY_LABELS[p.modality]?.border || 'border-blue-200/60'}`}>
                        {MODALITY_LABELS[p.modality]?.label || p.modality}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono" dir="ltr">
                        {p.copy_count.toLocaleString('fa-IR')} کپی
                      </span>
                    </div>

                    <Link href={`/p/${p.slug}`}>
                      <h4 className="text-xs sm:text-sm font-bold text-slate-900 group-hover:text-blue-600 line-clamp-2 leading-snug mb-1 spring-transition">
                        {p.title_fa}
                      </h4>
                    </Link>

                    <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed mb-3">
                      {p.short_desc_fa}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-1.5">
                    <Link
                      href={`/p/${p.slug}`}
                      className="text-[11px] font-semibold text-slate-600 hover:text-blue-600 flex items-center gap-1 spring-transition"
                    >
                      <span>تنظیم</span>
                      <ArrowLeft className="w-3 h-3" />
                    </Link>

                    <div className="flex items-center gap-1">
                      <ShareButton slug={p.slug} title={p.title_fa} size="sm" />
                      <button
                        onClick={(e) => handleQuickCopy(e, p)}
                        className={`pressable flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-bold spring-transition ${
                          copiedSlug === p.slug
                            ? 'bg-emerald-600 text-white'
                            : 'bg-blue-600 hover:bg-blue-500 text-white shadow-xs'
                        }`}
                        title="کپی سریع"
                      >
                        {copiedSlug === p.slug ? (
                          <>
                            <Check className="w-3 h-3" />
                            <span>کپی شد</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>کپی</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pagination Indicator Dots */}
      {prompts.length > 3 && (
        <div className="flex items-center justify-center gap-1.5 pt-1">
          {Array.from({ length: Math.ceil(prompts.length / 2) }).map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentIndex(idx * 2)}
              className={`h-1.5 rounded-full spring-transition ${
                Math.floor(currentIndex / 2) === idx
                  ? 'w-6 bg-blue-600'
                  : 'w-1.5 bg-slate-300 hover:bg-slate-400'
              }`}
              aria-label={`اسلاید ${idx + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
