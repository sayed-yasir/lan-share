import json
import os
import secrets
import shutil
import socket
import threading
import time
import uuid
from http.server import ThreadingHTTPServer, BaseHTTPRequestHandler
from urllib.parse import quote, unquote, urlparse

try:
    import qrcode
    import qrcode.image.svg
except ImportError:
    qrcode = None

BASE = os.path.dirname(os.path.abspath(__file__))
STATIC = os.path.join(BASE, "static")
UPLOADS = os.path.join(BASE, "uploads")
os.makedirs(UPLOADS, exist_ok=True)

MAX_FILE = int(os.getenv("LAN_SHARE_MAX_FILE_GB", "10")) * 1024**3
MAX_TOTAL = int(os.getenv("LAN_SHARE_MAX_TOTAL_GB", "20")) * 1024**3
PORT = int(os.getenv("LAN_SHARE_PORT", "8000"))
PIN = os.getenv("LAN_SHARE_PIN", "") or f"{secrets.randbelow(1_000_000):06d}"

# Reservations stop concurrent uploads from exceeding the total storage limit.
RESERVE_LOCK = threading.Lock()
RESERVED_BYTES = 0
SESSIONS = {}
SESSION_LOCK = threading.Lock()
SESSION_TTL = 12 * 60 * 60


def local_ip():
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(("192.0.2.1", 80))
        return s.getsockname()[0]
    except Exception:
        return "127.0.0.1"
    finally:
        s.close()


def safe_name(name):
    name = os.path.basename(unquote(str(name))).strip()
    name = "".join(c for c in name if c >= " " and c not in '<>:"/\\|?*')
    return name[:180] or "file.bin"


def total_size():
    total = 0
    try:
        for entry in os.scandir(UPLOADS):
            if entry.is_file(follow_symlinks=False):
                try:
                    total += entry.stat().st_size
                except OSError:
                    pass
    except OSError:
        pass
    return total


def cleanup_sessions():
    now = time.time()
    with SESSION_LOCK:
        for token, expires in list(SESSIONS.items()):
            if expires <= now:
                SESSIONS.pop(token, None)


def new_session():
    cleanup_sessions()
    token = secrets.token_urlsafe(32)
    with SESSION_LOCK:
        SESSIONS[token] = time.time() + SESSION_TTL
    return token


def session_valid(token):
    if not token:
        return False
    with SESSION_LOCK:
        expires = SESSIONS.get(token)
        if not expires:
            return False
        if expires <= time.time():
            SESSIONS.pop(token, None)
            return False
        SESSIONS[token] = time.time() + SESSION_TTL
        return True


def cookie_value(header, key):
    if not header:
        return ""
    for item in header.split(";"):
        k, _, v = item.strip().partition("=")
        if k == key:
            return v
    return ""


def auth(handler):
    supplied = handler.headers.get("X-Session-PIN", "")
    if supplied and secrets.compare_digest(supplied, PIN):
        return True
    return session_valid(cookie_value(handler.headers.get("Cookie", ""), "lan_share_session"))


def reserve_space(length):
    global RESERVED_BYTES
    with RESERVE_LOCK:
        current = total_size()
        free_reserved = MAX_TOTAL - current - RESERVED_BYTES
        if length > free_reserved:
            return False
        if length > shutil.disk_usage(UPLOADS).free:
            return False
        RESERVED_BYTES += length
        return True


def release_space(length):
    global RESERVED_BYTES
    with RESERVE_LOCK:
        RESERVED_BYTES = max(0, RESERVED_BYTES - length)


