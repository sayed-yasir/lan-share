'use strict';
const express = require('express'), http = require('http'), path = require('path');
const os = require('os'), crypto = require('crypto');
const { WebSocketServer } = require('ws');
const QR = require('qrcode');

const PORT = +process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';
const TIMEOUT = +process.env.SESSION_TIMEOUT_MS || 600000;
const MAX_FILE = +process.env.MAX_FILE_SIZE_BYTES || 5368709120;

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // 32 symbols, no 0/O/1/I -> 8 chars = 40 bits
const gFail = { n: 0, reset: 0 };
const app = express();
app.disable('x-powered-by');
app.use((q, r, n) => { r.set('X-Content-Type-Options', 'nosniff'); r.set('Referrer-Policy', 'no-referrer'); n(); });
app.use(express.static(path.join(__dirname, 'public')));
const isLocalHost = h => /^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|\[?::1)/.test(h || '');
app.get('/api/config', (q, r) => {
  let ice = [];
  try { ice = process.env.ICE_SERVERS ? JSON.parse(process.env.ICE_SERVERS) : [{ urls: 'stun:stun.l.google.com:19302' }]; } catch {}
  r.json({ maxFileSize: MAX_FILE, iceServers: ice });
});

const server = http.createServer(app);
const wss = new WebSocketServer({ server, maxPayload: 65536 }); // signaling only, never file bytes
const sessions = new Map();
const failed = new Map(); // ip -> {n, reset}

const log = (...a) => console.log(new Date().toISOString(), ...a);
const send = (w, o) => { if (w && w.readyState === 1) w.send(JSON.stringify(o)); };
const clip = (x, n) => (typeof x === 'string' ? x.slice(0, n) : '');
const same = (a, b) => a.length === b.length && crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
function lanIP() {
  if (process.env.LAN_IP) return process.env.LAN_IP; // manual override (useful on Termux)
  try {
    for (const l of Object.values(os.networkInterfaces()))
      for (const i of l || []) {
        // Node 18+ may report family as number 4 instead of string 'IPv4'
        if ((i.family === 'IPv4' || i.family === 4) && !i.internal) return i.address;
      }
  } catch (e) { log('Could not read network interfaces (set LAN_IP manually):', e.message); }
  return 'localhost';
}
function endSession(s, reason) {
  if (!sessions.delete(s.id)) return;
  for (const w of [s.host, s.guest, s.pending]) if (w) { send(w, { type: 'session-ended', reason }); w.session = null; }
  log('Session ended', s.id, reason);
}

