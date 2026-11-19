"""Transient speaking queue for the definition laboratory."""
import hashlib
import json
import os
import re
import secrets
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from threading import Lock
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

ORIGIN = "https://laboratoria-za-definicii.onrender.com"
lock = Lock()
auth = {}
queues = {}


def identity(code, token, teacher):
    key = (code, teacher, hashlib.sha256(token.encode()).digest())
    now = time.monotonic()
    with lock:
        if key in auth and auth[key][0] > now:
            return auth[key][1]
    host = "definicii-ekipi" if code.startswith("0") else "definicii-classroom-api"
    path = "/status" if teacher else "/lookup"
    payload = {"code": code, ("teacher" if teacher else "device"): token}
    req = Request(f"https://{host}.onrender.com{path}", json.dumps(payload).encode(),
                  {"Content-Type": "application/json"})
    with urlopen(req, timeout=45) as response:
        if teacher:
            team = 0
        else:
            mine = json.load(response).get("mine", [])
            team = next((i for i in mine if type(i) is int and 1 <= i <= 5), None)
            if team is None:
                return None
    with lock:
        for k in [k for k, v in auth.items() if v[0] <= now]:
            del auth[k]
        auth[key] = (now + 45, team)
    return team


def process(path, data):
    teacher = path in ("/queue", "/done")
    if not teacher and path not in ("/mine", "/raise", "/lower"):
        return 404, {}
    code = data.get("code")
    token = data.get("teacher" if teacher else "device")
    if not isinstance(code, str) or not re.fullmatch(r"[0-9]{6}", code):
        return 400, {}
    if not isinstance(token, str) or not re.fullmatch(r"[A-Za-z0-9_-]{16,96}", token):
        return 403, {}
    team = identity(code, token, teacher)
    if team is None:
        return 403, {}
    now = time.monotonic()
    with lock:
        for k in [k for k, v in queues.items() if v[0] < now - 7200]:
            del queues[k]
        queue = queues.get(code, (now, {}))[1]
        if path == "/raise" and team not in queue:
            queue[team] = secrets.token_hex(12)
        if path == "/done":
            team = data.get("team")
        if path in ("/lower", "/done") and type(team) is int and team in queue and queue[team] == data.get("id"):
            del queue[team]
        if queue:
            queues[code] = (now, queue)
        else:
            queues.pop(code, None)
        if teacher:
            return 200, {"queue": [{"team": t, "id": uid} for t, uid in queue.items()]}
        return 200, {"id": queue.get(team)}


class Handler(BaseHTTPRequestHandler):
    def reply(self, code, data):
        raw = json.dumps(data).encode()
        self.send_response(code)
        for key, value in {"Content-Type":"application/json", "Content-Length":str(len(raw)),
                           "Access-Control-Allow-Origin":ORIGIN, "Access-Control-Allow-Methods":"POST, OPTIONS",
                           "Cache-Control":"no-store", "Access-Control-Allow-Headers":"Content-Type"}.items():
            self.send_header(key, value)
        self.end_headers()
        self.wfile.write(raw)

    def do_OPTIONS(self):
        self.reply(200, {})

    def do_GET(self):
        self.reply(200 if self.path in ("/", "/health") else 404, {})

    def do_POST(self):
        try:
            size = int(self.headers.get("Content-Length", 0))
            if not 0 < size <= 2048:
                return self.reply(413, {})
            data = json.loads(self.rfile.read(size))
            if not isinstance(data, dict):
                return self.reply(400, {})
            result = process(self.path, data)
        except HTTPError as exc:
            result = (exc.code, {})
        except (TimeoutError, URLError, OSError):
            result = (503, {})
        except (ValueError, UnicodeError):
            result = (400, {})
        self.reply(*result)


if __name__ == "__main__":
    ThreadingHTTPServer(("0.0.0.0", int(os.getenv("PORT", "8080"))), Handler).serve_forever()
