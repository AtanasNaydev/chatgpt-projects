#!/usr/bin/env python3
"""МИСИЯ 404 — classroom game server for local network or Render cloud."""
from __future__ import annotations
import hmac, json, mimetypes, os, secrets, socket, string, sys, threading, time, webbrowser
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit

ROOT = Path(__file__).resolve().parent
DATA_PATH = ROOT / 'game_data.json'
CONFIG_PATH = ROOT / 'teacher_config.json'
STATIC = ROOT / 'static'
PORT = int(os.environ.get('PORT', os.environ.get('MISSION404_PORT', '8765')))
DATABASE_URL = os.environ.get('DATABASE_URL', '').strip()
RENDER_MODE = bool(os.environ.get('RENDER', '') or os.environ.get('MISSION404_CLOUD_MODE', ''))
LOCK = threading.RLock()


def atomic_save(path: Path, val: dict):
    tmp = path.with_suffix(path.suffix + '.tmp')
    tmp.write_text(json.dumps(val, ensure_ascii=False, indent=2), encoding='utf-8')
    tmp.replace(path)


def load_json(path: Path, fallback):
    try:
        return json.loads(path.read_text(encoding='utf-8'))
    except FileNotFoundError:
        return fallback

# Teacher key must be stable and secret on a public deployment. Local mode retains
# the self-generated key in a file, as in the original classroom version.
if RENDER_MODE and not DATABASE_URL:
    raise RuntimeError('Online hosting requires DATABASE_URL for durable game progress.')
if RENDER_MODE and not os.environ.get('MISSION404_TEACHER_KEY'):
    raise RuntimeError('Online hosting requires MISSION404_TEACHER_KEY set in Render environment.')
if os.environ.get('MISSION404_TEACHER_KEY'):
    CONFIG = {'teacher_key': os.environ['MISSION404_TEACHER_KEY']}
else:
    CONFIG = load_json(CONFIG_PATH, None)
    if not CONFIG or 'teacher_key' not in CONFIG:
        CONFIG = {'teacher_key': ''.join(secrets.choice('ABCDEFGHJKLMNPQRSTUVWXYZ23456789') for _ in range(12))}
        atomic_save(CONFIG_PATH, CONFIG)


def _db_connect():
    # psycopg is needed only for the hosted version; local Windows remains stdlib-only.
    import psycopg
    return psycopg.connect(DATABASE_URL, connect_timeout=12)


def load_data():
    if not DATABASE_URL:
        return load_json(DATA_PATH, {'session': None})
    with _db_connect() as connection:
        with connection.cursor() as cur:
            cur.execute('CREATE TABLE IF NOT EXISTS mission404_state (id INTEGER PRIMARY KEY, payload TEXT NOT NULL)')
            cur.execute('SELECT payload FROM mission404_state WHERE id=1')
            row = cur.fetchone()
        return json.loads(row[0]) if row else {'session': None}

DATA = load_data()

TOOLS = {'docs': 'Google Docs / Word Online', 'ideas': 'Padlet', 'schedule': 'Doodle',
         'webinar': 'Google Meet / Teams / Zoom', 'storage': 'Google Drive / OneDrive'}
CORRECT_M1 = {'collab':'docs','brainstorm':'ideas','date':'schedule','meeting':'webinar','archive':'storage'}
CORRECT_M4 = {'organizer':'edit','teacher':'comment','visitors':'view','outsider':'none','link':'restricted'}
M3_COMMON_SLOT = 'tue15'
TEAM_NAMES = ['АЛФА','БЕТА','ГАМА','ДЕЛТА','ОМЕГА','СИГМА','ТЕТА','ЗЕТА']
CLUES = [
  'Улика А · ЗАГЛАВИЕ: Събитието трябва да се нарича „Безопасно онлайн“.',
  'Улика Б · АУДИТОРИЯ: Поканени са учениците от 10. клас.',
  'Улика В · ПРОГРАМА: Включете трите теми „лични данни“, „фишинг“ и „цифров отпечатък“.',
  'Улика Г · ОРГАНИЗАЦИЯ: Използвайте видеовръзка, общ документ и анкета за удобен час. Разпределете роли водещ, модератор и техническа поддръжка.'
]
HINTS = {
  1:'Помислете коя дейност има нужда от общо редактиране, коя — от анкета за дата и коя — от облачно хранилище.',
  2:'Съберете информацията от личните улики на всички членове. Всеки трябва да добави поне една промяна, после приложете коментар.',
  3:'Потърсете клетката, в която ВСИЧКИ петима участници са свободни.',
  4:'Редактиране не е необходимо на всички: ограничете публичната връзка и задайте само минималните необходими права.',
  5:'Изберете инструмент според конкретната задача, а не според популярността му.'
}

