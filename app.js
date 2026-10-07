'use strict';
/* LAN SHARE — sections: 1 State, 2 i18n, 3 DOM/UI, 4 WebRTC, 5 Signaling, 6 File Transfer, 7 History, 8 Settings, 9 Utilities */

/* ===== 1. STATE ===== */
const MAX_SIZE = Number.MAX_SAFE_INTEGER, MAX_NAME = 180, CH_MIN = 64 * 1024, CH_MAX = 128 * 1024, HIGH = 4 * 1024 * 1024, LOW = 1024 * 1024;
const S = { lang: store('ls_lang', 'en'), theme: store('ls_theme', 'dark'), pc: null, dc: null, state: 'idle',
  queue: [], received: [], incoming: null, pending: null, verified: false, peerName: '', active: null, sending: false, err: '-', speed: 0, tick: null };

/* ===== 2. I18N ===== */
const I18N = {
en: { v_title:'Verify the connection', v_help:'The same 6 digits must appear on the other device. If they differ, someone may be intercepting: disconnect.', v_ok:'They match', v_no:'They differ — disconnect', v_done:'Connection verified', e_verify:'Confirm the verification code on both devices first.', e_secure:'Verification needs a secure (HTTPS) page.', e_declined:'The other device declined the file.', incoming:'Incoming file', accept:'Accept', decline:'Decline', saved_disk:'Saved to disk', adv:'Advanced: TURN relay (optional)', adv_help:'Helps when a direct connection is impossible. Use your own TURN server; it relays encrypted data.', turn_url:'TURN URL (turn:host:3478)', turn_user:'Username', turn_pass:'Credential', code_label:'Your connection code (single use)', code_help:'On the other device choose Receive Files, then type this code or scan the QR. It connects automatically.', manual:'Manual connection (no relay)', r_code:'Enter the 12-digit code', r_join:'Connect', e_code:'Code not found. Check the 12 digits.', e_relay:'The relay is unreachable. Use Manual connection.', skip:'Skip to content', menu:'Menu', theme:'Toggle theme', nav_home:'Home', nav_transfer:'Transfer', nav_devices:'Devices', nav_history:'History', nav_how:'How it Works', nav_connect:'Connect Device',
 hero_badge:'Direct device-to-device', h1a:'Share', h1b:'without', h1c:'limits.', hero_p:'Transfer files directly between your devices.', size_note:'File size depends on your device, browser, storage and connection.',
 cta_send:'Send Files', cta_recv:'Receive Files', stat1:'Direct transfer', stat2:'Cloud uploads', stat3:'Encrypted channel', stat4:'Adaptive chunks',
 connect_title:'Connect Device', connect_sub:'Enter the 12-digit code or scan the QR. Only the small connection data passes through a free relay; files go directly between devices.', stun:'Use a public STUN server (needed across different networks; it sees your IP)',
 s_create:'Create connection', s_offer:'Offer — send this to the other device', copy:'Copy', share:'Share', s_answer:'Paste the Answer from the other device', s_connect:'Connect',
 r_offer:'Paste the Offer from the sender', r_create:'Create answer', r_answer:'Answer — send this back to the sender',
 qr_note:'The code and QR use the free public relay ntfy.sh for a few seconds. If it is unreachable, open Manual connection below.',
 st_idle:'Not connected', st_waiting:'Waiting for peer...', st_connecting:'Connecting...', st_connected:'Connected', st_disconnected:'Disconnected', st_failed:'Connection failed',
 tr_title:'Transfer Center', drop:'Drop files here or tap to choose', no_pause:'Pause/resume is not available in this version.', send_btn:'Send queue', queue_title:'File transfer queue', empty:'No files yet',
 active_title:'Transfer', recv_title:'Received files', save:'Save', remove:'Remove', cancel:'Cancel', retry:'Retry', eta:'ETA',
 q_waiting:'Waiting', q_sending:'Sending', q_done:'Done', q_failed:'Failed', q_cancelled:'Cancelled',
 dev_title:'Device Status', dev_name:'Device name', dev_status:'Connection status', dev_method:'Connection method', dev_peer:'Peer status', peer_yes:'Peer connected', peer_no:'Waiting for peer', diag:'Developer Diagnostics',
 hist_title:'Recent Transfers', clear:'Clear history', hist_empty:'No transfers yet', dir_sent:'Sent', dir_received:'Received',
 feat_title:'Features', f1:'Direct Peer Transfer', f1d:'Files travel over a WebRTC data channel between the two devices.', f2:'No Cloud Upload', f2d:'Nothing is uploaded to a server; received files are rebuilt in your browser.',
 f3:'Large File Support', f3d:'Files are sent in chunks with backpressure. In desktop Chrome and Edge, received files stream straight to disk; elsewhere they stay in memory until saved, so very large files depend on your device.', f4:'Drag & Drop', f4d:'Drop several files at once or use the file picker.',
 f5:'Transfer Progress', f5d:'See percentage, speed and remaining time, and cancel at any point.', f6:'Privacy First', f6d:'History stores only file names, sizes and dates on your device.',
 sec_title:'Security & Privacy', sec_text:'Files are transferred directly between connected devices. WebRTC data channels are encrypted with DTLS. Incoming messages are validated and file names are sanitized. Only share connection data with someone you trust, and note that no software can promise absolute security.',
 how_title:'How it Works', how1:'The sender chooses “Send Files” and creates a connection to get an Offer.', how2:'Send the Offer to the receiver by chat, email or any channel you trust.', how3:'The receiver pastes it, creates an Answer and sends it back.', how4:'The sender pastes the Answer, connects, then adds files and sends.',
 faq_title:'FAQ', q1:'How does the code work?', a1:'The code is a random one-time address on a free public relay (ntfy.sh) where the two devices swap connection data. Files never pass through it. Without a relay, use Manual connection with offer/answer exchange.', q2:'Does it work on different networks?', a2:'Often yes with the STUN option, but strict firewalls may block it. Without a relay (TURN) server, some networks cannot connect.',
 q3:'Is there a file size limit?', a3:'The app sets no limit. Desktop Chrome and Edge write straight to disk, so only free space matters; other browsers keep the file in memory until you save it.',
 foot_text:'Private file sharing between your devices.', built_by:'Built by',
 copied:'Copied', copy_fail:'Copy failed — select the text and copy it manually.', e_unsupported:'This browser does not support WebRTC, which LAN SHARE requires.', e_offer:'Invalid offer. Paste the complete text you received.', e_answer:'Invalid answer. Paste the complete text you received.',
 e_rejected:'A malformed message was rejected.', e_peer:'The other device disconnected.', e_interrupted:'Transfer interrupted.', e_notready:'Connect to another device first.', e_name:'File rejected: name is too long.', e_conn:'Connection failed. Try again or enable STUN.', e_empty:'Nothing to do yet — add files first.' },
fa: { v_title:'تأیید اتصال', v_help:'همین ۶ رقم باید روی دستگاه دیگر هم نمایش داده شود. اگر فرق داشت، ممکن است کسی در میان باشد: اتصال را قطع کنید.', v_ok:'یکسان است', v_no:'فرق دارد — قطع کن', v_done:'اتصال تأیید شد', e_verify:'ابتدا کد تأیید را روی هر دو دستگاه تأیید کنید.', e_secure:'تأیید به صفحهٔ امن (HTTPS) نیاز دارد.', e_declined:'دستگاه مقابل فایل را نپذیرفت.', incoming:'فایل ورودی', accept:'پذیرفتن', decline:'رد کردن', saved_disk:'روی دیسک ذخیره شد', adv:'پیشرفته: رلهٔ TURN (اختیاری)', adv_help:'وقتی اتصال مستقیم ممکن نیست کمک می‌کند. سرور TURN خودتان را بگذارید؛ داده‌های رمزنگاری‌شده را رله می‌کند.', turn_url:'نشانی TURN (turn:host:3478)', turn_user:'نام کاربری', turn_pass:'گذرواژه', code_label:'کد اتصال شما (یک‌بارمصرف)', code_help:'در دستگاه دیگر «دریافت فایل» را بزنید، سپس این کد را بنویسید یا QR را اسکن کنید. به‌طور خودکار وصل می‌شود.', manual:'اتصال دستی (بدون رله)', r_code:'کد ۱۲ رقمی را وارد کنید', r_join:'اتصال', e_code:'کد پیدا نشد. ۱۲ رقم را بررسی کنید.', e_relay:'رله در دسترس نیست. از اتصال دستی استفاده کنید.', skip:'رفتن به محتوا', menu:'منو', theme:'تغییر تم', nav_home:'خانه', nav_transfer:'انتقال', nav_devices:'دستگاه‌ها', nav_history:'تاریخچه', nav_how:'چگونه کار می‌کند', nav_connect:'اتصال دستگاه',
 hero_badge:'مستقیم از دستگاه به دستگاه', h1a:'شریک کنید', h1b:'بدون', h1c:'محدودیت.', hero_p:'فایل‌ها را مستقیماً بین دستگاه‌های خود انتقال دهید.', size_note:'اندازهٔ فایل به دستگاه، مرورگر، حافظه و اتصال شما بستگی دارد.',
 cta_send:'ارسال فایل', cta_recv:'دریافت فایل', stat1:'انتقال مستقیم', stat2:'آپلود به ابر', stat3:'کانال رمزنگاری‌شده', stat4:'بخش‌های تطبیقی',
 connect_title:'اتصال دستگاه', connect_sub:'کد ۱۲ رقمی را وارد کنید یا QR را اسکن کنید. فقط اطلاعات کوچک اتصال از یک رله رایگان می‌گذرد؛ فایل‌ها مستقیماً بین دستگاه‌ها می‌روند.', stun:'استفاده از سرور عمومی STUN (برای شبکه‌های متفاوت لازم است؛ IP شما را می‌بیند)',
 s_create:'ایجاد اتصال', s_offer:'پیشنهاد (Offer) — این را به دستگاه دیگر بفرستید', copy:'کپی', share:'اشتراک‌گذاری', s_answer:'پاسخ (Answer) دستگاه دیگر را اینجا بچسبانید', s_connect:'اتصال',
 r_offer:'پیشنهاد (Offer) فرستنده را اینجا بچسبانید', r_create:'ایجاد پاسخ', r_answer:'پاسخ (Answer) — این را به فرستنده برگردانید',
 qr_note:'کد و QR برای چند ثانیه از رلهٔ عمومی رایگان ntfy.sh استفاده می‌کنند. اگر در دسترس نبود، «اتصال دستی» را باز کنید.',
 st_idle:'متصل نیست', st_waiting:'در انتظار دستگاه مقابل...', st_connecting:'در حال اتصال...', st_connected:'متصل شد', st_disconnected:'قطع شد', st_failed:'اتصال ناموفق بود',
 tr_title:'مرکز انتقال', drop:'فایل‌ها را اینجا رها کنید یا برای انتخاب لمس کنید', no_pause:'توقف و ادامه در این نسخه موجود نیست.', send_btn:'ارسال صف', queue_title:'صف انتقال فایل', empty:'هنوز فایلی نیست',
 active_title:'انتقال', recv_title:'فایل‌های دریافتی', save:'ذخیره', remove:'حذف', cancel:'لغو', retry:'تلاش دوباره', eta:'زمان باقی‌مانده',
 q_waiting:'در انتظار', q_sending:'در حال ارسال', q_done:'انجام شد', q_failed:'ناموفق', q_cancelled:'لغو شد',
 dev_title:'وضعیت دستگاه', dev_name:'نام دستگاه', dev_status:'وضعیت اتصال', dev_method:'روش اتصال', dev_peer:'وضعیت دستگاه مقابل', peer_yes:'دستگاه مقابل متصل است', peer_no:'در انتظار دستگاه مقابل', diag:'تشخیص برای توسعه‌دهندگان',
 hist_title:'انتقال‌های اخیر', clear:'پاک کردن تاریخچه', hist_empty:'هنوز انتقالی نیست', dir_sent:'ارسال‌شده', dir_received:'دریافت‌شده',
 feat_title:'ویژگی‌ها', f1:'انتقال مستقیم', f1d:'فایل‌ها از طریق کانال داده WebRTC بین دو دستگاه حرکت می‌کنند.', f2:'بدون آپلود به ابر', f2d:'چیزی روی سرور بارگذاری نمی‌شود؛ فایل‌های دریافتی در مرورگر شما بازسازی می‌شوند.',
 f3:'پشتیبانی از فایل بزرگ', f3d:'فایل‌ها قطعه‌قطعه و با کنترل فشار ارسال می‌شوند. در Chrome و Edge دسکتاپ، فایل دریافتی مستقیم روی دیسک نوشته می‌شود؛ در جاهای دیگر تا ذخیره در حافظه می‌ماند، پس فایل‌های بسیار بزرگ به دستگاه شما بستگی دارند.', f4:'کشیدن و رها کردن', f4d:'چند فایل را یکجا رها کنید یا از انتخاب فایل استفاده کنید.',
 f5:'پیشرفت انتقال', f5d:'درصد، سرعت و زمان باقی‌مانده را ببینید و در هر لحظه لغو کنید.', f6:'اول حریم خصوصی', f6d:'تاریخچه فقط نام، اندازه و تاریخ فایل را روی دستگاه شما ذخیره می‌کند.',
 sec_title:'امنیت و حریم خصوصی', sec_text:'فایل‌ها مستقیماً بین دستگاه‌های متصل منتقل می‌شوند. کانال داده WebRTC با DTLS رمزنگاری می‌شود. پیام‌های ورودی بررسی و نام فایل‌ها پاکسازی می‌شوند. اطلاعات اتصال را فقط با کسی که به او اعتماد دارید به اشتراک بگذارید؛ هیچ نرم‌افزاری امنیت مطلق را تضمین نمی‌کند.',
 how_title:'چگونه کار می‌کند', how1:'فرستنده «ارسال فایل» را انتخاب و اتصال ایجاد می‌کند تا Offer بگیرد.', how2:'Offer را از طریق پیام‌رسان، ایمیل یا هر راه مطمئن به گیرنده بفرستید.', how3:'گیرنده آن را می‌چسباند، Answer می‌سازد و برمی‌گرداند.', how4:'فرستنده Answer را می‌چسباند، متصل می‌شود، سپس فایل‌ها را اضافه و ارسال می‌کند.',
 faq_title:'سؤالات متداول', q1:'کد چگونه کار می‌کند؟', a1:'کد یک نشانی تصادفی و یک‌بارمصرف روی رلهٔ عمومی رایگان (ntfy.sh) است که دو دستگاه اطلاعات اتصال را رد و بدل می‌کنند. فایل‌ها هرگز از آن نمی‌گذرند. بدون رله، از اتصال دستی (Offer/Answer) استفاده کنید.', q2:'آیا بین شبکه‌های متفاوت کار می‌کند؟', a2:'اغلب با گزینهٔ STUN بله، اما فایروال‌های سخت‌گیر ممکن است مانع شوند. بدون سرور رله (TURN) بعضی شبکه‌ها نمی‌توانند وصل شوند.',
 q3:'آیا محدودیت اندازهٔ فایل هست؟', a3:'برنامه محدودیتی ندارد. Chrome و Edge دسکتاپ مستقیم روی دیسک می‌نویسند و فقط فضای خالی مهم است؛ مرورگرهای دیگر فایل را تا ذخیره در حافظه نگه می‌دارند.',
 foot_text:'اشتراک خصوصی فایل بین دستگاه‌های شما.', built_by:'ساخته‌شده توسط',
 copied:'کپی شد', copy_fail:'کپی ناموفق بود — متن را انتخاب و دستی کپی کنید.', e_unsupported:'این مرورگر از WebRTC پشتیبانی نمی‌کند و LAN SHARE به آن نیاز دارد.', e_offer:'Offer نامعتبر است. متن کامل را بچسبانید.', e_answer:'Answer نامعتبر است. متن کامل را بچسبانید.',
 e_rejected:'یک پیام نامعتبر رد شد.', e_peer:'دستگاه مقابل قطع شد.', e_interrupted:'انتقال قطع شد.', e_notready:'ابتدا به دستگاه دیگر وصل شوید.', e_name:'فایل رد شد: نام آن بسیار طولانی است.', e_conn:'اتصال ناموفق بود. دوباره تلاش کنید یا STUN را فعال کنید.', e_empty:'ابتدا فایل اضافه کنید.' }
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
  $('peerText').textContent = t(S.state === 'connected' ? 'peer_yes' : 'peer_no') + (S.state === 'connected' && S.peerName ? ': ' + S.peerName : '');
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
    if (it.status === 'sending') li.append(btn('cancel', 'ghost', () => cancelItem(it)));
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
    li.append(r.blob ? btn('save', 'primary', () => saveFile(r)) : el('span', 'muted', t('saved_disk')), btn('remove', 'ghost', () => { S.received = S.received.filter(x => x !== r); renderReceived(); }));
    ul.append(li);
  });
}
function renderRequest() {
  const p = S.pending; $('request').hidden = !p;
  if (p) $('rText').textContent = t('incoming') + (S.peerName ? ' (' + S.peerName + ')' : '') + ': ' + p.name + ' · ' + fmtSize(p.size);
}
/* Progress is drawn from requestAnimationFrame only while a transfer is active (throttles DOM work). */
function setActive(a) { S.active = a; S.tick = null; S.speed = 0; holdScreen(!!a); if (a) requestAnimationFrame(loop); else renderActive(); }
/* Keep the screen awake during a transfer so phones do not sleep and drop the connection. */
let wake = null;
async function holdScreen(on) {
  try {
    if (on && navigator.wakeLock && !wake) { wake = await navigator.wakeLock.request('screen'); wake.addEventListener('release', () => { wake = null; }); }
    else if (!on && wake) { await wake.release(); wake = null; }
  } catch { /* not supported or denied */ }
}
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
function iceServers() {
  const l = [], url = $('turnUrl').value.trim();
  if ($('stun').checked) l.push({ urls: 'stun:stun.l.google.com:19302' });
  if (/^turns?:/.test(url)) l.push({ urls: url, username: $('turnUser').value, credential: $('turnPass').value });
  return l;
}
function newPeer() {
  closePeer();
  const pc = new RTCPeerConnection({ iceServers: iceServers() });
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
  dc.onopen = () => { closeRelay(); setState('connected'); sendCtl({ type: 'hello', name: $('devName').value.trim().slice(0, 40) || 'Device' }); startVerify(); };
  dc.onclose = onPeerGone;
  dc.onerror = () => { S.err = 'datachannel error'; updateDiag(); };
  dc.onmessage = onMessage;
}
function onPeerGone() {
  if (S.state === 'connected') toast('e_peer', true);
  if (S.state !== 'failed' && S.state !== 'idle') setState('disconnected');
  abortIncoming('failed'); resetPeerUI();
}
function resetPeerUI() { S.verified = false; S.pending = null; S.peerName = ''; $('verify').hidden = true; renderRequest(); renderState(); }
const sendCtl = o => { try { S.dc.send(JSON.stringify(o)); } catch { /* peer gone */ } };
/* Short authentication string: both devices hash the two DTLS certificate fingerprints. If someone sits in the
   middle (e.g. answers a stolen code), the fingerprints differ and so do the 6 digits. */
