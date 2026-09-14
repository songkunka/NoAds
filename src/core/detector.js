/**
 * CleanVideo Detector
 * Heuristic scoring and element detection engine
 */

class CleanVideoDetector {
  constructor(rules = {}) {
    this.rules = rules;
    this.adKeywords = [
      'ad', 'ads', 'advert', 'advertisement', 'banner', 'popup',
      'sponsor', 'promoted', 'โฆษณา', 'คาสิโน', 'สล็อต', 'bet', 'bonus'
    ];
  }

  /**
   * Check if element is genuinely visible on screen
   */
  isVisible(el) {
    if (!el || !(el instanceof HTMLElement)) return false;
    const style = window.getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden' || parseFloat(style.opacity) === 0) {
      return false;
    }
    const rect = el.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  }

  /**
   * Extract normalized text content
   */
  getNormalizedText(el) {
    if (!el) return '';
    const text = el.innerText || el.textContent || '';
    return text.trim().toLowerCase().replace(/\s+/g, ' ');
  }

  /**
   * Check if element overlays any HTML5 <video> element
   */
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

  /**
   * Calculate Heuristic Confidence Score for an element being an Ad or intrusive Overlay
   * Range: 0 to 100+
   */
  scoreElement(el) {
    if (!el || !(el instanceof HTMLElement)) return { score: 0, reasons: [] };
    
    // Whitelist check: Never score legitimate video elements or our own UI
    if (el.tagName === 'VIDEO' || el.closest('video') || el.closest('#cleanvideo-mobile-hud')) {
      return { score: 0, reasons: ['whitelisted_tag'] };
    }

    let score = 0;
    const reasons = [];
    const style = window.getComputedStyle(el);
    const rect = el.getBoundingClientRect();
    const classAndId = `${el.className || ''} ${el.id || ''}`.toLowerCase();

    // 1. Z-Index evaluation
    const zIndex = parseInt(style.zIndex, 10);
    if (!isNaN(zIndex)) {
      if (zIndex >= 99999) {
        score += 25;
        reasons.push(`very_high_z_index (${zIndex})`);
      } else if (zIndex >= 1000) {
        score += 15;
        reasons.push(`high_z_index (${zIndex})`);
      }
    }

    // 2. Position evaluation
    if (style.position === 'fixed' || style.position === 'absolute') {
      score += 15;
      reasons.push(`position_${style.position}`);
    }

    // 3. Class and ID Ad keyword matching
    for (const kw of this.adKeywords) {
      const regex = new RegExp(`(^|[-_\\s])${kw}([-_\\s]|$)`, 'i');
      if (regex.test(classAndId)) {
        score += 30;
        reasons.push(`class_or_id_keyword (${kw})`);
        break;
      }
    }

    // 4. Overlays Video Player
    if (this.isOverVideo(el)) {
      score += 25;
      reasons.push('overlays_video_player');
    }

    // 5. Contains iframe (often ad payload)
    const hasIframe = el.querySelector('iframe') !== null || el.tagName === 'IFRAME';
    if (hasIframe) {
      score += 20;
      reasons.push('contains_iframe');
    }

    // 6. Covers full viewport or large area
    const vpWidth = window.innerWidth;
    const vpHeight = window.innerHeight;
    const coverage = (rect.width * rect.height) / (vpWidth * vpHeight);
    if (coverage > 0.6 && style.position === 'fixed') {
      score += 20;
      reasons.push(`viewport_coverage (${Math.round(coverage * 100)}%)`);
    }

    // 7. Suspicious opacity or pointer-events trap
    if (rect.width > 200 && rect.height > 200 && (parseFloat(style.opacity) < 0.1 || style.background === 'transparent')) {
      if (style.position === 'absolute' || style.position === 'fixed') {
        score += 20;
        reasons.push('invisible_click_trap');
      }
    }

    return { score, reasons };
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = CleanVideoDetector;
}
