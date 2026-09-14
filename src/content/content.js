/**
 * CleanVideo Extension Content Script Entry Point
 */

(function () {
  'use strict';

  if (window.__CLEANVIDEO_EXTENSION_INITIALIZED__) return;
  window.__CLEANVIDEO_EXTENSION_INITIALIZED__ = true;

  // Global rules definition
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

  const engine = new CleanVideoEngine({ rules: RULES });
  const hud = new CleanVideoMobileHUD(engine);

  function start() {
    hud.mount();
    engine.start();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
