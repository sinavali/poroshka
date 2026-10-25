'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  Search, Filter, Plus, Trash2, Eye, EyeOff, CheckSquare, Square, 
  ChevronLeft, ChevronRight, Sliders, ExternalLink, RefreshCw, Sparkles, AlertCircle, Tag
} from 'lucide-react';
import { fetchFromApi } from '../lib/api-client';
import { showDynamicToast } from './DynamicIslandToast';
import { StyledSelect } from './StyledSelect';
import { AdminPromptCreatorModal } from './AdminPromptCreatorModal';
import { AdminPromptTagsModal } from './AdminPromptTagsModal';
import { AdminParametersModal } from './AdminParametersModal';

export interface PromptParameter {
  slot_key: string;
  label_fa: string;
  input_type: string;
  is_required: boolean;
}

export interface AdminPromptItem {
  id: string;
  slug: string;
  title_fa: string;
  short_desc_fa: string;
  modality: string;
  category_id: string;
  category_title: string;
  category_slug: string;
  supported_models?: string[];
  copy_count: number;
  view_count: number;
  share_count: number;
  slot_count: number;
  parameters_count: number;
  parameters_summary: PromptParameter[];
  is_published: boolean;
  is_admin_locked: boolean;
  created_at: string;
  updated_at: string;
}

interface CategoryOption {
  id: string;
  slug: string;
  title_fa: string;
}

interface PromptsApiResponse {
  prompts: AdminPromptItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

const MODALITY_LABELS: Record<string, string> = {
  text_writing: 'تولید محتوا',
  image_edit: 'ادیت عکس',
  text_to_image: 'تولید تصویر',
  data_structuring: 'اکسل و داده',
  code_tech: 'برنامه‌نویسی',
  video_audio: 'ویدیو و ریلز'
};

export function AdminPromptsView() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Initialize from URL search params for page refresh persistence
  const initialPage = Math.max(1, parseInt(searchParams.get('prompt_page') || '1', 10));
  const initialSearch = searchParams.get('prompt_q') || '';
  const initialCategory = searchParams.get('prompt_cat') || 'all';
  const initialModality = searchParams.get('prompt_mod') || 'all';
  const initialTag = searchParams.get('prompt_tag') || 'all';
  const initialStatus = searchParams.get('prompt_status') || 'all';
  const initialSort = searchParams.get('prompt_sort') || 'created_at';
  const initialOrder = (searchParams.get('prompt_order') || 'desc') as 'asc' | 'desc';

