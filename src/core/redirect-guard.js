/**
 * CleanVideo Redirect Guard (Layer-0 Anti-Clickjacking & Popup Blocker)
 * 1. Capture-phase click & touch blocker before site listeners trigger
 * 2. HTMLAnchorElement.prototype.click override for synthetic link clicks
 * 3. window.open trap with protected mock window object
 */

class CleanVideoRedirectGuard {
  constructor(onAction) {
    this.onAction = onAction || (() => {});
    this.originalWindowOpen = null;
    this.originalAnchorClick = null;
    this.installed = false;

    this.adKeywords = [
      'popads', 'adcash', 'bet', 'casino', 'slot', 'track', 'click.',
      'doubleclick', 'syndication', 'exoclick', 'trafficjunky', 'propellerads',
      'ruay', 'ufa', 'sagame', 'pgslot', 'gclub', 'ts911', 'sexygame', 'lotto',
      'wmbet', 'hydra', 'baccarat', 'joker', 'ambbet', 'superslot', 'bk8',
      'w88', 'dafabet', '168', 'lin.ee', 'line.me/R', 'cutt.ly', 'bit.ly',
      'lihi1', 'huc99', 'aka555', '037uhd', 'agobet', 'zeed678', 'alpha88',
      'juad888', 'icasino', 'wstar99', 'huaylike', 'texas789', 'ptgame88',
      'panama888', 'london168', 'live222th', 'brazil999', 'ssgame', 'kingdom66',
      'hotgraph88', 'newyork888', 'lockdown168', 'chokdee777', 'supermariobet'
    ];

    this.onCaptureEvent = this.handleCaptureEvent.bind(this);
  }

  isAdUrl(url) {
    if (!url) return false;
    const urlStr = url.toString().toLowerCase();
    return this.adKeywords.some(kw => urlStr.includes(kw));
  }

  install() {
    if (this.installed || typeof window === 'undefined') return;

    const self = this;

    // 1. Hook window.open safely
    this.originalWindowOpen = window.open;
    window.open = function (url, target, features) {
      const urlStr = (url || '').toString();
      const isSuspicious = !urlStr || urlStr === 'about:blank' || self.isAdUrl(urlStr);

      if (isSuspicious) {
        console.log(`[CleanVideo] Blocked popup window.open: ${urlStr || 'empty/about:blank'}`);
        self.onAction({
          type: 'blocked_redirect',
          reason: `Blocked popup tab (${urlStr || 'empty redirect trap'})`,
          timestamp: new Date().toLocaleTimeString()
        });

        // Protected mock window object preventing delayed navigation
        const mockLocation = {
          replace: (u) => console.log('[CleanVideo] Blocked location.replace:', u),
          assign: (u) => console.log('[CleanVideo] Blocked location.assign:', u),
          set href(val) { console.log('[CleanVideo] Blocked delayed popup location.href:', val); },
          get href() { return 'about:blank'; }
        };

        return {
          closed: false,
          close: () => {},
          focus: () => {},
          blur: () => {},
          postMessage: () => {},
          location: mockLocation
        };
      }

      return self.originalWindowOpen.call(window, url, target, features);
    };

    // 2. Hook HTMLAnchorElement.prototype.click (blocks synthetic <a> navigation)
    if (typeof HTMLAnchorElement !== 'undefined' && HTMLAnchorElement.prototype) {
      this.originalAnchorClick = HTMLAnchorElement.prototype.click;
      HTMLAnchorElement.prototype.click = function () {
        const href = (this.href || this.getAttribute('href') || '').toLowerCase();
        const target = (this.target || this.getAttribute('target') || '').toLowerCase();

        if (self.isAdUrl(href) || (target === '_blank' && self.isAdUrl(href))) {
          console.log('[CleanVideo] Blocked programmatic anchor click:', href);
          self.onAction({
            type: 'blocked_redirect',
            reason: `Blocked synthetic link click (${href.slice(0, 45)}...)`,
            timestamp: new Date().toLocaleTimeString()
          });
          return;
        }
        return self.originalAnchorClick.apply(this, arguments);
      };
    }

    // 3. Document-level Capture Phase Listener (Catches click-hijackers before page scripts)
    document.addEventListener('click', this.onCaptureEvent, true);
    document.addEventListener('touchend', this.onCaptureEvent, true);

    this.installed = true;
    console.log('[CleanVideo] Redirect Guard & Layer-0 Anti-Clickjacking installed');
  }

  handleCaptureEvent(e) {
    const target = e.target;
    if (!target || !(target instanceof HTMLElement)) return;

    // Ignore CleanVideo's own HUD UI
    if (target.closest('#cleanvideo-mobile-hud')) return;

    // 1. Check if user clicked an anchor pointing to gambling/ad
    const anchor = target.closest('a');
    if (anchor) {
      const href = (anchor.getAttribute('href') || '').toLowerCase();
      if (this.isAdUrl(href)) {
        e.preventDefault();
        e.stopImmediatePropagation();
        console.log('[CleanVideo] Neutralized gambling click on:', href);
        anchor.style.setProperty('display', 'none', 'important');
        this.onAction({
          type: 'blocked_redirect',
          reason: `Blocked click on gambling link (${href.slice(0, 40)}...)`,
          timestamp: new Date().toLocaleTimeString()
        });
        return;
      }
    }

    // 2. Check if clicked an invisible overlay covering the video player
    const isOverlayTrap = (
      target.classList.contains('ad-click-trap') ||
      target.classList.contains('video-mask-ad') ||
      target.hasAttribute('data-cleanvideo-neutralized') ||
      /trap|overlay-ad|click-protect/i.test(`${target.className} ${target.id}`)
    );

    if (isOverlayTrap) {
      e.preventDefault();
      e.stopImmediatePropagation();
      target.style.setProperty('display', 'none', 'important');
      target.style.setProperty('pointer-events', 'none', 'important');

      // Attempt to play underlying video directly
      const video = document.querySelector('video');
      if (video && video.paused) {
        try { video.play(); } catch (err) {}
      }

      this.onAction({
        type: 'neutralized_video_overlay',
        reason: 'Intercepted transparent click-trap on player',
        timestamp: new Date().toLocaleTimeString()
      });
    }
  }

  uninstall() {
    if (!this.installed) return;
    if (this.originalWindowOpen) window.open = this.originalWindowOpen;
    if (this.originalAnchorClick && typeof HTMLAnchorElement !== 'undefined') {
      HTMLAnchorElement.prototype.click = this.originalAnchorClick;
    }
    document.removeEventListener('click', this.onCaptureEvent, true);
    document.removeEventListener('touchend', this.onCaptureEvent, true);
    this.installed = false;
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = CleanVideoRedirectGuard;
}
