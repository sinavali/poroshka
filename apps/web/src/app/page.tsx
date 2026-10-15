'use client';

import React, { useState, useEffect } from 'react';
import { PromptCard, PromptCardData } from '../components/PromptCard';
import { BlockForger } from '../components/BlockForger';
import { PostCopyDrawer } from '../components/PostCopyDrawer';
import { AdBanner } from '../components/AdBanner';
import { fetchFromApi } from '../lib/api-client';
import { Sparkles, TrendingUp, Filter, AlertCircle, RefreshCw, X, SlidersHorizontal } from 'lucide-react';

const MODALITIES = [
  { id: 'all', label: 'همه پرامپت‌ها' },
  { id: 'image_edit', label: 'ادیت عکس' },
  { id: 'text_to_image', label: 'تولید تصویر' },
  { id: 'text_writing', label: 'تولید محتوا' },
  { id: 'data_structuring', label: 'اکسل و داده' },
  { id: 'video_audio', label: 'ویدیو و ریلز' },
  { id: 'code_tech', label: 'برنامه‌نویسی' },
];

const AI_MODELS = [
  { id: 'all', label: 'همه مدل‌ها' },
  { id: 'chatgpt', label: 'ChatGPT 4o' },
  { id: 'midjourney', label: 'Midjourney v6' },
  { id: 'claude', label: 'Claude 3.5' },
  { id: 'gemini', label: 'Google Gemini' },
  { id: 'deepseek', label: 'DeepSeek R1' },
];

