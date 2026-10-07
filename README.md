# LAN SHARE 2.1 — Visual Edition

A private file-transfer web app built with **HTML/CSS/JavaScript + Python**.

## Run locally

```bash
python app.py
```

Open the printed LAN URL on another device on the same network and enter the 6-digit PIN.

## Render

Build command:

```bash
pip install -r requirements.txt
```

Start command:

```bash
python app.py
```

The server binds to `0.0.0.0` and reads the `PORT` environment variable when provided through `LAN_SHARE_PORT`.

## Environment variables

- `LAN_SHARE_PORT` — default `8000`
- `LAN_SHARE_PIN` — optional fixed 6-digit PIN; otherwise a random PIN is generated at startup
- `LAN_SHARE_MAX_FILE_GB` — default `10`
- `LAN_SHARE_MAX_TOTAL_GB` — default `20`

## Important

This version is **LAN-first**. A public Render URL can host the interface/API, but it does not magically create direct internet-to-internet P2P transfer. Remote P2P requires a separate WebRTC signaling/TURN architecture.