wss.on('connection', (ws, req) => {
  const ip = (process.env.TRUST_PROXY && String(req.headers['x-forwarded-for'] || '').split(',')[0].trim()) || req.socket.remoteAddress;
  let n = 0, t = Date.now();
  ws.on('message', raw => {
    const now = Date.now();
    if (now - t > 1000) { t = now; n = 0; }
    if (++n > 40) return ws.close(1008, 'rate limit');
    let m;
    try { m = JSON.parse(raw); } catch { return send(ws, { type: 'error', msg: 'Malformed message.' }); }
    if (!m || typeof m !== 'object' || typeof m.type !== 'string') return send(ws, { type: 'error', msg: 'Malformed message.' });
    const s = ws.session;

    switch (m.type) {
      case 'create': {
        if (s) return;
        let code;
        do { code = Array.from({ length: 8 }, () => CODE_CHARS[crypto.randomInt(CODE_CHARS.length)]).join(''); }
        while ([...sessions.values()].some(x => x.code === code));
        const c = Date.now(), to = Math.min(Math.max(+m.timeoutMs || TIMEOUT, 60000), 1800000);
        const ns = { id: crypto.randomBytes(8).toString('hex'), token: crypto.randomBytes(16).toString('base64url'),
          code, created: c, expires: c + to, host: ws, guest: null, pending: null };
        sessions.set(ns.id, ns); ws.session = ns; ws.role = 'host';
        let base = `http://${lanIP()}:${PORT}`;
        try { const o = new URL(m.origin); if (['http:', 'https:'].includes(o.protocol) && !isLocalHost(o.hostname)) base = o.origin; } catch {}
        if (process.env.PUBLIC_URL) base = process.env.PUBLIC_URL.replace(/\/$/, '');
        const url = `${base}/?session=${ns.token}`;
        QR.toDataURL(url, { margin: 1, width: 240 })
          .then(qr => send(ws, { type: 'created', url, code, qr, expires: ns.expires }))
          .catch(() => send(ws, { type: 'error', msg: 'Could not create QR code.' }));
        log('Session created', ns.id);
        break;
      }
      case 'join': {
        if (s) return;
        const f = failed.get(ip);
        if (f && Date.now() < f.reset && f.n >= 6) return send(ws, { type: 'error', msg: 'Too many attempts. Wait a minute.' });
        const code8 = typeof m.code === 'string' ? m.code.toUpperCase().replace(/[^A-Z0-9]/g, '') : '';
        const byCode = /^[A-Z2-9]{8}$/.test(code8);
        if (byCode && gFail.n >= 30 && Date.now() < gFail.reset) return send(ws, { type: 'error', msg: 'Too many attempts. Wait a minute.' });
        let found = null;
        for (const x of sessions.values()) {
          if (typeof m.token === 'string' && same(x.token, m.token)) found = x;
          else if (byCode && same(x.code, code8)) found = x;
        }
        if (!found) {
          if (byCode) { if (Date.now() > gFail.reset) { gFail.n = 0; gFail.reset = Date.now() + 60000; } gFail.n++; }
          const r = failed.get(ip);
          if (!r || Date.now() > r.reset) failed.set(ip, { n: 1, reset: Date.now() + 60000 }); else r.n++;
          return send(ws, { type: 'error', msg: 'Invalid or expired session.' });
        }
        if (found.guest || found.pending) return send(ws, { type: 'error', msg: 'This session already has two connected devices.' });
        found.pending = ws; ws.session = found; ws.role = 'guest';
        send(ws, { type: 'waiting-approval' });
        send(found.host, { type: 'join-request', name: clip(m.name, 40) || 'Device',
          device: /Mobi|Android|iPhone|iPad/i.test(clip(m.ua, 200)) ? 'Phone' : 'Computer',
          ua: clip(m.ua, 60), method: m.token ? 'QR / link' : 'Pairing code' });
        log('Device joined (pending)', found.id);
        break;
      }
      case 'approve': case 'reject': {
        if (!s || ws.role !== 'host' || !s.pending) return;
        const g = s.pending; s.pending = null;
        if (m.type === 'approve') { s.guest = g; send(g, { type: 'approved' }); send(ws, { type: 'ready' }); log('Device approved', s.id); }
        else { send(g, { type: 'rejected' }); g.session = null; g.close(); log('Device rejected', s.id); }
        break;
      }
      case 'offer': case 'answer': case 'candidate': {
        if (!s || !s.guest) return;
        if (ws !== s.host && ws !== s.guest) return;
        const to = ws === s.host ? s.guest : s.host;
        if (m.type === 'candidate') {
          if (m.candidate !== null && (typeof m.candidate !== 'object' || Array.isArray(m.candidate))) return send(ws, { type: 'error', msg: 'Malformed message.' });
          send(to, { type: 'candidate', candidate: m.candidate });
        } else {
          if (typeof m.sdp !== 'string' || m.sdp.length > 30000) return send(ws, { type: 'error', msg: 'Malformed message.' });
          send(to, { type: m.type, sdp: m.sdp });
        }
        break;
      }
      case 'end': if (s && ws.role === 'host') endSession(s, 'The computer ended the session.'); break;
      default: send(ws, { type: 'error', msg: 'Unknown message type.' });
    }
  });
  ws.on('close', () => {
    const s = ws.session; if (!s) return;
    log('WebSocket disconnected', s.id, ws.role);
    if (ws.role === 'host') endSession(s, 'The computer disconnected.');
    else { if (s.guest === ws) s.guest = null; if (s.pending === ws) s.pending = null; send(s.host, { type: 'peer-left' }); }
  });
  ws.on('error', e => log('WS error', e.message));
});

setInterval(() => {
  const now = Date.now();
  for (const s of sessions.values()) if (!s.guest && now > s.expires) endSession(s, 'Session expired.');
  // prune expired rate-limit entries to avoid unbounded memory growth
  for (const [ip, f] of failed) if (now > f.reset) failed.delete(ip);
  if (now > gFail.reset) { gFail.n = 0; gFail.reset = 0; }
}, 5000).unref();

server.listen(PORT, HOST, () => log(`YASIR SHARE running: http://localhost:${PORT}/  (LAN: http://${lanIP()}:${PORT}/)`));
