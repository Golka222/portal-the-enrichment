'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const SRC = path.join(ROOT, 'public');
const OUT = path.join(ROOT, 'dist');

const REWRITES = [
  [/href="\/(styles\.css)"/g, 'href="$1"'],
  [/src="\/(main\.js)"/g, 'src="$1"'],
  [/(src|href)="\/(img\/[A-Za-z0-9._-]+)"/g, '$1="$2"'],
];

function build() {
  fs.rmSync(OUT, { recursive: true, force: true });
  fs.mkdirSync(path.join(OUT, 'img'), { recursive: true });

  const html = fs.readFileSync(path.join(SRC, 'index.html'), 'utf8');
  let out = html;
  for (const [re, to] of REWRITES) out = out.replace(re, to);

  fs.writeFileSync(path.join(OUT, 'index.html'), out, 'utf8');
  fs.copyFileSync(path.join(SRC, 'styles.css'), path.join(OUT, 'styles.css'));
  fs.copyFileSync(path.join(SRC, 'main.js'), path.join(OUT, 'main.js'));
  fs.copyFileSync(path.join(SRC, 'img', 'emblem.avif'), path.join(OUT, 'img', 'emblem.avif'));
  fs.writeFileSync(path.join(OUT, '.nojekyll'), '', 'utf8');

  const files = ['index.html', 'styles.css', 'main.js', 'img/emblem.avif', '.nojekyll'];
  console.log('built dist/ (relative paths, UTF-8):');
  for (const f of files) {
    console.log(`  ${f.padEnd(18)} ${fs.statSync(path.join(OUT, f)).size} bytes`);
  }

  const leftover = out.match(/(?:href|src)="\//g);
  if (leftover) {
    console.log('WARNING: absolute paths remain:', leftover.length);
    process.exitCode = 1;
  }
}

build();