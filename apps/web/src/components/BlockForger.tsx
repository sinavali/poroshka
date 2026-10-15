'use client';

import React, { useState, useEffect } from 'react';
import { Hammer, Copy, Check, Sparkles, Wand2, Sliders, Brain } from 'lucide-react';
import { fetchFromApi } from '../lib/api-client';
import { showDynamicToast } from './DynamicIslandToast';
import { MemoryProfile } from './PersonalMemoryModal';

interface ForgeResult {
  modality: string;
  stitched_template: string;
  compiled_text: string;
  slots: Array<{
    slot_key: string;
    label_fa: string;
    default_value?: string;
    suggestions?: string[];
  }>;
  resolved_slot_values?: Record<string, string>;
}

interface BlockForgerProps {
  initialQuery?: string;
  onOpenMemoryModal?: () => void;
}

const SAMPLE_IDEAS = [
  'سناریو استوری معرفی دوره آموزشی برای اینستاگرام با قلاب کنجکاوی و دعوت به اقدام',
  'پست لینکدین تحلیلی درباره نقش هوش مصنوعی در آینده مشاغل و راهکارهای ارتقای مهارت',
  'متن ایمیل مارکتینگ برای کمپین تخفیف بلک فرایدی با لحن فوری و جذاب',
  'پرتره سینمایی واقع‌گرایانه از یک مهندس نرم‌افزار در دفتر کاری مدرن با نور ملایم پنجره',
  'عکاسی محصول استودیویی با کیفیت 8k از یک بطری عطر لوکس روی سنگ مرمر با بازتاب آب',
  'طراحی و بهینه‌سازی کوئری PostgreSQL با ایندکس‌های BRIN و CTE برای ۱۰ میلیون رکورد',
  'کامپوننت واکنش‌گرا فرم چندمرحله‌ای احراز هویت با اعتبارسنجی Zod در React و Tailwind',
  'فرمول پیشرفته اکسل با ترکیب XLOOKUP و INDEX-MATCH برای محاسبه پورسانت پلکانی فروشندگان'
];

