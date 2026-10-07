# YASIR SHARE
Local phone ↔ computer file transfer in the browser. Files go **directly** between the two devices over a WebRTC DataChannel. The Node server only creates temporary sessions and relays WebRTC signaling (never file bytes).

## Requirements
Node.js 18+, both devices on the same Wi-Fi/LAN.

## Install and run
```
npm install
npm start
```
Optional settings (PowerShell): `$env:PORT=3000; $env:SESSION_TIMEOUT_MS=600000; npm start` (see `.env.example`). `npm run dev` restarts on changes.

## Connect a phone
Open `http://localhost:3000` on the computer → **Create Session**, then on the phone use one of:
- **QR**: scan the code (it contains the temporary link).
- **Pairing code**: open the computer's LAN address shown in the server console, type the 8-character code, tap *Join with code*.
- **Link**: *Copy Connection Link* / *Share Link* and open it on the phone.
The computer must click **Accept** for the new device. Max 2 devices per session.

## Send files
Either side: Select Files / Select Folder / drag & drop, plus Send Text and Send Link. The receiver accepts or rejects each file, then taps *Download* (or enable auto-download in Settings).

## Security (honest summary)
Session ID/token/code come from Node `crypto`. Unpaired sessions expire (default 10 min). Device approval is required. Signaling messages are validated and size-limited; joins are rate limited. Filenames are sanitized and rendered with `textContent`. Only http/https links are accepted. WebRTC DataChannels are encrypted (DTLS), but this LAN version uses plain HTTP/WS for signaling, so use it only on networks you trust.

## What the server stores
Only in-memory temporary sessions. No files, no history. History lives in your browser's localStorage (metadata only).

## Limitations
- LAN only. Browsers cannot discover other devices on the network, so there is no auto-discovery.
- Browsers cannot silently save to an arbitrary folder or keep transfers running after the page closes.
- Clipboard buttons need a secure context (HTTPS/localhost); on plain-HTTP LAN the copy button uses a fallback that may not work.
- Received files are assembled in memory (Blob), so very large files on phones may fail.
- Received files are held in memory until finished (the File System Access API needs HTTPS, which the LAN version does not use).

## Windows Firewall
On first start Windows may ask about Node.js: allow it on **Private networks**. Do not disable the firewall.

## Troubleshooting
Phone can't open the link → same Wi-Fi? guest-network/"client isolation" on the router blocks it; check the firewall prompt. Stuck on "Negotiating" → same cause, or a VPN.

## Future internet mode (not implemented)
Needs HTTPS + WSS, authentication, a TURN server, stronger session management and rate limiting.

## Testing in Termux (Android)
```
pkg update && pkg install nodejs
cd YASIR-SHARE      # unzip first: pkg install unzip && unzip YASIR-SHARE.zip
sh termux-start.sh
```
- Termux may block reading network interfaces. The script tries `ip`/`ifconfig`; if it fails, run `LAN_IP=192.168.x.x sh termux-start.sh` (your phone's Wi-Fi IP).
- Open `http://localhost:3000` in the phone browser as the "computer", then join from another device with the QR/link/code on the same Wi-Fi (or a hotspot).
- Same-phone test: open a second tab at `http://localhost:3000`, enter the 8-character code. Some Android browsers hide local ICE addresses (mDNS), so a real second device is the more reliable test.
- Keep Termux awake: `termux-wake-lock`.

## V2 changes
- ICE candidate queue, automatic reconnect (ICE restart, 1/2/4/8 s backoff, then stops), explicit connection states.
- Several transfers at once (setting, default 2 on computer, 1 on phone), Retry for failed sends, ETA and smoothed speed, session countdown.
- Full settings (general, connection, transfer, security, appearance, privacy, about), light/dark/system theme, sound, optional browser notifications, history search/filter.
- Fixed a V1 bug where the "animations off" setting had no effect.
- Not in V2: language switching (English only), bottom navigation / separate mobile dashboard, inactivity auto-disconnect, more than 2 devices per session.
- Not tested in a real browser or on two devices yet.

## Put it online (internet mode)
This app needs a Node.js server with WebSocket, so static hosts (GitHub Pages, Netlify static, Vercel) will not work.
1. **Quick, from your own PC/Termux:** run `npm start`, then in another window `cloudflared tunnel --url http://localhost:3000` (or `ngrok http 3000`). Open the https link it prints on both devices.
2. **Permanent:** deploy to a Node host with WebSocket support (Render, Railway, Fly.io, or a VPS behind Caddy/Nginx with HTTPS). Build: `npm install`, start: `npm start`, and set `TRUST_PROXY=1` so rate limits use the real client IP. Optional: `PUBLIC_URL=https://your-domain`.
3. The app now always uses a public STUN server (Google) to find a path; set `ICE_SERVERS=[]` for pure-LAN use with no STUN. Strict NATs (many mobile networks) also need a TURN server: set `ICE_SERVERS='[{"urls":"stun:..."},{"urls":"turn:...","username":"...","credential":"..."}]'`. Through TURN, traffic is relayed (still DTLS-encrypted).
Anyone with the URL can create sessions; sessions are temporary, random and rate-limited, but this is not a hardened public service.

## Python server (alternative to Node)
`server.py` speaks the same protocol as `server.js`, so `public/` is unchanged (the browser side must stay JavaScript: WebRTC only exists there).
```
pip install -r requirements.txt
python server.py
```
Same environment variables. Termux: `sh termux-start-py.sh`. Not tested yet: aiohttp/segno could not be installed in the build environment.

## Devices cannot connect (stuck on Reconnecting / Failed)
The tunnel or server only carries signaling; the files need a direct WebRTC path. On different networks (mobile data, CGNAT) STUN is often not enough and you need a TURN server (`ICE_SERVERS`). Test first with both devices on the same Wi-Fi. The app shows which candidate types it found (host/srflx/relay).

## Pairing code and scanner
The pairing code is now 8 random characters (letters/digits without look-alikes, about 40 bits) instead of 6 digits. Failed code attempts are limited per IP (6/min) and globally (30/min). Session links use a separate 128-bit token.
The in-app **Scan QR** button uses the browser's BarcodeDetector and camera, which needs HTTPS (the tunnel link works, plain http://LAN-IP does not) and Chrome on Android. Otherwise use the phone's camera app or type the code.
