'use client';

import React, { useState, useEffect } from 'react';
import { PromptCard, PromptCardData } from '../components/PromptCard.tsx';
import { BlockForger } from '../components/BlockForger.tsx';
import { PostCopyDrawer } from '../components/PostCopyDrawer.tsx';
import { AdBanner } from '../components/AdBanner.tsx';
import { fetchFromApi } from '../lib/api-client.ts';
import { Sparkles, TrendingUp, Filter, AlertCircle, RefreshCw } from 'lucide-react';

const MODALITIES = [
  { id: 'all', label: 'همه پرامپت‌ها' },
  { id: 'image_edit', label: 'ادیت عکس' },
  { id: 'text_to_image', label: 'تولید تصویر' },
  { id: 'text_writing', label: 'تولید محتوا' },
  { id: 'data_structuring', label: 'اکسل و داده' },
  { id: 'video_audio', label: 'ویدیو و ریلز' },
  { id: 'code_tech', label: 'برنامه‌نویسی' },
];

export default function HomePage() {
  const [prompts, setPrompts] = useState<PromptCardData[]>([]);
  const [selectedModality, setSelectedModality] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Post copy drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [copiedPromptText, setCopiedPromptText] = useState('');
  const [copiedPromptTitle, setCopiedPromptTitle] = useState('');

  const loadPrompts = async () => {
    setLoading(true);
    setError(null);
    try {
      const searchParams = new URLSearchParams(window.location.search);
      const q = searchParams.get('q') || '';
      let url = '/api/v1/catalog/prompts?limit=30';
      if (selectedModality !== 'all') {
        url += `&modality=${selectedModality}`;
      }
      if (q) {
        url += `&q=${encodeURIComponent(q)}`;
      }

      const res = await fetchFromApi<{ items: PromptCardData[] }>(url);
      setPrompts(res.items || []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'خطا در برقراری ارتباط با سرور';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPrompts();
  }, [selectedModality]);

  const handleQuickCopied = (prompt: PromptCardData, compiledText: string) => {
    setCopiedPromptTitle(prompt.title_fa);
    setCopiedPromptText(compiledText);
    setDrawerOpen(true);
  };

  return (
    <div className="space-y-10 animate-fade-in">
      {/* Hero Header */}
      <section className="text-center py-8 sm:py-12 relative">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20 mb-6">
          <Sparkles className="w-3.5 h-3.5" />
          <span>پلتفرم ملی پرامپت‌های تست‌شده هوش مصنوعی در ایران</span>
        </div>

        <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight mb-4">
          بهترین نتایج را از <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">هوش مصنوعی</span> بگیرید
        </h1>
        <p className="text-sm sm:text-base text-gray-400 max-w-2xl mx-auto leading-relaxed">
          بدون نیاز به نوشتن دستورات طولانی انگلیسی، پرامپت دلخواه را انتخاب کنید، اطلاعات خود را جایگذاری کرده و با ۱ کلیک در ChatGPT، میدجورنی و جمینای اجرا کنید.
        </p>
      </section>

      {/* Zero-LLM Block Forger */}
      <BlockForger />

      {/* Catalog Filter Tabs */}
      <section className="space-y-6">
        <div className="flex items-center justify-between border-b border-white/10 pb-4 flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-400" />
            <h2 className="text-lg font-bold text-white">پرامپت‌های پرطرفدار و ترند</h2>
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 max-w-full">
            {MODALITIES.map((mod) => (
              <button
                key={mod.id}
                onClick={() => setSelectedModality(mod.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap spring-transition ${
                  selectedModality === mod.id
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                    : 'bg-slate-900/60 text-gray-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                {mod.label}
              </button>
            ))}
          </div>
        </div>

        {/* 4-State UI: Loading Skeleton */}
        {loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <div key={n} className="glass-panel rounded-2xl p-6 h-56 animate-pulse space-y-4">
                <div className="h-4 bg-slate-800 rounded w-1/4" />
                <div className="h-6 bg-slate-800 rounded w-3/4" />
                <div className="h-4 bg-slate-800 rounded w-full" />
                <div className="h-4 bg-slate-800 rounded w-2/3" />
              </div>
            ))}
          </div>
        )}

        {/* 4-State UI: Error State */}
        {!loading && error && (
          <div className="glass-panel rounded-2xl p-8 text-center border border-red-500/20 max-w-md mx-auto space-y-4">
            <AlertCircle className="w-10 h-10 text-red-400 mx-auto" />
            <h3 className="text-sm font-bold text-white">خطا در بارگذاری پرامپت‌ها</h3>
            <p className="text-xs text-gray-400">{error}</p>
            <button
              onClick={loadPrompts}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-white"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>تلاش مجدد</span>
            </button>
          </div>
        )}

        {/* 4-State UI: Empty State */}
        {!loading && !error && prompts.length === 0 && (
          <div className="glass-panel rounded-2xl p-12 text-center border border-white/10 max-w-md mx-auto space-y-4">
            <Filter className="w-10 h-10 text-gray-500 mx-auto" />
            <h3 className="text-sm font-bold text-white">هیچ پرامپتی یافت نشد</h3>
            <p className="text-xs text-gray-400">
              پرامپتی با فیلتر انتخابی موجود نیست. دسته‌بندی دیگری را امتحان کنید یا عبارت جستجو را تغییر دهید.
            </p>
          </div>
        )}

        {/* 4-State UI: Success State (Grid with Native Ad Card inserted at slot 3) */}
        {!loading && !error && prompts.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {prompts.map((prompt, idx) => {
              return (
                <React.Fragment key={prompt.id}>
                  {/* Insert FEED_NATIVE_CARD_3 after 2nd item */}
                  {idx === 2 && (
                    <AdBanner placementSlot="FEED_NATIVE_CARD_3" />
                  )}
                  <PromptCard
                    prompt={prompt}
                    onQuickCopied={handleQuickCopied}
                  />
                </React.Fragment>
              );
            })}
          </div>
        )}
      </section>

      {/* Post Copy Drawer */}
      <PostCopyDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        compiledText={copiedPromptText}
        promptTitle={copiedPromptTitle}
      />
    </div>
  );
}
