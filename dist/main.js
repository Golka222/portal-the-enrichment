(function () {
  'use strict';

  var STORAGE_KEY = 'portal-enrichment-lang';
  var SUPPORTED = ['ru', 'en'];

  var META = {
    ru: {
      title: 'Portal: The Enrichment — Официальный Сайт',
      description:
        'Официальная веб страница Portal: The Enrichment, в данный момент недоступна, следите за разработкой.',
    },
    en: {
      title: 'Portal: The Enrichment — Official Website',
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
      document.title = meta.title;
      var desc = document.querySelector('meta[name="description"]');
      if (desc) desc.setAttribute('content', meta.description);
      var og = document.querySelector('meta[property="og:description"]');
      if (og) og.setAttribute('content', meta.description);
    }

    var status = document.querySelector('[data-status]');
    if (status) {
      status.textContent = status.getAttribute('data-i18n-' + lang) || status.textContent;
    }

    var label = document.getElementById('lang-toggle-label');
    if (label) label.textContent = lang === 'ru' ? 'EN' : 'RU';
  }

  function init() {
    var toggle = document.getElementById('lang-toggle');
    var current = detect();
    apply(current);

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
})();
