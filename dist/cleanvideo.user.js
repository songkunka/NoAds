// ==UserScript==
// @name         CleanVideo for Mobile Safari
// @namespace    https://github.com/cleanvideo
// @version      1.0.0
// @description  Auto-skip video ads, auto-close popups, remove transparent overlays, and block redirect traps on Mobile Safari (iOS) and Desktop
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
     1. RULES CONFIGURATION
     ========================================================================== */
  const RULES = {
    version: "1.0.0",
    global: {
      skipKeywords: [
        "ข้ามโฆษณา", "ข้าม", "skip ad", "skip advertisement", "skip ads", "skip intro", "skip", "ข้ามตอน"
      ],
      closeKeywords: [
        "close", "dismiss", "ปิด", "ปิดโฆษณา", "ข้ามและปิด", "×", "✕", "✖", "cancel"
      ],
      closeAriaLabels: [
        "close", "dismiss", "close advertisement", "close dialog", "ปิด", "ปิดหน้าต่าง"
      ],
      popupSelectors: [
        ".ad-popup", ".popup-ad", ".modal-ad", ".video-overlay-ad",
        "[class*='ad-banner']", "[class*='overlay-ad']", "[id*='ad-popup']",
        "[id*='popup-ad']", ".interstitial-ad", ".floating-ad"
      ]
    },
    domains: {
      "youtube.com": {
        skipSelectors: [
          ".ytp-skip-ad-button", ".ytp-ad-skip-button", ".ytp-ad-skip-button-modern",
          ".ytp-ad-skip-button-slot button"
        ]
      },
      "dailymotion.com": {
        skipSelectors: [".dmp_AdSkipButton", "[class*='ad-skip']"]
      },
      "generic-streaming": {
        skipSelectors: ["[class*='skip-btn']", "[id*='skip-ad']", "[class*='skipAd']"],
        closeSelectors: ["[class*='close-btn']", "[class*='btn-close']", "[class*='close-ad']"]
      }
    }
  };

  /* ==========================================================================
     2. STYLES (MOBILE HUD)
     ========================================================================== */
  const HUD_CSS = `
    #cleanvideo-mobile-hud {
      --cv-bg: rgba(18, 20, 29, 0.90);
      --cv-card: rgba(28, 32, 48, 0.80);
      --cv-border: rgba(255, 255, 255, 0.14);
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
      display: flex; align-items: center; gap: 6px;
      background: var(--cv-bg);
      backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px);
      border: 1px solid var(--cv-border);
      padding: 7px 13px; border-radius: 9999px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.45);
      cursor: pointer; touch-action: none;
    }
    .cv-indicator-dot {
      width: 8px; height: 8px; border-radius: 50%;
      background: var(--cv-success); box-shadow: 0 0 8px var(--cv-success);
    }
    .cv-indicator-dot.disabled { background: #64748b; box-shadow: none; }
    .cv-pill-label { font-weight: 600; font-size: 12px; color: #fff; }
    .cv-badge-count {
      background: #2563eb; color: #fff; font-size: 11px; font-weight: 700;
      padding: 1px 6px; border-radius: 12px; min-width: 18px; text-align: center;
    }
    .cv-sheet-modal {
      display: none; position: fixed; bottom: 20px; right: 20px;
      width: 310px; max-width: calc(100vw - 32px);
      background: var(--cv-bg);
      backdrop-filter: blur(24px); -webkit-backdrop-filter: blur(24px);
      border: 1px solid var(--cv-border); border-radius: 20px;
      padding: 16px; box-shadow: 0 20px 48px rgba(0, 0, 0, 0.6);
    }
    .cv-sheet-modal.open { display: block; }
    .cv-modal-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
    .cv-title-box { display: flex; align-items: center; gap: 8px; font-size: 15px; font-weight: 700; color: #fff; }
    .cv-close-modal-btn {
      background: rgba(255, 255, 255, 0.1); border: none; color: var(--cv-text-muted);
      width: 26px; height: 26px; border-radius: 50%; cursor: pointer;
    }
    .cv-power-card {
      display: flex; align-items: center; justify-content: space-between;
      background: var(--cv-card); padding: 10px 12px; border-radius: 12px;
      margin-bottom: 12px; border: 1px solid rgba(255, 255, 255, 0.05);
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
      background: var(--cv-card); padding: 8px; border-radius: 10px;
      text-align: center; border: 1px solid rgba(255, 255, 255, 0.05);
    }
    .cv-stat-val { font-size: 17px; font-weight: 700; color: #60a5fa; }
    .cv-stat-label { font-size: 10px; color: var(--cv-text-muted); }
    .cv-btn-action {
      width: 100%; padding: 8px; background: rgba(255, 255, 255, 0.08);
      border: 1px solid rgba(255, 255, 255, 0.1); color: #fff;
      border-radius: 10px; font-size: 12px; font-weight: 600; cursor: pointer;
      display: flex; align-items: center; justify-content: center; gap: 6px; margin-bottom: 6px;
    }
    .cv-debug-panel {
      margin-top: 8px; background: rgba(0, 0, 0, 0.45); border-radius: 8px;
      padding: 8px; max-height: 110px; overflow-y: auto; font-family: monospace;
      font-size: 10px; color: #cbd5e1; display: none;
    }
    .cv-debug-panel.show { display: block; }
  `;

  function injectStyles() {
    const styleEl = document.createElement('style');
    styleEl.id = 'cleanvideo-styles';
    styleEl.textContent = HUD_CSS;
    (document.head || document.documentElement).appendChild(styleEl);
  }

  /* ==========================================================================
     3. DETECTOR MODULE
     ========================================================================== */
  class CleanVideoDetector {
    constructor(rules) {
      this.rules = rules;
      this.adKeywords = [
        'ad', 'ads', 'advert', 'advertisement', 'banner', 'popup',
        'sponsor', 'promoted', 'โฆษณา', 'คาสิโน', 'สล็อต', 'bet'
      ];
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

    scoreElement(el) {
      if (!el || !(el instanceof HTMLElement)) return { score: 0, reasons: [] };
      if (el.tagName === 'VIDEO' || el.closest('video') || el.closest('#cleanvideo-mobile-hud')) {
        return { score: 0, reasons: ['whitelisted_tag'] };
      }

      let score = 0;
      const reasons = [];
      const style = window.getComputedStyle(el);
      const rect = el.getBoundingClientRect();
      const classAndId = `${el.className || ''} ${el.id || ''}`.toLowerCase();

      const zIndex = parseInt(style.zIndex, 10);
      if (!isNaN(zIndex)) {
        if (zIndex >= 99999) { score += 25; reasons.push(`very_high_z_index (${zIndex})`); }
        else if (zIndex >= 1000) { score += 15; reasons.push(`high_z_index (${zIndex})`); }
      }

      if (style.position === 'fixed' || style.position === 'absolute') {
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

      const hasIframe = el.querySelector('iframe') !== null || el.tagName === 'IFRAME';
      if (hasIframe) {
        score += 20; reasons.push('contains_iframe');
      }

      return { score, reasons };
    }
  }

  /* ==========================================================================
     4. SKIP HANDLER
     ========================================================================== */
  class CleanVideoSkipHandler {
    constructor(detector, rules, onAction) {
      this.detector = detector;
      this.rules = rules || {};
      this.onAction = onAction || (() => {});
      this.clickedElements = new WeakSet();
      this.lastSkipTime = 0;
      this.minInterval = 600;
    }

    simulateSafeClick(el) {
      if (!el) return false;
      try {
        const rect = el.getBoundingClientRect();
        const clientX = rect.left + rect.width / 2;
        const clientY = rect.top + rect.height / 2;

        const touchObj = new Touch({
          identifier: Date.now(),
          target: el,
          clientX,
          clientY
        });

        try {
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

    scanAndSkip() {
      const now = Date.now();
      if (now - this.lastSkipTime < this.minInterval) return false;

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

      const candidates = document.querySelectorAll('button, a, [role="button"], div[class*="skip"], span[class*="skip"]');
      const skipKeywords = (this.rules.global && this.rules.global.skipKeywords) || ['ข้ามโฆษณา', 'ข้าม', 'skip ad', 'skip'];

      for (const el of candidates) {
        if (this.clickedElements.has(el)) continue;
        if (!this.detector.isVisible(el)) continue;

        const text = this.detector.getNormalizedText(el);
        const ariaLabel = (el.getAttribute('aria-label') || '').toLowerCase();

        const matchesKeyword = skipKeywords.some(kw =>
          text === kw || text.startsWith(kw) || ariaLabel.includes(kw)
        );

        if (matchesKeyword) {
          const isNearVideo = this.detector.isOverVideo(el) || el.closest('.video-player') || el.closest('.player');
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

  /* ==========================================================================
     5. POPUP & OVERLAY HANDLERS
     ========================================================================== */
  class CleanVideoPopupHandler {
    constructor(detector, rules, onAction) {
      this.detector = detector;
      this.rules = rules || {};
      this.onAction = onAction || (() => {});
      this.processedElements = new WeakSet();
      this.closeKeywords = (rules.global && rules.global.closeKeywords) || ['close', 'dismiss', 'ปิด', '×', '✕'];
    }

    findCloseButton(container) {
      const classSelectors = ['.close', '.btn-close', '.close-btn', '.popup-close', '[data-dismiss="modal"]'];
      for (const sel of classSelectors) {
        const btn = container.querySelector(sel);
        if (btn && this.detector.isVisible(btn)) return btn;
      }

      const candidates = container.querySelectorAll('button, a, span, div[role="button"]');
      for (const el of candidates) {
        if (!this.detector.isVisible(el)) continue;
        const text = this.detector.getNormalizedText(el);
        if (this.closeKeywords.includes(text)) return el;
      }
      return null;
    }

    restoreBodyScroll() {
      if (document.body && window.getComputedStyle(document.body).overflow === 'hidden') {
        document.body.style.setProperty('overflow', 'auto', 'important');
      }
    }

    scanAndHandle() {
      const selectors = (this.rules.global && this.rules.global.popupSelectors) || ['.ad-popup', '.popup-ad'];
      for (const sel of selectors) {
        const popups = document.querySelectorAll(sel);
        for (const popup of popups) {
          if (this.processedElements.has(popup) || !this.detector.isVisible(popup)) continue;
          const { score, reasons } = this.detector.scoreElement(popup);
          if (score >= 40) this.handlePopupElement(popup, score, reasons);
        }
      }

      const topElements = document.querySelectorAll('body > div, body > section');
      for (const el of topElements) {
        if (this.processedElements.has(el) || !this.detector.isVisible(el) || el.id === 'cleanvideo-mobile-hud') continue;
        const { score, reasons } = this.detector.scoreElement(el);
        if (score >= 70) this.handlePopupElement(el, score, reasons);
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

      if (score >= 70) {
        el.style.setProperty('display', 'none', 'important');
        this.restoreBodyScroll();
        this.onAction({
          type: 'removed_popup_overlay',
          reason: `Removed ad popup (${score} pts)`,
          timestamp: new Date().toLocaleTimeString()
        });
      }
    }
  }

  class CleanVideoOverlayHandler {
    constructor(detector, rules, onAction) {
      this.detector = detector;
      this.rules = rules || {};
      this.onAction = onAction || (() => {});
      this.handledOverlays = new WeakSet();
    }

    scanAndClean() {
      const videos = document.querySelectorAll('video');
      for (const video of videos) {
        const vRect = video.getBoundingClientRect();
        if (vRect.width === 0 || vRect.height === 0) continue;
        const playerParent = video.closest('.video-player') || video.parentElement;
        if (!playerParent) continue;

        const potentialOverlays = playerParent.querySelectorAll('div, a');
        for (const el of potentialOverlays) {
          if (this.handledOverlays.has(el) || el === video || el.contains(video)) continue;
          if (/control|progress|timeline/i.test(`${el.className} ${el.id}`)) continue;

          const rect = el.getBoundingClientRect();
          const style = window.getComputedStyle(el);
          const zIndex = parseInt(style.zIndex, 10);

          const isCoveringVideo = (
            rect.width >= vRect.width * 0.6 &&
            rect.height >= vRect.height * 0.6 &&
            (style.position === 'absolute' || style.position === 'fixed')
          );

          if (isCoveringVideo) {
            const isTransparent = parseFloat(style.opacity) < 0.2 || style.backgroundColor === 'transparent';
            if (isTransparent && zIndex > 10) {
              this.handledOverlays.add(el);
              el.style.setProperty('pointer-events', 'none', 'important');
              this.onAction({
                type: 'neutralized_video_overlay',
                reason: 'Neutralized transparent video click-trap',
                timestamp: new Date().toLocaleTimeString()
              });
            }
          }
        }
      }
    }
  }

  /* ==========================================================================
     6. REDIRECT GUARD
     ========================================================================== */
  class CleanVideoRedirectGuard {
    constructor(onAction) {
      this.onAction = onAction || (() => {});
      this.originalWindowOpen = null;
      this.installed = false;
    }

    install() {
      if (this.installed || typeof window === 'undefined') return;
      this.originalWindowOpen = window.open;
      const self = this;

      window.open = function (url, target, features) {
        const urlStr = (url || '').toString();
        const isAd = /popads|adcash|bet\d+|casino|slot|click\.|syndication/i.test(urlStr);
        if (isAd || !urlStr) {
          self.onAction({
            type: 'blocked_redirect',
            reason: `Blocked popup tab (${urlStr || 'empty tab'})`,
            timestamp: new Date().toLocaleTimeString()
          });
          return { closed: false, close: () => {}, focus: () => {} };
        }
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

  /* ==========================================================================
     7. CENTRAL ENGINE
     ========================================================================== */
  class CleanVideoEngine {
    constructor(rules) {
      this.rules = rules;
      this.storageKey = 'cleanvideo_settings';
      this.state = this.loadState();
      this.stats = { popupsClosed: 0, adsSkipped: 0, overlaysRemoved: 0, redirectsBlocked: 0 };

      this.detector = new CleanVideoDetector(this.rules);
      this.skipHandler = new CleanVideoSkipHandler(this.detector, this.rules, this.handleAction.bind(this));
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
      if (action.type === 'closed_popup_button' || action.type === 'removed_popup_overlay') this.stats.popupsClosed++;
      else if (action.type === 'skip_ad') this.stats.adsSkipped++;
      else if (action.type === 'neutralized_video_overlay') this.stats.overlaysRemoved++;
      else if (action.type === 'blocked_redirect') this.stats.redirectsBlocked++;

      if (this.onStatsUpdated) this.onStatsUpdated(this.stats, action);
    }

    start() {
      if (!this.state.enabled || this.isWhitelisted()) return;
      this.redirectGuard.install();
      this.requestScan();

      this.observer = new MutationObserver(() => this.requestScan());
      const target = document.body || document.documentElement;
      if (target) {
        this.observer.observe(target, { childList: true, subtree: true });
      }

      setInterval(() => this.requestScan(), 1200);
    }

    requestScan() {
      if (this.scanPending) return;
      this.scanPending = true;
      window.requestAnimationFrame(() => {
        setTimeout(() => {
          this.runCycle();
          this.scanPending = false;
        }, 60);
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
      if (!this.state.enabled) this.redirectGuard.uninstall();
      else this.start();
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
     8. MOBILE HUD CONTROLLER
     ========================================================================== */
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
            <div class="cv-title-box">🛡️ CleanVideo iOS</div>
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
     9. BOOTSTRAP
     ========================================================================== */
  const engine = new CleanVideoEngine(RULES);
  const hud = new CleanVideoHUD(engine);

  function initialize() {
    injectStyles();
    hud.mount();
    engine.start();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
  } else {
    initialize();
  }
})();