async function startVerify() {
  S.verified = false; $('verify').hidden = false; $('sas').textContent = '------';
  try {
    const fp = d => (d.sdp.match(/a=fingerprint:\S+ (\S+)/) || [])[1], a = fp(S.pc.localDescription), b = fp(S.pc.remoteDescription);
    if (!a || !b || !crypto.subtle) throw new Error('no fingerprint');
    const h = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode([a, b].sort().join('|'))));
    $('sas').textContent = String(((h[0] << 24 | h[1] << 16 | h[2] << 8 | h[3]) >>> 0) % 1000000).padStart(6, '0');
  } catch (e) { S.err = String(e); toast('e_secure', true); }
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
const b64 = u => btoa(String.fromCharCode(...u));
async function pipe(bytes, stream) { return new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(stream)).arrayBuffer()); }
/* Offer/Answer are deflate-compressed (prefix z) when the browser supports it, otherwise plain (prefix p). */
async function encode(d) {
  const raw = new TextEncoder().encode(JSON.stringify({ v: 1, type: d.type, sdp: d.sdp }));
  return window.CompressionStream ? 'z' + b64(await pipe(raw, new CompressionStream('deflate-raw'))) : 'p' + b64(raw);
}
async function decode(text, type) {
  try {
    const x = text.trim(), u = Uint8Array.from(atob(x.slice(1)), c => c.charCodeAt(0));
    const o = JSON.parse(new TextDecoder().decode(x[0] === 'z' ? await pipe(u, new DecompressionStream('deflate-raw')) : u));
    if (o && o.v === 1 && o.type === type && typeof o.sdp === 'string' && o.sdp.startsWith('v=0') && o.sdp.length < 20000) return { type, sdp: o.sdp };
  } catch { /* fall through */ }
  return null;
}
async function createOffer() {
  closeRelay(); $('codeBox').hidden = true; const b = $('createOffer'); b.disabled = true; setState('waiting'); $('offerOut').value = '';
  try {
    const pc = newPeer(); bindChannel(pc.createDataChannel('lan-share'));
    await pc.setLocalDescription(await pc.createOffer()); await waitIce(pc);
    $('offerOut').value = await encode(pc.localDescription);
    try { const code = await freshCode(); await relayPost(topic(code, 'o'), $('offerOut').value); showCode(code); listenAnswer(code); }
    catch (e) { S.err = String(e); toast('e_relay', true); } /* manual connection still works */
  } catch (e) { S.err = String(e); setState('failed'); toast('e_conn', true); }
  b.disabled = false;
}
async function applyAnswer(text) {
  const a = await decode(text, 'answer');
  if (!a || !S.pc || S.pc.signalingState !== 'have-local-offer') return toast('e_answer', true);
  setState('connecting');
  try { await S.pc.setRemoteDescription(a); } catch (e) { S.err = String(e); setState('failed'); toast('e_answer', true); }
}
const acceptAnswer = () => applyAnswer($('answerIn').value);
async function createAnswer() {
  const o = await decode($('offerIn').value, 'offer'); if (!o) return toast('e_offer', true);
  setState('connecting'); $('answerOut').value = '';
  try {
    const pc = newPeer(); pc.ondatachannel = e => bindChannel(e.channel);
    await pc.setRemoteDescription(o); await pc.setLocalDescription(await pc.createAnswer()); await waitIce(pc);
    $('answerOut').value = encode(pc.localDescription); setState('waiting');
  } catch (e) { S.err = String(e); setState('failed'); toast('e_offer', true); }
}

