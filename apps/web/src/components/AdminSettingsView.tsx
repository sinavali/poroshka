'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams, useParams } from 'next/navigation';
import {
  Cpu,
  Key,
  Globe,
  Sliders,
  CheckCircle2,
  AlertCircle,
  Zap,
  Sparkles,
  Layers,
  Save,
  RotateCw,
  Eye,
  EyeOff,
  Server,
  Megaphone,
  Radio,
  ExternalLink,
  Code
} from 'lucide-react';
import { fetchFromApi } from '../lib/api-client';
import { showDynamicToast } from './DynamicIslandToast';
import {
  type LlmConfigState,
  PROVIDER_OPTIONS
} from './admin-ingestion-types';
import { AdminEmbeddingTab } from './AdminEmbeddingTab';
import { AdminGeneralSettingsTab } from './AdminGeneralSettingsTab';
import { AdminAdsTab } from './AdminAdsTab';

interface AdminSettingsViewProps {
  isOperator?: boolean;
}

export function AdminSettingsView({ isOperator = false }: AdminSettingsViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const params = useParams();

  const rawSlug = params?.slug;
  const slug = Array.isArray(rawSlug) ? rawSlug : rawSlug ? [rawSlug] : [];
  const pathSection = slug[0] === 'settings' && slug[1] ? slug[1] : null;

  const urlSection = (pathSection || searchParams.get('settings_section') || searchParams.get('section')) as 'platform' | 'ads' | 'llm' | 'embedding' | null;
  const initialSection = urlSection && ['platform', 'ads', 'llm', 'embedding'].includes(urlSection) ? urlSection : 'ads';

  const [loading, setLoading] = useState(false);
  const [activeTabSection, setActiveTabSection] = useState<'platform' | 'ads' | 'llm' | 'embedding'>(initialSection);

  useEffect(() => {
    if (urlSection && ['platform', 'ads', 'llm', 'embedding'].includes(urlSection)) {
      setActiveTabSection(urlSection);
    }
  }, [urlSection]);

  const handleSectionChange = (section: 'platform' | 'ads' | 'llm' | 'embedding') => {
    setActiveTabSection(section);
    router.push(`/admin/settings/${section}`);
  };

  // LLM Engine Configuration State
  const [savingLlm, setSavingLlm] = useState(false);
  const [testingLlm, setTestingLlm] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [llmConfig, setLlmConfig] = useState<LlmConfigState>({
    provider: 'avalai',
    api_key: '',
    base_url: 'https://api.avalai.ir/v1',
    model: 'deepseek-v4.1-flash',
    temperature: 0.2,
    max_tokens: 4000,
    timeout_seconds: 60,
    is_active: true
  });

  // Load LLM Config from system_settings
  const loadLlmConfig = async () => {
    try {
      const data = await fetchFromApi<LlmConfigState>('/api/v1/ingestion/bulk/llm-config');
      if (data) {
        setLlmConfig({
          provider: data.provider || 'avalai',
          api_key: data.api_key || '',
          base_url: data.base_url || 'https://api.avalai.ir/v1',
          model: data.model || 'deepseek-v4.1-flash',
          temperature: typeof data.temperature === 'number' ? data.temperature : 0.2,
          max_tokens: typeof data.max_tokens === 'number' ? data.max_tokens : 4000,
          timeout_seconds: typeof data.timeout_seconds === 'number' ? data.timeout_seconds : 60,
          is_active: data.is_active !== false
        });
      }
    } catch {}
  };

  useEffect(() => {
    setLoading(true);
    loadLlmConfig().finally(() => setLoading(false));
  }, []);

  const handleProviderChange = (providerId: LlmConfigState['provider']) => {
    const preset = PROVIDER_OPTIONS.find((p) => p.id === providerId);
    setLlmConfig((prev) => ({
      ...prev,
      provider: providerId,
      base_url: preset?.defaultBaseUrl || prev.base_url,
      model: preset?.defaultModel || prev.model
    }));
  };

  const handleSaveLlm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isOperator) {
      showDynamicToast({ title: 'خطا', message: 'اپراتورها دسترسی ویرایش تنظیمات را ندارند.', type: 'error' });
      return;
    }

    setSavingLlm(true);
    try {
      await fetchFromApi('/api/v1/ingestion/bulk/llm-config', {
        method: 'POST',
        body: JSON.stringify(llmConfig)
      });
      showDynamicToast({
        title: 'تنظیمات هوش مصنوعی ذخیره شد',
        message: `موتور ${llmConfig.provider} با مدل ${llmConfig.model} فعال گردید.`,
        type: 'success'
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'خطا در ذخیره تنظیمات';
      showDynamicToast({ title: 'خطا در ذخیره‌سازی', message: msg, type: 'error' });
    } finally {
      setSavingLlm(false);
    }
  };

  const handleTestLlm = async () => {
    setTestingLlm(true);
    try {
      const res = await fetchFromApi<{
        ok: boolean;
        latency_ms: number;
        model: string;
        message: string;
        reply_preview?: string;
        error?: string;
      }>('/api/v1/ingestion/bulk/test-connection', {
        method: 'POST',
        body: JSON.stringify(llmConfig)
      });

      if (res.ok) {
        showDynamicToast({
          title: 'اتصال موفقیت‌آمیز بود',
          message: `پاسخ از ${res.model} با تاخیر ${res.latency_ms}ms دریافت شد.`,
          type: 'success'
        });
      } else {
        showDynamicToast({
          title: 'خطا در برقراری ارتباط',
          message: res.error || 'پاسخ معتبری از هوش مصنوعی دریافت نشد.',
          type: 'error'
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'خطا در تست اتصال';
      showDynamicToast({ title: 'خطا در ارتباط', message: msg, type: 'error' });
    } finally {
      setTestingLlm(false);
    }
  };

  if (loading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center space-y-3">
        <div className="w-8 h-8 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin" />
        <p className="text-xs text-slate-500 font-medium">در حال بارگذاری مرکز تنظیمات یکپارچه سیستم...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in" dir="rtl">
      {/* Settings Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200/80 pb-3 overflow-x-auto">
        <button
          onClick={() => handleSectionChange('platform')}
          className={`pressable flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-bold transition-all ${
            activeTabSection === 'platform'
              ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/60'
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>تنظیمات عمومی، پشتیبانی و ارتباطات</span>
        </button>

        <button
          onClick={() => handleSectionChange('ads')}
          className={`pressable flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-bold transition-all ${
            activeTabSection === 'ads'
              ? 'bg-amber-600 text-white shadow-md shadow-amber-600/20'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/60'
          }`}
        >
          <Megaphone className="w-4 h-4" />
          <span>تبلیغات یکتانت (Yektanet)</span>
        </button>

        <button
          onClick={() => handleSectionChange('llm')}
          className={`pressable flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-bold transition-all ${
            activeTabSection === 'llm'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/60'
          }`}
        >
          <Cpu className="w-4 h-4" />
          <span>موتورهای هوش مصنوعی (LLM)</span>
        </button>

        <button
          onClick={() => handleSectionChange('embedding')}
          className={`pressable flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-bold transition-all ${
            activeTabSection === 'embedding'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/60'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>موتور وکتور امبدینگ</span>
        </button>
      </div>

      {/* 1. LLM CONFIGURATION SECTION */}
      {activeTabSection === 'llm' && (
        <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-600 flex items-center justify-center shadow-xs">
                <Cpu className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-black text-slate-900 tracking-tight">
                    تنظیمات موتورهای زبانی هوش مصنوعی (LLM Engine)
                  </h3>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                    {llmConfig.provider.toUpperCase()}
                  </span>
                </div>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  ارائه‌دهنده فعال برای استخراج خودکار متغیرها، ترجمه طبیعی به فارسی و دسته‌بندی پرامپت‌ها
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleTestLlm}
              disabled={testingLlm || isOperator}
              className="pressable flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 shadow-xs disabled:opacity-50"
            >
              {testingLlm ? (
                <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
              ) : (
                <Zap className="w-4 h-4 text-amber-500" />
              )}
              <span>تست اتصال زنده</span>
            </button>
          </div>

          <form onSubmit={handleSaveLlm} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {PROVIDER_OPTIONS.map((opt) => {
                const isSelected = llmConfig.provider === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => handleProviderChange(opt.id)}
                    className={`p-4 rounded-2xl border text-right transition-all flex flex-col justify-between ${
                      isSelected
                        ? 'border-indigo-600 bg-indigo-50/50 shadow-xs'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full mb-1">
                      <span className="text-xs font-black text-slate-900">{opt.label}</span>
                      {isSelected && <CheckCircle2 className="w-4 h-4 text-indigo-600" />}
                    </div>
                    <span className="text-[11px] text-slate-500 line-clamp-2">{opt.sublabel}</span>
                  </button>
                );
              })}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-slate-400" />
                  <span>کلید دسترسی (API Key / Token)</span>
                </label>
                <div className="relative">
                  <input
                    type={showApiKey ? 'text' : 'password'}
                    value={llmConfig.api_key}
                    onChange={(e) => setLlmConfig({ ...llmConfig, api_key: e.target.value })}
                    placeholder="aa-..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 font-mono text-xs text-slate-800 pr-10 focus:bg-white transition-colors"
                    dir="ltr"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[11px] text-slate-400">توکن حساب کاربری AvalAI یا کلید احراز هویت سرویس اختصاصی</p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-slate-400" />
                  <span>آدرس پایه سرور (Base URL)</span>
                </label>
                <input
                  type="url"
                  value={llmConfig.base_url}
                  onChange={(e) => setLlmConfig({ ...llmConfig, base_url: e.target.value })}
                  placeholder="https://api.avalai.ir/v1"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 font-mono text-xs text-slate-800 focus:bg-white transition-colors"
                  dir="ltr"
                  required
                />
                <p className="text-[11px] text-slate-400">آدرس اندپوینت OpenAI-compatible ارائه‌دهنده</p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Server className="w-3.5 h-3.5 text-slate-400" />
                  <span>نام مدل (Model Name)</span>
                </label>
                <input
                  type="text"
                  value={llmConfig.model}
                  onChange={(e) => setLlmConfig({ ...llmConfig, model: e.target.value })}
                  placeholder="deepseek-v4.1-flash"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 font-mono text-xs text-slate-800 focus:bg-white transition-colors"
                  dir="ltr"
                  required
                />
                <p className="text-[11px] text-slate-400">مدل پیش‌فرض: deepseek-v4.1-flash با عملکرد بالا در زبان فارسی</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">دمای خلاقیت (Temp)</label>
                  <input
                    type="number"
                    step="0.05"
                    min="0"
                    max="1"
                    value={llmConfig.temperature}
                    onChange={(e) => setLlmConfig({ ...llmConfig, temperature: parseFloat(e.target.value) || 0.2 })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 font-mono text-xs text-slate-800 focus:bg-white"
                    dir="ltr"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">سقف توکن خروجی</label>
                  <input
                    type="number"
                    value={llmConfig.max_tokens}
                    onChange={(e) => setLlmConfig({ ...llmConfig, max_tokens: parseInt(e.target.value, 10) || 4000 })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 font-mono text-xs text-slate-800 focus:bg-white"
                    dir="ltr"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end pt-4 border-t border-slate-100">
              <button
                type="submit"
                disabled={savingLlm || isOperator}
                className="pressable flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 shadow-md shadow-indigo-600/25 disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{savingLlm ? 'در حال ذخیره‌سازی...' : 'ذخیره و فعال‌سازی تنظیمات موتور هوش مصنوعی'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 2. VECTOR EMBEDDING SECTION */}
      {activeTabSection === 'embedding' && (
        <AdminEmbeddingTab isOperator={isOperator} />
      )}

      {/* 3. UNIFIED YEKTANET ADS GOVERNANCE */}
      {activeTabSection === 'ads' && (
        <AdminAdsTab isOperator={isOperator} />
      )}

      {/* 4. PLATFORM, SECURITY, SMS & PIPELINE SECTION */}
      {activeTabSection === 'platform' && (
        <AdminGeneralSettingsTab isOperator={isOperator} />
      )}
    </div>
  );
}
