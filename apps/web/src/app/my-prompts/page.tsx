'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  History, Copy, Check, Sparkles, Search, Sliders, ArrowLeft, 
  Trash2, Tag, ChevronLeft, ChevronRight, Folder
} from 'lucide-react';
import { fetchFromApi } from '../../lib/api-client';
import { showDynamicToast } from '../../components/DynamicIslandToast';
import { ShareButton } from '../../components/ShareButton';
import { StyledSelect } from '../../components/StyledSelect';
import { AdPlacement } from '../../components/AdPlacement';

interface CopiedPromptItem {
  id: string;
  prompt_id: string;
  slug: string;
  title_fa: string;
  short_desc_fa: string;
  modality: string;
  category_id?: string;
  category_slug?: string;
  category_title_fa?: string;
  is_custom_category?: boolean;
  copy_count: number;
  custom_values_json: Record<string, string>;
  compiled_text?: string;
  last_copied_at: string;
}

interface CategoryOption {
  id: string;
  slug: string;
  title_fa: string;
}

interface PaginatedResponse {
  items: CopiedPromptItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

function MyPromptsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Initialize from URL search params for page refresh persistence
  const initialPage = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
  const initialSearch = searchParams.get('q') || '';
  const initialModality = searchParams.get('modality') || 'all';
  const initialCategory = searchParams.get('category') || 'all';

