#!/usr/bin/env python3
"""ALGO-01: public classroom game, dependency-free Python HTTP server.

For Render Free the classroom state is MEMORY ONLY. It is intentionally transient:
restarts, scale-downs and deploys erase online sessions. Students retain local saves.
"""
import csv
import html
import io
import json
import os
import re
import secrets
import threading
import time
from collections import defaultdict, deque
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit

ROOT = Path(__file__).resolve().parent
PORT = int(os.environ.get("PORT", "10000"))
LOCK = threading.RLock()
CLASSES = {}
REQUESTS = defaultdict(deque)
LIFETIME = 48 * 3600
MAX_ROOMS = 120
MAX_STUDENTS = 80
ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"


def clean(value, length=48):
    if not isinstance(value, str):
        return ""
    return re.sub(r"[\x00-\x1f\x7f<>]", "", value).strip()[:length]


def expire():
    now = time.time()
    for code in list(CLASSES):
        if now - CLASSES[code]["created"] > LIFETIME:
            del CLASSES[code]


def codegen(size=6):
    return "".join(secrets.choice(ALPHABET) for _ in range(size))


def check_points(raw):
    if not isinstance(raw, dict):
        return None
    pts = raw.get("points")
    done = raw.get("done")
    if (not isinstance(pts, list) or len(pts) != 5
            or not isinstance(done, list) or len(done) != 5):
        return None
    if any(type(x) is not int or x < 0 or x > 20 for x in pts):
        return None
    if any(type(x) is not bool for x in done):
        return None
    final = raw.get("final")
    if not isinstance(final, dict):
        final = {}
    return {
        "points": pts,
        "done": done,
        "score": sum(pts),
        "final": {k: clean(final.get(k), 2200 if k == "steps" else 260)
                  for k in ("task", "input", "steps", "output")},
        "updated": int(time.time()),
    }


def authorized(handler, code):
    room = CLASSES.get(code)
    supplied = handler.headers.get("X-Teacher-Key", "")
    return room if room and supplied and secrets.compare_digest(room["teacher_key"], supplied) else None