def now(): return time.time()
def sec(s):
    e = s.get('elapsed_before', 0)
    if s.get('status') == 'running' and s.get('started_at'):
        e += max(0, now() - s['started_at'])
    return min(s['duration'], int(e))
def session_status(s):
    if s['status'] == 'running' and sec(s) >= s['duration'] and not s.get('test_mode'): return 'finished'
    return s['status']
def save():
    if DATABASE_URL:
        # A single JSON record keeps the original teacher/student game logic intact.
        # This web service must use ONE process/worker. The global request lock
        # serializes updates, and the DB survives Render restarts and deployments.
        with _db_connect() as connection:
            connection.execute('INSERT INTO mission404_state (id, payload) VALUES (1, %s) '
                               'ON CONFLICT (id) DO UPDATE SET payload=EXCLUDED.payload',
                               (json.dumps(DATA, ensure_ascii=False),))
    else:
        atomic_save(DATA_PATH, DATA)
def fail(msg, status=400): raise ApiError(msg, status)
class ApiError(Exception):
    def __init__(self, message, status=400): self.message, self.status = message, status

def teacher_key(headers):
    value = headers.get('X-Teacher-Key', '')
    if not value or not hmac.compare_digest(value, CONFIG['teacher_key']): fail('Невалиден учителски код.', 403)

def get_session():
    s = DATA['session']
    if not s: fail('Няма създадена игра.', 404)
    return s

def get_player(headers):
    token = headers.get('X-Player-Token', '')
    s = get_session()
    if not token: fail('Не сте присъединени към играта.', 401)
    for team in s['teams']:
        for player in team['players']:
            if hmac.compare_digest(player['token'], token):
                player['last_seen'] = now()
                return s, team, player
    fail('Не е намерен участник. Присъединете се отново.', 401)

def ensure_running(s, t, mission=None):
    if session_status(s) != 'running': fail('Играта не е стартирана или е на пауза.')
    if mission is not None and t['current'] != mission: fail('Тази мисия не е отключена за отбора.')

def new_team(name, idx):
    return {'id': secrets.token_hex(8), 'name':name, 'players':[], 'current':1,
        'score':0, 'answers':{}, 'attempts':{}, 'hints':[], 'digits':[str(secrets.randbelow(10)) for _ in range(5)],
        'doc':{}, 'edits':[], 'comments':[], 'finished_at':None}

def new_session(team_names, test_mode=False):
    code=''.join(secrets.choice('ABCDEFGHJKLMNPQRSTUVWXYZ23456789') for _ in range(6))
    return {'code': code, 'status':'running' if test_mode else 'lobby', 'test_mode':bool(test_mode),
        'created_at':now(), 'started_at':now() if test_mode else None, 'elapsed_before':0,
        'duration':2700, 'teams':[new_team(name,i) for i,name in enumerate(team_names)]}

def teacher_view(s):
    return {'code':s['code'], 'status':session_status(s), 'test_mode':s['test_mode'],
       'elapsed':sec(s), 'duration':s['duration'], 'teams':[
           {'id':t['id'], 'name':t['name'], 'players':[{'nickname':p['nickname'], 'online':now()-p.get('last_seen',0)<20} for p in t['players']],
            'current':t['current'], 'score':t['score'], 'answers':t['answers'], 'attempts':t['attempts'],
            'hints':t['hints'], 'finished_at':t['finished_at'], 'comments':t['comments'],
            'doc':{k:v['value'] for k,v in t['doc'].items()}}
           for t in s['teams']]}

