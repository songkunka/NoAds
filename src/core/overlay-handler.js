/**
 * CleanVideo Overlay Handler
 * Neutralizes transparent click-traps and overlays placed over video players
 */

class CleanVideoOverlayHandler {
  constructor(detector, rules, onAction) {
    this.detector = detector;
    this.rules = rules || {};
    this.onAction = onAction || (() => {});
    this.handledOverlays = new WeakSet();
  }

  scanAndClean() {
    const videos = document.querySelectorAll('video');
    if (!videos.length) return;

    for (const video of videos) {
      const vRect = video.getBoundingClientRect();
      if (vRect.width === 0 || vRect.height === 0) continue;

      // Find all elements lying directly on top of the video
      const playerParent = video.closest('.video-player') || video.closest('.player-container') || video.parentElement;
      if (!playerParent) continue;

      const potentialOverlays = playerParent.querySelectorAll('div, a, span');
      for (const el of potentialOverlays) {
        if (this.handledOverlays.has(el)) continue;
        if (el === video || el.contains(video)) continue;

        // Ignore genuine video control elements
        if (this.isLegitimateControl(el)) continue;

        const rect = el.getBoundingClientRect();
        const style = window.getComputedStyle(el);
        const zIndex = parseInt(style.zIndex, 10);

        // Check if element covers at least 60% of video and is positioned absolute/fixed
        const isCoveringVideo = (
          rect.width >= vRect.width * 0.6 &&
          rect.height >= vRect.height * 0.6 &&
          (style.position === 'absolute' || style.position === 'fixed')
        );

        if (isCoveringVideo) {
          const isTransparentOrTrap = (
            parseFloat(style.opacity) < 0.2 ||
            style.backgroundColor === 'transparent' ||
            style.backgroundColor === 'rgba(0, 0, 0, 0)'
          );
          const hasAdAttr = /ad|banner|click|trap|protect/i.test(`${el.className} ${el.id}`);

          if (hasAdAttr || (isTransparentOrTrap && zIndex > 10)) {
            this.neutralizeOverlay(el, `Over-video click trap (z-index: ${zIndex})`);
          }
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
    // Neutralize pointer events so taps reach the actual video
    el.style.setProperty('pointer-events', 'none', 'important');
    el.style.setProperty('opacity', '0', 'important');
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
