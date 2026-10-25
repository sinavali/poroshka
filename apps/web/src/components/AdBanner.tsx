'use client';

import React, { useEffect, useState } from 'react';
import { fetchFromApi } from '../lib/api-client';

interface AdConfig {
  id: string;
  placement_slot: string;
  provider: string;
  zone_id: string;
  script_tag_html?: string;
}

interface AdBannerProps {
  placementSlot: 'POST_COPY_DRAWER' | 'FEED_NATIVE_CARD_3' | 'STICKY_FOOTER_BANNER';
}

/**
 * Native placement renderer compliant with Yektanet guidelines:
 * 1. Zero alterations to supplied HTML element/id
 * 2. Complete absence of adblocker-sensitive classes (ad, ads, banner, advertise, advertiser, ad-images)
 */
export function AdBanner({ placementSlot }: AdBannerProps) {
  const [adConfig, setAdConfig] = useState<AdConfig | null>(null);

  useEffect(() => {
    fetchFromApi<AdConfig[]>(`/api/v1/monetization/configs?slot=${placementSlot}`)
      .then((configs) => {
        if (configs && configs.length > 0) {
          setAdConfig(configs[0]);
        }
      })
      .catch(() => {});
  }, [placementSlot]);

  // Feed Native Placement (Main Page & Catalogues)
  if (placementSlot === 'FEED_NATIVE_CARD_3') {
    return (
      <div className="w-full col-span-1 rounded-3xl overflow-hidden">
        {adConfig?.script_tag_html ? (
          <div dangerouslySetInnerHTML={{ __html: adConfig.script_tag_html }} />
        ) : (
          <div id="pos-article-display-123659" />
        )}
      </div>
    );
  }

  // Sticky Bottom Position
  if (placementSlot === 'STICKY_FOOTER_BANNER') {
    return (
      <div className="fixed bottom-0 inset-x-0 z-30 bg-white/95 backdrop-blur-md p-2 flex justify-center shadow-lg border-t border-slate-200">
        {adConfig?.script_tag_html ? (
          <div dangerouslySetInnerHTML={{ __html: adConfig.script_tag_html }} />
        ) : (
          <div id={`pos-footer-display-${adConfig?.zone_id || 'default'}`} />
        )}
      </div>
    );
  }

  // Post-Copy Drawer Placement
  if (placementSlot === 'POST_COPY_DRAWER') {
    return (
      <div className="w-full rounded-2xl overflow-hidden p-2">
        {adConfig?.script_tag_html ? (
          <div dangerouslySetInnerHTML={{ __html: adConfig.script_tag_html }} />
        ) : (
          <div id={`pos-drawer-display-${adConfig?.zone_id || 'default'}`} />
        )}
      </div>
    );
  }

  return null;
}
