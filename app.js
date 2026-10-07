'use strict';
/* LAN SHARE — sections: 1 State, 2 i18n, 3 DOM/UI, 4 WebRTC, 5 Signaling, 6 File Transfer, 7 History, 8 Settings, 9 Utilities */

/* ===== 1. STATE ===== */
const MAX_SIZE = 2 * 1024 ** 3, MAX_NAME = 180, CH_MIN = 64 * 1024, CH_MAX = 128 * 1024, HIGH = 4 * 1024 * 1024, LOW = 1024 * 1024;
const S = { lang: store('ls_lang', 'en'), theme: store('ls_theme', 'dark'), pc: null, dc: null, state: 'idle',
  queue: [], received: [], incoming: null, active: null, sending: false, err: '-', speed: 0, tick: null };

/* ===== 2. I18N ===== */
const I18N = {
en: { skip:'Skip to content', menu:'Menu', theme:'Toggle theme', nav_home:'Home', nav_transfer:'Transfer', nav_devices:'Devices', nav_history:'History', nav_how:'How it Works', nav_connect:'Connect Device',
 hero_badge:'Direct device-to-device', h1a:'Share', h1b:'without', h1c:'limits.', hero_p:'Transfer files directly between your devices.', size_note:'File size depends on your device, browser, storage and connection.',
 cta_send:'Send Files', cta_recv:'Receive Files', stat1:'Direct transfer', stat2:'Cloud uploads', stat3:'Encrypted channel', stat4:'Adaptive chunks',
 connect_title:'Connect Device', connect_sub:'There is no server, so connection data is exchanged manually.', stun:'Use a public STUN server (needed across different networks; it sees your IP)',
 s_create:'Create connection', s_offer:'Offer — send this to the other device', copy:'Copy', share:'Share', s_answer:'Paste the Answer from the other device', s_connect:'Connect',
 r_offer:'Paste the Offer from the sender', r_create:'Create answer', r_answer:'Answer — send this back to the sender',
 qr_note:'QR code is unavailable: the connection data is too large for a reliable QR without an external library. Use Copy or Share instead.',
 st_idle:'Not connected', st_waiting:'Waiting for peer...', st_connecting:'Connecting...', st_connected:'Connected', st_disconnected:'Disconnected', st_failed:'Connection failed',
 tr_title:'Transfer Center', drop:'Drop files here or tap to choose', no_pause:'Pause/resume is not available in this version.', send_btn:'Send queue', queue_title:'File transfer queue', empty:'No files yet',
 active_title:'Transfer', recv_title:'Received files', save:'Save', remove:'Remove', cancel:'Cancel', retry:'Retry', eta:'ETA',
 q_waiting:'Waiting', q_sending:'Sending', q_done:'Done', q_failed:'Failed', q_cancelled:'Cancelled', q_interrupted:'Interrupted',
 dev_title:'Device Status', dev_name:'Device name', dev_status:'Connection status', dev_method:'Connection method', dev_peer:'Peer status', peer_yes:'Peer connected', peer_no:'Waiting for peer', diag:'Developer Diagnostics',
 hist_title:'Recent Transfers', clear:'Clear history', hist_empty:'No transfers yet', dir_sent:'Sent', dir_received:'Received',
 feat_title:'Features', f1:'Direct Peer Transfer', f1d:'Files travel over a WebRTC data channel between the two devices.', f2:'No Cloud Upload', f2d:'Nothing is uploaded to a server; received files are rebuilt in your browser.',
 f3:'Large File Support', f3d:'Files are sent in chunks with backpressure. The receiver keeps data in memory, so the limit is set to 2 GB.', f4:'Drag & Drop', f4d:'Drop several files at once or use the file picker.',
 f5:'Transfer Progress', f5d:'See percentage, speed and remaining time, and cancel at any point.', f6:'Privacy First', f6d:'History stores only file names, sizes and dates on your device.',
 sec_title:'Security & Privacy', sec_text:'Files are transferred directly between connected devices. WebRTC data channels are encrypted with DTLS. Incoming messages are validated and file names are sanitized. Only share connection data with someone you trust, and note that no software can promise absolute security.',
 how_title:'How it Works', how1:'The sender chooses “Send Files” and creates a connection to get an Offer.', how2:'Send the Offer to the receiver by chat, email or any channel you trust.', how3:'The receiver pastes it, creates an Answer and sends it back.', how4:'The sender pastes the Answer, connects, then adds files and sends.',
 faq_title:'FAQ', q1:'Why do I need to copy and paste?', a1:'Without a signaling server, connection setup requires manual offer/answer exchange.', q2:'Does it work on different networks?', a2:'Often yes with the STUN option, but strict firewalls may block it. Without a relay (TURN) server, some networks cannot connect.',
 q3:'Is there a file size limit?', a3:'This version rejects files over 2 GB because the receiver holds data in memory. Real limits also depend on your device and connection.',
 foot_text:'Private file sharing between your devices.', built_by:'Built by',
 copied:'Copied', copy_fail:'Copy failed — select the text and copy it manually.', e_unsupported:'This browser does not support WebRTC, which LAN SHARE requires.', e_offer:'Invalid offer. Paste the complete text you received.', e_answer:'Invalid answer. Paste the complete text you received.',
 e_rejected:'A malformed message was rejected.', e_peer:'The other device disconnected.', e_interrupted:'Transfer interrupted.', e_notready:'Connect to another device first.', e_toolarge:'File rejected: larger than 2 GB.', e_name:'File rejected: name is too long.', e_conn:'Connection failed. Try again or enable STUN.', e_empty:'Nothing to do yet — add files first.' },
fa: { skip:'رفتن به محتوا', menu:'منو', theme:'تغییر تم', nav_home:'خانه', nav_transfer:'انتقال', nav_devices:'دستگاه‌ها', nav_history:'تاریخچه', nav_how:'چگونه کار می‌کند', nav_connect:'اتصال دستگاه',
 hero_badge:'مستقیم از دستگاه به دستگاه', h1a:'شریک کنید', h1b:'بدون', h1c:'محدودیت.', hero_p:'فایل‌ها را مستقیماً بین دستگاه‌های خود انتقال دهید.', size_note:'اندازهٔ فایل به دستگاه، مرورگر، حافظه و اتصال شما بستگی دارد.',
 cta_send:'ارسال فایل', cta_recv:'دریافت فایل', stat1:'انتقال مستقیم', stat2:'آپلود به ابر', stat3:'کانال رمزنگاری‌شده', stat4:'بخش‌های تطبیقی',
 connect_title:'اتصال دستگاه', connect_sub:'سرور وجود ندارد، بنابراین اطلاعات اتصال به صورت دستی رد و بدل می‌شود.', stun:'استفاده از سرور عمومی STUN (برای شبکه‌های متفاوت لازم است؛ IP شما را می‌بیند)',
 s_create:'ایجاد اتصال', s_offer:'پیشنهاد (Offer) — این را به دستگاه دیگر بفرستید', copy:'کپی', share:'اشتراک‌گذاری', s_answer:'پاسخ (Answer) دستگاه دیگر را اینجا بچسبانید', s_connect:'اتصال',
 r_offer:'پیشنهاد (Offer) فرستنده را اینجا بچسبانید', r_create:'ایجاد پاسخ', r_answer:'پاسخ (Answer) — این را به فرستنده برگردانید',
 qr_note:'کد QR در دسترس نیست: اطلاعات اتصال برای QR قابل اعتماد بدون کتابخانهٔ بیرونی بزرگ است. از کپی یا اشتراک‌گذاری استفاده کنید.',
 st_idle:'متصل نیست', st_waiting:'در انتظار دستگاه مقابل...', st_connecting:'در حال اتصال...', st_connected:'متصل شد', st_disconnected:'قطع شد', st_failed:'اتصال ناموفق بود',
 tr_title:'مرکز انتقال', drop:'فایل‌ها را اینجا رها کنید یا برای انتخاب لمس کنید', no_pause:'توقف و ادامه در این نسخه موجود نیست.', send_btn:'ارسال صف', queue_title:'صف انتقال فایل', empty:'هنوز فایلی نیست',
 active_title:'انتقال', recv_title:'فایل‌های دریافتی', save:'ذخیره', remove:'حذف', cancel:'لغو', retry:'تلاش دوباره', eta:'زمان باقی‌مانده',
 q_waiting:'در انتظار', q_sending:'در حال ارسال', q_done:'انجام شد', q_failed:'ناموفق', q_cancelled:'لغو شد', q_interrupted:'قطع شد',
 dev_title:'وضعیت دستگاه', dev_name:'نام دستگاه', dev_status:'وضعیت اتصال', dev_method:'روش اتصال', dev_peer:'وضعیت دستگاه مقابل', peer_yes:'دستگاه مقابل متصل است', peer_no:'در انتظار دستگاه مقابل', diag:'تشخیص برای توسعه‌دهندگان',
 hist_title:'انتقال‌های اخیر', clear:'پاک کردن تاریخچه', hist_empty:'هنوز انتقالی نیست', dir_sent:'ارسال‌شده', dir_received:'دریافت‌شده',
 feat_title:'ویژگی‌ها', f1:'انتقال مستقیم', f1d:'فایل‌ها از طریق کانال داده WebRTC بین دو دستگاه حرکت می‌کنند.', f2:'بدون آپلود به ابر', f2d:'چیزی روی سرور بارگذاری نمی‌شود؛ فایل‌های دریافتی در مرورگر شما بازسازی می‌شوند.',
 f3:'پشتیبانی از فایل بزرگ', f3d:'فایل‌ها قطعه‌قطعه و با کنترل فشار ارسال می‌شوند. گیرنده داده را در حافظه نگه می‌دارد، پس حد آن ۲ گیگابایت است.', f4:'کشیدن و رها کردن', f4d:'چند فایل را یکجا رها کنید یا از انتخاب فایل استفاده کنید.',
 f5:'پیشرفت انتقال', f5d:'درصد، سرعت و زمان باقی‌مانده را ببینید و در هر لحظه لغو کنید.', f6:'اول حریم خصوصی', f6d:'تاریخچه فقط نام، اندازه و تاریخ فایل را روی دستگاه شما ذخیره می‌کند.',
 sec_title:'امنیت و حریم خصوصی', sec_text:'فایل‌ها مستقیماً بین دستگاه‌های متصل منتقل می‌شوند. کانال داده WebRTC با DTLS رمزنگاری می‌شود. پیام‌های ورودی بررسی و نام فایل‌ها پاکسازی می‌شوند. اطلاعات اتصال را فقط با کسی که به او اعتماد دارید به اشتراک بگذارید؛ هیچ نرم‌افزاری امنیت مطلق را تضمین نمی‌کند.',
 how_title:'چگونه کار می‌کند', how1:'فرستنده «ارسال فایل» را انتخاب و اتصال ایجاد می‌کند تا Offer بگیرد.', how2:'Offer را از طریق پیام‌رسان، ایمیل یا هر راه مطمئن به گیرنده بفرستید.', how3:'گیرنده آن را می‌چسباند، Answer می‌سازد و برمی‌گرداند.', how4:'فرستنده Answer را می‌چسباند، متصل می‌شود، سپس فایل‌ها را اضافه و ارسال می‌کند.',
 faq_title:'سؤالات متداول', q1:'چرا باید کپی و جای‌گذاری کنم؟', a1:'بدون سرور سیگنالینگ، برقراری اتصال به تبادل دستی Offer و Answer نیاز دارد.', q2:'آیا بین شبکه‌های متفاوت کار می‌کند؟', a2:'اغلب با گزینهٔ STUN بله، اما فایروال‌های سخت‌گیر ممکن است مانع شوند. بدون سرور رله (TURN) بعضی شبکه‌ها نمی‌توانند وصل شوند.',
 q3:'آیا محدودیت اندازهٔ فایل هست؟', a3:'این نسخه فایل‌های بیش از ۲ گیگابایت را رد می‌کند زیرا گیرنده داده را در حافظه نگه می‌دارد. محدودیت واقعی به دستگاه و اتصال هم بستگی دارد.',
 foot_text:'اشتراک خصوصی فایل بین دستگاه‌های شما.', built_by:'ساخته‌شده توسط',
 copied:'کپی شد', copy_fail:'کپی ناموفق بود — متن را انتخاب و دستی کپی کنید.', e_unsupported:'این مرورگر از WebRTC پشتیبانی نمی‌کند و LAN SHARE به آن نیاز دارد.', e_offer:'Offer نامعتبر است. متن کامل را بچسبانید.', e_answer:'Answer نامعتبر است. متن کامل را بچسبانید.',
 e_rejected:'یک پیام نامعتبر رد شد.', e_peer:'دستگاه مقابل قطع شد.', e_interrupted:'انتقال قطع شد.', e_notready:'ابتدا به دستگاه دیگر وصل شوید.', e_toolarge:'فایل رد شد: بزرگ‌تر از ۲ گیگابایت.', e_name:'فایل رد شد: نام آن بسیار طولانی است.', e_conn:'اتصال ناموفق بود. دوباره تلاش کنید یا STUN را فعال کنید.', e_empty:'ابتدا فایل اضافه کنید.' }
};
const t = k => (I18N[S.lang] && I18N[S.lang][k]) || I18N.en[k] || k;