def student_view(s,t,p):
    # Digit of a mission is disclosed only after a server-validated completion.
    solved=set(map(int,t['answers'].keys()))
    clue_slots={}
    for i in range(4):
        # stable per member slot, regardless of joining order
        index=i%max(1,len(t['players']))
        clue_slots.setdefault(index, []).append(CLUES[i])
    return {'session':{'code':s['code'],'status':session_status(s),'elapsed':sec(s),'duration':s['duration'],'test_mode':s['test_mode']},
        'team':{'name':t['name'],'current':t['current'],'score':t['score'],'hints':t['hints'],
                'attempts':t['attempts'],'digits':[t['digits'][i] if (i+1) in solved else None for i in range(5)],
                'finished_at':t['finished_at']},
        'me':{'id':p['id'],'nickname':p['nickname']},
        'players':[{'nickname':m['nickname'], 'online':now()-m.get('last_seen',0)<20,
                    'contributions':sum(1 for e in t['edits'] if e['player_id']==m['id'])} for m in t['players']],
        'm2':{'clues':clue_slots.get(p['slot'],[]), 'doc':t['doc'],
              'comments':t['comments']},
        'hint_texts':{str(i):HINTS[i] for i in t['hints']}}

def score(t,m,bonus=0):
    missed=t['attempts'].get(str(m),0)
    return max(70,100-10*missed)-(10 if m in t['hints'] else 0)+bonus

def submit(t,s,p,mission,payload):
    ensure_running(s,t,mission)
    if not isinstance(payload,dict): fail('Невалидни данни.')
    errors=[]
    evidence={}
    bonus=0
    if mission==1:
        result=payload.get('mapping',{})
        if not isinstance(result,dict): result={}
        wrong=[k for k,v in CORRECT_M1.items() if result.get(k)!=v]
        if wrong: errors.append('Има '+str(len(wrong))+' неправилни съответствия. Прегледайте избраните инструменти.')
        reason=str(payload.get('reason','')).strip()
        if len(reason)<16: errors.append('Добавете кратка аргументация (поне 16 знака).')
        evidence={'mapping':result,'reason':reason}
    elif mission==2:
        doc={k:v['value'].strip() for k,v in t['doc'].items()}
        for k in ('title','audience','program','tools','roles'):
            if len(doc.get(k,''))<6: errors.append('Попълнете всичките пет полета на общия документ.') ; break
        if 'безопасно' not in doc.get('title','').lower():errors.append('В заглавието липсва темата на събитието от уликата.')
        if '10' not in doc.get('audience',''):errors.append('Уточнете за кой клас е събитието.')
        program=doc.get('program','').lower()
        if not all(x in program for x in ('лични данни','фишинг','цифров отпечатък')):
            errors.append('Програмата трябва да включва и трите теми от уликите.')
        members=len(t['players']); contributors=set(e['player_id'] for e in t['edits'])
        if members>=2 and len(contributors)<members: errors.append('Всеки ученик от отбора трябва да редактира поне едно поле.')
        if not any(c['applied'] for c in t['comments']): errors.append('Добавете коментар и отбележете, че предложението е приложено.')
        if len(contributors)>=members and members>=2: bonus=10
        evidence={'doc':doc,'participants':len(contributors),'comments':t['comments']}
    elif mission==3:
        if payload.get('slot')!=M3_COMMON_SLOT: errors.append('Това не е общият свободен час на всички петима участници.')
        if payload.get('tool')!='Doodle': errors.append('Изберете инструмент, предназначен за съгласуване на дата и час.')
        if len(str(payload.get('reason','')).strip())<14:errors.append('Обяснете защо избраният инструмент е подходящ.')
        evidence={'slot':payload.get('slot'),'tool':payload.get('tool'),'reason':str(payload.get('reason',''))[:350]}
    elif mission==4:
        rights=payload.get('rights',{})
        if not isinstance(rights,dict): rights={}
        wrong=[k for k,v in CORRECT_M4.items() if rights.get(k)!=v]
        if wrong: errors.append('Поправете '+str(len(wrong))+' настройки за достъп. Използвайте минималните необходими права.')
        if len(str(payload.get('risk','')).strip())<16:errors.append('Опишете риск от неправилното споделяне.')
        evidence={'rights':rights,'risk':str(payload.get('risk',''))[:350]}
    elif mission==5:
        choices=payload.get('choices',{})
        valid={'webinar':['Google Meet','Microsoft Teams','Zoom'],
          'docs':['Google Docs','Word Online'],
          'files':['Google Drive','OneDrive'],
          'time':['Doodle'],
          'ideas':['Padlet']}
        if not isinstance(choices,dict) or any(choices.get(k) not in vals for k,vals in valid.items()):
            errors.append('Проверете избраните инструменти за петте дейности.')
        if len(str(payload.get('reason1','')).strip())<15 or len(str(payload.get('reason2','')).strip())<15:
            errors.append('Напишете две обосновки за избраните инструменти (поне 15 знака).')
        evidence={'choices':choices,'reason1':str(payload.get('reason1',''))[:400], 'reason2':str(payload.get('reason2',''))[:400]}
    else:fail('Несъществуваща мисия.')
    if errors:
        t['attempts'][str(mission)] = t['attempts'].get(str(mission),0)+1
        return {'ok':False,'errors':errors,'attempts':t['attempts'][str(mission)]}
    earned=score(t,mission,bonus)
    t['answers'][str(mission)]={'points':earned,'evidence':evidence,'at':now(),'skipped':False}
    t['score']=sum(v['points'] for v in t['answers'].values())
    t['current']=mission+1
    return {'ok':True,'earned':earned,'bonus':bonus,'digit':t['digits'][mission-1], 'message':'Мисията е изпълнена!'}

