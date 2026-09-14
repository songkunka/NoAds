/**
 * CleanVideo Skip Handler
 * Fast-forward video ads (16x speed & instant seek) and auto-trigger skip buttons
 * Eliminates the 5-second countdown wait on streaming sites
 */

class CleanVideoSkipHandler {
  constructor(detector, rules, onAction) {
    this.detector = detector;
    this.rules = rules || {};
    this.onAction = onAction || (() => {});
    this.clickedElements = new WeakSet();
    this.lastSkipTime = 0;
    this.minInterval = 400;
  }

  /**
   * Dispatch full touch and click sequence compatible with Mobile Safari
   */
  simulateSafeClick(el) {
    if (!el) return false;

    try {
      // Remove any disabled or blocking styles
      el.removeAttribute('disabled');
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
          clientX,
          clientY,
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
   * Fast-forward or instant-seek ad video to bypass the 5-second countdown
   */
  accelerateAdVideo() {
    const videos = document.querySelectorAll('video');
    for (const vid of videos) {
      if (this.detector.isVideoPlayingAd(vid)) {
        try {
          // 1. Mute ad immediately
          vid.muted = true;

          // 2. Set to maximum playback rate (16x on Safari/WebKit)
          if (vid.playbackRate < 16.0) {
            vid.playbackRate = 16.0;
          }

          // 3. Instant seek to the end of ad if duration is known
          if (Number.isFinite(vid.duration) && vid.duration > 0 && vid.currentTime < vid.duration - 0.1) {
            vid.currentTime = vid.duration - 0.05;
          }
        } catch (err) {
          // PlaybackRate or seeking might be guarded by custom player
        }
      }
    }

    // Try direct JWPlayer API skip if available
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
    // Accelerate ad video first so countdown finishes in < 0.2s
    this.accelerateAdVideo();

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

    // 2. Global detection: search for any button or clickable element containing skip or countdown keywords
    const candidates = document.querySelectorAll('button, a, [role="button"], div[class*="skip"], span[class*="skip"], div[class*="countdown"]');
    const skipKeywords = (this.rules.global && this.rules.global.skipKeywords) || [
      'ข้ามโฆษณา', 'ข้าม', 'ข้ามใน', 'skip ad', 'skip', 'skip in'
    ];

    for (const el of candidates) {
      if (this.clickedElements.has(el)) continue;
      if (!this.detector.isVisible(el)) continue;

      const text = this.detector.getNormalizedText(el);
      const ariaLabel = (el.getAttribute('aria-label') || '').toLowerCase();
      const title = (el.getAttribute('title') || '').toLowerCase();

      // Check if matches skip keywords or has skip class
      const matchesKeyword = skipKeywords.some(kw => 
        text.includes(kw) || ariaLabel.includes(kw) || title.includes(kw)
      );

      const hasSkipClass = /skip|countdown/i.test(`${el.className} ${el.id}`);

      if (matchesKeyword || hasSkipClass) {
        const isNearVideo = this.detector.isOverVideo(el) || el.closest('.video-player, .player-container, #player, .jwplayer, .fluid_video_wrapper');
        
        if (isNearVideo || hasSkipClass || text.length <= 25) {
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