class Handler(BaseHTTPRequestHandler):
    server_version = "ALGO-01/2.0"
    protocol_version = "HTTP/1.1"

    def headers_common(self, size, content_type, status=200):
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(size))
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("X-Frame-Options", "DENY")
        self.send_header("Referrer-Policy", "no-referrer")
        self.send_header("Permissions-Policy", "camera=(), microphone=(), geolocation=()")
        self.send_header("Content-Security-Policy", "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'")
        self.end_headers()

    def output(self, status, data):
        payload = json.dumps(data, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
        self.headers_common(len(payload), "application/json; charset=utf-8", status)
        self.wfile.write(payload)

    def rate_limited(self, limit=160):
        ip = self.headers.get("X-Forwarded-For", self.client_address[0]).split(",")[0][:70]
        with LOCK:
            q = REQUESTS[ip]
            now = time.monotonic()
            while q and now - q[0] > 60:
                q.popleft()
            if len(q) >= limit:
                return True
            q.append(now)
            if len(REQUESTS) > 10000:
                REQUESTS.clear()
        return False

    def read_json(self):
        if not self.headers.get("Content-Type", "").lower().startswith("application/json"):
            return None
        try:
            n = int(self.headers.get("Content-Length", "0"))
            if not 0 < n < 16000:
                return None
            obj = json.loads(self.rfile.read(n))
            return obj if isinstance(obj, dict) else None
        except (ValueError, UnicodeError, OSError):
            return None

    def do_HEAD(self):
        path = urlsplit(self.path).path
        status = 200 if path in ("/", "/health", "/api/health") else 404
        self.send_response(status)
        self.send_header("Content-Length", "0")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.end_headers()

    def do_GET(self):
        path = urlsplit(self.path).path
        if path in ("/api/health", "/health"):
            return self.output(200, {"ok": True, "service": "ALGO-01", "mode": "live-temporary"})
        if path in ("/api/class/board", "/api/class/export"):
            if self.rate_limited(120):
                return self.output(429, {"error": "Твърде много заявки."})
            code = clean(self.headers.get("X-Class-Code", ""), 10).upper()
            with LOCK:
                expire()
                room = authorized(self, code)
                if not room:
                    return self.output(403, {"error": "Невалиден код или сесията е изтекла."})
                students = [
                    {"id": v["id"], "name": v["name"], "score": v.get("score", 0),
                     "points": v.get("points", [0]*5), "done": v.get("done", [False]*5),
                     "final": v.get("final", {}), "updated": v.get("updated", 0)}
                    for v in room["students"].values()
                ]
            students.sort(key=lambda x: (-x["score"], x["name"].lower()))
            if path.endswith("/board"):
                return self.output(200, {
                    "code": code, "students": students,
                    "count": len(students), "complete": sum(all(s["done"]) for s in students),
                    "average": round(sum(s["score"] for s in students)/len(students)) if students else 0,
                    "temporary": True,
                })
            buf = io.StringIO()
            writer = csv.writer(buf)
            writer.writerow(["Псевдоним", "Точки", "Завършени мисии", "Мисия 1", "Мисия 2",
                             "Мисия 3", "Мисия 4", "Мисия 5", "Задача", "Вход", "Стъпки", "Изход"])
            for s in students:
                values = [s["name"], s["score"], sum(s["done"])] + s["points"]
                values += [s["final"].get(k, "") for k in ("task", "input", "steps", "output")]
                writer.writerow(["'" + str(v) if isinstance(v, str) and v.lstrip().startswith(("=", "+", "-", "@")) else v for v in values])
            output = ("\ufeff" + buf.getvalue()).encode("utf-8")
            self.headers_common(len(output), "text/csv; charset=utf-8")
            self.wfile.write(output)
            return
        static = {"/": "index.html", "/index.html": "index.html",
                  "/style.css": "style.css", "/app.js": "app.js"}
        filename = static.get(path)
        if not filename:
            return self.output(404, {"error": "Няма такава страница."})
        file = ROOT / filename
        try:
            data = file.read_bytes()
        except OSError:
            return self.output(500, {"error": "Липсва файл."})
        ct = "text/html" if filename.endswith("html") else "text/css" if filename.endswith("css") else "text/javascript"
        self.headers_common(len(data), ct + "; charset=utf-8")
        self.wfile.write(data)

    def do_POST(self):
        path = urlsplit(self.path).path
        if path not in ("/api/class/create", "/api/class/join", "/api/class/progress"):
            return self.output(404, {"error": "Невалиден адрес."})
        if self.rate_limited(500):
            return self.output(429, {"error": "Твърде много заявки. Опитай след минута."})
        body = self.read_json()
        if body is None:
            return self.output(400, {"error": "Невалидни данни."})
        if path.endswith("/create"):
            with LOCK:
                expire()
                if len(CLASSES) >= MAX_ROOMS:
                    return self.output(503, {"error": "Твърде много активни класове."})
                code = codegen()
                while code in CLASSES:
                    code = codegen()
                key = secrets.token_urlsafe(32)
                CLASSES[code] = {"created": time.time(), "teacher_key": key, "students": {}}
            return self.output(201, {"code": code, "teacherKey": key, "expiresHours": 48, "temporary": True})
        code = clean(body.get("code"), 10).upper()
        with LOCK:
            expire()
            room = CLASSES.get(code)
            if not room:
                return self.output(404, {"error": "Няма активна стая с този код. Учителят трябва да създаде нова."})
            if path.endswith("/join"):
                nickname = clean(body.get("nickname"), 32)
                if len(nickname) < 2:
                    return self.output(400, {"error": "Въведи псевдоним с поне 2 символа."})
                if len(room["students"]) >= MAX_STUDENTS:
                    return self.output(403, {"error": "Стаята е пълна."})
                sid = secrets.token_hex(8)
                token = secrets.token_urlsafe(24)
                room["students"][sid] = {
                    "id": sid, "token": token, "name": nickname,
                    "points": [0]*5, "done": [False]*5, "score": 0,
                    "final": {}, "updated": int(time.time())
                }
                return self.output(201, {"code": code, "studentId": sid, "studentToken": token})
            sid = clean(body.get("studentId"), 45)
            token = clean(body.get("studentToken"), 120)
            student = room["students"].get(sid)
            if not student or not token or not secrets.compare_digest(token, student["token"]):
                return self.output(403, {"error": "Невалидна ученическа сесия. Въведи кода отново."})
            progress = check_points(body.get("progress"))
            if progress is None:
                return self.output(400, {"error": "Невалиден напредък."})
            student.update(progress)
            return self.output(200, {"ok": True})

    def log_message(self, fmt, *args):
        if not self.path.startswith("/health") and not self.path.startswith("/api/health"):
            super().log_message(fmt, *args)


if __name__ == "__main__":
    app = ThreadingHTTPServer(("0.0.0.0", PORT), Handler)
    print("ALGO-01 listening on", PORT, flush=True)
    app.serve_forever()