class Handler(BaseHTTPRequestHandler):
    server_version = "LAN-SHARE/1.2"

    def log_message(self, fmt, *args):
        pass

    def security_headers(self):
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("X-Frame-Options", "DENY")
        self.send_header("Referrer-Policy", "no-referrer")
        self.send_header("Permissions-Policy", "camera=(), microphone=(), geolocation=()")

    def send_json(self, data, status=200):
        raw = json.dumps(data, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(raw)))
        self.send_header("Cache-Control", "no-store")
        self.security_headers()
        self.end_headers()
        self.wfile.write(raw)

    def reject_auth(self):
        self.send_json({"ok": False, "error": "PIN_REQUIRED"}, 401)

    def do_POST(self):
        global RESERVED_BYTES
        path = urlparse(self.path).path

        if path == "/api/session":
            length = int(self.headers.get("Content-Length", "0") or 0)
            if length > 4096:
                self.send_json({"ok": False, "error": "BAD_REQUEST"}, 400)
                return
            try:
                body = json.loads(self.rfile.read(length) or b"{}")
            except Exception:
                self.send_json({"ok": False, "error": "BAD_REQUEST"}, 400)
                return
            supplied = str(body.get("pin", ""))
            if not (len(supplied) == 6 and supplied.isdigit() and secrets.compare_digest(supplied, PIN)):
                self.send_json({"ok": False, "error": "INVALID_PIN"}, 401)
                return
            token = new_session()
            self.send_response(200)
            raw = json.dumps({"ok": True, "version": "1.2"}).encode()
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(raw)))
            self.send_header("Set-Cookie", f"lan_share_session={token}; Max-Age={SESSION_TTL}; Path=/; HttpOnly; SameSite=Strict")
            self.send_header("Cache-Control", "no-store")
            self.security_headers()
            self.end_headers()
            self.wfile.write(raw)
            return

        if path != "/api/upload":
            self.send_error(404)
            return
        if not auth(self):
            return self.reject_auth()

        try:
            length = int(self.headers.get("Content-Length", "0"))
        except ValueError:
            length = 0
        if length <= 0 or length > MAX_FILE:
            self.send_json({"ok": False, "error": "FILE_TOO_LARGE", "maxBytes": MAX_FILE}, 413)
            return
        if not reserve_space(length):
            self.send_json({"ok": False, "error": "STORAGE_LIMIT", "maxBytes": MAX_TOTAL}, 507)
            return

        reserved = length
        name = safe_name(self.headers.get("X-Filename", "file.bin"))
        stem, ext = os.path.splitext(name)
        final_name = name
        while os.path.exists(os.path.join(UPLOADS, final_name)):
            final_name = f"{stem}_{uuid.uuid4().hex[:6]}{ext}"
        path = os.path.join(UPLOADS, final_name)
        written = 0
        try:
            with open(path, "xb") as f:
                remaining = length
                while remaining:
                    chunk = self.rfile.read(min(1024 * 1024, remaining))
                    if not chunk:
                        break
                    f.write(chunk)
                    written += len(chunk)
                    remaining -= len(chunk)
            if written != length:
                try:
                    os.remove(path)
                except OSError:
                    pass
                self.send_json({"ok": False, "error": "INCOMPLETE_UPLOAD"}, 400)
                return
        except OSError as exc:
            try:
                os.remove(path)
            except OSError:
                pass
            self.send_json({"ok": False, "error": "WRITE_FAILED", "detail": str(exc)}, 507)
            return
        finally:
            release_space(reserved)

        self.send_json({"ok": True, "name": final_name, "size": written})

    def do_GET(self):
        parsed = urlparse(self.path)
        path = parsed.path

        if path == "/api/info":
            self.send_json({"ip": local_ip(), "port": self.server.server_port, "version": "1.2"})
            return

        if path == "/api/health":
            self.send_json({"ok": True, "version": "1.2", "uptimeReady": True})
            return

        if path == "/api/storage":
            if not auth(self):
                return self.reject_auth()
            used = total_size()
            free = shutil.disk_usage(UPLOADS).free
            with RESERVE_LOCK:
                reserved = RESERVED_BYTES
            self.send_json({"used": used, "max": MAX_TOTAL, "freeDisk": free, "reserved": reserved, "count": sum(1 for e in os.scandir(UPLOADS) if e.is_file(follow_symlinks=False))})
            return

        if path == "/api/qr":
            if qrcode is None:
                self.send_json({"ok": False, "error": "QR_DEPENDENCY_MISSING"}, 503)
                return
            target = f"http://{local_ip()}:{self.server.server_port}/#pin={PIN}"
            img = qrcode.make(target, image_factory=qrcode.image.svg.SvgPathImage)
            raw = img.to_string(encoding="utf-8")
            if isinstance(raw, str):
                raw = raw.encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "image/svg+xml; charset=utf-8")
            self.send_header("Content-Length", str(len(raw)))
            self.send_header("Cache-Control", "no-store")
            self.security_headers()
            self.end_headers()
            self.wfile.write(raw)
            return

        if path == "/api/files":
            if not auth(self):
                return self.reject_auth()
            files = []
            try:
                entries = os.scandir(UPLOADS)
                for entry in entries:
                    if entry.is_file(follow_symlinks=False):
                        try:
                            st = entry.stat()
                        except OSError:
                            continue
                        files.append({"name": entry.name, "size": st.st_size, "mtime": st.st_mtime, "url": "/download/" + quote(entry.name)})
            except OSError:
                pass
            files.sort(key=lambda x: x["mtime"], reverse=True)
            self.send_json(files)
            return

        if path.startswith("/download/"):
            if not auth(self):
                return self.reject_auth()
            name = safe_name(path[len("/download/"):])
            root = os.path.realpath(UPLOADS)
            p = os.path.realpath(os.path.join(root, name))
            if not p.startswith(root + os.sep) or not os.path.isfile(p):
                self.send_error(404)
                return
            size = os.path.getsize(p)
            start, end = 0, size - 1
            range_header = self.headers.get("Range", "")
            if range_header.startswith("bytes="):
                try:
                    spec = range_header[6:].split(",", 1)[0]
                    a, b = spec.split("-", 1)
                    if a:
                        start = int(a)
                        end = int(b) if b else size - 1
                    else:
                        start = max(0, size - int(b))
                    if start > end or start >= size:
                        raise ValueError
                    end = min(end, size - 1)
                except Exception:
                    self.send_response(416)
                    self.send_header("Content-Range", f"bytes */{size}")
                    self.end_headers()
                    return
            length = end - start + 1
            status = 206 if range_header else 200
            self.send_response(status)
            self.send_header("Content-Type", "application/octet-stream")
            self.send_header("Content-Disposition", f"attachment; filename=\"download\"; filename*=UTF-8''{quote(name)}")
            self.send_header("Content-Length", str(length))
            self.send_header("Accept-Ranges", "bytes")
            if status == 206:
                self.send_header("Content-Range", f"bytes {start}-{end}/{size}")
            self.send_header("Cache-Control", "no-store")
            self.security_headers()
            self.end_headers()
            try:
                with open(p, "rb") as f:
                    f.seek(start)
                    remaining = length
                    while remaining:
                        chunk = f.read(min(1024 * 1024, remaining))
                        if not chunk:
                            break
                        self.wfile.write(chunk)
                        remaining -= len(chunk)
            except (BrokenPipeError, ConnectionResetError):
                pass
            return

        if path in ("", "/", "/static/index.html"):
            file_path = os.path.join(STATIC, "index.html")
        else:
            self.send_error(404)
            return
        try:
            with open(file_path, "rb") as f:
                raw = f.read()
        except OSError:
            self.send_error(404)
            return
        self.send_response(200)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("Content-Length", str(len(raw)))
        self.send_header("Cache-Control", "no-store")
        self.security_headers()
        self.send_header("Content-Security-Policy", "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'")
        self.end_headers()
        self.wfile.write(raw)

    def do_DELETE(self):
        path = urlparse(self.path).path
        if not path.startswith("/api/files/"):
            self.send_error(404)
            return
        if not auth(self):
            return self.reject_auth()
        name = safe_name(path[len("/api/files/"):])
        root = os.path.realpath(UPLOADS)
        p = os.path.realpath(os.path.join(root, name))
        if not p.startswith(root + os.sep) or not os.path.isfile(p):
            self.send_error(404)
            return
        try:
            os.remove(p)
        except OSError:
            self.send_json({"ok": False, "error": "DELETE_FAILED"}, 500)
            return
        self.send_json({"ok": True})


class Server(ThreadingHTTPServer):
    daemon_threads = True
    allow_reuse_address = True


if __name__ == "__main__":
    print("\nLAN SHARE — v1.2")
    print("=" * 40)
    print(f"Computer: http://localhost:{PORT}")
    print(f"Mobile:   http://{local_ip()}:{PORT}")
    print(f"Pairing PIN: {PIN}")
    print(f"Per-file limit: {MAX_FILE / 1024**3:g} GB")
    print(f"Total storage limit: {MAX_TOTAL / 1024**3:g} GB")
    print("Range downloads: enabled")
    print("Both devices must be connected to the same Wi-Fi.")
    print("Press Ctrl+C to stop.\n")
    Server(("0.0.0.0", PORT), Handler).serve_forever()
