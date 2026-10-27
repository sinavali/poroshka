'use client';

import React, { useState, useEffect } from 'react';
import { 
  Globe, Shield, MessageSquare, Megaphone, Sliders, Save, CheckCircle2, AlertCircle, RefreshCw, Bell 
} from 'lucide-react';
import { fetchFromApi } from '../lib/api-client';
import { showDynamicToast } from './DynamicIslandToast';

interface SystemSettingItem {
  id?: string;
  setting_key: string;
  category: string;
  description_fa: string;
  setting_value: Record<string, any>;
  updated_at?: string;
}

interface SmsConfig {
  provider: string;
  username: string;
  password: string;
  pattern_id: string;
  sender_number: string;
  endpoint_mode: string;
  password_pattern_id: string;
  api_key?: string;
  otp_pattern_code?: string;
}

export function AdminGeneralSettingsTab({ isOperator }: { isOperator?: boolean }) {
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);

  // 1. General Platform State
  const [platformConfig, setPlatformConfig] = useState({
    site_title_fa: 'پوروشکا | مرجع تخصصی پرامپت‌های مهندسی‌شده هوش مصنوعی',
    site_slogan_fa: 'سریع‌ترین موتور پرامپت‌های مهندسی‌شده و پارامتریک هوش مصنوعی در ایران',
    contact_phone: '۰۲۱-۸۸۸۸۸۸۸۸',
    contact_email: 'support@poroshka.ir',
    telegram_channel: '@poroshka',
    maintenance_mode: false,
    allow_guest_copies: true
  });

  // 2. Rate Limits & Security State
  const [rateLimitsConfig, setRateLimitsConfig] = useState({
    otp_expiry_seconds: 120,
    otp_max_requests_per_10m: 5,
    api_rate_limit_per_minute: 60,
    search_rate_limit_per_minute: 30,
    session_ttl_days: 30
  });

  // 3. SMS Gateway State (MeliPayamak)
  const [smsConfig, setSmsConfig] = useState<SmsConfig>({
    provider: 'melipayamak',
    username: '',
    password: '',
    pattern_id: '',
    sender_number: '50004000',
    endpoint_mode: 'base_service',
    password_pattern_id: '',
    api_key: '',
    otp_pattern_code: 'poroshka-otp'
  });

  // 4. Messengers & Bot Relay State
  const [messengersConfig, setMessengersConfig] = useState({
    telegram_bot_token: '',
    telegram_relay_channel_id: '',
    bale_bot_token: '',
    bale_relay_channel_id: ''
  });

  // 6. Search & Ingestion Pipeline State
  const [pipelineConfig, setPipelineConfig] = useState({
    similarity_threshold: 0.65,
    vector_search_limit: 20,
    redis_cache_ttl_minutes: 60,
    default_batch_size: 50,
    default_delay_ms: 1000
  });

  const loadSettings = async () => {
    setLoading(true);
    try {
      const res = await fetchFromApi<SystemSettingItem[]>('/api/v1/admin/settings');
      if (Array.isArray(res)) {
        res.forEach((item) => {
          if (item.setting_key === 'general_platform_config' && item.setting_value) {
            setPlatformConfig((prev) => ({ ...prev, ...item.setting_value }));
          } else if (item.setting_key === 'rate_limits_config' && item.setting_value) {
            setRateLimitsConfig((prev) => ({ ...prev, ...item.setting_value }));
          } else if (item.setting_key === 'sms_provider_config' && item.setting_value) {
            setSmsConfig((prev) => ({ ...prev, ...item.setting_value }));
          } else if (item.setting_key === 'messengers_config' && item.setting_value) {
            setMessengersConfig((prev) => ({ ...prev, ...item.setting_value }));
          } else if (item.setting_key === 'search_pipeline_config' && item.setting_value) {
            setPipelineConfig((prev) => ({ ...prev, ...item.setting_value }));
          }
        });
      }
    } catch {
      showDynamicToast({ title: 'خطا', message: 'بارگذاری تنظیمات با خطا مواجه شد.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const saveSetting = async (key: string, category: string, descFa: string, value: Record<string, any>) => {
    if (isOperator) {
      showDynamicToast({ title: 'عدم دسترسی', message: 'اپراتورها اجازه ویرایش تنظیمات را ندارند.', type: 'error' });
      return;
    }
    setSavingKey(key);
    try {
      await fetchFromApi(`/api/v1/admin/settings/${key}`, {
        method: 'PUT',
        body: JSON.stringify({
          category,
          description_fa: descFa,
          setting_value: value
        })
      });
      showDynamicToast({ title: 'تنظیمات ذخیره شد', message: descFa, type: 'success' });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'خطا در ذخیره‌سازی';
      showDynamicToast({ title: 'خطا', message: msg, type: 'error' });
    } finally {
      setSavingKey(null);
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center flex flex-col items-center justify-center space-y-3">
        <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
        <p className="text-xs text-slate-500 font-medium">در حال فراخوانی تنظیمات سامانه...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in" dir="rtl">
      {/* 1. GENERAL PLATFORM & BRANDING */}
      <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center shadow-xs">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900">پلتفرم، برندینگ و ارتباطات</h3>
              <p className="text-xs text-slate-500">مشخصات عمومی، اطلاعات پشتیبانی و وضعیت در دسترس بودن سایت</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => saveSetting('general_platform_config', 'platform', 'تنظیمات عمومی و برندینگ پلتفرم', platformConfig)}
            disabled={savingKey === 'general_platform_config' || isOperator}
            className="pressable flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 shadow-sm shadow-blue-600/20 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{savingKey === 'general_platform_config' ? 'در حال ذخیره...' : 'ذخیره عمومی'}</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">عنوان سایت (SEO & Title)</label>
            <input
              type="text"
              value={platformConfig.site_title_fa}
              onChange={(e) => setPlatformConfig({ ...platformConfig, site_title_fa: e.target.value })}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-800"
            />
          </div>
          <div>
            <label className="block font-bold text-slate-700 mb-1">شعار پلتفرم (Slogan)</label>
            <input
              type="text"
              value={platformConfig.site_slogan_fa}
              onChange={(e) => setPlatformConfig({ ...platformConfig, site_slogan_fa: e.target.value })}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-800"
            />
          </div>
          <div>
            <label className="block font-bold text-slate-700 mb-1">شماره تماس پشتیبانی</label>
            <input
              type="text"
              value={platformConfig.contact_phone}
              onChange={(e) => setPlatformConfig({ ...platformConfig, contact_phone: e.target.value })}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-800"
              dir="ltr"
            />
            <p className="text-[11px] text-slate-500 mt-1">نمایش زنده در فوتر سایت، صفحه تماس با ما و متاتگ‌های ارتباطی</p>
          </div>
          <div>
            <label className="block font-bold text-slate-700 mb-1">ایمیل پشتیبانی رسمی</label>
            <input
              type="email"
              value={platformConfig.contact_email}
              onChange={(e) => setPlatformConfig({ ...platformConfig, contact_email: e.target.value })}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-800"
              dir="ltr"
            />
            <p className="text-[11px] text-slate-500 mt-1">آدرس رسمی مکاتبات در فوتر و صفحه تماس با ما (/contact)</p>
          </div>

          <div className="flex items-center gap-6 pt-5">
            <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700">
              <input
                type="checkbox"
                checked={platformConfig.allow_guest_copies}
                onChange={(e) => setPlatformConfig({ ...platformConfig, allow_guest_copies: e.target.checked })}
                className="w-4 h-4 rounded text-blue-600 border-slate-300"
              />
              <span>مجاز بودن کپی برای کاربران مهمان</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-rose-600">
              <input
                type="checkbox"
                checked={platformConfig.maintenance_mode}
                onChange={(e) => setPlatformConfig({ ...platformConfig, maintenance_mode: e.target.checked })}
                className="w-4 h-4 rounded text-rose-600 border-slate-300"
              />
              <span>حالت تعمیرات و نگهداری (Maintenance)</span>
            </label>
          </div>
        </div>
      </div>

      {/* 2. SECURITY & RATE LIMITS */}
      <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-600 flex items-center justify-center shadow-xs">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900">امنیت، اعتبار OTP و سقف نرخ (Rate Limiting)</h3>
              <p className="text-xs text-slate-500">کنترل پارامترهای ضد سوءاستفاده، نشست کاربران و انقضای پیامک‌ها</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => saveSetting('rate_limits_config', 'security', 'تنظیمات سقف نرخ و امنیت سامانه', rateLimitsConfig)}
            disabled={savingKey === 'rate_limits_config' || isOperator}
            className="pressable flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 shadow-sm shadow-indigo-600/20 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{savingKey === 'rate_limits_config' ? 'در حال ذخیره...' : 'ذخیره امنیت'}</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">مدت اعتبار کد OTP (ثانیه)</label>
            <input
              type="number"
              value={rateLimitsConfig.otp_expiry_seconds}
              onChange={(e) => setRateLimitsConfig({ ...rateLimitsConfig, otp_expiry_seconds: parseInt(e.target.value, 10) || 120 })}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-800"
              dir="ltr"
            />
          </div>
          <div>
            <label className="block font-bold text-slate-700 mb-1">سقف مجاز OTP در هر ۱۰ دقیقه</label>
            <input
              type="number"
              value={rateLimitsConfig.otp_max_requests_per_10m}
              onChange={(e) => setRateLimitsConfig({ ...rateLimitsConfig, otp_max_requests_per_10m: parseInt(e.target.value, 10) || 5 })}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-800"
              dir="ltr"
            />
          </div>
          <div>
            <label className="block font-bold text-slate-700 mb-1">سقف درخواست‌های عمومی API در دقیقه</label>
            <input
              type="number"
              value={rateLimitsConfig.api_rate_limit_per_minute}
              onChange={(e) => setRateLimitsConfig({ ...rateLimitsConfig, api_rate_limit_per_minute: parseInt(e.target.value, 10) || 60 })}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-800"
              dir="ltr"
            />
          </div>
          <div>
            <label className="block font-bold text-slate-700 mb-1">سقف جستجوی هوشمند در دقیقه</label>
            <input
              type="number"
              value={rateLimitsConfig.search_rate_limit_per_minute}
              onChange={(e) => setRateLimitsConfig({ ...rateLimitsConfig, search_rate_limit_per_minute: parseInt(e.target.value, 10) || 30 })}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-800"
              dir="ltr"
            />
          </div>
          <div>
            <label className="block font-bold text-slate-700 mb-1">مدت ماندگاری نشست لاگین (روز)</label>
            <input
              type="number"
              value={rateLimitsConfig.session_ttl_days}
              onChange={(e) => setRateLimitsConfig({ ...rateLimitsConfig, session_ttl_days: parseInt(e.target.value, 10) || 30 })}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-800"
              dir="ltr"
            />
          </div>
        </div>
      </div>

      {/* 3. SMS GATEWAY SETTINGS (MELIPAYAMAK "شرکتی" CORPORATE) */}
      <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center shadow-xs">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900">سامانه پیامکی ملی‌پیامک (MeliPayamak پکیج شرکتی)</h3>
              <p className="text-xs text-slate-500">پیکربندی وب‌سرویس پترن خدماتی BaseServiceNumber و ارسال سریع OTP و کلمه عبور</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => saveSetting('sms_provider_config', 'sms', 'تنظیمات درگاه ملی‌پیامک شرکتی', smsConfig)}
            disabled={savingKey === 'sms_provider_config' || isOperator}
            className="pressable flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 shadow-sm shadow-emerald-600/20 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{savingKey === 'sms_provider_config' ? 'در حال ذخیره...' : 'ذخیره ملی‌پیامک'}</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">نام کاربری ملی‌پیامک (Username)</label>
            <input
              type="text"
              value={smsConfig.username}
              onChange={(e) => setSmsConfig({ ...smsConfig, username: e.target.value })}
              placeholder="نام کاربری پنل ملی‌پیامک..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-800 font-mono"
              dir="ltr"
            />
          </div>
          <div>
            <label className="block font-bold text-slate-700 mb-1">کلمه عبور پنل ملی‌پیامک (Password)</label>
            <input
              type="password"
              value={smsConfig.password}
              onChange={(e) => setSmsConfig({ ...smsConfig, password: e.target.value })}
              placeholder="رمز عبور حساب ملی‌پیامک..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-800 font-mono"
              dir="ltr"
            />
          </div>
          <div>
            <label className="block font-bold text-slate-700 mb-1">کد الگوی وب‌سرویس اشتراکی (OTP Pattern bodyId)</label>
            <input
              type="text"
              value={smsConfig.pattern_id}
              onChange={(e) => setSmsConfig({ ...smsConfig, pattern_id: e.target.value })}
              placeholder="مثلاً: 106117"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-800 font-mono"
              dir="ltr"
            />
            <p className="text-[11px] text-slate-400 mt-1">شناسه عددی تاییدشده در بخش وب‌سرویس خدماتی پنل ملی‌پیامک</p>
          </div>
          <div>
            <label className="block font-bold text-slate-700 mb-1">شماره اختصاصی / خدماتی فرستنده (Sender Line)</label>
            <input
              type="text"
              value={smsConfig.sender_number}
              onChange={(e) => setSmsConfig({ ...smsConfig, sender_number: e.target.value })}
              placeholder="50004000 یا خط خدماتی اختصاصی"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-800 font-mono"
              dir="ltr"
            />
          </div>
          <div>
            <label className="block font-bold text-slate-700 mb-1">حالت ارسال وب‌سرویس (Endpoint Mode)</label>
            <select
              value={smsConfig.endpoint_mode}
              onChange={(e) => setSmsConfig({ ...smsConfig, endpoint_mode: e.target.value })}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-800"
            >
              <option value="base_service">پترن خدماتی پکیج شرکتی (BaseServiceNumber)</option>
              <option value="console_shared">کنسول اشتراکی جدید (Console Shared REST)</option>
            </select>
          </div>
          <div>
            <label className="block font-bold text-slate-700 mb-1">کد الگوی ارسال کلمه عبور (Password Pattern ID اختیاری)</label>
            <input
              type="text"
              value={smsConfig.password_pattern_id}
              onChange={(e) => setSmsConfig({ ...smsConfig, password_pattern_id: e.target.value })}
              placeholder="در صورت تعریف پترن مجزا برای رمز عبور"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-800 font-mono"
              dir="ltr"
            />
          </div>
        </div>
      </div>

      {/* 4. SEARCH & INGESTION PIPELINE */}
      <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-50 border border-purple-200 text-purple-600 flex items-center justify-center shadow-xs">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900">موتور جستجو، کش و پایپ‌لاین Ingestion</h3>
              <p className="text-xs text-slate-500">آستانه شباهت برداری، سقف نتایج و زمان نگهداری در Redis</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => saveSetting('search_pipeline_config', 'pipeline', 'تنظیمات جستجو، کش و اینجکشن', pipelineConfig)}
            disabled={savingKey === 'search_pipeline_config' || isOperator}
            className="pressable flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-purple-600 hover:bg-purple-500 shadow-sm shadow-purple-600/20 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{savingKey === 'search_pipeline_config' ? 'در حال ذخیره...' : 'ذخیره پایپ‌لاین'}</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">آستانه شباهت برداری (Cosine Similarity 0-1)</label>
            <input
              type="number"
              step="0.01"
              min="0.1"
              max="1.0"
              value={pipelineConfig.similarity_threshold}
              onChange={(e) => setPipelineConfig({ ...pipelineConfig, similarity_threshold: parseFloat(e.target.value) || 0.65 })}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-800"
              dir="ltr"
            />
          </div>
          <div>
            <label className="block font-bold text-slate-700 mb-1">سقف تعداد نتایج در هر جستجو (Limit)</label>
            <input
              type="number"
              value={pipelineConfig.vector_search_limit}
              onChange={(e) => setPipelineConfig({ ...pipelineConfig, vector_search_limit: parseInt(e.target.value, 10) || 20 })}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-800"
              dir="ltr"
            />
          </div>
          <div>
            <label className="block font-bold text-slate-700 mb-1">ماندگاری کش نتایج در ردیس (دقیقه)</label>
            <input
              type="number"
              value={pipelineConfig.redis_cache_ttl_minutes}
              onChange={(e) => setPipelineConfig({ ...pipelineConfig, redis_cache_ttl_minutes: parseInt(e.target.value, 10) || 60 })}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-800"
              dir="ltr"
            />
          </div>
          <div>
            <label className="block font-bold text-slate-700 mb-1">اندازه پیش‌فرض بچ در Ingestion</label>
            <input
              type="number"
              value={pipelineConfig.default_batch_size}
              onChange={(e) => setPipelineConfig({ ...pipelineConfig, default_batch_size: parseInt(e.target.value, 10) || 50 })}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-800"
              dir="ltr"
            />
          </div>
          <div>
            <label className="block font-bold text-slate-700 mb-1">تاخیر بین بچ‌های پردازش (میلی‌ثانیه)</label>
            <input
              type="number"
              step="100"
              value={pipelineConfig.default_delay_ms}
              onChange={(e) => setPipelineConfig({ ...pipelineConfig, default_delay_ms: parseInt(e.target.value, 10) || 1000 })}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-800"
              dir="ltr"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
