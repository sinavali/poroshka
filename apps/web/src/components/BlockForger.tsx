'use client';

import React, { useState } from 'react';
import { Hammer, Copy, Check, Sparkles, Wand2, Sliders } from 'lucide-react';
import { fetchFromApi } from '../lib/api-client';
import { showDynamicToast } from './DynamicIslandToast';

interface ForgeResult {
  modality: string;
  stitched_template: string;
  compiled_text: string;
  slots: Array<{ slot_key: string; label_fa: string; default_value_en: string }>;
  resolved_slot_values: Record<string, string>;
}

export function BlockForger() {
  const [query, setQuery] = useState('');
  const [modality, setModality] = useState('text_writing');
  const [forceFarsi, setForceFarsi] = useState(true);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ForgeResult | null>(null);
  const [slotValues, setSlotValues] = useState<Record<string, string>>({});
  const [copied, setCopied] = useState(false);

  const handleForge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    try {
      const cachedProfile = localStorage.getItem('promptjoo_user_profile');
      const profile = cachedProfile ? JSON.parse(cachedProfile) : {};

      const data = await fetchFromApi<ForgeResult>('/api/v1/catalog/forge', {
        method: 'POST',
        body: JSON.stringify({
          query: query.trim(),
          modality,
          force_farsi_output: forceFarsi,
          profile
        })
      });

      setResult(data);
      setSlotValues(data.resolved_slot_values || {});
      showDynamicToast({
        title: 'پرامپت بلوک‌چین ایجاد شد',
        message: 'ترکیب اتمیک بلوک‌های استاندارد بدون هزینه توکن',
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
  };

  return (
    <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-white/10 relative overflow-hidden mb-12">
      {/* Background Ambient Glow */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="flex items-center gap-3.5 mb-6 relative">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
          <Hammer className="w-6 h-6" />
        </div>
        <div>
          <h3 className="text-xl font-black text-white flex items-center gap-2">
            موتور بلوک‌چین پرامپت (Zero-LLM Block Forger)
            <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
              رایگان و بدون هزینه
            </span>
          </h3>
          <p className="text-xs text-gray-400 mt-0.5">
            ایده خود را بنویسید تا سیستم به‌صورت آنی بلوک‌های استاندارد (نقش، وظیفه، قیود و فرمت) را ترکیب کند.
          </p>
        </div>
      </div>

      <form onSubmit={handleForge} className="space-y-4 relative">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-2">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="مثلاً: سناریو معرفی لپ‌تاپ گیمینگ برای استوری اینستاگرام..."
              className="w-full bg-slate-900/90 border border-white/10 rounded-2xl px-4 py-3 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/50"
            />
          </div>

          <div>
            <select
              value={modality}
              onChange={(e) => setModality(e.target.value)}
              className="w-full bg-slate-900/90 border border-white/10 rounded-2xl px-4 py-3 text-xs text-white focus:outline-none focus:border-blue-500/60"
            >
              <option value="text_writing">تولید محتوا و کپشن</option>
              <option value="text_to_image">تولید تصویر (میدجورنی)</option>
              <option value="data_structuring">اکسل و داده</option>
              <option value="code_tech">برنامه‌نویسی و SQL</option>
            </select>
          </div>
        </div>

        <div className="flex items-center justify-between pt-1 flex-wrap gap-3">
          <label className="flex items-center gap-2 text-xs text-gray-300 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={forceFarsi}
              onChange={(e) => setForceFarsi(e.target.checked)}
              className="w-4 h-4 rounded text-blue-600 focus:ring-0 bg-slate-900 border-white/20"
            />
            <span>دستور خروجی کاملاً فارسی روان (fa-IR) اضافه شود</span>
          </label>

          <button
            type="submit"
            disabled={loading || !query.trim()}
            className="pressable flex items-center gap-2 px-6 py-2.5 rounded-2xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/30 disabled:opacity-50"
          >
            <Wand2 className="w-4 h-4" />
            <span>{loading ? 'در حال ساخت پرامپت...' : 'ساخت آنی پرامپت'}</span>
          </button>
        </div>
      </form>

      {/* Result Display & Live Slot Customization */}
      {result && (
        <div className="mt-6 pt-6 border-t border-white/10 space-y-4 relative animate-fade-in">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4" />
              پرامپت مهندسی‌شده آماده است:
            </span>
            <button
              onClick={handleCopy}
              className={`pressable flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold spring-transition ${
                copied ? 'bg-emerald-600 text-white' : 'bg-white/10 text-white hover:bg-white/20 border border-white/10'
              }`}
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>کپی شد!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>کپی در کلیپ‌بورد</span>
                </>
              )}
            </button>
          </div>

          {/* Optional Live Slots Editor */}
          {result.slots && result.slots.length > 0 && (
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-indigo-300">
                <Sliders className="w-4 h-4" />
                <span>تنظیم متغیرهای پرامپت ساخته شده:</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {result.slots.map((s) => (
                  <div key={s.slot_key} className="space-y-1">
                    <label className="text-[11px] font-bold text-gray-300">{s.label_fa}</label>
                    <input
                      type="text"
                      value={slotValues[s.slot_key] || ''}
                      onChange={(e) => setSlotValues({ ...slotValues, [s.slot_key]: e.target.value })}
                      placeholder={s.default_value_en}
                      className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          <pre className="bilingual-code text-xs bg-slate-950/80 p-4 rounded-2xl border border-white/10 text-gray-200 max-h-56 overflow-y-auto leading-relaxed">
            {getLiveCompiledText()}
          </pre>
        </div>
      )}
    </div>
  );
}
