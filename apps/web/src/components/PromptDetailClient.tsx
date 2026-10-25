'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowRight, Copy, Check, Sparkles, HelpCircle, Layers, Sliders, ExternalLink, Brain, Zap } from 'lucide-react';
import { fetchFromApi } from '../lib/api-client';
import { PostCopyDrawer } from './PostCopyDrawer';
import { AdBanner } from './AdBanner';
import { AdPlacement } from './AdPlacement';
import { showDynamicToast } from './DynamicIslandToast';
import { MemoryProfile } from './PersonalMemoryModal';
import { ShareButton } from './ShareButton';
import { StyledSelect } from './StyledSelect';

export interface PromptDetailData {
  id: string;
  slug: string;
  modality: string;
  category_slug?: string;
  category_title_fa?: string;
  title_fa: string;
  short_desc_fa: string;
  direct_answer_summary_fa: string;
  template_en: string;
  slots_schema_json: Array<{
    slot_key: string;
    label_fa: string;
    input_type: string;
    options?: string[];
    default_value?: string;
    placeholder?: string;
    is_required?: boolean;
  }>;
  faq_schema_json?: Array<{ question: string; answer: string }>;
  supported_models: string[];
  copy_count: number;
  view_count: number;
  created_at?: string;
  updated_at?: string;
}

interface PromptDetailClientProps {
  initialPrompt: PromptDetailData;
}

