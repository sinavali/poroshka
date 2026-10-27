'use client';

import React, { useMemo } from 'react';
import { usePublicSettings, DEFAULT_AD_PLACEMENTS } from '../lib/public-settings';

export function PersistentAdPool() {
  const { ads } = usePublicSettings();

  // If ads are globally disabled, do not render any ad slots
  if (!ads.ads_enabled) {
    return null;
  }

  // Pre-generate raw HTML for all 20 ad slots so they exist in SSR/initial DOM
  // without React creating virtual DOM fibers for children (using dangerouslySetInnerHTML)
  const poolHtml = useMemo(() => {
    return Object.entries(DEFAULT_AD_PLACEMENTS)
      .map(([slotKey, def]) => {
        const tag = ads.placements?.[slotKey] || def.defaultTag;
        return `<div id="yn-slot-holder-${slotKey}" class="yn-persistent-slot" data-slot="${slotKey}" data-tag-html="${tag.replace(/"/g, '&quot;')}">${tag}</div>`;
      })
      .join('');
  }, []); // Computed once on initial mount/SSR to avoid tearing down DOM nodes

  return (
    <div
      id="yn-persistent-ad-pool"
      style={{
        position: 'fixed',
        top: '-99999px',
        left: '-99999px',
        width: '300px',
        height: '250px',
        overflow: 'hidden',
        opacity: 0,
        pointerEvents: 'none',
        zIndex: -9999,
      }}
      aria-hidden="true"
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: poolHtml }}
    />
  );
}
