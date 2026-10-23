#!/usr/bin/env node
/**
 * Zero-dependency static server for the LaunchGrade site.
 * Usage: node scripts/serve.js [port]
 */
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';

const root = resolve(fileURLToPath(new URL('../site', import.meta.url)));
const port = Number(process.argv[2]) || 4173;

const types = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.ico': 'image/x-icon',
};

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    let pathname = decodeURIComponent(url.pathname);
    if (pathname.endsWith('/')) pathname += 'index.html';
    const target = resolve(join(root, normalize(pathname)));
    if (target !== root && !target.startsWith(root + sep)) {
      res.writeHead(403).end('Forbidden');
      return;
    }
    let file = target;
    try {
      if ((await stat(file)).isDirectory()) file = join(file, 'index.html');
    } catch {
      /* fall through to 404 */
    }
    let body;
    try {
      body = await readFile(file);
    } catch {
      const notFound = await readFile(join(root, '404.html'));
      res.writeHead(404, { 'content-type': 'text/html; charset=utf-8' });
      res.end(notFound);
      return;
    }
    const ext = extname(file).toLowerCase();
    const type = types[ext] || 'application/octet-stream';
    const compressible = /^(text\/|application\/(json|xml|javascript)|image\/svg)/.test(type);
    const acceptsGzip = /\bgzip\b/.test(String(req.headers['accept-encoding'] || ''));
    const headers = {
      'content-type': type,
      'cache-control': 'public, max-age=600',
      vary: 'Accept-Encoding',
    };
    let payload = body;
    if (compressible && acceptsGzip && body.length > 512) {
      payload = gzipSync(body, { level: 9 });
      headers['content-encoding'] = 'gzip';
    }
    res.writeHead(200, headers);
    res.end(payload);
  } catch (error) {
    res.writeHead(500).end(`Server error: ${error.message}`);
  }
});

server.listen(port, '127.0.0.1', () => {
  console.log(`LaunchGrade site: http://127.0.0.1:${port}/`);
  console.log('Press Ctrl+C to stop.');
});
