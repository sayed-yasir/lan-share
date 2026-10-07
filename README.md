# LAN SHARE

Private file sharing between your devices. Pure HTML + CSS + vanilla JavaScript, no backend, deployable to GitHub Pages.

**This project uses WebRTC for peer-to-peer data transfer.**
**Without a signaling server, connection setup requires manual offer/answer exchange.**

## Features
- Real WebRTC `RTCDataChannel` transfer, files never touch a server
- Single/multiple files, drag & drop, file picker, queue with cancel / retry / remove
- 64–128 KB chunks with `bufferedAmount` backpressure, progress, speed and ETA
- Metadata validation, filename sanitizing, 2 GB limit, 180-char name limit
- Local history (names, sizes, dates only), dark/light theme, English + Dari (RTL)
- Developer Diagnostics panel (hidden by default)

## Architecture
`index.html` (structure) · `style.css` (design) · `app.js` (State, i18n, UI, WebRTC, Signaling, File Transfer, History, Settings, Utilities).

## How the connection works
1. Sender: *Send Files* → **Create connection** → copy the **Offer**.
2. Receiver: *Receive Files* → paste Offer → **Create answer** → copy the **Answer**.
3. Sender: paste Answer → **Connect**. Status turns *Connected*.
ICE candidates are gathered before the Offer/Answer is shown (non-trickle), so one copy/paste each way is enough.

## Deploy to GitHub Pages
Push the folder to a repository, then Settings → Pages → deploy from the main branch root. No build step. WebRTC needs HTTPS (GitHub Pages provides it) or `localhost`.

## Browser requirements
A current Chrome, Edge, Firefox or Safari with WebRTC, Blob and File APIs.

## Known limitations
- Manual signaling: users must copy/paste Offer and Answer.
- QR code is **not** implemented: the data is too large for a reliable library-free QR.
- No TURN relay: strict NATs/firewalls may block connections across networks (optional public STUN is off by default).
- Received data is kept in memory until saved, hence the 2 GB limit; real limits depend on device and browser.
- Pause/resume is not implemented and not shown. Interrupted transfers must be retried from the start.
- One file is transferred at a time.
- Not yet verified in real browsers by the author of this build (see Testing).

## Security notes
Data channels are DTLS-encrypted. Incoming messages and metadata are validated, unexpected types are rejected, names are sanitized, nothing is executed, and UI text uses `textContent`. Share Offer/Answer only with people you trust. No system is "100% secure".

## Testing
Only a JavaScript syntax check was run in the build environment. The checklist (1 KB / 1 MB / 10 MB / 100 MB transfers, RTL, mobile layouts, cancel, disconnect) still has to be performed on real devices.

## Roadmap
Streaming saves to disk (File System Access API), pause/resume, real QR generation, TURN configuration.

Built by SAYED YASIR · https://github.com/sayed-yasir