/* ===== 3. DOM / UI ===== */
const $ = id => document.getElementById(id);
function el(tag, cls, text) { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
function btn(key, cls, fn) { const b = el('button', 'btn ' + cls, t(key)); b.type = 'button'; b.addEventListener('click', fn); return b; }

function applyLang() {
  const fa = S.lang === 'fa';
  document.documentElement.lang = fa ? 'fa' : 'en';
  document.documentElement.dir = fa ? 'rtl' : 'ltr';
  document.querySelectorAll('[data-i18n]').forEach(e => { e.textContent = t(e.dataset.i18n); });
  document.querySelectorAll('[data-i18n-aria]').forEach(e => e.setAttribute('aria-label', t(e.dataset.i18nAria)));
  $('langBtn').textContent = fa ? 'EN' : 'دری';
  renderAll();
}
function renderAll() { renderState(); renderQueue(); renderReceived(); renderHistory(); renderActive(); }

function setState(s) { S.state = s; renderState(); updateDiag(); }
function renderState() {
  document.querySelectorAll('.state-text').forEach(e => { e.textContent = t('st_' + S.state); });
  document.querySelectorAll('.state-dot').forEach(e => { e.dataset.state = S.state; });
  $('peerText').textContent = t(S.state === 'connected' ? 'peer_yes' : 'peer_no');
}
let toastTimer;
function toast(key, isErr) {
  const tt = $('toast'); tt.textContent = t(key); tt.classList.add('show');
  if (isErr) S.err = key;
  clearTimeout(toastTimer); toastTimer = setTimeout(() => tt.classList.remove('show'), 4000);
}
function setMode(m) {
  const send = m !== 'recv';
  $('panelSend').hidden = !send; $('panelRecv').hidden = send;
  $('modeSend').setAttribute('aria-pressed', send); $('modeRecv').setAttribute('aria-pressed', !send);
}

function renderQueue() {
  const ul = $('queue'); ul.replaceChildren();
  if (!S.queue.length) { ul.append(el('li', 'muted', t('empty'))); return; }
  S.queue.forEach(it => {
    const li = el('li'), info = el('span', 'grow', it.file.name + ' · ' + fmtSize(it.file.size));
    li.append(info, el('span', 'muted', t('q_' + it.status)));
    const pct = el('span', 'muted', it.status === 'sending' ? pctOf(it.sent, it.file.size) : ''); pct.dataset.pct = it.id; li.append(pct);
    if (it.status === 'sending') li.append(btn('cancel', 'ghost', () => { it.cancel = true; }));
    if (it.status === 'failed' || it.status === 'cancelled') li.append(btn('retry', 'ghost', () => { it.status = 'waiting'; it.cancel = false; renderQueue(); sendQueue(); }));
    if (it.status !== 'sending') li.append(btn('remove', 'ghost', () => { S.queue = S.queue.filter(x => x !== it); renderQueue(); }));
    ul.append(li);
  });
}
function renderReceived() {
  const ul = $('received'); ul.replaceChildren();
  if (!S.received.length) { ul.append(el('li', 'muted', t('empty'))); return; }
  S.received.forEach(r => {
    const li = el('li'); li.append(el('span', 'grow', r.name + ' · ' + fmtSize(r.size)));
    li.append(btn('save', 'primary', () => saveFile(r)), btn('remove', 'ghost', () => { S.received = S.received.filter(x => x !== r); renderReceived(); }));
    ul.append(li);
  });
}
/* Progress is drawn from requestAnimationFrame only while a transfer is active (throttles DOM work). */
function setActive(a) { S.active = a; S.tick = null; S.speed = 0; if (a) requestAnimationFrame(loop); else renderActive(); }
function loop() { renderActive(); if (S.active) requestAnimationFrame(loop); }
function activeDone(a) { return a.dir === 'sent' ? a.item.sent : a.item.got; }
function renderActive() {
  const a = S.active, box = $('active'); box.hidden = !a; if (!a) return;
  const done = activeDone(a), now = performance.now();
  if (!S.tick) S.tick = { t: now, b: done };
  else if (now - S.tick.t >= 500) { S.speed = (done - S.tick.b) / ((now - S.tick.t) / 1000); S.tick = { t: now, b: done }; }
  const p = a.size ? Math.min(100, done / a.size * 100) : 100;
  $('aName').textContent = a.name; $('aFill').style.width = p.toFixed(1) + '%'; $('aBar').setAttribute('aria-valuenow', Math.round(p));
  $('aPct').textContent = p.toFixed(0) + '%'; $('aSpeed').textContent = fmtSize(S.speed) + '/s';
  $('aSize').textContent = fmtSize(done) + ' / ' + fmtSize(a.size);
  $('aEta').textContent = t('eta') + ' ' + (S.speed > 0 ? fmtTime((a.size - done) / S.speed) : '--:--');
  const q = document.querySelector('[data-pct="' + a.item.id + '"]'); if (q) q.textContent = pctOf(done, a.size);
  updateDiag();
}
function updateDiag() {
  if (!$('diag').open) return;
  const pc = S.pc, dc = S.dc;
  $('diagOut').textContent = ['connection: ' + (pc ? pc.connectionState : '-'), 'ice: ' + (pc ? pc.iceConnectionState : '-'), 'signaling: ' + (pc ? pc.signalingState : '-'),
    'datachannel: ' + (dc ? dc.readyState : '-'), 'bufferedAmount: ' + (dc ? dc.bufferedAmount : 0), 'speed: ' + fmtSize(S.speed) + '/s', 'last error: ' + S.err].join('\n');
}

/* ===== 4. WEBRTC ===== */
const ready = () => S.dc && S.dc.readyState === 'open';
function newPeer() {
  closePeer();
  const pc = new RTCPeerConnection({ iceServers: $('stun').checked ? [{ urls: 'stun:stun.l.google.com:19302' }] : [] });
  pc.onconnectionstatechange = () => {
    const c = pc.connectionState;
    if (c === 'connecting') setState('connecting');
    else if (c === 'failed') { setState('failed'); toast('e_conn', true); }
    else if (c === 'disconnected' || c === 'closed') onPeerGone();
    updateDiag();
  };
  pc.oniceconnectionstatechange = pc.onsignalingstatechange = updateDiag;
  S.pc = pc; return pc;
}
function bindChannel(dc) {
  dc.binaryType = 'arraybuffer'; dc.bufferedAmountLowThreshold = LOW; S.dc = dc;
  dc.onopen = () => setState('connected');
  dc.onclose = onPeerGone;
  dc.onerror = () => { S.err = 'datachannel error'; updateDiag(); };
  dc.onmessage = onMessage;
}
function onPeerGone() {
  if (S.state === 'connected') toast('e_peer', true);
  if (S.state !== 'failed' && S.state !== 'idle') setState('disconnected');
  abortIncoming('failed');
}
function closePeer() {
  const { pc, dc } = S; S.pc = S.dc = null;
  if (dc) { dc.onclose = null; try { dc.close(); } catch { /* already closed */ } }
  if (pc) { pc.onconnectionstatechange = null; try { pc.close(); } catch { /* already closed */ } }
}
/* Non-trickle ICE: wait until gathering finishes so the SDP already contains every candidate,
   which means a single copy/paste each way is enough. A timeout prevents hanging forever. */
function waitIce(pc) {
  return new Promise(res => {
    if (pc.iceGatheringState === 'complete') return res();
    const f = () => { if (pc.iceGatheringState === 'complete') { pc.removeEventListener('icegatheringstatechange', f); res(); } };
    pc.addEventListener('icegatheringstatechange', f); setTimeout(res, 8000);
  });
}

/* ===== 5. SIGNALING ===== */
const encode = d => btoa(JSON.stringify({ v: 1, type: d.type, sdp: d.sdp }));
function decode(text, type) {
  try {
    const o = JSON.parse(atob(text.trim()));
    if (o && o.v === 1 && o.type === type && typeof o.sdp === 'string' && o.sdp.startsWith('v=0') && o.sdp.length < 20000) return { type, sdp: o.sdp };
  } catch { /* fall through */ }
  return null;
}
async function createOffer() {
  const b = $('createOffer'); b.disabled = true; setState('waiting'); $('offerOut').value = '';
  try {
    const pc = newPeer(); bindChannel(pc.createDataChannel('lan-share'));
    await pc.setLocalDescription(await pc.createOffer()); await waitIce(pc);
    $('offerOut').value = encode(pc.localDescription);
  } catch (e) { S.err = String(e); setState('failed'); toast('e_conn', true); }
  b.disabled = false;
}
async function acceptAnswer() {
  const a = decode($('answerIn').value, 'answer');
  if (!a || !S.pc || S.pc.signalingState !== 'have-local-offer') return toast('e_answer', true);
  setState('connecting');
  try { await S.pc.setRemoteDescription(a); } catch (e) { S.err = String(e); setState('failed'); toast('e_answer', true); }
}
async function createAnswer() {
  const o = decode($('offerIn').value, 'offer'); if (!o) return toast('e_offer', true);
  setState('connecting'); $('answerOut').value = '';
  try {
    const pc = newPeer(); pc.ondatachannel = e => bindChannel(e.channel);
    await pc.setRemoteDescription(o); await pc.setLocalDescription(await pc.createAnswer()); await waitIce(pc);
    $('answerOut').value = encode(pc.localDescription); setState('waiting');
  } catch (e) { S.err = String(e); setState('failed'); toast('e_offer', true); }
}

/* ===== 6. FILE TRANSFER ===== */
/* Wire format: JSON text frames {type:'meta'|'end'|'cancel'} and raw ArrayBuffer chunks. One file at a time. */
function addFiles(list) {
  for (const f of list) {
    if (f.size > MAX_SIZE) { toast('e_toolarge', true); continue; }
    if (f.name.length > MAX_NAME) { toast('e_name', true); continue; }
    S.queue.push({ id: uid(), file: f, status: 'waiting', sent: 0, cancel: false });
  }
  renderQueue();
}
async function sendQueue() {
  if (!ready()) return toast('e_notready', true);
  if (S.sending) return;
  if (!S.queue.some(i => i.status === 'waiting')) return toast('e_empty');
  S.sending = true;
  for (const it of S.queue) { if (it.status === 'waiting') { await sendFile(it); if (!ready()) break; } }
  S.sending = false; setActive(null);
}
async function sendFile(it) {
  const f = it.file; it.status = 'sending'; it.sent = 0; it.cancel = false;
  setActive({ dir: 'sent', name: f.name, size: f.size, item: it }); renderQueue();
  try {
    S.dc.send(JSON.stringify({ type: 'meta', id: it.id, name: f.name, size: f.size, mime: f.type || 'application/octet-stream', chunks: Math.ceil(f.size / CH_MIN) }));
    for (let o = 0; o < f.size;) {
      if (it.cancel) throw new Error('cancelled');
      if (!ready()) throw new Error('disconnected');
      /* Backpressure: pause reading while the channel buffer is full. */
      while (S.dc.bufferedAmount > HIGH && ready()) await new Promise(r => { S.dc.onbufferedamountlow = r; setTimeout(r, 200); });
      const size = S.dc.bufferedAmount < LOW / 2 ? CH_MAX : CH_MIN; /* bigger chunks when the pipe is empty */
      const buf = await f.slice(o, o + size).arrayBuffer();
      S.dc.send(buf); o += buf.byteLength; it.sent = o;
    }
    S.dc.send(JSON.stringify({ type: 'end', id: it.id })); it.status = 'done';
  } catch (e) {
    if (it.cancel) { it.status = 'cancelled'; try { S.dc.send(JSON.stringify({ type: 'cancel', id: it.id })); } catch { /* peer gone */ } }
    else { it.status = 'failed'; S.err = String(e); toast('e_interrupted', true); }
  }
  addHistory(f.name, f.size, 'sent', it.status); renderQueue();
}
function onMessage(e) {
  const d = e.data;
  if (typeof d === 'string') {
    if (d.length > 2000) return rejectMsg();
    let m; try { m = JSON.parse(d); } catch { return rejectMsg(); }
    if (!m || typeof m !== 'object' || typeof m.id !== 'string' || !/^[a-f0-9]{16,32}$/.test(m.id)) return rejectMsg();
    if (m.type === 'meta') return onMeta(m);
    const i = S.incoming;
    if (m.type === 'end' && i && i.id === m.id) return onEnd(i);
    if (m.type === 'cancel') { if (i && i.id === m.id) abortIncoming('cancelled'); else if (S.active && S.active.item.id === m.id) S.active.item.cancel = true; return; }
    return rejectMsg();
  }
  const i = S.incoming;
  if (d instanceof ArrayBuffer && i) { i.parts.push(d); i.got += d.byteLength; if (i.got > i.size) { abortIncoming('failed'); rejectMsg(); } }
  else rejectMsg();
}
function rejectMsg() { S.err = 'rejected message'; toast('e_rejected', true); updateDiag(); }
function onMeta(m) {
  const okName = typeof m.name === 'string' && m.name.length > 0 && m.name.length <= MAX_NAME;
  const okSize = Number.isInteger(m.size) && m.size >= 0 && m.size <= MAX_SIZE;
  if (S.incoming || !okName || !okSize || !Number.isInteger(m.chunks) || m.chunks < 0) return rejectMsg();
  const mime = typeof m.mime === 'string' && m.mime.length <= 100 && /^[\w.+-]+\/[\w.+-]+$/.test(m.mime) ? m.mime : 'application/octet-stream';
  const i = { id: m.id, name: cleanName(m.name), size: m.size, mime, parts: [], got: 0 };
  S.incoming = i; setActive({ dir: 'received', name: i.name, size: i.size, item: i });
}
function onEnd(i) {
  S.incoming = null; setActive(null);
  if (i.got !== i.size) { addHistory(i.name, i.size, 'received', 'failed'); return toast('e_interrupted', true); }
  S.received.push({ id: i.id, name: i.name, size: i.size, blob: new Blob(i.parts, { type: i.mime }) });
  addHistory(i.name, i.size, 'received', 'done'); renderReceived();
}
function abortIncoming(status) {
  const i = S.incoming; if (!i) return;
  S.incoming = null; if (S.active && S.active.dir === 'received') setActive(null);
  addHistory(i.name, i.size, 'received', status);
}
function cancelActive() {
  const a = S.active; if (!a) return;
  if (a.dir === 'sent') a.item.cancel = true;
  else { try { S.dc.send(JSON.stringify({ type: 'cancel', id: a.item.id })); } catch { /* peer gone */ } abortIncoming('cancelled'); }
}
function saveFile(r) {
  const url = URL.createObjectURL(r.blob), a = el('a'); a.href = url; a.download = r.name; document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000); /* free the Object URL after the download starts */
}

