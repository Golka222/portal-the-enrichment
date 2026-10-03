(function () {
  'use strict';

  var STORAGE_KEY = 'portal-enrichment-lang';
  var SUPPORTED = ['ru', 'en'];

  var META = {
    ru: {
      description:
        'Официальная веб страница Portal: The Enrichment, в данный момент недоступна, следите за разработкой.',
    },
    en: {
      description:
        'The official website of Portal: The Enrichment is currently unavailable, follow the development.',
    },
  };

  function stored() {
    try {
      var v = localStorage.getItem(STORAGE_KEY);
      return SUPPORTED.indexOf(v) !== -1 ? v : null;
    } catch (e) {
      return null;
    }
  }

  function persist(lang) {
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch (e) {
      /* private mode — ignore */
    }
  }

  function detect() {
    var saved = stored();
    if (saved) return saved;
    var nav = (navigator.language || 'ru').toLowerCase();
    return nav.indexOf('ru') === 0 || nav.indexOf('be') === 0 || nav.indexOf('uk') === 0
      ? 'ru'
      : 'en';
  }

  function apply(lang) {
    document.documentElement.lang = lang;

    var meta = META[lang];
    if (meta) {
      var desc = meta.description;
      var descEl = document.querySelector('meta[name="description"]');
      if (descEl) descEl.setAttribute('content', desc);
      var og = document.querySelector('meta[property="og:description"]');
      if (og) og.setAttribute('content', desc);
    }

    var status = document.querySelector('[data-status]');
    if (status) {
      status.textContent = status.getAttribute('data-i18n-' + lang) || status.textContent;
    }

    var label = document.getElementById('lang-toggle-label');
    if (label) label.textContent = lang === 'ru' ? 'EN' : 'RU';
  }

  function protectArtwork() {
    var logo = document.querySelector('.hero__logo');
    if (!logo) return;

    logo.setAttribute('draggable', 'false');

    ['dragstart', 'drag', 'dragend'].forEach(function (type) {
      logo.addEventListener(type, function (e) {
        e.preventDefault();
      });
    });

    logo.addEventListener('contextmenu', function (e) {
      e.preventDefault();
    });

    logo.addEventListener('selectstart', function (e) {
      e.preventDefault();
    });

    // Last resort for older engines that ignore -webkit-user-drag.
    document.addEventListener(
      'dragstart',
      function (e) {
        if (e.target && e.target.classList && e.target.classList.contains('hero__logo')) {
          e.preventDefault();
        }
      },
      true
    );
  }

  function init() {
    var toggle = document.getElementById('lang-toggle');
    var current = detect();
    apply(current);

    protectArtwork();

    if (!toggle) return;
    toggle.addEventListener('click', function () {
      current = current === 'ru' ? 'en' : 'ru';
      persist(current);
      apply(current);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Force fresh content on every visit: the worker prefers the network and is
  // versioned by build hash, so it never serves a stale copy from cache.
  // One-shot navigation to a URL that has never been requested before. The
// browser has no cache entry for it, so the document comes straight from the
// server and the whole tree is rebuilt from the current revision. Guarded so it
// can never loop.
  function hardReloadOnce() {
    var key = 'pe-hard-reload';
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, '1');
    } catch (e) {
      /* private mode - reload anyway */
    }
    var url = new URL(window.location.href);
    url.searchParams.set('nc', Date.now().toString(36));
    window.location.replace(url.toString());
  }

  // Drop any worker that is not the current sw.js (old names, /dist/ copies,
  // leftovers from earlier experiments).
  function purgeForeignWorkers() {
    if (!navigator.serviceWorker || !navigator.serviceWorker.getRegistrations) return;
    navigator.serviceWorker.getRegistrations().then(function (regs) {
      regs.forEach(function (reg) {
        var worker = reg.active || reg.waiting || reg.installing;
        if (!worker) return;
        var scriptUrl = worker.scriptURL || '';
        var isCurrent = /\/sw\.js(\?|$)/.test(scriptUrl) && scriptUrl.indexOf('/dist/') === -1;
        if (!isCurrent) reg.unregister();
      });
    }).catch(function () {});
  }

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () {
      purgeForeignWorkers();

      // The worker just wiped every cache. Reload once so the visitor is
      // looking at the fresh build instead of the document they arrived with.
      navigator.serviceWorker.addEventListener('message', function (event) {
        if (!event.data || event.data.type !== 'CACHE_PURGED') return;
        hardReloadOnce();
      });

      // Also covers the case where the worker was replaced while the tab was
      // already open.
      var reloaded = false;
      navigator.serviceWorker.addEventListener('controllerchange', function () {
        if (reloaded) return;
        reloaded = true;
        hardReloadOnce();
      });

      navigator.serviceWorker
        .register('sw.js', { updateViaCache: 'none' })
        .then(function () {
          return navigator.serviceWorker.ready;
        })
        .then(function () {
          return navigator.serviceWorker.getRegistration();
        })
        .then(function (reg) {
          if (reg) reg.update();
        })
        .catch(function () {
          /* insecure origin or unsupported - page still works */
        });
    });
  }
})();
