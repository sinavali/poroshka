/**
 * Persistent Ad Pool Manager
 * Preserves Yektanet and external ad network tags across Next.js SPA navigations,
 * tab changes, and catalog pagination without re-executing or destroying DOM nodes.
 */

export function checkHasAdContent(slotEl: HTMLElement | null): boolean {
  if (!slotEl) return false;

  // Look for the inner banner or native element
  const bnr = slotEl.querySelector('.yn-bnr, [id^="ynpos-"], [id^="pos-article-display-"]') || slotEl;

  // If bnr has child elements (e.g. <img>, <a>, <div>, <iframe>), ad is populated
  if (bnr.children.length > 0) {
    return true;
  }

  // If slotHolder itself has injected nodes beyond the initial wrapper
  if (slotEl.children.length > 1) {
    return true;
  }

  return false;
}

export function getPersistentAdSlot(slotKey: string, fallbackTagHtml?: string): HTMLElement | null {
  if (typeof document === 'undefined') return null;

  // 1. Ensure global hidden pool exists in the DOM
  let pool = document.getElementById('yn-persistent-ad-pool');
  if (!pool) {
    pool = document.createElement('div');
    pool.id = 'yn-persistent-ad-pool';
    pool.style.position = 'fixed';
    pool.style.top = '-99999px';
    pool.style.left = '-99999px';
    pool.style.width = '300px';
    pool.style.height = '250px';
    pool.style.overflow = 'hidden';
    pool.style.opacity = '0';
    pool.style.pointerEvents = 'none';
    pool.style.zIndex = '-9999';
    pool.setAttribute('aria-hidden', 'true');
    document.body.appendChild(pool);
  }

  // 2. Look for existing slot holder in the DOM
  let slotHolder = document.getElementById(`yn-slot-holder-${slotKey}`);
  if (!slotHolder) {
    slotHolder = document.createElement('div');
    slotHolder.id = `yn-slot-holder-${slotKey}`;
    slotHolder.className = 'yn-persistent-slot';
    slotHolder.dataset.slot = slotKey;
    if (fallbackTagHtml) {
      slotHolder.dataset.tagHtml = fallbackTagHtml;
      slotHolder.innerHTML = fallbackTagHtml;
    }
    pool.appendChild(slotHolder);
  } else if (fallbackTagHtml && slotHolder.dataset.tagHtml !== fallbackTagHtml) {
    slotHolder.dataset.tagHtml = fallbackTagHtml;
    // Only update innerHTML if it does not already contain a live ad to prevent destroying ads
    if (!checkHasAdContent(slotHolder)) {
      slotHolder.innerHTML = fallbackTagHtml;
    }
  }

  return slotHolder;
}

export function parkPersistentAdSlot(slotEl: HTMLElement | null) {
  if (!slotEl || typeof document === 'undefined') return;

  const pool = document.getElementById('yn-persistent-ad-pool');
  if (pool && slotEl.parentNode !== pool) {
    pool.appendChild(slotEl);
  }
}

export function triggerYektanetSpaReset() {
  if (typeof window === 'undefined') return;
  try {
    const bus = (window as unknown as { EventBus?: { emit: (event: string) => void } }).EventBus;
    if (bus && typeof bus.emit === 'function') {
      bus.emit('reset-ads');
    }
  } catch {
    // Silently ignore Yektanet SPA reset notice
  }
}
