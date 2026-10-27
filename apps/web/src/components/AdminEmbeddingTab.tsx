'use client';

import React, { useState, useEffect } from 'react';
import {
  Layers,
  Key,
  Globe,
  Sliders,
  CheckCircle2,
  AlertCircle,
  Save,
  RotateCw,
  Eye,
  EyeOff,
  Sparkles,
  Server,
  Zap,
  Radio
} from 'lucide-react';
import { fetchFromApi } from '../lib/api-client';
import { showDynamicToast } from './DynamicIslandToast';
import { type EmbeddingProfileUI, AdminEmbeddingProfilesModal } from './AdminEmbeddingProfilesModal';

export interface EmbeddingProviderPreset {
  id: string;
  name: string;
  base_url: string;
  model: string;
  dimensions: number;
  auth_header_format: 'raw' | 'bearer' | 'apikey_prefix' | 'bearer_dpn_sk';
  max_batch_size: number;
}

export const EMBEDDING_PRESETS: Record<string, EmbeddingProviderPreset> = {
  deapi: {
    id: 'deapi-bge-m3',
    name: 'deAPI (Bge_M3_FP16)',
    base_url: 'https://oai.deapi.ai/v1',
    model: 'Bge_M3_FP16',
    dimensions: 1024,
    auth_header_format: 'bearer_dpn_sk',
    max_batch_size: 10
  },
  arvancloud: {
    id: 'arvancloud-bge-m3',
    name: 'ArvanCloud AIaaS (Bge-m3)',
    base_url: 'https://api.arvancloudai.ir/v1',
    model: 'Bge-m3',
    dimensions: 1024,
    auth_header_format: 'raw',
    max_batch_size: 20
  },
  avalai: {
    id: 'avalai-text-embedding-3',
    name: 'AvalAI (text-embedding-3-small)',
    base_url: 'https://api.avalai.ir/v1',
    model: 'text-embedding-3-small',
    dimensions: 1024,
    auth_header_format: 'bearer',
    max_batch_size: 20
  },
  openai: {
    id: 'openai-text-embedding-3',
    name: 'OpenAI (text-embedding-3-small)',
    base_url: 'https://api.openai.com/v1',
    model: 'text-embedding-3-small',
    dimensions: 1024,
    auth_header_format: 'bearer',
    max_batch_size: 20
  },
  ollama: {
    id: 'ollama-bge-m3',
    name: 'Ollama Local (bge-m3)',
    base_url: 'http://localhost:11434/v1',
    model: 'bge-m3',
    dimensions: 1024,
    auth_header_format: 'raw',
    max_batch_size: 10
  },
  custom: {
    id: 'custom-embedding',
    name: 'Custom Endpoint',
    base_url: '',
    model: 'custom-embedding-model',
    dimensions: 1024,
    auth_header_format: 'bearer',
    max_batch_size: 10
  }
};

interface AdminEmbeddingTabProps {
  isOperator?: boolean;
}

