/**
 * CleanVideo Engine (v2.0)
 * Central Orchestrator integrating Timer Override, Player Hook,
 * Layer-0 Redirect Guard, Skip Handler, Overlay Handler, and Popup Handler
 */

class CleanVideoEngine {
  constructor(options = {}) {
    this.rules = options.rules || {};
    this.storageKey = 'cleanvideo_settings';
    this.state = this.loadState();

    this.stats = {
      popupsClosed: 0,
      adsSkipped: 0,
      overlaysRemoved: 0,
      redirectsBlocked: 0
    };
    this.debugLogs = [];

    // Core Engines & Handlers
    this.timerOverride = typeof CleanVideoTimerOverride !== 'undefined' ? new CleanVideoTimerOverride() : null;
    this.playerHook = typeof CleanVideoPlayerHook !== 'undefined' ? new CleanVideoPlayerHook(this.handleAction.bind(this)) : null;

    this.detector = new CleanVideoDetector(this.rules);
    this.skipHandler = new CleanVideoSkipHandler(this.detector, this.rules, this.handleAction.bind(this), this.playerHook);
    this.popupHandler = new CleanVideoPopupHandler(this.detector, this.rules, this.handleAction.bind(this));
    this.overlayHandler = new CleanVideoOverlayHandler(this.detector, this.rules, this.handleAction.bind(this));
    this.redirectGuard = new CleanVideoRedirectGuard(this.handleAction.bind(this));

    this.observer = null;
    this.scanPending = false;
  }