export function BlockForger({ initialQuery = '', onOpenMemoryModal }: BlockForgerProps) {
  const [query, setQuery] = useState(initialQuery);
  const [forceFarsi, setForceFarsi] = useState(true);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ForgeResult | null>(null);
  const [slotValues, setSlotValues] = useState<Record<string, string>>({});
  const [copied, setCopied] = useState(false);

  // Multi-profile personal memory state
  const [memoryProfiles, setMemoryProfiles] = useState<MemoryProfile[]>([]);
  const [selectedMemoryId, setSelectedMemoryId] = useState<string>('none');

  const loadMemories = () => {
    try {
      const cached = localStorage.getItem('promptjoo_memory_profiles');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMemoryProfiles(parsed);
          const activeId = localStorage.getItem('promptjoo_active_memory_id');
          if (activeId && parsed.some((p: MemoryProfile) => p.id === activeId)) {
            setSelectedMemoryId(activeId);
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

  useEffect(() => {
    if (initialQuery) {
      setQuery(initialQuery);
    }
  }, [initialQuery]);

  const handleShuffleIdea = () => {
    const otherIdeas = SAMPLE_IDEAS.filter((i) => i !== query);
    const randomPick = otherIdeas[Math.floor(Math.random() * otherIdeas.length)] || SAMPLE_IDEAS[0];
    setQuery(randomPick);
  };

  const handleMemorySelect = (memId: string) => {
    setSelectedMemoryId(memId);
    if (memId === 'none') {
      return;
    }
    const profile = memoryProfiles.find((p) => p.id === memId);
    if (!profile) return;

    // Apply memory profile parameters to current slots
    setSlotValues((prev) => ({
      ...prev,
      brand_name: profile.brand_name || prev.brand_name || '',
      topic: profile.niche_topic || prev.topic || '',
      target_audience: profile.target_audience || prev.target_audience || '',
      brand_tone: profile.brand_tone || prev.brand_tone || '',
      call_to_action: profile.call_to_action || prev.call_to_action || ''
    }));

    showDynamicToast({
      title: 'حافظه اعمال شد',
      message: `اطلاعات «${profile.title}» جایگذاری گردید`,
      type: 'memory'
    });
  };

  const handleForge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    try {
      // Find active profile if chosen
      const activeProfile = memoryProfiles.find((p) => p.id === selectedMemoryId);

      const data = await fetchFromApi<ForgeResult>('/api/v1/catalog/forge', {
        method: 'POST',
        body: JSON.stringify({
          query: query.trim(),
          force_farsi_output: forceFarsi,
          profile: activeProfile || null,
          slot_values: slotValues
        })
      });

      setResult(data);
      const mergedVals = { ...(data.resolved_slot_values || {}) };

      // Overwrite with active memory if selected
      if (selectedMemoryId !== 'none' && activeProfile) {
        if (activeProfile.brand_name) mergedVals.brand_name = activeProfile.brand_name;
        if (activeProfile.target_audience) mergedVals.target_audience = activeProfile.target_audience;
        if (activeProfile.brand_tone) mergedVals.brand_tone = activeProfile.brand_tone;
        if (activeProfile.call_to_action) mergedVals.call_to_action = activeProfile.call_to_action;
      }

      setSlotValues(mergedVals);
      showDynamicToast({
        title: 'پرامپت بلوک‌چین ساخته شد',
        message: 'ترکیب اتمیک بلوک‌های مهندسی‌شده بدون هزینه توکن',
        type: 'forge'
      });
    } catch {
      showDynamicToast({
        title: 'خطا در ساخت پرامپت',
        message: 'لطفاً متن ایده را بررسی کنید',
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const getLiveCompiledText = (): string => {
    if (!result) return '';
    let text = result.stitched_template;
    for (const [key, val] of Object.entries(slotValues)) {
      text = text.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), val || '');
    }
    if (forceFarsi && !text.includes('پاسخ را به زبان فارسی روان بنویسید.')) {
      text += '\n\nImportant: لطفا تمام پاسخ را به زبان فارسی روان، شیوا و استاندارد بنویسید.';
    }
    return text;
  };

  const handleCopy = async () => {
    if (!result) return;
    const finalCompiled = getLiveCompiledText();
    await navigator.clipboard.writeText(finalCompiled);
    setCopied(true);
    showDynamicToast({
      title: 'پرامپت در کلیپ‌بورد کپی شد',
      message: 'آماده ارسال به هوش مصنوعی',
      type: 'copy'
    });
    setTimeout(() => setCopied(false), 2200);

    // Persist to user_copied_prompts in backend for /my-prompts tracking
    fetchFromApi('/api/v1/identity/copied-prompts', {
      method: 'POST',
      body: JSON.stringify({
        title_fa: query.slice(0, 80),
        modality: result.modality || 'text_writing',
        custom_values_json: slotValues,
        compiled_text: finalCompiled
      })
    }).catch(() => {});
  };

  return (
    <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-slate-200/80 relative overflow-hidden mb-12 shadow-sm">
      {/* Background Ambient Glow */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="flex items-center justify-between mb-6 relative flex-wrap gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
            <Hammer className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl font-black text-slate-900 flex items-center gap-2">
              موتور بلوک‌چین ساخت هوشمند پرامپت
              <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-700 border border-blue-200">
                رایگان و بدون هزینه توکن
              </span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              ایده یا نیاز خود را بنویسید تا سیستم به‌صورت خودکار بلوک‌های استاندارد نقش، وظیفه و قیود را ترکیب کند.
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleShuffleIdea}
            className="pressable inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold border border-slate-200/80"
          >
            <Sparkles className="w-3.5 h-3.5 text-blue-600" />
            <span>ایده تصادفی</span>
          </button>
        </div>
      </div>

      <form onSubmit={handleForge} className="space-y-4 relative">
        {/* Memory Profile Select Dropdown */}
        <div className="flex items-center justify-between gap-3 p-3 bg-slate-50/80 border border-slate-200/70 rounded-2xl flex-wrap">
          <div className="flex items-center gap-2">
            <Brain className="w-4 h-4 text-indigo-600" />
            <span className="text-xs font-bold text-slate-700">حافظه شخصی:</span>
            <select
              value={selectedMemoryId}
              onChange={(e) => handleMemorySelect(e.target.value)}
              className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 font-medium focus:outline-none focus:border-indigo-500 shadow-xs"
            >
              <option value="none">بدون حافظه (تکمیل دستی)</option>
              {memoryProfiles.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title} {p.brand_name ? `(${p.brand_name})` : ''}
                </option>
              ))}
            </select>
          </div>

          {onOpenMemoryModal && (
            <button
              type="button"
              onClick={onOpenMemoryModal}
              className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800"
            >
              مدیریت و افزودن حافظه‌ها
            </button>
          )}
        </div>

        {/* Query Input */}
        <div>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="مثلاً: سناریو معرفی لپ‌تاپ گیمینگ برای استوری اینستاگرام، یا کوئری بهینه‌سازی داده‌ها..."
            className="w-full bg-slate-50 border border-slate-200/90 rounded-2xl px-4 py-3 text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
          />
        </div>

        <div className="flex items-center justify-between pt-1 flex-wrap gap-3">
          <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={forceFarsi}
              onChange={(e) => setForceFarsi(e.target.checked)}
              className="w-4 h-4 rounded text-blue-600 focus:ring-0 bg-slate-50 border-slate-300"
            />
            <span>دستور خروجی کاملاً فارسی روان و شیوا اضافه شود</span>
          </label>

          <button
            type="submit"
            disabled={loading || !query.trim()}
            className="pressable flex items-center gap-2 px-6 py-2.5 rounded-2xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-600/25 disabled:opacity-50"
          >
            <Wand2 className="w-4 h-4" />
            <span>{loading ? 'در حال ساخت پرامپت...' : 'ساخت آنی پرامپت'}</span>
          </button>
        </div>
      </form>

      {/* Result Display & Live Slot Customization */}
      {result && (
        <div className="mt-8 pt-8 border-t border-slate-200/80 space-y-6 animate-fade-in relative">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-blue-600" />
              متغیرها و شخصی‌سازی پرامپت ساخته‌شده
            </h4>
            <button
              onClick={handleCopy}
              className="pressable flex items-center gap-1.5 px-4 py-2 rounded-2xl text-xs font-bold bg-blue-600 text-white hover:bg-blue-500 shadow-md shadow-blue-500/20"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'کپی شد!' : 'کپی متن پرامپت'}</span>
            </button>
          </div>

          {/* Slots input grid with suggestion chips */}
          {result.slots && result.slots.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50/70 p-5 rounded-2xl border border-slate-200/60">
              {result.slots.map((s) => (
                <div key={s.slot_key} className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700">{s.label_fa}</label>
                  <input
                    type="text"
                    value={slotValues[s.slot_key] || ''}
                    placeholder={s.default_value || s.label_fa}
                    onChange={(e) => setSlotValues({ ...slotValues, [s.slot_key]: e.target.value })}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-500"
                  />
                  {s.suggestions && s.suggestions.length > 0 && (
                    <div className="flex items-center gap-1 flex-wrap pt-1">
                      <span className="text-[10px] text-slate-400 font-medium">پیشنهاد:</span>
                      {s.suggestions.map((sug) => (
                        <button
                          key={sug}
                          type="button"
                          onClick={() => setSlotValues({ ...slotValues, [s.slot_key]: sug })}
                          className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-white hover:bg-blue-50 text-slate-600 hover:text-blue-700 border border-slate-200 shadow-2xs"
                        >
                          {sug}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Live Preview Box */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-slate-700">پیش‌نمایش زنده پرامپت نهایی:</span>
            <div className="p-4 rounded-2xl bg-white border border-slate-200 text-xs font-mono text-slate-800 leading-relaxed whitespace-pre-wrap max-h-72 overflow-y-auto select-all shadow-inner">
              {getLiveCompiledText()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
