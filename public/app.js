'use strict';
/* ===== utils ===== */
const $ = i => document.getElementById(i);
const el = (t, c, x) => { const e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; };
const fmt = b => { const u = ['B', 'KB', 'MB', 'GB', 'TB']; let i = 0; while (b >= 1024 && i < 4) { b /= 1024; i++; } return b.toFixed(i ? 1 : 0) + ' ' + u[i]; };
const rid = () => Array.from(crypto.getRandomValues(new Uint8Array(8)), b => b.toString(16).padStart(2, '0')).join('');
const hex2b = h => { const m = String(h || '').match(/../g); return m ? Uint8Array.from(m, x => parseInt(x, 16)) : new Uint8Array(0); };
const b2hex = u => Array.from(u, b => b.toString(16).padStart(2, '0')).join('');
const clean = n => String(n || 'file').replace(/[\\/:*?"<>|\x00-\x1f]/g, '_').replace(/^\.+/, '').slice(0, 200) || 'file';
const safeUrl = s => { try { const u = new URL(s); return ['http:', 'https:'].includes(u.protocol) ? u.href : null; } catch { return null; } };
const mmss = s => `${String(s / 60 | 0).padStart(2, '0')}:${String(Math.max(0, s) % 60 | 0).padStart(2, '0')}`;
const isMobile = /Android|iPhone|iPad/i.test(navigator.userAgent);
const browser = () => (/Edg/.test(navigator.userAgent) ? 'Edge' : /Chrome/.test(navigator.userAgent) ? 'Chrome' : /Firefox/.test(navigator.userAgent) ? 'Firefox' : /Safari/.test(navigator.userAgent) ? 'Safari' : 'Browser');
const osName = () => (/Android/.test(navigator.userAgent) ? 'Android' : /iPhone|iPad/.test(navigator.userAgent) ? 'iOS' : /Windows/.test(navigator.userAgent) ? 'Windows' : /Mac/.test(navigator.userAgent) ? 'macOS' : /Linux/.test(navigator.userAgent) ? 'Linux' : 'Unknown OS');

/* ===== settings ===== */
const cfg = Object.assign({ name: isMobile ? 'Phone' : 'Computer', ask: true, autoDownload: false, maxSim: isMobile ? 1 : 2, theme: 'system', anim: true, sound: false, notify: false,
  showSpeed: true, showEta: true, approve: true, timeMin: 10, reconnect: true }, JSON.parse(localStorage.getItem('ys-cfg') || '{}'));
function applyTheme() {
  const dark = cfg.theme === 'dark' || (cfg.theme === 'system' && matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  document.documentElement.classList.toggle('no-anim', !cfg.anim);
}
const SET = [['sName', 'name'], ['sTheme', 'theme'], ['sTime', 'timeMin'], ['sReco', 'reconnect'], ['sAsk', 'ask'], ['sAuto', 'autoDownload'], ['sSim', 'maxSim'],
  ['sSpeed', 'showSpeed'], ['sEta', 'showEta'], ['sAppr', 'approve'], ['sAnim', 'anim'], ['sSound', 'sound'], ['sNote', 'notify']];

/* ===== UI helpers ===== */
const status = (t, c) => { const s = $('status'); s.textContent = '● ' + t; s.className = 'pill ' + (c || ''); };
const toast = m => { const d = el('div', null, m); $('toasts').append(d); setTimeout(() => d.remove(), 4500); };
let actx;
function beep(f) { if (!cfg.sound) return; try { actx = actx || new AudioContext(); const o = actx.createOscillator(), g = actx.createGain(); o.frequency.value = f; g.gain.value = .05; o.connect(g); g.connect(actx.destination); o.start(); o.stop(actx.currentTime + .12); } catch {} }
function notify(m, f) { toast(m); beep(f || 660); if (cfg.notify && document.hidden && window.Notification && Notification.permission === 'granted') new Notification('YASIR SHARE', { body: m }); }
let askQ = Promise.resolve();
const ask = (title, lines, yes = 'Accept', no = 'Reject') => (askQ = askQ.then(() => new Promise(res => {
  const d = $('dlg'); $('dlgTitle').textContent = title; $('dlgBody').replaceChildren(...lines.map(l => el('p', null, l)));
  $('dlgYes').textContent = yes; $('dlgNo').textContent = no; d.returnValue = ''; d.onclose = () => res(d.returnValue === 'ok'); d.showModal();
})));
function copyText(t) {
  const fail = () => toast('Clipboard access is not supported here. Select the text and copy it manually.');
  if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(t).then(() => toast('Copied'), fail);
  const a = el('textarea'); a.value = t; document.body.append(a); a.select();
  try { document.execCommand('copy') ? toast('Copied') : fail(); } catch { fail(); } a.remove();
}

/* ===== history ===== */
const hist = () => { try { return JSON.parse(localStorage.getItem('ys-hist') || '[]'); } catch { return []; } };
function addHist(r) { localStorage.setItem('ys-hist', JSON.stringify([{ ...r, t: Date.now() }, ...hist()].slice(0, 200))); renderHist(); }
function renderHist() {
  const q = $('hq').value.toLowerCase(), f = $('hf').value;
  const h = hist().filter(r => (!q || r.name.toLowerCase().includes(q)) && (f === 'all' || f === r.dir || f === r.status));
  $('hist').replaceChildren(...(h.length ? h.map(r => el('li', null, `${r.name} · ${r.dir === 'out' ? 'Sent' : 'Received'} · ${fmt(r.size)} · ${r.status} · ${new Date(r.t).toLocaleString()}`)) : [el('li', 'hint', 'No transfers yet.')]));
}

/* ===== transfer card ===== */
function card(name, size, dir, type) {
  const box = el('div', 'tcard'), head = el('div', 'thead'), meta = el('div', 'tmeta'), pr = el('progress'), st = el('span', 'tstat', 'Waiting');
  const btn = el('button', 'ghost', 'Cancel'), retry = el('button', null, 'Retry'); retry.hidden = true;
  pr.max = size || 1; pr.value = 0; pr.setAttribute('aria-label', name);
  head.append(el('strong', null, name), el('span', 'tmeta', `${dir} · ${fmt(size)}${type ? ' · ' + type.slice(0, 60) : ''}`));
  box.append(head, meta, pr, st, btn, retry);
  const n = $('noT'); if (n) n.remove(); $('transfers').prepend(box);
  let t0 = 0, last = 0, lb = 0, sp = 0;
  return { box, btn, retry,
    upd(b) {
      const n = performance.now(); if (!t0) { t0 = last = n; lb = 0; }
      if (n - last >= 500) { const inst = (b - lb) / ((n - last) / 1000); sp = sp ? sp * .7 + inst * .3 : inst; last = n; lb = b; }
      pr.value = b; let x = `${fmt(b)} / ${fmt(size)} · ${size ? Math.floor(b / size * 100) : 100}%`;
      if (cfg.showSpeed && sp > 0) x += ` · ${fmt(sp)}/s`;
      if (cfg.showEta) x += sp > 0 && n - t0 > 1000 ? ` · ETA ${mmss(Math.round((size - b) / sp))}` : ' · ETA Calculating…';
      meta.textContent = x;
    },
    set(s) { st.textContent = s; if (['Completed', 'Cancelled', 'Failed'].includes(s)) { btn.hidden = true; box.classList.add(s.toLowerCase()); } } };
}

/* ===== state ===== */
let ct = 0, candTypes = new Set(), iceServers = [], ws, pc, dc, role = '', maxSize = 5 * 1024 ** 3, sigQ = Promise.resolve(), ended = false, pendingICE = [], retries = 0, rt = 0, cdT = 0, infoT = 0, connAt = 0, peerDesc = '';
const CH = 64 * 1024, HIGH = 4 * 1024 * 1024;
const out = new Map(), inc = new Map(), queue = [], waiters = []; let active = 0;

/* ===== signaling ===== */
const wsSend = o => ws && ws.readyState === 1 && ws.send(JSON.stringify(o));
function openWS() {
  ended = false;
  return new Promise((ok, bad) => {
    ws = new WebSocket((location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host + '/ws');
    ws.onopen = ok;
    ws.onerror = () => { status('Error', 'err'); toast('Connection server unavailable.'); bad(); };
    ws.onclose = () => { if (ended) return; if (dc && dc.readyState === 'open') toast('Connection server unavailable. The direct connection is still active.'); else status('Disconnected'); };
    ws.onmessage = e => { let m; try { m = JSON.parse(e.data); } catch { return; } onSig(m); };
  });
}
function countdown(exp) {
  clearInterval(cdT);
  const tick = () => { const s = Math.round((exp - Date.now()) / 1000); $('sessHint').textContent = `Session expires in ${mmss(s)} if nobody joins.`; if (s <= 0) clearInterval(cdT); };
  tick(); cdT = setInterval(tick, 1000);
}
function onSig(m) {
  switch (m.type) {
    case 'created': $('sess').hidden = false; $('qr').src = m.qr; $('code').textContent = m.code.slice(0, 4) + '-' + m.code.slice(4); $('link').value = m.url; countdown(m.expires); status('Waiting', 'warn'); break;
    case 'join-request': {
      clearInterval(cdT); $('sessHint').textContent = 'A device is connecting…'; status('Connecting', 'warn');
      if (!cfg.approve) { wsSend({ type: 'approve' }); break; }
      ask('New device detected', [`Name: ${m.name}`, `Type: ${m.device}`, `Browser: ${m.ua}`, `Method: ${m.method}`], 'Approve', 'Reject').then(ok => wsSend({ type: ok ? 'approve' : 'reject' })); break;
    }
    case 'ready': status('Negotiating', 'warn'); startPC(true); break;
    case 'waiting-approval': status('Verifying…', 'warn'); break;
    case 'approved': status('Negotiating', 'warn'); startPC(false); break;
    case 'rejected': toast('The computer rejected this device.'); teardown(false); break;
    case 'offer': case 'answer': case 'candidate': sigQ = sigQ.then(() => handleRTC(m)).catch(e => { console.error(e); status('Error', 'err'); }); break;
    case 'peer-left': toast('The other device left.'); teardown(false); break;
    case 'session-ended': toast(m.reason || 'Session ended.'); teardown(false); break;
    case 'error': toast(m.msg); status('Error', 'err'); beep(220); break;
  }
}

/* ===== WebRTC ===== */
const flushICE = async () => { for (const c of pendingICE.splice(0)) try { await pc.addIceCandidate(c); } catch (e) { console.warn(e); } };
async function handleRTC(m) {
  if (!pc) return;
  if (m.type === 'candidate') { if (!m.candidate) return; if (!pc.remoteDescription) { pendingICE.push(m.candidate); return; } try { await pc.addIceCandidate(m.candidate); } catch (e) { console.warn(e); } return; }
  if (m.type === 'offer') { await pc.setRemoteDescription({ type: 'offer', sdp: m.sdp }); await flushICE(); const a = await pc.createAnswer(); await pc.setLocalDescription(a); wsSend({ type: 'answer', sdp: a.sdp }); }
  else { await pc.setRemoteDescription({ type: 'answer', sdp: m.sdp }); await flushICE(); }
}
function scheduleRestart() {
  clearTimeout(rt); rt = 0;
  if (role !== 'host' || !cfg.reconnect) return;
  if (retries >= 4) { status('Failed', 'err'); toast('The devices could not re-establish a direct connection. Connect both devices to the same Wi-Fi network and reconnect.'); return; }
  const d = 1000 * 2 ** retries++;
  rt = setTimeout(async () => {
    rt = 0; if (!pc || ['connected', 'completed'].includes(pc.iceConnectionState)) return;
    try { const o = await pc.createOffer({ iceRestart: true }); await pc.setLocalDescription(o); wsSend({ type: 'offer', sdp: o.sdp }); } catch { scheduleRestart(); }
  }, d);
}
function onIce() {
  if (!pc) return; const s = pc.iceConnectionState;
  if (s === 'connected' || s === 'completed') { retries = 0; clearTimeout(rt); rt = 0; clearTimeout(ct); if (dc && dc.readyState === 'open') status('Connected', 'ok'); }
  else if (s === 'disconnected' || s === 'failed') { status('Reconnecting', 'warn'); scheduleRestart(); }
}
async function startPC(host) {
  pc = new RTCPeerConnection({ iceServers }); pendingICE = []; retries = 0;
  pc.onicecandidate = e => { if (e.candidate) { const t = / typ (\w+)/.exec(e.candidate.candidate); if (t) candTypes.add(t[1]); } wsSend({ type: 'candidate', candidate: e.candidate }); };
  candTypes = new Set(); clearTimeout(ct);
  ct = setTimeout(() => { if (pc && !['connected', 'completed'].includes(pc.iceConnectionState)) { status('Failed', 'err'); toast(`No direct path between the devices was found (candidates: ${[...candTypes].join(', ') || 'none'}). If they are on different networks, a TURN server is needed (see README).`); } }, 25000);
  pc.oniceconnectionstatechange = onIce; pc.onconnectionstatechange = onIce;
  if (host) { setupDC(pc.createDataChannel('files', { ordered: true })); const o = await pc.createOffer(); await pc.setLocalDescription(o); wsSend({ type: 'offer', sdp: o.sdp }); }
  else pc.ondatachannel = e => setupDC(e.channel);
}
function setupDC(ch) {
  dc = ch; dc.binaryType = 'arraybuffer'; dc.bufferedAmountLowThreshold = 1 << 20;
  dc.onbufferedamountlow = () => waiters.splice(0).forEach(w => w());
  dc.onopen = () => {
    status('Connected', 'ok'); setSend(true); $('btnDisc').hidden = false; connAt = Date.now(); notify('Device connected', 880);
    dcSend({ type: 'hello', name: cfg.name, browser: browser(), os: osName() });
    clearInterval(infoT); infoT = setInterval(() => { $('peerInfo').textContent = `${peerDesc} · Encrypted direct connection (DTLS) · connected ${mmss(Math.round((Date.now() - connAt) / 1000))}`; }, 1000);
  };
  dc.onclose = () => { if (!ended) { toast('The connection to the other device was closed.'); teardown(false); } };
  dc.onerror = () => toast('The devices could not establish a direct connection. Try reconnecting.');
  dc.onmessage = e => (typeof e.data === 'string' ? onCtl(e.data) : onChunk(e.data));
}
const dcSend = o => dc && dc.readyState === 'open' && dc.send(JSON.stringify(o));
function teardown(notifyPeer) {
  if (notifyPeer) wsSend({ type: 'end' });
  ended = true; clearInterval(cdT); clearInterval(infoT); clearTimeout(rt); clearTimeout(ct); rt = 0;
  for (const T of out.values()) { T.cancelled = true; if (T.resolve) T.resolve(false); }
  for (const id of [...inc.keys()]) endInc(id, 'Failed');
  queue.length = 0; pendingICE = []; waiters.splice(0).forEach(w => w());
  try { dc && dc.close(); } catch {} try { pc && pc.close(); } catch {} try { ws && ws.close(); } catch {}
  dc = pc = ws = null; sigQ = Promise.resolve(); role = '';
  document.body.classList.remove('guest'); setSend(false); $('btnDisc').hidden = true; $('sess').hidden = true;
  $('peer').textContent = 'No device connected.'; $('peerInfo').textContent = ''; status('Disconnected');
}

/* ===== transfer manager ===== */
function newJob(f) {
  const id = rid(), c = card(f.name, f.size, 'Outgoing', f.type), T = { id, f, c, cancelled: false, resolve: null };
  T.fin = s => {
    c.set(s); addHist({ name: f.name, size: f.size, dir: 'out', status: s }); out.delete(id);
    if (s === 'Completed') notify(`Sent ${f.name}`, 880); else if (s === 'Failed') { notify(`Failed: ${f.name}`, 220); c.retry.hidden = false; c.retry.onclick = () => { c.retry.hidden = true; enqueue([f]); }; }
  };
  c.set('Queued'); c.btn.onclick = () => { T.cancelled = true; dcSend({ type: 'cancel', id }); if (T.resolve) T.resolve(false); };
  out.set(id, T); return T;
}
function enqueue(files) { for (const f of files) queue.push(newJob(f)); pump(); }
function pump() { while (active < cfg.maxSim && queue.length) { active++; sendFile(queue.shift()).catch(console.error).finally(() => { active--; pump(); }); } }
async function sendFile(T) {
  const { id, f, c } = T, hdr = hex2b(id);
  if (T.cancelled) return T.fin('Cancelled');
  if (f.size > maxSize) { toast(`${f.name} is larger than the maximum file size (${fmt(maxSize)}).`); return T.fin('Failed'); }
  if (!dc || dc.readyState !== 'open') return T.fin('Failed');
  c.set('Waiting for receiver');
  dcSend({ type: 'file-offer', id, name: f.name, size: f.size, mime: f.type });
  if (!await new Promise(r => { T.resolve = r; })) return T.fin('Cancelled');
  c.set('Sending');
  try {
    let off = 0;
    while (off < f.size) {
      if (T.cancelled) return T.fin('Cancelled');
      if (!dc || dc.readyState !== 'open') throw new Error('closed');
      while (dc.bufferedAmount > HIGH) { await new Promise(r => { const t = setTimeout(r, 500); waiters.push(() => { clearTimeout(t); r(); }); }); if (T.cancelled || !dc) break; }
      const data = new Uint8Array(await f.slice(off, off + CH).arrayBuffer()), fr = new Uint8Array(8 + data.length);
      fr.set(hdr); fr.set(data, 8); dc.send(fr); off += data.length; c.upd(off);
    }
    dcSend({ type: 'file-end', id }); c.set('Waiting for receiver to finish');
    T.fin(await new Promise(r => { T.resolve = r; }) ? 'Completed' : 'Cancelled');
  } catch { T.fin('Failed'); }
}
function endInc(id, s) {
  const r = inc.get(id); if (!r) return;
  r.c.set(s); addHist({ name: r.name, size: r.size, dir: 'in', status: s }); r.parts = null; inc.delete(id);
  if (s === 'Failed') notify(`Failed: ${r.name}`, 220);
}
function onChunk(buf) {
  if (buf.byteLength < 8) return;
  const id = b2hex(new Uint8Array(buf, 0, 8)), r = inc.get(id); if (!r) return;
  const d = buf.slice(8); r.parts.push(d); r.got += d.byteLength; r.c.upd(r.got);
  if (r.got > r.size) { dcSend({ type: 'cancel', id }); endInc(id, 'Failed'); }
}
async function onCtl(raw) {
  let m; try { m = JSON.parse(raw); } catch { return; }
  if (!m || typeof m.type !== 'string') return;
  const T = typeof m.id === 'string' ? out.get(m.id) : null;
  switch (m.type) {
    case 'hello': peerDesc = `${String(m.browser || 'Browser').slice(0, 20)} on ${String(m.os || 'unknown OS').slice(0, 20)}`; $('peer').textContent = `Connected to: ${String(m.name || 'Device').slice(0, 40)}`; break;
    case 'file-offer': {
      const name = clean(m.name), size = m.size;
      if (typeof m.id !== 'string' || !/^[a-f0-9]{16}$/.test(m.id) || inc.has(m.id) || !Number.isFinite(size) || size < 0 || size > maxSize) return dcSend({ type: 'reject', id: m.id });
      const type = typeof m.mime === 'string' ? m.mime.slice(0, 60) : '';
      const ok = cfg.ask ? await ask('Incoming file', [`Name: ${name}`, `Size: ${fmt(size)}`, `Type: ${type || 'unknown'}`]) : true;
      if (!ok || !dc) return dcSend({ type: 'reject', id: m.id });
      const c = card(name, size, 'Incoming', type); c.set('Receiving'); inc.set(m.id, { name, size, parts: [], got: 0, c });
      c.btn.onclick = () => { dcSend({ type: 'cancel', id: m.id }); endInc(m.id, 'Cancelled'); };
      notify(`Receiving ${name}`, 660); dcSend({ type: 'accept', id: m.id }); break;
    }
    case 'accept': if (T && T.resolve) T.resolve(true); break;
    case 'reject': if (T && T.resolve) T.resolve(false); break;
    case 'cancel': endInc(m.id, 'Cancelled'); if (T) { T.cancelled = true; if (T.resolve) T.resolve(false); } break;
    case 'file-done': if (T && T.resolve) T.resolve(true); break;
    case 'file-end': {
      const r = inc.get(m.id); if (!r) break;
      if (r.got !== r.size) { endInc(m.id, 'Failed'); break; }
      const url = URL.createObjectURL(new Blob(r.parts, { type: 'application/octet-stream' }));
      const a = el('a', null, 'Download'); a.href = url; a.download = r.name; r.c.box.append(a);
      // revoke after a delay so auto-download / manual click can finish
      a.addEventListener('click', () => setTimeout(() => URL.revokeObjectURL(url), 60000), { once: true });
      setTimeout(() => URL.revokeObjectURL(url), 10 * 60 * 1000);
      if (cfg.autoDownload) a.click();
      dcSend({ type: 'file-done', id: m.id }); endInc(m.id, 'Completed'); notify(`Received ${r.name}`, 880); break;
    }
    case 'text': { const t = String(m.text || '').slice(0, 20000), b = el('div', 'mcard'); b.append(el('strong', null, 'Received text'), el('pre', null, t));
      const cp = el('button', null, 'Copy'); cp.onclick = () => copyText(t); b.append(cp); $('msgs').prepend(b); notify('Text received'); break; }
    case 'link': { const u = safeUrl(m.url); if (!u) return; const b = el('div', 'mcard'); b.append(el('strong', null, 'Received link'));
      const a = el('a', null, u); a.href = u; a.target = '_blank'; a.rel = 'noopener noreferrer'; b.append(a); $('msgs').prepend(b); notify('Link received'); break; }
  }
}

/* ===== wiring ===== */
async function join(body) {
  role = 'guest'; document.body.classList.add('guest');
  try { await openWS(); } catch { role = ''; document.body.classList.remove('guest'); return; }
  status('Verifying…', 'warn'); wsSend({ type: 'join', name: cfg.name, ua: `${browser()} on ${osName()}`, ...body });
}
$('btnCreate').onclick = async () => { role = 'host'; try { await openWS(); } catch { role = ''; return; } status('Creating session…', 'warn'); wsSend({ type: 'create', origin: location.origin, timeoutMs: cfg.timeMin * 60000 }); };
$('joinForm').onsubmit = e => { e.preventDefault(); const c = $('joinCode').value.toUpperCase().replace(/[^A-Z0-9]/g, ''); if (/^[A-Z2-9]{8}$/.test(c)) join({ code: c }); else toast('Enter the 8-character code.'); };
async function handleScan(raw) {
  let u; try { u = new URL(raw); } catch { return toast('This QR code is not a YASIR SHARE link.'); }
  const t = u.searchParams.get('session');
  if (!['http:', 'https:'].includes(u.protocol) || !t) return toast('This QR code is not a YASIR SHARE link.');
  if (u.origin === location.origin) return join({ token: t });
  if (await ask('Open this link?', [`Host: ${u.host}`], 'Open', 'Cancel')) location.href = u.href;
}
$('btnScan').onclick = async () => {
  if (!('BarcodeDetector' in window) || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || !window.isSecureContext) return toast('In-app scanning needs HTTPS and a browser with QR support (Chrome on Android). Use your camera app or type the code.');
  let stream; try { stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } }); } catch { return toast('Camera permission was denied.'); }
  const v = $('scanVideo'), d = $('scanDlg'); let run = true; v.srcObject = stream; await v.play().catch(() => {});
  d.onclose = () => { run = false; stream.getTracks().forEach(t => t.stop()); v.srcObject = null; }; d.showModal();
  const det = new BarcodeDetector({ formats: ['qr_code'] });
  while (run) { try { const r = await det.detect(v); if (r.length) { const raw = r[0].rawValue; d.close(); handleScan(raw); break; } } catch {} await new Promise(r => setTimeout(r, 250)); }
};
$('btnCopy').onclick = () => copyText($('link').value); $('btnCopyCode').onclick = () => copyText($('code').textContent);
if (navigator.share) { $('btnShare').hidden = false; $('btnShare').onclick = () => navigator.share({ title: 'YASIR SHARE', url: $('link').value }).catch(() => {}); }
$('btnDisc').onclick = () => teardown(true);
$('btnFiles').onclick = () => $('fileIn').click(); $('btnFolder').onclick = () => $('folderIn').click(); $('drop').onclick = () => $('fileIn').click();
$('drop').onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); $('fileIn').click(); } };
for (const i of ['fileIn', 'folderIn']) $(i).onchange = e => { enqueue([...e.target.files]); e.target.value = ''; };
const drop = $('drop');
drop.ondragover = e => { e.preventDefault(); drop.classList.add('over'); }; drop.ondragleave = () => drop.classList.remove('over');
drop.ondrop = e => { e.preventDefault(); drop.classList.remove('over'); enqueue([...e.dataTransfer.files]); };
$('btnText').onclick = () => { const t = $('txt').value; if (!t.trim()) return; dcSend({ type: 'text', text: t.slice(0, 20000) }); $('txt').value = ''; toast('Text sent'); };
$('btnLink').onclick = () => { const u = safeUrl($('lnk').value.trim()); if (!u) return toast('Enter a valid http(s) link.'); dcSend({ type: 'link', url: u }); $('lnk').value = ''; toast('Link sent'); };
$('btnClear').onclick = () => { localStorage.removeItem('ys-hist'); renderHist(); };
$('hq').oninput = $('hf').onchange = renderHist;
$('btnSettings').onclick = () => { for (const [id, k] of SET) { const e = $(id); if (e.type === 'checkbox') e.checked = cfg[k]; else e.value = cfg[k]; } $('setDlg').showModal(); };
for (const [id, k] of SET) $(id).addEventListener('change', () => {
  const e = $(id); let v = e.type === 'checkbox' ? e.checked : typeof cfg[k] === 'number' ? Math.min(30, Math.max(1, +e.value || cfg[k])) : e.value;
  if (k === 'name') v = clean(v).slice(0, 40); if (k === 'maxSim') v = Math.min(4, v);
  cfg[k] = v; localStorage.setItem('ys-cfg', JSON.stringify(cfg)); applyTheme();
  if (k === 'notify' && v && window.Notification && Notification.permission === 'default') Notification.requestPermission();
});
$('btnTheme').onclick = () => { cfg.theme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'; localStorage.setItem('ys-cfg', JSON.stringify(cfg)); applyTheme(); };
function setSend(on) {
  $('sendCard').classList.toggle('off', !on);
  for (const e of $('sendCard').querySelectorAll('button,input,textarea')) e.disabled = !on;
}
setSend(false);
$('btnAll').onclick = async () => { if (await ask('Disconnect all devices?', ['This closes the connection and ends the session.'], 'Disconnect', 'Cancel')) { $('setDlg').close(); teardown(true); toast('All devices disconnected.'); } };
$('btnReset').onclick = () => { if (role !== 'host') return toast('Only the computer that created the session can reset it.'); $('setDlg').close(); teardown(true); setTimeout(() => $('btnCreate').click(), 200); };
addEventListener('beforeunload', () => { try { ws && ws.close(); } catch {} });

/* ===== init ===== */
const missing = ['WebSocket', 'RTCPeerConnection', 'File', 'Blob'].filter(k => !window[k]);
try { localStorage.setItem('ys-t', '1'); localStorage.removeItem('ys-t'); } catch { missing.push('localStorage'); }
if (missing.length) { $('compat').hidden = false; $('compat').textContent = 'This browser is missing: ' + missing.join(', ') + '. Some features will not work.'; status('Error', 'err'); }
applyTheme(); matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyTheme);
fetch('/api/config').then(r => r.json()).then(c => { maxSize = c.maxFileSize; iceServers = c.iceServers || []; }).catch(() => {});
renderHist();
const tok = new URLSearchParams(location.search).get('session');
if (tok) { history.replaceState(null, '', location.pathname); join({ token: tok }); }
