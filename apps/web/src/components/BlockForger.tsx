'use client';

import React, { useState, useEffect } from 'react';
import { Hammer, Copy, Check, Sparkles, Wand2, Sliders } from 'lucide-react';
import { fetchFromApi } from '../lib/api-client';
import { showDynamicToast } from './DynamicIslandToast';

interface ForgeResult {
  modality: string;
  stitched_template: string;
  compiled_text: string;
  slots: Array<{
    slot_key: string;
    label_fa: string;
    default_value?: string;
    default_value_en?: string;
    suggestions?: string[];
  }>;
  resolved_slot_values: Record<string, string>;
}

interface BlockForgerProps {
  initialQuery?: string;
}

const MODALITY_QUICK_IDEAS: Record<string, string[]> = {
  text_writing: [
    'سناریو استوری معرفی دوره آموزشی برای اینستاگرام با قلاب کنجکاوی و دعوت به اقدام',
    'پست لینکدین تحلیلی درباره نقش هوش مصنوعی در افزایش بازدهی کاری و مهارت‌های لازم',
    'متن ایمیل مارکتینگ برای کمپین تخفیف با لحن فوری و جذاب',
    'کپشن اینستاگرام برای معرفی محصول جدید با ایجاد تعامل در کامنت‌ها'
  ],
  text_to_image: [
    'پرتره سینمایی واقع‌گرایانه از یک مهندس در دفتر کار مدرن با نور ملایم طلایی',
    'عکاسی محصول استودیویی با کیفیت بالا از یک فنجان قهوه روی میز چوبی با بخار ملایم',
    'طراحی کاراکتر فانتزی روباه سخنگو با عینک به سبک انیمیشن‌های سه‌بعدی',
    'منظره شهری مدرن در غروب با انعکاس نور چراغ‌ها در خیابان باران‌خورده'
  ],
  code_tech: [
    'طراحی و بهینه‌سازی کوئری در پایگاه داده همراه با شاخص‌ها برای سرعت بالا',
    'کامپوننت فرم واکنش‌گرا و مدرن با اعتبارسنجی ورودی‌ها در ری‌اکت و تایپ‌اسکریپت',
    'پیاده‌سازی تابع محدودکننده نرخ درخواست‌ها برای جلوگیری از اسپم در وب‌سرویس'
  ],
  data_structuring: [
    'فرمول پیشرفته اکسل برای محاسبه پورسانت پلکانی فروشندگان با چند شرط همزمان',
    'جدول بودجه‌بندی ماهانه با تفکیک هزینه‌های ثابت و متغیر و جمع کل خودکار',
    'فرمول پاکسازی و استانداردسازی شماره‌های تماس نامعتبر در گوگل شیتس'
  ]
};

export function BlockForger({ initialQuery = '' }: BlockForgerProps) {
  const [query, setQuery] = useState(initialQuery);
  const [modality, setModality] = useState('text_writing');
  const [forceFarsi, setForceFarsi] = useState(true);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ForgeResult | null>(null);
  const [slotValues, setSlotValues] = useState<Record<string, string>>({});
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (initialQuery) {
      setQuery(initialQuery);
    }
  }, [initialQuery]);

  const handleShuffleIdea = () => {
    const ideas = MODALITY_QUICK_IDEAS[modality] || MODALITY_QUICK_IDEAS['text_writing'];
    const otherIdeas = ideas.filter((i) => i !== query);
    const randomPick = otherIdeas[Math.floor(Math.random() * otherIdeas.length)] || ideas[0];
    setQuery(randomPick);
  };

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
          profile,
          slot_values: slotValues
        })
      });

      setResult(data);
      setSlotValues(data.resolved_slot_values || {});
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
              ایده خود را بنویسید تا سیستم به‌صورت خودکار بلوک‌های استاندارد نقش، وظیفه و قیود را با هم ترکیب کند.
            </p>
          </div>
        </div>

        {/* Shuffle Idea Action */}
        <button
          type="button"
          onClick={handleShuffleIdea}
          className="pressable inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold border border-slate-200/80"
          title="قرار دادن یک ایده نمونه برای این دسته‌بندی"
        >
          <Sparkles className="w-3.5 h-3.5 text-blue-600" />
          <span>ایده تصادفی</span>
        </button>
      </div>

      <form onSubmit={handleForge} className="space-y-4 relative">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-2">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="مثلاً: سناریو معرفی لپ‌تاپ گیمینگ برای استوری اینستاگرام..."
              className="w-full bg-slate-50 border border-slate-200/90 rounded-2xl px-4 py-3 text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
            />
          </div>

          <div>
            <select
              value={modality}
              onChange={(e) => setModality(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200/90 rounded-2xl px-4 py-3 text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-blue-500"
            >
              <option value="text_writing">تولید محتوا و کپشن</option>
              <option value="text_to_image">تولید تصویر (میدجورنی)</option>
              <option value="data_structuring">اکسل و داده</option>
              <option value="code_tech">برنامه‌نویسی و SQL</option>
            </select>
          </div>
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
        <div className="mt-6 pt-6 border-t border-slate-200/80 space-y-4 relative animate-fade-in">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-600 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4" />
              پرامپت مهندسی‌شده آماده اجرا:
            </span>
            <button
              onClick={handleCopy}
              className={`pressable flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold spring-transition ${
                copied ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
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

          {/* Optional Live Slots Editor with clickable suggestions */}
          {result.slots && result.slots.length > 0 && (
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-indigo-700">
                <Sliders className="w-4 h-4" />
                <span>تنظیم و جایگذاری متغیرهای پرامپت:</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {result.slots.map((s) => (
                  <div key={s.slot_key} className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-700">{s.label_fa}</label>
                    <input
                      type="text"
                      value={slotValues[s.slot_key] || ''}
                      onChange={(e) => setSlotValues({ ...slotValues, [s.slot_key]: e.target.value })}
                      placeholder={s.default_value || s.default_value_en || ''}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 shadow-sm"
                    />
                    {s.suggestions && s.suggestions.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-0.5">
                        {s.suggestions.map((sug) => (
                          <button
                            key={sug}
                            type="button"
                            onClick={() => setSlotValues({ ...slotValues, [s.slot_key]: sug })}
                            className="pressable text-[10px] px-2 py-0.5 rounded-lg bg-white border border-slate-200 text-slate-600 hover:text-blue-600 hover:border-blue-300"
                          >
                            {sug}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <pre className="bilingual-code text-xs bg-slate-100 p-4 rounded-2xl border border-slate-200 text-slate-800 max-h-56 overflow-y-auto leading-relaxed">
            {getLiveCompiledText()}
          </pre>
        </div>
      )}
    </div>
  );
}