export function PromptDetailClient({ initialPrompt }: PromptDetailClientProps) {
  const [prompt, setPrompt] = useState<PromptDetailData>(initialPrompt);
  const [copyCount, setCopyCount] = useState(initialPrompt.copy_count);
  const [slotValues, setSlotValues] = useState<Record<string, string>>({});
  const [forceFarsi, setForceFarsi] = useState(true);
  const [compiledText, setCompiledText] = useState(initialPrompt.template_en);
  const [copied, setCopied] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [memoryProfiles, setMemoryProfiles] = useState<MemoryProfile[]>([]);
  const [selectedMemoryId, setSelectedMemoryId] = useState<string>('none');

  const loadMemories = () => {
    try {
      const cached = localStorage.getItem('promptjoo_memory_profiles');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMemoryProfiles(parsed);
          if (parsed.length === 1) {
            setSelectedMemoryId(parsed[0].id);
            localStorage.setItem('promptjoo_active_memory_id', parsed[0].id);
          } else {
            const activeId = localStorage.getItem('promptjoo_active_memory_id');
            if (activeId && parsed.some((p: MemoryProfile) => p.id === activeId)) {
              setSelectedMemoryId(activeId);
            }
          }
          return;
        }
      }
      setMemoryProfiles([]);
    } catch {
      setMemoryProfiles([]);
    }
  };

  useEffect(() => {
    loadMemories();
    const handleUpdate = () => loadMemories();
    window.addEventListener('promptjoo:memory-updated', handleUpdate);
    return () => window.removeEventListener('promptjoo:memory-updated', handleUpdate);
  }, []);

  // Initialize slots
  useEffect(() => {
    let profile: Record<string, string> = {};
    try {
      const cachedProfiles = localStorage.getItem('promptjoo_memory_profiles');
      const activeId = localStorage.getItem('promptjoo_active_memory_id');
      if (cachedProfiles) {
        const list = JSON.parse(cachedProfiles);
        const active = list.find((p: MemoryProfile) => p.id === activeId) || list[0];
        if (active) {
          profile = {
            brand_name: active.brand_name || '',
            target_audience: active.target_audience || '',
            brand_tone: active.brand_tone || '',
            call_to_action: active.call_to_action || '',
            niche_topic: active.niche_topic || '',
          };
        }
      } else {
        const legacy = localStorage.getItem('promptjoo_personal_memory');
        if (legacy) profile = JSON.parse(legacy);
      }
    } catch {}

    const initialSlots: Record<string, string> = {};
    if (Array.isArray(initialPrompt.slots_schema_json)) {
      for (const s of initialPrompt.slots_schema_json) {
        initialSlots[s.slot_key] = profile[s.slot_key] || s.default_value || '';
      }
    }
    setSlotValues(initialSlots);
  }, [initialPrompt]);

  // Live client-side compilation whenever slots or forceFarsi changes (no network storm on keystrokes)
  useEffect(() => {
    if (!prompt) return;
    let text = prompt.template_en;
    for (const [k, v] of Object.entries(slotValues)) {
      text = text.replace(new RegExp(`\\{\\{${k}\\}\\}`, 'g'), () => v || '');
    }
    if (forceFarsi && !text.includes('پاسخ را به زبان فارسی روان بنویسید.')) {
      text += '\n\nImportant: لطفا تمام پاسخ را به زبان فارسی روان، شیوا و استاندارد بنویسید.';
    }
    setCompiledText(text);
  }, [prompt, slotValues, forceFarsi]);

  const handleMemorySelect = (memId: string) => {
    setSelectedMemoryId(memId);
    if (memId === 'none') {
      const resetSlots: Record<string, string> = {};
      if (Array.isArray(prompt.slots_schema_json)) {
        for (const s of prompt.slots_schema_json) {
          resetSlots[s.slot_key] = s.default_value || '';
        }
      }
      setSlotValues(resetSlots);
      showDynamicToast({
        title: 'حافظه شخصی غیرفعال شد',
        message: 'مقادیر متغیرها به حالت پیش‌فرض بازگشت',
        type: 'memory'
      });
      return;
    }

    const profile = memoryProfiles.find((p) => p.id === memId);
    if (!profile) return;

    setSlotValues((prev) => ({
      ...prev,
      ...(profile.brand_name ? { brand_name: profile.brand_name } : {}),
      ...(profile.target_audience ? { target_audience: profile.target_audience } : {}),
      ...(profile.brand_tone ? { brand_tone: profile.brand_tone } : {}),
      ...(profile.call_to_action ? { call_to_action: profile.call_to_action } : {}),
    }));

    showDynamicToast({
      title: 'حافظه شخصی اعمال شد',
      message: `اطلاعات «${profile.title}» جایگذاری گردید`,
      type: 'memory'
    });
  };

  const handleCopyClick = async () => {
    await navigator.clipboard.writeText(compiledText);
    setCopied(true);
    showDynamicToast({
      title: 'پرامپت در کلیپ‌بورد کپی شد',
      message: prompt.title_fa,
      type: 'copy'
    });
    setTimeout(() => setCopied(false), 2200);
    setDrawerOpen(true);

    fetchFromApi<{ updated_copy_count?: number }>(`/api/v1/catalog/prompts/${prompt.slug}/copy`, {
      method: 'POST',
      body: JSON.stringify({
        slot_values: slotValues,
        force_farsi_output: forceFarsi
      })
    })
      .then((data) => {
        if (typeof data?.updated_copy_count === 'number') {
          setCopyCount(data.updated_copy_count);
        } else {
          setCopyCount((prev) => prev + 1);
        }
      })
      .catch(() => {});
  };

  const estimatedWords = (compiledText || '').trim().split(/\s+/).filter(Boolean).length;

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
      {/* Navigation Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <Link href="/" className="hover:text-slate-900 spring-transition">صفحه اصلی</Link>
        <span>/</span>
        <span className="text-blue-600 font-medium">{prompt.category_title_fa || 'دسته‌بندی'}</span>
        <span>/</span>
        <span className="text-slate-700 truncate">{prompt.title_fa}</span>
      </div>

      {/* Header Info Card */}
      <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-slate-200/80 space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2.5">
            <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
              {prompt.modality}
            </span>
            <span className="text-xs text-slate-500 font-mono" dir="ltr">
              {copyCount.toLocaleString('fa-IR')} بار کپی شده
            </span>
          </div>

          <div className="flex items-center gap-2">
            <ShareButton slug={prompt.slug} title={prompt.title_fa} size="md" />
            <button
              onClick={handleCopyClick}
              className={`pressable flex items-center gap-2 px-5 py-2 rounded-2xl text-xs font-bold shadow-md spring-transition ${
                copied
                  ? 'bg-emerald-600 text-white'
                  : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-500/25 border border-blue-500'
              }`}
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>کپی شد!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>کپی پرامپت نهایی</span>
                </>
              )}
            </button>
          </div>
        </div>

        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 leading-tight tracking-tight">
          {prompt.title_fa}
        </h1>

        <p className="text-sm text-slate-600 leading-relaxed max-w-3xl">
          {prompt.short_desc_fa}
        </p>

        {/* Supported Models */}
        {prompt.supported_models && prompt.supported_models.length > 0 && (
          <div className="flex items-center gap-2 pt-1 flex-wrap">
            <span className="text-xs text-slate-500">سازگار با:</span>
            {prompt.supported_models.map((m) => (
              <span key={m} className="text-[11px] uppercase font-mono px-3 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                {m}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Interactive Slot Customizer Panel */}
      {prompt.slots_schema_json && prompt.slots_schema_json.length > 0 && (
        <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-slate-200/80 space-y-6 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200/80 pb-4 flex-wrap gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600">
                <Sliders className="w-4 h-4" />
              </div>
              <h3 className="text-base font-bold text-slate-900">شخصی‌سازی متغیرها</h3>
            </div>

            {memoryProfiles.length === 1 ? (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    handleMemorySelect(
                      selectedMemoryId === 'none' ? memoryProfiles[0].id : 'none'
                    )
                  }
                  className={`pressable inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold border transition ${
                    selectedMemoryId !== 'none'
                      ? 'bg-indigo-50 border-indigo-200 text-indigo-700 shadow-xs'
                      : 'bg-slate-100 border-slate-200 text-slate-500 hover:bg-slate-200'
                  }`}
                  title={
                    selectedMemoryId !== 'none'
                      ? 'کلیک برای غیرفعال‌سازی حافظه در این پرامپت'
                      : 'کلیک برای فعال‌سازی حافظه در این پرامپت'
                  }
                >
                  <Brain className="w-3.5 h-3.5 text-indigo-600" />
                  <span>
                    حافظه: {memoryProfiles[0].title || memoryProfiles[0].brand_name || 'برند شما'}
                  </span>
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                      selectedMemoryId !== 'none'
                        ? 'bg-indigo-200/60 text-indigo-800'
                        : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {selectedMemoryId !== 'none' ? 'فعال' : 'غیرفعال'}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => window.dispatchEvent(new CustomEvent('promptjoo:open-memory'))}
                  className="text-[11px] text-indigo-600 hover:text-indigo-800 underline font-medium"
                >
                  ویرایش
                </button>
              </div>
            ) : memoryProfiles.length > 1 ? (
              <div className="flex items-center gap-2 min-w-[200px]">
                <Brain className="w-4 h-4 text-indigo-600 flex-shrink-0" />
                <span className="text-xs font-bold text-slate-700 whitespace-nowrap">پروفایل برند:</span>
                <StyledSelect
                  size="sm"
                  value={selectedMemoryId}
                  onChange={handleMemorySelect}
                  options={[
                    { value: 'none', label: 'بدون حافظه (تکمیل دستی)' },
                    ...memoryProfiles.map((p) => ({
                      value: p.id,
                      label: p.title,
                      sublabel: p.brand_name
                    }))
                  ]}
                />
              </div>
            ) : null}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {prompt.slots_schema_json.map((slot) => (
              <div key={slot.slot_key} className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">
                  {slot.label_fa} {slot.is_required && <span className="text-red-500">*</span>}
                </label>

                {slot.input_type === 'select' && slot.options ? (
                  <StyledSelect
                    size="md"
                    value={slotValues[slot.slot_key] || ''}
                    onChange={(val) => setSlotValues({ ...slotValues, [slot.slot_key]: val })}
                    placeholder={`انتخاب ${slot.label_fa}...`}
                    options={slot.options.map((opt) => ({ value: opt, label: opt }))}
                  />
                ) : slot.input_type === 'textarea' ? (
                  <textarea
                    rows={3}
                    value={slotValues[slot.slot_key] || ''}
                    onChange={(e) => setSlotValues({ ...slotValues, [slot.slot_key]: e.target.value })}
                    placeholder={slot.placeholder}
                    className="w-full bg-slate-50 border border-slate-200/90 rounded-2xl px-4 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-indigo-500"
                  />
                ) : (
                  <input
                    type="text"
                    value={slotValues[slot.slot_key] || ''}
                    onChange={(e) => setSlotValues({ ...slotValues, [slot.slot_key]: e.target.value })}
                    placeholder={slot.placeholder}
                    className="w-full bg-slate-50 border border-slate-200/90 rounded-2xl px-4 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-indigo-500"
                  />
                )}
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between pt-2">
            <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={forceFarsi}
                onChange={(e) => setForceFarsi(e.target.checked)}
                className="w-4 h-4 rounded text-blue-600 focus:ring-0 bg-slate-50 border-slate-300"
              />
              <span>دستور زبان فارسی روان به انتهای پرامپت الصاق شود</span>
            </label>
          </div>
        </div>
      )}

      {/* Single Prompt Top Ad Banner (728x90 desktop, 300x100 mobile) */}
      <AdPlacement slot="single_prompt_preview" />

      {/* Live Bilingual Preview & Copy Action */}
      <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-slate-200/80 space-y-4 shadow-sm">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2.5">
            <Sparkles className="w-5 h-5 text-blue-600" />
            <h3 className="text-base font-bold text-slate-900">پیش‌نمایش زنده پرامپت</h3>
            <span className="text-[11px] text-slate-500 font-mono" dir="ltr">
              ({estimatedWords} کلمه)
            </span>
          </div>

          <button
            onClick={handleCopyClick}
            className={`pressable flex items-center gap-2 px-6 py-2.5 rounded-2xl text-xs font-bold shadow-md spring-transition ${
              copied
                ? 'bg-emerald-600 text-white'
                : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-500/25 border border-blue-500'
            }`}
          >
            {copied ? (
              <>
                <Check className="w-4 h-4" />
                <span>کپی شد!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                <span>کپی پرامپت</span>
              </>
            )}
          </button>
        </div>

        {/* Bilingual Code */}
        <pre className="bilingual-code text-xs bg-slate-100 p-5 rounded-2xl border border-slate-200 text-slate-800 leading-relaxed overflow-x-auto max-h-72">
          {compiledText || prompt.template_en}
        </pre>
      </div>

      {/* Direct Answer Summary for SEO/AIO */}
      {prompt.direct_answer_summary_fa && (
        <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-slate-200/80 space-y-3 shadow-sm">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Layers className="w-4 h-4 text-emerald-600" />
            راهنمای کاربردی و پاسخ مستقیم
          </h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            {prompt.direct_answer_summary_fa}
          </p>
        </div>
      )}

      {/* FAQ Accordion */}
      {prompt.faq_schema_json && prompt.faq_schema_json.length > 0 && (
        <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-slate-200/80 space-y-4 shadow-sm">
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2 mb-2">
            <HelpCircle className="w-5 h-5 text-amber-600" />
            پرسش‌های متداول درباره این پرامپت
          </h3>

          <div className="space-y-3">
            {prompt.faq_schema_json.map((faq, idx) => (
              <div key={idx} className="p-4 rounded-2xl bg-slate-50 border border-slate-200/70 space-y-1.5">
                <h4 className="text-xs font-bold text-slate-900">{faq.question}</h4>
                <p className="text-xs text-slate-600 leading-relaxed">{faq.answer}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Post Copy Drawer */}
      <PostCopyDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        compiledText={compiledText}
        promptTitle={prompt.title_fa}
      />
    </div>
  );
}
