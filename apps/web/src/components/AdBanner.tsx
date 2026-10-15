'use client';

import React, { useEffect, useState } from 'react';
import { fetchFromApi, getClientUUID } from '../lib/api-client';
import { Sparkles, ExternalLink } from 'lucide-react';

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

  const handleAdClick = () => {
    if (!adConfig) return;
    const clientUuid = getClientUUID();
    fetchFromApi('/api/v1/monetization/events/click', {
      method: 'POST',
      body: JSON.stringify({
        placement_slot: placementSlot,
        client_uuid: clientUuid,
        target_url: 'https://promptjoo.ir'
      })
    }).catch(() => {});
  };

  if (!adConfig) {
    // Elegant fallback / sponsor placeholder
    if (placementSlot === 'FEED_NATIVE_CARD_3') {
      return (
        <div className="glass-panel rounded-2xl p-6 border border-blue-500/20 bg-gradient-to-br from-blue-950/30 to-indigo-950/20 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
                حمایت مالی / اسپانسر
              </span>
              <Sparkles className="w-4 h-4 text-blue-400" />
            </div>
            <h4 className="text-sm font-bold text-white mb-2">پرامپت اختصاصی کسب‌وکار شما</h4>
            <p className="text-xs text-gray-400 leading-relaxed mb-4">
              با تبلیغات هوشمند یکتانت و تپسل در پرامپت‌جو، برند خود را مستقیماً به هزاران تولیدکننده محتوا و مهندس هوش مصنوعی معرفی کنید.
            </p>
          </div>
          <div className="pt-2 border-t border-white/5 flex items-center justify-between text-xs text-blue-400">
            <span>ثبت سفارش تبلیغات بومی</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </div>
        </div>
      );
    }
    return null;
  }

  // If script tag is configured, render container
  return (
    <div
      onClick={handleAdClick}
      className={`overflow-hidden rounded-xl border border-white/10 ${
        placementSlot === 'STICKY_FOOTER_BANNER'
          ? 'fixed bottom-0 inset-x-0 z-30 bg-slate-950/90 backdrop-blur-md p-2 flex justify-center shadow-2xl'
          : 'p-3 bg-slate-900/50'
      }`}
    >
      <div
        id={`yn-zone-${adConfig.zone_id}`}
        className="w-full text-center text-xs text-gray-400"
        dangerouslySetInnerHTML={{
          __html:
            adConfig.script_tag_html ||
            `<div class="py-2 text-[11px] text-gray-400">فضای تبلیغاتی ${adConfig.provider} (${adConfig.zone_id})</div>`
        }}
      />
    </div>
  );
}