class Handler(BaseHTTPRequestHandler):
    server_version='Misiya404/1.0'
    def log_message(self,fmt,*args):
        print('[%s]'%time.strftime('%H:%M:%S'),self.address_string(),fmt%args)
    def send_json(self,value,status=200):
        body=json.dumps(value,ensure_ascii=False).encode('utf-8')
        self.send_response(status); self.send_header('Content-Type','application/json; charset=utf-8')
        self.send_header('Cache-Control','no-store'); self.send_header('X-Content-Type-Options','nosniff'); self.send_header('X-Frame-Options','DENY'); self.send_header('Referrer-Policy','no-referrer')
        self.send_header('Content-Length',str(len(body))); self.end_headers();self.wfile.write(body)
    def api(self,method,path,p):
        with LOCK:
            if path=='/api/health' and method=='GET':return {'ok':True,'name':'МИСИЯ 404','lan':'' if RENDER_MODE else local_address(),'port':PORT}
            if path=='/api/teacher/auth' and method=='POST':
                teacher_key({'X-Teacher-Key':p.get('key','')});return {'ok':True}
            if path=='/api/teacher/state' and method=='GET':
                teacher_key(self.headers);return {'session':teacher_view(DATA['session']) if DATA['session'] else None}
            if path=='/api/teacher/create' and method=='POST':
                teacher_key(self.headers)
                names=p.get('names',TEAM_NAMES[:4])
                if not isinstance(names,list) or not (3<=len(names)<=8):fail('Изберете между 3 и 8 отбора.')
                if any(not isinstance(n,str) or len(n.strip())<1 or len(n)>28 for n in names):fail('Имената трябва да са между 1 и 28 знака.')
                DATA['session']=new_session([x.strip() for x in names],bool(p.get('test_mode',False)))
                save();return {'ok':True,'session':teacher_view(DATA['session'])}
            if path=='/api/teacher/action' and method=='POST':
                teacher_key(self.headers);s=get_session();action=p.get('action')
                if action=='start' and s['status']=='lobby':s['status']='running';s['started_at']=now()
                elif action=='pause' and s['status']=='running':s['elapsed_before']=sec(s);s['started_at']=None;s['status']='paused'
                elif action=='resume' and s['status']=='paused':s['started_at']=now();s['status']='running'
                elif action=='finish':s['elapsed_before']=sec(s);s['started_at']=None;s['status']='finished'
                elif action=='reset':
                    for t in s['teams']:
                        t.update(new_team(t['name'],0));t['players']=[]
                    s['elapsed_before']=0;s['started_at']=None;s['status']='lobby';s['test_mode']=False
                else:fail('Действието е недостъпно при текущото състояние.')
                save();return {'ok':True,'session':teacher_view(s)}
            if path=='/api/teacher/rename' and method=='POST':
                teacher_key(self.headers);s=get_session()
                if s['status']!='lobby':fail('Преименуването е възможно преди началото.')
                for t in s['teams']:
                    if t['id']==p.get('team_id'):
                        name=str(p.get('name','')).strip()
                        if not (1<=len(name)<=28):fail('Невалидно име.')
                        t['name']=name;save();return {'ok':True}
                fail('Отборът не е намерен.',404)
            if path=='/api/teacher/skip' and method=='POST':
                teacher_key(self.headers);s=get_session()
                for t in s['teams']:
                    if t['id']==p.get('team_id'):
                        m=t['current']
                        if not (1<=m<=5):fail('Няма мисия за пропускане.')
                        t['answers'][str(m)]={'points':0,'evidence':{},'at':now(),'skipped':True}
                        t['current']=m+1;save();return {'ok':True}
                fail('Отборът не е намерен.',404)
            if path=='/api/public/session' and method=='POST':
                s=get_session()
                if p.get('code','').strip().upper()!=s['code']:fail('Невалиден код за игра.',404)
                return {'code':s['code'],'status':session_status(s),'teams':[
                    {'id':t['id'],'name':t['name'],'count':len(t['players']),'full':len(t['players'])>=4} for t in s['teams']]}
            if path=='/api/student/join' and method=='POST':
                s=get_session()
                if p.get('code','').strip().upper()!=s['code']:fail('Невалиден код за игра.',404)
                if session_status(s)=='finished':fail('Играта вече е приключила.')
                nick=str(p.get('nickname','')).strip()
                if not (2<=len(nick)<=22) or any(ch in nick for ch in '<>{}'):fail('Използвайте прякор с дължина 2–22 знака.')
                for t in s['teams']:
                    if t['id']==p.get('team_id'):
                        if len(t['players'])>=4:fail('Отборът вече има четирима участници.')
                        if nick.lower() in [m['nickname'].lower() for m in t['players']]:fail('Прякорът вече се използва в отбора.')
                        person={'id':secrets.token_hex(9),'token':secrets.token_urlsafe(28), 'slot':len(t['players']), 'nickname':nick,'last_seen':now()}
                        t['players'].append(person);save();return {'ok':True,'token':person['token']}
                fail('Отборът не е намерен.',404)
            if path=='/api/student/state' and method=='GET':
                s,t,player=get_player(self.headers);return student_view(s,t,player)
            if path=='/api/student/edit' and method=='POST':
                s,t,player=get_player(self.headers);ensure_running(s,t,2)
                field=p.get('field');value=p.get('value')
                if field not in ('title','audience','program','tools','roles') or not isinstance(value,str) or not (1<=len(value)<=600):fail('Невалидно поле или текст.')
                entry={'value':value,'nickname':player['nickname'],'player_id':player['id'],'updated_at':now()}
                t['doc'][field]=entry;t['edits'].append({'field':field,**entry});save();return {'ok':True}
            if path=='/api/student/comment' and method=='POST':
                s,t,player=get_player(self.headers);ensure_running(s,t,2)
                if p.get('action')=='add':
                    body=str(p.get('body','')).strip()
                    if not (3<=len(body)<=300):fail('Коментарът трябва да е между 3 и 300 знака.')
                    t['comments'].append({'id':secrets.token_hex(7),'nickname':player['nickname'],'body':body,'applied':False,'at':now()})
                elif p.get('action')=='apply':
                    c=next((c for c in t['comments'] if c['id']==p.get('id')),None)
                    if not c:fail('Коментарът не е намерен.')
                    c['applied']=True;c['applied_by']=player['nickname']
                else:fail('Непозната операция.')
                save();return {'ok':True}
            if path=='/api/student/hint' and method=='POST':
                s,t,player=get_player(self.headers);m=t['current'];ensure_running(s,t)
                if not (1<=m<=5):fail('Всички мисии са изпълнени.')
                if m not in t['hints']:t['hints'].append(m);save()
                return {'ok':True,'hint':HINTS[m]}
            if path=='/api/student/submit' and method=='POST':
                s,t,player=get_player(self.headers);m=p.get('mission')
                if not isinstance(m,int):fail('Невалидна мисия.')
                result=submit(t,s,player,m,p.get('payload',{}));save();return result
            if path=='/api/student/unlock' and method=='POST':
                s,t,player=get_player(self.headers);ensure_running(s,t)
                if t['current']!=6:fail('Първо изпълнете петте мисии.')
                if t['finished_at']:return {'ok':True}
                if str(p.get('code','')).strip()!=''.join(t['digits']):fail('Кодът е неверен. Подредете цифрите според номерата на мисиите.')
                t['finished_at']=now();save();return {'ok':True,'score':t['score']}
            fail('Непознат адрес.',404)
    def dispatch(self,method):
        try:
            split=urlsplit(self.path);path=split.path
            if path.startswith('/api/'):
                data={}
                if method=='POST':
                    length=int(self.headers.get('Content-Length','0'))
                    if length>20000:fail('Твърде голяма заявка.',413)
                    if self.headers.get('Content-Type','').split(';')[0]!='application/json':fail('Изисква се JSON.')
                    raw=self.rfile.read(length)
                    try: data=json.loads(raw.decode('utf-8'))
                    except (ValueError,UnicodeDecodeError):fail('Невалиден JSON.')
                    if not isinstance(data,dict):fail('Невалидни данни.')
                return self.send_json(self.api(method,path,data))
            if method!='GET':fail('Невалидна операция.',405)
            filepath=STATIC / ('app.js' if path=='/app.js' else 'style.css' if path=='/style.css' else 'index.html')
            body=filepath.read_bytes()
            self.send_response(200);self.send_header('Content-Type',mimetypes.guess_type(filepath.name)[0] or 'text/html')
            self.send_header('Cache-Control','no-cache');self.send_header('X-Content-Type-Options','nosniff');self.send_header('X-Frame-Options','DENY');self.send_header('Referrer-Policy','no-referrer')
            self.send_header('Content-Length',str(len(body)));self.end_headers();self.wfile.write(body)
        except ApiError as e:self.send_json({'ok':False,'error':e.message},e.status)
        except (BrokenPipeError,ConnectionResetError):pass
        except Exception as e:
            print('SERVER ERROR',repr(e));self.send_json({'ok':False,'error':'Възникна грешка в сървъра.'},500)
    def do_GET(self):self.dispatch('GET')
    def do_POST(self):self.dispatch('POST')


