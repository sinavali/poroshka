'use client';

import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { usePublicSettings, DEFAULT_AD_PLACEMENTS } from '../lib/public-settings';

export type AdSlotKey =
  | 'header_top'
  | 'grid_card_1'
  | 'grid_card_2'
  | 'single_prompt_preview'
  | 'about_1'
  | 'about_2'
  | 'about_3'
  | 'faq_1'
  | 'faq_2'
  | 'faq_3'
  | 'terms_1'
  | 'terms_2'
  | 'terms_3'
  | 'privacy_1'
  | 'privacy_2'
  | 'privacy_3'
  | 'contact_1'
  | 'admin_top_1'
  | 'admin_top_2'
  | 'admin_top_3'
  // Legacy aliases for backward compatibility
  | 'fixed-banner'
  | 'single-prompt-top'
  | 'content-page'
  | 'admin-header';

interface AdPlacementProps {
  slot: AdSlotKey | string;
  className?: string;
}

// Normalize legacy slot names to canonical placement keys
function normalizeSlotKey(slot: string): string {
  switch (slot) {
    case 'fixed-banner': return 'header_top';
    case 'grid-card-1': return 'grid_card_1';
    case 'grid-card-2': return 'grid_card_2';
    case 'single-prompt-top': return 'single_prompt_preview';
    case 'content-page': return 'about_1';
    case 'admin-header': return 'admin_top_1';
    default: return slot;
  }
}

export function AdPlacement({ slot, className = '' }: AdPlacementProps) {
  const { ads } = usePublicSettings();
  const [closed, setClosed] = useState(false);

  useEffect(() => {
    try {
      const dismissed = sessionStorage.getItem('poroshka_fixed_banner_dismissed');
      if (dismissed === 'true') {
        setClosed(true);
      }
    } catch {}
  }, []);

  const handleDismiss = () => {
    setClosed(true);
    try {
      sessionStorage.setItem('poroshka_fixed_banner_dismissed', 'true');
    } catch {}
  };

  // If ads are globally disabled in settings, render nothing
  if (!ads.ads_enabled) {
    return null;
  }

  const normalizedSlot = normalizeSlotKey(slot);
  const tagHtml = ads.placements?.[normalizedSlot] || DEFAULT_AD_PLACEMENTS[normalizedSlot]?.defaultTag;

  if (!tagHtml) {
    return null;
  }

  // 1. Top Header Banner (Sticky / Top Header placement)
  // Per requirement 1.4: Remove padding to avoid shrinking the banner
  // Per requirement 1.5: Zero direct styles on the ad tag itself
  if (normalizedSlot === 'header_top') {
    if (closed || ads.fixed_banner_position === 'off') {
      return null;
    }

    return (
      <div className="w-full bg-[#10265D] text-white border-b border-[#2864F0]/30 shadow-sm relative z-30 transition-all p-0 m-0">
        <div className="max-w-7xl mx-auto flex items-center justify-between p-0">
          <div
            className="flex-1 flex justify-center items-center overflow-hidden p-0 m-0"
            dangerouslySetInnerHTML={{ __html: tagHtml }}
          />
          <button
            onClick={handleDismiss}
            aria-label="بستن بنر"
            className="p-1.5 m-1 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors flex-shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  // 2. Prompt Grid Card Placements
  if (normalizedSlot === 'grid_card_1' || normalizedSlot === 'grid_card_2') {
    return (
      <div className={`rounded-2xl border border-dashed border-[#E5E9F2] bg-[#F6F8FC] p-4 flex flex-col items-center justify-center relative min-h-[220px] transition-colors hover:border-[#2864F0] ${className}`}>
        <div
          className="w-full flex items-center justify-center"
          dangerouslySetInnerHTML={{ __html: tagHtml }}
        />
      </div>
    );
  }

  // 3. Single Prompt Detail Placement (above live preview)
  if (normalizedSlot === 'single_prompt_preview') {
    return (
      <div className={`w-full my-4 p-3 rounded-2xl bg-[#F6F8FC] border border-[#E5E9F2] flex flex-col items-center justify-center ${className}`}>
        <div
          className="w-full flex justify-center overflow-hidden min-h-[90px]"
          dangerouslySetInnerHTML={{ __html: tagHtml }}
        />
      </div>
    );
  }

  // 4. Content Pages & Admin Placements (/about, /faq, /terms, /privacy, /contact, /admin)
  return (
    <div className={`my-8 p-3 rounded-2xl bg-[#F6F8FC] border border-[#E5E9F2] flex flex-col items-center justify-center ${className}`}>
      <div
        className="w-full flex justify-center min-h-[90px]"
        dangerouslySetInnerHTML={{ __html: tagHtml }}
      />
    </div>
  );
}
