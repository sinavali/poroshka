'use client';

import React, { useState, useEffect } from 'react';
import { Sparkles, Brain, Search, X } from 'lucide-react';
import { MemoryProfile } from './PersonalMemoryModal';
import { PromptSearchCarousel } from './PromptSearchCarousel';
import { StyledSelect } from './StyledSelect';

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
          if (parsed.length === 1) {
            setSelectedMemoryId(parsed[0].id);
          } else {
            const activeId = localStorage.getItem('promptjoo_active_memory_id');
            if (activeId && parsed.some((p: MemoryProfile) => p.id === activeId)) {
              setSelectedMemoryId(activeId);
            }
          }
          return;
        }
      }
    } catch {}
    setMemoryProfiles([]);
    setSelectedMemoryId('none');
  };

  useEffect(() => {
    loadMemories();
    const handleUpdate = () => loadMemories();
    window.addEventListener('poroshka:memory-updated', handleUpdate);
    window.addEventListener('promptjoo_memory_updated', handleUpdate);
    return () => {
      window.removeEventListener('poroshka:memory-updated', handleUpdate);
      window.removeEventListener('promptjoo_memory_updated', handleUpdate);
    };
  }, []);

  useEffect(() => {
    if (initialQuery !== undefined) {
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
    if (memId !== 'none') {
      localStorage.setItem('promptjoo_active_memory_id', memId);
    } else {
      localStorage.removeItem('promptjoo_active_memory_id');
    }
  };

  return (
    <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-xl space-y-6 relative overflow-hidden">
      {/* Decorative ambient gradient */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl pointer-events-none -z-10" />

      {/* Header with Title & Idea Shuffler */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold text-blue-600 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-500" />
              موتور جستجو و کشف شباهت پرامپت‌ها
            </span>
          </div>
          <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            ایده یا نیاز خود را بنویسید تا نزدیک‌ترین پرامپت‌ها پیدا شوند
          </h3>
        </div>

        <button
          type="button"
          onClick={handleShuffleIdea}
          className="pressable flex items-center gap-2 px-3.5 py-1.5 rounded-2xl bg-slate-100 hover:bg-slate-200/80 text-slate-700 text-xs font-bold spring-transition border border-slate-200/70"
          title="ایده رندوم بعدی"
        >
          <Sparkles className="w-3.5 h-3.5 text-blue-600" />
          <span>پیشنهاد ایده تصادفی</span>
        </button>
      </div>

      {/* Search Input Box */}
      <div className="space-y-3">
        <div className="relative">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="مثلاً: سناریو استوری معرفی دوره، پرتره سینمایی واقع‌گرایانه، فرمول پیشرفته اکسل..."
            className="w-full bg-white border border-slate-300 rounded-2xl py-3.5 pr-11 pl-10 text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-500/15 shadow-xs spring-transition font-medium"
          />
          <Search className="w-5 h-5 text-slate-400 absolute right-3.5 top-3.5 pointer-events-none" />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="pressable p-1 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 absolute left-3 top-3.5"
              title="پاک کردن متن"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Personal Memory Context Selector */}
        <div className="flex items-center justify-between gap-3 p-2.5 bg-slate-50/80 border border-slate-200/70 rounded-2xl flex-wrap">
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
                    ? 'کلیک برای غیرفعال‌سازی حافظه در این جستجو'
                    : 'کلیک برای فعال‌سازی حافظه در این جستجو'
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
            </div>
          ) : memoryProfiles.length > 1 ? (
            <div className="flex items-center gap-2 min-w-[200px]">
              <Brain className="w-4 h-4 text-indigo-600 flex-shrink-0" />
              <span className="text-xs font-bold text-slate-700 whitespace-nowrap">حافظه شخصی:</span>
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
      </div>

      {/* Top 12 Closest Similar Results Carousel */}
      <div className="pt-2">
        <PromptSearchCarousel query={query} />
      </div>
    </div>
  );
}
