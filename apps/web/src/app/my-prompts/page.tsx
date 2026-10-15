'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { History, Copy, Check, ExternalLink, Sparkles, Search, Sliders, ArrowLeft, Filter } from 'lucide-react';
import { fetchFromApi } from '../../lib/api-client';
import { showDynamicToast } from '../../components/DynamicIslandToast';

interface CopiedPromptItem {
  id: string;
  prompt_id: string;
  slug: string;
  title_fa: string;
  short_desc_fa: string;
  modality: string;
  category_title_fa?: string;
  copy_count: number;
  custom_values_json: Record<string, string>;
  compiled_text?: string;
  last_copied_at: string;
}

export default function MyPromptsPage() {
  const [items, setItems] = useState<CopiedPromptItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedModality, setSelectedModality] = useState('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const loadHistory = async () => {
    setLoading(true);
    try {
      const data = await fetchFromApi<CopiedPromptItem[]>('/api/v1/identity/copied-prompts');
      setItems(data || []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  const handleReCopy = async (item: CopiedPromptItem) => {
    const textToCopy = item.compiled_text || '';
    if (!textToCopy) return;

    await navigator.clipboard.writeText(textToCopy);
    setCopiedId(item.id);
    showDynamicToast({
      title: 'پرامپت مجدداً کپی شد',
      message: `${item.title_fa} (بار ${item.copy_count + 1})`,
      type: 'copy'
    });
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filteredItems = items.filter((item) => {
    const matchesSearch =
      !searchQuery.trim() ||
      item.title_fa.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.short_desc_fa.toLowerCase().includes(searchQuery.toLowerCase()) ||
      Object.values(item.custom_values_json || {}).some((v) =>
        String(v).toLowerCase().includes(searchQuery.toLowerCase())
      );
    const matchesModality = selectedModality === 'all' || item.modality === selectedModality;
    return matchesSearch && matchesModality;
  });

  return (
    <div className="space-y-8 animate-fade-in py-4">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200/80 pb-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-600 border border-blue-200/60 mb-2">
            <History className="w-3.5 h-3.5" />
            <span>آرشیو اختصاصی کاربر</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            پرامپت‌های استفاده‌شده من
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            تاریخچه تمام پرامپت‌هایی که کپی و اجرا کرده‌اید همراه با شمارنده دفعات استفاده و مقادیر ذخیره‌شده
          </p>
        </div>

        <Link
          href="/"
          className="pressable inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-white border border-slate-200/90 text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-sm"
        >
          <span>جستجو در کاتالوگ</span>
          <ArrowLeft className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Search & Modality Filters */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:max-w-md">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="جستجو در متن یا متغیرهای پرامپت‌های استفاده‌شده..."
            className="w-full bg-white border border-slate-200/90 rounded-2xl py-2.5 pr-10 pl-4 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500/80 shadow-sm"
          />
          <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-3 pointer-events-none" />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto max-w-full pb-1 no-scrollbar">
          {[
            { id: 'all', label: 'همه' },
            { id: 'text_writing', label: 'محتوا' },
            { id: 'image_edit', label: 'ادیت عکس' },
            { id: 'text_to_image', label: 'تولید تصویر' },
            { id: 'data_structuring', label: 'اکسل' },
            { id: 'code_tech', label: 'کدنویسی' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedModality(tab.id)}
              className={`pressable px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap spring-transition ${
                selectedModality === tab.id
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Loading Skeleton */}
      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3].map((n) => (
            <div key={n} className="glass-panel rounded-3xl p-6 h-56 animate-pulse space-y-3">
              <div className="h-4 bg-slate-200 rounded-full w-1/3" />
              <div className="h-6 bg-slate-200 rounded-full w-3/4" />
              <div className="h-16 bg-slate-100 rounded-2xl" />
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && filteredItems.length === 0 && (
        <div className="glass-panel rounded-3xl p-12 text-center border border-slate-200/80 max-w-md mx-auto space-y-4">
          <History className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="text-base font-bold text-slate-800">هیچ پرامپت استفاده‌شده‌ای ثبت نشده است</h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            هنگامی که هر پرامپتی را از کاتالوگ یا صفحه جزئیات کپی کنید، به‌طور خودکار در این آرشیو ثبت می‌شود تا هر زمان مایل بودید مجدداً آن را کپی کنید.
          </p>
          <Link
            href="/"
            className="pressable inline-flex items-center gap-1.5 px-5 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md shadow-blue-600/20"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>مشاهده کاتالوگ پرامپت‌ها</span>
          </Link>
        </div>
      )}

      {/* Used Prompts Grid */}
      {!loading && filteredItems.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className="glass-panel rounded-3xl p-6 border border-slate-200/90 hover:border-blue-500/40 hover:shadow-lg transition flex flex-col justify-between"
            >
              <div>
                {/* Counter & Modality Badges */}
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                    <Copy className="w-3 h-3 text-blue-600" />
                    <span dir="ltr">{item.copy_count.toLocaleString('fa-IR')} بار استفاده شده</span>
                  </span>

                  <span className="text-[10px] text-slate-400 font-medium">
                    {new Date(item.last_copied_at).toLocaleDateString('fa-IR')}
                  </span>
                </div>

                {/* Title */}
                <h3 className="text-base font-bold text-slate-900 mb-1.5 line-clamp-1">
                  {item.title_fa}
                </h3>
                <p className="text-xs text-slate-500 mb-4 line-clamp-2 leading-relaxed">
                  {item.short_desc_fa}
                </p>

                {/* Custom Slot Values Preview */}
                {item.custom_values_json && Object.keys(item.custom_values_json).length > 0 && (
                  <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/60 mb-4 space-y-1 text-[11px]">
                    <span className="font-bold text-slate-600 block mb-1">متغیرهای ذخیره‌شده شما:</span>
                    <div className="space-y-0.5">
                      {Object.entries(item.custom_values_json).slice(0, 3).map(([k, v]) => (
                        <div key={k} className="flex items-center justify-between text-slate-500">
                          <span className="font-mono text-slate-400">{k}:</span>
                          <span className="font-semibold text-slate-700 truncate max-w-[160px]">{String(v)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                <Link
                  href={`/p/${item.slug}`}
                  className="pressable text-xs font-semibold text-slate-600 hover:text-blue-600 flex items-center gap-1"
                >
                  <Sliders className="w-3.5 h-3.5" />
                  <span>تنظیم مجدد</span>
                </Link>

                <button
                  onClick={() => handleReCopy(item)}
                  className={`pressable flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold spring-transition ${
                    copiedId === item.id
                      ? 'bg-emerald-600 text-white'
                      : 'bg-blue-600 hover:bg-blue-500 text-white shadow-sm shadow-blue-600/20'
                  }`}
                >
                  {copiedId === item.id ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>کپی شد!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>کپی مجدد</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