export default function HomePage() {
  const [prompts, setPrompts] = useState<PromptCardData[]>([]);
  const [selectedModality, setSelectedModality] = useState('all');
  const [selectedModel, setSelectedModel] = useState('all');
  const [sortBy, setSortBy] = useState<'trending' | 'popular' | 'newest'>('trending');
  const [searchQuery, setSearchQuery] = useState('');
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
      setSearchQuery(q);

      let url = '/api/v1/catalog/prompts?limit=30';
      if (selectedModality !== 'all') {
        url += `&modality=${selectedModality}`;
      }
      if (q) {
        url += `&q=${encodeURIComponent(q)}`;
      }

      const res = await fetchFromApi<{ items: PromptCardData[] }>(url);
      let items = res.items || [];

      // Filter by AI model if specified
      if (selectedModel !== 'all') {
        items = items.filter(
          (p) => p.supported_models && p.supported_models.some((m) => m.toLowerCase().includes(selectedModel))
        );
      }

      // Client-side sort options
      if (sortBy === 'popular') {
        items = [...items].sort((a, b) => b.copy_count - a.copy_count);
      } else if (sortBy === 'newest') {
        items = [...items].reverse();
      }

      setPrompts(items);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'خطا در برقراری ارتباط با سرور';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPrompts();
  }, [selectedModality, selectedModel, sortBy]);

  const handleClearQuery = () => {
    window.location.href = '/';
  };

  const handleQuickCopied = (prompt: PromptCardData, compiledText: string) => {
    setCopiedPromptTitle(prompt.title_fa);
    setCopiedPromptText(compiledText);
    setDrawerOpen(true);
  };

  return (
    <div className="space-y-12 animate-fade-in">
      {/* Apple-Grade Hero Header */}
      <section className="text-center py-10 sm:py-16 relative">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20 mb-6 shadow-sm">
          <Sparkles className="w-3.5 h-3.5" />
          <span>مرجع تخصصی پرامپت‌های مهندسی‌شده هوش مصنوعی در ایران</span>
        </div>

        <h1 className="text-3xl sm:text-6xl font-black text-white tracking-tight leading-tight mb-5">
          بهترین خروجی را از{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-300 to-purple-400">
            هوش مصنوعی
          </span>{' '}
          بگیرید
        </h1>
        <p className="text-sm sm:text-base text-gray-300 max-w-2xl mx-auto leading-relaxed font-normal">
          بدون نیاز به فرمول‌های پیچیده انگلیسی؛ پرامپت آماده را انتخاب، اطلاعات اختصاصی برندتان را درج و با ۱ کلیک در مدل هوش مصنوعی دلخواه اجرا کنید.
        </p>

        {searchQuery && (
          <div className="mt-6 inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-800/80 border border-white/10 text-xs text-gray-300">
            <span>نتایج جستجو برای: <strong>{searchQuery}</strong></span>
            <button
              onClick={handleClearQuery}
              className="pressable p-0.5 rounded-full hover:bg-white/10 text-gray-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </section>

      {/* Zero-LLM Block Forger */}
      <BlockForger />

      {/* Catalog & Filter Section */}
      <section className="space-y-6">
        <div className="flex flex-col gap-4 border-b border-white/10 pb-5">
          {/* Header & Sort Controls */}
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                <TrendingUp className="w-4 h-4" />
              </div>
              <h2 className="text-lg font-bold text-white tracking-tight">پرامپت‌های برگزیده و کاربردی</h2>
            </div>

            {/* Sort Segmented Control */}
            <div className="flex items-center gap-1 p-1 rounded-2xl bg-white/5 border border-white/10 text-xs">
              <button
                onClick={() => setSortBy('trending')}
                className={`pressable px-3 py-1 rounded-xl font-bold spring-transition ${
                  sortBy === 'trending' ? 'bg-blue-600 text-white shadow' : 'text-gray-400 hover:text-white'
                }`}
              >
                ترند
              </button>
              <button
                onClick={() => setSortBy('popular')}
                className={`pressable px-3 py-1 rounded-xl font-bold spring-transition ${
                  sortBy === 'popular' ? 'bg-blue-600 text-white shadow' : 'text-gray-400 hover:text-white'
                }`}
              >
                بیشترین کپی
              </button>
              <button
                onClick={() => setSortBy('newest')}
                className={`pressable px-3 py-1 rounded-xl font-bold spring-transition ${
                  sortBy === 'newest' ? 'bg-blue-600 text-white shadow' : 'text-gray-400 hover:text-white'
                }`}
              >
                جدیدترین
              </button>
            </div>
          </div>

          {/* Modalities Segmented Bar */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full no-scrollbar">
            {MODALITIES.map((mod) => (
              <button
                key={mod.id}
                onClick={() => setSelectedModality(mod.id)}
                className={`pressable px-4 py-2 rounded-2xl text-xs font-bold whitespace-nowrap spring-transition ${
                  selectedModality === mod.id
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/25 border border-blue-400/30'
                    : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 border border-white/5'
                }`}
              >
                {mod.label}
              </button>
            ))}
          </div>

          {/* AI Model Sub-Filters */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 max-w-full text-xs text-gray-400">
            <span className="flex-shrink-0 text-[11px] font-semibold text-gray-500">مدل هوش مصنوعی:</span>
            {AI_MODELS.map((model) => (
              <button
                key={model.id}
                onClick={() => setSelectedModel(model.id)}
                className={`pressable px-3 py-1 rounded-full text-[11px] font-medium whitespace-nowrap spring-transition ${
                  selectedModel === model.id
                    ? 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/40'
                    : 'bg-white/5 text-gray-400 hover:text-gray-200 border border-transparent'
                }`}
              >
                {model.label}
              </button>
            ))}
          </div>
        </div>

        {/* 4-State UI: Loading Skeleton */}
        {loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <div key={n} className="glass-panel rounded-3xl p-6 h-56 animate-pulse space-y-4">
                <div className="h-4 bg-white/10 rounded-full w-1/4" />
                <div className="h-6 bg-white/10 rounded-full w-3/4" />
                <div className="h-4 bg-white/10 rounded-full w-full" />
                <div className="h-4 bg-white/10 rounded-full w-2/3" />
              </div>
            ))}
          </div>
        )}

        {/* 4-State UI: Error State */}
        {!loading && error && (
          <div className="glass-panel rounded-3xl p-8 text-center border border-red-500/20 max-w-md mx-auto space-y-4">
            <AlertCircle className="w-10 h-10 text-red-400 mx-auto" />
            <h3 className="text-sm font-bold text-white">خطا در بارگذاری پرامپت‌ها</h3>
            <p className="text-xs text-gray-400">{error}</p>
            <button
              onClick={loadPrompts}
              className="pressable inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-bold bg-white/10 hover:bg-white/15 text-white border border-white/10"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>تلاش مجدد</span>
            </button>
          </div>
        )}

        {/* 4-State UI: Empty State */}
        {!loading && !error && prompts.length === 0 && (
          <div className="glass-panel rounded-3xl p-12 text-center border border-white/10 max-w-md mx-auto space-y-4">
            <Filter className="w-10 h-10 text-gray-500 mx-auto" />
            <h3 className="text-sm font-bold text-white">پرامپتی با این مشخصات یافت نشد</h3>
            <p className="text-xs text-gray-400 leading-relaxed">
              فیلتر انتخابی یا عبارت جستجو را تغییر دهید یا از موتور بلوک‌چین برای ساخت خودکار پرامپت استفاده کنید.
            </p>
            <button
              onClick={() => {
                setSelectedModality('all');
                setSelectedModel('all');
                handleClearQuery();
              }}
              className="pressable px-4 py-2 rounded-2xl bg-white/10 text-xs font-bold text-white hover:bg-white/15 border border-white/10"
            >
              نمایش همه پرامپت‌ها
            </button>
          </div>
        )}

        {/* 4-State UI: Success State (Grid with Native Ad Card inserted at slot 3) */}
        {!loading && !error && prompts.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {prompts.map((prompt, idx) => (
              <React.Fragment key={prompt.id}>
                {idx === 2 && <AdBanner placementSlot="FEED_NATIVE_CARD_3" />}
                <PromptCard prompt={prompt} onQuickCopied={handleQuickCopied} />
              </React.Fragment>
            ))}
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
