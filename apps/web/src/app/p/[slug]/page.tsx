'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { ArrowRight, Copy, Check, Sparkles, HelpCircle, Layers, Sliders, ExternalLink, Brain, Zap } from 'lucide-react';
import { fetchFromApi } from '../../../lib/api-client';
import { PostCopyDrawer } from '../../../components/PostCopyDrawer';
import { AdBanner } from '../../../components/AdBanner';
import { showDynamicToast } from '../../../components/DynamicIslandToast';

interface PromptDetailData {
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
}

export default function PromptDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const resolvedParams = use(params);
  const slug = resolvedParams.slug;

  const [prompt, setPrompt] = useState<PromptDetailData | null>(null);
  const [slotValues, setSlotValues] = useState<Record<string, string>>({});
  const [forceFarsi, setForceFarsi] = useState(true);
  const [compiledText, setCompiledText] = useState('');
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [hasPersonalMemory, setHasPersonalMemory] = useState(false);

  useEffect(() => {
    // Check if personal memory is available in storage
    const cached = localStorage.getItem('promptjoo_user_profile');
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (Object.values(parsed).some(Boolean)) {
          setHasPersonalMemory(true);
        }
      } catch {}
    }

    fetchFromApi<PromptDetailData>(`/api/v1/catalog/prompts/${slug}`)
      .then((data) => {
        setPrompt(data);

        // Load personal memory from localStorage if available
        let profile: Record<string, string> = {};
        if (cached) {
          try {
            profile = JSON.parse(cached);
          } catch {}
        }

        // Initialize slot values with personal profile overrides
        const initialSlots: Record<string, string> = {};
        if (Array.isArray(data.slots_schema_json)) {
          for (const s of data.slots_schema_json) {
            initialSlots[s.slot_key] = profile[s.slot_key] || s.default_value || '';
          }
        }
        setSlotValues(initialSlots);
      })
      .catch(() => {
        setPrompt(null);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [slug]);

  // Live compilation whenever slots change
  useEffect(() => {
    if (!prompt) return;

    fetchFromApi<{ compiled_text: string }>(`/api/v1/catalog/prompts/${prompt.slug}/copy`, {
      method: 'POST',
      body: JSON.stringify({
        slot_values: slotValues,
        force_farsi_output: forceFarsi
      })
    })
      .then((res) => {
        setCompiledText(res.compiled_text);
      })
      .catch(() => {
        // Fallback simple template slot replacement
        let text = prompt.template_en;
        for (const [k, v] of Object.entries(slotValues)) {
          text = text.replace(new RegExp(`\\{\\{${k}\\}\\}`, 'g'), v || '');
        }
        if (forceFarsi && !text.includes('پاسخ را به زبان فارسی روان بنویسید.')) {
          text += '\n\nImportant: لطفا تمام پاسخ را به زبان فارسی روان، شیوا و استاندارد بنویسید.';
        }
        setCompiledText(text);
      });
  }, [prompt, slotValues, forceFarsi]);

  const handleApplyPersonalMemory = () => {
    const cached = localStorage.getItem('promptjoo_user_profile');
    if (!cached) return;
    try {
      const profile = JSON.parse(cached);
      setSlotValues((prev) => ({
        ...prev,
        ...(profile.brand_name ? { brand_name: profile.brand_name } : {}),
        ...(profile.target_audience ? { target_audience: profile.target_audience } : {}),
        ...(profile.brand_tone ? { brand_tone: profile.brand_tone } : {}),
        ...(profile.call_to_action ? { call_to_action: profile.call_to_action } : {}),
      }));
      showDynamicToast({
        title: 'حافظه شخصی جایگذاری شد',
        message: 'متغیرهای برند شما به فرم افزوده شدند',
        type: 'memory'
      });
    } catch {}
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto py-12 space-y-6 animate-pulse">
        <div className="h-6 bg-white/10 rounded-full w-1/3" />
        <div className="h-10 bg-white/10 rounded-full w-3/4" />
        <div className="h-48 bg-white/5 rounded-3xl" />
      </div>
    );
  }

  if (!prompt) {
    return (
      <div className="max-w-md mx-auto py-20 text-center space-y-4">
        <h2 className="text-xl font-bold text-white">پرامپت مورد نظر یافت نشد</h2>
        <p className="text-xs text-gray-400">ممکن است پرامپت حذف شده یا آدرس اشتباه باشد.</p>
        <Link href="/" className="pressable inline-block px-5 py-2.5 bg-blue-600 rounded-2xl text-xs font-bold text-white">
          بازگشت به صفحه اصلی
        </Link>
      </div>
    );
  }

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
  };

  const estimatedTokens = Math.ceil((compiledText || '').length / 4);

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
      {/* Schema.org FAQPage Structured Data */}
      {prompt.faq_schema_json && prompt.faq_schema_json.length > 0 && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'FAQPage',
              mainEntity: prompt.faq_schema_json.map((f) => ({
                '@type': 'Question',
                name: f.question,
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: f.answer,
                },
              })),
            }),
          }}
        />
      )}

      {/* Navigation Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-gray-400">
        <Link href="/" className="hover:text-white spring-transition">صفحه اصلی</Link>
        <span>/</span>
        <span className="text-blue-400">{prompt.category_title_fa || 'دسته‌بندی'}</span>
        <span>/</span>
        <span className="text-gray-300 truncate">{prompt.title_fa}</span>
      </div>

      {/* Header Info Card */}
      <div className="space-y-4">
        <div className="flex items-center gap-2.5 flex-wrap">
          <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
            {prompt.modality}
          </span>
          <span className="text-xs text-gray-400 font-mono" dir="ltr">
            {prompt.copy_count.toLocaleString('fa-IR')} بار کپی شده
          </span>
        </div>

        <h1 className="text-2xl sm:text-4xl font-black text-white leading-tight tracking-tight">
          {prompt.title_fa}
        </h1>

        <p className="text-sm text-gray-300 leading-relaxed max-w-3xl">
          {prompt.short_desc_fa}
        </p>

        {/* Supported Models */}
        {prompt.supported_models && prompt.supported_models.length > 0 && (
          <div className="flex items-center gap-2 pt-1 flex-wrap">
            <span className="text-xs text-gray-400">سازگار با:</span>
            {prompt.supported_models.map((m) => (
              <span key={m} className="text-[11px] uppercase font-mono px-3 py-0.5 rounded-full bg-white/5 text-gray-300 border border-white/10">
                {m}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Interactive Slot Customizer Panel */}
      {prompt.slots_schema_json && prompt.slots_schema_json.length > 0 && (
        <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-white/10 space-y-6">
          <div className="flex items-center justify-between border-b border-white/10 pb-4 flex-wrap gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                <Sliders className="w-4 h-4" />
              </div>
              <h3 className="text-base font-bold text-white">تنظیم و شخصی‌سازی متغیرهای پرامپت</h3>
            </div>

            {hasPersonalMemory && (
              <button
                onClick={handleApplyPersonalMemory}
                className="pressable flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 hover:bg-indigo-500/25"
              >
                <Brain className="w-3.5 h-3.5 text-indigo-400" />
                <span>جایگذاری از حافظه من</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {prompt.slots_schema_json.map((slot) => (
              <div key={slot.slot_key} className="space-y-1.5">
                <label className="block text-xs font-bold text-gray-300">
                  {slot.label_fa} {slot.is_required && <span className="text-red-400">*</span>}
                </label>

                {slot.input_type === 'select' && slot.options ? (
                  <select
                    value={slotValues[slot.slot_key] || ''}
                    onChange={(e) => setSlotValues({ ...slotValues, [slot.slot_key]: e.target.value })}
                    className="w-full bg-slate-900 border border-white/10 rounded-2xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500/60"
                  >
                    {slot.options.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                ) : slot.input_type === 'textarea' ? (
                  <textarea
                    rows={3}
                    value={slotValues[slot.slot_key] || ''}
                    onChange={(e) => setSlotValues({ ...slotValues, [slot.slot_key]: e.target.value })}
                    placeholder={slot.placeholder}
                    className="w-full bg-slate-900 border border-white/10 rounded-2xl px-4 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500/60"
                  />
                ) : (
                  <input
                    type="text"
                    value={slotValues[slot.slot_key] || ''}
                    onChange={(e) => setSlotValues({ ...slotValues, [slot.slot_key]: e.target.value })}
                    placeholder={slot.placeholder}
                    className="w-full bg-slate-900 border border-white/10 rounded-2xl px-4 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500/60"
                  />
                )}
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between pt-2">
            <label className="flex items-center gap-2 text-xs text-gray-300 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={forceFarsi}
                onChange={(e) => setForceFarsi(e.target.checked)}
                className="w-4 h-4 rounded text-blue-600 focus:ring-0 bg-slate-900 border-white/20"
              />
              <span>دستور زبان فارسی روان به انتهای پرامپت الصاق شود</span>
            </label>
          </div>
        </div>
      )}

      {/* Live Bilingual Preview & Copy Action */}
      <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-white/10 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2.5">
            <Sparkles className="w-5 h-5 text-blue-400" />
            <h3 className="text-base font-bold text-white">پیش‌نمایش زنده پرامپت آماده اجرا</h3>
            <span className="text-[11px] text-gray-400 font-mono" dir="ltr">
              (~{estimatedTokens} توکن)
            </span>
          </div>

          <button
            onClick={handleCopyClick}
            className={`pressable flex items-center gap-2 px-6 py-2.5 rounded-2xl text-xs font-bold shadow-lg spring-transition ${
              copied
                ? 'bg-emerald-600 text-white'
                : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/30 border border-blue-400/30'
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

        {/* Bilingual Code Isolation */}
        <pre className="bilingual-code text-xs bg-slate-950/80 p-5 rounded-2xl border border-white/10 text-gray-200 leading-relaxed overflow-x-auto max-h-72">
          {compiledText || prompt.template_en}
        </pre>
      </div>

      {/* Direct Answer Summary for SEO/AIO */}
      {prompt.direct_answer_summary_fa && (
        <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-white/10 space-y-3">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Layers className="w-4 h-4 text-emerald-400" />
            راهنمای کاربردی و پاسخ مستقیم
          </h3>
          <p className="text-xs text-gray-300 leading-relaxed">
            {prompt.direct_answer_summary_fa}
          </p>
        </div>
      )}

      {/* FAQ Accordion */}
      {prompt.faq_schema_json && prompt.faq_schema_json.length > 0 && (
        <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-white/10 space-y-4">
          <h3 className="text-base font-bold text-white flex items-center gap-2 mb-2">
            <HelpCircle className="w-5 h-5 text-amber-400" />
            پرسش‌های متداول درباره این پرامپت
          </h3>

          <div className="space-y-3">
            {prompt.faq_schema_json.map((faq, idx) => (
              <div key={idx} className="p-4 rounded-2xl bg-white/5 border border-white/5 space-y-1.5">
                <h4 className="text-xs font-bold text-white">{faq.question}</h4>
                <p className="text-xs text-gray-400 leading-relaxed">{faq.answer}</p>
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
