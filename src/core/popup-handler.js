/**
 * CleanVideo Popup Handler (v2.0)
 * Auto-close popups, remove Thai gambling banners, and restore scrolling
 * Incorporates extensive Thai ad filters from AdBlock-Thai-Filters
 */

class CleanVideoPopupHandler {
  constructor(detector, rules, onAction) {
    this.detector = detector;
    this.rules = rules || {};
    this.onAction = onAction || (() => {});
    this.processedElements = new WeakSet();
    this.closeKeywords = (rules.global && rules.global.closeKeywords) || [
      'close', 'dismiss', 'ปิด', 'ปิดโฆษณา', 'ปิดหน้าต่างนี้', '×', '✕', '✖', 'cancel', 'ปิดป้ายนี้'
    ];
    this.closeAriaLabels = (rules.global && rules.global.closeAriaLabels) || [
      'close', 'dismiss', 'close advertisement', 'close dialog', 'ปิด', 'ปิดหน้าต่าง'
    ];
    this.thaiAdHrefs = (rules.global && rules.global.thaiAdHrefKeywords) || [
      'ruay', 'ufa', 'slot', 'bet', 'casino', 'sagame', 'pgslot', 'gclub',
      'ts911', 'sexygame', 'lotto', 'wmbet', 'hydra', 'baccarat', 'joker',
      'ambbet', 'superslot', 'bk8', 'w88', 'dafabet', '168', 'lin.ee',
      'line.me/R', 'cutt.ly', 'bit.ly', 'lihi1', 'huc99', 'aka555', '037uhd',
      'agobet', 'zeed678', 'alpha88', 'juad888', 'icasino', 'wstar99',
      'huaylike', 'texas789', 'ptgame88', 'panama888', 'london168', 'live222th',
      'brazil999', 'ssgame', 'kingdom66', 'hotgraph88', 'newyork888', 'lockdown168',
      'chokdee777', 'supermariobet', '1688sagame', 'mahagame', '77lotto',
      'slotgame', 'vip168sa', '1688sexygame', 'mc99bet', 'queenslot',
      'winufa369', 'joker123', 'slotxo', 'bet2you', 'lotto432'
    ];
  }

  /**
   * Find close button inside a popup container
   */
  findCloseButton(container) {
    const classSelectors = [
      '.close', '.btn-close', '.close-btn', '.popup-close', '.close-x',
      '[class*="close"]', '[id*="close"]', '[data-dismiss="modal"]', '.banner-close'
    ];
    for (const sel of classSelectors) {
      try {
        const btn = container.querySelector(sel);
        if (btn && this.detector.isVisible(btn)) return btn;
      } catch (e) {}
    }

    const candidates = container.querySelectorAll('button, a, span, div[role="button"]');
    for (const el of candidates) {
      if (!this.detector.isVisible(el)) continue;

      const text = this.detector.getNormalizedText(el);
      const aria = (el.getAttribute('aria-label') || '').toLowerCase();
      const title = (el.getAttribute('title') || '').toLowerCase();

      if (this.closeKeywords.some(kw => text === kw || text.includes(kw))) return el;
      if (this.closeAriaLabels.some(label => aria.includes(label) || title.includes(label))) return el;
    }

    return null;
  }

  /**
   * Restore document scrolling if locked by an ad modal
   */
  restoreBodyScroll() {
    if (document.body) {
      document.body.style.setProperty('overflow', 'auto', 'important');
    }
    if (document.documentElement) {
      document.documentElement.style.setProperty('overflow', 'auto', 'important');
    }
  }