def local_address():
    try:
        s=socket.socket(socket.AF_INET,socket.SOCK_DGRAM);s.connect(('8.8.8.8',80));a=s.getsockname()[0];s.close();return a
    except OSError:return socket.gethostbyname(socket.gethostname())

if __name__=='__main__':
    address='онлайн хостинг' if RENDER_MODE else local_address()
    print('\n'+'='*70)
    print('         МИСИЯ 404 — ДИГИТАЛЕН ХАОС')
    print('='*70)
    print('Учителски екран: http://localhost:%s/teacher'%PORT)
    if RENDER_MODE:
        print('Публичен адрес: настройва се автоматично от Render.')
    else:
        print('Адрес за учениците (една мрежа): http://%s:%s/join'%(address,PORT))
    if RENDER_MODE:
        print('Кодът за учителя е в Render Environment, MISSION404_TEACHER_KEY.')
    else:
        print('СЕКРЕТЕН КОД ЗА УЧИТЕЛ: '+CONFIG['teacher_key'])
    print('Не споделяйте този код с учениците.')
    print('Спрете сървъра чрез Ctrl+C. Данните се записват автоматично.')
    print('='*70+'\n',flush=True)
    try:
        server=ThreadingHTTPServer(('0.0.0.0',PORT),Handler)
        if '--no-browser' not in sys.argv and not RENDER_MODE:
            threading.Timer(0.8,lambda:webbrowser.open('http://localhost:%d/teacher'%PORT)).start()
        server.serve_forever()
    except OSError as e:print('Неуспешно стартиране:',e);sys.exit(1)
    except KeyboardInterrupt:print('\nСървърът е спрян.')
