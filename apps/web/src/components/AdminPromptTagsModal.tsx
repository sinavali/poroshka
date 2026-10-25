'use client';

import React, { useState, useEffect } from 'react';
import { X, Tag, Check, Plus, Trash2, Sparkles } from 'lucide-react';
import { fetchFromApi } from '../lib/api-client';
import { showDynamicToast } from './DynamicIslandToast';
import { AdminPromptItem } from './AdminPromptsView';

export const TOP_AI_MODELS = [
  { id: 'chatgpt', label: 'ChatGPT (چت جی‌پی‌تی)', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { id: 'midjourney', label: 'Midjourney (میدجورنی)', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  { id: 'claude', label: 'Claude (کلود)', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  { id: 'gemini', label: 'Gemini (جمینای)', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  { id: 'deepseek', label: 'DeepSeek (دیپ‌سیک)', color: 'bg-cyan-50 text-cyan-700 border-cyan-200' },
];

interface AdminPromptTagsModalProps {
  isOpen: boolean;
  onClose: () => void;
  prompt?: AdminPromptItem | null;
  selectedIds?: string[];
  onSuccess: () => void;
}

export function AdminPromptTagsModal({
  isOpen,
  onClose,
  prompt,
  selectedIds = [],
  onSuccess
}: AdminPromptTagsModalProps) {
  const isBulk = !prompt && selectedIds.length > 0;
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [bulkMode, setBulkMode] = useState<'set_tags' | 'add_tag' | 'remove_tag'>('set_tags');
  const [loading, setLoading] = useState(false);
  const [customTagInput, setCustomTagInput] = useState('');

  useEffect(() => {
    if (prompt) {
      setSelectedTags(Array.isArray(prompt.supported_models) ? [...prompt.supported_models] : []);
    } else {
      setSelectedTags(['chatgpt', 'gemini']);
    }
  }, [prompt, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const toggleTag = (tagId: string) => {
    setSelectedTags((prev) =>
      prev.includes(tagId) ? prev.filter((t) => t !== tagId) : [...prev, tagId]
    );
  };

  const handleAddCustomTag = (e: React.FormEvent) => {
    e.preventDefault();
    const tag = customTagInput.trim().toLowerCase();
    if (!tag) return;
    if (!selectedTags.includes(tag)) {
      setSelectedTags((prev) => [...prev, tag]);
    }
    setCustomTagInput('');
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      if (isBulk) {
        if (bulkMode === 'set_tags') {
          await fetchFromApi('/api/v1/admin/prompts/bulk', {
            method: 'POST',
            body: JSON.stringify({ action: 'set_tags', ids: selectedIds, tags: selectedTags })
          });
        } else if (bulkMode === 'add_tag') {
          for (const t of selectedTags) {
            await fetchFromApi('/api/v1/admin/prompts/bulk', {
              method: 'POST',
              body: JSON.stringify({ action: 'add_tag', ids: selectedIds, tag: t })
            });
          }
        } else if (bulkMode === 'remove_tag') {
          for (const t of selectedTags) {
            await fetchFromApi('/api/v1/admin/prompts/bulk', {
              method: 'POST',
              body: JSON.stringify({ action: 'remove_tag', ids: selectedIds, tag: t })
            });
          }
        }
        showDynamicToast({
          title: 'برچسب‌های مدل به‌روزرسانی شدند',
          message: `${selectedIds.length} پرامپت با موفقیت ویرایش شدند`,
          type: 'success'
        });
      } else if (prompt) {
        await fetchFromApi(`/api/v1/admin/prompts/${prompt.id}`, {
          method: 'PATCH',
          body: JSON.stringify({ supported_models: selectedTags })
        });
        showDynamicToast({
          title: 'برچسب‌های پرامپت ذخیره شد',
          message: prompt.title_fa,
          type: 'success'
        });
      }
      onSuccess();
      onClose();
    } catch (err: unknown) {
      showDynamicToast({
        title: 'خطا در ذخیره‌سازی برچسب‌ها',
        message: err instanceof Error ? err.message : '',
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-fade-in !m-0 !mt-0"
      style={{ margin: 0, marginTop: 0 }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      dir="rtl"
    >
      <div className="w-full max-w-lg bg-white rounded-3xl border border-slate-200/90 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 border border-blue-200/60">
              <Tag className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                {isBulk ? `مدیریت برچسب‌های مدل برای ${selectedIds.length} پرامپت` : 'مدیریت برچسب‌های مدل هوش مصنوعی'}
              </h3>
              <p className="text-[11px] text-slate-500 line-clamp-1">
                {isBulk ? 'انتخاب مدل‌های هوش مصنوعی سازگار به صورت گروهی' : prompt?.title_fa}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="pressable p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1">
          {/* Mode Selector for Bulk */}
          {isBulk && (
            <div className="space-y-2 bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80">
              <label className="block text-xs font-bold text-slate-700">نوع عملیات برچسب‌گذاری:</label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setBulkMode('set_tags')}
                  className={`px-3 py-2 rounded-xl text-xs font-bold border text-center transition-all ${
                    bulkMode === 'set_tags'
                      ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  جایگزینی کامل
                </button>
                <button
                  type="button"
                  onClick={() => setBulkMode('add_tag')}
                  className={`px-3 py-2 rounded-xl text-xs font-bold border text-center transition-all ${
                    bulkMode === 'add_tag'
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  افزودن برچسب
                </button>
                <button
                  type="button"
                  onClick={() => setBulkMode('remove_tag')}
                  className={`px-3 py-2 rounded-xl text-xs font-bold border text-center transition-all ${
                    bulkMode === 'remove_tag'
                      ? 'bg-rose-600 text-white border-rose-600 shadow-sm'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  حذف برچسب
                </button>
              </div>
            </div>
          )}

          {/* Top 5 AI Models List */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-2.5">
              ۵ مدل اصلی هوش مصنوعی (برچسب‌های کاتالوگ و هاب‌ها):
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {TOP_AI_MODELS.map((model) => {
                const isSelected = selectedTags.includes(model.id);
                return (
                  <button
                    key={model.id}
                    type="button"
                    onClick={() => toggleTag(model.id)}
                    className={`flex items-center justify-between p-3 rounded-2xl border text-xs font-bold transition-all text-right ${
                      isSelected
                        ? 'bg-blue-50/80 border-blue-400 text-blue-900 shadow-2xs'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${isSelected ? 'bg-blue-600' : 'bg-slate-300'}`} />
                      <span>{model.label}</span>
                    </span>
                    <span
                      className={`w-5 h-5 rounded-lg flex items-center justify-center border ${
                        isSelected ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-300 bg-white'
                      }`}
                    >
                      {isSelected && <Check className="w-3.5 h-3.5" />}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Selected Tags Pills & Custom Tag Form */}
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700">برچسب‌های تعیین‌شده:</label>
              <span className="text-[11px] font-bold text-slate-500 font-mono">
                {selectedTags.length} مورد
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2 min-h-8 p-2.5 bg-slate-50 rounded-2xl border border-slate-200/80">
              {selectedTags.length === 0 ? (
                <span className="text-xs text-slate-400">هیچ برچسب مدلی انتخاب نشده است</span>
              ) : (
                selectedTags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-white text-slate-800 border border-slate-200/90 shadow-2xs"
                  >
                    <span className="font-mono">{tag}</span>
                    <button
                      type="button"
                      onClick={() => setSelectedTags((prev) => prev.filter((t) => t !== tag))}
                      className="text-slate-400 hover:text-rose-600"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))
              )}
            </div>

            {/* Custom Tag Input */}
            <form onSubmit={handleAddCustomTag} className="flex gap-2">
              <input
                type="text"
                value={customTagInput}
                onChange={(e) => setCustomTagInput(e.target.value)}
                placeholder="افزودن برچسب اختصاصی جدید (انگلیسی، مثلا: flux, dall-e)..."
                className="flex-1 px-3.5 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:border-blue-500"
              />
              <button
                type="submit"
                className="pressable inline-flex items-center gap-1 px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-200"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>افزودن</span>
              </button>
            </form>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-100 bg-slate-50/70 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="pressable px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
          >
            انصراف
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={loading}
            className="pressable inline-flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 shadow-sm disabled:opacity-50"
          >
            {loading ? (
              <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Check className="w-3.5 h-3.5" />
            )}
            <span>اعمال و ذخیره تغییرات</span>
          </button>
        </div>
      </div>
    </div>
  );
}
