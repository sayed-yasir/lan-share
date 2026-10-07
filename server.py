"""YASIR SHARE - Python signaling server (same protocol as server.js). Serves ./public and relays WebRTC signaling only."""
import asyncio, json, os, re, secrets, socket, time
from pathlib import Path
from aiohttp import web, WSMsgType
import segno

PORT = int(os.getenv('PORT', 3000)); HOST = os.getenv('HOST', '0.0.0.0')
TIMEOUT = int(os.getenv('SESSION_TIMEOUT_MS', 600000)); MAX_FILE = int(os.getenv('MAX_FILE_SIZE_BYTES', 5368709120))
PUBLIC = Path(__file__).parent / 'public'
sessions, failed = {}, {}
CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'  # 32 symbols, 8 chars = 40 bits
gfail = [0, 0.0]
LOCAL = re.compile(r'^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|\[?::1)')
log = lambda *a: print(time.strftime('%H:%M:%S'), *a, flush=True)

def lan_ip():
    if os.getenv('LAN_IP'): return os.environ['LAN_IP']
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM); s.connect(('10.255.255.255', 1)); ip = s.getsockname()[0]; s.close(); return ip
    except Exception: return 'localhost'

class Peer:
    def __init__(self, ws, ip): self.ws, self.ip, self.session, self.role, self.n, self.t = ws, ip, None, None, 0, time.time()
    async def send(self, o):
        if not self.ws.closed:
            try: await self.ws.send_str(json.dumps(o))
            except Exception: pass

async def end_session(s, reason):
    if sessions.pop(s['id'], None) is None: return
    for p in (s['host'], s['guest'], s['pending']):
        if p: await p.send({'type': 'session-ended', 'reason': reason}); p.session = None
    log('Session ended', s['id'], reason)

async def config(req):
    host = re.sub(r':\d+$', '', req.headers.get('Host', ''))
    try: ice = json.loads(os.environ['ICE_SERVERS']) if os.getenv('ICE_SERVERS') else [{'urls': 'stun:stun.l.google.com:19302'}]
    except Exception: ice = []
    return web.json_response({'maxFileSize': MAX_FILE, 'iceServers': ice})

async def ws_handler(req):
    ws = web.WebSocketResponse(max_msg_size=65536); await ws.prepare(req)
    ip = (os.getenv('TRUST_PROXY') and req.headers.get('X-Forwarded-For', '').split(',')[0].strip()) or req.remote
    me = Peer(ws, ip)
    async for msg in ws:
        if msg.type != WSMsgType.TEXT: continue
        now = time.time()
        if now - me.t > 1: me.t, me.n = now, 0
        me.n += 1
        if me.n > 40: await ws.close(); break
        try: m = json.loads(msg.data)
        except Exception: await me.send({'type': 'error', 'msg': 'Malformed message.'}); continue
        if not isinstance(m, dict) or not isinstance(m.get('type'), str): await me.send({'type': 'error', 'msg': 'Malformed message.'}); continue
        try: await handle(me, m)
        except Exception as e: log('handle error', e); await me.send({'type': 'error', 'msg': 'Server error.'})
    s = me.session
    if s:
        log('WebSocket disconnected', s['id'], me.role)
        if me.role == 'host': await end_session(s, 'The computer disconnected.')
        else:
            if s['guest'] is me: s['guest'] = None
            if s['pending'] is me: s['pending'] = None
            await s['host'].send({'type': 'peer-left'})
    return ws