/* ===== 7. HISTORY (metadata only) ===== */
function getHist() { try { const h = JSON.parse(localStorage.getItem('ls_hist')); return Array.isArray(h) ? h : []; } catch { return []; } }
function addHistory(n, s, dir, st) {
  const h = getHist(); h.unshift({ n, s, d: Date.now(), dir, st });
  try { localStorage.setItem('ls_hist', JSON.stringify(h.slice(0, 50))); } catch { /* storage unavailable */ }
  renderHistory();
}
function renderHistory() {
  const ul = $('histList'); ul.replaceChildren(); const h = getHist();
  if (!h.length) { ul.append(el('li', 'muted', t('hist_empty'))); return; }
  h.forEach(x => {
    const li = el('li'); li.append(el('span', 'grow', String(x.n) + ' · ' + fmtSize(Number(x.s) || 0)));
    li.append(el('span', 'muted', t(x.dir === 'sent' ? 'dir_sent' : 'dir_received') + ' · ' + t('q_' + x.st) + ' · ' + new Date(x.d).toLocaleString(S.lang === 'fa' ? 'fa-AF' : undefined)));
    ul.append(li);
  });
}

/* ===== 8. SETTINGS ===== */
function applyTheme() { document.documentElement.dataset.theme = S.theme; }

/* ===== 9. UTILITIES ===== */
function store(k, d) { try { return localStorage.getItem(k) || d; } catch { return d; } }
function save(k, v) { try { localStorage.setItem(k, v); } catch { /* storage unavailable */ } }
function uid() { const a = new Uint8Array(12); crypto.getRandomValues(a); return Array.from(a, b => b.toString(16).padStart(2, '0')).join(''); }
function cleanName(n) { const c = n.replace(/[\\/:*?"<>|\u0000-\u001f]/g, '_').replace(/^\.+/, '').trim(); return c || 'file'; }
function fmtSize(b) { const u = ['B', 'KB', 'MB', 'GB']; let i = 0; b = b || 0; while (b >= 1024 && i < 3) { b /= 1024; i++; } return b.toFixed(i ? 1 : 0) + ' ' + u[i]; }
function fmtTime(s) { s = Math.max(0, Math.round(s)); return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0'); }
const pctOf = (a, b) => (b ? Math.min(100, Math.round(a / b * 100)) : 100) + '%';
async function copyFrom(id) {
  const ta = $(id); if (!ta.value) return;
  try { await navigator.clipboard.writeText(ta.value); toast('copied'); } catch { ta.select(); toast('copy_fail'); }
}

/* ===== INIT ===== */
function init() {
  applyTheme(); $('devName').value = store('ls_dev', '');
  if (!window.RTCPeerConnection) { const u = $('unsupported'); u.hidden = false; u.textContent = t('e_unsupported'); document.querySelectorAll('#panelSend .btn,#panelRecv .btn').forEach(b => { b.disabled = true; }); }
  $('menuBtn').addEventListener('click', () => { const o = $('links').classList.toggle('open'); $('menuBtn').setAttribute('aria-expanded', o); });
  $('links').addEventListener('click', () => { $('links').classList.remove('open'); $('menuBtn').setAttribute('aria-expanded', false); });
  $('langBtn').addEventListener('click', () => { S.lang = S.lang === 'fa' ? 'en' : 'fa'; save('ls_lang', S.lang); applyLang(); });
  $('themeBtn').addEventListener('click', () => { S.theme = S.theme === 'dark' ? 'light' : 'dark'; save('ls_theme', S.theme); applyTheme(); });
  $('modeSend').addEventListener('click', () => setMode('send')); $('modeRecv').addEventListener('click', () => setMode('recv'));
  document.querySelectorAll('[data-mode]').forEach(a => a.addEventListener('click', () => setMode(a.dataset.mode)));
  $('createOffer').addEventListener('click', createOffer); $('acceptAnswer').addEventListener('click', acceptAnswer); $('createAnswer').addEventListener('click', createAnswer);
  $('copyOffer').addEventListener('click', () => copyFrom('offerOut')); $('copyAnswer').addEventListener('click', () => copyFrom('answerOut'));
  if (navigator.share) { const s = $('shareOffer'); s.hidden = false; s.addEventListener('click', () => { if ($('offerOut').value) navigator.share({ text: $('offerOut').value }).catch(() => {}); }); }
  $('picker').addEventListener('change', e => { addFiles(e.target.files); e.target.value = ''; });
  const drop = $('drop');
  ['dragenter', 'dragover'].forEach(n => drop.addEventListener(n, e => { e.preventDefault(); drop.classList.add('over'); }));
  ['dragleave', 'drop'].forEach(n => drop.addEventListener(n, e => { e.preventDefault(); drop.classList.remove('over'); }));
  drop.addEventListener('drop', e => addFiles(e.dataTransfer.files));
  $('sendBtn').addEventListener('click', sendQueue); $('aCancel').addEventListener('click', cancelActive);
  $('clearHist').addEventListener('click', () => { try { localStorage.removeItem('ls_hist'); } catch { /* ignore */ } renderHistory(); });
  $('devName').addEventListener('input', e => save('ls_dev', e.target.value.slice(0, 40)));
  $('diag').addEventListener('toggle', updateDiag); setInterval(() => { if ($('diag').open) updateDiag(); }, 1000);
  window.addEventListener('beforeunload', closePeer);
  applyLang();
}
init();
