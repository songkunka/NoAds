/**
 * CleanVideo Skip Handler (v2.0)
 * Fast-forward video ads (16x speed & instant seek & ended dispatch)
 * Auto-forces hidden skip buttons to show and click them immediately
 * Eliminates the 5-second countdown wait on streaming sites
 */

class CleanVideoSkipHandler {
  constructor(detector, rules, onAction, playerHook) {
    this.detector = detector;
    this.rules = rules || {};
    this.onAction = onAction || (() => {});
    this.playerHook = playerHook || null;
    this.clickedElements = new WeakSet();
    this.lastSkipTime = 0;
    this.minInterval = 250;
  }

  /**
   * Dispatch full touch and click sequence compatible with Mobile Safari
   */
  simulateSafeClick(el) {
    if (!el) return false;

    try {
      // Force remove any disabled or hidden styles
      el.removeAttribute('disabled');
      el.classList.remove('disabled', 'fluid_disabled');
      el.style.setProperty('display', 'block', 'important');
      el.style.setProperty('opacity', '1', 'important');
      el.style.setProperty('visibility', 'visible', 'important');
      el.style.setProperty('pointer-events', 'auto', 'important');
      el.style.setProperty('cursor', 'pointer', 'important');

      const rect = el.getBoundingClientRect();
      const clientX = rect.left + rect.width / 2;
      const clientY = rect.top + rect.height / 2;

      // Pointer & Touch events for iOS Safari
      try {
        const touchObj = new Touch({
          identifier: Date.now(),
          target: el,
          clientX: clientX || 100,
          clientY: clientY || 100,
          radiusX: 2.5,
          radiusY: 2.5,
          force: 0.5
        });

        const touchInit = {
          bubbles: true,
          cancelable: true,
          view: window,
          touches: [touchObj],
          targetTouches: [touchObj],
          changedTouches: [touchObj]
        };

        el.dispatchEvent(new TouchEvent('touchstart', touchInit));
        el.dispatchEvent(new TouchEvent('touchend', touchInit));
      } catch (e) {}

      // Mouse events
      const mouseInit = { bubbles: true, cancelable: true, view: window, clientX, clientY };
      el.dispatchEvent(new MouseEvent('mousedown', mouseInit));
      el.dispatchEvent(new MouseEvent('mouseup', mouseInit));

      // Native click
      el.click();
      return true;
    } catch (err) {
      try {
        el.click();
        return true;
      } catch (e) {
        return false;
      }
    }
  }

  /**
   * Fast-forward ad video, instant-seek, and dispatch 'ended' event
   */
  accelerateAdVideo() {
    const videos = document.querySelectorAll('video');
    for (const vid of videos) {
      if (this.detector.isVideoPlayingAd(vid)) {
        try {
          // 1. Mute ad immediately
          vid.muted = true;

          // 2. Set to maximum playback rate
          if (vid.playbackRate < 16.0) {
            vid.playbackRate = 16.0;
          }

          // 3. Instant seek to the end of ad
          if (Number.isFinite(vid.duration) && vid.duration > 0 && vid.currentTime < vid.duration - 0.1) {
            vid.currentTime = vid.duration - 0.02;
          }

          // 4. Force dispatch 'ended' to trigger player's internal transition
          vid.dispatchEvent(new Event('ended'));
        } catch (err) {}
      }
    }

    // 5. Trigger PlayerHook instance bypass
    if (this.playerHook && typeof this.playerHook.forceSkipActivePlayers === 'function') {
      this.playerHook.forceSkipActivePlayers();
    }

    // 6. Direct JWPlayer skip fallback
    try {
      if (typeof window.jwplayer === 'function') {
        const players = document.querySelectorAll('.jwplayer');
        players.forEach(p => {
          const jw = window.jwplayer(p.id);
          if (jw && typeof jw.skipAd === 'function') {
            jw.skipAd();
          }
        });
      }
    } catch (e) {}
  }

  /**
   * Scan page and video player for active Skip buttons and countdowns
   */
  scanAndSkip() {
    // Accelerate ad video first
    this.accelerateAdVideo();

    const now = Date.now();
    if (now - this.lastSkipTime < this.minInterval) return false;

    // 1. Primary Targeted Selectors for FluidPlayer, JWPlayer, VAST, YouTube
    const targetedSelectors = [
      '.fluid_ad_skip',
      '.fluid_ad_skip_button',
      '.skip_button',
      '.ad_countdown',
      '.jw-skip',
      '.jw-skip-icon',
      '.video-ad-skip',
      '.ytp-skip-ad-button',
      '.ytp-ad-skip-button',
      '.ytp-ad-skip-button-modern',
      '.ytp-ad-skip-button-slot button',
      '[class*="skip_button"]',
      '[class*="skip-button"]',
      '[class*="skipAd"]',
      '[class*="skip-btn"]',
      '[id*="skip-ad"]',
      '[id*="skip_ad"]'
    ];

    for (const sel of targetedSelectors) {
      const elements = document.querySelectorAll(sel);
      for (const el of elements) {
        if (!this.clickedElements.has(el)) {
          this.executeSkip(el, `targeted_selector (${sel})`);
          return true;
        }
      }
    }

    // 2. Global detection: search buttons/clickables containing skip or countdown keywords
    const candidates = document.querySelectorAll(
      'button, a, [role="button"], div[class*="skip"], span[class*="skip"], div[class*="countdown"], span[class*="countdown"]'
    );
    const skipKeywords = (this.rules.global && this.rules.global.skipKeywords) || [
      'ข้ามโฆษณา', 'ข้าม', 'ข้ามใน', 'skip ad', 'skip', 'skip in'
    ];

    for (const el of candidates) {
      if (this.clickedElements.has(el)) continue;

      const text = this.detector.getNormalizedText(el);
      const ariaLabel = (el.getAttribute('aria-label') || '').toLowerCase();
      const title = (el.getAttribute('title') || '').toLowerCase();

      const matchesKeyword = skipKeywords.some(kw =>
        text.includes(kw) || ariaLabel.includes(kw) || title.includes(kw)
      );

      const hasSkipClass = /skip|countdown/i.test(`${el.className} ${el.id}`);

      if (matchesKeyword || hasSkipClass) {
        const isNearVideo = this.detector.isOverVideo(el) || el.closest('.video-player, .player-container, #player, .jwplayer, .fluid_video_wrapper');

        if (isNearVideo || hasSkipClass || text.length <= 30) {
          this.executeSkip(el, `auto_skip ("${text || ariaLabel || el.className}")`);
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
