/**
 * CleanVideo Overlay Handler (v2.0)
 * Neutralizes transparent click-traps, invisible full-screen overlays,
 * and video player ad layers (FluidPlayer, JWPlayer, VAST)
 */

class CleanVideoOverlayHandler {
  constructor(detector, rules, onAction) {
    this.detector = detector;
    this.rules = rules || {};
    this.onAction = onAction || (() => {});
    this.handledOverlays = new WeakSet();
  }

  scanAndClean() {
    // 1. Scan and neutralize FluidPlayer / JWPlayer specific ad overlays
    const specificAdOverlays = document.querySelectorAll(
      '.fluid_ad_interstitial, .fluid_ad_container, .fluid_ad_text, .fluid_ad_cta, .fluid_ad_playing, .fluid_vpaid_slot, .jw-ad-container, .ad_countdown'
    );
    for (const el of specificAdOverlays) {
      if (this.handledOverlays.has(el)) continue;
      // Do not hide the skip button itself!
      if (el.classList.contains('fluid_ad_skip') || el.classList.contains('skip_button')) continue;

      this.handledOverlays.add(el);
      el.style.setProperty('display', 'none', 'important');
      el.style.setProperty('pointer-events', 'none', 'important');
      this.onAction({
        type: 'neutralized_video_overlay',
        reason: `Cleaned player ad overlay (${el.className})`,
        element: el,
        timestamp: new Date().toLocaleTimeString()
      });
    }

    // 2. Scan for transparent click-catchers directly over videos
    const videos = document.querySelectorAll('video');
    for (const video of videos) {
      const vRect = video.getBoundingClientRect();
      if (vRect.width === 0 || vRect.height === 0) continue;

      const playerParent = video.closest('.video-player, .player-container, #player, .jwplayer, .fluid_video_wrapper') || video.parentElement;
      if (!playerParent) continue;

      const potentialOverlays = playerParent.querySelectorAll('div, a, span');
      for (const el of potentialOverlays) {
        if (this.handledOverlays.has(el) || el === video || el.contains(video)) continue;
        if (this.isLegitimateControl(el)) continue;

        // Skip button should remain clickable
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
          const isTransparentOrTrap = (
            parseFloat(style.opacity) < 0.2 ||
            style.backgroundColor === 'transparent' ||
            style.backgroundColor === 'rgba(0, 0, 0, 0)'
          );
          const hasAdAttr = /ad|banner|click|trap|protect|mask/i.test(`${el.className} ${el.id}`);

          if (hasAdAttr || (isTransparentOrTrap && zIndex > 5)) {
            this.neutralizeOverlay(el, `Over-video click trap (z-index: ${zIndex})`);
          }
        }
      }
    }

    // 3. Scan for full-viewport invisible click-traps
    const fullScreenTraps = document.querySelectorAll('div[style*="fixed"], div[style*="absolute"], a[style*="fixed"], a[style*="absolute"]');
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    for (const el of fullScreenTraps) {
      if (this.handledOverlays.has(el)) continue;
      if (el.id === 'cleanvideo-mobile-hud' || el.closest('#cleanvideo-mobile-hud')) continue;

      const rect = el.getBoundingClientRect();
      if (rect.width >= vw * 0.85 && rect.height >= vh * 0.85) {
        const style = window.getComputedStyle(el);
        const zIndex = parseInt(style.zIndex, 10);
        const isTransparent = parseFloat(style.opacity) < 0.1 || style.backgroundColor === 'transparent';

        if (isTransparent && zIndex >= 100) {
          this.neutralizeOverlay(el, `Full-screen invisible click-catcher (z-index: ${zIndex})`);
        }
      }
    }
  }

  isLegitimateControl(el) {
    const className = (el.className || '').toString().toLowerCase();
    const id = (el.id || '').toString().toLowerCase();
    const controlKeywords = [
      'control', 'progress', 'volume', 'fullscreen', 'timeline',
      'vjs-control', 'ytp-chrome', 'play-button', 'pause-button', 'scrubber'
    ];
    return controlKeywords.some(kw => className.includes(kw) || id.includes(kw));
  }

  neutralizeOverlay(el, reason) {
    this.handledOverlays.add(el);
    el.style.setProperty('pointer-events', 'none', 'important');
    el.style.setProperty('opacity', '0', 'important');
    el.style.setProperty('display', 'none', 'important');
    el.setAttribute('data-cleanvideo-neutralized', 'true');

    this.onAction({
      type: 'neutralized_video_overlay',
      reason,
      element: el,
      timestamp: new Date().toLocaleTimeString()
    });
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = CleanVideoOverlayHandler;
}
