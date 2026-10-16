'use client';

import React, { useState, useEffect } from 'react';
import { X, Plus, Sparkles, Check, AlertCircle, Wand2, Sliders } from 'lucide-react';
import { fetchFromApi } from '../lib/api-client';
import { showDynamicToast } from './DynamicIslandToast';

interface AdminPromptCreatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated?: () => void;
}

export function AdminPromptCreatorModal({ isOpen, onClose, onCreated }: AdminPromptCreatorModalProps) {
  const [titleFa, setTitleFa] = useState('');
  const [shortDescFa, setShortDescFa] = useState('');
  const [modality, setModality] = useState('text_writing');
  const [categorySlug, setCategorySlug] = useState('content-writing');
  const [categories, setCategories] = useState<Array<{ id: string; slug: string; title_fa: string }>>([]);
  const [templateEn, setTemplateEn] = useState('');
  const [directAnswerFa, setDirectAnswerFa] = useState('');
  const [keywords, setKeywords] = useState('');
  const [supportedModels, setSupportedModels] = useState<string[]>(['chatgpt', 'claude']);
  const [loading, setLoading] = useState(false);
  const [detectedSlots, setDetectedSlots] = useState<string[]>([]);

  useEffect(() => {
    fetchFromApi<Array<{ id: string; slug: string; title_fa: string }>>('/api/v1/catalog/categories')
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setCategories(data);
          setCategorySlug(data[0].slug);
        }
      })
      .catch(() => {});
  }, []);

  // Detect slots when template changes
  useEffect(() => {
    const matches = [...templateEn.matchAll(/\{\{([a-zA-Z0-9_]+)\}\}/g)];
    const unique = Array.from(new Set(matches.map((m) => m[1])));
    setDetectedSlots(unique);
  }, [templateEn]);

  if (!isOpen) return null;

  const toggleModel = (model: string) => {
    setSupportedModels((prev) =>
      prev.includes(model) ? prev.filter((m) => m !== model) : [...prev, model]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!titleFa.trim() || !templateEn.trim()) {
      showDynamicToast({ title: 'فیلدهای ضروری را پر کنید', message: 'عنوان و متن پرامپت الزامی است', type: 'error' });
      return;
    }

    setLoading(true);
    try {
      const keywordList = keywords
        .split(/[,،]+/)
        .map((k) => k.trim())
        .filter(Boolean);

      const slotsSchema = detectedSlots.map((slotKey) => ({
        slot_key: slotKey,
        label_fa: slotKey.replace(/_/g, ' '),
        input_type: 'text',
        default_value: '',
        is_required: true,
      }));

      await fetchFromApi('/api/v1/ingestion/prompt', {
        method: 'POST',
        body: JSON.stringify({
          title_fa: titleFa.trim(),
          short_desc_fa: shortDescFa.trim() || titleFa.trim(),
          category_slug: categorySlug,
          modality,
          template_en: templateEn.trim(),
          direct_answer_summary_fa: directAnswerFa.trim(),
          slots_schema_json: slotsSchema,
          supported_models: supportedModels,
          search_keywords_fa: keywordList,
        }),
      });

      showDynamicToast({
        title: 'پرامپت جدید با موفقیت اضافه شد',
        message: titleFa,
        type: 'success',
      });

      if (onCreated) onCreated();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'خطا در ثبت پرامپت';
      showDynamicToast({ title: 'خطا در ثبت پرامپت', message: msg, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
      <div className="glass-panel w-full max-w-2xl bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
              <Plus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900">افزودن پرامپت جدید به کاتالوگ</h3>
              <p className="text-xs text-slate-500">پرامپت مهندسی‌شده جدید را تعریف کرده و مستقیماً به بانک داده تزریق کنید.</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 p-1 rounded-xl">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title & Category */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">عنوان پرامپت (فارسی) *</label>
              <input
                type="text"
                required
                value={titleFa}
                onChange={(e) => setTitleFa(e.target.value)}
                placeholder="مثال: بازنویسی مقاله به لحن ویروسی توییتر"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">دسته‌بندی موضوعی</label>
              <select
                value={categorySlug}
                onChange={(e) => setCategorySlug(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-blue-500"
              >
                {categories.map((c) => (
                  <option key={c.slug} value={c.slug}>{c.title_fa}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Modality & Supported Models */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">مدالیته (قالب کاری)</label>
              <select
                value={modality}
                onChange={(e) => setModality(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-blue-500"
              >
                <option value="text_writing">تولید محتوا و نگارش</option>
                <option value="image_edit">ادیت و ویرایش عکس</option>
                <option value="text_to_image">تولید تصویر با میدجرنی</option>
                <option value="data_structuring">اکسل و تحلیل داده</option>
                <option value="code_tech">برنامه‌نویسی و SQL</option>
                <option value="video_audio">ویدیو و ریلز</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">مدل‌های سازگار</label>
              <div className="flex items-center gap-2 pt-1 flex-wrap">
                {['chatgpt', 'claude', 'midjourney', 'gemini'].map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => toggleModel(m)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold uppercase transition ${
                      supportedModels.includes(m)
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Short Description */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">توضیح کوتاه و کاربرد</label>
            <input
              type="text"
              value={shortDescFa}
              onChange={(e) => setShortDescFa(e.target.value)}
              placeholder="توضیح دهید این پرامپت چه مساله‌ای را حل می‌کند..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Template (English/Bilingual) */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-bold text-slate-700">قالب متن پرامپت (Template) *</label>
              <span className="text-[11px] text-slate-400">از <code className="bg-slate-100 px-1 py-0.5 rounded text-blue-600 font-mono">&#123;&#123;slot_name&#125;&#125;</code> برای متغیرها استفاده کنید</span>
            </div>
            <textarea
              rows={5}
              required
              value={templateEn}
              onChange={(e) => setTemplateEn(e.target.value)}
              dir="ltr"
              placeholder="Act as a professional copywriter. Write a {{tone}} Instagram caption about {{topic}} targeting {{target_audience}}..."
              className="w-full font-mono bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Detected Slots Preview */}
          {detectedSlots.length > 0 && (
            <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-200/60 flex items-center gap-2 flex-wrap text-xs">
              <span className="font-bold text-blue-800">متغیرهای استخراج‌شده:</span>
              {detectedSlots.map((s) => (
                <span key={s} className="font-mono bg-white px-2 py-0.5 rounded-md border border-blue-200 text-blue-700 text-[11px]">
                  &#123;&#123;{s}&#125;&#125;
                </span>
              ))}
            </div>
          )}

          {/* Direct Answer / Keywords */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">کلمات کلیدی جستجو (با کاما یا ویرگول جدا کنید)</label>
            <input
              type="text"
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              placeholder="مثال: اینستاگرام, کپشن, قلاب اول, ریلز, تولید محتوا"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
            >
              انصراف
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-600/25 disabled:opacity-50 flex items-center gap-2"
            >
              {loading ? (
                <span>در حال ذخیره...</span>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>ثبت و انتشار پرامپت</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