async def handle(me, m):
    t, s = m['type'], me.session
    if t == 'create' and not s:
        while True:
            code = ''.join(secrets.choice(CODE_CHARS) for _ in range(8))
            if not any(x['code'] == code for x in sessions.values()): break
        c = time.time() * 1000
        try: to = min(max(int(m.get('timeoutMs')), 60000), 1800000)
        except Exception: to = TIMEOUT
        ns = dict(id=secrets.token_hex(8), token=secrets.token_urlsafe(16), code=code, expires=c + to, host=me, guest=None, pending=None)
        sessions[ns['id']] = ns; me.session, me.role = ns, 'host'
        base = f'http://{lan_ip()}:{PORT}'
        o = m.get('origin')
        if isinstance(o, str) and re.match(r'^https?://[^/]+$', o) and not LOCAL.match(re.sub(r'^https?://', '', o)): base = o
        if os.getenv('PUBLIC_URL'): base = os.environ['PUBLIC_URL'].rstrip('/')
        url = f"{base}/?session={ns['token']}"
        qr = segno.make(url, error='m').svg_data_uri(scale=6, border=2)
        await me.send({'type': 'created', 'url': url, 'code': code, 'qr': qr, 'expires': ns['expires']}); log('Session created', ns['id'])
    elif t == 'join' and not s:
        f = failed.get(me.ip)
        if f and time.time() < f[1] and f[0] >= 6: return await me.send({'type': 'error', 'msg': 'Too many attempts. Wait a minute.'})
        code8 = re.sub(r'[^A-Z0-9]', '', str(m.get('code') or '').upper()); by_code = bool(re.fullmatch(r'[A-Z2-9]{8}', code8))
        if by_code and gfail[0] >= 30 and time.time() < gfail[1]: return await me.send({'type': 'error', 'msg': 'Too many attempts. Wait a minute.'})
        found = None
        tok = m.get('token') if isinstance(m.get('token'), str) else None
        for x in sessions.values():
            # compare_digest raises ValueError on length mismatch — check first
            if tok is not None and len(tok) == len(x['token']) and secrets.compare_digest(x['token'].encode(), tok.encode()): found = x
            elif by_code and len(code8) == len(x['code']) and secrets.compare_digest(x['code'].encode(), code8.encode()): found = x
        if not found:
            if by_code:
                if time.time() > gfail[1]: gfail[0], gfail[1] = 0, time.time() + 60
                gfail[0] += 1
            r = failed.get(me.ip); failed[me.ip] = (1, time.time() + 60) if not r or time.time() > r[1] else (r[0] + 1, r[1])
            return await me.send({'type': 'error', 'msg': 'Invalid or expired session.'})
        if found['guest'] or found['pending']: return await me.send({'type': 'error', 'msg': 'This session already has two connected devices.'})
        found['pending'], me.session, me.role = me, found, 'guest'
        ua = str(m.get('ua') or '')[:200]
        await me.send({'type': 'waiting-approval'})
        await found['host'].send({'type': 'join-request', 'name': str(m.get('name') or 'Device')[:40], 'device': 'Phone' if re.search(r'Mobi|Android|iPhone|iPad', ua) else 'Computer', 'ua': ua[:60], 'method': 'QR / link' if m.get('token') else 'Pairing code'})
        log('Device joined (pending)', found['id'])
    elif t in ('approve', 'reject') and s and me.role == 'host' and s['pending']:
        g, s['pending'] = s['pending'], None
        if t == 'approve': s['guest'] = g; await g.send({'type': 'approved'}); await me.send({'type': 'ready'}); log('Device approved', s['id'])
        else: await g.send({'type': 'rejected'}); g.session = None; await g.ws.close(); log('Device rejected', s['id'])
    elif t in ('offer', 'answer', 'candidate') and s and s['guest'] and me in (s['host'], s['guest']):
        to = s['guest'] if me is s['host'] else s['host']
        if t == 'candidate':
            c = m.get('candidate')
            if c is not None and not isinstance(c, dict): return await me.send({'type': 'error', 'msg': 'Malformed message.'})
            await to.send({'type': 'candidate', 'candidate': c})
        else:
            if not isinstance(m.get('sdp'), str) or len(m['sdp']) > 30000: return await me.send({'type': 'error', 'msg': 'Malformed message.'})
            await to.send({'type': t, 'sdp': m['sdp']})
    elif t == 'end' and s and me.role == 'host': await end_session(s, 'The computer ended the session.')
    elif t not in ('create', 'join', 'approve', 'reject', 'offer', 'answer', 'candidate', 'end'): await me.send({'type': 'error', 'msg': 'Unknown message type.'})

async def reaper(app):
    async def loop():
        while True:
            await asyncio.sleep(5)
            now = time.time()
            for s in list(sessions.values()):
                if not s['guest'] and now * 1000 > s['expires']: await end_session(s, 'Session expired.')
            # prune expired rate-limit entries
            for ip in [k for k, v in failed.items() if now > v[1]]: failed.pop(ip, None)
            if now > gfail[1]: gfail[0], gfail[1] = 0, 0.0
    t = asyncio.create_task(loop()); yield; t.cancel()

async def index(req): return web.FileResponse(PUBLIC / 'index.html')

@web.middleware
async def headers(req, handler):
    r = await handler(req); r.headers['X-Content-Type-Options'] = 'nosniff'; r.headers['Referrer-Policy'] = 'no-referrer'; return r

app = web.Application(middlewares=[headers]); app.cleanup_ctx.append(reaper)
app.router.add_get('/api/config', config); app.router.add_get('/', index)
app.router.add_get('/ws', ws_handler); app.router.add_static('/', PUBLIC)
if __name__ == '__main__':
    log(f'YASIR SHARE (Python) on http://localhost:{PORT}/  LAN: http://{lan_ip()}:{PORT}/')
    web.run_app(app, host=HOST, port=PORT, print=None)
