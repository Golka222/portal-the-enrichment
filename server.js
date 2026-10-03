'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const ROOT = path.join(__dirname, 'public');
const PORT = Number(process.env.PORT) || 8080;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
};

function send(res, status, body, headers) {
  res.writeHead(status, Object.assign({ 'Content-Type': 'text/plain; charset=utf-8' }, headers));
  res.end(body);
}

function serveFile(res, filePath, req) {
  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      // Asset-looking requests should 404; anything else falls back to the SPA page.
      if (path.extname(filePath)) {
        return send(res, 404, 'Not found');
      }
      const fallback = path.join(ROOT, 'index.html');
      return fs.readFile(fallback, (e2, buf) => {
        if (e2) return send(res, 404, 'Not found');
        send(res, 200, buf, { 'Content-Type': MIME['.html'], 'Cache-Control': 'no-cache' });
      });
    }

    const ext = path.extname(filePath).toLowerCase();
    const type = MIME[ext] || 'application/octet-stream';
    const etag = `W/"${stats.size}-${Math.floor(stats.mtimeMs)}"`;

    if (req.headers['if-none-match'] === etag) {
      return res.writeHead(304, { ETag: etag });
    }

    // Revalidate every response via ETag. A long max-age here made browsers
    // pin styles.css for 24h, so deploys appeared to have no effect.
    const cacheControl = ext === '.html' ? 'no-cache' : 'no-cache, must-revalidate';
    res.writeHead(200, {
      'Content-Type': type,
      ETag: etag,
      'Cache-Control': cacheControl,
      'X-Content-Type-Options': 'nosniff',
    });

    if (req.method === 'HEAD') return res.end();
    fs.createReadStream(filePath).pipe(res);
  });
}

const server = http.createServer((req, res) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return send(res, 405, 'Method Not Allowed', { Allow: 'GET, HEAD' });
  }

  if (req.url === '/healthz') {
    return send(res, 200, 'ok', { 'Content-Type': MIME['.txt'], 'Cache-Control': 'no-store' });
  }

  let pathname;
  try {
    pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  } catch {
    return send(res, 400, 'Bad Request');
  }

  const normalized = path.normalize(pathname).replace(/^(\.\.[/\\])+/, '');
  const target = path.join(ROOT, normalized);

  if (!target.startsWith(ROOT)) {
    return send(res, 403, 'Forbidden');
  }

  serveFile(res, target, req);
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Portal: Enrichment listening on http://0.0.0.0:${PORT}`);
});