export function AdminEmbeddingTab({ isOperator = false }: AdminEmbeddingTabProps) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [profiles, setProfiles] = useState<EmbeddingProfileUI[]>([]);
  const [activeProfileId, setActiveProfileId] = useState<string>('deapi-bge-m3');
  const [selectedProviderKey, setSelectedProviderKey] = useState<string>('deapi');

  // Active form state for inline editing
  const [formProfile, setFormProfile] = useState<EmbeddingProfileUI>({
    id: 'deapi-bge-m3',
    name: 'deAPI (Bge_M3_FP16)',
    provider_type: 'openai_compatible',
    base_url: 'https://oai.deapi.ai/v1',
    api_key: '',
    auth_header_format: 'bearer_dpn_sk',
    model: 'Bge_M3_FP16',
    dimensions: 1024,
    max_batch_size: 10,
    is_active: true
  });

  const loadProfiles = async () => {
    setLoading(true);
    try {
      const data = await fetchFromApi<{
        active_profile_id: string;
        profiles: EmbeddingProfileUI[];
      }>('/api/v1/admin/embedding-profiles');

      if (data && Array.isArray(data.profiles) && data.profiles.length > 0) {
        setProfiles(data.profiles);
        const activeId = data.active_profile_id || data.profiles[0].id;
        setActiveProfileId(activeId);

        const currentActive = data.profiles.find((p) => p.id === activeId) || data.profiles[0];
        setFormProfile(currentActive);

        // Detect preset key
        const matchKey = Object.keys(EMBEDDING_PRESETS).find(
          (k) => EMBEDDING_PRESETS[k].id === currentActive.id || currentActive.base_url.includes(k)
        );
        setSelectedProviderKey(matchKey || 'custom');
      }
    } catch (err: unknown) {
      showDynamicToast({ title: 'خطا در بارگذاری پروفایل‌های امبدینگ', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfiles();
  }, []);

  const handleProviderChange = (key: string) => {
    setSelectedProviderKey(key);
    const preset = EMBEDDING_PRESETS[key];
    if (preset) {
      setFormProfile((prev) => ({
        ...prev,
        id: preset.id,
        name: preset.name,
        base_url: preset.base_url || prev.base_url,
        model: preset.model,
        dimensions: preset.dimensions,
        auth_header_format: preset.auth_header_format,
        max_batch_size: preset.max_batch_size
      }));
    }
  };

  const handleTestConnection = async () => {
    setTesting(true);
    try {
      const res = await fetchFromApi<{
        success: boolean;
        latency_ms: number;
        dimensions: number;
        status_code?: number;
        error?: string;
      }>('/api/v1/admin/embedding-profiles/test', {
        method: 'POST',
        body: JSON.stringify(formProfile)
      });

      if (res.success) {
        showDynamicToast({
          title: 'اتصال سرویس امبدینگ با موفقیت برقرار شد',
          message: `زمان پاسخ: ${res.latency_ms}ms | ابعاد وکتور: ${res.dimensions}-d`,
          type: 'success'
        });
      } else {
        showDynamicToast({
          title: 'خطا در تست اتصال امبدینگ',
          message: res.error || `کد خطا: ${res.status_code || 500}`,
          type: 'error'
        });
      }
    } catch (err: unknown) {
      showDynamicToast({
        title: 'خطا در برقراری ارتباط با سرور امبدینگ',
        message: err instanceof Error ? err.message : '',
        type: 'error'
      });
    } finally {
      setTesting(false);
    }
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isOperator) {
      showDynamicToast({ title: 'خطا', message: 'اپراتورها دسترسی ذخیره تنظیمات امبدینگ را ندارند.', type: 'error' });
      return;
    }

    setSaving(true);
    try {
      // Merge active profile into profile list
      const existing = profiles.filter((p) => p.id !== formProfile.id);
      const updatedProfiles = [
        ...existing.map((p) => ({ ...p, is_active: false })),
        { ...formProfile, is_active: true }
      ];

      await fetchFromApi('/api/v1/admin/embedding-profiles', {
        method: 'PUT',
        body: JSON.stringify({
          active_profile_id: formProfile.id,
          profiles: updatedProfiles
        })
      });

      setActiveProfileId(formProfile.id);
      setProfiles(updatedProfiles);

      showDynamicToast({
        title: 'تنظیمات موتور وکتور ذخیره شد',
        message: `پروفایل ${formProfile.name} به عنوان ارائه‌دهنده فعال ذخیره گردید.`,
        type: 'success'
      });
    } catch (err: unknown) {
      showDynamicToast({
        title: 'خطا در ذخیره‌سازی موتور وکتور',
        message: err instanceof Error ? err.message : '',
        type: 'error'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleQuickSwitch = async (profileId: string) => {
    if (isOperator) return;
    const target = profiles.find((p) => p.id === profileId);
    if (!target) return;

    try {
      const updated = profiles.map((p) => ({ ...p, is_active: p.id === profileId }));
      await fetchFromApi('/api/v1/admin/embedding-profiles', {
        method: 'PUT',
        body: JSON.stringify({ active_profile_id: profileId, profiles: updated })
      });
      setActiveProfileId(profileId);
      setFormProfile(target);
      setProfiles(updated);
      showDynamicToast({
        title: 'موتور وکتور تغییر یافت',
        message: `سرویس فعال به ${target.name} تغییر یافت.`,
        type: 'success'
      });
    } catch (err: unknown) {
      showDynamicToast({ title: 'خطا در تغییر پروفایل', type: 'error' });
    }
  };

  if (loading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center space-y-3">
        <RotateCw className="w-8 h-8 text-blue-600 animate-spin" />
        <p className="text-xs text-slate-500 font-medium">در حال بارگذاری تنظیمات موتور امبدینگ...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-sm space-y-6 bg-white">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center shadow-xs">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900 tracking-tight">تنظیمات موتور وکتور امبدینگ (Vector Embedding)</h3>
              <p className="text-xs text-slate-500">پیکربندی ارائه‌دهنده فعال، کلید API و پارامترهای وکتورایزیشن ۱۰۲۴ بُعدی</p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="pressable px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center gap-2 border border-slate-200/80 transition"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>مدیریت پیشرفته پروفایل‌ها</span>
          </button>
        </div>

        {/* Quick Profile Selection Pills */}
        <div className="space-y-2">
          <span className="text-xs font-bold text-slate-700 block">انتخاب سریع سرویس‌دهنده وکتور:</span>
          <div className="flex flex-wrap gap-2">
            {Object.entries(EMBEDDING_PRESETS).map(([key, p]) => {
              const isSelected = selectedProviderKey === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => handleProviderChange(key)}
                  className={`pressable px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/20'
                      : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  <Server className="w-3 h-3" />
                  <span>{p.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Inline Embedding Form */}
        <form onSubmit={handleSaveConfig} className="space-y-4 pt-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">نام سرویس / پروفایل</label>
              <input
                type="text"
                value={formProfile.name}
                onChange={(e) => setFormProfile({ ...formProfile, name: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800"
                required
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">فرمت احراز هویت (Auth Format)</label>
              <select
                value={formProfile.auth_header_format}
                onChange={(e) => setFormProfile({ ...formProfile, auth_header_format: e.target.value as any })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800"
              >
                <option value="bearer_dpn_sk">Bearer dpn-sk- (مخصوص deAPI)</option>
                <option value="bearer">Bearer &lt;token&gt; (استاندارد OpenAI / AvalAI)</option>
                <option value="raw">مستقیم و خام (مثل apikey UUID در آروان)</option>
                <option value="apikey_prefix">پیشوند خودکار apikey</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block font-bold text-slate-700 mb-1">آدرس سرور پایه (Base URL)</label>
              <input
                type="url"
                value={formProfile.base_url}
                onChange={(e) => setFormProfile({ ...formProfile, base_url: e.target.value })}
                placeholder="https://oai.deapi.ai/v1"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-mono text-slate-800"
                dir="ltr"
                required
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block font-bold text-slate-700 mb-1">کلید دسترسی (API Key)</label>
              <div className="relative">
                <input
                  type={showApiKey ? 'text' : 'password'}
                  value={formProfile.api_key}
                  onChange={(e) => setFormProfile({ ...formProfile, api_key: e.target.value })}
                  placeholder="dpn-sk-... یا sk-..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 pl-9 font-mono text-slate-800"
                  dir="ltr"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute left-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                >
                  {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">نام مدل امبدینگ (Model)</label>
              <input
                type="text"
                value={formProfile.model}
                onChange={(e) => setFormProfile({ ...formProfile, model: e.target.value })}
                placeholder="Bge_M3_FP16 یا Bge-m3"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-mono text-slate-800"
                dir="ltr"
                required
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">تعداد دسته‌ای بهینه (Max Batch Size)</label>
              <input
                type="number"
                min={1}
                max={50}
                value={formProfile.max_batch_size || 10}
                onChange={(e) => setFormProfile({ ...formProfile, max_batch_size: parseInt(e.target.value, 10) || 10 })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-mono text-slate-800"
                dir="ltr"
                required
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-slate-100 flex-wrap gap-3">
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={testing || !formProfile.base_url || !formProfile.api_key}
              className="pressable px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition disabled:opacity-50"
            >
              <RotateCw className={`w-3.5 h-3.5 ${testing ? 'animate-spin' : ''}`} />
              <span>{testing ? 'در حال آزمون ارتباط...' : 'تست اتصال زنده'}</span>
            </button>

            <button
              type="submit"
              disabled={saving || isOperator}
              className="pressable px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-2 shadow-sm shadow-blue-600/20 transition disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{saving ? 'در حال ذخیره‌سازی...' : 'ذخیره و فعال‌سازی سرویس امبدینگ'}</span>
            </button>
          </div>
        </form>
      </div>

      <AdminEmbeddingProfilesModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSaved={loadProfiles}
      />
    </div>
  );
}
