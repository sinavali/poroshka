'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Cpu,
  CheckCircle2,
  AlertCircle,
  Plus,
  Trash2,
  Zap,
  Activity,
  Layers,
  Sparkles,
  Server,
  Key,
  Globe,
  SlidersHorizontal,
  RotateCw
} from 'lucide-react';
import { fetchFromApi } from '../lib/api-client';
import { showDynamicToast } from './DynamicIslandToast';

export interface EmbeddingProfileUI {
  id: string;
  name: string;
  provider_type: 'openai_compatible' | 'custom';
  base_url: string;
  api_key: string;
  auth_header_format: 'raw' | 'bearer' | 'apikey_prefix' | 'bearer_dpn_sk';
  model: string;
  dimensions: number;
  max_batch_size: number;
  context_window?: number;
  custom_headers?: Record<string, string>;
  is_active: boolean;
}

interface AdminEmbeddingProfilesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

export function AdminEmbeddingProfilesModal({ isOpen, onClose, onSaved }: AdminEmbeddingProfilesModalProps) {
  const [profiles, setProfiles] = useState<EmbeddingProfileUI[]>([]);
  const [activeProfileId, setActiveProfileId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, {
    success: boolean;
    latency_ms: number;
    dimensions: number;
    status_code?: number;
    error?: string;
  }>>({});

  const [editingProfile, setEditingProfile] = useState<EmbeddingProfileUI | null>(null);
  const [customHeadersText, setCustomHeadersText] = useState('{}');

  const loadProfiles = async () => {
    setLoading(true);
    try {
      const data = await fetchFromApi<{
        active_profile_id: string;
        profiles: EmbeddingProfileUI[];
      }>('/api/v1/admin/embedding-profiles');

      if (data && Array.isArray(data.profiles)) {
        setProfiles(data.profiles);
        setActiveProfileId(data.active_profile_id || data.profiles[0]?.id || '');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'خطا در بارگذاری پروفایل‌های امبدینگ';
      showDynamicToast({ title: 'خطا', message: msg, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadProfiles();
    } else {
      setEditingProfile(null);
      setTestResults({});
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !saving) onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', handleKey);
    };
  }, [isOpen, saving, onClose]);

  if (!isOpen) return null;

  const handleSetActive = async (id: string) => {
    setActiveProfileId(id);
    const updated = profiles.map((p) => ({ ...p, is_active: p.id === id }));
    setProfiles(updated);
    try {
      await fetchFromApi('/api/v1/admin/embedding-profiles', {
        method: 'PUT',
        body: JSON.stringify({ active_profile_id: id, profiles: updated })
      });
      showDynamicToast({
        title: 'ارائه‌دهنده فعال تغییر یافت',
        message: `پروفایل ${profiles.find((p) => p.id === id)?.name || id} انتخاب شد.`,
        type: 'success'
      });
      if (onSaved) onSaved();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'خطا در ذخیره';
      showDynamicToast({ title: 'خطا', message: msg, type: 'error' });
    }
  };

  const handleTestProfile = async (profile: EmbeddingProfileUI) => {
    setTestingId(profile.id);
    try {
      const res = await fetchFromApi<{
        success: boolean;
        latency_ms: number;
        dimensions: number;
        status_code?: number;
        error?: string;
      }>('/api/v1/admin/embedding-profiles/test', {
        method: 'POST',
        body: JSON.stringify(profile)
      });

      setTestResults((prev) => ({ ...prev, [profile.id]: res }));

      if (res.success) {
        showDynamicToast({
          title: 'تست موفقیت‌آمیز بود',
          message: `${profile.name} با تاخیر ${res.latency_ms}ms و ابعاد ${res.dimensions} پاسخ داد.`,
          type: 'success'
        });
      } else {
        showDynamicToast({
          title: 'خطا در تست اتصال',
          message: res.error || 'پاسخ نامعتبر از ارائه‌دهنده',
          type: 'error'
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'خطا در تست';
      setTestResults((prev) => ({
        ...prev,
        [profile.id]: { success: false, latency_ms: 0, dimensions: 0, error: msg }
      }));
      showDynamicToast({ title: 'خطا در برقراری ارتباط', message: msg, type: 'error' });
    } finally {
      setTestingId(null);
    }
  };

  const handleOpenAdd = () => {
    const newId = `custom-profile-${Date.now().toString().slice(-4)}`;
    setEditingProfile({
      id: newId,
      name: 'پروفایل امبدینگ جدید',
      provider_type: 'openai_compatible',
      base_url: 'https://api.example.com/v1',
      api_key: '',
      auth_header_format: 'bearer',
      model: 'Bge-m3',
      dimensions: 1024,
      max_batch_size: 50,
      context_window: 8192,
      custom_headers: {},
      is_active: false
    });
    setCustomHeadersText('{}');
  };

  const handleOpenEdit = (profile: EmbeddingProfileUI) => {
    setEditingProfile({ ...profile });
    setCustomHeadersText(JSON.stringify(profile.custom_headers || {}, null, 2));
  };

  const handleDeleteProfile = async (id: string) => {
    if (profiles.length <= 1) {
      showDynamicToast({ title: 'خطا', message: 'حداقل یک پروفایل باید در سیستم باقی بماند.', type: 'error' });
      return;
    }
    if (id === activeProfileId) {
      showDynamicToast({ title: 'خطا', message: 'نمی‌توانید پروفایل فعال جاری را حذف کنید. ابتدا پروفایل دیگری را فعال نمایید.', type: 'error' });
      return;
    }

    const updated = profiles.filter((p) => p.id !== id);
    setProfiles(updated);

    try {
      await fetchFromApi('/api/v1/admin/embedding-profiles', {
        method: 'PUT',
        body: JSON.stringify({ active_profile_id: activeProfileId, profiles: updated })
      });
      showDynamicToast({ title: 'پروفایل با موفقیت حذف شد', type: 'success' });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'خطا در حذف';
      showDynamicToast({ title: 'خطا', message: msg, type: 'error' });
    }
  };

  const handleSaveEditingProfile = async () => {
    if (!editingProfile) return;

    let parsedHeaders: Record<string, string> = {};
    try {
      parsedHeaders = JSON.parse(customHeadersText);
    } catch {
      showDynamicToast({ title: 'فرمت هدرهای سفارشی نامعتبر است', message: 'لطفاً هدرها را به فرمت معتبر JSON وارد نمایید.', type: 'error' });
      return;
    }

    const cleaned: EmbeddingProfileUI = {
      ...editingProfile,
      base_url: (editingProfile.base_url).trim(),
      api_key: (editingProfile.api_key).trim(),
      model: (editingProfile.model).trim(),
      custom_headers: parsedHeaders
    };

    const exists = profiles.some((p) => p.id === cleaned.id);
    const updated = exists
      ? profiles.map((p) => (p.id === cleaned.id ? cleaned : p))
      : [...profiles, cleaned];

    setSaving(true);
    try {
      await fetchFromApi('/api/v1/admin/embedding-profiles', {
        method: 'PUT',
        body: JSON.stringify({
          active_profile_id: activeProfileId || cleaned.id,
          profiles: updated
        })
      });

      setProfiles(updated);
      setEditingProfile(null);
      showDynamicToast({ title: 'پروفایل امبدینگ با موفقیت ذخیره شد', type: 'success' });
      if (onSaved) onSaved();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'خطا در ذخیره';
      showDynamicToast({ title: 'خطا در ذخیره', message: msg, type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget && !saving) onClose();
      }}
    >
      <div
        className="glass-panel w-full max-w-4xl max-h-[90vh] flex flex-col rounded-3xl border border-slate-200/90 shadow-2xl bg-white overflow-hidden animate-scale-in"
        dir="rtl"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-100 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600 shadow-xs">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900">
                پیکربندی پروفایل‌های ارائه‌دهنده امبدینگ (AI Embedding Profiles)
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                مدیریت داینامیک سرویس‌های وکتورایزیشن (ArvanCloud AIaaS, deAPI, OpenAI, Ollama و سرویس‌های سفارشی)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {loading ? (
            <div className="py-16 flex flex-col items-center justify-center space-y-3">
              <div className="w-8 h-8 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin" />
              <p className="text-xs text-slate-500 font-medium">در حال خواندن پروفایل‌های امبدینگ...</p>
            </div>
          ) : editingProfile ? (
            /* EDIT / ADD PROFILE FORM */
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-4 animate-fade-in">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <span className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <SlidersHorizontal className="w-4 h-4 text-indigo-600" />
                  ویرایش مشخصات سرویس امبدینگ
                </span>
                <button
                  type="button"
                  onClick={() => setEditingProfile(null)}
                  className="text-xs text-slate-500 hover:text-slate-800 font-bold"
                >
                  بازگشت به لیست
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">شناسه یکتای پروفایل (ID)</label>
                  <input
                    type="text"
                    value={editingProfile.id}
                    onChange={(e) => setEditingProfile({ ...editingProfile, id: e.target.value })}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 font-mono text-slate-800"
                    dir="ltr"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">نام نمایشی پروفایل</label>
                  <input
                    type="text"
                    value={editingProfile.name}
                    onChange={(e) => setEditingProfile({ ...editingProfile, name: e.target.value })}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-800"
                    required
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block font-bold text-slate-700 mb-1">آدرس پایه سرور (Base URL)</label>
                  <input
                    type="url"
                    value={editingProfile.base_url}
                    onChange={(e) => setEditingProfile({ ...editingProfile, base_url: e.target.value })}
                    placeholder="https://api.arvancloudai.ir/v1 یا https://oai.deapi.ai/v1"
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 font-mono text-slate-800"
                    dir="ltr"
                    required
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block font-bold text-slate-700 mb-1">کلید دسترسی (API Key)</label>
                  <input
                    type="text"
                    value={editingProfile.api_key}
                    onChange={(e) => setEditingProfile({ ...editingProfile, api_key: e.target.value })}
                    placeholder="apikey ... یا token..."
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 font-mono text-slate-800"
                    dir="ltr"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">فرمت هدر احراز هویت (Auth Format)</label>
                  <select
                    value={editingProfile.auth_header_format}
                    onChange={(e) => setEditingProfile({ ...editingProfile, auth_header_format: e.target.value as EmbeddingProfileUI['auth_header_format'] })}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-800"
                  >
                    <option value="raw">مستقیم و خام (مثل apikey UUID در آروان)</option>
                    <option value="bearer">استاندارد Bearer &lt;key&gt;</option>
                    <option value="bearer_dpn_sk">Bearer با پیشوند dpn-sk- (مخصوص deAPI)</option>
                    <option value="apikey_prefix">پیشوند خودکار apikey &lt;key&gt;</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">نام مدل امبدینگ (Model)</label>
                  <input
                    type="text"
                    value={editingProfile.model}
                    onChange={(e) => setEditingProfile({ ...editingProfile, model: e.target.value })}
                    placeholder="Bge-m3 یا Bge_M3_FP16"
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 font-mono text-slate-800"
                    dir="ltr"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">ابعاد وکتور (Dimensions)</label>
                  <input
                    type="number"
                    value={editingProfile.dimensions}
                    onChange={(e) => setEditingProfile({ ...editingProfile, dimensions: parseInt(e.target.value, 10) || 1024 })}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 font-mono text-slate-800"
                    dir="ltr"
                    required
                  />
                  <span className="text-[10px] text-slate-400">پیش‌فرض کاتالوگ ۱۰۲۴ بُعدی است.</span>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">اندازه پنجره توکن (Context Window)</label>
                  <input
                    type="number"
                    value={editingProfile.context_window || 8192}
                    onChange={(e) => setEditingProfile({ ...editingProfile, context_window: parseInt(e.target.value, 10) || 8192 })}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 font-mono text-slate-800"
                    dir="ltr"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block font-bold text-slate-700 mb-1">هدرهای سفارشی HTTP (JSON)</label>
                  <textarea
                    rows={3}
                    value={customHeadersText}
                    onChange={(e) => setCustomHeadersText(e.target.value)}
                    placeholder='{"X-Gateway-Name": "gateway-v1gna"}'
                    className="w-full bg-white border border-slate-200 rounded-xl p-2.5 font-mono text-xs text-slate-800"
                    dir="ltr"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setEditingProfile(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200"
                >
                  انصراف
                </button>
                <button
                  type="button"
                  onClick={handleSaveEditingProfile}
                  disabled={saving}
                  className="pressable px-6 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/20 disabled:opacity-50"
                >
                  {saving ? 'در حال ذخیره‌سازی...' : 'ذخیره پروفایل'}
                </button>
              </div>
            </div>
          ) : (
            /* PROFILES LIST */
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <span className="text-xs font-bold text-slate-600">
                  تعداد پروفایل‌های پیکربندی‌شده: {profiles.length}
                </span>
                <button
                  onClick={handleOpenAdd}
                  className="pressable flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>افزودن ارائه‌دهنده جدید</span>
                </button>
              </div>

              <div className="grid grid-cols-1 gap-3.5">
                {profiles.map((p) => {
                  const isActive = p.id === activeProfileId;
                  const testRes = testResults[p.id];
                  const isTesting = testingId === p.id;

                  return (
                    <div
                      key={p.id}
                      className={`p-5 rounded-2xl border transition-all ${
                        isActive
                          ? 'bg-indigo-50/70 border-indigo-300 shadow-sm'
                          : 'bg-white border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-black text-slate-900">{p.name}</span>
                            {isActive ? (
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                سرویس فعال کاتالوگ
                              </span>
                            ) : (
                              <button
                                onClick={() => handleSetActive(p.id)}
                                className="pressable px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 hover:bg-indigo-100 text-slate-600 hover:text-indigo-700 border border-slate-200"
                              >
                                فعال‌سازی این سرویس
                              </button>
                            )}
                          </div>
                          <div className="flex items-center gap-3 text-[11px] font-mono text-slate-500 flex-wrap" dir="ltr">
                            <span>{p.base_url}</span>
                            <span>•</span>
                            <span className="text-indigo-600 font-bold">{p.model}</span>
                            <span>•</span>
                            <span>{p.dimensions}d</span>
                            {p.context_window && (
                              <>
                                <span>•</span>
                                <span>{p.context_window} tokens</span>
                              </>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 flex-wrap">
                          <button
                            onClick={() => handleTestProfile(p)}
                            disabled={isTesting}
                            className="pressable flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 shadow-2xs disabled:opacity-50"
                          >
                            {isTesting ? (
                              <div className="w-3.5 h-3.5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <Zap className="w-3.5 h-3.5 text-amber-500" />
                            )}
                            <span>تست اتصال زنده</span>
                          </button>
                          <button
                            onClick={() => handleOpenEdit(p)}
                            className="pressable px-3 py-1.5 rounded-xl text-xs font-bold bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 shadow-2xs"
                          >
                            ویرایش
                          </button>
                          {profiles.length > 1 && !isActive && (
                            <button
                              onClick={() => handleDeleteProfile(p.id)}
                              className="pressable p-1.5 rounded-xl text-rose-500 hover:bg-rose-50 border border-transparent hover:border-rose-200"
                              title="حذف پروفایل"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Live Test Report Banner */}
                      {testRes && (
                        <div
                          className={`mt-3 p-3 rounded-xl border text-xs flex items-center justify-between ${
                            testRes.success
                              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                              : 'bg-rose-50 border-rose-200 text-rose-800'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            {testRes.success ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                            ) : (
                              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                            )}
                            <span>
                              {testRes.success
                                ? `پاسخ موفق با تاخیر ${testRes.latency_ms}ms و ابعاد وکتور ${testRes.dimensions}`
                                : `خطا در اتصال: ${testRes.error}`}
                            </span>
                          </div>
                          {testRes.status_code && (
                            <span className="font-mono font-bold text-[10px] px-2 py-0.5 rounded bg-white/80 border">
                              HTTP {testRes.status_code}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 bg-slate-50 border-t border-slate-100 flex-shrink-0">
          <span className="text-[11px] text-slate-500">
            تغییرات به صورت آنی در تمامی بخش‌های کاتالوگ و غنی‌سازی دسته‌ای اعمال می‌شوند.
          </span>
          <button
            onClick={onClose}
            className="pressable px-6 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-white shadow-xs"
          >
            بستن
          </button>
        </div>
      </div>
    </div>
  );
}