  loadState() {
    try {
      const saved = localStorage.getItem(this.storageKey);
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return {
      enabled: true,
      debugMode: false,
      showHud: true,
      whitelist: []
    };
  }

  saveState() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.state));
    } catch (e) {}
  }

  isCurrentSiteWhitelisted() {
    const host = window.location.hostname;
    return this.state.whitelist.some(domain => host.includes(domain));
  }

  handleAction(action) {
    if (!this.state.enabled || this.isCurrentSiteWhitelisted()) return;

    if (action.type === 'closed_popup_button' || action.type === 'removed_popup_overlay' || action.type === 'removed_thai_ad_banner') {
      this.stats.popupsClosed++;
    } else if (action.type === 'skip_ad' || action.type === 'neutralized_vast_config' || action.type === 'neutralized_jw_ads') {
      this.stats.adsSkipped++;
    } else if (action.type === 'neutralized_video_overlay') {
      this.stats.overlaysRemoved++;
    } else if (action.type === 'blocked_redirect') {
      this.stats.redirectsBlocked++;
    }

    if (this.state.debugMode) {
      console.log(`[CleanVideo Debug] ${action.type}:`, action.reason);
    }

    this.debugLogs.unshift(action);
    if (this.debugLogs.length > 30) this.debugLogs.pop();

    if (this.onStatsUpdated) {
      this.onStatsUpdated(this.stats, action);
    }
  }

  /**
   * Inject high-priority CSS rules to hide Thai ad banners & force show skip buttons
   */
  injectAdblockCSS() {
    if (document.getElementById('cleanvideo-adblock-rules')) return;

    const hrefRules = (this.rules.global && this.rules.global.thaiAdHrefKeywords) || [];
    const linkSelectors = hrefRules.map(k => `a[href*="${k}"]`).join(',\n');
    const containerSelectors = (this.rules.global && this.rules.global.popupSelectors || []).join(',\n');

    const css = `
      /* 1. Instant Thai Banner and Popup Hiding */
      ${linkSelectors ? linkSelectors + ',' : ''}
      ${containerSelectors ? containerSelectors + ',' : ''}
      .ad-click-trap,
      .video-mask-ad,
      .fluid_ad_interstitial,
      .fluid_ad_container,
      .fluid_ad_text,
      .fluid_ad_cta,
      .fluid_ad_playing,
      .fluid_vpaid_slot,
      .jw-ad-container,
      .jw-ad-overlay,
      #player_inzad {
        display: none !important;
        visibility: hidden !important;
        height: 0 !important;
        max-height: 0 !important;
        opacity: 0 !important;
        pointer-events: none !important;
      }

      /* 2. Force Show and Enable Skip Buttons Immediately */
      .fluid_ad_skip,
      .fluid_ad_skip_button,
      .skip_button,
      .ad_countdown,
      .jw-skip,
      .jw-skip-icon,
      .video-ad-skip,
      .ytp-skip-ad-button,
      .ytp-ad-skip-button,
      .ytp-ad-skip-button-modern,
      [class*="skip-button"],
      [class*="skip_button"],
      [class*="skipAd"],
      [class*="skip-btn"],
      [id*="skip-ad"] {
        display: block !important;
        opacity: 1 !important;
        visibility: visible !important;
        pointer-events: auto !important;
        cursor: pointer !important;
        z-index: 2147483647 !important;
      }
    `;

    const style = document.createElement('style');
    style.id = 'cleanvideo-adblock-rules';
    style.textContent = css;
    (document.head || document.documentElement).appendChild(style);
  }

  start() {
    if (!this.state.enabled || this.isCurrentSiteWhitelisted()) return;

    console.log('[CleanVideo v2.0] Enhanced protection & video accelerator running...');

    // 1. Install Timer Override Engine (50x countdown accelerator)
    if (this.timerOverride) {
      this.timerOverride.install();
    }

    // 2. Install Player API Hook (FluidPlayer / JWPlayer / VideoJS)
    if (this.playerHook) {
      this.playerHook.install();
    }

    // 3. Instant CSS ad blocking & skip-button forcing
    this.injectAdblockCSS();

    // 4. Install Layer-0 Redirect Guard
    this.redirectGuard.install();

    // 5. Initial fast scan
    this.runCycle();

    // 6. Setup Battery-friendly Throttled MutationObserver
    this.setupObserver();

    // 7. Setup Video Playback & Ad Acceleration Listeners
    this.setupVideoListeners();

    // 8. Fast-interval polling for active video playback (every 350ms)
    setInterval(() => {
      if (this.state.enabled) {
        this.skipHandler.accelerateAdVideo();
        this.runCycle();
      }
    }, 350);
  }

  setupObserver() {
    if (this.observer) this.observer.disconnect();

    this.observer = new MutationObserver(() => {
      this.requestScan();
    });

    const target = document.body || document.documentElement;
    if (target) {
      this.observer.observe(target, { childList: true, subtree: true });
    } else {
      document.addEventListener('DOMContentLoaded', () => {
        if (document.body) {
          this.observer.observe(document.body, { childList: true, subtree: true });
          this.requestScan();
        }
      });
    }
  }

  requestScan() {
    if (this.scanPending) return;
    this.scanPending = true;

    window.requestAnimationFrame(() => {
      setTimeout(() => {
        this.runCycle();
        this.scanPending = false;
      }, 40);
    });
  }

  runCycle() {
    if (!this.state.enabled || this.isCurrentSiteWhitelisted()) return;

    // Fast order:
    // 1. Accelerate and skip ads immediately
    this.skipHandler.scanAndSkip();
    // 2. Clean overlays & click-traps
    this.overlayHandler.scanAndClean();
    // 3. Clean popups, modals, and Thai betting banners
    this.popupHandler.scanAndHandle();
  }

  setupVideoListeners() {
    const bindVideos = () => {
      const videos = document.querySelectorAll('video');
      videos.forEach(vid => {
        if (!vid.dataset.cleanvideoBound) {
          vid.dataset.cleanvideoBound = 'true';
          
          vid.addEventListener('play', () => {
            this.skipHandler.accelerateAdVideo();
            this.runCycle();
          });
          vid.addEventListener('timeupdate', () => {
            if (this.detector.isVideoPlayingAd(vid)) {
              this.skipHandler.accelerateAdVideo();
            }
          });
          vid.addEventListener('loadedmetadata', () => {
            this.skipHandler.accelerateAdVideo();
            this.runCycle();
          });
        }
      });
    };

    bindVideos();
    setInterval(bindVideos, 1500);
  }

  toggleEnabled() {
    this.state.enabled = !this.state.enabled;
    this.saveState();
    if (this.state.enabled) {
      this.start();
    } else {
      if (this.timerOverride) this.timerOverride.uninstall();
      this.redirectGuard.uninstall();
      if (this.observer) this.observer.disconnect();
      const style = document.getElementById('cleanvideo-adblock-rules');
      if (style) style.remove();
    }
    return this.state.enabled;
  }

  toggleWhitelist() {
    const host = window.location.hostname;
    const index = this.state.whitelist.indexOf(host);
    if (index >= 0) {
      this.state.whitelist.splice(index, 1);
    } else {
      this.state.whitelist.push(host);
    }
    this.saveState();
    return this.isCurrentSiteWhitelisted();
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = CleanVideoEngine;
}
