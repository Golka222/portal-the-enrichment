'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = __dirname;
const SRC = path.join(ROOT, 'public');
const OUT = path.join(ROOT, 'dist');

const IMAGES = ['emblem.avif', 'favicon.png', 'apple-touch-icon.png'];

// Custom domain. Written out as CNAME on every build so the Pages binding
// survives rebuilds. Single source of truth: no duplicated file to drift.
const DOMAIN = 'portalenrichment.space';

// Absolute -> relative, then a content hash query so a change always yields
// new URLs. Without this, browsers keep serving the old file from cache.
const REWRITES = [
  [/href="\/styles\.css"/g, 'href="styles.css?v=__HASH__"'],
  [/src="\/main\.js"/g, 'src="main.js?v=__HASH__"'],
  [/(src|href)="\/(img\/[A-Za-z0-9._-]+)"/g, '$1="$2?v=__HASH__"'],
  [/(<meta name="build-id" content=")__HASH__(")/g, '$1__HASH__$2'],
];

function contentHash() {
  const h = crypto.createHash('sha256');
  for (const f of ['styles.css', 'main.js', 'sw.js']) {
    h.update(fs.readFileSync(path.join(SRC, f)));
  }
  for (const img of IMAGES) h.update(fs.readFileSync(path.join(SRC, 'img', img)));
  return h.digest('hex').slice(0, 10);
}

function build() {
  fs.rmSync(OUT, { recursive: true, force: true });
  fs.mkdirSync(path.join(OUT, 'img'), { recursive: true });

  const hash = contentHash();

  let out = fs.readFileSync(path.join(SRC, 'index.html'), 'utf8');
  for (const [re, to] of REWRITES) out = out.replace(re, to);
  out = out.replace(/__HASH__/g, hash);

  fs.writeFileSync(path.join(OUT, 'index.html'), out, 'utf8');
  for (const f of ['styles.css', 'main.js', 'sw.js']) {
    fs.copyFileSync(path.join(SRC, f), path.join(OUT, f));
  }
  for (const img of IMAGES) {
    fs.copyFileSync(path.join(SRC, 'img', img), path.join(OUT, 'img', img));
  }
  fs.writeFileSync(path.join(OUT, '.nojekyll'), '', 'utf8');

  // Keep the custom domain pinned across rebuilds.
  fs.writeFileSync(path.join(OUT, 'CNAME'), DOMAIN, 'utf8');

  // Stamp the cache-buster into the worker so a new build drops old caches.
  const sw = fs
    .readFileSync(path.join(SRC, 'sw.js'), 'utf8')
    .replace(/__HASH__/g, hash);
  fs.writeFileSync(path.join(OUT, 'sw.js'), sw, 'utf8');

  console.log(`built dist/  asset hash = ${hash}`);
  for (const f of ['index.html', 'styles.css', 'main.js', 'sw.js', 'img/emblem.avif', 'img/favicon.png', 'img/apple-touch-icon.png', '.nojekyll']) {
    console.log(`  ${f.padEnd(26)} ${fs.statSync(path.join(OUT, f)).size} bytes`);
  }

  // No local reference may stay absolute, or it breaks under a repo subpath.
  const leftover = out.match(/(?:href|src)="\/(?!https?:)[^"]*"/g);
  if (leftover) {
    console.log('WARNING: absolute local paths remain:', leftover);
    process.exitCode = 1;
  }
  if (out.includes('__HASH__')) {
    console.log('WARNING: unresolved __HASH__ placeholder');
    process.exitCode = 1;
  }
}

build();