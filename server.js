#!/usr/bin/env node
/*
 * Lokaler Overlay-Server – ohne externe Pakete (nur Node.js ≥ 18).
 *
 *  - liefert die Dateien aus ./public aus
 *  - hält den gemeinsamen Zustand (Texte, Layout, Timer) und speichert ihn in ./data/state.json
 *  - verteilt Änderungen per Server-Sent Events an alle offenen Ansichten
 *    (OBS-Browserquelle, Bedienoberfläche, Smartphone-Fernsteuerung)
 *
 * Start:  node server.js         (oder: npm start)
 * Optionen über Umgebungsvariablen:
 *   PORT=8080            Port
 *   HOST=0.0.0.0         0.0.0.0 = im WLAN erreichbar (Handy), 127.0.0.1 = nur dieser PC
 *   OVERLAY_KEY=geheim   Optionaler Zugriffsschlüssel für Änderungen (?key=geheim)
 *   DATA_DIR=./data      Speicherort für state.json
 */
'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const S = require('./public/js/core/state.js');

const PORT = Number(process.env.PORT) || 8080;
const HOST = process.env.HOST || '0.0.0.0';
const KEY = process.env.OVERLAY_KEY || '';
const PUBLIC_DIR = path.join(__dirname, 'public');
const DATA_DIR = path.resolve(process.env.DATA_DIR || path.join(__dirname, 'data'));
const STATE_FILE = path.join(DATA_DIR, 'state.json');
const MAX_BODY = 8 * 1024 * 1024;
const VERSION = require('./package.json').version;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.txt': 'text/plain; charset=utf-8',
  '.webmanifest': 'application/manifest+json'
};

// ---------------------------------------------------------------------------
// Zustand laden / speichern
// ---------------------------------------------------------------------------

let state = loadState();
let rev = 1;
let saveTimer = null;

function loadState() {
  try {
    const raw = fs.readFileSync(STATE_FILE, 'utf8');
    return S.normalize(JSON.parse(raw));
  } catch (err) {
    if (err.code !== 'ENOENT') console.warn('[overlay] state.json konnte nicht gelesen werden – Standardwerte werden verwendet:', err.message);
    return S.defaults();
  }
}

function scheduleSave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(saveNow, 400);
}

function saveNow() {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    const tmp = STATE_FILE + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(state));
    fs.renameSync(tmp, STATE_FILE);
  } catch (err) {
    console.error('[overlay] Speichern fehlgeschlagen:', err.message);
  }
}

// ---------------------------------------------------------------------------
// Server-Sent Events
// ---------------------------------------------------------------------------

const clients = new Set();

function payload() {
  return JSON.stringify({ rev, serverNow: Date.now(), state });
}

function broadcast() {
  const msg = 'event: state\ndata: ' + payload() + '\n\n';
  for (const res of clients) res.write(msg);
}

setInterval(() => {
  const msg = 'event: time\ndata: ' + JSON.stringify({ serverNow: Date.now(), rev }) + '\n\n';
  for (const res of clients) res.write(msg);
}, 15000).unref();

// ---------------------------------------------------------------------------
// HTTP
// ---------------------------------------------------------------------------

function send(res, status, body, headers) {
  res.writeHead(status, Object.assign({ 'Cache-Control': 'no-store' }, headers || {}));
  res.end(body);
}

function sendJson(res, status, obj) {
  send(res, status, JSON.stringify(obj), { 'Content-Type': MIME['.json'] });
}

function keyOk(req, url) {
  if (!KEY) return true;
  const given = req.headers['x-overlay-key'] || url.searchParams.get('key') || '';
  const a = Buffer.from(String(given));
  const b = Buffer.from(KEY);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    let tooBig = false;
    const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > MAX_BODY * 4) return req.destroy(); // Missbrauch: Verbindung trennen
      if (size > MAX_BODY) { tooBig = true; return; } // Rest verwerfen, danach 413 senden
      chunks.push(c);
    });
    req.on('end', () => {
      if (tooBig) reject(Object.assign(new Error('Anfrage zu groß (Logo verkleinern?)'), { status: 413 }));
      else resolve(Buffer.concat(chunks).toString('utf8'));
    });
    req.on('error', reject);
  });
}

function lanUrls() {
  const out = [];
  const ifaces = os.networkInterfaces();
  for (const name of Object.keys(ifaces)) {
    for (const ni of ifaces[name] || []) {
      if (ni.family === 'IPv4' && !ni.internal) out.push('http://' + ni.address + ':' + PORT + '/');
    }
  }
  return out;
}

