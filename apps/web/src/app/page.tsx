'use client';

import React, { useState, useEffect } from 'react';
import { PromptCard, PromptCardData } from '../components/PromptCard';
import { BlockForger } from '../components/BlockForger';
import { PostCopyDrawer } from '../components/PostCopyDrawer';
import { AdBanner } from '../components/AdBanner';
import { AdPlacement } from '../components/AdPlacement';
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
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Post copy drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [copiedPromptText, setCopiedPromptText] = useState('');
  const [copiedPromptTitle, setCopiedPromptTitle] = useState('');

  const loadPrompts = async (targetPage = page) => {
    setLoading(true);
    setError(null);
    try {
      const searchParams = new URLSearchParams(window.location.search);
      const q = searchParams.get('q') || '';
      setSearchQuery(q);

      let url = `/api/v1/catalog/prompts?page=${targetPage}&limit=12`;
      if (selectedModality !== 'all') {
        url += `&modality=${selectedModality}`;
      }
      if (selectedModel !== 'all') {
        url += `&model=${encodeURIComponent(selectedModel)}`;
      }
      if (q) {
        url += `&q=${encodeURIComponent(q)}`;
      }
      if (sortBy === 'popular') {
        url += '&sort=copies';
      } else if (sortBy === 'newest') {
        url += '&sort=newest';
      } else {
        url += '&sort=trending';
      }

      const res = await fetchFromApi<{
        items: PromptCardData[];
        total: number;
        page: number;
        limit: number;
        total_pages: number;
      }>(url);

      const items = res.items || [];

      setPrompts(items);
      setTotalPages(res.total_pages || 1);
      setTotalCount(res.total || items.length);
      setPage(res.page || targetPage);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'خطا در برقراری ارتباط با سرور';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPrompts(1);
  }, [selectedModality, selectedModel, sortBy]);

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages) return;
    setPage(newPage);
    loadPrompts(newPage);
    const catalogEl = document.getElementById('catalog-section');
    if (catalogEl) {
      catalogEl.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleClearQuery = () => {
    window.location.href = '/';
  };

  const handleQuickCopied = (prompt: PromptCardData, compiledText: string) => {
    setCopiedPromptTitle(prompt.title_fa);
    setCopiedPromptText(compiledText);
    setDrawerOpen(true);
  };

  return (
    <div className="space-y-10 animate-fade-in">
      {/* Apple-Grade Hero Header */}
      <section className="text-center py-6 sm:py-10 relative">
        <h1 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight leading-tight mb-4">
          بهترین خروجی را از{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600">
            هوش مصنوعی
          </span>{' '}
          بگیرید
        </h1>
        <p className="text-xs sm:text-sm text-slate-600 max-w-2xl mx-auto leading-relaxed font-normal">
          بدون نیاز به فرمول‌های پیچیده انگلیسی؛ پرامپت آماده را انتخاب، اطلاعات اختصاصی برندتان را درج و با ۱ کلیک در مدل دلخواه اجرا کنید.
        </p>

        {searchQuery && (
          <div className="mt-5 inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-100 border border-slate-200 text-xs text-slate-700 shadow-sm">
            <span>نتایج جستجو برای: <strong className="text-blue-700">{searchQuery}</strong></span>
            <button
              onClick={handleClearQuery}
              className="pressable p-0.5 rounded-full hover:bg-slate-200 text-slate-500 hover:text-slate-800"
              title="پاک کردن جستجو"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </section>

      {/* Unified Prompt Engine & Search Carousel */}
      <BlockForger initialQuery={searchQuery} />

      {/* Catalog & Filter Section */}
      <section id="catalog-section" className="space-y-6 pt-4">
        <div className="flex flex-col gap-4 border-b border-slate-200/80 pb-5">
          {/* Header & Sort Controls */}
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
                <TrendingUp className="w-4 h-4" />
              </div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                {searchQuery ? 'تمام پرامپت‌های کاتالوگ' : 'پرامپت‌های برگزیده و کاربردی'}
              </h2>
            </div>

            {/* Sort Segmented Control */}
            <div className="flex items-center gap-1 p-1 rounded-2xl bg-slate-100 border border-slate-200/80 text-xs">
              <button
                onClick={() => setSortBy('trending')}
                className={`pressable px-3 py-1 rounded-xl font-bold spring-transition ${
                  sortBy === 'trending' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                ترند
              </button>
              <button
                onClick={() => setSortBy('popular')}
                className={`pressable px-3 py-1 rounded-xl font-bold spring-transition ${
                  sortBy === 'popular' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                بیشترین کپی
              </button>
              <button
                onClick={() => setSortBy('newest')}
                className={`pressable px-3 py-1 rounded-xl font-bold spring-transition ${
                  sortBy === 'newest' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
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
                onClick={() => {
                  setSelectedModality(mod.id);
                  setPage(1);
                }}
                className={`pressable px-4 py-2 rounded-2xl text-xs font-bold whitespace-nowrap spring-transition ${
                  selectedModality === mod.id
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                    : 'bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 border border-slate-200/90 shadow-sm'
                }`}
              >
                {mod.label}
              </button>
            ))}
          </div>

          {/* AI Model Sub-Filters */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 max-w-full text-xs text-slate-500">
            <span className="flex-shrink-0 text-[11px] font-semibold text-slate-500">مدل هوش مصنوعی:</span>
            {AI_MODELS.map((model) => (
              <button
                key={model.id}
                onClick={() => {
                  setSelectedModel(model.id);
                  setPage(1);
                }}
                className={`pressable px-3 py-1 rounded-full text-[11px] font-medium whitespace-nowrap spring-transition ${
                  selectedModel === model.id
                    ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                    : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200/70 shadow-sm'
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
              <div key={n} className="glass-panel rounded-3xl p-6 h-56 animate-pulse space-y-4 border border-slate-200/80">
                <div className="h-4 bg-slate-200 rounded-full w-1/4" />
                <div className="h-6 bg-slate-200 rounded-full w-3/4" />
                <div className="h-4 bg-slate-200 rounded-full w-full" />
                <div className="h-4 bg-slate-200 rounded-full w-2/3" />
              </div>
            ))}
          </div>
        )}

        {/* 4-State UI: Error State */}
        {!loading && error && (
          <div className="glass-panel rounded-3xl p-8 text-center border border-red-200 bg-red-50/30 max-w-md mx-auto space-y-4">
            <AlertCircle className="w-10 h-10 text-red-500 mx-auto" />
            <h3 className="text-sm font-bold text-slate-900">خطا در بارگذاری پرامپت‌ها</h3>
            <p className="text-xs text-slate-500">{error}</p>
            <button
              onClick={() => loadPrompts(page)}
              className="pressable inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-bold bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 shadow-sm"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>تلاش مجدد</span>
            </button>
          </div>
        )}

        {/* 4-State UI: Empty State */}
        {!loading && !error && prompts.length === 0 && (
          <div className="glass-panel rounded-3xl p-12 text-center border border-slate-200 max-w-md mx-auto space-y-4">
            <Filter className="w-10 h-10 text-slate-400 mx-auto" />
            <h3 className="text-sm font-bold text-slate-900">پرامپتی با این مشخصات یافت نشد</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              فیلتر انتخابی یا عبارت جستجو را تغییر دهید یا از موتور بلوک‌چین بالا برای ساخت خودکار پرامپت استفاده کنید.
            </p>
            <button
              onClick={() => {
                setSelectedModality('all');
                setSelectedModel('all');
                handleClearQuery();
              }}
              className="pressable px-4 py-2 rounded-2xl bg-white text-xs font-bold text-slate-700 hover:bg-slate-50 border border-slate-200 shadow-sm"
            >
              نمایش همه پرامپت‌ها
            </button>
          </div>
        )}

        {/* 4-State UI: Success State Grid */}
        {!loading && !error && prompts.length > 0 && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {prompts.map((prompt, idx) => (
                <React.Fragment key={prompt.id}>
                  {idx === 2 && <AdPlacement slot="grid_card_1" />}
                  {idx === 5 && <AdPlacement slot="grid_card_2" />}
                  <PromptCard prompt={prompt} onQuickCopied={handleQuickCopied} />
                </React.Fragment>
              ))}
            </div>

            {/* Apple Light Mode Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-8 border-t border-slate-200/80">
                <div className="text-xs text-slate-500">
                  نمایش {((page - 1) * 12) + 1} تا {Math.min(page * 12, totalCount)} از {totalCount.toLocaleString('fa-IR')} پرامپت
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handlePageChange(page - 1)}
                    disabled={page <= 1}
                    className="pressable px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none shadow-sm"
                  >
                    قبلی
                  </button>

                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => {
                    if (totalPages > 7 && Math.abs(p - page) > 2 && p !== 1 && p !== totalPages) {
                      if (p === 2 || p === totalPages - 1) {
                        return <span key={p} className="px-1 text-slate-400 text-xs">...</span>;
                      }
                      return null;
                    }
                    return (
                      <button
                        key={p}
                        onClick={() => handlePageChange(p)}
                        className={`pressable w-8 h-8 rounded-xl text-xs font-bold spring-transition ${
                          p === page
                            ? 'bg-blue-600 text-white shadow-sm'
                            : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        {p.toLocaleString('fa-IR')}
                      </button>
                    );
                  })}

                  <button
                    onClick={() => handlePageChange(page + 1)}
                    disabled={page >= totalPages}
                    className="pressable px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none shadow-sm"
                  >
                    بعدی
                  </button>
                </div>
              </div>
            )}
          </>
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
