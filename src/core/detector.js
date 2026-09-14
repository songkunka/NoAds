/**
 * CleanVideo Detector
 * Heuristic scoring and element detection engine with Thai ad filter support
 */

class CleanVideoDetector {
  constructor(rules = {}) {
    this.rules = rules;
    this.adKeywords = [
      'ad', 'ads', 'advert', 'advertisement', 'banner', 'popup',
      'sponsor', 'promoted', 'โฆษณา', 'คาสิโน', 'สล็อต', 'bet', 'bonus',
      'gambling', 'บาคาร่า', 'แทงบอล', 'หวย', 'jackpot'
    ];
    this.thaiAdHrefKeywords = (rules.global && rules.global.thaiAdHrefKeywords) || [
      'ruay', 'ufa', 'slot', 'bet', 'casino', 'sagame', 'pgslot', 'gclub',
      'ts911', 'sexygame', 'lotto', 'wmbet', 'hydra', 'baccarat', 'joker',
      'lin.ee', 'line.me/R', 'cutt.ly', 'bit.ly', 'lihi1'
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
   * Check if an element or its child <a> links to a known Thai gambling / betting ad
   */
  isThaiAdLink(el) {
    if (!el || !(el instanceof HTMLElement)) return false;
    
    // Check if element itself is an anchor or contains an anchor
    const links = el.tagName === 'A' ? [el] : el.querySelectorAll('a');
    for (const a of links) {
      const href = (a.getAttribute('href') || '').toLowerCase();
      if (!href || href === '#' || href === 'javascript:void(0);') continue;

      for (const kw of this.thaiAdHrefKeywords) {
        if (href.includes(kw)) {
          return { isAd: true, keyword: kw, href };
        }
      }
    }
    return { isAd: false };
  }

  /**
   * Check if a video element is currently playing a commercial/preroll ad
   */
  isVideoPlayingAd(vid) {
    if (!vid || !(vid instanceof HTMLVideoElement)) return false;

    // 1. Check parent player ad containers
    const playerAdContainers = (this.rules.global && this.rules.global.playerAdContainers) || [
      '.jw-ad-container', '.fluid_ad_container', '.vjs-ima3-ad-container',
      '.ima-ad-container', '[class*="ad-container"]', '[class*="vast"]', '.video-ads'
    ];
    for (const sel of playerAdContainers) {
      if (vid.closest(sel) || document.querySelector(sel)) return true;
    }

    // 2. Check if player has ad classes
    const player = vid.closest('.video-player, .player-container, #player, .jwplayer, .fluid_video_wrapper') || vid.parentElement;
    if (player) {
      const pClass = (player.className || '').toString().toLowerCase();
      if (pClass.includes('ad-playing') || pClass.includes('ad-active') || pClass.includes('jw-flag-ads')) {
        return true;
      }
      // Check for visible countdown or skip button in player
      const skipOrCountdown = player.querySelector('[class*="skip"], [class*="countdown"], [id*="skip"]');
      if (skipOrCountdown && this.isVisible(skipOrCountdown)) {
        return true;
      }
    }

    // 3. Short duration check when ad indicator exists
    const src = (vid.currentSrc || vid.src || '').toLowerCase();
    if (src.includes('ad') || src.includes('preroll') || src.includes('vast')) {
      return true;
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

    // 1. Thai Ad link check (Immediate High Confidence +50)
    const thaiAd = this.isThaiAdLink(el);
    if (thaiAd.isAd) {
      score += 55;
      reasons.push(`thai_gambling_link (${thaiAd.keyword})`);
    }

    // 2. Z-Index evaluation
    const zIndex = parseInt(style.zIndex, 10);
    if (!isNaN(zIndex)) {
      if (zIndex >= 99999) {
        score += 25;
        reasons.push(`very_high_z_index (${zIndex})`);
      } else if (zIndex >= 500) {
        score += 15;
        reasons.push(`high_z_index (${zIndex})`);
      }
    }

    // 3. Position evaluation (Floating / Fixed / Sticky)
    if (style.position === 'fixed' || style.position === 'absolute' || style.position === 'sticky') {
      score += 15;
      reasons.push(`position_${style.position}`);
    }

    // 4. Class and ID Ad keyword matching
    for (const kw of this.adKeywords) {
      const regex = new RegExp(`(^|[-_\\s])${kw}([-_\\s]|$)`, 'i');
      if (regex.test(classAndId)) {
        score += 30;
        reasons.push(`class_or_id_keyword (${kw})`);
        break;
      }
    }

    // 5. Overlays Video Player
    if (this.isOverVideo(el)) {
      score += 25;
      reasons.push('overlays_video_player');
    }

    // 6. Contains iframe (often ad banner)
    const hasIframe = el.querySelector('iframe') !== null || el.tagName === 'IFRAME';
    if (hasIframe) {
      score += 20;
      reasons.push('contains_iframe');
    }

    // 7. Viewport coverage for fixed elements
    const vpWidth = window.innerWidth;
    const vpHeight = window.innerHeight;
    const coverage = (rect.width * rect.height) / (vpWidth * vpHeight);
    if (coverage > 0.5 && style.position === 'fixed') {
      score += 25;
      reasons.push(`viewport_coverage (${Math.round(coverage * 100)}%)`);
    }

    return { score, reasons };
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = CleanVideoDetector;
}
