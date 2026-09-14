/**
 * CleanVideo Popup Handler
 * Auto-close and remove intrusive ad popups, modals, and backdrops
 */

class CleanVideoPopupHandler {
  constructor(detector, rules, onAction) {
    this.detector = detector;
    this.rules = rules || {};
    this.onAction = onAction || (() => {});
    this.processedElements = new WeakSet();
    this.closeKeywords = (rules.global && rules.global.closeKeywords) || [
      'close', 'dismiss', 'ปิด', 'ปิดโฆษณา', '×', '✕', '✖', 'cancel'
    ];
    this.closeAriaLabels = (rules.global && rules.global.closeAriaLabels) || [
      'close', 'dismiss', 'close advertisement', 'close dialog', 'ปิด'
    ];
  }

  /**
   * Find close button inside a popup container
   */
  findCloseButton(container) {
    // 1. Check for standard close classes
    const classSelectors = ['.close', '.btn-close', '.close-btn', '.popup-close', '[data-dismiss="modal"]'];
    for (const sel of classSelectors) {
      const btn = container.querySelector(sel);
      if (btn && this.detector.isVisible(btn)) return btn;
    }

    // 2. Scan buttons and links inside container
    const candidates = container.querySelectorAll('button, a, span, div[role="button"]');
    for (const el of candidates) {
      if (!this.detector.isVisible(el)) continue;

      const text = this.detector.getNormalizedText(el);
      const aria = (el.getAttribute('aria-label') || '').toLowerCase();
      const title = (el.getAttribute('title') || '').toLowerCase();

      if (this.closeKeywords.includes(text)) return el;
      if (this.closeAriaLabels.some(label => aria.includes(label) || title.includes(label))) return el;
    }

    return null;
  }

  /**
   * Restore document scrolling if locked by an ad modal
   */
  restoreBodyScroll() {
    if (document.body) {
      const bodyOverflow = window.getComputedStyle(document.body).overflow;
      if (bodyOverflow === 'hidden') {
        document.body.style.setProperty('overflow', 'auto', 'important');
      }
    }
    if (document.documentElement) {
      const htmlOverflow = window.getComputedStyle(document.documentElement).overflow;
      if (htmlOverflow === 'hidden') {
        document.documentElement.style.setProperty('overflow', 'auto', 'important');
      }
    }
  }

  /**
   * Scan for ad popups and execute close/removal
   */
  scanAndHandle() {
    // 1. Scan known popup selectors
    const selectors = (this.rules.global && this.rules.global.popupSelectors) || [
      '.ad-popup', '.popup-ad', '.modal-ad', '[class*="ad-banner"]', '.interstitial-ad'
    ];

    for (const sel of selectors) {
      const popups = document.querySelectorAll(sel);
      for (const popup of popups) {
        if (this.processedElements.has(popup) || !this.detector.isVisible(popup)) continue;

        const { score, reasons } = this.detector.scoreElement(popup);
        if (score >= 40) {
          this.handlePopupElement(popup, score, reasons);
        }
      }
    }

    // 2. Heuristic scan on fixed/absolute top-level containers
    const topElements = document.querySelectorAll('body > div, body > section, body > aside');
    for (const el of topElements) {
      if (this.processedElements.has(el) || !this.detector.isVisible(el)) continue;
      if (el.id === 'cleanvideo-mobile-hud') continue;

      const { score, reasons } = this.detector.scoreElement(el);
      if (score >= 70) {
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
      } catch (err) {
        console.warn('[CleanVideo] Close button click failed:', err);
      }
    }

    // If score is very high (>= 75), safely remove or hide element
    if (score >= 70) {
      el.style.setProperty('display', 'none', 'important');
      el.setAttribute('data-cleanvideo-hidden', 'true');
      this.restoreBodyScroll();

      // Also clean up any lingering modal backdrop
      const backdrops = document.querySelectorAll('.modal-backdrop, .ad-backdrop, .overlay-backdrop');
      backdrops.forEach(bd => bd.remove());

      this.onAction({
        type: 'removed_popup_overlay',
        reason: `Removed high-confidence ad popup (${score} pts: ${reasons.join(', ')})`,
        element: el,
        score,
        timestamp: new Date().toLocaleTimeString()
      });
    }
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = CleanVideoPopupHandler;
}