/* Quick connect: Offer/Answer are swapped through the free ntfy.sh pub/sub relay under a random, single-use 12-digit code.
   Only this small connection data uses the relay; files always travel over the WebRTC channel. */
const RELAY = 'https://ntfy.sh';
let relayES = null;
const topic = (code, k) => 'lanshare-' + code + '-' + k;
function newCode() { const a = new Uint32Array(3); crypto.getRandomValues(a); return Array.from(a, n => String(n % 10000).padStart(4, '0')).join(''); }
async function relayRead(tp) {
  const r = await fetch(RELAY + '/' + tp + '/json?poll=1&since=all'); if (!r.ok) throw new Error('relay ' + r.status);
  const lines = (await r.text()).trim().split('\n').filter(Boolean);
  for (let i = lines.length - 1; i >= 0; i--) { try { const m = JSON.parse(lines[i]); if (m.event === 'message') return m.message; } catch { /* skip */ } }
  return null;
}
const relayPost = (tp, body) => fetch(RELAY + '/' + tp, { method: 'POST', body }).then(r => { if (!r.ok) throw new Error('relay ' + r.status); });
async function freshCode() { /* never reuse a code whose topic already holds data */
  for (let i = 0; i < 5; i++) { const c = newCode(); if (!(await relayRead(topic(c, 'o')))) return c; }
  throw new Error('no free code');
}
function showCode(code) {
  $('codeBox').hidden = false; $('codeText').textContent = code.replace(/(\d{4})(?=\d)/g, '$1 ');
  try { $('qr').hidden = false; drawQR(location.href.split('#')[0] + '#join=' + code); } catch { $('qr').hidden = true; }
}
function listenAnswer(code) {
  closeRelay(); let used = false; /* only the first answer is accepted */
  relayES = new EventSource(RELAY + '/' + topic(code, 'a') + '/sse?since=all');
  relayES.onmessage = e => { let m; try { m = JSON.parse(e.data); } catch { return; } if (used || m.event !== 'message') return; used = true; closeRelay(); applyAnswer(m.message); };
}
function closeRelay() { if (relayES) { relayES.close(); relayES = null; } }
async function joinCode(raw) {
  const code = String(raw).replace(/\D/g, '');
  if (code.length !== 12) return toast('e_code', true);
  setState('connecting');
  try {
    const off = await relayRead(topic(code, 'o'));
    if (!off) { setState('idle'); return toast('e_code', true); }
    $('offerIn').value = off; await createAnswer();
    if ($('answerOut').value) await relayPost(topic(code, 'a'), $('answerOut').value);
  } catch (e) { S.err = String(e); setState('failed'); toast('e_relay', true); }
}

