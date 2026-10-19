/* МИСИЯ: ДИГИТАЛЕН ЕКИП — independent grade 8 classroom app.
   Teacher uses Supabase Auth + RLS. Student RPCs score only on the database.
   No mission answer key is included in this browser build. */
(function () {
  'use strict';
  const CFG=window.GAME_CONFIG||{};
  const BASE=(CFG.supabaseUrl||'').replace(/\/$/,'');
  const KEY=CFG.publishableKey||'';
  const root=document.getElementById('app');
  let missions=[], student=null, feedback=null, showHint=false, timer=null, teamAfterVote=0, teacherSnapshot=null, teacherSessionId=localStorage.getItem('digital8_selected_session')||'';
  const tokenKey='digital8_token', codeKey='digital8_code', authKey='digital8_teacher_auth';
  const teamNames=['Пазители','Създатели','Изследователи','Медиатори'];
  const challenges=window.DIGITAL8_TEAM_CHALLENGES||[];
  const safe=(s)=>String(s==null?'':s).replace(/[&<>"']/g,(c)=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const qs=(k)=>new URLSearchParams(location.search).get(k);
  const $=(selector)=>document.querySelector(selector);
  const $$=(selector)=>Array.from(document.querySelectorAll(selector));
  const btn=(label,act,cls='')=>'<button class="btn '+cls+'" data-action="'+safe(act)+'">'+safe(label)+'</button>';
  const nav=(url)=>{clearInterval(timer);timer=null;history.pushState({},'',url);feedback=null;showHint=false;render();window.scrollTo({top:0,behavior:'instant'});};
  const toast=(message)=>{const el=$('#toast');el.innerHTML='<div class="toastbox">'+safe(message)+'</div>';setTimeout(()=>{if(el)el.innerHTML='';},6000)};
  function auth(){try{return JSON.parse(localStorage.getItem(authKey)||'null')}catch(e){return null}}
  function token(){return localStorage.getItem(tokenKey)||''}
  function saveAuth(a){localStorage.setItem(authKey,JSON.stringify({access_token:a.access_token,refresh_token:a.refresh_token,expires_at:Math.floor(Date.now()/1000)+(a.expires_in||3600)}))}
  async function getJWT(){
    let a=auth();if(!a)return null;
    if(a.expires_at>Date.now()/1000+80)return a.access_token;
    try{
      const x=await fetch(BASE+'/auth/v1/token?grant_type=refresh_token',{method:'POST',headers:{'Content-Type':'application/json',apikey:KEY},body:JSON.stringify({refresh_token:a.refresh_token})});
      const j=await x.json();if(!x.ok)throw Error(j.msg||'Изтекла сесия');
      saveAuth(j);return j.access_token;
    }catch(e){localStorage.removeItem(authKey);return null}
  }
  async function request(path,method='GET',data=null,asTeacher=false,headersExtra={}){
    if(!BASE||!KEY)throw Error('Сървърът не е конфигуриран');
    const jwt=asTeacher?await getJWT():null;
    if(asTeacher&&!jwt)throw Error('Моля, влезте отново като учител');
    const headers=Object.assign({apikey:KEY,Authorization:'Bearer '+(jwt||KEY),'Content-Type':'application/json'},headersExtra);
    const res=await fetch(BASE+path,{method,headers,body:data===null?undefined:JSON.stringify(data),cache:'no-store'});
    const raw=await res.text();let body;try{body=raw?JSON.parse(raw):null}catch(e){body={message:raw}}
    if(!res.ok)throw Error((body&&(body.message||body.msg||body.error_description||body.error))||'Възникна грешка ('+res.status+')');
    return body;
  }
  const rpc=(name,data)=>request('/rest/v1/rpc/'+name,'POST',data);
  const db=(table,params,method='GET',data=null)=>request('/rest/v1/'+table+(params?'?'+params:''),method,data,true,{'Prefer':'return=representation'});
  async function login(email,password,signup=false){
    const path=signup?'/auth/v1/signup':'/auth/v1/token?grant_type=password';
    const x=await request(path,'POST',{email,password});if(x.access_token){saveAuth(x);return true}return false;
  }
  async function state(){const t=token();if(!t)return null;return rpc('student_state',{p_token:t})}
  function head(label='8. КЛАС'){return '<div class="topbar"><a href="/" class="brand" data-link="home">МИСИЯ <b>ДИГИТАЛЕН ЕКИП</b></a><span class="tiny">'+label+'</span></div>'}
  function foot(){return '<div class="footer">Информационни технологии · 8. клас · Без реални профили и лични данни</div>'}
  function cardTitle(t,sub){return '<p class="eyebrow">'+safe(sub||'Мисия')+'</p><h2>'+safe(t)+'</h2>'}
  function home(){
    const list=missions.map(m=>'<li class="mission-item"><span class="number">'+m.id+'</span><strong>'+safe(m.title)+'</strong><small>'+safe(m.minutes)+'</small></li>').join('');
    root.innerHTML='<div class="narrow">'+head()+ '<section class="hero"><span class="badge">ИНТЕРАКТИВНА МИСИЯ</span><h1 style="margin-top:23px">МИСИЯ:<br><span class="accent">ДИГИТАЛЕН</span><br>ЕКИП</h1><p class="lead">Едно училищно събитие. Пет дигитални проблема. Твоите решения имат значение.</p><div class="pills"><span class="pill">✦ 5 мисии</span><span class="pill">◷ 30 минути</span><span class="pill">✧ 100 точки</span></div><div class="actions">'+btn('Започни мисията →','gojoin','primary')+btn('За учителя','goteacher','ghost')+'</div></section><section class="panel section"><p class="eyebrow">ТВОЯТ ПЛАН</p><h3>Денят на идеите е в опасност</h3><p class="muted">Защити профила, организирай групата, настрой документ, създай анкета и разреши дигитален конфликт.</p><ol class="list" style="list-style:none;padding:0">'+list+'</ol></section><section class="panel section"><h3>Три правила за успешна мисия</h3><p class="muted">① Мисли преди да избираш. ② Можеш да използваш подсказки. ③ Не споделяй лични данни — използвай псевдоним.</p></section>'+foot()+'</div>';
    bind('[data-action="gojoin"]',()=>nav('/?join='+encodeURIComponent(localStorage.getItem(codeKey)||'')));
    bind('[data-action="goteacher"]',()=>nav('/?teacher=1'));
  }
  function bind(q,fn){const el=$(q);if(el)el.addEventListener('click',fn)}
  function all(q,fn){$$(q).forEach(el=>el.addEventListener('click',()=>fn(el)))}
  function spinner(msg){root.innerHTML='<div class="narrow">'+head()+'<div class="panel center"><p>'+safe(msg||'Зареждане…')+'</p></div></div>'}
  function errorPage(msg,back){root.innerHTML='<div class="narrow">'+head()+'<section class="panel"><h2>Неуспешна връзка</h2><p>'+safe(msg)+'</p>'+btn('Назад','back','primary')+'</section></div>';bind('[data-action="back"]',()=>nav(back||'/'))}
  function join(){
    const code=(qs('join')||'').trim().toUpperCase();
    root.innerHTML='<div class="narrow">'+head('ВХОД ЗА УЧЕНИК')+'<section class="panel"><span class="badge">НОВА МИСИЯ</span><h2 style="margin-top:18px">Присъедини се</h2><p class="muted">Въведи кода от интерактивната дъска. За име използвай псевдоним, не истинско име, имейл или телефон.</p><form id="joinform"><div class="formrow"><label for="code">Код на играта</label><input id="code" maxlength="6" required autocomplete="off" value="'+safe(code)+'" placeholder="Напр. F5TS67" autocapitalize="characters"></div><div class="formrow"><label for="nick">Псевдоним</label><input id="nick" minlength="2" maxlength="22" required autocomplete="off" placeholder="Напр. КодМайстор"></div><div class="formrow" id="team-row" hidden><label for="team-select">Избери отбора си</label><select id="team-select" class="native-select"><option value="">-- Избери отбор --</option>'+teamNames.map(t=>'<option value="'+safe(t)+'">'+safe(t)+'</option>').join('')+'</select><p class="tiny">Ще обсъждате общи решения с останалите от отбора, като всеки играе от своя телефон.</p></div><p id="join-mode" class="tiny" aria-live="polite"></p><button class="btn primary full" type="submit">Присъедини се →</button></form></section>'+foot()+'</div>';
    let mode=null;let checkSequence=0;
    async function checkTeamMode(){
      const value=$('#code').value.trim().toUpperCase(),seq=++checkSequence;
      if(value.length!==6){$('#team-row').hidden=true;$('#join-mode').textContent='Въведи 6-символен код';mode=null;return}
      try{
        const data=await rpc('session_preview',{p_code:value});
        if(seq!==checkSequence)return;
        mode=data;$('#team-row').hidden=!data.team_mode;
        $('#join-mode').textContent=data.team_mode?'👥 Отборна игра — избери отбор.':'◎ Самостоятелна игра';
      }catch(err){if(seq!==checkSequence)return;mode=null;$('#team-row').hidden=true;$('#join-mode').textContent=err.message}
    }
    $('#code').addEventListener('input',()=>{mode=null;$('#team-row').hidden=true});
    $('#code').addEventListener('blur',checkTeamMode);
    if(code.length===6)checkTeamMode();
    $('#joinform').addEventListener('submit',async(e)=>{
      e.preventDefault();const inp=$('#code').value.trim().toUpperCase();const nick=$('#nick').value.trim();
      if(!/^[A-Z2-9]{6}$/.test(inp)){toast('Кодът трябва да е от 6 символа');return}
      if(nick.length<2||nick.length>22||/[@<>]/.test(nick)||/[0-9]{5}/.test(nick)){toast('Използвай псевдоним от 2 до 22 знака, без лични данни');return}
      const submit=$('#joinform button');submit.disabled=true;submit.textContent='Свързване…';
      try{
        const old=localStorage.getItem(codeKey);
        if(old===inp&&token()){
          try{await state();nav('/?play=1');return}catch(e){localStorage.removeItem(tokenKey)}
        }
        const arr=new Uint8Array(32);crypto.getRandomValues(arr);const t=Array.from(arr).map(x=>x.toString(16).padStart(2,'0')).join('');
        const meta=mode&&$('#code').value.trim().toUpperCase()===inp?mode:await rpc('session_preview',{p_code:inp});
        const team=meta.team_mode?$('#team-select').value:null;
        if(meta.team_mode&&!team)throw Error('Първо избери своя отбор');
        await rpc('student_join_v2',{p_code:inp,p_nickname:nick,p_token:t,p_team:team});
        localStorage.setItem(tokenKey,t);localStorage.setItem(codeKey,inp);nav('/?play=1');
      }catch(err){toast(err.message)}finally{submit.disabled=false;submit.textContent='Присъедини се →'}
    });
  }
  function startPolling(fn,ms){
    clearInterval(timer);
    let busy=false;
    timer=setInterval(async()=>{
      if(busy || document.hidden) return;
      busy=true;
      try{await fn()}catch(e){console.warn('Временен проблем със синхронизацията:',e)}
      finally{busy=false}
    },ms);
  }
  function waiting(st){
    root.innerHTML='<div class="narrow">'+head('ЧАКАЛНЯ')+'<section class="panel center"><span class="badge">ПРИСЪЕДИНЕН УЧАСТНИК</span><div class="wait-icon">⌛</div><h2>Очакваме старт</h2><p class="lead">Здравей, <b class="accent">'+safe(st.nickname)+'</b>!</p>'+(st.team_mode?'<p class="team-inline">👥 Отбор: '+safe(st.team_name||'')+'</p>':'')+'<p>Ти си в играта с код <strong>'+safe(st.code)+'</strong>. Изчакай учителят да стартира мисията.</p><p class="tiny">Играта ще започне автоматично, без презареждане.</p></section>'+foot()+'</div>';
    startPolling(async()=>{try{const s=await state();if(s.status!=='lobby') {student=s;renderPlay()}}catch(e){toast(e.message)}},2800);
  }
  function paused(st){
    root.innerHTML='<div class="narrow">'+head('ПАУЗА')+'<section class="panel center"><div class="wait-icon">Ⅱ</div><h2>Пауза на мисията</h2><p class="muted">Учителят временно е спрял играта. Резултатът ти е запазен.</p><p class="code">'+st.total+' / 100</p></section>'+foot()+'</div>';
    startPolling(async()=>{try{const s=await state();if(s.status!=='paused'){student=s;renderPlay()}}catch(e){toast(e.message)}},3000);
  }
  function scene(m,s,answer){
    const h='<div class="scene-head"><span>'+(['','🔐 СОЦИАЛЕН ПРОФИЛ','👥 УЧИЛИЩНА ГРУПА','📄 СПОДЕЛЕН ДОКУМЕНТ','📋 ОНЛАЙН АНКЕТА','💬 ГРУПОВ ЧАТ'][m.id])+'</span><span class="tiny">Симулация</span></div>';
    if(m.id===1){
      return '<div class="scene">'+h+'<div class="person"><div class="avatar">◈</div><div><b>Дигитален екип</b><div class="tiny">Училищен профил · 8. клас</div></div></div><div class="fake-row"><span>'+safe(s.title)+'</span><b>'+safe(answer?answer.label:'⚠ Публично')+'</b></div><div class="fake-row"><span>Какво виждат другите?</span><b>'+safe(answer?'Настройката е променена':'Видимо за всички')+'</b></div></div>';
    }
    if(m.id===2){
      return '<div class="scene">'+h+'<div class="person"><div class="avatar">👤</div><div><b>'+safe(s.title)+'</b><div class="tiny">'+safe(s.situation)+'</div></div></div><p class="tiny" style="margin:12px 0 0">Ти управляваш участниците и безопасността на групата.</p></div>';
    }
    if(m.id===3){
      return '<div class="scene">'+h+'<div class="document"><b>📄 План за „Деня на идеите“</b><hr><div class="docline"></div><div class="docline short"></div><div class="docline"></div><div class="docline short"></div><div style="border:1px solid #a8bfd9;padding:10px;border-radius:8px;margin-top:15px"><b>Споделяне</b><p style="margin:5px 0;font-size:12px">'+safe(s.title)+'</p><span style="color:#006e79">'+safe(answer?answer.label:'⚠ Избери правилните права')+'</span></div></div></div>';
    }
    if(m.id===4){
      return '<div class="scene">'+h+'<div style="background:#e5eefa;padding:14px;border-radius:10px;color:#223650"><b>Анкета: Ден на идеите</b><div class="survey-question">'+safe(s.title)+'<hr><span class="survey-dot"></span>Концерт<br><span class="survey-dot"></span>Работилница<br><span class="survey-dot"></span>Спортно събитие</div><small>'+safe(answer?'✓ '+answer.label:'Чернова — редактирай настройката')+'</small></div></div>';
    }
    const chats=[{from:'Алекс',text:'Хайде да организираме събитието в чата!'},{from:'Модератор',text:s.situation}];
    const replies=answer&&answer.replies||[];
    return '<div class="scene">'+h+chats.concat(replies).map(c=>'<div class="bubble '+(c.tone==='me'?'me':'')+'"><small>'+safe(c.from)+'</small>'+safe(c.text)+'</div>').join('')+'</div>';
  }
  function current(){
    const f=feedback;
    if(f&&f.solved){const m=missions[f.mission-1];return {m,s:m.steps[f.step-1],mission:f.mission,step:f.step,after:true}}
    const completed=Number(student.completed)||0;
    if(completed>=20)return null;
    const mi=Math.floor(completed/4),si=completed%4;
    return {m:missions[mi],s:missions[mi].steps[si],mission:mi+1,step:si+1,after:false};
  }
  function renderPlay(){
    clearInterval(timer);timer=null;
    if(!student){spinner('Проверяваме ученическата сесия…');return}
    if(student.status==='lobby')return waiting(student);
    if(student.status==='paused')return paused(student);
    if(student.status==='ended')return student.completed>=20?finale():endEarly(student);
    const completed=Number(student.completed)||0;
    const completedMission=completed>0&&completed%4===0?completed/4:0;
    const voted=(student.team_votes||[]).some(v=>v.mission===completedMission);
    if(student.team_mode&&student.team_name&&completedMission&&(!voted||teamAfterVote===completedMission)&&!feedback){
      return renderTeamCheckpoint(completedMission);
    }
    const c=current();if(!c)return finale();
    const m=c.m,s=c.s; const rec=(student.answers||[]).find(x=>x.mission===m.id&&x.step===s.n)||{};
    const pct=Math.round((Number(student.completed)||0)/20*100);
    const chosen=feedback&&feedback.mission===m.id&&feedback.step===s.n? s.options.find(o=>o.id===feedback.choice):null;
    const hdr='<div class="top-progress"><div><span>МИСИЯ '+m.id+' ОТ 5</span><span>'+safe(student.total)+' / 100 т.</span></div><div class="mission-bubbles">'+missions.map(x=>'<span class="'+(x.id<m.id?'done':x.id===m.id?'current':'')+'"></span>').join('')+'</div><div class="tiny" style="margin-top:8px">'+pct+'% завършени задачи</div></div>';
    const opts=s.options.map((o,i)=>'<button class="choice '+(chosen&&chosen.id===o.id?(feedback.solved?'correct':'wrong'):'')+'" data-choice="'+safe(o.id)+'" '+((c.after||(rec.wrong_choices||[]).includes(o.id))?'disabled':'')+'><span class="letter">'+String.fromCharCode(65+i)+'</span><span>'+safe(o.label)+'</span></button>').join('');
    let fb='';
    if(feedback&&feedback.mission===m.id&&feedback.step===s.n){
      const text=chosen?chosen.feedback:(feedback.skipped?'Пропусна тази задача. Можеш да разгледаш правилата от мисията.':'');
      fb='<div class="feedback '+(feedback.solved?'':'bad')+'"><strong>'+(feedback.solved?(feedback.skipped?'Задачата е пропусната':'✅ Добро решение! +'+feedback.points+' т.'):'💡 Опитай отново')+'</strong><p>'+safe(text)+'</p></div>';
    }
    const hintShown=showHint||rec.hint_used;
    root.innerHTML='<div class="narrow">'+head('УЧАСТНИК: '+safe(student.nickname))+hdr+'<main class="panel">'+cardTitle(m.title,'МИСИЯ '+m.id+' · СТЪПКА '+s.n+' / 4')+(s.n===1?'<p class="muted">'+safe(m.story)+'</p>':'')+scene(m,s,chosen)+'<div class="section"><span class="badge">'+safe(s.title)+'</span><p style="margin-top:13px">'+safe(s.situation)+'</p><h3>'+safe(s.prompt)+'</h3><div class="choice-list">'+opts+'</div>'+fb+(hintShown?'<div class="feedback"><strong>Подсказка</strong><p>'+safe(s.hint)+'</p></div>':'')+'<div class="actions">'+(c.after?btn('Продължи →','continue','primary full'):(btn('Подсказка','hint','ghost')+btn('Пропусни','skip','ghost')))+'</div></div>'+'</main>'+(c.after?'<section class="panel section"><h3>Запомни</h3><p class="muted">'+safe(s.tip)+'</p></section>':'')+foot()+'</div>';
    all('[data-choice]',async(el)=>{
      if(el.disabled)return;el.disabled=true;
      try{
        const choice=el.getAttribute('data-choice');
        const out=await rpc('student_act',{p_token:token(),p_mission:m.id,p_step:s.n,p_action:'answer',p_choice:choice});
        const s2=await state();student=s2;feedback={mission:m.id,step:s.n,choice,solved:out.correct,points:out.points||0};
        renderPlay();
      }catch(e){el.disabled=false;toast(e.message)}
    });
    bind('[data-action="hint"]',async()=>{try{await rpc('student_act',{p_token:token(),p_mission:m.id,p_step:s.n,p_action:'hint'});student=await state();showHint=true;renderPlay()}catch(e){toast(e.message)}});
    bind('[data-action="skip"]',async()=>{if(!confirm('Да пропуснеш ли задачата? Ще получиш 0 точки.'))return;try{await rpc('student_act',{p_token:token(),p_mission:m.id,p_step:s.n,p_action:'skip'});student=await state();feedback={mission:m.id,step:s.n,choice:null,skipped:true,solved:true,points:0};renderPlay()}catch(e){toast(e.message)}});
    bind('[data-action="continue"]',()=>{feedback=null;showHint=false;renderPlay()});
    startPolling(async()=>{try{const next=await state();if(next.status!==student.status){student=next;renderPlay()}else student=next}catch(e){}},10000);
  }

  function renderTeamCheckpoint(mission){
    clearInterval(timer);timer=null;
    const task=challenges.find(x=>x.mission===mission);
    const roles=[
      {name:'Координатор',tip:'Дай възможност на всеки да изрази мнение и насочи отбора към общо решение.'},
      {name:'Проверяващ',tip:'Посочи какви рискове и пропуски откриваш във вариантите.'},
      {name:'Редактор',tip:'Обобщи с едно изречение защо избраният подход е подходящ.'},
      {name:'Говорител',tip:'Бъди готов да представиш аргументите на отбора пред класа.'}
    ];
    const role=roles[((Number(student.team_index)||0)+mission-1)%4];
    if(!task){teamAfterVote=0;return finale()}
    const myVote=(student.team_votes||[]).find(x=>x.mission===mission);
    const counts=(student.team_tallies||[]).filter(x=>x.mission===mission);
    const participants=Number(student.team_members||0);
    const sum=counts.reduce((v,x)=>v+Number(x.votes||0),0);
    const options=task.options.map((o,i)=>{
      const votedFor=myVote&&myVote.choice_id===o.id;
      const count=counts.find(c=>c.choice_id===o.id);
      return '<button class="choice team-ballot '+(votedFor?'team-selected':'')+'" data-team-vote="'+safe(o.id)+'" '+(myVote?'disabled':'')+'><span class="letter">'+o.id+'</span><span>'+safe(o.label)+'</span>'+(myVote?'<b class="vote-count">'+(count?count.votes:0)+' гл.</b>':'')+'</button>';
    }).join('');
    root.innerHTML='<div class="narrow">'+head('ОТБОР: '+safe(student.team_name))+
      '<section class="team-checkpoint panel"><span class="badge">🤝 СЪВМЕСТНА МИСИЯ · '+mission+'/5</span><h2 style="margin-top:15px">'+safe(task.title)+'</h2>'+
      '<p class="muted">'+safe(task.context)+'</p><div class="team-role"><strong>Твоята роля: '+safe(role.name)+'</strong><p>'+safe(role.tip)+'</p></div><div class="team-instruction">Обсъдете трите варианта с отбора си, преди всеки да гласува от телефона си. Търсете общо решение, не най-бърз отговор.</div>'+
      '<h3>'+safe(task.prompt)+'</h3><div class="choice-list">'+options+'</div>'+
      (myVote?'<div class="feedback"><strong>Гласът ти е отчетен.</strong><p>'+sum+' от '+participants+' участници в отбора са гласували за тази мисия. Това е общо екипно решение и не променя индивидуалните ти точки.</p></div>'+
          '<div class="team-tally"><h3>Изборите на отбора</h3>'+task.options.map(o=>{const val=Number((counts.find(c=>c.choice_id===o.id)||{}).votes||0);return '<div class="progressline"><div class="line-head"><strong>Вариант '+o.id+'</strong><span>'+val+' гласа</span></div><div class="bar"><span style="width:'+(sum?Math.round(val/sum*100):0)+'%"></span></div></div>'}).join('')+'</div>'+
          '<div class="actions">'+btn(mission===5?'Към финала →':'Следваща мисия →','team-next','primary full')+'</div>':
          '<p class="tiny">Всеки има един глас. Не се изисква съгласие на 100%, за да продължиш.</p>')+
      '</section><section class="panel section"><h3>За обсъждане</h3><p class="muted">'+(myVote?safe(task.takeaway):'Обяснете един на друг какви рискове и ползи виждате във всеки вариант. Отстоявайте избора си с аргументи.')+'</p></section>'+foot()+'</div>';
    all('[data-team-vote]',async(el)=>{
      el.disabled=true;
      try{
        await rpc('team_vote',{p_token:token(),p_mission:mission,p_choice:el.dataset.teamVote});
        student=await state();teamAfterVote=mission;renderTeamCheckpoint(mission);
      }catch(err){el.disabled=false;toast(err.message)}
    });
    bind('[data-action="team-next"]',()=>{teamAfterVote=0;feedback=null;showHint=false;renderPlay()});
    if(myVote)startPolling(async()=>{
      const st=await state();if(qs('play')===null)return;
      const votes=(st.team_tallies||[]).filter(x=>x.mission===mission);
      const newCount=votes.reduce((v,x)=>v+Number(x.votes||0),0);
      if(newCount!==sum){student=st;renderTeamCheckpoint(mission)}
    },9000);
  }
  function endEarly(st){
    root.innerHTML='<div class="narrow">'+head()+'<section class="panel center"><h2>Сесията приключи</h2><p>Учителят завърши играта. Твоят резултат до момента е:</p><div class="code">'+st.total+' / 100</div><p class="tiny">Благодарим за участието!</p></section>'+foot()+'</div>';
  }
  function finale(){
    const score=Number(student.total)||0;
    const teamNote=student.team_mode?'<p class="team-inline">Твоят отбор: <strong>'+safe(student.team_name||'')+'</strong> · общите решения се обсъждат с екипа.</p>':'';
    const level=score>=85?['🏆','Златен координатор']:score>=65?['🥈','Сребърен координатор']:score>=40?['🥉','Бронзов координатор']:['🎖️','Координатор стажант'];
    const refs=['Поверителност','Групи','Споделени файлове','Анкети','Онлайн поведение'];
    const review=missions.map((m,i)=>{const pts=(student.answers||[]).filter(a=>a.mission===m.id).reduce((v,a)=>v+a.points,0);return '<div class="progressline"><div class="line-head"><strong>'+m.id+'. '+safe(m.title)+'</strong><span>'+pts+'/20 т.</span></div><div class="bar"><span style="width:'+(pts*5)+'%"></span></div></div>'}).join('');
    root.innerHTML='<div class="narrow">'+head('МИСИЯТА Е ИЗПЪЛНЕНА')+'<section class="panel center"><span class="badge">ФИНАЛЕН РЕЗУЛТАТ</span><div class="medal">'+level[0]+'</div><h2>'+level[1]+'</h2><div class="code">'+score+' / 100</div><p class="muted" style="margin-top:16px">Завърши всичките пет мисии. Вече знаеш как да участваш по-безопасно и ефективно в дигитален екип.</p>'+teamNote+'</section><section class="panel section"><h3>Твоят напредък по мисии</h3>'+review+'</section><section class="panel section"><h3>Самооценка</h3><p class="muted">Кое ще провериш или подобриш при следващата си съвместна работа онлайн?</p><div class="choice-list">'+refs.map(x=>'<button class="choice" data-reflect="'+safe(x)+'" '+(student.reflection?'disabled':'')+'><span>'+safe(x)+'</span></button>').join('')+'</div>'+(student.reflection?'<div class="feedback">✅ Благодарим за самооценката: '+safe(student.reflection)+'</div>':'')+'</section>'+foot()+'</div>';
    all('[data-reflect]',async(el)=>{try{await rpc('student_reflect',{p_token:token(),p_choice:el.dataset.reflect});student=await state();finale()}catch(e){toast(e.message)}});
  }
  async function play(){
    if(!token()){nav('/?join='+encodeURIComponent(localStorage.getItem(codeKey)||''));return}
    spinner('Възстановяваме мисията…');
    try{student=await state();renderPlay()}catch(e){localStorage.removeItem(tokenKey);errorPage('Ученическата сесия не може да бъде възстановена: '+e.message,'/?join='+encodeURIComponent(localStorage.getItem(codeKey)||''))}
  }
  function teamStatsMarkup(rows,votes){
    return '<div class="team-card-grid">'+teamNames.map((name,i)=>{
      const members=rows.filter(p=>p.team_name===name),n=members.length;
      const done=members.reduce((v,p)=>v+Number(p.completed||0),0);
      const pct=n?Math.round(done/(n*20)*100):0;
      const voted=votes.filter(v=>v.team_name===name).length;
      const score=n?Math.round(members.reduce((v,p)=>v+Number(p.total||0),0)/n):0;
      return '<div class="team-card"><div class="team-card-head"><span class="team-icon">'+(['🛡️','🎨','🔎','🤝'][i])+'</span><strong>'+safe(name)+'</strong></div>'+
      '<div class="team-metrics"><span>'+n+' участници</span><span>'+pct+'% напредък</span></div>'+
      '<div class="bar"><span style="width:'+pct+'%"></span></div><div class="team-metrics"><span>Средно '+score+'/100 т.</span><span>'+voted+' отборни гласа</span></div></div>';
    }).join('')+'</div>';
  }
  async function teacher(){
    clearInterval(timer);
    spinner('Подготвяме учителския панел…');
    const jwt=await getJWT();if(!jwt)return teacherLogin();
    try{
      const sessions=await db('game_sessions','select=*&order=created_at.desc');
      if(sessions.length&&(!teacherSessionId||!sessions.some(s=>s.id===teacherSessionId))){teacherSessionId=sessions[0].id;localStorage.setItem('digital8_selected_session',teacherSessionId)}
      const sel=sessions.find(s=>s.id===teacherSessionId);
      if(!sel)return teacherEmpty(sessions);
      const [participants,answers]=await Promise.all([
        db('participants','select=id,nickname,team_name,reflection,finished_at,last_seen_at&session_id=eq.'+sel.id),
        db('answers','select=participant_id,mission,step,solved,points,wrong_choices&session_id=eq.'+sel.id)]);
      const rows=participants.map(p=>{const as=answers.filter(a=>a.participant_id===p.id);return {...p,completed:as.filter(a=>a.solved).length,total:as.reduce((sum,a)=>sum+a.points,0)}});
      const teamVotes=sel.team_mode?await db('team_votes','select=team_name,mission,choice_id&session_id=eq.'+sel.id):[];
      const total=rows.length;const finished=rows.filter(p=>p.completed===20).length;
      const avg=total?Math.round(rows.reduce((x,p)=>x+p.total,0)/total):0;
      const joined=Math.round(rows.reduce((sum,p)=>sum+p.completed,0)/(Math.max(total,1)*20)*100);
      const perMission=missions.map(m=>({m,done:rows.filter(p=>p.completed>=m.id*4).length}));
      const wrongs={}; answers.forEach(a=>(a.wrong_choices||[]).forEach(c=>{const id=a.mission+'.'+a.step;wrongs[id]=(wrongs[id]||0)+1}));
      const common=Object.entries(wrongs).sort((a,b)=>b[1]-a[1]).slice(0,3).map(([key,count])=>{const [mi,si]=key.split('.').map(Number);return '<li>'+safe(missions[mi-1].steps[si-1].title)+' — '+count+' грешни опита</li>'}).join('')||'<li class="muted">Все още няма регистрирани грешки.</li>';
      root.innerHTML='<div class="wrap">'+head('УЧИТЕЛСКИ ПАНЕЛ')+'<div class="topbar"><div><p class="eyebrow">УПРАВЛЕНИЕ НА УРОК</p><h2>Класна сесия</h2></div>'+btn('Изход','logout','ghost')+'</div><div class="two"><section class="panel"><h3>Активна сесия</h3><div class="formrow"><label>Избери сесия</label><select id="sessions" style="background:#0b1b32;color:white;padding:12px;border:1px solid #476082;border-radius:10px;width:100%">'+sessions.map(s=>'<option value="'+safe(s.id)+'" '+(s.id===sel.id?'selected':'')+'>'+safe(s.class_label+' · '+s.code+' · '+s.status)+'</option>').join('')+'</select></div><p class="tiny">Код за учениците</p><div class="code">'+safe(sel.code)+'</div><div class="actions section teacher-actions">'+btn('Копирай линк','copy','ghost')+btn('Отвори екран за дъската','display','ghost')+'</div><div class="qrbox" id="qr"></div><p class="tiny">QR кодът води директно към присъединяването.</p><div class="actions teacher-actions">'+(sel.status==='lobby'?btn('▶ Стартирай','start','primary'):sel.status==='active'?btn('Ⅱ Пауза','pause'):sel.status==='paused'?btn('▶ Продължи','start','primary'):'')+(sel.status!=='ended'?btn('Приключи','end','warn'):'')+'</div><div class="separator"></div>'+btn('+ Нова сесия','create','ghost')+'</section><section class="stack"><div class="three"><div class="panel stat"><b>'+total+'</b><small>Ученици</small></div><div class="panel stat"><b>'+finished+'</b><small>Завършили</small></div><div class="panel stat"><b>'+avg+'</b><small>Средно точки</small></div></div><div class="panel"><h3>Общ напредък: '+joined+'%</h3><div class="bar"><span style="width:'+joined+'%"></span></div>'+perMission.map(x=>progress(x.m.title,x.done,total)).join('')+'</div></section></div><div class="two section"><section class="panel"><h3>Напредък по участници</h3><div class="teacher-users">'+(rows.length?rows.map(p=>'<div class="teacher-user"><span class="avatar">◈</span><div style="flex:1"><b>'+safe(p.nickname)+'</b><div class="tiny">'+p.completed+'/20 задачи</div></div><strong>'+p.total+' т.</strong></div>').join(''):'<p class="muted">Още няма присъединили се ученици.</p>')+'</div></section><section class="panel"><h3>Най-чести затруднения</h3><ol>'+common+'</ol><p class="muted">Използвай резултатите за 7-минутното обсъждане накрая.</p>'+btn('Изтегли CSV','csv','ghost full')+'<div class="separator"></div><h3>Финална самооценка</h3>'+refsStats(rows)+'</section></div>'+foot()+'</div>';
      const teacherFoot=root.querySelector('.footer');
      if(teacherFoot)teacherFoot.insertAdjacentHTML('beforebegin','<details class="teacher-help panel section"><summary>Как да проведа часа? · 45 минути</summary><div class="help-content"><p><b>5 минути:</b> покажи QR кода и обясни правилата.</p><p><b>30 минути:</b> учениците изпълняват петте мисии. При отборна сесия обсъждат заедно решение след всяка мисия и гласуват от собствените си телефони.</p><p><b>7 минути:</b> обсъдете най-честите грешки, поверителността и правата за споделени документи.</p><p><b>3 минути:</b> финална самооценка. Скоростта не влияе на точките.</p></div></details>');
      if(sel.team_mode){
        const anchor=$('.two.section');
        if(anchor)anchor.insertAdjacentHTML('beforebegin','<section class="panel section"><span class="badge">👥 ОТБОРНА РАБОТА</span><h3 style="margin-top:14px">Общ напредък по отбори</h3><p class="muted">Всеки ученик работи от телефон и участва в общо обсъждане след мисията. Няма бонус за скорост.</p><div id="teacher-teams">'+teamStatsMarkup(rows,teamVotes)+'</div></section>');
      }
      if(window.QRCode) {new window.QRCode($('#qr'),{text:joinLink(sel.code),width:184,height:184,colorDark:'#081329',colorLight:'#ffffff'})}
      else $('#qr').textContent='QR библиотеката не се зареди. Използвай линка за присъединяване.';
      bind('[data-action="logout"]',()=>{localStorage.removeItem(authKey);nav('/?teacher=1')});
      bind('[data-action="copy"]',async()=>{try{await navigator.clipboard.writeText(joinLink(sel.code));toast('Линкът е копиран')}catch(e){toast(joinLink(sel.code))}});
      bind('[data-action="display"]',()=>{window.open('/?display='+encodeURIComponent(sel.id),'_blank','noopener')});
      bind('[data-action="create"]',createSession);
      bind('[data-action="start"]',()=>changeStatus(sel.id,'active'));
      bind('[data-action="pause"]',()=>changeStatus(sel.id,'paused'));
      bind('[data-action="end"]',()=>{if(confirm('Сигурни ли сте, че искате да приключите сесията?'))changeStatus(sel.id,'ended')});
      bind('[data-action="csv"]',()=>{const cur=teacherSnapshot||{sel,rows,answers};downloadCSV(cur.sel,cur.rows,cur.answers)});
      $('#sessions').addEventListener('change',e=>{teacherSessionId=e.target.value;localStorage.setItem('digital8_selected_session',teacherSessionId);teacher()});
      teacherSnapshot={sel,rows,answers,teamVotes};
       const box=$('.two .stack > .panel');if(box)box.insertAdjacentHTML('beforeend','<p id="sync-state" class="live-meta">● Данните се обновяват незабележимо</p>');
       startPolling(()=>{if(qs('teacher')!==null && teacherSessionId===sel.id)return refreshTeacherStats(sel.id)},6000);
    }catch(err){errorPage('Учителският панел: '+err.message,'/?teacher=1')}
  }

  // Live update: never re-render the complete page just to refresh statistics.
  function setSyncState(failed=false){
    const el=$('#sync-state');
    if(el)el.textContent=failed?'Временно няма връзка · нов опит след малко':'● Последна синхронизация '+new Date().toLocaleTimeString('bg-BG',{hour:'2-digit',minute:'2-digit'});
  }
  function updateBar(el,n,total){
    if(!el)return;
    const label=el.querySelector('.line-head span');
    const fill=el.querySelector('.bar span');
    if(label)label.textContent=n+'/'+total;
    if(fill)fill.style.width=(total?Math.round(n/total*100):0)+'%';
  }
  async function refreshTeacherStats(sid){
    const numbers=$$('.two .three .stat b');
    if(qs('teacher')===null||teacherSessionId!==sid||numbers.length<3)return;
    try{
      const [participants,answers]=await Promise.all([
        db('participants','select=id,nickname,team_name,reflection,finished_at,last_seen_at&session_id=eq.'+sid),
        db('answers','select=participant_id,mission,step,solved,points,wrong_choices&session_id=eq.'+sid)
      ]);
      if(qs('teacher')===null||teacherSessionId!==sid||!numbers[0].isConnected)return;
      const rows=participants.map(p=>{
        const as=answers.filter(a=>a.participant_id===p.id);
        return {...p,completed:as.filter(a=>a.solved).length,total:as.reduce((v,a)=>v+Number(a.points||0),0)}
      });
      const teamVotes=teacherSnapshot.sel.team_mode?await db('team_votes','select=team_name,mission,choice_id&session_id=eq.'+sid):[];
      teacherSnapshot={sel:teacherSnapshot.sel,rows,answers,teamVotes};
      const teams=$('#teacher-teams');
      if(teams)teams.innerHTML=teamStatsMarkup(rows,teamVotes);
      const n=rows.length,avg=n?Math.round(rows.reduce((v,p)=>v+p.total,0)/n):0;
      const overall=n?Math.round(rows.reduce((v,p)=>v+p.completed,0)/(n*20)*100):0;
      numbers[0].textContent=n;
      numbers[1].textContent=rows.filter(p=>p.completed===20).length;
      numbers[2].textContent=avg;
      const box=$('.two .stack > .panel');
      if(box){
        const title=box.querySelector('h3'),fill=box.querySelector('.bar span');
        if(title)title.textContent='Общ напредък: '+overall+'%';
        if(fill)fill.style.width=overall+'%';
        const bars=box.querySelectorAll('.progressline');
        missions.forEach((m,i)=>updateBar(bars[i],rows.filter(p=>p.completed>=m.id*4).length,n));
      }
      const list=$('.teacher-users');
      if(list){
        const markup=rows.length?rows.map(p=>'<div class="teacher-user"><span class="avatar">◈</span><div style="flex:1"><b>'+safe(p.nickname)+'</b><div class="tiny">'+p.completed+'/20 задачи</div></div><strong>'+p.total+' т.</strong></div>').join(''):'<p class="muted">Още няма присъединили се ученици.</p>';
        if(list.innerHTML!==markup)list.innerHTML=markup;
      }
      const wrongs={};answers.forEach(a=>(a.wrong_choices||[]).forEach(c=>{const key=a.mission+'.'+a.step;wrongs[key]=(wrongs[key]||0)+1}));
      const frequent=Object.entries(wrongs).sort((a,b)=>b[1]-a[1]).slice(0,3).map(([key,count])=>{const [mi,si]=key.split('.').map(Number);return '<li>'+safe(missions[mi-1].steps[si-1].title)+' — '+count+' грешни опита</li>'}).join('')||'<li class="muted">Все още няма регистрирани грешки.</li>';
      const analysis=$('.two.section > .panel:nth-child(2)');
      if(analysis){
        const ol=analysis.querySelector('ol');
        if(ol&&ol.innerHTML!==frequent)ol.innerHTML=frequent;
        const refs=analysis.querySelectorAll('.fake-row b');
        ['Поверителност','Групи','Споделени файлове','Анкети','Онлайн поведение'].forEach((name,i)=>{if(refs[i])refs[i].textContent=rows.filter(p=>p.reflection===name).length});
      }
      setSyncState();
    }catch(e){setSyncState(true)}
  }
  async function refreshDisplayStats(sid){
    const stats=$$('.display-mode .three .stat b');
    if(qs('display')!==sid||stats.length<3)return;
    try{
      const [sessions,p,a]=await Promise.all([
        db('game_sessions','select=status&id=eq.'+encodeURIComponent(sid)),
        db('participants','select=id,team_name&session_id=eq.'+encodeURIComponent(sid)),
        db('answers','select=participant_id,mission,solved,points&session_id=eq.'+encodeURIComponent(sid))
      ]);
      if(qs('display')!==sid||!stats[0].isConnected||!sessions.length)return;
      const n=p.length;
      const joinEl=$('#display-join');
      if(joinEl)joinEl.hidden=sessions[0].status!=='lobby';
      stats[0].textContent=n;
      stats[1].textContent=(n?Math.round(a.filter(x=>x.solved).length/(n*20)*100):0)+'%';
      stats[2].textContent=({lobby:'Чакалня',active:'В ход',paused:'Пауза',ended:'Край'})[sessions[0].status]||sessions[0].status;
      const bars=$$('.display-mode .progressline');
      missions.forEach((m,i)=>updateBar(bars[i],p.filter(x=>a.filter(y=>y.participant_id===x.id&&y.solved&&y.mission<=m.id).length>=m.id*4).length,n));
      const panel=$('#display-team-cards');
      if(panel){const votes=await db('team_votes','select=team_name,mission,choice_id&session_id=eq.'+sid);const rows=p.map(item=>({...item,completed:a.filter(y=>y.participant_id===item.id&&y.solved).length,total:a.filter(y=>y.participant_id===item.id).reduce((v,y)=>v+Number(y.points||0),0)}));panel.innerHTML=teamStatsMarkup(rows,votes)}
      setSyncState();
    }catch(e){setSyncState(true)}
  }
  function progress(title,done,total){const pct=total?Math.round(done/total*100):0;return '<div class="progressline"><div class="line-head"><strong>'+safe(title)+'</strong><span>'+done+'/'+total+'</span></div><div class="bar"><span style="width:'+pct+'%"></span></div></div>'}
  function refsStats(rows){const opts=['Поверителност','Групи','Споделени файлове','Анкети','Онлайн поведение'];const counts=opts.map(x=>rows.filter(p=>p.reflection===x).length);return opts.map((x,i)=>'<div class="fake-row"><span>'+x+'</span><b>'+counts[i]+'</b></div>').join('')}
  function joinLink(code){return location.origin+'/?join='+encodeURIComponent(code)}
  function teacherEmpty(){root.innerHTML='<div class="narrow">'+head('УЧИТЕЛСКИ ПАНЕЛ')+'<div class="panel center"><h2>Създай класна сесия</h2><p class="muted">След създаването ще получиш код и QR за всеки телефон.</p>'+btn('Нова сесия','create','primary full')+'<p></p>'+btn('Изход','logout','ghost')+'</div></div>';bind('[data-action="create"]',createSession);bind('[data-action="logout"]',()=>{localStorage.removeItem(authKey);teacherLogin()})}
  async function createSession(){
    const dialog=document.createElement('dialog');dialog.className='create-dialog';
    dialog.innerHTML='<form id="new-session-form" class="create-session-form"><p class="eyebrow">НОВА КЛАСНА СЕСИЯ</p><h2>Настрой урока</h2>'+
    '<div class="formrow"><label for="session-title">Заглавие</label><input id="session-title" maxlength="70" value="Ден на идеите" required></div>'+
    '<fieldset class="team-modes"><legend>Начин на работа</legend><label class="mode-choice"><input type="radio" name="session-mode" value="teams" checked><span><b>👥 С отбори</b><small>Всеки има собствен телефон и решава задачи. След всяка мисия отборите обсъждат и гласуват.</small></span></label>'+
    '<label class="mode-choice"><input type="radio" name="session-mode" value="solo"><span><b>◎ Самостоятелно</b><small>Пет мисии и общ напредък на класа, без отборни гласувания.</small></span></label></fieldset>'+
    '<div class="actions"><button class="btn primary" type="submit">Създай сесия</button><button class="btn ghost" type="button" id="cancel-session">Отказ</button></div></form>';
    root.appendChild(dialog);
    dialog.addEventListener('close',()=>dialog.remove(),{once:true});
    dialog.querySelector('#cancel-session').onclick=()=>dialog.close();
    dialog.addEventListener('click',e=>{if(e.target===dialog)dialog.close()});
    dialog.querySelector('form').onsubmit=async(e)=>{
      e.preventDefault();
      const submit=dialog.querySelector('button[type="submit"]');submit.disabled=true;
      try{
        const title=dialog.querySelector('#session-title').value.trim().slice(0,70)||'Ден на идеите';
        const teamMode=dialog.querySelector('input[name="session-mode"]:checked').value==='teams';
        const rows=await db('game_sessions','','POST',{title,class_label:'8. клас',team_mode:teamMode});
        if(!rows||!rows[0])throw Error('Създаването на сесия не успя');
        teacherSessionId=rows[0].id;
        localStorage.setItem('digital8_selected_session',teacherSessionId);
        dialog.close();teacher();
      }catch(err){toast(err.message);submit.disabled=false}
    };
    dialog.showModal();
  }
  async function changeStatus(sid,status){
    try{
      const data={status};
      if(status==='active')data.started_at=new Date().toISOString();
      if(status==='ended')data.ended_at=new Date().toISOString();
      await db('game_sessions','id=eq.'+sid,'PATCH',data);teacher();
    }catch(e){toast(e.message)}
  }
  function downloadCSV(s,rows,answers){
    const toCSV=(x)=>'"'+String(x==null?'':x).replaceAll('"','""')+'"';
    const header=['Псевдоним','Отбор','Завършени задачи','Точки','Самооценка'];
    const lines=[header,...rows.map(x=>[x.nickname,x.team_name||'',x.completed,x.total,x.reflection||''])].map(line=>line.map(toCSV).join(';'));
    const blob=new Blob(['\uFEFF'+lines.join('\r\n')],{type:'text/csv;charset=utf-8'});
    const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='digital-team-8-'+s.code+'.csv';a.click();URL.revokeObjectURL(a.href);
  }
  function teacherLogin(){
    clearInterval(timer);timer=null;
    root.innerHTML='<div class="narrow">'+head('ДОСТЪП ЗА УЧИТЕЛ')+'<section class="panel"><p class="eyebrow">ЗАЩИТЕН ПАНЕЛ</p><h2>Вход за учител</h2><p class="muted">Използвай учителски акаунт. Ученически акаунти не са необходими.</p><form id="teacher-login"><div class="formrow"><label>Имейл</label><input id="email" type="email" autocomplete="username" required placeholder="teacher@example.com"></div><div class="formrow"><label>Парола (мин. 6 знака)</label><input id="pass" type="password" minlength="6" autocomplete="current-password" required></div><div class="actions"><button type="submit" class="btn primary">Вход</button><button type="button" id="signup" class="btn ghost">Регистрация на учител</button></div></form><p class="tiny section">При нова регистрация може да е необходимо потвърждение на имейла.</p></section>'+foot()+'</div>';
    async function submit(signup){
      const email=$('#email').value.trim(),pass=$('#pass').value;
      if(!email||pass.length<6){toast('Въведете валиден имейл и парола поне 6 знака');return}
      try{
        const ok=await login(email,pass,signup);
        if(ok){teacher()}else toast('Проверете имейла си за потвърждение, след това влезте.');
      }catch(e){toast(e.message)}
    }
    $('#teacher-login').onsubmit=e=>{e.preventDefault();submit(false)};
    $('#signup').onclick=()=>submit(true);
  }
  async function display(){
    clearInterval(timer);
    const jwt=await getJWT();if(!jwt){errorPage('Този екран е достъпен само за влязъл учител.','/?teacher=1');return}
    const id=qs('display');if(!id){errorPage('Не е избрана сесия.','/?teacher=1');return}
    try{
      const s=await db('game_sessions','select=*&id=eq.'+encodeURIComponent(id));
      if(!s||!s.length)throw Error('Сесията не съществува или нямате право да я отворите');
      const p=await db('participants','select=id,team_name&session_id=eq.'+encodeURIComponent(id));
      const a=await db('answers','select=participant_id,mission,solved,points&session_id=eq.'+encodeURIComponent(id));
      const voting=s[0].team_mode?await db('team_votes','select=team_name,mission,choice_id&session_id=eq.'+encodeURIComponent(id)):[];
      const total=p.length;
      const completed=(id)=>a.filter(x=>x.mission===id&&x.solved).length;
      const whoDone=(i)=>p.filter(x=>a.filter(y=>y.participant_id===x.id&&y.solved&&y.mission<=i).length>=i*4).length;
      const percentage=total?Math.round(a.filter(x=>x.solved).length/(total*20)*100):0;
      root.innerHTML='<div class="display-mode"><p class="eyebrow">8. КЛАС · ИНФОРМАЦИОННИ ТЕХНОЛОГИИ</p><h1>МИСИЯ:<br><span class="accent">ДИГИТАЛЕН ЕКИП</span></h1><p class="lead">Заедно организираме „Деня на идеите“</p><div id="display-join" class="display-join panel" '+(s[0].status==='lobby'?'':'hidden')+'><div class="display-code-wrap"><p class="eyebrow">СКАНИРАЙ И ИГРАЙ</p><h2>Влез от своя телефон</h2><p class="muted">Използвай QR кода или въведи кода на сесията.</p><div class="code">'+safe(s[0].code)+'</div></div><div class="big-qr" id="display-qr"></div></div><div class="three section"><div class="panel stat"><b>'+total+'</b><small>Присъединени ученици</small></div><div class="panel stat"><b>'+percentage+'%</b><small>Общ напредък</small></div><div class="panel stat"><b>'+safe(s[0].status==='lobby'?'Чакалня':s[0].status==='active'?'В ход':s[0].status==='paused'?'Пауза':'Край')+'</b><small>Състояние</small></div></div><section class="panel"><h2>Напредък по мисии</h2>'+missions.map(m=>progress(m.id+'. '+m.title,whoDone(m.id),total)).join('')+'</section><p class="center tiny section">Показва се само общият напредък. Индивидуални имена и оценки не се прожектират.</p></div>';
      if(window.QRCode&&$('#display-qr')){new window.QRCode($('#display-qr'),{text:joinLink(s[0].code),width:244,height:244,colorDark:'#262546',colorLight:'#ffffff'})}
      if(s[0].team_mode){const v=p.map(item=>({...item,completed:a.filter(x=>x.participant_id===item.id&&x.solved).length,total:a.filter(x=>x.participant_id===item.id).reduce((v,x)=>v+Number(x.points||0),0)}));const displayCard=$('.display-mode > section.panel');if(displayCard)displayCard.insertAdjacentHTML('afterend','<section class="panel section"><h2>Отборен напредък</h2><div id="display-team-cards">'+teamStatsMarkup(v,voting)+'</div></section>')}
      const box=$('.display-mode > section.panel');if(box)box.insertAdjacentHTML('beforeend','<p id="sync-state" class="live-meta">● Данните се обновяват незабележимо</p>');
       startPolling(()=>{if(qs('display')===id)return refreshDisplayStats(id)},6000);
    }catch(e){errorPage(e.message,'/?teacher=1')}
  }
  async function render(){
    clearInterval(timer);timer=null;
    if(!missions.length){spinner('Зареждаме мисии…');return}
    if(qs('teacher')!==null)return teacher();
    if(qs('display')!==null)return display();
    if(qs('play')!==null)return play();
    if(qs('join')!==null)return join();
    return home();
  }
  window.addEventListener('popstate',render);
  fetch('./missions.json',{cache:'no-cache'}).then(r=>{if(!r.ok)throw Error('Не може да се заредят учебните мисии');return r.json()}).then(data=>{
    if(data.length!==5||data.some(m=>m.steps.length!==4))throw Error('Непълен комплект учебни мисии');
    missions=data;render();
  }).catch(e=>{root.innerHTML='<div class="narrow"><section class="panel"><h2>Грешка при зареждане</h2><p>'+safe(e.message)+'</p></section></div>'});
})();
