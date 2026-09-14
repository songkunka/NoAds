/**
 * CleanVideo Redirect Guard
 * Intercepts unprompted popunders, new tabs, and window.open redirects on Mobile Safari
 */

class CleanVideoRedirectGuard {
  constructor(onAction) {
    this.onAction = onAction || (() => {});
    this.originalWindowOpen = null;
    this.adUrlPatterns = [
      /popads/i, /adcash/i, /bet\d+/i, /casino/i, /slot/i,
      /track/i, /click\./i, /doubleclick/i, /syndication/i,
      /exoclick/i, /trafficjunky/i, /propellerads/i
    ];
    this.installed = false;
  }

  install() {
    if (this.installed || typeof window === 'undefined') return;
    this.originalWindowOpen = window.open;

    const self = this;

    // Hook window.open safely
    window.open = function(url, target, features) {
      const urlStr = (url || '').toString();

      // Check if URL matches known ad domains or empty redirect trap
      const isAdUrl = self.adUrlPatterns.some(pat => pat.test(urlStr));
      const isEmptyPopunder = !urlStr || urlStr === 'about:blank';

      // Inspect if currently touching/interacting with video
      const activeEl = document.activeElement;
      const isTouchingVideoArea = activeEl && (activeEl.tagName === 'VIDEO' || activeEl.closest('.video-player') || activeEl.closest('.player'));

      if (isAdUrl || (isEmptyPopunder && isTouchingVideoArea)) {
        console.log(`[CleanVideo] Blocked suspicious window.open: ${urlStr || 'empty popunder'}`);
        self.onAction({
          type: 'blocked_redirect',
          reason: `Blocked popup tab (${urlStr || 'empty popunder'})`,
          timestamp: new Date().toLocaleTimeString()
        });

        // Return a mock window object to prevent site JS crash
        return {
          closed: false,
          close: () => {},
          focus: () => {},
          blur: () => {},
          location: { href: '' }
        };
      }

      // Allow legitimate user open
      return self.originalWindowOpen.call(window, url, target, features);
    };

    this.installed = true;
  }

  uninstall() {
    if (this.installed && this.originalWindowOpen) {
      window.open = this.originalWindowOpen;
      this.installed = false;
    }
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = CleanVideoRedirectGuard;
}