async function handleApi(req, res, url) {
  const route = url.pathname.replace(/^\/api\//, '');

  if (route === 'info' && req.method === 'GET') {
    return sendJson(res, 200, {
      app: 'crossfit-overlay',
      version: VERSION,
      mode: 'server',
      keyRequired: !!KEY,
      lanUrls: HOST === '127.0.0.1' || HOST === 'localhost' ? [] : lanUrls(),
      port: PORT
    });
  }

  if (route === 'state' && req.method === 'GET') {
    return send(res, 200, payload(), { 'Content-Type': MIME['.json'] });
  }

  if (route === 'events' && req.method === 'GET') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-store',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no'
    });
    res.write('retry: 1500\n');
    res.write('event: state\ndata: ' + payload() + '\n\n');
    clients.add(res);
    req.on('close', () => clients.delete(res));
    return;
  }

  if (route === 'action' && req.method === 'POST') {
    if (!keyOk(req, url)) return sendJson(res, 401, { error: 'Zugriffsschlüssel fehlt oder ist falsch' });
    let body;
    try {
      body = JSON.parse(await readBody(req));
    } catch (err) {
      return sendJson(res, err.status || 400, { error: err.status ? err.message : 'Ungültiges JSON' });
    }
    const actions = Array.isArray(body.actions) ? body.actions : [body.action];
    const before = state;
    for (const a of actions.slice(0, 50)) state = S.reduce(state, a, Date.now());
    if (state !== before) {
      rev++;
      scheduleSave();
      broadcast();
    }
    return sendJson(res, 200, { ok: true, rev, changed: state !== before });
  }

  return sendJson(res, 404, { error: 'Unbekannte API-Route' });
}

function serveStatic(req, res, url) {
  if (req.method !== 'GET' && req.method !== 'HEAD') return send(res, 405, 'Method not allowed');
  let rel;
  try {
    rel = decodeURIComponent(url.pathname);
  } catch (e) {
    return send(res, 400, 'Bad request');
  }
  if (rel.endsWith('/')) rel += 'index.html';
  const file = path.normalize(path.join(PUBLIC_DIR, rel));
  if (!file.startsWith(PUBLIC_DIR + path.sep) || /(^|[\\/])\./.test(path.relative(PUBLIC_DIR, file))) {
    return send(res, 403, 'Forbidden');
  }
  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) {
      // "/control" -> "/control.html"
      if (!path.extname(file) && fs.existsSync(file + '.html')) {
        url.pathname += '.html';
        return serveStatic(req, res, url);
      }
      return send(res, 404, 'Nicht gefunden', { 'Content-Type': MIME['.txt'] });
    }
    const type = MIME[path.extname(file).toLowerCase()] || 'application/octet-stream';
    const cache = /\/assets\/fonts\//.test(file) ? 'public, max-age=604800' : 'no-cache';
    res.writeHead(200, { 'Content-Type': type, 'Content-Length': st.size, 'Cache-Control': cache, 'X-Content-Type-Options': 'nosniff' });
    if (req.method === 'HEAD') return res.end();
    fs.createReadStream(file).pipe(res);
  });
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  if (url.pathname.startsWith('/api/')) {
    handleApi(req, res, url).catch((err) => {
      console.error('[overlay] Fehler:', err);
      if (!res.headersSent) sendJson(res, 500, { error: 'Interner Fehler' });
    });
    return;
  }
  serveStatic(req, res, url);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\n[overlay] Port ${PORT} ist bereits belegt. Läuft der Server schon? Sonst anderen Port wählen, z. B.:  PORT=8081 node server.js\n`);
    process.exit(1);
  }
  throw err;
});

if (require.main === module) {
  server.listen(PORT, HOST, () => {
    const local = 'http://localhost:' + PORT;
    const k = KEY ? '?key=' + encodeURIComponent(KEY) : '';
    console.log('\n  CrossFit-Streaming-Overlay läuft\n');
    console.log('  Bedienoberfläche:   ' + local + '/control.html' + k);
    console.log('  Overlay (OBS):      ' + local + '/overlay.html');
    console.log('  Kamera-Modus:       ' + local + '/overlay.html?camera=1');
    const lan = HOST === '127.0.0.1' || HOST === 'localhost' ? [] : lanUrls();
    if (lan.length) {
      console.log('  Handy-Fernbedienung (gleiches WLAN):');
      lan.forEach((u) => console.log('                      ' + u + 'remote.html' + k));
    }
    console.log('\n  Daten: ' + STATE_FILE + (KEY ? '\n  Zugriffsschlüssel aktiv.' : ''));
    console.log('  Beenden mit Strg+C\n');
  });
  const shutdown = () => { clearTimeout(saveTimer); saveNow(); process.exit(0); };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

module.exports = { server };