/* ===== 6. FILE TRANSFER ===== */
/* Wire format: JSON text frames {type:'meta'|'end'|'cancel'} and raw ArrayBuffer chunks. One file at a time. */
function addFiles(list) {
  for (const f of list) {
    if (f.name.length > MAX_NAME) { toast('e_name', true); continue; }
    S.queue.push({ id: uid(), file: f, status: 'waiting', sent: 0, cancel: false });
  }
  renderQueue();
}
async function sendQueue() {
  if (!ready()) return toast('e_notready', true);
  if (!S.verified) return toast('e_verify', true);
  if (S.sending) return;
  if (!S.queue.some(i => i.status === 'waiting')) return toast('e_empty');
  S.sending = true;
  for (const it of S.queue) { if (it.status === 'waiting') { await sendFile(it); if (!ready()) break; } }
  S.sending = false; setActive(null);
}
const waitAccept = it => new Promise(res => { it.acc = res; setTimeout(() => res(false), 120000); }).finally(() => { it.acc = null; });
const cancelItem = it => { it.cancel = true; if (it.acc) it.acc(false); };
async function sendFile(it) {
  const f = it.file; it.status = 'sending'; it.sent = 0; it.cancel = false; it.declined = false;
  setActive({ dir: 'sent', name: f.name, size: f.size, item: it }); renderQueue();
  try {
    S.dc.send(JSON.stringify({ type: 'meta', id: it.id, name: f.name, size: f.size, mime: f.type || 'application/octet-stream', chunks: Math.ceil(f.size / CH_MIN) }));
    if (!(await waitAccept(it))) throw new Error('declined'); /* receiver must accept before any data is sent */
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
    if (it.declined) { it.status = 'cancelled'; toast('e_declined'); }
    else if (it.cancel) { it.status = 'cancelled'; try { S.dc.send(JSON.stringify({ type: 'cancel', id: it.id })); } catch { /* peer gone */ } }
    else { it.status = 'failed'; S.err = String(e); toast('e_interrupted', true); }
  }
  addHistory(f.name, f.size, 'sent', it.status); renderQueue();
}
function onMessage(e) {
  const d = e.data;
  if (typeof d === 'string') {
    if (d.length > 2000) return rejectMsg();
    let m; try { m = JSON.parse(d); } catch { return rejectMsg(); }
    if (!m || typeof m !== 'object') return rejectMsg();
    if (m.type === 'hello') { if (typeof m.name === 'string' && m.name.length <= 40) { S.peerName = m.name.replace(/[\u0000-\u001f]/g, '').trim(); renderState(); } return; }
    if (typeof m.id !== 'string' || !/^[a-f0-9]{16,32}$/.test(m.id)) return rejectMsg();
    const i = S.incoming, it = S.active && S.active.dir === 'sent' ? S.active.item : null;
    switch (m.type) {
      case 'meta': return onMeta(m);
      case 'end': return i && i.id === m.id ? onEnd(i) : rejectMsg();
      case 'cancel':
        if (i && i.id === m.id) abortIncoming('cancelled');
        else if (S.pending && S.pending.id === m.id) { S.pending = null; renderRequest(); }
        else if (it && it.id === m.id) cancelItem(it);
        return;
      case 'accept': case 'decline':
        if (it && it.id === m.id && it.acc) { it.declined = m.type === 'decline'; it.acc(!it.declined); }
        return;
      default: return rejectMsg();
    }
  }
  const i = S.incoming;
  if (d instanceof ArrayBuffer && i) {
    i.got += d.byteLength;
    if (i.got > i.size) { abortIncoming('failed'); return rejectMsg(); }
    if (i.writer) i.wp = i.wp.then(() => i.writer.write(d)).catch(() => { i.failed = true; });
    else { i.buf.push(d); i.bufN += d.byteLength; if (i.bufN >= 32 * 1024 * 1024) flushParts(i); }
  } else rejectMsg();
}
/* Group raw chunks into Blob segments so the browser can keep big files outside the JS heap. */
function flushParts(i) { if (i.buf.length) { i.parts.push(new Blob(i.buf)); i.buf = []; i.bufN = 0; } }
function rejectMsg() { S.err = 'rejected message'; toast('e_rejected', true); updateDiag(); }
function onMeta(m) {
  if (!S.verified) { sendCtl({ type: 'decline', id: m.id }); return toast('e_verify', true); }
  const okName = typeof m.name === 'string' && m.name.length > 0 && m.name.length <= MAX_NAME;
  const okSize = Number.isInteger(m.size) && m.size >= 0 && m.size <= MAX_SIZE;
  if (S.incoming || S.pending || !okName || !okSize || !Number.isInteger(m.chunks) || m.chunks < 0) { sendCtl({ type: 'decline', id: m.id }); return rejectMsg(); }
  const mime = typeof m.mime === 'string' && m.mime.length <= 100 && /^[\w.+-]+\/[\w.+-]+$/.test(m.mime) ? m.mime : 'application/octet-stream';
  S.pending = { id: m.id, name: cleanName(m.name), size: m.size, mime }; renderRequest(); toast('incoming');
}
function declineFile() {
  const p = S.pending; if (!p) return;
  sendCtl({ type: 'decline', id: p.id }); S.pending = null; renderRequest(); addHistory(p.name, p.size, 'received', 'cancelled');
}
async function acceptFile() {
  const p = S.pending; if (!p) return;
  const i = { ...p, parts: [], buf: [], bufN: 0, got: 0, writer: null, wp: Promise.resolve(), failed: false };
  if (window.showSaveFilePicker) { /* needs this click's user gesture; streams straight to disk so memory is not the limit */
    try { i.writer = await (await showSaveFilePicker({ suggestedName: p.name })).createWritable(); }
    catch (e) { if (e.name === 'AbortError') return declineFile(); /* other errors: fall back to memory */ }
  }
  if (S.pending !== p) { if (i.writer) i.writer.abort().catch(() => {}); return; }
  S.pending = null; S.incoming = i; renderRequest();
  setActive({ dir: 'received', name: i.name, size: i.size, item: i }); sendCtl({ type: 'accept', id: i.id });
}
async function onEnd(i) {
  S.incoming = null; setActive(null);
  try { if (i.writer) { await i.wp; if (!i.failed) await i.writer.close(); } } catch { i.failed = true; }
  if (i.got !== i.size || i.failed) { if (i.writer) i.writer.abort().catch(() => {}); addHistory(i.name, i.size, 'received', 'failed'); return toast('e_interrupted', true); }
  const r = { id: i.id, name: i.name, size: i.size, blob: null };
  if (!i.writer) { flushParts(i); r.blob = new Blob(i.parts, { type: i.mime }); }
  S.received.push(r); addHistory(i.name, i.size, 'received', 'done'); renderReceived();
}
function abortIncoming(status) {
  const i = S.incoming; if (!i) return;
  S.incoming = null; if (i.writer) i.writer.abort().catch(() => {});
  if (S.active && S.active.dir === 'received') setActive(null);
  addHistory(i.name, i.size, 'received', status);
}
function cancelActive() {
  const a = S.active; if (!a) return;
  if (a.dir === 'sent') cancelItem(a.item); else { sendCtl({ type: 'cancel', id: a.item.id }); abortIncoming('cancelled'); }
}
function saveFile(r) {
  const url = URL.createObjectURL(r.blob), a = el('a'); a.href = url; a.download = r.name; document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000); /* free the Object URL after the download starts */
}

