# LAN SHARE

Private file sharing between your devices. Pure HTML + CSS + vanilla JavaScript, no backend, deployable to GitHub Pages.

**This project uses WebRTC for peer-to-peer data transfer.**
**Without a signaling server, connection setup requires manual offer/answer exchange.**

## Features
- Real WebRTC `RTCDataChannel` transfer, files never touch a server
- Single/multiple files, drag & drop, file picker, queue with cancel / retry / remove
- 64–128 KB chunks with `bufferedAmount` backpressure, progress, speed and ETA
- Metadata validation, filename sanitizing, 180-char name limit, no app-imposed size limit
- Local history (names, sizes, dates only), dark/light theme, English + Dari (RTL)
- Developer Diagnostics panel (hidden by default)

## Architecture
`index.html` (structure) · `style.css` (design) · `app.js` (State, i18n, UI, WebRTC, Signaling, File Transfer, History, Settings, Utilities).

## How the connection works
**Quick connect:** sender clicks *Create connection* and gets a random single-use 12-digit code plus a QR. The receiver types the code (or scans the QR), and the devices connect automatically.

**Manual connection (fallback, no relay):**
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
- Quick connect (12-digit code / QR) passes the small Offer/Answer through the free public relay ntfy.sh; files never touch it. The relay is a third-party dependency, and manual connection works without it.
- No TURN relay: strict NATs/firewalls may block connections across networks (public STUN is on by default; it sees IP addresses but never files).
- No app-imposed size limit. Desktop Chrome/Edge stream received files straight to disk (File System Access API). Other browsers (including iOS and most Android) keep data in memory (32 MB Blob segments) until saved, so very large files depend on device memory.
- Backgrounding the tab or locking a phone can still interrupt a transfer; a screen wake lock is requested where supported. Interrupted transfers restart from zero.
- TURN is optional and user-supplied; without it some networks cannot connect.
- Pause/resume is not implemented and not shown. Interrupted transfers must be retried from the start.
- One file is transferred at a time.
- Not yet verified in real browsers by the author of this build (see Testing).

## Security notes
After connecting, both devices show a 6-digit verification code (hash of both DTLS fingerprints). Confirm it matches on both screens before sending; sending and receiving stay blocked until you do, which exposes a stranger who answered a leaked code. The receiver must also accept every incoming file, and the sender sends no data before that. The ntfy.sh relay can see the connection data (including IP addresses), not the files.

Data channels are DTLS-encrypted. Incoming messages and metadata are validated, unexpected types are rejected, names are sanitized, nothing is executed, and UI text uses `textContent`. Share Offer/Answer only with people you trust. No system is "100% secure".

## Testing
Only a JavaScript syntax check and an offline QR decode test (if reported) were run; the ntfy.sh relay flow has not been tested over a real network. Only a JavaScript syntax check was run in the build environment. The checklist (1 KB / 1 MB / 10 MB / 100 MB transfers, RTL, mobile layouts, cancel, disconnect) still has to be performed on real devices.

## Roadmap
Streaming saves to disk (File System Access API), pause/resume, real QR generation, TURN configuration.

Built by SAYED YASIR · https://github.com/sayed-yasir
