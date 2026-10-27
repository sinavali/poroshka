/**
 * Persistent Ad Pool Manager
 * Preserves Yektanet and external ad network tags across Next.js SPA navigations,
 * tab changes, and catalog pagination without re-executing or destroying DOM nodes.
 */

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
    // Only update innerHTML if the configured tag was modified in settings
    slotHolder.dataset.tagHtml = fallbackTagHtml;
    slotHolder.innerHTML = fallbackTagHtml;
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
