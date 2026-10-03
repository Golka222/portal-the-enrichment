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
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () {
      // When a new build ships a new worker, take it and pull a fresh document
      // straight away instead of waiting for the visitor to hit refresh.
      var reloaded = false;
      navigator.serviceWorker.addEventListener('controllerchange', function () {
        if (reloaded) return;
        reloaded = true;
        window.location.reload();
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
