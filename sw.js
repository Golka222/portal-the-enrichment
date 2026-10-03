'use strict';

var CACHE = 'portal-enrichment-vb4c43b8757';

var SHELL = ['./', './index.html', './styles.css?v=b4c43b8757', './main.js?v=b4c43b8757'];

self.addEventListener('install', function (event) {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE).then(function (cache) {
      return cache.addAll(SHELL);
    })
  );
});

// Full wipe. Every cache this origin owns is dropped, not just our own, so a
// build can never inherit leftovers from an older revision. Clients are then
// told to pull a brand new document.
self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches
      .keys()
      .then(function (keys) {
        return Promise.all(
          keys.map(function (k) {
            return caches.delete(k);
          })
        );
      })
      .then(function () {
        return self.clients.claim();
      })
      .then(function () {
        return self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      })
      .then(function (list) {
        list.forEach(function (client) {
          client.postMessage({ type: 'CACHE_PURGED', build: 'b4c43b8757' });
        });
      })
  );
});

// Network-first: always go to the server, use the cache only when offline.
// This defeats the 10 minute Cache-Control that GitHub Pages puts on HTML.
self.addEventListener('fetch', function (event) {
  var req = event.request;
  if (req.method !== 'GET') return;

  var url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Network-first with an explicit cache bypass.
  // A plain fetch() here still consults the browser HTTP cache, and GitHub
  // Pages answers with Cache-Control: max-age=600, which is exactly why
  // visitors kept seeing the previous version. cache:'no-store' forces the
  // request to the server; the Cache Storage below is only an offline safety
  // net, never the primary source.
  event.respondWith(
    fetch(req, { cache: 'no-store', redirect: 'follow' })
      .then(function (res) {
        if (res && res.ok && res.type === 'basic') {
          var copy = res.clone();
          caches.open(CACHE).then(function (cache) {
            cache.put(req, copy);
          });
        }
        return res;
      })
      .catch(function () {
        return caches.match(req).then(function (hit) {
          if (hit) return hit;
          if (req.mode === 'navigate') return caches.match('./index.html');
          return Response.error();
        });
      })
  );
});