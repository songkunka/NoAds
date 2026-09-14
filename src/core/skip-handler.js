/**
 * CleanVideo Skip Handler
 * Auto-detect and trigger "Skip Ad" / "ข้ามโฆษณา" buttons on video players
 */

class CleanVideoSkipHandler {
  constructor(detector, rules, onAction) {
    this.detector = detector;
    this.rules = rules || {};
    this.onAction = onAction || (() => {});
    this.clickedElements = new WeakSet();
    this.lastSkipTime = 0;
    this.minInterval = 600; // minimum ms between skip actions
  }

  /**
   * Dispatch full touch and click sequence compatible with Mobile Safari
   */
  simulateSafeClick(el) {
    if (!el) return false;

    try {
      const rect = el.getBoundingClientRect();
      const clientX = rect.left + rect.width / 2;
      const clientY = rect.top + rect.height / 2;

      // 1. Pointer & Touch events for iOS Safari
      const touchObj = new Touch({
        identifier: Date.now(),
        target: el,
        clientX,
        clientY,
        radiusX: 2.5,
        radiusY: 2.5,
        rotationAngle: 0,
        force: 0.5
      });

      const touchEventInit = {
        bubbles: true,
        cancelable: true,
        view: window,
        touches: [touchObj],
        targetTouches: [touchObj],
        changedTouches: [touchObj]
      };

      try {
        el.dispatchEvent(new TouchEvent('touchstart', touchEventInit));
        el.dispatchEvent(new TouchEvent('touchend', touchEventInit));
      } catch (e) {
        // Fallback if Touch constructor fails in some environments
      }

      // 2. Mouse events
      const mouseEventInit = {
        bubbles: true,
        cancelable: true,
        view: window,
        clientX,
        clientY
      };
      el.dispatchEvent(new MouseEvent('mousedown', mouseEventInit));
      el.dispatchEvent(new MouseEvent('mouseup', mouseEventInit));

      // 3. Native click
      el.click();
      return true;
    } catch (err) {
      console.warn('[CleanVideo] Safe click fallback:', err);
      try {
        el.click();
        return true;
      } catch (e) {
        return false;
      }
    }
  }

  /**
   * Scan page and video player for active Skip buttons
   */
  scanAndSkip() {
    const now = Date.now();
    if (now - this.lastSkipTime < this.minInterval) return false;

    // 1. Check site-specific selectors
    const host = window.location.hostname;
    for (const [domain, config] of Object.entries(this.rules.domains || {})) {
      if (host.includes(domain) || domain === 'generic-streaming') {
        if (config.skipSelectors) {
          for (const selector of config.skipSelectors) {
            const targets = document.querySelectorAll(selector);
            for (const target of targets) {
              if (this.detector.isVisible(target) && !this.clickedElements.has(target)) {
                this.executeSkip(target, `site_rule (${domain})`);
                return true;
              }
            }
          }
        }
      }
    }

    // 2. Global keyword-based detection on buttons, anchors, and clickable divs
    const candidates = document.querySelectorAll('button, a, [role="button"], div[class*="skip"], span[class*="skip"]');
    const skipKeywords = (this.rules.global && this.rules.global.skipKeywords) || [
      'ข้ามโฆษณา', 'ข้าม', 'skip ad', 'skip advertisement', 'skip'
    ];

    for (const el of candidates) {
      if (this.clickedElements.has(el)) continue;
      if (!this.detector.isVisible(el)) continue;

      const text = this.detector.getNormalizedText(el);
      const ariaLabel = (el.getAttribute('aria-label') || '').toLowerCase();
      const title = (el.getAttribute('title') || '').toLowerCase();

      const matchesKeyword = skipKeywords.some(kw => 
        text === kw || 
        text.startsWith(kw) || 
        ariaLabel.includes(kw) || 
        title.includes(kw)
      );

      if (matchesKeyword) {
        // Must be near or over a video, or have skip class/attribute
        const isNearVideo = this.detector.isOverVideo(el) || el.closest('.video-player') || el.closest('#player') || el.closest('.player');
        const hasSkipClass = /skip/i.test(el.className) || /skip/i.test(el.id);

        if (isNearVideo || hasSkipClass || text.length <= 18) {
          this.executeSkip(el, `keyword_match ("${text || ariaLabel}")`);
          return true;
        }
      }
    }

    return false;
  }

  executeSkip(el, reason) {
    this.clickedElements.add(el);
    this.lastSkipTime = Date.now();
    const success = this.simulateSafeClick(el);
    if (success) {
      this.onAction({
        type: 'skip_ad',
        reason,
        element: el,
        timestamp: new Date().toLocaleTimeString()
      });
    }
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = CleanVideoSkipHandler;
}
