# LAN SHARE 1.2 — Visual Edition

A local-network file transfer app with a premium glass / neon interface inspired by modern futuristic product landing pages.

## What is included
- Local transfer over the same Wi-Fi/LAN
- 6-digit PIN protected sessions
- Real QR connection code
- Up to 3 concurrent uploads
- Live upload progress and speed
- 10 GB per-file limit by default
- 20 GB total app storage limit by default
- HTTP Range downloads for large files
- Path-safe filenames and protected static serving
- Storage usage indicator
- Mobile-first responsive UI
- No cloud upload and no fake statistics

## Run
```bash
python -m pip install -r requirements.txt
python app.py
```

Open the printed LAN address on another device connected to the same Wi-Fi. The terminal prints the generated PIN.

Environment options:
- `LAN_SHARE_PORT=8000`
- `LAN_SHARE_PIN=123456`
- `LAN_SHARE_MAX_FILE_GB=10`
- `LAN_SHARE_MAX_TOTAL_GB=20`

## Scope
This release is **LAN-only**. Internet/remote transfer is not claimed or included. A future remote release would require a real WebRTC/signaling design and appropriate relay infrastructure where needed.
