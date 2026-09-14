/**
 * CleanVideo Mobile HUD Component
 * Floating Action Pill & Touch-friendly Sheet Controller for Mobile Safari
 */

class CleanVideoMobileHUD {
  constructor(engine) {
    this.engine = engine;
    this.container = null;
    this.pill = null;
    this.modal = null;
    this.isOpen = false;
    this.posX = window.innerWidth - 130;
    this.posY = 60;
  }

  mount() {
    if (document.getElementById('cleanvideo-mobile-hud')) return;

    this.container = document.createElement('div');
    this.container.id = 'cleanvideo-mobile-hud';
    this.container.style.top = `${this.posY}px`;
    this.container.style.left = `${Math.max(10, Math.min(window.innerWidth - 130, this.posX))}px`;

    this.container.innerHTML = `
      <div class="cv-pill-btn" id="cv-drag-pill" title="CleanVideo Mobile Status">
        <span class="cv-indicator-dot ${this.engine.state.enabled ? '' : 'disabled'}" id="cv-status-dot"></span>
        <span class="cv-pill-label">CleanVideo</span>
        <span class="cv-badge-count" id="cv-badge-count">0</span>
      </div>

      <div class="cv-sheet-modal" id="cv-sheet-modal">
        <div class="cv-modal-header">
          <div class="cv-title-box">
            <span class="cv-icon-logo">🛡️</span>
            <span class="cv-title-text">CleanVideo</span>
          </div>
          <button class="cv-close-modal-btn" id="cv-close-btn" aria-label="Close">✕</button>
        </div>

        <div class="cv-power-card">
          <span class="cv-power-label">Protection Status</span>
          <label class="cv-switch">
            <input type="checkbox" id="cv-power-toggle" ${this.engine.state.enabled ? 'checked' : ''}>
            <span class="cv-slider"></span>
          </label>
        </div>

        <div class="cv-stats-grid">
          <div class="cv-stat-box">
            <div class="cv-stat-val" id="cv-stat-skip">0</div>
            <div class="cv-stat-label">Ads Skipped</div>
          </div>
          <div class="cv-stat-box">
            <div class="cv-stat-val" id="cv-stat-popup">0</div>
            <div class="cv-stat-label">Popups Closed</div>
          </div>
          <div class="cv-stat-box">
            <div class="cv-stat-val" id="cv-stat-overlay">0</div>
            <div class="cv-stat-label">Overlays Cleaned</div>
          </div>
          <div class="cv-stat-box">
            <div class="cv-stat-val" id="cv-stat-redirect">0</div>
            <div class="cv-stat-label">Redirects Blocked</div>
          </div>
        </div>

        <button class="cv-btn-action" id="cv-whitelist-btn">
          <span>🚫</span>
          <span id="cv-whitelist-label">Disable on this site</span>
        </button>

        <button class="cv-btn-action" id="cv-debug-toggle-btn" style="background: transparent; border-color: rgba(255,255,255,0.05); color: #94a3b8;">
          <span>🔍</span>
          <span>View Activity Log</span>
        </button>

        <div class="cv-debug-panel" id="cv-debug-panel">
          <div style="color: #64748b; text-align: center;">No activity recorded yet</div>
        </div>
      </div>
    `;

    document.documentElement.appendChild(this.container);

    this.pill = this.container.querySelector('#cv-drag-pill');
    this.modal = this.container.querySelector('#cv-sheet-modal');

    this.attachEvents();
    this.setupDraggable();

    // Hook engine events to update stats
    this.engine.onStatsUpdated = (stats, lastAction) => {
      this.updateStatsUI(stats, lastAction);
    };

    this.updateStatsUI(this.engine.stats);
  }

