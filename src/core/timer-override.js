/**
 * CleanVideo Timer Override Engine
 * Accelerates JavaScript countdown timers (setTimeout / setInterval) by up to 50x-100x
 * to bypass 5-15s forced wait times in video ad players (FluidPlayer, JWPlayer, VAST)
 */

class CleanVideoTimerOverride {
  constructor(options = {}) {
    this.speedFactor = options.speedFactor || 50; // 1000ms becomes 20ms
    this.installed = false;
    this.originalSetTimeout = null;
    this.originalSetInterval = null;
    this.originalClearTimeout = null;
    this.originalClearInterval = null;
    this.acceleratedTimers = new Set();
  }

  install() {
    if (this.installed || typeof window === 'undefined') return;

    this.originalSetTimeout = window.setTimeout.bind(window);
    this.originalSetInterval = window.setInterval.bind(window);
    this.originalClearTimeout = window.clearTimeout.bind(window);
    this.originalClearInterval = window.clearInterval.bind(window);

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
        const id = self.originalSetInterval(handler, acceleratedDelay, ...args);
        self.acceleratedTimers.add(id);
        return id;
      }
      return self.originalSetInterval(handler, numDelay, ...args);
    };

    this.installed = true;
    console.log('[CleanVideo] Timer Override Engine active (Countdown accelerator ready)');
  }

  shouldAccelerate(handler, delay) {
    // Only target countdown-range timers: typically 200ms to 2000ms (e.g. 1000ms tick)
    if (delay < 150 || delay > 2500) return false;

    // 1. Inspect function source if possible
    if (typeof handler === 'function') {
      try {
        const fnStr = handler.toString();
        // Check for ad/countdown patterns
        if (/count|countdown|skip|timer|remain|tick|vast|preroll|ad_text|seconds|ข้าม/i.test(fnStr)) {
          return true;
        }
      } catch (e) {}
    } else if (typeof handler === 'string') {
      if (/count|skip|timer|ad|vast/i.test(handler)) {
        return true;
      }
    }

    // 2. Check if the page currently has an ad container or video ad countdown visible
    try {
      const hasAdOrPlayer = document.querySelector(
        '.fluid_ad_container, .jw-ad-container, .ad_countdown, .fluid_ad_skip, .skip_button, [class*="skip"], [class*="countdown"]'
      );
      if (hasAdOrPlayer) {
        return true;
      }
    } catch (e) {}

    return false;
  }

  uninstall() {
    if (!this.installed) return;
    window.setTimeout = this.originalSetTimeout;
    window.setInterval = this.originalSetInterval;
    this.installed = false;
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = CleanVideoTimerOverride;
}
