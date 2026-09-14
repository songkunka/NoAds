// ==UserScript==
// @name         CleanVideo for Mobile Safari
// @namespace    https://github.com/cleanvideo
// @version      2.0.0
// @description  Auto-skip video ads without waiting 5 seconds, eliminate popups on play, remove Thai gambling banners, and hook FluidPlayer/JWPlayer on Mobile Safari (iOS) and Desktop
// @author       CleanVideo Team
// @match        *://*/*
// @exclude      *://localhost*
// @exclude      *://127.0.0.1*
// @grant        none
// @run-at       document-start
// ==/UserScript==

(function () {
  'use strict';

  // Prevent multiple injections
  if (window.__CLEANVIDEO_INSTALLED__) return;
  window.__CLEANVIDEO_INSTALLED__ = true;

  /* ==========================================================================
     1. RULES CONFIGURATION (v2.0 WITH EXPANDED THAI AD/GAMBLING FILTERS)
     ========================================================================== */
  const RULES = {
    version: "2.0.0",
    global: {
      skipKeywords: [
        "ข้ามโฆษณา", "ข้าม", "ข้ามใน", "ข้ามตอน", "ข้ามโฆษณาใน",
        "skip ad", "skip advertisement", "skip ads", "skip intro",
        "skip", "skip in", "skip ad in"
      ],
      closeKeywords: [
        "close", "dismiss", "ปิด", "ปิดโฆษณา", "ปิดหน้าต่างนี้", "ข้ามและปิด",
        "×", "✕", "✖", "cancel", "skip ad & close", "ปิดป้ายนี้"
      ],
      closeAriaLabels: [
        "close", "dismiss", "close advertisement", "close dialog", "ปิด", "ปิดหน้าต่าง"
      ],
      thaiAdHrefKeywords: [
        "ruay", "ufa", "slot", "bet", "casino", "sagame", "pgslot", "gclub",
        "ts911", "sexygame", "lotto", "wmbet", "hydra", "baccarat", "joker",
        "ambbet", "superslot", "bk8", "w88", "dafabet", "168", "lin.ee",
        "line.me/R", "cutt.ly", "bit.ly", "lihi1", "huc99", "aka555", "037uhd",
        "agobet", "zeed678", "alpha88", "juad888", "icasino", "wstar99",
        "huaylike", "texas789", "ptgame88", "panama888", "london168", "live222th",
        "brazil999", "ssgame", "kingdom66", "hotgraph88", "newyork888", "lockdown168",
        "chokdee777", "supermariobet", "1688sagame", "mahagame", "77lotto",
        "slotgame", "vip168sa", "1688sexygame", "mc99bet", "queenslot",
        "winufa369", "joker123", "slotxo", "bet2you", "lotto432"
      ],
      popupSelectors: [
        ".ad-popup", ".popup-ad", ".modal-ad", ".video-overlay-ad",
        ".header-ads", ".ads-images", ".ads-banner", ".img-banner-center-bottom",
        ".bounce.animated.kosana", "#flt-bn", "#fixedban", "#floating_banner_top",
        "#divAdsBg", "#modalads", "#player_inzad", ".center_lnwphp", ".pd-bn",
        "[class*='ad-banner']", "[class*='overlay-ad']", "[id*='ad-popup']",
        "[id*='popup-ad']", ".interstitial-ad", ".floating-ad", ".banner-floating",
        "[id^='ads-']", "[class^='ads-']", ".sweet-alert", ".swal2-container",
        "[class*='floating-banner']", "[id*='banner-bottom']", "[class*='banner-sticky']",
        "#bottom_center_ads", "#ads728x90top", "#ads_showhide", "#bt-ads",
        "#link_h_movie_ad", ".banner-close"
      ],
      playerAdContainers: [
        ".jw-ad-container", ".fluid_ad_container", ".fluid_ad_interstitial",
        ".fluid_vpaid_slot", ".vjs-ima3-ad-container", ".ima-ad-container",
        "[class*='ad-container']", "[class*='vast-container']", "[id*='ad-player']",
        "[class*='ad-player']", ".video-ads", ".ytp-ad-module", "#player_inzad",
        ".ad_countdown"
      ]
    },
    domains: {
      "youtube.com": {
        skipSelectors: [
          ".ytp-skip-ad-button", ".ytp-ad-skip-button", ".ytp-ad-skip-button-modern",
          ".ytp-ad-skip-button-slot button"
        ],
        overlaySelectors: [
          ".ytp-ad-overlay-container", ".ytp-ad-message-container", ".ytp-ad-action-interstitial"
        ]
      },
      "generic-streaming": {
        skipSelectors: [
          ".fluid_ad_skip", ".fluid_ad_skip_button", ".skip_button", ".ad_countdown",
          ".jw-skip", ".jw-skip-icon", ".video-ad-skip", "[class*='skip-btn']",
          "[id*='skip-ad']", "[class*='skipAd']", "[class*='skip-button']",
          ".skipButton", "[class*='btn-skip']"
        ]
      }
    }
  };

  /* ==========================================================================
     2. IMMEDIATE CSS BLOCKLIST INJECTION (Instant Ad Hiding & Force-Show Skip)
     ========================================================================== */
  function injectFastBlocklist() {
    if (document.getElementById('cleanvideo-adblock-rules')) return;

    const linkRules = RULES.global.thaiAdHrefKeywords.map(k => `a[href*="${k}"]`).join(',\n');
    const containerRules = RULES.global.popupSelectors.join(',\n');

    const css = `
      /* 1. Instant Thai Gambling Banner and Popup Neutralization */
      ${linkRules},
      ${containerRules},
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

      /* 2. Force Show and Enable Skip Buttons Immediately (No Waiting 5s) */
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

  // Inject CSS as early as possible
  injectFastBlocklist();

  /* ==========================================================================
     3. TIMER OVERRIDE ENGINE (50x COUNTDOWN ACCELERATOR)
     ========================================================================== */
  class CleanVideoTimerOverride {
    constructor(speedFactor = 50) {
      this.speedFactor = speedFactor;
      this.installed = false;
      this.originalSetTimeout = null;
      this.originalSetInterval = null;
    }

    install() {
      if (this.installed || typeof window === 'undefined') return;
      this.originalSetTimeout = window.setTimeout.bind(window);
      this.originalSetInterval = window.setInterval.bind(window);

      const self = this;

      window.setTimeout = function (handler, delay, ...args) {
        let numDelay = typeof delay === 'number' ? delay : parseInt(delay, 10);
        if (isNaN(numDelay)) numDelay = 0;

        if (self.shouldAccelerate(handler, numDelay)) {
          const acceleratedDelay = Math.max(10, Math.floor(numDelay / self.speedFactor));
          return self.originalSetTimeout(handler, acceleratedDelay, ...args);
        }
        return self.originalSetTimeout(handler, numDelay, ...args);
      };

      window.setInterval = function (handler, delay, ...args) {
        let numDelay = typeof delay === 'number' ? delay : parseInt(delay, 10);
        if (isNaN(numDelay)) numDelay = 0;

        if (self.shouldAccelerate(handler, numDelay)) {
          const acceleratedDelay = Math.max(15, Math.floor(numDelay / self.speedFactor));
          return self.originalSetInterval(handler, acceleratedDelay, ...args);
        }
        return self.originalSetInterval(handler, numDelay, ...args);
      };

      this.installed = true;
    }

    shouldAccelerate(handler, delay) {
      if (delay < 150 || delay > 2500) return false;
      if (typeof handler === 'function') {
        try {
          const fnStr = handler.toString();
          if (/count|countdown|skip|timer|remain|tick|vast|preroll|ad_text|seconds|ข้าม/i.test(fnStr)) {
            return true;
          }
        } catch (e) {}
      } else if (typeof handler === 'string') {
        if (/count|skip|timer|ad|vast/i.test(handler)) return true;
      }

      try {
        if (document.querySelector('.fluid_ad_container, .jw-ad-container, .ad_countdown, .fluid_ad_skip, .skip_button, [class*="skip"]')) {
          return true;
        }
      } catch (e) {}

      return false;
    }
  }

  /* ==========================================================================
     4. PLAYER API HOOK (FLUIDPLAYER, JWPLAYER, VIDEOJS)
     ========================================================================== */
  class CleanVideoPlayerHook {
    constructor(onAction) {
      this.onAction = onAction || (() => {});
      this.installed = false;
      this.fluidPlayerInstances = new Set();
    }

    install() {
      if (this.installed || typeof window === 'undefined') return;
      this.hookFluidPlayer();
      this.hookJWPlayer();
      this.hookVideoJS();
      this.installed = true;
    }

    hookFluidPlayer() {
      const self = this;
      const wrapFP = (origFP) => {
        if (typeof origFP !== 'function' || origFP.__cleanvideo_wrapped__) return origFP;
        const wrapped = function (target, options = {}) {
          try {
            if (options && options.vastOptions) {
              options.vastOptions.adList = [];
              options.vastOptions.skipoffset = 0;
              options.vastOptions.allowVPAID = false;
              self.onAction({
                type: 'neutralized_vast_config',
                reason: 'Bypassed FluidPlayer VAST pre-roll ads at init',
                timestamp: new Date().toLocaleTimeString()
              });
            }
          } catch (e) {}

          const instance = origFP.apply(this, arguments);
          if (instance) {
            self.fluidPlayerInstances.add(instance);
            try {
              if (typeof instance.playRoll === 'function') {
                instance.playRoll = function () {
                  if (typeof instance.onVastAdEnded === 'function') instance.onVastAdEnded();
                };
              }
            } catch (e) {}
          }
          return instance;
        };
        wrapped.__cleanvideo_wrapped__ = true;
        return wrapped;
      };

      if (window.fluidPlayer) {
        window.fluidPlayer = wrapFP(window.fluidPlayer);
      } else {
        let _fp = undefined;
        try {
          Object.defineProperty(window, 'fluidPlayer', {
            configurable: true,
            enumerable: true,
            get() { return _fp; },
            set(val) { _fp = wrapFP(val); }
          });
        } catch (e) {}
      }
    }

    hookJWPlayer() {
      const self = this;
      const wrapJW = (origJW) => {
        if (typeof origJW !== 'function' || origJW.__cleanvideo_wrapped__) return origJW;
        const wrapped = function () {
          const player = origJW.apply(this, arguments);
          if (player && typeof player.setup === 'function' && !player.setup.__cleanvideo_wrapped__) {
            const origSetup = player.setup;
            player.setup = function (config = {}) {
              if (config && config.advertising) {
                delete config.advertising;
                self.onAction({
                  type: 'neutralized_jw_ads',
                  reason: 'Removed JWPlayer advertising configuration',
                  timestamp: new Date().toLocaleTimeString()
                });
              }
              const instance = origSetup.call(this, config);
              try {
                if (instance && typeof instance.on === 'function') {
                  instance.on('adPlay', () => {
                    if (typeof instance.skipAd === 'function') instance.skipAd();
                  });
                }
              } catch (e) {}
              return instance;
            };
            player.setup.__cleanvideo_wrapped__ = true;
          }
          return player;
        };
        wrapped.__cleanvideo_wrapped__ = true;
        return wrapped;
      };

      if (window.jwplayer) {
        window.jwplayer = wrapJW(window.jwplayer);
      } else {
        let _jw = undefined;
        try {
          Object.defineProperty(window, 'jwplayer', {
            configurable: true,
            enumerable: true,
            get() { return _jw; },
            set(val) { _jw = wrapJW(val); }
          });
        } catch (e) {}
      }
    }

    hookVideoJS() {
      const wrapVJS = (origVJS) => {
        if (typeof origVJS !== 'function' || origVJS.__cleanvideo_wrapped__) return origVJS;
        const wrapped = function (id, options = {}) {
          if (options && options.plugins) {
            delete options.plugins.ima;
            delete options.plugins.vast;
          }
          return origVJS.apply(this, arguments);
        };
        wrapped.__cleanvideo_wrapped__ = true;
        return wrapped;
      };

      if (window.videojs) {
        window.videojs = wrapVJS(window.videojs);
      } else {
        let _vjs = undefined;
        try {
          Object.defineProperty(window, 'videojs', {
            configurable: true,
            enumerable: true,
            get() { return _vjs; },
            set(val) { _vjs = wrapVJS(val); }
          });
        } catch (e) {}
      }
    }

    forceSkipActivePlayers() {
      for (const fp of this.fluidPlayerInstances) {
        try {
          if (fp.isCurrentlyPlayingAd) {
            if (typeof fp.onVastAdEnded === 'function') fp.onVastAdEnded();
            else if (typeof fp.switchToMainVideo === 'function') fp.switchToMainVideo();
          }
        } catch (e) {}
      }
    }
  }

  /* ==========================================================================
     5. LAYER-0 REDIRECT GUARD & ANTI-CLICKJACKING
     ========================================================================== */
  class CleanVideoRedirectGuard {
    constructor(onAction) {
      this.onAction = onAction || (() => {});
      this.originalWindowOpen = null;
      this.originalAnchorClick = null;
      this.installed = false;
      this.adKeywords = RULES.global.thaiAdHrefKeywords.concat([
        'popads', 'adcash', 'track', 'click.', 'doubleclick', 'syndication',
        'exoclick', 'trafficjunky', 'propellerads'
      ]);
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

      // 1. Hook window.open safely with mock location
      this.originalWindowOpen = window.open;
      window.open = function (url, target, features) {
        const urlStr = (url || '').toString();
        const isSuspicious = !urlStr || urlStr === 'about:blank' || self.isAdUrl(urlStr);

        if (isSuspicious) {
          self.onAction({
            type: 'blocked_redirect',
            reason: `Blocked popup tab (${urlStr || 'empty/about:blank'})`,
            timestamp: new Date().toLocaleTimeString()
          });

          return {
            closed: false,
            close: () => {},
            focus: () => {},
            blur: () => {},
            postMessage: () => {},
            location: {
              replace: () => {},
              assign: () => {},
              set href(val) { console.log('[CleanVideo] Blocked popup redirect:', val); },
              get href() { return 'about:blank'; }
            }
          };
        }
        return self.originalWindowOpen.call(window, url, target, features);
      };

      // 2. Hook HTMLAnchorElement.prototype.click
      if (typeof HTMLAnchorElement !== 'undefined' && HTMLAnchorElement.prototype) {
        this.originalAnchorClick = HTMLAnchorElement.prototype.click;
        HTMLAnchorElement.prototype.click = function () {
          const href = (this.href || this.getAttribute('href') || '').toLowerCase();
          if (self.isAdUrl(href)) {
            self.onAction({
              type: 'blocked_redirect',
              reason: `Blocked synthetic anchor click (${href.slice(0, 45)}...)`,
              timestamp: new Date().toLocaleTimeString()
            });
            return;
          }
          return self.originalAnchorClick.apply(this, arguments);
        };
      }

      // 3. Document-level Capture Phase Listener
      document.addEventListener('click', this.onCaptureEvent, true);
      document.addEventListener('touchend', this.onCaptureEvent, true);

      this.installed = true;
    }

    handleCaptureEvent(e) {
      const target = e.target;
      if (!target || !(target instanceof HTMLElement)) return;
      if (target.closest('#cleanvideo-mobile-hud')) return;

      const anchor = target.closest('a');
      if (anchor) {
        const href = (anchor.getAttribute('href') || '').toLowerCase();
        if (this.isAdUrl(href)) {
          e.preventDefault();
          e.stopImmediatePropagation();
          anchor.style.setProperty('display', 'none', 'important');
          this.onAction({
            type: 'blocked_redirect',
            reason: `Blocked click on gambling link (${href.slice(0, 40)}...)`,
            timestamp: new Date().toLocaleTimeString()
          });
          return;
        }
      }

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

        const video = document.querySelector('video');
        if (video && video.paused) {
          try { video.play(); } catch (err) {}
        }

        this.onAction({
          type: 'neutralized_video_overlay',
          reason: 'Intercepted transparent click-trap on video player',
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

  /* ==========================================================================
     6. DETECTOR MODULE
     ========================================================================== */
  class CleanVideoDetector {
    constructor(rules) {
      this.rules = rules;
      this.adKeywords = [
        'ad', 'ads', 'advert', 'advertisement', 'banner', 'popup',
        'sponsor', 'promoted', 'โฆษณา', 'คาสิโน', 'สล็อต', 'bet', 'bonus', 'บาคาร่า'
      ];
      this.thaiAdHrefs = rules.global.thaiAdHrefKeywords || [];
    }

    isVisible(el) {
      if (!el || !(el instanceof HTMLElement)) return false;
      const style = window.getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden' || parseFloat(style.opacity) === 0) return false;
      const rect = el.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    }

    getNormalizedText(el) {
      if (!el) return '';
      const text = el.innerText || el.textContent || '';
      return text.trim().toLowerCase().replace(/\s+/g, ' ');
    }

    isOverVideo(el) {
      const videos = document.querySelectorAll('video');
      if (!videos.length) return false;
      const elRect = el.getBoundingClientRect();
      if (elRect.width === 0 || elRect.height === 0) return false;

      for (const vid of videos) {
        const vidRect = vid.getBoundingClientRect();
        if (vidRect.width === 0 || vidRect.height === 0) continue;
        const overlap = !(
          elRect.right < vidRect.left ||
          elRect.left > vidRect.right ||
          elRect.bottom < vidRect.top ||
          elRect.top > vidRect.bottom
        );
        if (overlap) return true;
      }
      return false;
    }

    isVideoPlayingAd(vid) {
      if (!vid || !(vid instanceof HTMLVideoElement)) return false;
      const playerAdContainers = RULES.global.playerAdContainers || [];
      for (const sel of playerAdContainers) {
        if (vid.closest(sel) || document.querySelector(sel)) return true;
      }

      const player = vid.closest('.video-player, .player-container, #player, .jwplayer, .fluid_video_wrapper') || vid.parentElement;
      if (player) {
        const pClass = (player.className || '').toString().toLowerCase();
        if (pClass.includes('ad-playing') || pClass.includes('ad-active') || pClass.includes('jw-flag-ads')) {
          return true;
        }
        const skipOrCountdown = player.querySelector('[class*="skip"], [class*="countdown"], [id*="skip"]');
        if (skipOrCountdown) return true;
      }

      const src = (vid.currentSrc || vid.src || '').toLowerCase();
      if (src.includes('ad') || src.includes('preroll') || src.includes('vast')) return true;

      return false;
    }

    scoreElement(el) {
      if (!el || !(el instanceof HTMLElement)) return { score: 0, reasons: [] };
      if (el.tagName === 'VIDEO' || el.closest('video') || el.closest('#cleanvideo-mobile-hud')) {
        return { score: 0, reasons: ['whitelisted_tag'] };
      }

      let score = 0;
      const reasons = [];
      const style = window.getComputedStyle(el);
      const classAndId = `${el.className || ''} ${el.id || ''}`.toLowerCase();

      const links = el.tagName === 'A' ? [el] : el.querySelectorAll('a');
      for (const a of links) {
        const href = (a.getAttribute('href') || '').toLowerCase();
        for (const kw of this.thaiAdHrefs) {
          if (href.includes(kw)) {
            score += 55;
            reasons.push(`thai_gambling_link (${kw})`);
            break;
          }
        }
      }

      const zIndex = parseInt(style.zIndex, 10);
      if (!isNaN(zIndex)) {
        if (zIndex >= 99999) { score += 25; reasons.push(`very_high_z_index (${zIndex})`); }
        else if (zIndex >= 500) { score += 15; reasons.push(`high_z_index (${zIndex})`); }
      }

      if (style.position === 'fixed' || style.position === 'absolute' || style.position === 'sticky') {
        score += 15; reasons.push(`position_${style.position}`);
      }

      for (const kw of this.adKeywords) {
        const regex = new RegExp(`(^|[-_\\s])${kw}([-_\\s]|$)`, 'i');
        if (regex.test(classAndId)) {
          score += 30; reasons.push(`class_keyword (${kw})`);
          break;
        }
      }

      if (this.isOverVideo(el)) {
        score += 25; reasons.push('overlays_video_player');
      }

      return { score, reasons };
    }
  }

  /* ==========================================================================
     7. SKIP HANDLER (v2.0 WITH ENDED DISPATCH & FORCE VISIBILITY)
     ========================================================================== */
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

    simulateSafeClick(el) {
      if (!el) return false;
      try {
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

        try {
          const touchObj = new Touch({ identifier: Date.now(), target: el, clientX: clientX || 100, clientY: clientY || 100 });
          el.dispatchEvent(new TouchEvent('touchstart', { bubbles: true, cancelable: true, touches: [touchObj] }));
          el.dispatchEvent(new TouchEvent('touchend', { bubbles: true, cancelable: true, touches: [touchObj] }));
        } catch (e) {}

        el.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, clientX, clientY }));
        el.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true, clientX, clientY }));
        el.click();
        return true;
      } catch (err) {
        try { el.click(); return true; } catch (e) { return false; }
      }
    }

    accelerateAdVideo() {
      const videos = document.querySelectorAll('video');
      for (const vid of videos) {
        if (this.detector.isVideoPlayingAd(vid)) {
          try {
            vid.muted = true;
            if (vid.playbackRate < 16.0) vid.playbackRate = 16.0;
            if (Number.isFinite(vid.duration) && vid.duration > 0 && vid.currentTime < vid.duration - 0.1) {
              vid.currentTime = vid.duration - 0.02;
            }
            vid.dispatchEvent(new Event('ended'));
          } catch (e) {}
        }
      }

      if (this.playerHook && typeof this.playerHook.forceSkipActivePlayers === 'function') {
        this.playerHook.forceSkipActivePlayers();
      }

      try {
        if (typeof window.jwplayer === 'function') {
          const players = document.querySelectorAll('.jwplayer');
          players.forEach(p => {
            const jw = window.jwplayer(p.id);
            if (jw && typeof jw.skipAd === 'function') jw.skipAd();
          });
        }
      } catch (e) {}
    }

    scanAndSkip() {
      this.accelerateAdVideo();

      const now = Date.now();
      if (now - this.lastSkipTime < this.minInterval) return false;

      const targetedSelectors = [
        '.fluid_ad_skip', '.fluid_ad_skip_button', '.skip_button', '.ad_countdown',
        '.jw-skip', '.jw-skip-icon', '.video-ad-skip', '.ytp-skip-ad-button',
        '.ytp-ad-skip-button', '.ytp-ad-skip-button-modern', '.ytp-ad-skip-button-slot button',
        '[class*="skip_button"]', '[class*="skip-button"]', '[class*="skipAd"]',
        '[class*="skip-btn"]', '[id*="skip-ad"]', '[id*="skip_ad"]'
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

      const candidates = document.querySelectorAll(
        'button, a, [role="button"], div[class*="skip"], span[class*="skip"], div[class*="countdown"], span[class*="countdown"]'
      );
      const skipKeywords = this.rules.global.skipKeywords || ['ข้ามโฆษณา', 'ข้าม', 'skip ad', 'skip'];

      for (const el of candidates) {
        if (this.clickedElements.has(el)) continue;

        const text = this.detector.getNormalizedText(el);
        const ariaLabel = (el.getAttribute('aria-label') || '').toLowerCase();
        const matchesKeyword = skipKeywords.some(kw => text.includes(kw) || ariaLabel.includes(kw));
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

  /* ==========================================================================
     8. OVERLAY HANDLER
     ========================================================================== */
  class CleanVideoOverlayHandler {
    constructor(detector, rules, onAction) {
      this.detector = detector;
      this.rules = rules || {};
      this.onAction = onAction || (() => {});
      this.handledOverlays = new WeakSet();
    }

    scanAndClean() {
      const specificAdOverlays = document.querySelectorAll(
        '.fluid_ad_interstitial, .fluid_ad_container, .fluid_ad_text, .fluid_ad_cta, .fluid_ad_playing, .fluid_vpaid_slot, .jw-ad-container, .ad_countdown'
      );
      for (const el of specificAdOverlays) {
        if (this.handledOverlays.has(el)) continue;
        if (el.classList.contains('fluid_ad_skip') || el.classList.contains('skip_button')) continue;

        this.handledOverlays.add(el);
        el.style.setProperty('display', 'none', 'important');
        el.style.setProperty('pointer-events', 'none', 'important');
        this.onAction({
          type: 'neutralized_video_overlay',
          reason: `Cleaned player ad overlay (${el.className})`,
          timestamp: new Date().toLocaleTimeString()
        });
      }

      const videos = document.querySelectorAll('video');
      for (const video of videos) {
        const vRect = video.getBoundingClientRect();
        if (vRect.width === 0 || vRect.height === 0) continue;
        const playerParent = video.closest('.video-player, .player-container, #player, .jwplayer, .fluid_video_wrapper') || video.parentElement;
        if (!playerParent) continue;

        const potentialOverlays = playerParent.querySelectorAll('div, a, span');
        for (const el of potentialOverlays) {
          if (this.handledOverlays.has(el) || el === video || el.contains(video)) continue;
          if (/control|progress|timeline/i.test(`${el.className} ${el.id}`)) continue;
          if (/skip/i.test(`${el.className} ${el.id}`)) continue;

          const rect = el.getBoundingClientRect();
          const style = window.getComputedStyle(el);
          const zIndex = parseInt(style.zIndex, 10);

          const isCoveringVideo = (
            rect.width >= vRect.width * 0.5 &&
            rect.height >= vRect.height * 0.5 &&
            (style.position === 'absolute' || style.position === 'fixed')
          );

          if (isCoveringVideo) {
            const isTransparent = parseFloat(style.opacity) < 0.2 || style.backgroundColor === 'transparent';
            const hasAdAttr = /ad|banner|click|trap|protect|mask/i.test(`${el.className} ${el.id}`);

            if (hasAdAttr || (isTransparent && zIndex > 5)) {
              this.handledOverlays.add(el);
              el.style.setProperty('pointer-events', 'none', 'important');
              el.style.setProperty('display', 'none', 'important');
              el.setAttribute('data-cleanvideo-neutralized', 'true');
              this.onAction({
                type: 'neutralized_video_overlay',
                reason: `Neutralized video click-trap (z-index: ${zIndex})`,
                timestamp: new Date().toLocaleTimeString()
              });
            }
          }
        }
      }
    }
  }

  /* ==========================================================================
     9. POPUP HANDLER
     ========================================================================== */
  class CleanVideoPopupHandler {
    constructor(detector, rules, onAction) {
      this.detector = detector;
      this.rules = rules || {};
      this.onAction = onAction || (() => {});
      this.processedElements = new WeakSet();
      this.closeKeywords = rules.global.closeKeywords || ['close', 'dismiss', 'ปิด', '×', '✕'];
      this.closeAriaLabels = rules.global.closeAriaLabels || ['close', 'dismiss', 'ปิด'];
      this.thaiAdHrefs = rules.global.thaiAdHrefKeywords || [];
    }

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
        if (this.closeKeywords.some(kw => text === kw || text.includes(kw))) return el;
        if (this.closeAriaLabels.some(l => aria.includes(l))) return el;
      }
      return null;
    }

    restoreBodyScroll() {
      if (document.body) document.body.style.setProperty('overflow', 'auto', 'important');
      if (document.documentElement) document.documentElement.style.setProperty('overflow', 'auto', 'important');
    }

    cleanThaiGamblingBanners() {
      const selector = this.thaiAdHrefs.map(kw => `a[href*="${kw}"]`).join(', ');
      try {
        const adLinks = document.querySelectorAll(selector);
        for (const a of adLinks) {
          if (this.processedElements.has(a)) continue;
          this.processedElements.add(a);

          const banner = a.closest(
            'div[class*="banner"], div[id*="banner"], center, .header-ads, .ads-images, .ads-banner, #flt-bn, #fixedban, #floating_banner_top, #divAdsBg, #modalads, #player_inzad, .center_lnwphp, .pd-bn, div[style*="fixed"], div[style*="sticky"]'
          ) || a.parentElement;

          if (banner && banner !== document.body && banner !== document.documentElement) {
            banner.style.setProperty('display', 'none', 'important');
          } else {
            a.style.setProperty('display', 'none', 'important');
          }

          this.onAction({
            type: 'removed_thai_ad_banner',
            reason: `Removed gambling banner (${a.href.slice(0, 45)}...)`,
            timestamp: new Date().toLocaleTimeString()
          });
        }
      } catch (e) {}
    }

    scanAndHandle() {
      this.cleanThaiGamblingBanners();

      const selectors = this.rules.global.popupSelectors || ['.ad-popup', '.popup-ad'];
      for (const sel of selectors) {
        try {
          const popups = document.querySelectorAll(sel);
          for (const popup of popups) {
            if (this.processedElements.has(popup) || popup.id === 'cleanvideo-mobile-hud' || popup.closest('#cleanvideo-mobile-hud')) continue;
            this.handlePopupElement(popup, 90, ['matched_popup_selector']);
          }
        } catch (e) {}
      }

      const floatingElements = document.querySelectorAll(
        'div[class*="popup"], div[id*="popup"], div[class*="modal"], div[id*="modal"], div[class*="overlay"], div[class*="dialog"]'
      );
      for (const el of floatingElements) {
        if (this.processedElements.has(el) || el.id === 'cleanvideo-mobile-hud' || el.closest('#cleanvideo-mobile-hud')) continue;
        const { score, reasons } = this.detector.scoreElement(el);
        if (score >= 45) this.handlePopupElement(el, score, reasons);
      }
    }

    handlePopupElement(el, score, reasons) {
      this.processedElements.add(el);
      const closeBtn = this.findCloseButton(el);
      if (closeBtn) {
        try {
          closeBtn.click();
          this.restoreBodyScroll();
          this.onAction({
            type: 'closed_popup_button',
            reason: `Auto-clicked close button (${reasons.join(', ')})`,
            timestamp: new Date().toLocaleTimeString()
          });
          return;
        } catch (e) {}
      }

      el.style.setProperty('display', 'none', 'important');
      this.restoreBodyScroll();

      const backdrops = document.querySelectorAll('.modal-backdrop, .ad-backdrop, .overlay-backdrop');
      backdrops.forEach(bd => bd.remove());

      this.onAction({
        type: 'removed_popup_overlay',
        reason: `Removed ad popup (${score} pts)`,
        timestamp: new Date().toLocaleTimeString()
      });
    }
  }

  /* ==========================================================================
     10. CENTRAL ENGINE
     ========================================================================== */
  class CleanVideoEngine {
    constructor(rules) {
      this.rules = rules;
      this.storageKey = 'cleanvideo_settings';
      this.state = this.loadState();
      this.stats = { popupsClosed: 0, adsSkipped: 0, overlaysRemoved: 0, redirectsBlocked: 0 };

      this.timerOverride = new CleanVideoTimerOverride(50);
      this.playerHook = new CleanVideoPlayerHook(this.handleAction.bind(this));

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
      return { enabled: true, whitelist: [] };
    }

    saveState() {
      try { localStorage.setItem(this.storageKey, JSON.stringify(this.state)); } catch (e) {}
    }

    isWhitelisted() {
      const host = window.location.hostname;
      return this.state.whitelist.some(d => host.includes(d));
    }

    handleAction(action) {
      if (!this.state.enabled || this.isWhitelisted()) return;
      if (action.type === 'closed_popup_button' || action.type === 'removed_popup_overlay' || action.type === 'removed_thai_ad_banner') {
        this.stats.popupsClosed++;
      } else if (action.type === 'skip_ad' || action.type === 'neutralized_vast_config' || action.type === 'neutralized_jw_ads') {
        this.stats.adsSkipped++;
      } else if (action.type === 'neutralized_video_overlay') {
        this.stats.overlaysRemoved++;
      } else if (action.type === 'blocked_redirect') {
        this.stats.redirectsBlocked++;
      }

      if (this.onStatsUpdated) this.onStatsUpdated(this.stats, action);
    }

    start() {
      if (!this.state.enabled || this.isWhitelisted()) return;

      this.timerOverride.install();
      this.playerHook.install();
      this.redirectGuard.install();
      this.runCycle();

      this.observer = new MutationObserver(() => this.requestScan());
      const target = document.body || document.documentElement;
      if (target) {
        this.observer.observe(target, { childList: true, subtree: true });
      }

      // Fast-interval polling for video playback and ad skipping (every 350ms)
      setInterval(() => {
        if (this.state.enabled) {
          this.skipHandler.accelerateAdVideo();
          this.runCycle();
        }
      }, 350);

      this.setupVideoListeners();
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
      if (!this.state.enabled || this.isWhitelisted()) return;
      this.skipHandler.scanAndSkip();
      this.overlayHandler.scanAndClean();
      this.popupHandler.scanAndHandle();
    }

    toggleEnabled() {
      this.state.enabled = !this.state.enabled;
      this.saveState();
      if (!this.state.enabled) {
        this.redirectGuard.uninstall();
      } else {
        this.start();
      }
      return this.state.enabled;
    }

    toggleWhitelist() {
      const host = window.location.hostname;
      const idx = this.state.whitelist.indexOf(host);
      if (idx >= 0) this.state.whitelist.splice(idx, 1);
      else this.state.whitelist.push(host);
      this.saveState();
      return this.isWhitelisted();
    }
  }

  /* ==========================================================================
     11. MOBILE HUD CONTROLLER (APPLE GLASSMORPHISM AESTHETICS)
     ========================================================================== */
  const HUD_CSS = `
    #cleanvideo-mobile-hud {
      --cv-bg: rgba(18, 20, 29, 0.92);
      --cv-card: rgba(28, 32, 48, 0.85);
      --cv-border: rgba(255, 255, 255, 0.15);
      --cv-primary: #3b82f6;
      --cv-success: #10b981;
      --cv-text: #f8fafc;
      --cv-text-muted: #94a3b8;
      --cv-font: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;

      position: fixed;
      z-index: 2147483647;
      font-family: var(--cv-font);
      box-sizing: border-box;
      user-select: none;
      -webkit-user-select: none;
      font-size: 14px;
      color: var(--cv-text);
      line-height: 1.4;
      pointer-events: auto;
    }
    #cleanvideo-mobile-hud * { box-sizing: border-box; margin: 0; padding: 0; }
    .cv-pill-btn {
      display: flex; align-items: center; gap: 7px;
      background: var(--cv-bg);
      backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px);
      border: 1px solid var(--cv-border);
      padding: 7px 14px; border-radius: 9999px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
      cursor: pointer; touch-action: none;
    }
    .cv-indicator-dot {
      width: 8px; height: 8px; border-radius: 50%;
      background: var(--cv-success); box-shadow: 0 0 8px var(--cv-success);
    }
    .cv-indicator-dot.disabled { background: #64748b; box-shadow: none; }
    .cv-pill-label { font-weight: 700; font-size: 12px; color: #fff; letter-spacing: 0.2px; }
    .cv-badge-count {
      background: #2563eb; color: #fff; font-size: 11px; font-weight: 700;
      padding: 1px 7px; border-radius: 12px; min-width: 18px; text-align: center;
    }
    .cv-sheet-modal {
      display: none; position: fixed; bottom: 24px; right: 20px;
      width: 310px; max-width: calc(100vw - 32px);
      background: var(--cv-bg);
      backdrop-filter: blur(24px); -webkit-backdrop-filter: blur(24px);
      border: 1px solid var(--cv-border); border-radius: 22px;
      padding: 16px; box-shadow: 0 20px 48px rgba(0, 0, 0, 0.65);
    }
    .cv-sheet-modal.open { display: block; }
    .cv-modal-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
    .cv-title-box { display: flex; align-items: center; gap: 8px; font-size: 15px; font-weight: 800; color: #fff; }
    .cv-version-tag { background: rgba(59, 130, 246, 0.2); color: #60a5fa; font-size: 10px; font-weight: 700; padding: 2px 6px; border-radius: 6px; }
    .cv-close-modal-btn {
      background: rgba(255, 255, 255, 0.1); border: none; color: var(--cv-text-muted);
      width: 26px; height: 26px; border-radius: 50%; cursor: pointer;
    }
    .cv-power-card {
      display: flex; align-items: center; justify-content: space-between;
      background: var(--cv-card); padding: 10px 12px; border-radius: 12px;
      margin-bottom: 12px; border: 1px solid rgba(255, 255, 255, 0.06);
    }
    .cv-switch { position: relative; display: inline-block; width: 44px; height: 24px; }
    .cv-switch input { opacity: 0; width: 0; height: 0; }
    .cv-slider {
      position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0;
      background-color: #475569; transition: .3s ease; border-radius: 34px;
    }
    .cv-slider:before {
      position: absolute; content: ""; height: 18px; width: 18px; left: 3px; bottom: 3px;
      background-color: white; transition: .3s ease; border-radius: 50%;
    }
    input:checked + .cv-slider { background-color: var(--cv-success); }
    input:checked + .cv-slider:before { transform: translateX(20px); }
    .cv-stats-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 12px; }
    .cv-stat-box {
      background: var(--cv-card); padding: 9px 8px; border-radius: 10px;
      text-align: center; border: 1px solid rgba(255, 255, 255, 0.05);
    }
    .cv-stat-val { font-size: 18px; font-weight: 800; color: #60a5fa; }
    .cv-stat-label { font-size: 10px; color: var(--cv-text-muted); }
    .cv-btn-action {
      width: 100%; padding: 9px; background: rgba(255, 255, 255, 0.08);
      border: 1px solid rgba(255, 255, 255, 0.1); color: #fff;
      border-radius: 10px; font-size: 12px; font-weight: 600; cursor: pointer;
      display: flex; align-items: center; justify-content: center; gap: 6px; margin-bottom: 6px;
    }
    .cv-debug-panel {
      margin-top: 8px; background: rgba(0, 0, 0, 0.5); border-radius: 8px;
      padding: 8px; max-height: 110px; overflow-y: auto; font-family: monospace;
      font-size: 10px; color: #cbd5e1; display: none;
    }
    .cv-debug-panel.show { display: block; }
  `;

  function injectHUDStyles() {
    const styleEl = document.createElement('style');
    styleEl.id = 'cleanvideo-hud-styles';
    styleEl.textContent = HUD_CSS;
    (document.head || document.documentElement).appendChild(styleEl);
  }

  class CleanVideoHUD {
    constructor(engine) {
      this.engine = engine;
      this.container = null;
      this.modal = null;
      this.isOpen = false;
    }

    mount() {
      if (document.getElementById('cleanvideo-mobile-hud')) return;

      this.container = document.createElement('div');
      this.container.id = 'cleanvideo-mobile-hud';
      this.container.style.top = '70px';
      this.container.style.right = '16px';

      this.container.innerHTML = `
        <div class="cv-pill-btn" id="cv-drag-pill">
          <span class="cv-indicator-dot ${this.engine.state.enabled ? '' : 'disabled'}" id="cv-status-dot"></span>
          <span class="cv-pill-label">CleanVideo</span>
          <span class="cv-badge-count" id="cv-badge-count">0</span>
        </div>
        <div class="cv-sheet-modal" id="cv-sheet-modal">
          <div class="cv-modal-header">
            <div class="cv-title-box">
              <span>🛡️ CleanVideo</span>
              <span class="cv-version-tag">v2.0</span>
            </div>
            <button class="cv-close-modal-btn" id="cv-close-btn">✕</button>
          </div>
          <div class="cv-power-card">
            <span>Protection Status</span>
            <label class="cv-switch">
              <input type="checkbox" id="cv-power-toggle" ${this.engine.state.enabled ? 'checked' : ''}>
              <span class="cv-slider"></span>
            </label>
          </div>
          <div class="cv-stats-grid">
            <div class="cv-stat-box"><div class="cv-stat-val" id="cv-stat-skip">0</div><div class="cv-stat-label">Ads Skipped</div></div>
            <div class="cv-stat-box"><div class="cv-stat-val" id="cv-stat-popup">0</div><div class="cv-stat-label">Popups Closed</div></div>
            <div class="cv-stat-box"><div class="cv-stat-val" id="cv-stat-overlay">0</div><div class="cv-stat-label">Overlays Cleaned</div></div>
            <div class="cv-stat-box"><div class="cv-stat-val" id="cv-stat-redirect">0</div><div class="cv-stat-label">Redirects Blocked</div></div>
          </div>
          <button class="cv-btn-action" id="cv-whitelist-btn">
            <span>🚫</span><span id="cv-whitelist-label">Disable on this site</span>
          </button>
          <button class="cv-btn-action" id="cv-debug-toggle-btn" style="background: transparent; border-color: rgba(255,255,255,0.05); color: #94a3b8;">
            <span>🔍</span><span>Activity Log</span>
          </button>
          <div class="cv-debug-panel" id="cv-debug-panel"></div>
        </div>
      `;

      (document.body || document.documentElement).appendChild(this.container);
      this.modal = this.container.querySelector('#cv-sheet-modal');
      this.attachEvents();
    }

    attachEvents() {
      const pill = this.container.querySelector('#cv-drag-pill');
      pill.addEventListener('click', () => {
        this.isOpen = !this.isOpen;
        this.modal.classList.toggle('open', this.isOpen);
      });

      this.container.querySelector('#cv-close-btn').addEventListener('click', () => {
        this.isOpen = false;
        this.modal.classList.remove('open');
      });

      this.container.querySelector('#cv-power-toggle').addEventListener('change', () => {
        const isEnabled = this.engine.toggleEnabled();
        this.container.querySelector('#cv-status-dot').classList.toggle('disabled', !isEnabled);
      });

      const whitelistBtn = this.container.querySelector('#cv-whitelist-btn');
      const whitelistLabel = this.container.querySelector('#cv-whitelist-label');
      whitelistBtn.addEventListener('click', () => {
        const isWhitelisted = this.engine.toggleWhitelist();
        whitelistLabel.textContent = isWhitelisted ? 'Resume on this site' : 'Disable on this site';
        this.container.querySelector('#cv-status-dot').classList.toggle('disabled', isWhitelisted);
      });

      const debugBtn = this.container.querySelector('#cv-debug-toggle-btn');
      const debugPanel = this.container.querySelector('#cv-debug-panel');
      debugBtn.addEventListener('click', () => debugPanel.classList.toggle('show'));

      this.engine.onStatsUpdated = (stats, lastAction) => {
        const total = stats.adsSkipped + stats.popupsClosed + stats.overlaysRemoved + stats.redirectsBlocked;
        this.container.querySelector('#cv-badge-count').textContent = total;
        this.container.querySelector('#cv-stat-skip').textContent = stats.adsSkipped;
        this.container.querySelector('#cv-stat-popup').textContent = stats.popupsClosed;
        this.container.querySelector('#cv-stat-overlay').textContent = stats.overlaysRemoved;
        this.container.querySelector('#cv-stat-redirect').textContent = stats.redirectsBlocked;

        if (lastAction) {
          const item = document.createElement('div');
          item.style.marginBottom = '4px';
          item.innerHTML = `<strong>[${lastAction.timestamp}]</strong> ${lastAction.type}: <em>${lastAction.reason}</em>`;
          debugPanel.insertBefore(item, debugPanel.firstChild);
        }
      };
    }
  }

  /* ==========================================================================
     12. BOOTSTRAP & INITIALIZATION
     ========================================================================== */
  const engine = new CleanVideoEngine(RULES);
  const hud = new CleanVideoHUD(engine);

  function initialize() {
    injectHUDStyles();
    hud.mount();
    engine.start();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
  } else {
    initialize();
  }
})();