  attachEvents() {
    const powerToggle = this.container.querySelector('#cv-power-toggle');
    powerToggle.addEventListener('change', (e) => {
      const isEnabled = this.engine.toggleEnabled();
      this.updateStatusDot(isEnabled);
    });

    const closeBtn = this.container.querySelector('#cv-close-btn');
    closeBtn.addEventListener('click', () => {
      this.closeModal();
    });

    const whitelistBtn = this.container.querySelector('#cv-whitelist-btn');
    const whitelistLabel = this.container.querySelector('#cv-whitelist-label');
    whitelistBtn.addEventListener('click', () => {
      const isWhitelisted = this.engine.toggleWhitelist();
      whitelistLabel.textContent = isWhitelisted ? 'Resume on this site' : 'Disable on this site';
      this.updateStatusDot(!isWhitelisted && this.engine.state.enabled);
    });

    const debugToggleBtn = this.container.querySelector('#cv-debug-toggle-btn');
    const debugPanel = this.container.querySelector('#cv-debug-panel');
    debugToggleBtn.addEventListener('click', () => {
      debugPanel.classList.toggle('show');
    });
  }

  setupDraggable() {
    let isDragging = false;
    let startX = 0;
    let startY = 0;
    let initialLeft = 0;
    let initialTop = 0;
    let hasMoved = false;

    const onStart = (e) => {
      const touch = e.touches ? e.touches[0] : e;
      isDragging = true;
      hasMoved = false;
      startX = touch.clientX;
      startY = touch.clientY;
      initialLeft = this.container.offsetLeft;
      initialTop = this.container.offsetTop;
    };

    const onMove = (e) => {
      if (!isDragging) return;
      const touch = e.touches ? e.touches[0] : e;
      const deltaX = touch.clientX - startX;
      const deltaY = touch.clientY - startY;

      if (Math.abs(deltaX) > 4 || Math.abs(deltaY) > 4) {
        hasMoved = true;
      }

      let newLeft = initialLeft + deltaX;
      let newTop = initialTop + deltaY;

      // Boundaries
      newLeft = Math.max(8, Math.min(window.innerWidth - 130, newLeft));
      newTop = Math.max(8, Math.min(window.innerHeight - 50, newTop));

      this.container.style.left = `${newLeft}px`;
      this.container.style.top = `${newTop}px`;
    };

    const onEnd = () => {
      if (!isDragging) return;
      isDragging = false;
      if (!hasMoved) {
        // Simple tap -> toggle modal
        this.toggleModal();
      }
    };

    // Touch events for Mobile Safari
    this.pill.addEventListener('touchstart', onStart, { passive: true });
    window.addEventListener('touchmove', onMove, { passive: true });
    window.addEventListener('touchend', onEnd);

    // Mouse events for Desktop simulation
    this.pill.addEventListener('mousedown', onStart);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onEnd);
  }

  toggleModal() {
    this.isOpen = !this.isOpen;
    if (this.isOpen) {
      this.modal.classList.add('open');
    } else {
      this.modal.classList.remove('open');
    }
  }

  closeModal() {
    this.isOpen = false;
    this.modal.classList.remove('open');
  }

  updateStatusDot(active) {
    const dot = this.container.querySelector('#cv-status-dot');
    if (dot) {
      if (active) {
        dot.classList.remove('disabled');
      } else {
        dot.classList.add('disabled');
      }
    }
  }

  updateStatsUI(stats, lastAction) {
    if (!this.container) return;

    const total = stats.adsSkipped + stats.popupsClosed + stats.overlaysRemoved + stats.redirectsBlocked;
    const badge = this.container.querySelector('#cv-badge-count');
    if (badge) badge.textContent = total;

    const skipVal = this.container.querySelector('#cv-stat-skip');
    const popupVal = this.container.querySelector('#cv-stat-popup');
    const overlayVal = this.container.querySelector('#cv-stat-overlay');
    const redirectVal = this.container.querySelector('#cv-stat-redirect');

    if (skipVal) skipVal.textContent = stats.adsSkipped;
    if (popupVal) popupVal.textContent = stats.popupsClosed;
    if (overlayVal) overlayVal.textContent = stats.overlaysRemoved;
    if (redirectVal) redirectVal.textContent = stats.redirectsBlocked;

    // Render debug panel
    if (lastAction) {
      const debugPanel = this.container.querySelector('#cv-debug-panel');
      if (debugPanel) {
        const item = document.createElement('div');
        item.className = 'cv-debug-item';
        item.innerHTML = `<strong>[${lastAction.timestamp}]</strong> ${lastAction.type}: <em>${lastAction.reason}</em>`;
        debugPanel.insertBefore(item, debugPanel.firstChild);
      }
    }
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = CleanVideoMobileHUD;
}
