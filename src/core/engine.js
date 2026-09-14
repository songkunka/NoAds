/**
 * CleanVideo Engine
 * Central Orchestrator for CleanVideo on Mobile Safari and Desktop
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

    // Handlers
    this.detector = new CleanVideoDetector(this.rules);
    this.skipHandler = new CleanVideoSkipHandler(this.detector, this.rules, this.handleAction.bind(this));
    this.popupHandler = new CleanVideoPopupHandler(this.detector, this.rules, this.handleAction.bind(this));
    this.overlayHandler = new CleanVideoOverlayHandler(this.detector, this.rules, this.handleAction.bind(this));
    this.redirectGuard = new CleanVideoRedirectGuard(this.handleAction.bind(this));

    this.observer = null;
    this.scanPending = false;
    this.eventListeners = [];
  }

  loadState() {
    try {
      const saved = localStorage.getItem(this.storageKey);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      // Fallback
    }
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
    } catch (e) {
      // Ignore
    }
  }

  isCurrentSiteWhitelisted() {
    const host = window.location.hostname;
    return this.state.whitelist.some(domain => host.includes(domain));
  }

  handleAction(action) {
    if (!this.state.enabled || this.isCurrentSiteWhitelisted()) return;

    if (action.type === 'closed_popup_button' || action.type === 'removed_popup_overlay') {
      this.stats.popupsClosed++;
    } else if (action.type === 'skip_ad') {
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

    // Trigger update on HUD
    if (this.onStatsUpdated) {
      this.onStatsUpdated(this.stats, action);
    }
  }

  start() {
    if (!this.state.enabled || this.isCurrentSiteWhitelisted()) {
      console.log('[CleanVideo] Protection paused or site whitelisted.');
      return;
    }

    console.log('[CleanVideo] Starting video ad protection on Mobile Safari...');

    // 1. Install redirect guard early
    this.redirectGuard.install();

    // 2. Initial scan
    this.requestScan();

    // 3. Setup Battery-friendly Throttled MutationObserver
    this.setupObserver();

    // 4. Listen to video playback events
    this.setupVideoListeners();
  }

  setupObserver() {
    if (this.observer) this.observer.disconnect();

    this.observer = new MutationObserver(() => {
      this.requestScan();
    });

    if (document.body) {
      this.observer.observe(document.body, {
        childList: true,
        subtree: true
      });
    } else {
      document.addEventListener('DOMContentLoaded', () => {
        this.observer.observe(document.body, {
          childList: true,
          subtree: true
        });
        this.requestScan();
      });
    }
  }

  requestScan() {
    if (this.scanPending) return;
    this.scanPending = true;

    // Use requestAnimationFrame & setTimeout to avoid UI freeze on mobile
    window.requestAnimationFrame(() => {
      setTimeout(() => {
        this.runCycle();
        this.scanPending = false;
      }, 80);
    });
  }

  runCycle() {
    if (!this.state.enabled || this.isCurrentSiteWhitelisted()) return;

    // Fast order:
    // 1. Skip ads first (most time-sensitive)
    this.skipHandler.scanAndSkip();
    // 2. Clean transparent overlays on video
    this.overlayHandler.scanAndClean();
    // 3. Clean popups & dialogs
    this.popupHandler.scanAndHandle();
  }

  setupVideoListeners() {
    const bindVideos = () => {
      const videos = document.querySelectorAll('video');
      videos.forEach(vid => {
        if (!vid.dataset.cleanvideoBound) {
          vid.dataset.cleanvideoBound = 'true';
          vid.addEventListener('timeupdate', () => this.runCycle());
          vid.addEventListener('play', () => this.runCycle());
        }
      });
    };

    bindVideos();
    setInterval(bindVideos, 2500);
  }

  toggleEnabled() {
    this.state.enabled = !this.state.enabled;
    this.saveState();
    if (this.state.enabled) {
      this.start();
    } else {
      this.redirectGuard.uninstall();
      if (this.observer) this.observer.disconnect();
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
