'use client';

import React, { useState, useEffect } from 'react';
import { Megaphone, Save, CheckCircle2, RotateCw, ExternalLink } from 'lucide-react';
import { fetchFromApi } from '../lib/api-client';
import { showDynamicToast } from './DynamicIslandToast';
import { DEFAULT_AD_PLACEMENTS, type AdsGovernanceSettings, DEFAULT_ADS_SETTINGS } from '../lib/public-settings';

interface SystemSettingItem {
  id?: string;
  setting_key: string;
  category: string;
  description_fa: string;
  setting_value: Record<string, any>;
  updated_at?: string;
}

export function AdminAdsTab({ isOperator }: { isOperator?: boolean }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [adsConfig, setAdsConfig] = useState<AdsGovernanceSettings>(DEFAULT_ADS_SETTINGS);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const res = await fetchFromApi<SystemSettingItem[]>('/api/v1/admin/settings');
      if (Array.isArray(res)) {
        const item = res.find((s) => s.setting_key === 'ads_governance_config');
        if (item?.setting_value) {
          setAdsConfig((prev) => ({
            ...prev,
            ...item.setting_value,
            placements: { ...prev.placements, ...(item.setting_value.placements || {}) }
          }));
        }
      }
    } catch {
      showDynamicToast({ title: 'خطا', message: 'بارگذاری تنظیمات تبلیغات با خطا مواجه شد.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handlePlacementChange = (slotKey: string, value: string) => {
    setAdsConfig((prev) => ({
      ...prev,
      placements: {
        ...prev.placements,
        [slotKey]: value
      }
    }));
  };

  const handleSave = async () => {
    if (isOperator) {
      showDynamicToast({ title: 'عدم دسترسی', message: 'اپراتورها اجازه تغییر تنظیمات را ندارند.', type: 'error' });
      return;
    }

    setSaving(true);
    try {
      await fetchFromApi('/api/v1/admin/settings/ads_governance_config', {
        method: 'PUT',
        body: JSON.stringify({
          category: 'monetization',
          description_fa: 'تنظیمات یکپارچه تبلیغات یکتانت در پوروشکا',
          setting_value: adsConfig
        })
      });
      showDynamicToast({
        title: 'ذخیره شد',
        message: 'تنظیمات تبلیغات یکتانت با موفقیت ذخیره و در سامانه اعمال شد.',
        type: 'success'
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'ذخیره تنظیمات تبلیغات با خطا مواجه شد.';
      showDynamicToast({ title: 'خطا', message: msg, type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="py-16 flex flex-col items-center justify-center space-y-3">
        <div className="w-8 h-8 rounded-full border-2 border-amber-600 border-t-transparent animate-spin" />
        <p className="text-xs text-slate-500 font-medium">در حال دریافت تنظیمات تبلیغات یکتانت...</p>
      </div>
    );
  }

  // Group placements by page/feature for optimal user experience
  const groups: { title: string; keys: (keyof typeof DEFAULT_AD_PLACEMENTS)[] }[] = [
    {
      title: 'بنر هدر سراسری و پیش‌نمایش پرامپت تکی',
      keys: ['header_top', 'single_prompt_preview']
    },
    {
      title: 'کارت‌های تبلیغاتی درون گرید پرامپت‌ها (صفحه اصلی و کاوش)',
      keys: ['grid_card_1', 'grid_card_2']
    },
    {
      title: 'جایگاه‌های صفحه درباره ما (/about)',
      keys: ['about_1', 'about_2', 'about_3']
    },
    {
      title: 'جایگاه‌های صفحه سوالات متداول (/faq)',
      keys: ['faq_1', 'faq_2', 'faq_3']
    },
    {
      title: 'جایگاه‌های صفحه شرایط و قوانین (/terms)',
      keys: ['terms_1', 'terms_2', 'terms_3']
    },
    {
      title: 'جایگاه‌های صفحه حریم خصوصی (/privacy) و تماس با ما',
      keys: ['privacy_1', 'privacy_2', 'privacy_3', 'contact_1']
    },
    {
      title: 'جایگاه‌های بالای کنترل‌پنل مدیریت (/admin)',
      keys: ['admin_top_1', 'admin_top_2', 'admin_top_3']
    }
  ];

  return (
    <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-sm space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-5 border-b border-slate-100 gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center shadow-xs">
            <Megaphone className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-black text-slate-900 tracking-tight">
              مدیریت یکپارچه تبلیغات یکتانت (Yektanet Ad Network)
            </h3>
            <p className="text-xs text-slate-500">
              مدیریت تفکیک‌شده و اختصاصی ۲۰ جایگاه تبلیغاتی پلتفرم، موقعیت بنر چسبان و اسکریپت اصلی یکتانت
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadSettings}
            disabled={loading}
            className="pressable p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
            title="بازخوانی تنظیمات"
          >
            <RotateCw className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || isOperator}
            className="pressable flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-amber-600 hover:bg-amber-500 shadow-sm shadow-amber-600/20 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'در حال ذخیره‌سازی...' : 'ذخیره جایگاه‌های تبلیغات'}</span>
          </button>
        </div>
      </div>

      {/* Global Controls */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-4 rounded-2xl bg-amber-50/50 border border-amber-200/60 text-xs">
        <label className="flex items-center gap-2.5 cursor-pointer font-bold text-slate-800">
          <input
            type="checkbox"
            checked={adsConfig.ads_enabled}
            onChange={(e) => setAdsConfig({ ...adsConfig, ads_enabled: e.target.checked })}
            className="w-4 h-4 rounded text-amber-600 border-slate-300 focus:ring-amber-500"
          />
          <span>فعال‌بودن سراسری تبلیغات در پلتفرم</span>
        </label>

        <div>
          <label className="block font-bold text-slate-700 mb-1">موقعیت بنر چسبان سراسری</label>
          <select
            value={adsConfig.fixed_banner_position}
            onChange={(e) => setAdsConfig({ ...adsConfig, fixed_banner_position: e.target.value as 'top' | 'bottom' | 'off' })}
            className="w-full bg-white border border-slate-200 rounded-xl p-2 text-slate-800"
          >
            <option value="top">بالای صفحه (زیر هدر - بهینه برای موبایل و دسکتاپ)</option>
            <option value="bottom">پایین صفحه</option>
            <option value="off">غیرفعال (عدم نمایش)</option>
          </select>
        </div>

        <div>
          <label className="block font-bold text-slate-700 mb-1">آدرس اسکریپت رگولار یکتانت در Head</label>
          <input
            type="text"
            value={adsConfig.yektanet_script_url}
            onChange={(e) => setAdsConfig({ ...adsConfig, yektanet_script_url: e.target.value })}
            placeholder="https://cdn.yektanet.com/rg_service/scripts/yektanet.js"
            className="w-full bg-white border border-slate-200 rounded-xl p-2 text-slate-800 font-mono"
            dir="ltr"
          />
        </div>
      </div>

      {/* Granular Placements Grid */}
      <div className="space-y-6 pt-2">
        {groups.map((grp, gIdx) => (
          <div key={gIdx} className="space-y-3 p-4 rounded-2xl bg-slate-50/60 border border-slate-200/70">
            <h4 className="text-xs font-black text-slate-800 pb-1 border-b border-slate-200/50">
              {grp.title}
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {grp.keys.map((slotKey) => {
                const meta = DEFAULT_AD_PLACEMENTS[slotKey];
                const currentVal = adsConfig.placements?.[slotKey] ?? meta?.defaultTag ?? '';
                return (
                  <div key={slotKey} className="space-y-1.5 text-xs">
                    <div className="flex items-center justify-between">
                      <label className="font-bold text-slate-800 truncate" title={meta?.title}>
                        {meta?.title}
                      </label>
                      <span className="text-[10px] font-mono text-slate-600 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                        {slotKey}
                      </span>
                    </div>
                    <textarea
                      rows={2}
                      value={currentVal}
                      onChange={(e) => handlePlacementChange(slotKey, e.target.value)}
                      placeholder='<div class="yn-bnr" id="..."></div>'
                      className="w-full bg-white border border-slate-200 rounded-xl p-2 text-slate-800 font-mono text-[11px] focus:ring-1 focus:ring-amber-500"
                      dir="ltr"
                    />
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
