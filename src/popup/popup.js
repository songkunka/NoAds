/**
 * CleanVideo Popup Script
 */

document.addEventListener('DOMContentLoaded', () => {
  const mainToggle = document.getElementById('main-toggle');
  const statusDot = document.getElementById('status-dot');
  const statusText = document.getElementById('status-text');
  const btnSiteToggle = document.getElementById('btn-site-toggle');
  const siteToggleText = document.getElementById('site-toggle-text');

  // Load state from chrome.storage or fallback
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    chrome.storage.local.get(['cleanvideo_settings', 'cleanvideo_stats'], (res) => {
      const settings = res.cleanvideo_settings || { enabled: true, whitelist: [] };
      const stats = res.cleanvideo_stats || { adsSkipped: 0, popupsClosed: 0, overlaysRemoved: 0, redirectsBlocked: 0 };
      updateUI(settings, stats);
    });
  } else {
    // LocalStorage fallback for preview
    const saved = localStorage.getItem('cleanvideo_settings');
    const settings = saved ? JSON.parse(saved) : { enabled: true, whitelist: [] };
    updateUI(settings, { adsSkipped: 0, popupsClosed: 0, overlaysRemoved: 0, redirectsBlocked: 0 });
  }

  function updateUI(settings, stats) {
    mainToggle.checked = settings.enabled;
    if (settings.enabled) {
      statusDot.classList.add('active');
      statusText.textContent = 'Protection Active';
    } else {
      statusDot.classList.remove('active');
      statusText.textContent = 'Protection Paused';
    }

    if (stats) {
      document.getElementById('stat-skip').textContent = stats.adsSkipped || 0;
      document.getElementById('stat-popup').textContent = stats.popupsClosed || 0;
      document.getElementById('stat-overlay').textContent = stats.overlaysRemoved || 0;
      document.getElementById('stat-redirect').textContent = stats.redirectsBlocked || 0;
    }
  }

  mainToggle.addEventListener('change', () => {
    const enabled = mainToggle.checked;
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.get('cleanvideo_settings', (res) => {
        const settings = res.cleanvideo_settings || {};
        settings.enabled = enabled;
        chrome.storage.local.set({ cleanvideo_settings: settings });
      });
    } else {
      const saved = localStorage.getItem('cleanvideo_settings');
      const settings = saved ? JSON.parse(saved) : {};
      settings.enabled = enabled;
      localStorage.setItem('cleanvideo_settings', JSON.stringify(settings));
    }
    statusDot.classList.toggle('active', enabled);
    statusText.textContent = enabled ? 'Protection Active' : 'Protection Paused';
  });
});
