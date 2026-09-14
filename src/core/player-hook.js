/**
 * CleanVideo Player API Hook
 * Intercepts FluidPlayer, JWPlayer, and Video.js initialization configurations
 * to disable VAST/VPAID pre-roll ads at source or force instant skip
 */

class CleanVideoPlayerHook {
  constructor(onAction) {
    this.onAction = onAction || (() => {});
    this.installed = false;
    this.fluidPlayerInstances = new Set();
  }

  install() {
    if (this.installed || typeof window === 'undefined') return;

    this.hookFluidPlayer();
    this.hookJWPlayer();
    this.hookVideoJS();

    this.installed = true;
    console.log('[CleanVideo] Player API Hook installed (FluidPlayer / JWPlayer / Video.js)');
  }

  hookFluidPlayer() {
    const self = this;
    const wrapFP = (origFP) => {
      if (typeof origFP !== 'function' || origFP.__cleanvideo_wrapped__) return origFP;

      const wrapped = function (target, options = {}) {
        try {
          if (options && options.vastOptions) {
            console.log('[CleanVideo] Neutralized FluidPlayer VAST adList config');
            options.vastOptions.adList = [];
            options.vastOptions.skipoffset = 0;
            options.vastOptions.allowVPAID = false;
            self.onAction({
              type: 'neutralized_vast_config',
              reason: 'Bypassed FluidPlayer VAST pre-roll ads during init',
              timestamp: new Date().toLocaleTimeString()
            });
          }
        } catch (e) {}

        const instance = origFP.apply(this, arguments);
        if (instance) {
          self.fluidPlayerInstances.add(instance);
          self.attachFluidPlayerHooks(instance);
        }
        return instance;
      };

      wrapped.__cleanvideo_wrapped__ = true;
      return wrapped;
    };

    if (window.fluidPlayer) {
      window.fluidPlayer = wrapFP(window.fluidPlayer);
    } else {
      let _fp = undefined;
      try {
        Object.defineProperty(window, 'fluidPlayer', {
          configurable: true,
          enumerable: true,
          get() {
            return _fp;
          },
          set(val) {
            _fp = wrapFP(val);
          }
        });
      } catch (e) {
        // Fallback if property define fails
      }
    }
  }

  attachFluidPlayerHooks(instance) {
    if (!instance) return;
    try {
      // If player starts an ad anyway, trigger skip
      const origPlayRoll = instance.playRoll;
      if (typeof origPlayRoll === 'function') {
        instance.playRoll = function (adList) {
          console.log('[CleanVideo] Prevented FluidPlayer playRoll ad trigger');
          if (typeof instance.onVastAdEnded === 'function') {
            instance.onVastAdEnded();
          }
        };
      }
    } catch (e) {}
  }

  hookJWPlayer() {
    const self = this;
    const wrapJW = (origJW) => {
      if (typeof origJW !== 'function' || origJW.__cleanvideo_wrapped__) return origJW;

      const wrapped = function () {
        const player = origJW.apply(this, arguments);
        if (player && typeof player.setup === 'function' && !player.setup.__cleanvideo_wrapped__) {
          const origSetup = player.setup;
          player.setup = function (config = {}) {
            if (config && config.advertising) {
              console.log('[CleanVideo] Neutralized JWPlayer advertising schedule');
              delete config.advertising;
              self.onAction({
                type: 'neutralized_jw_ads',
                reason: 'Removed JWPlayer advertising config',
                timestamp: new Date().toLocaleTimeString()
              });
            }
            const instance = origSetup.call(this, config);
            try {
              if (instance && typeof instance.on === 'function') {
                instance.on('adPlay', () => {
                  if (typeof instance.skipAd === 'function') instance.skipAd();
                });
              }
            } catch (e) {}
            return instance;
          };
          player.setup.__cleanvideo_wrapped__ = true;
        }
        return player;
      };

      wrapped.__cleanvideo_wrapped__ = true;
      return wrapped;
    };

    if (window.jwplayer) {
      window.jwplayer = wrapJW(window.jwplayer);
    } else {
      let _jw = undefined;
      try {
        Object.defineProperty(window, 'jwplayer', {
          configurable: true,
          enumerable: true,
          get() {
            return _jw;
          },
          set(val) {
            _jw = wrapJW(val);
          }
        });
      } catch (e) {}
    }
  }

  hookVideoJS() {
    const wrapVJS = (origVJS) => {
      if (typeof origVJS !== 'function' || origVJS.__cleanvideo_wrapped__) return origVJS;
      const wrapped = function (id, options = {}) {
        if (options && options.plugins) {
          delete options.plugins.ima;
          delete options.plugins.vast;
        }
        return origVJS.apply(this, arguments);
      };
      wrapped.__cleanvideo_wrapped__ = true;
      return wrapped;
    };

    if (window.videojs) {
      window.videojs = wrapVJS(window.videojs);
    } else {
      let _vjs = undefined;
      try {
        Object.defineProperty(window, 'videojs', {
          configurable: true,
          enumerable: true,
          get() {
            return _vjs;
          },
          set(val) {
            _vjs = wrapVJS(val);
          }
        });
      } catch (e) {}
    }
  }

  /**
   * Force active player instances to skip current ad
   */
  forceSkipActivePlayers() {
    // 1. FluidPlayer instances
    for (const fp of this.fluidPlayerInstances) {
      try {
        if (fp.isCurrentlyPlayingAd) {
          if (typeof fp.onVastAdEnded === 'function') fp.onVastAdEnded();
          else if (typeof fp.switchToMainVideo === 'function') fp.switchToMainVideo();
        }
      } catch (e) {}
    }

    // 2. JWPlayer instances in DOM
    try {
      if (typeof window.jwplayer === 'function') {
        const jwEls = document.querySelectorAll('.jwplayer');
        jwEls.forEach(el => {
          try {
            const jw = window.jwplayer(el.id);
            if (jw && typeof jw.skipAd === 'function') {
              jw.skipAd();
            }
          } catch (e) {}
        });
      }
    } catch (e) {}
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = CleanVideoPlayerHook;
}
