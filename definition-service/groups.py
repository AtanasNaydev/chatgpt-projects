import json
import os
import re
import secrets
import sqlite3
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

ORIGIN = "https://laboratoria-za-definicii.onrender.com"
DB = os.environ.get("LESSON_DB", "/tmp/definition-rooms.sqlite3")
FIELDS = {"definition","structure","example","reason","revision","peer","reply","final","verdict"}
with sqlite3.connect(DB) as db:
    db.executescript("""
    CREATE TABLE IF NOT EXISTS rooms(code TEXT PRIMARY KEY, teacher TEXT, created INTEGER);
    CREATE TABLE IF NOT EXISTS work(code TEXT, team INTEGER, device TEXT, body TEXT, PRIMARY KEY(code,team), FOREIGN KEY(code) REFERENCES rooms(code) ON DELETE CASCADE);
    CREATE TABLE IF NOT EXISTS seats(code TEXT REFERENCES rooms(code) ON DELETE CASCADE, device TEXT, team INTEGER, size INTEGER, PRIMARY KEY(code,device));
    """)

def process(path, data):
    with sqlite3.connect(DB, timeout=8) as db:
        db.execute("PRAGMA foreign_keys=ON")
        db.execute("BEGIN IMMEDIATE")
        now = int(time.time())
        db.execute("DELETE FROM rooms WHERE created < ?", (now-86400,))
        if path == "/create":
            if db.execute("SELECT count(*) FROM rooms").fetchone()[0] >= 300:
                return 429, {"error":"Опитайте по-късно."}
            token = secrets.token_urlsafe(24)
            while True:
                code = f"0{secrets.randbelow(100000):05d}"
                if db.execute("INSERT OR IGNORE INTO rooms VALUES(?,?,?)",(code,token,now)).rowcount:
                    return 200, {"code":code,"teacher":token}
        code = data.get("code")
        if not isinstance(code,str) or not re.fullmatch(r"[0-9]{6}",code):
            return 400, {"error":"Въведете шестцифрения код от дъската."}
        room = db.execute("SELECT teacher FROM rooms WHERE code=?",(code,)).fetchone()
        if not room:
            return 404, {"error":"Няма отворен час с този код."}
        if path in ("/lookup", "/join"):
            device = data.get("device")
            if not isinstance(device, str) or not re.fullmatch(r"[a-f0-9]{32}", device):
                return 400, {"error":"Невалидно устройство."}
            sizes=dict(db.execute("SELECT team,sum(size) FROM seats WHERE code=? GROUP BY team",(code,)))
            mine=db.execute("SELECT team,size FROM seats WHERE code=? AND device=?",(code,device)).fetchone()
            leads=dict(db.execute("SELECT team,device FROM work WHERE code=?",(code,)))
            if path == "/lookup":
                return 200, {"counts":sizes,"taken":[n for n,size in sizes.items() if size>=5],"mine":[mine[0]] if mine else [],"mySize":mine[1] if mine else 1,"lead":bool(mine and leads.get(mine[0])==device)}
            team,size=data.get("team"),data.get("size",1)
            if type(team) is not int or team not in range(1,6) or type(size) is not int or size not in range(1,6):
                return 400, {"error":"Изберете екип и брой ученици от 1 до 5."}
            if mine and mine[0]!=team:
                return 409, {"error":"Вече сте в екип "+str(mine[0])+". Изберете „Продължи“ за него."}
            if sizes.get(team,0)-(mine[1] if mine else 0)+size>5:
                return 409, {"error":"Няма достатъчно свободни места. Изберете друг екип или проверете броя ученици."}
            db.execute("INSERT OR REPLACE INTO seats VALUES(?,?,?,?)",(code,device,team,size))
            db.execute("INSERT OR IGNORE INTO work VALUES(?,?,?,'{}')",(code,team,device))
            return 200, {"team":team,"lead":leads.get(team,device)==device}
        if path == "/key":
            if data.get("teacher") != room[0] or not secrets.compare_digest(str(data.get("pin","")).encode(),os.environ["LESSON_KEY_PIN"].encode()):
                return 403, {"error":"Проверете личния код на учителя."}
            return 200, {"items":json.loads(os.environ["LESSON_KEY_ITEMS"])}
        if path == "/status":
            if data.get("teacher") != room[0]:
                return 403, {"error":"Отворете учителския панел в браузъра, създал часа."}
            rows=list(db.execute("SELECT team, body FROM work WHERE code=?",(code,)))
            return 200, {"counts":dict(db.execute("SELECT team,sum(size) FROM seats WHERE code=? GROUP BY team",(code,))),"joined":[n for n,_ in rows], "teams":{str(n):json.loads(body) for n,body in rows if body!="{}"}}
        if path == "/submit":
            team,device,fields=(data.get(k) for k in ("team","device","fields"))
            if type(team) is not int or team not in range(1,6) or not isinstance(device,str) or not re.fullmatch(r"[a-f0-9]{32}",device):
                return 400, {"error":"Невалидно устройство или екип."}
            if not isinstance(fields,dict) or any(k not in FIELDS or not isinstance(v,str) or len(v)>4000 for k,v in fields.items()):
                return 400, {"error":"Използвайте до 4000 знака за всяко поле."}
            if not any(fields.get(k,'').strip() for k in ('example','reason','revision','final')):
                return 400, {"error":"Попълнете поне един аргумент или формулировка в „Анализирай“."}
            body=json.dumps(fields,ensure_ascii=False)
            if not db.execute("UPDATE work SET body=? WHERE code=? AND team=? AND device=?", (body,code,team,device)).rowcount:
                return 403, {"error":"Говорителят предава общото решение от първия лаптоп в екипа."}
            return 200, {"ok":True}
        return 404, {}

class Handler(BaseHTTPRequestHandler):
    def respond(self, status, payload):
        body=json.dumps(payload,ensure_ascii=False).encode()
        self.send_response(status)
        self.send_header("Access-Control-Allow-Origin", ORIGIN)
        self.send_header("Access-Control-Allow-Methods","POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers","Content-Type")
        self.send_header("Cache-Control","no-store")
        self.send_header("Content-Type","application/json; charset=utf-8")
        self.send_header("Content-Length",str(len(body)))
        self.end_headers()
        self.wfile.write(body)
    def do_OPTIONS(self):
        self.respond(200,{})
    def do_GET(self):
        self.respond(200 if self.path in ("/","/health") else 404,{"service":"definition-lab"})
    def do_POST(self):
        try:
            size=int(self.headers.get("Content-Length",0))
            if not 0<size<=160000:
                return self.respond(413,{})
            data=json.loads(self.rfile.read(size))
            if not isinstance(data,dict):
                return self.respond(400,{})
            self.respond(*process(self.path,data))
        except (ValueError,UnicodeError):
            self.respond(400,{})
        except sqlite3.Error:
            self.respond(503,{"error":"Временна грешка при запис. Опитайте отново."})
if __name__=="__main__":
    ThreadingHTTPServer(("0.0.0.0",int(os.getenv("PORT","8080"))),Handler).serve_forever()
