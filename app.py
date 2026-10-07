import os, socket, uuid, json, html
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from urllib.parse import unquote

BASE = os.path.dirname(os.path.abspath(__file__))
STATIC = os.path.join(BASE, "static")
UPLOADS = os.path.join(BASE, "uploads")
os.makedirs(UPLOADS, exist_ok=True)

MAX_FILE = 10 * 1024 * 1024 * 1024  # 10 GB

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
    name = os.path.basename(unquote(name)).strip()
    name = "".join(c for c in name if c >= " " and c not in '<>:"/\\|?*')
    return name[:180] or "file.bin"

class Handler(SimpleHTTPRequestHandler):
    def translate_path(self, path):
        if path == "/" or path == "":
            return os.path.join(STATIC, "index.html")
        if path.startswith("/static/"):
            return os.path.join(BASE, path.lstrip("/"))
        return super().translate_path(path)

    def log_message(self, fmt, *args):
        pass

    def send_json(self, data, status=200):
        raw = json.dumps(data, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(raw)))
        self.end_headers()
        self.wfile.write(raw)

    def do_GET(self):
        if self.path == "/api/info":
            self.send_json({"ip": local_ip(), "port": self.server.server_port})
            return

        if self.path == "/api/health":
            self.send_json({"ok": True})
            return

        if self.path == "/api/files":
            files = []
            for name in os.listdir(UPLOADS):
                p = os.path.join(UPLOADS, name)
                if os.path.isfile(p):
                    files.append({
                        "name": name,
                        "size": os.path.getsize(p),
                        "mtime": os.path.getmtime(p),
                        "url": "/download/" + name
                    })
            files.sort(key=lambda x: x["mtime"], reverse=True)
            self.send_json(files)
            return

        if self.path.startswith("/download/"):
            name = safe_name(self.path[len("/download/"):])
            p = os.path.join(UPLOADS, name)
            if not os.path.isfile(p):
                self.send_error(404)
                return
            size = os.path.getsize(p)
            self.send_response(200)
            self.send_header("Content-Type", "application/octet-stream")
            self.send_header("Content-Disposition", f'attachment; filename="{name}"')
            self.send_header("Content-Length", str(size))
            self.send_header("Cache-Control", "no-store")
            self.end_headers()
            with open(p, "rb") as f:
                while chunk := f.read(1024 * 1024):
                    self.wfile.write(chunk)
            return

        return super().do_GET()

    def do_POST(self):
        if self.path != "/api/upload":
            self.send_error(404)
            return
        try:
            length = int(self.headers.get("Content-Length", "0"))
        except ValueError:
            length = 0
        if length <= 0 or length > MAX_FILE:
            self.send_error(413, "Invalid file size")
            return

        name = safe_name(self.headers.get("X-Filename", "file.bin"))
        final_name = name
        if os.path.exists(os.path.join(UPLOADS, final_name)):
            stem, ext = os.path.splitext(name)
            final_name = f"{stem}_{uuid.uuid4().hex[:6]}{ext}"

        path = os.path.join(UPLOADS, final_name)
        remaining = length
        with open(path, "wb") as f:
            while remaining:
                chunk = self.rfile.read(min(1024 * 1024, remaining))
                if not chunk:
                    break
                f.write(chunk)
                remaining -= len(chunk)

        if remaining:
            try: os.remove(path)
            except OSError: pass
            self.send_error(400, "Incomplete upload")
            return

        self.send_json({"ok": True, "name": final_name})

    def do_DELETE(self):
        if not self.path.startswith("/api/files/"):
            self.send_error(404)
            return
        name = safe_name(self.path[len("/api/files/"):])
        p = os.path.join(UPLOADS, name)
        if not os.path.isfile(p):
            self.send_error(404)
            return
        os.remove(p)
        self.send_json({"ok": True})

if __name__ == "__main__":
    port = 8000
    print("\nLAN SHARE — v2")
    print("=" * 36)
    print(f"Computer: http://localhost:{port}")
    print(f"Mobile:   http://{local_ip()}:{port}")
    print("Both devices must be connected to the same Wi-Fi.")
    print("Press Ctrl+C to stop.\n")
    ThreadingHTTPServer(("0.0.0.0", port), Handler).serve_forever()