  const [prompts, setPrompts] = useState<AdminPromptItem[]>([]);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreatorOpen, setIsCreatorOpen] = useState(false);

  // Filters & Pagination State
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const [selectedModality, setSelectedModality] = useState(initialModality);
  const [selectedTag, setSelectedTag] = useState(initialTag);
  const [selectedStatus, setSelectedStatus] = useState(initialStatus);
  const [sortBy, setSortBy] = useState(initialSort);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>(initialOrder);
  const [page, setPage] = useState(initialPage);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Selection & Bulk Actions
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [activeParametersModalPrompt, setActiveParametersModalPrompt] = useState<AdminPromptItem | null>(null);
  const [tagModalPrompt, setTagModalPrompt] = useState<AdminPromptItem | null>(null);
  const [isBulkTagModalOpen, setIsBulkTagModalOpen] = useState(false);

  // Sync state to URL search params
  const updateUrlParams = useCallback((p: number, q: string, cat: string, mod: string, tg: string, st: string, sBy: string, sOrd: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', 'prompts');
    if (p > 1) params.set('prompt_page', String(p));
    else params.delete('prompt_page');

    if (q.trim()) params.set('prompt_q', q.trim());
    else params.delete('prompt_q');

    if (cat !== 'all') params.set('prompt_cat', cat);
    else params.delete('prompt_cat');

    if (mod !== 'all') params.set('prompt_mod', mod);
    else params.delete('prompt_mod');

    if (tg !== 'all') params.set('prompt_tag', tg);
    else params.delete('prompt_tag');

    if (st !== 'all') params.set('prompt_status', st);
    else params.delete('prompt_status');

    if (sBy !== 'created_at') params.set('prompt_sort', sBy);
    else params.delete('prompt_sort');

    if (sOrd !== 'desc') params.set('prompt_order', sOrd);
    else params.delete('prompt_order');

    router.replace(`/admin?${params.toString()}`);
  }, [router, searchParams]);

  // Synchronize state when URL search params change (e.g. browser back/forward or reload)
  useEffect(() => {
    const p = Math.max(1, parseInt(searchParams.get('prompt_page') || '1', 10));
    const q = searchParams.get('prompt_q') || '';
    const cat = searchParams.get('prompt_cat') || 'all';
    const mod = searchParams.get('prompt_mod') || 'all';
    const tg = searchParams.get('prompt_tag') || 'all';
    const st = searchParams.get('prompt_status') || 'all';
    const sBy = searchParams.get('prompt_sort') || 'created_at';
    const sOrd = (searchParams.get('prompt_order') || 'desc') as 'asc' | 'desc';

    setPage(p);
    setSearchQuery(q);
    setSelectedCategory(cat);
    setSelectedModality(mod);
    setSelectedTag(tg);
    setSelectedStatus(st);
    setSortBy(sBy);
    setSortOrder(sOrd);
  }, [searchParams]);

  // Load Categories for filter
  useEffect(() => {
    fetchFromApi<CategoryOption[]>('/api/v1/catalog/categories')
      .then((res) => {
        if (Array.isArray(res)) setCategories(res);
      })
      .catch(() => {});
  }, []);

  // Fetch prompts list from API
  const loadPrompts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', '15');
      if (searchQuery.trim()) params.set('q', searchQuery.trim());
      if (selectedCategory !== 'all') params.set('category_id', selectedCategory);
      if (selectedModality !== 'all') params.set('modality', selectedModality);
      if (selectedTag !== 'all') params.set('tag', selectedTag);
      if (selectedStatus !== 'all') params.set('status', selectedStatus);
      params.set('sort_by', sortBy);
      params.set('sort_order', sortOrder);

      const res = await fetchFromApi<PromptsApiResponse>(`/api/v1/admin/prompts?${params.toString()}`);
      setPrompts(res.prompts || []);
      setTotalPages(res.totalPages || 1);
      setTotalCount(res.total || 0);
      setSelectedIds([]);
    } catch (err: unknown) {
      showDynamicToast({
        title: 'خطا در بارگذاری پرامپت‌ها',
        message: err instanceof Error ? err.message : '',
        type: 'error'
      });
      setPrompts([]);
    } finally {
      setLoading(false);
    }
  }, [page, searchQuery, selectedCategory, selectedModality, selectedTag, selectedStatus, sortBy, sortOrder]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadPrompts();
    }, 200);
    return () => clearTimeout(timer);
  }, [loadPrompts]);

  // Toggle Publish Status
  const handleTogglePublish = async (prompt: AdminPromptItem) => {
    const newStatus = !prompt.is_published;
    try {
      await fetchFromApi(`/api/v1/admin/prompts/${prompt.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ is_published: newStatus })
      });
      setPrompts((prev) =>
        prev.map((p) => (p.id === prompt.id ? { ...p, is_published: newStatus } : p))
      );
      showDynamicToast({
        title: newStatus ? 'پرامپت فعال شد' : 'پرامپت غیرفعال شد',
        message: prompt.title_fa,
        type: newStatus ? 'success' : 'error'
      });
    } catch (err: unknown) {
      showDynamicToast({
        title: 'خطا در تغییر وضعیت',
        message: err instanceof Error ? err.message : '',
        type: 'error'
      });
    }
  };

  // Delete Single Prompt
  const handleDeletePrompt = async (prompt: AdminPromptItem) => {
    if (!confirm(`آیا از حذف کامل پرامپت «${prompt.title_fa}» مطمئن هستید؟ این عملیات غیرقابل بازگشت است.`)) {
      return;
    }

    try {
      await fetchFromApi(`/api/v1/admin/prompts/${prompt.id}`, {
        method: 'DELETE'
      });
      showDynamicToast({ title: 'پرامپت با موفقیت حذف شد', type: 'success' });
      loadPrompts();
    } catch (err: unknown) {
      showDynamicToast({
        title: 'خطا در حذف پرامپت',
        message: err instanceof Error ? err.message : '',
        type: 'error'
      });
    }
  };

  // Bulk Actions
  const handleBulkAction = async (action: 'enable' | 'disable' | 'delete') => {
    if (selectedIds.length === 0) return;

    if (action === 'delete') {
      if (!confirm(`آیا از حذف ${selectedIds.length} پرامپت انتخاب‌شده مطمئن هستید؟`)) return;
    }

    try {
      await fetchFromApi('/api/v1/admin/prompts/bulk', {
        method: 'POST',
        body: JSON.stringify({ action, ids: selectedIds })
      });
      showDynamicToast({
        title: 'عملیات گروهی انجام شد',
        message: `${selectedIds.length} پرامپت به‌روزرسانی شدند`,
        type: 'success'
      });
      loadPrompts();
    } catch (err: unknown) {
      showDynamicToast({
        title: 'خطا در عملیات گروهی',
        message: err instanceof Error ? err.message : '',
        type: 'error'
      });
    }
  };

  // Select all on page toggle
  const toggleSelectAll = () => {
    if (selectedIds.length === prompts.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(prompts.map((p) => p.id));
    }
  };

  const toggleSelectPrompt = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200/80 pb-5">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <span>مدیریت پرامپت‌ها</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 font-mono">
              {totalCount.toLocaleString('fa-IR')}
            </span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            مشاهده، جستجو، فیلتراسیون، تغییر وضعیت، حذف و اعمال عملیات گروهی روی پرامپت‌های پلتفرم
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => loadPrompts()}
            className="pressable p-2.5 rounded-2xl bg-white border border-slate-200/90 text-slate-600 hover:bg-slate-50 shadow-xs"
            title="به‌روزرسانی جدول"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-blue-600' : ''}`} />
          </button>

          <button
            onClick={() => setIsCreatorOpen(true)}
            className="pressable inline-flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md shadow-blue-600/20"
          >
            <Plus className="w-4 h-4" />
            <span>افزودن پرامپت جدید</span>
          </button>
        </div>
      </div>

      {/* Filters & Search Controls */}
      <div className="glass-panel p-4 rounded-3xl border border-slate-200/80 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
          {/* Search Input */}
          <div className="lg:col-span-2 relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                const q = e.target.value;
                setSearchQuery(q);
                setPage(1);
                updateUrlParams(1, q, selectedCategory, selectedModality, selectedTag, selectedStatus, sortBy, sortOrder);
              }}
              placeholder="جستجو در عنوان، شناسه (Slug) یا کلیدواژه‌ها..."
              className="w-full bg-white border border-slate-200 rounded-2xl py-2.5 pr-10 pl-4 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 shadow-xs"
            />
            <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-3 pointer-events-none" />
          </div>

          {/* Category Filter */}
          <div>
            <StyledSelect
              size="md"
              value={selectedCategory}
              onChange={(val) => {
                setSelectedCategory(val);
                setPage(1);
                updateUrlParams(1, searchQuery, val, selectedModality, selectedTag, selectedStatus, sortBy, sortOrder);
              }}
              options={[
                { value: 'all', label: 'همه دسته‌ها' },
                ...categories.map((c) => ({ value: c.id, label: c.title_fa }))
              ]}
              placeholder="دسته‌بندی..."
            />
          </div>

          {/* Modality Filter */}
          <div>
            <StyledSelect
              size="md"
              value={selectedModality}
              onChange={(val) => {
                setSelectedModality(val);
                setPage(1);
                updateUrlParams(1, searchQuery, selectedCategory, val, selectedTag, selectedStatus, sortBy, sortOrder);
              }}
              options={[
                { value: 'all', label: 'همه مدالیته‌ها' },
                { value: 'text_writing', label: 'تولید محتوا' },
                { value: 'image_edit', label: 'ادیت عکس' },
                { value: 'text_to_image', label: 'تولید تصویر' },
                { value: 'data_structuring', label: 'اکسل و داده' },
                { value: 'code_tech', label: 'برنامه‌نویسی' },
                { value: 'video_audio', label: 'ویدیو و ریلز' }
              ]}
              placeholder="مدالیته..."
            />
          </div>

          {/* AI Model Tag Filter */}
          <div>
            <StyledSelect
              size="md"
              value={selectedTag}
              onChange={(val) => {
                setSelectedTag(val);
                setPage(1);
                updateUrlParams(1, searchQuery, selectedCategory, selectedModality, val, selectedStatus, sortBy, sortOrder);
              }}
              options={[
                { value: 'all', label: 'همه مدل‌ها' },
                { value: 'chatgpt', label: 'ChatGPT' },
                { value: 'midjourney', label: 'Midjourney' },
                { value: 'claude', label: 'Claude' },
                { value: 'gemini', label: 'Gemini' },
                { value: 'deepseek', label: 'DeepSeek' }
              ]}
              placeholder="مدل هوش مصنوعی..."
            />
          </div>

          {/* Status Filter */}
          <div>
            <StyledSelect
              size="md"
              value={selectedStatus}
              onChange={(val) => {
                setSelectedStatus(val);
                setPage(1);
                updateUrlParams(1, searchQuery, selectedCategory, selectedModality, selectedTag, val, sortBy, sortOrder);
              }}
              options={[
                { value: 'all', label: 'همه وضعیت‌ها' },
                { value: 'published', label: 'فعال (منتشرشده)' },
                { value: 'disabled', label: 'غیرفعال (مسدود)' }
              ]}
              placeholder="وضعیت..."
            />
          </div>
        </div>

        {/* Sorting Controls */}
        <div className="flex items-center justify-between border-t border-slate-100 pt-3 flex-wrap gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-500 font-medium">مرتب‌سازی بر اساس:</span>
            <div className="w-44">
              <StyledSelect
                size="sm"
                value={sortBy}
                onChange={(val) => {
                  setSortBy(val);
                  setPage(1);
                  updateUrlParams(1, searchQuery, selectedCategory, selectedModality, selectedTag, selectedStatus, val, sortOrder);
                }}
                options={[
                  { value: 'created_at', label: 'جدیدترین تاریخ' },
                  { value: 'copy_count', label: 'بیشترین استفاده (کپی)' },
                  { value: 'view_count', label: 'بیشترین بازدید' },
                  { value: 'share_count', label: 'بیشترین اشتراک‌گذاری' },
                  { value: 'slot_count', label: 'تعداد پارامترها' },
                  { value: 'title_fa', label: 'حروف الفبا' }
                ]}
              />
            </div>

            <button
              onClick={() => {
                const nextOrder = sortOrder === 'asc' ? 'desc' : 'asc';
                setSortOrder(nextOrder);
                updateUrlParams(page, searchQuery, selectedCategory, selectedModality, selectedTag, selectedStatus, sortBy, nextOrder);
              }}
              className="pressable px-3 py-1.5 rounded-xl border border-slate-200 bg-white font-bold text-slate-700 hover:bg-slate-50"
            >
              {sortOrder === 'asc' ? 'صعودی (ASC)' : 'نزولی (DESC)'}
            </button>
          </div>

          {/* Bulk Action Bar */}
          {selectedIds.length > 0 && (
            <div className="flex items-center gap-2 bg-blue-50/80 border border-blue-200/70 px-3 py-1.5 rounded-2xl animate-fade-in flex-wrap">
              <span className="text-xs font-bold text-blue-800">
                {selectedIds.length} پرامپت انتخاب‌شده:
              </span>
              <button
                onClick={() => setIsBulkTagModalOpen(true)}
                className="pressable px-2.5 py-1 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-[11px] flex items-center gap-1 shadow-xs"
              >
                <Tag className="w-3 h-3" />
                <span>برچسب‌گذاری مدل‌ها</span>
              </button>
              <button
                onClick={() => handleBulkAction('enable')}
                className="pressable px-2.5 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px]"
              >
                فعال‌سازی
              </button>
              <button
                onClick={() => handleBulkAction('disable')}
                className="pressable px-2.5 py-1 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-[11px]"
              >
                غیرفعال‌سازی
              </button>
              <button
                onClick={() => handleBulkAction('delete')}
                className="pressable px-2.5 py-1 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-[11px]"
              >
                حذف گروهی
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Prompts Table */}
      <div className="glass-panel rounded-3xl border border-slate-200/90 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
              <tr>
                <th className="p-3.5 w-10 text-center">
                  <button onClick={toggleSelectAll} className="pressable text-slate-400 hover:text-slate-800">
                    {selectedIds.length > 0 && selectedIds.length === prompts.length ? (
                      <CheckSquare className="w-4 h-4 text-blue-600" />
                    ) : (
                      <Square className="w-4 h-4" />
                    )}
                  </button>
                </th>
                <th className="p-3.5">عنوان و شناسه پرامپت</th>
                <th className="p-3.5">دسته‌بندی و مدالیته</th>
                <th className="p-3.5">مدل‌ها (برچسب‌ها)</th>
                <th className="p-3.5 text-center">آمار استفاده</th>
                <th className="p-3.5 text-center">پارامترها</th>
                <th className="p-3.5 text-center">وضعیت</th>
                <th className="p-3.5 text-left pl-6">عملیات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    <span>در حال بارگذاری لیست پرامپت‌ها...</span>
                  </td>
                </tr>
              ) : prompts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    پرامپتی با فیلترهای مشخص‌شده یافت نشد.
                  </td>
                </tr>
              ) : (
                prompts.map((prompt) => {
                  const isSelected = selectedIds.includes(prompt.id);
                  return (
                    <tr
                      key={prompt.id}
                      className={`hover:bg-slate-50/80 transition ${isSelected ? 'bg-blue-50/40' : ''}`}
                    >
                      {/* Checkbox */}
                      <td className="p-3.5 text-center">
                        <button
                          onClick={() => toggleSelectPrompt(prompt.id)}
                          className="pressable text-slate-400 hover:text-slate-800"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-blue-600" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                        </button>
                      </td>

                      {/* Title & Slug */}
                      <td className="p-3.5 max-w-xs">
                        <Link
                          href={`/p/${prompt.slug}`}
                          target="_blank"
                          className="font-bold text-slate-900 hover:text-blue-600 line-clamp-1 block mb-0.5"
                        >
                          {prompt.title_fa}
                        </Link>
                        <span className="font-mono text-[10px] text-slate-400 truncate block" dir="ltr">
                          /p/{prompt.slug}
                        </span>
                      </td>

                      {/* Category & Modality */}
                      <td className="p-3.5 whitespace-nowrap">
                        <span className="font-semibold text-slate-800 block text-[11px]">
                          {prompt.category_title}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {MODALITY_LABELS[prompt.modality] || prompt.modality}
                        </span>
                      </td>

                      {/* Models / Tags */}
                      <td className="p-3.5 max-w-[140px]">
                        <div className="flex flex-wrap items-center gap-1">
                          {prompt.supported_models && prompt.supported_models.length > 0 ? (
                            prompt.supported_models.map((m) => (
                              <span
                                key={m}
                                className="text-[9px] font-mono px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200 uppercase"
                              >
                                {m}
                              </span>
                            ))
                          ) : (
                            <span className="text-[10px] text-slate-400">بدون مدل</span>
                          )}
                        </div>
                      </td>

                      {/* Usage Metrics */}
                      <td className="p-3.5 text-center whitespace-nowrap">
                        <div className="inline-flex items-center gap-2 text-[11px] font-mono" dir="rtl">
                          <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 font-bold" title="دفعات کپی">
                            {prompt.copy_count.toLocaleString('fa-IR')} کپی
                          </span>
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600" title="دفعات بازدید">
                            {prompt.view_count.toLocaleString('fa-IR')} بازدید
                          </span>
                        </div>
                      </td>

                      {/* Parameters Count & Inspector */}
                      <td className="p-3.5 text-center whitespace-nowrap">
                        <button
                          onClick={() => setActiveParametersModalPrompt(prompt)}
                          className="pressable inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-bold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200/80 transition"
                          title="مشاهده جزئیات پارامترهای پرامپت"
                        >
                          <Sliders className="w-3 h-3" />
                          <span>{prompt.parameters_count} پارامتر</span>
                        </button>
                      </td>

                      {/* Published Status Badge */}
                      <td className="p-3.5 text-center whitespace-nowrap">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                            prompt.is_published
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-red-50 text-red-700 border border-red-200'
                          }`}
                        >
                          {prompt.is_published ? 'منتشرشده' : 'غیرفعال'}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="p-3.5 text-left pl-6 whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Edit Tags */}
                          <button
                            onClick={() => setTagModalPrompt(prompt)}
                            title="مدیریت برچسب‌های مدل هوش مصنوعی"
                            className="pressable p-1.5 rounded-xl text-blue-600 hover:bg-blue-50 border border-blue-200 transition"
                          >
                            <Tag className="w-3.5 h-3.5" />
                          </button>

                          {/* Toggle Active Status */}
                          <button
                            onClick={() => handleTogglePublish(prompt)}
                            title={prompt.is_published ? 'غیرفعال‌سازی پرامپت' : 'فعال‌سازی پرامپت'}
                            className={`pressable p-1.5 rounded-xl border transition ${
                              prompt.is_published
                                ? 'text-amber-600 hover:bg-amber-50 border-amber-200'
                                : 'text-emerald-600 hover:bg-emerald-50 border-emerald-200'
                            }`}
                          >
                            {prompt.is_published ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>

                          {/* Delete Prompt */}
                          <button
                            onClick={() => handleDeletePrompt(prompt)}
                            title="حذف کامل پرامپت"
                            className="pressable p-1.5 rounded-xl text-red-600 hover:bg-red-50 border border-red-200 transition"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>

                          {/* Open Live URL */}
                          <Link
                            href={`/p/${prompt.slug}`}
                            target="_blank"
                            title="مشاهده در سایت"
                            className="pressable p-1.5 rounded-xl text-slate-500 hover:bg-slate-100 border border-slate-200 transition"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Server-Side Pagination */}
        {!loading && totalPages > 1 && (
          <div className="p-4 bg-slate-50/70 border-t border-slate-200 flex items-center justify-between flex-wrap gap-3">
            <div className="text-xs text-slate-500">
              نمایش صفحه <span className="font-bold text-slate-800 font-mono">{page}</span> از{' '}
              <span className="font-bold text-slate-800 font-mono">{totalPages}</span> (مجموع{' '}
              <span className="font-bold text-slate-800 font-mono">{totalCount.toLocaleString('fa-IR')}</span> پرامپت)
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => {
                  const newPage = Math.max(1, page - 1);
                  setPage(newPage);
                  updateUrlParams(newPage, searchQuery, selectedCategory, selectedModality, selectedTag, selectedStatus, sortBy, sortOrder);
                }}
                disabled={page <= 1}
                className="pressable inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed shadow-2xs"
              >
                <ChevronRight className="w-3.5 h-3.5" />
                <span>قبلی</span>
              </button>

              <button
                onClick={() => {
                  const newPage = Math.min(totalPages, page + 1);
                  setPage(newPage);
                  updateUrlParams(newPage, searchQuery, selectedCategory, selectedModality, selectedTag, selectedStatus, sortBy, sortOrder);
                }}
                disabled={page >= totalPages}
                className="pressable inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed shadow-2xs"
              >
                <span>بعدی</span>
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Parameters Inspector Modal */}
      <AdminParametersModal
        prompt={activeParametersModalPrompt}
        onClose={() => setActiveParametersModalPrompt(null)}
      />

      {/* Admin Prompt Creator Modal */}
      <AdminPromptCreatorModal
        isOpen={isCreatorOpen}
        onClose={() => setIsCreatorOpen(false)}
        onCreated={() => loadPrompts()}
      />

      {/* Admin Prompt Tags Modal (Single & Bulk) */}
      <AdminPromptTagsModal
        isOpen={Boolean(tagModalPrompt) || isBulkTagModalOpen}
        onClose={() => {
          setTagModalPrompt(null);
          setIsBulkTagModalOpen(false);
        }}
        prompt={tagModalPrompt}
        selectedIds={selectedIds}
        onSuccess={() => loadPrompts()}
      />
    </div>
  );
}