/* Minimal QR encoder (byte mode, error correction L, versions 1-6, mask 0), no external library. */
function qrMatrix(text) {
  const T = [[19, 7, 1], [34, 10, 1], [55, 15, 1], [80, 20, 1], [108, 26, 1], [136, 18, 2]]; /* [data codewords, EC per block, blocks] */
  const bytes = Array.from(new TextEncoder().encode(text)), v = T.findIndex(x => x[0] - 2 >= bytes.length);
  if (v < 0) throw new Error('qr too long');
  const [dcw, ecn, nb] = T[v], size = 21 + 4 * v, bits = [];
  const put = (n, len) => { for (let i = len - 1; i >= 0; i--) bits.push((n >> i) & 1); };
  put(4, 4); put(bytes.length, 8); bytes.forEach(b => put(b, 8)); put(0, Math.min(4, dcw * 8 - bits.length));
  while (bits.length % 8) bits.push(0);
  const cw = []; for (let i = 0; i < bits.length; i += 8) cw.push(parseInt(bits.slice(i, i + 8).join(''), 2));
  for (let p = 0xEC; cw.length < dcw; p ^= 0xFD) cw.push(p);
  const exp = [], log = []; for (let i = 0, x = 1; i < 255; i++) { exp[i] = x; log[x] = i; x <<= 1; if (x & 256) x ^= 0x11d; }
  const mul = (a, b) => (a && b ? exp[(log[a] + log[b]) % 255] : 0), div = Array(ecn).fill(0); div[ecn - 1] = 1;
  for (let i = 0, r = 1; i < ecn; i++, r = mul(r, 2)) for (let j = 0; j < ecn; j++) { div[j] = mul(div[j], r); if (j + 1 < ecn) div[j] ^= div[j + 1]; }
  const per = dcw / nb, blocks = [], ecs = [];
  for (let b = 0; b < nb; b++) {
    const d = cw.slice(b * per, (b + 1) * per), res = Array(ecn).fill(0);
    d.forEach(x => { const f = x ^ res.shift(); res.push(0); div.forEach((c, i) => { res[i] ^= mul(c, f); }); });
    blocks.push(d); ecs.push(res);
  }
  const all = []; for (let i = 0; i < per; i++) blocks.forEach(b => all.push(b[i])); for (let i = 0; i < ecn; i++) ecs.forEach(e => all.push(e[i]));
  const grid = () => Array.from({ length: size }, () => Array(size).fill(false)), M = grid(), F = grid();
  const set = (x, y, d) => { M[y][x] = d; F[y][x] = true; };
  for (let i = 0; i < size; i++) { set(6, i, i % 2 === 0); set(i, 6, i % 2 === 0); }
  [[3, 3], [size - 4, 3], [3, size - 4]].forEach(([cx, cy]) => { for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) { const x = cx + dx, y = cy + dy, d = Math.max(Math.abs(dx), Math.abs(dy)); if (x >= 0 && x < size && y >= 0 && y < size) set(x, y, d !== 2 && d !== 4); } });
  if (v > 0) for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) set(size - 7 + dx, size - 7 + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
  let r = 8; for (let i = 0; i < 10; i++) r = (r << 1) ^ ((r >>> 9) * 0x537);
  const fb = ((8 << 10) | r) ^ 0x5412, bit = i => ((fb >>> i) & 1) === 1; /* format bits: level L, mask 0 */
  for (let i = 0; i <= 5; i++) set(8, i, bit(i));
  set(8, 7, bit(6)); set(8, 8, bit(7)); set(7, 8, bit(8));
  for (let i = 9; i < 15; i++) set(14 - i, 8, bit(i));
  for (let i = 0; i < 8; i++) set(size - 1 - i, 8, bit(i));
  for (let i = 8; i < 15; i++) set(8, size - 15 + i, bit(i));
  set(8, size - 8, true);
  let k = 0;
  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5;
    for (let vert = 0; vert < size; vert++) for (let j = 0; j < 2; j++) {
      const x = right - j, y = ((right + 1) & 2) === 0 ? size - 1 - vert : vert;
      if (!F[y][x] && k < all.length * 8) { M[y][x] = ((all[k >> 3] >>> (7 - (k & 7))) & 1) === 1; k++; }
    }
  }
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) if (!F[y][x] && (x + y) % 2 === 0) M[y][x] = !M[y][x];
  return M;
}
function drawQR(text) {
  const m = qrMatrix(text), sc = 6, q = 4, c = $('qr'); c.width = c.height = (m.length + q * 2) * sc;
  const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.fillStyle = '#000';
  m.forEach((row, y) => row.forEach((on, x) => { if (on) g.fillRect((x + q) * sc, (y + q) * sc, sc, sc); }));
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
  $('vOk').addEventListener('click', () => { if (!/^\d{6}$/.test($('sas').textContent)) return toast('e_secure', true); S.verified = true; $('verify').hidden = true; toast('v_done'); });
  $('vNo').addEventListener('click', () => { closePeer(); setState('disconnected'); resetPeerUI(); });
  $('rAccept').addEventListener('click', acceptFile); $('rDecline').addEventListener('click', declineFile);
  [['turnUrl', 'ls_turn_url'], ['turnUser', 'ls_turn_user'], ['turnPass', 'ls_turn_pass']].forEach(([id, k]) => { $(id).value = store(k, ''); $(id).addEventListener('input', e => save(k, e.target.value)); });
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && S.active) holdScreen(true); });
  $('joinBtn').addEventListener('click', () => joinCode($('codeIn').value));
  applyLang();
  const j = location.hash.match(/join=(\d{12})/); /* opened from a scanned QR */
  if (j) { setMode('recv'); $('codeIn').value = j[1]; history.replaceState(null, '', location.pathname); $('connect').scrollIntoView(); joinCode(j[1]); }
}
init();
