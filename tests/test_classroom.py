"""Integration test: independent temp server and five complete missions."""
import json, os, shutil, subprocess, tempfile, time, urllib.request, urllib.error
from pathlib import Path
SOURCE=Path(__file__).resolve().parents[1]

def run():
    with tempfile.TemporaryDirectory() as dir:
        root=Path(dir);shutil.copy2(SOURCE/'server.py',root/'server.py');shutil.copytree(SOURCE/'static',root/'static')
        env={**os.environ,'MISSION404_PORT':'8877'}
        proc=subprocess.Popen(['python',str(root/'server.py'),'--no-browser'],cwd=root,env=env,stdout=subprocess.DEVNULL,stderr=subprocess.PIPE)
        base='http://127.0.0.1:8877/api/'
        try:
            teacher=''
            def request(path,payload=None,role=None,token=None):
                h={'Content-Type':'application/json'}
                if role=='teacher':h['X-Teacher-Key']=teacher
                if role=='student':h['X-Player-Token']=token
                req=urllib.request.Request(base+path, data=json.dumps(payload,ensure_ascii=False).encode() if payload is not None else None, headers=h)
                try:
                    with urllib.request.urlopen(req,timeout=4) as r:return json.loads(r.read())
                except urllib.error.HTTPError as e:
                    raise Exception((e.code,e.read().decode()))
            for i in range(40):
                if (root/'teacher_config.json').exists():
                    teacher=json.loads((root/'teacher_config.json').read_text())['teacher_key']
                    try:request('health');break
                    except Exception:pass
                time.sleep(.2)
            else:raise Exception('Server not ready')
            assert request('teacher/auth',{'key':teacher})['ok']
            t=request('teacher/create',{'names':['АЛФА','БЕТА','ГАМА']},role='teacher')['session']
            code=t['code'];team=t['teams'][0]['id']; assert len(code)==6 and t['duration']==2400
            assert request('public/session',{'code':code})['teams'][0]['name']=='АЛФА'
            students=[]
            for nick in ['Агент_1','Агент_2','Агент_3']:
                token=request('student/join',{'code':code,'team_id':team,'nickname':nick})['token'];students.append(token)
            assert request('teacher/state',role='teacher')['session']['teams'][0]['players'][0]['nickname']=='Агент_1'
            request('teacher/action',{'action':'start'},'teacher')
            def state(i=0):return request('student/state',role='student',token=students[i])
            assert state()['team']['current']==1
            bad=request('student/submit',{'mission':1,'payload':{'mapping':{'collab':'ideas'},'reason':'Някакъв текст за екипа'}},'student',students[0]);assert not bad['ok']
            good=request('student/submit',{'mission':1,'payload':{'mapping':{'archive':'storage','review':'docs','date':'schedule','meeting':'webinar','sharing':'storage','brainstorm':'ideas','quick':'chat','collab':'docs'},'reason':'Общите документи позволяват едновременна работа на екипа и обратна връзка по отделни пасажи.','contrast':'Не бих използвал чат за редакция на документи, защото там не се поддържат версии и коментари по отделните пасажи.'}},'student',students[0]);assert good['ok'] and len(good['digit'])==1
            assert good['earned']==90
            fields={'title':'Безопасно онлайн','audience':'Ученици от 10. клас','program':'Лични данни; фишинг; цифров отпечатък','tools':'Google Meet, Google Docs и Doodle','roles':'Водещ, модератор и техническа поддръжка','fallback':'Ако видеосрещата прекъсне, ще изпратим материалите чрез ограничен линк и ще съберем въпросите писмено.'}
            for idx,(k,v) in enumerate(fields.items()):
                request('student/edit',{'field':k,'value':v},'student',students[idx%3])
            request('student/comment',{'action':'add','body':'Да включим и пример за защита срещу фишинг.'},'student',students[1]);comment=state(0)['m2']['comments'][0]['id']
            request('student/comment',{'action':'apply','id':comment},'student',students[2]); request('student/comment',{'action':'add','body':'Да публикуваме предварително и програмата за участниците.'},'student',students[2]); comment2=state(0)['m2']['comments'][1]['id'];request('student/comment',{'action':'apply','id':comment2},'student',students[0]); result=request('student/submit',{'mission':2,'payload':{}},'student',students[0]);assert result['ok'] and result['bonus']==10
            result=request('student/submit',{'mission':3,'payload':{'slot':'tue15','tool':'Doodle','backup':'record','reason':'Doodle помага за събиране на възможните часове на всеки участник и предотвратява насрочване на среща, на която някой не може да присъства.'}},'student',students[0]);assert result['ok']
            result=request('student/submit',{'mission':4,'payload':{'rights':{'organizer':'edit','teacher':'comment','visitors':'view','outsider':'none','link':'restricted'},'incident':'revoke','risk':'Ако всеки с линка има право да редактира, непознати могат да изтрият важни материали, затова премахваме публичните права и проверяваме историята на редакциите.'}},'student',students[0]);assert result['ok']
            result=request('student/submit',{'mission':5,'payload':{'choices':{'webinar':'Zoom','docs':'Word Online','files':'OneDrive','time':'Doodle','ideas':'Padlet'},'fallback':'async','reason1':'Zoom позволява онлайн конференция с видео, звук и въпроси, а модераторът може да координира участниците.','reason2':'Word Online позволява общо редактиране в реално време, коментиране на отделни части и проследяване на версиите.'}},'student',students[0]);assert result['ok']
            done=state();assert done['team']['current']==6 and all(x is not None for x in done['team']['digits'])
            full=''.join(done['team']['digits']); assert request('student/unlock',{'code':full},'student',students[0])['ok']
            final=state();assert final['team']['finished_at'] is not None
            dash=request('teacher/state',role='teacher')['session']; assert dash['teams'][0]['score']==500
            request('teacher/action',{'action':'pause'},'teacher');assert request('teacher/state',role='teacher')['session']['status']=='paused'
            request('teacher/action',{'action':'resume'},'teacher');assert request('teacher/state',role='teacher')['session']['status']=='running'
            request('teacher/action',{'action':'finish'},'teacher'); assert state()['session']['status']=='finished'
            print('OK: teacher creates session, 3 players join, 5 missions pass, document shared, 500 points, final code, pause/resume/finish')
        finally:
            proc.terminate();proc.wait(timeout=5)
if __name__=='__main__':run()
