'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { fetchFromApi } from './api-client';

export interface GeneralPlatformSettings {
  site_title_fa: string;
  site_slogan_fa: string;
  contact_phone: string;
  contact_email: string;
  telegram_channel: string;
  maintenance_mode: boolean;
  allow_guest_copies: boolean;
}

export interface AdsGovernanceSettings {
  ads_enabled: boolean;
  fixed_banner_position: 'top' | 'bottom' | 'off';
  yektanet_script_url: string;
  placements: Record<string, string>;
}

export interface PublicSettingsData {
  general: GeneralPlatformSettings;
  ads: AdsGovernanceSettings;
  loading: boolean;
  refreshSettings: () => Promise<void>;
}

export const DEFAULT_GENERAL_SETTINGS: GeneralPlatformSettings = {
  site_title_fa: 'پوروشکا | مرجع تخصصی پرامپت‌های مهندسی‌شده هوش مصنوعی',
  site_slogan_fa: 'سریع‌ترین موتور پرامپت‌های مهندسی‌شده و پارامتریک هوش مصنوعی در ایران',
  contact_phone: '۰۲۱-۸۸۸۸۸۸۸۸',
  contact_email: 'support@poroshka.ir',
  telegram_channel: '@poroshka',
  maintenance_mode: false,
  allow_guest_copies: true
};

export const DEFAULT_AD_PLACEMENTS: Record<string, { title: string; defaultTag: string }> = {
  header_top: {
    title: 'بنر سراسری هدر (بالای سایت)',
    defaultTag: '<div class="yn-bnr" id="ynpos-21189"></div>'
  },
  grid_card_1: {
    title: 'کارت تبلیغاتی ۱ گرید پرامپت‌ها',
    defaultTag: '<div class="yn-bnr" id="ynpos-21189"></div>'
  },
  grid_card_2: {
    title: 'کارت تبلیغاتی ۲ گرید پرامپت‌ها (نیتیو)',
    defaultTag: '<div id="pos-article-display-123727"></div>'
  },
  single_prompt_preview: {
    title: 'بنر بالای پیش‌نمایش پرامپت تکی',
    defaultTag: '<div class="yn-bnr" id="ynpos-21189"></div>'
  },
  about_1: {
    title: 'تبلیغ ۱ صفحه درباره ما (بالای صفحه)',
    defaultTag: '<div class="yn-bnr" id="ynpos-21190"></div>'
  },
  about_2: {
    title: 'تبلیغ ۲ صفحه درباره ما (میانه صفحه)',
    defaultTag: '<div class="yn-bnr" id="ynpos-21190"></div>'
  },
  about_3: {
    title: 'تبلیغ ۳ صفحه درباره ما (پایین صفحه)',
    defaultTag: '<div class="yn-bnr" id="ynpos-21190"></div>'
  },
  faq_1: {
    title: 'تبلیغ ۱ صفحه سوالات متداول (بالای صفحه)',
    defaultTag: '<div class="yn-bnr" id="ynpos-21190"></div>'
  },
  faq_2: {
    title: 'تبلیغ ۲ صفحه سوالات متداول (میانه صفحه)',
    defaultTag: '<div class="yn-bnr" id="ynpos-21190"></div>'
  },
  faq_3: {
    title: 'تبلیغ ۳ صفحه سوالات متداول (پایین صفحه)',
    defaultTag: '<div class="yn-bnr" id="ynpos-21190"></div>'
  },
  terms_1: {
    title: 'تبلیغ ۱ صفحه قوانین و شرایط (بالای صفحه)',
    defaultTag: '<div class="yn-bnr" id="ynpos-21190"></div>'
  },
  terms_2: {
    title: 'تبلیغ ۲ صفحه قوانین و شرایط (میانه صفحه)',
    defaultTag: '<div class="yn-bnr" id="ynpos-21190"></div>'
  },
  terms_3: {
    title: 'تبلیغ ۳ صفحه قوانین و شرایط (پایین صفحه)',
    defaultTag: '<div class="yn-bnr" id="ynpos-21190"></div>'
  },
  privacy_1: {
    title: 'تبلیغ ۱ صفحه حریم خصوصی (بالای صفحه)',
    defaultTag: '<div class="yn-bnr" id="ynpos-21190"></div>'
  },
  privacy_2: {
    title: 'تبلیغ ۲ صفحه حریم خصوصی (میانه صفحه)',
    defaultTag: '<div class="yn-bnr" id="ynpos-21190"></div>'
  },
  privacy_3: {
    title: 'تبلیغ ۳ صفحه حریم خصوصی (پایین صفحه)',
    defaultTag: '<div class="yn-bnr" id="ynpos-21190"></div>'
  },
  contact_1: {
    title: 'تبلیغ صفحه تماس با ما',
    defaultTag: '<div class="yn-bnr" id="ynpos-21190"></div>'
  },
  admin_top_1: {
    title: 'تبلیغ ۱ بالای کنترل‌پنل مدیریت',
    defaultTag: '<div class="yn-bnr" id="ynpos-21189"></div>'
  },
  admin_top_2: {
    title: 'تبلیغ ۲ بالای کنترل‌پنل مدیریت',
    defaultTag: '<div class="yn-bnr" id="ynpos-21189"></div>'
  },
  admin_top_3: {
    title: 'تبلیغ ۳ بالای کنترل‌پنل مدیریت',
    defaultTag: '<div class="yn-bnr" id="ynpos-21189"></div>'
  }
};

const defaultPlacementsMap: Record<string, string> = {};
for (const [key, val] of Object.entries(DEFAULT_AD_PLACEMENTS)) {
  defaultPlacementsMap[key] = val.defaultTag;
}

export const DEFAULT_ADS_SETTINGS: AdsGovernanceSettings = {
  ads_enabled: true,
  fixed_banner_position: 'top',
  yektanet_script_url: 'https://cdn.yektanet.com/rg_service/scripts/yektanet.js',
  placements: defaultPlacementsMap
};

const PublicSettingsContext = createContext<PublicSettingsData>({
  general: DEFAULT_GENERAL_SETTINGS,
  ads: DEFAULT_ADS_SETTINGS,
  loading: true,
  refreshSettings: async () => {}
});

export function PublicSettingsProvider({ children }: { children: React.ReactNode }) {
  const [general, setGeneral] = useState<GeneralPlatformSettings>(DEFAULT_GENERAL_SETTINGS);
  const [ads, setAds] = useState<AdsGovernanceSettings>(DEFAULT_ADS_SETTINGS);
  const [loading, setLoading] = useState(true);

  const refreshSettings = useCallback(async () => {
    try {
      const data = await fetchFromApi<{ general?: Partial<GeneralPlatformSettings>; ads?: Partial<AdsGovernanceSettings> }>(
        '/api/v1/catalog/public-settings'
      );
      if (data) {
        if (data.general) {
          setGeneral((prev) => ({ ...prev, ...data.general }));
        }
        if (data.ads) {
          setAds((prev) => ({
            ...prev,
            ...data.ads,
            placements: { ...prev.placements, ...(data.ads?.placements || {}) }
          }));
        }
      }
    } catch {
      // Fallback gracefully to default values on network errors
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshSettings();
  }, [refreshSettings]);

  return (
    <PublicSettingsContext.Provider value={{ general, ads, loading, refreshSettings }}>
      {children}
    </PublicSettingsContext.Provider>
  );
}

export function usePublicSettings(): PublicSettingsData {
  return useContext(PublicSettingsContext);
}