  const [items, setItems] = useState<CopiedPromptItem[]>([]);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [selectedModality, setSelectedModality] = useState(initialModality);
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const [page, setPage] = useState(initialPage);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);

  const updateUrlParams = useCallback((p: number, q: string, mod: string, cat: string) => {
    const params = new URLSearchParams();
    if (p > 1) params.set('page', String(p));
    if (q.trim()) params.set('q', q.trim());
    if (mod !== 'all') params.set('modality', mod);
    if (cat !== 'all') params.set('category', cat);
    const qs = params.toString();
    router.replace(`/my-prompts${qs ? `?${qs}` : ''}`);
  }, [router]);

  // Load available categories for re-organizing & filtering
  useEffect(() => {
    fetchFromApi<CategoryOption[]>('/api/v1/catalog/categories')
      .then((cats) => {
        if (Array.isArray(cats)) setCategories(cats);
      })
      .catch(() => {});
  }, []);

  // Server-side paginated fetch
  const loadHistory = useCallback(async (currentPage: number, search: string, modality: string, catId: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(currentPage));
      params.set('limit', '12');
      if (search.trim()) params.set('q', search.trim());
      if (modality !== 'all') params.set('modality', modality);
      if (catId !== 'all') params.set('category_id', catId);

      const res = await fetchFromApi<PaginatedResponse | CopiedPromptItem[]>(
        `/api/v1/identity/copied-prompts?${params.toString()}`
      );

      if (res && 'items' in res) {
        setItems(res.items || []);
        setTotalPages(res.totalPages || 1);
        setTotalCount(res.total || 0);
      } else if (Array.isArray(res)) {
        setItems(res);
        setTotalPages(1);
        setTotalCount(res.length);
      } else {
        setItems([]);
        setTotalPages(1);
        setTotalCount(0);
      }
    } catch {
      setItems([]);
      setTotalPages(1);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadHistory(page, searchQuery, selectedModality, selectedCategory);
    }, 250);
    return () => clearTimeout(timer);
  }, [page, searchQuery, selectedModality, selectedCategory, loadHistory]);

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

  // Requirement 1: Remove prompt from user copied history
  const handleRemoveItem = async (item: CopiedPromptItem) => {
    if (!confirm(`آیا می‌خواهید «${item.title_fa}» را از آرشیو پرامپت‌های استفاده‌شده خود حذف کنید؟`)) {
      return;
    }

    try {
      await fetchFromApi(`/api/v1/identity/copied-prompts/${item.id}`, {
        method: 'DELETE'
      });
      setItems((prev) => prev.filter((p) => p.id !== item.id));
      setTotalCount((prev) => Math.max(0, prev - 1));
      showDynamicToast({
        title: 'پرامپت از آرشیو شما حذف شد',
        type: 'success'
      });
    } catch (err: unknown) {
      showDynamicToast({
        title: 'خطا در حذف پرامپت',
        message: err instanceof Error ? err.message : '',
        type: 'error'
      });
    }
  };

  // Requirement 4: Change category of used prompt in user's own scope
  const handleUpdateCategory = async (itemId: string, newCategoryId: string) => {
    try {
      await fetchFromApi(`/api/v1/identity/copied-prompts/${itemId}`, {
        method: 'PATCH',
        body: JSON.stringify({ category_id: newCategoryId || null })
      });

      const matchedCat = categories.find((c) => c.id === newCategoryId);
      setItems((prev) =>
        prev.map((item) => {
          if (item.id === itemId) {
            return {
              ...item,
              category_id: newCategoryId || undefined,
              category_title_fa: newCategoryId ? (matchedCat?.title_fa || 'دسته‌بندی اختصاصی') : 'دسته‌بندی اصلی',
              is_custom_category: Boolean(newCategoryId)
            };
          }
          return item;
        })
      );

      setEditingCategoryId(null);
      showDynamicToast({
        title: newCategoryId ? 'دسته‌بندی اختصاصی تغییر یافت' : 'دسته‌بندی به حالت پیش‌فرض بازگشت',
        message: matchedCat?.title_fa || '',
        type: 'success'
      });
    } catch (err: unknown) {
      showDynamicToast({
        title: 'خطا در تغییر دسته‌بندی',
        message: err instanceof Error ? err.message : '',
        type: 'error'
      });
    }
  };

  const renderPromptCard = (item: CopiedPromptItem) => (
    <div
      key={item.id}
      className="glass-panel rounded-3xl p-6 border border-slate-200/90 hover:border-blue-500/40 hover:shadow-lg transition flex flex-col justify-between h-full group"
    >
      <div>
        {/* Counter & Modality Badges - Requirement 2: RTL Counter */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200" dir="rtl">
            <Copy className="w-3 h-3 text-blue-600" />
            <span>{item.copy_count.toLocaleString('fa-IR')} بار استفاده شده</span>
          </span>

          <span className="text-[10px] text-slate-400 font-medium">
            {new Date(item.last_copied_at).toLocaleDateString('fa-IR')}
          </span>
        </div>

        {/* Requirement 4: Category Badge with inline Scope Categorization */}
        <div className="mb-2.5">
          {editingCategoryId === item.id ? (
            <div className="space-y-1.5 bg-slate-50 p-2.5 rounded-2xl border border-slate-200">
              <span className="text-[10px] font-bold text-slate-600 block">انتخاب دسته‌بندی شخصی:</span>
              <StyledSelect
                size="sm"
                value={item.category_id || ''}
                onChange={(catId) => handleUpdateCategory(item.id, catId)}
                options={[
                  { value: '', label: 'دسته‌بندی اصلی پرامپت (پیش‌فرض)' },
                  ...categories.map((c) => ({ value: c.id, label: c.title_fa }))
                ]}
                placeholder="انتخاب دسته..."
              />
              <button
                type="button"
                onClick={() => setEditingCategoryId(null)}
                className="text-[10px] text-slate-400 hover:text-slate-600 underline block"
              >
                انصراف
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setEditingCategoryId(item.id)}
              title="کلیک برای تغییر دسته‌بندی اختصاصی در آرشیو شما"
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-semibold bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-600 border border-slate-200/80 transition"
            >
              <Tag className="w-3 h-3 text-slate-400" />
              <span>{item.category_title_fa || 'دسته‌بندی'}</span>
              {item.is_custom_category && (
                <span className="text-[9px] text-blue-600 font-normal mr-1">(شخصی)</span>
              )}
            </button>
          )}
        </div>

        {/* Requirement 3: Title ellipsis 2 lines with uniform fixed height for card alignment */}
        <h3 className="text-base font-bold text-slate-900 mb-1.5 line-clamp-2 h-12 leading-snug">
          {item.title_fa}
        </h3>

        <p className="text-xs text-slate-500 mb-4 line-clamp-2 h-10 leading-relaxed">
          {item.short_desc_fa || 'بدون توضیحات تکمیلی'}
        </p>
      </div>

      {/* Action Buttons: Requirement 1 Remove Button added */}
      <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2 mt-auto">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => handleRemoveItem(item)}
            title="حذف از آرشیو پرامپت‌های من"
            className="pressable p-1.5 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 border border-transparent hover:border-red-200 transition"
          >
            <Trash2 className="w-4 h-4" />
          </button>

          <Link
            href={item.slug ? `/p/${item.slug}` : '/'}
            className="pressable text-xs font-semibold text-slate-600 hover:text-blue-600 flex items-center gap-1"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>تنظیم مجدد</span>
          </Link>
        </div>

        <div className="flex items-center gap-1.5">
          {item.slug && (
            <ShareButton slug={item.slug} title={item.title_fa} size="sm" />
          )}
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
    </div>
  );

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
            تاریخچه پرامپت‌های کپی و اجرا شده با امکان سازماندهی دسته‌بندی شخصی و مدیریت آرشیو
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

      {/* Search & Modality Filters & Category Filter */}
      <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:max-w-md">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              const q = e.target.value;
              setSearchQuery(q);
              setPage(1);
              updateUrlParams(1, q, selectedModality, selectedCategory);
            }}
            placeholder="جستجو در عنوان یا متن پرامپت‌های استفاده‌شده..."
            className="w-full bg-white border border-slate-200/90 rounded-2xl py-2.5 pr-10 pl-4 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500/80 shadow-sm"
          />
          <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-3 pointer-events-none" />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 no-scrollbar">
          {/* Category Filter */}
          {categories.length > 0 && (
            <div className="w-44 flex-shrink-0">
              <StyledSelect
                size="sm"
                value={selectedCategory}
                onChange={(catId) => {
                  setSelectedCategory(catId);
                  setPage(1);
                  updateUrlParams(1, searchQuery, selectedModality, catId);
                }}
                options={[
                  { value: 'all', label: 'همه دسته‌ها' },
                  ...categories.map((c) => ({ value: c.id, label: c.title_fa }))
                ]}
              />
            </div>
          )}

          {/* Modality Chips */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {[
              { id: 'all', label: 'همه قالب‌ها' },
              { id: 'text_writing', label: 'محتوا' },
              { id: 'image_edit', label: 'ادیت عکس' },
              { id: 'text_to_image', label: 'تولید تصویر' },
              { id: 'data_structuring', label: 'اکسل' },
              { id: 'code_tech', label: 'کدنویسی' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setSelectedModality(tab.id);
                  setPage(1);
                  updateUrlParams(1, searchQuery, tab.id, selectedCategory);
                }}
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
      </div>

      {/* Loading Skeleton (only on initial load when items array is empty) */}
      {loading && items.length === 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div key={n} className="glass-panel rounded-3xl p-6 h-64 animate-pulse space-y-3">
              <div className="h-4 bg-slate-200 rounded-full w-1/3" />
              <div className="h-6 bg-slate-200 rounded-full w-3/4" />
              <div className="h-10 bg-slate-100 rounded-2xl" />
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && items.length === 0 && (
        <div className="glass-panel rounded-3xl p-12 text-center border border-slate-200/80 max-w-md mx-auto space-y-4">
          <History className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="text-base font-bold text-slate-800">هیچ پرامپت استفاده‌شده‌ای یافت نشد</h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            {searchQuery || selectedModality !== 'all' || selectedCategory !== 'all'
              ? 'با فیلترهای جستجوی انتخابی، پرامپتی پیدا نشد. فیلترها را ریست کنید.'
              : 'هنگامی که هر پرامپتی را از کاتالوگ یا صفحه جزئیات کپی کنید، به‌طور خودکار در این آرشیو ثبت می‌شود.'}
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

      {/* Used Prompts Grid (Kept mounted during pagination to preserve ads) */}
      {items.length > 0 && (
        <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 transition-opacity duration-200 ${loading ? 'opacity-60 pointer-events-none' : ''}`}>
          {items.slice(0, 2).map((item) => renderPromptCard(item))}

          {items.length > 2 && (
            <AdPlacement key="persistent-my-prompts-ad-1" slot="grid_card_1" />
          )}

          {items.slice(2, 5).map((item) => renderPromptCard(item))}

          {items.length > 5 && (
            <AdPlacement key="persistent-my-prompts-ad-2" slot="grid_card_2" />
          )}

          {items.slice(5).map((item) => renderPromptCard(item))}
        </div>
      )}

      {/* Requirement 7: Server-side Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-6 border-t border-slate-200/80 flex-wrap gap-4">
          <div className="text-xs text-slate-500">
            مجموع <span className="font-bold text-slate-800 font-mono">{totalCount.toLocaleString('fa-IR')}</span> پرامپت کپی‌شده • صفحه <span className="font-bold text-slate-800 font-mono">{page}</span> از <span className="font-bold text-slate-800 font-mono">{totalPages}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                const newPage = Math.max(1, page - 1);
                setPage(newPage);
                updateUrlParams(newPage, searchQuery, selectedModality, selectedCategory);
              }}
              disabled={page <= 1}
              className="pressable inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-4 h-4" />
              <span>صفحه قبل</span>
            </button>

            <button
              onClick={() => {
                const newPage = Math.min(totalPages, page + 1);
                setPage(newPage);
                updateUrlParams(newPage, searchQuery, selectedModality, selectedCategory);
              }}
              disabled={page >= totalPages}
              className="pressable inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <span>صفحه بعد</span>
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function MyPromptsPage() {
  return (
    <Suspense
      fallback={
        <div className="py-24 flex flex-col items-center justify-center space-y-4">
          <div className="w-10 h-10 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />
          <p className="text-xs text-slate-500 font-medium">در حال بارگذاری آرشیو پرامپت‌ها...</p>
        </div>
      }
    >
      <MyPromptsContent />
    </Suspense>
  );
}