  /**
   * Clean Thai Gambling Banners & Links based on AdBlock-Thai-Filters
   */
  cleanThaiGamblingBanners() {
    const selector = this.thaiAdHrefs.map(kw => `a[href*="${kw}"]`).join(', ');
    try {
      const adLinks = document.querySelectorAll(selector);
      for (const a of adLinks) {
        if (this.processedElements.has(a)) continue;
        this.processedElements.add(a);

        const bannerContainer = a.closest(
          'div[class*="banner"], div[id*="banner"], center, .header-ads, .ads-images, .ads-banner, #flt-bn, #fixedban, #floating_banner_top, #divAdsBg, #modalads, #player_inzad, .center_lnwphp, .pd-bn, div[style*="fixed"], div[style*="sticky"]'
        ) || a.parentElement;

        if (bannerContainer && bannerContainer !== document.body && bannerContainer !== document.documentElement) {
          bannerContainer.style.setProperty('display', 'none', 'important');
          bannerContainer.setAttribute('data-cleanvideo-hidden', 'true');
        } else {
          a.style.setProperty('display', 'none', 'important');
        }

        this.onAction({
          type: 'removed_thai_ad_banner',
          reason: `Removed banner linking to ${a.href.slice(0, 45)}...`,
          element: a,
          timestamp: new Date().toLocaleTimeString()
        });
      }
    } catch (e) {}
  }

  /**
   * Scan for ad popups and execute close/removal
   */
  scanAndHandle() {
    // 1. Clean Thai Gambling Banners first
    this.cleanThaiGamblingBanners();

    // 2. Scan known popup & banner selectors
    const selectors = (this.rules.global && this.rules.global.popupSelectors) || [
      '.ad-popup', '.popup-ad', '.modal-ad', '.video-overlay-ad',
      '.header-ads', '.ads-images', '.ads-banner', '.floating-ad',
      '.sweet-alert', '.swal2-container', '[class*="floating-banner"]',
      '#player_inzad', '#flt-bn', '#fixedban', '#floating_banner_top',
      '#divAdsBg', '#modalads', '.center_lnwphp'
    ];

    for (const sel of selectors) {
      try {
        const popups = document.querySelectorAll(sel);
        for (const popup of popups) {
          if (this.processedElements.has(popup)) continue;
          if (popup.id === 'cleanvideo-mobile-hud' || popup.closest('#cleanvideo-mobile-hud')) continue;

          this.handlePopupElement(popup, 90, ['matched_popup_selector']);
        }
      } catch (e) {}
    }

    // 3. Scan all fixed/absolute floating modals and overlays in DOM
    const floatingElements = document.querySelectorAll(
      'div[class*="popup"], div[id*="popup"], div[class*="modal"], div[id*="modal"], div[class*="overlay"], div[class*="dialog"]'
    );
    for (const el of floatingElements) {
      if (this.processedElements.has(el)) continue;
      if (el.id === 'cleanvideo-mobile-hud' || el.closest('#cleanvideo-mobile-hud')) continue;

      const { score, reasons } = this.detector.scoreElement(el);
      if (score >= 45) {
        this.handlePopupElement(el, score, reasons);
      }
    }
  }

  handlePopupElement(el, score, reasons) {
    this.processedElements.add(el);

    // Try finding and clicking close button first
    const closeBtn = this.findCloseButton(el);
    if (closeBtn) {
      try {
        closeBtn.click();
        this.restoreBodyScroll();
        this.onAction({
          type: 'closed_popup_button',
          reason: `Auto-clicked close button (${reasons.join(', ')})`,
          element: el,
          score,
          timestamp: new Date().toLocaleTimeString()
        });
        return;
      } catch (err) {}
    }

    // Hide or remove popup directly
    el.style.setProperty('display', 'none', 'important');
    el.setAttribute('data-cleanvideo-hidden', 'true');
    this.restoreBodyScroll();

    // Remove any accompanying backdrop
    const backdrops = document.querySelectorAll('.modal-backdrop, .ad-backdrop, .overlay-backdrop');
    backdrops.forEach(bd => bd.remove());

    this.onAction({
      type: 'removed_popup_overlay',
      reason: `Removed ad popup (${score} pts: ${reasons.join(', ')})`,
      element: el,
      score,
      timestamp: new Date().toLocaleTimeString()
    });
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = CleanVideoPopupHandler;
}
