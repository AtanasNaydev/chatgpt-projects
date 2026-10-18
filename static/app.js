/* МИСИЯ 404 — vanilla JS client, no CDN/dependencies */
'use strict';
const app = document.getElementById('app');
const PREFIX = 'm404_';
const ui = {
  teacherKey: localStorage.getItem(PREFIX+'teacher')||'', token: localStorage.getItem(PREFIX+'player')||'',
  code: new URLSearchParams(location.search).get('code')||'', joined: null, selectedTeam:'',
  mission1:{}, mission3:{}, mission4:{}, mission5:{}, typed:{},
  audio:localStorage.getItem(PREFIX+'audio')!=='off', teacherData:null, playData:null, lan:'', loading:false, creating:false, joinLookupRunning:false, joinLookupDone:false,
  teacherViewStamp:null, playViewStamp:null, healthChecked:false
};
const sceneNames=['Изчезналият файл','Синхронизирай екипа','Невъзможната среща','Опасната връзка','Финално отключване'];
const missionDescriptions=[
 'Възстановете достъпа до инструментите на дигиталния екип.',
 'Съберете различните си улики в един общ документ.',
 'Намерете единствения час, удобен за всички участници.',
 'Спрете опасното споделяне на документи.',
 'Изберете технологиите и отключете конференцията.'
];
const toolOptions=[['docs','Съвместен документ'],['ideas','Визуална дъска за идеи'],['schedule','Анкета за график'],['webinar','Видеоконференция'],['storage','Облачно хранилище с права'],['chat','Екипен чат / канал']];
const m1Needs=[
  [
    "archive",
    "След уебинара участниците трябва да намерят окончателните версии на презентациите и да имат достъп само до разрешените файлове."
  ],
  [
    "review",
    "Учител и ученик трябва да оставят коментари по конкретни абзаци на поканата, като се запази историята на редакциите."
  ],
  [
    "date",
    "Шестима гости предлагат различни часове; трябва да се съберат свободните им времеви интервали, без поредица от съобщения."
  ],
  [
    "meeting",
    "По време на откриването всички трябва да виждат презентацията и да задават въпроси в реално време."
  ],
  [
    "brainstorm",
    "Всеки отбор трябва да добавя идеи и да ги групира визуално, преди да изберете тема за дискусията."
  ],
  [
    "quick",
    "Десет минути преди началото модераторът трябва бързо да извести екипа за промяна на залата и да получи потвърждения."
  ]
];
// Deterministic per-session shuffle: answers do not follow the situation numbers.
function m1Options(key,code){
 const items=[...toolOptions];
 let seed=2166136261;
 for(const ch of key+'|'+code){seed^=ch.charCodeAt(0);seed=Math.imul(seed,16777619)>>>0;}
 for(let i=items.length-1;i>0;i--){seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;const j=(seed>>>0)%(i+1);[items[i],items[j]]=[items[j],items[i]];}
 return items;
}
const m4Needs=[
  [
    "organizer",
    "Координаторът подготвя програмата и трябва да пренарежда сесиите преди публикуване."
  ],
  [
    "teacher",
    "Преподавателят проверява фактите и предлага уточнения в коментари, но не променя текста."
  ],
  [
    "visitors",
    "Гостите трябва да отворят одобрената програма, без да могат да я променят."
  ],
  [
    "outsider",
    "Непознат акаунт е поискал достъп до чернова с имейли на участници."
  ],
  [
    "link",
    "Черновата съдържа контакти и непубликувани материали; линкът трябва да е достъпен само за изрично поканени хора."
  ],
  [
    "expert",
    "Външен експерт трябва да маркира неточности и да предложи корекции, без сам да заменя съдържание."
  ]
];
const m4Rights=[
 ['edit','Редактор — може да променя съдържанието'],
 ['comment','Коментатор — може да предлага промени'],
 ['view','Читател — само преглежда'],
 ['none','Без достъп — заявката е отказана'],
 ['restricted','Ограничен линк — само поканени хора'],
 ['public-view','Всеки с линка може да чете'],
 ['public-comment','Всеки с линка може да коментира'],
 ['public-edit','Всеки с линка може да редактира']
];
const m4Incidents=[
 ['backup','Възстановяваме последното копие, без да променяме настройките на линка.'],
 ['revoke','Ограничаваме споделянето и отнемаме достъпа на неупълномощения потребител.'],
 ['notify','Уведомяваме колегите, но оставяме правата непроменени до края на срещата.'],
 ['rename','Преименуваме файла и изпращаме нов линк със същите настройки.']
];
const m4Recovery=[
 ['copy','Запазваме текущата версия като окончателна, за да не изгубим редакциите.'],
 ['restore','Сравняваме историята на версиите и възстановяваме последното проверено съдържание.'],
 ['rewrite','Въвеждаме текста по памет, без да проверяваме историята на промените.'],
 ['delete','Изтриваме историята на редакциите, за да няма следи от инцидента.']
];
const m5Categories=[
  [
    "webinar",
    "Уебинар на живо: два лектора от разстояние представят слайдове, а гости задават въпроси. Организаторът трябва да контролира достъпа.",
    [
      [
        "record",
        "Публикуваме предварителен запис и събираме въпроси след края."
      ],
      [
        "moderated",
        "Провеждаме видеосреща с модератор, ограничен достъп, споделяне на екран и чат за въпроси."
      ],
      [
        "open",
        "Провеждаме видеосреща с публичен линк, в която всеки гост може да управлява представянето."
      ],
      [
        "hybrid",
        "Правим само видеовръзка между лекторите, а зрителите проследяват материалите и задават въпроси по имейл след края."
      ]
    ]
  ],
  [
    "docs",
    "Трима автори пишат една програма едновременно; преподавателят коментира, а външни хора не трябва да редактират.",
    [
      [
        "email-copies",
        "Всеки изпраща своя версия по имейл, а преподавателят избира последната получена."
      ],
      [
        "restricted-edit",
        "Използваме общ документ с права за конкретни редактори, коментатор и история на версиите."
      ],
      [
        "public-edit",
        "Използваме общ документ с достъп за редакция на всеки, който има линка."
      ],
      [
        "public-view",
        "Използваме общ документ, който всички могат да четат, но никой от авторите не може да редактира."
      ]
    ]
  ],
  [
    "files",
    "Гост-лектор трябва да изтегли един PDF. Само той трябва да получи достъп, без да вижда чернови или лични данни.",
    [
      [
        "whole-folder",
        "Даваме достъп за четене до цялата папка, включително подготвителните чернови."
      ],
      [
        "only-pdf",
        "Споделяме само одобрения PDF с права за преглед за конкретния лектор."
      ],
      [
        "edit-everyone",
        "Даваме права за редакция на папката, за да може лекторът сам да намери файла."
      ],
      [
        "send-credentials",
        "Изпращаме самия одобрен PDF в публична папка, която всеки с линка може да разглежда."
      ]
    ]
  ],
  [
    "feedback",
    "След уебинара трябва да съберете анонимна оценка за организацията и да обобщите резултатите без публични лични данни.",
    [
      [
        "named-survey",
        "Създаваме форма с анонимни отговори, но изискваме имейл за потвърждаване на участието."
      ],
      [
        "public-wall",
        "Пускаме публична стена, в която участниците пишат свободни коментари под имената си."
      ],
      [
        "chat-replies",
        "Молим участниците да изпратят оценки в групов чат, а модераторът брои съобщенията."
      ],
      [
        "anonymous-form",
        "Създаваме анонимна анкета с обобщени резултати, достъпни само за организаторите."
      ]
    ]
  ]
];
// Same scenario gets a stable permutation in every browser, independent of row number.
function shuffledChoices(items,key,sessionCode){
 const list=[...items];let n=0x811c9dc5;
 for(const ch of String(key)+'|'+String(sessionCode)){n^=ch.charCodeAt(0);n=Math.imul(n,0x01000193)>>>0;}
 for(let i=list.length-1;i>0;i--){n^=n<<13;n^=n>>>17;n^=n<<5;const j=(n>>>0)%(i+1);[list[i],list[j]]=[list[j],list[i]];}
 return list;
}
const calSlots=[['mon14','Пон. 14:00'],['mon15','Пон. 15:00'],['tue14','Вт. 14:00'],['tue15','Вт. 15:00'],['wed14','Ср. 14:00'],['wed15','Ср. 15:00']];
const calPeople=[['Мария',['mon14','tue15','wed14']],['Иван',['tue14','tue15','wed15']],['Нина',['mon15','tue15','wed14']],['Георги',['tue15','wed14','wed15']],['Теодора',['mon14','tue15','wed15']]];
function esc(s=''){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function fmt(s){let n=Math.max(0,Math.floor(s));return String(Math.floor(n/60)).padStart(2,'0')+':'+String(n%60).padStart(2,'0');}
function statusText(s){return ({lobby:'Изчакване',running:'Активна',paused:'На пауза',finished:'Приключила'})[s]||s;}
function message(msg,error=false){const t=document.getElementById('toast');t.textContent=msg;t.className='toast show'+(error?' error':'');clearTimeout(message.timer);message.timer=setTimeout(()=>t.classList.remove('show'),4700);}
function audio(success=true){if(!ui.audio)return;try{const A=window.AudioContext||window.webkitAudioContext;const c=new A();let o=c.createOscillator(),g=c.createGain();o.connect(g);g.connect(c.destination);o.type='sine';o.frequency.value=success?720:210;g.gain.setValueAtTime(.03,c.currentTime);g.gain.exponentialRampToValueAtTime(.001,c.currentTime+.18);o.start();o.stop(c.currentTime+.18);o.onended=()=>c.close()}catch{}}
function go(path){history.pushState({},'',path);ui.typed={};ui.playData=null;ui.teacherData=null;refresh(true);window.scrollTo({top:0});}
function shell(inner,actions=''){return `<div class="shell${location.pathname==='/'?' slide':''}"><header class="topbar"><a class="brand" href="/" data-nav="/"><span class="brand-mark"></span>МИСИЯ 404 <span style="color:#7e9fb1">//</span> ДИГИТАЛЕН ХАОС</a><nav class="navright">${actions}<span class="tag">ИТ · 10. КЛАС</span></nav></header>${inner}<footer class="foot">МИСИЯ 404 · Практическо упражнение · Дигитално сътрудничество · Напредъкът се запазва автоматично</footer></div>`;}
function btn(action,text,klass='ghost',extra=''){return `<button class="btn ${klass}" data-act="${action}" ${extra}>${text}</button>`;}
function progress(num){return `<div class="steps">${sceneNames.map((name,i)=>`<span class="step ${i+1<num?'done':i+1===num?'active':''}" title="${esc(name)}">${i+1<num?'✓ ':''}${i+1}</span>`).join('')}</div>`;}
function renderLanding(){app.innerHTML=shell(`<section class="hero"><div class="glow-orb"></div><span class="eyebrow">ПРАКТИЧЕСКА МИСИЯ · 40 МИНУТИ · 5 ПРЕДИЗВИКАТЕЛСТВА</span><h1>МИСИЯ <span>404</span><br>Дигитален хаос</h1><p class="lead">Международната онлайн конференция на училището е пред провал. Само дигитален екип, който умее да работи заедно, може да възстанови организацията.</p><div class="hero-actions"><a data-nav="/join" href="/join" class="btn primary large">▣ &nbsp; Присъедини се към мисия</a><a data-nav="/teacher" href="/teacher" class="btn ghost large">⌘ &nbsp; Панел за учителя</a></div></section>
<section class="section"><h2>Пет мисии. Един отбор. Един финален код.</h2><p class="subtle">Използвайте знанията си, за да изберете най-подходящите средства за дигитално сътрудничество.</p></section><div class="cards">${sceneNames.map((n,i)=>`<div class="card"><span class="eyebrow">МИСИЯ 0${i+1}</span><h3 class="card-title">${n}</h3><p class="subtle">${missionDescriptions[i]}</p></div>`).join('')}</div><section class="card emphasis" style="margin-top:21px"><span class="eyebrow">ОПЕРАЦИЯ: ДИГИТАЛНО СЪТРУДНИЧЕСТВО</span><h3 class="card-title">Как се печели?</h3><p class="subtle">Обсъждайте решенията, работете едновременно в общ документ и проверявайте правата за споделяне. Съберете петте цифри, за да отключите конференцията. Не е достатъчно само да знаете определенията!</p></section>`);}
async function api(path,body,mode='none'){
  let headers={'Accept':'application/json'};
  if(body!==undefined)headers['Content-Type']='application/json';
  if(mode==='teacher')headers['X-Teacher-Key']=ui.teacherKey;
  if(mode==='student')headers['X-Player-Token']=ui.token;
  let response;
  try{response=await fetch('/api/'+path,{method:body===undefined?'GET':'POST',headers,body:body===undefined?undefined:JSON.stringify(body),cache:'no-store'});}catch{throw Error('Няма връзка със сървъра. Проверете дали приложението е стартирано.');}
  let data;try{data=await response.json();}catch{throw Error('Неочакван отговор от сървъра.');}
  if(!response.ok||data.ok===false&&data.error)throw Error(data.error||'Грешка в заявката.');
  return data;
}
function login(){app.innerHTML=shell(`<section class="mission-head"><span class="eyebrow">СЕКТОР: УПРАВЛЕНИЕ</span><h1>Учителски контролен център</h1><p>Въведете личния учителски код. При онлайн хостинг кодът се задава в настройките на Render и не трябва да се споделя с учениците.</p></section><div class="card" style="max-width:560px"><div class="stack"><div><label class="field" for="teacher-key">Секретен учителски код</label><input id="teacher-key" class="input mono" type="password" placeholder="Учителски секретен код" autocomplete="off"></div>${btn('login','ОТВОРИ КОНТРОЛНИЯ ЦЕНТЪР','primary')}<p class="help">Кодът не е кодът за присъединяване на учениците. Не го показвайте на дъската.</p></div></div>`);}
function teacherSetUp(){const names=['АЛФА','БЕТА','ГАМА','ДЕЛТА','ОМЕГА','СИГМА','ТЕТА','ЗЕТА'];app.innerHTML=shell(`<section class="mission-head"><span class="eyebrow">УПРАВЛЕНИЕ НА СЕСИЯ</span><h1>Създайте нова мисия</h1><p>Изберете броя на отборите. Всяко дете се присъединява само с прякор.</p></section><div class="card" style="max-width:660px"><div class="stack"><div><label class="field">Брой отбори</label><select class="input" id="team-count">${[3,4,5,6,7,8].map(x=>`<option value="${x}" ${x===4?'selected':''}>${x} отбора</option>`).join('')}</select></div><div class="info">Имена по подразбиране: ${names.join(', ')}. Можете да ги преименувате в учителския панел преди старта.</div><label class="flex"><input type="checkbox" id="test-mode" style="accent-color:#5bedeb">Тестов режим — играта започва веднага за предварителна проверка</label>${btn('create','СЪЗДАЙ НОВА СЕСИЯ','primary')}<p class="help">При нова сесия предишните отбори и резултати се заменят. При нужда запазете резултатите, преди да създадете нова.</p></div></div>`,btn('logout','Изход','small ghost'));}
function reviewText(label,value){
  if(value===undefined||value===null||String(value).trim()==='')return '';
  return `<div class="review-text"><strong>${esc(label)}</strong><p>${esc(value)}</p></div>`;
}
function reviewPairs(rows){
  return `<div class="review-pairs">${rows.map(([label,val])=>`<div class="review-pair"><span>${esc(label)}</span><strong>${esc(val||'—')}</strong></div>`).join('')}</div>`;
}
function teacherMissionReview(t,m){
  const a=t.answers[String(m)];
  const attempts=Number(t.attempts?.[String(m)]||0);
  const hint=Array.isArray(t.hints)&&t.hints.includes(m);
  const badges=`<div class="review-tags">${attempts?`<span class="tag amber">${attempts} грешни опита</span>`:''}${hint?'<span class="tag amber">Използвана подсказка</span>':''}</div>`;
  if(!a)return `<div class="review-mission"><div class="flex between"><strong>Мисия ${m}: ${esc(sceneNames[m-1])}</strong><span class="tag">Предстои</span></div>${badges}</div>`;
  if(a.skipped)return `<div class="review-mission"><div class="flex between"><strong>Мисия ${m}: ${esc(sceneNames[m-1])}</strong><span class="tag amber">Пропусната</span></div>${badges}</div>`;
  const e=a.evidence||{};
  let body='';
  if(m===1){
    body=reviewPairs(m1Needs.map(([id,description],i)=>[
      `Ситуация ${i+1}: ${description}`,
      (toolOptions.find(([value])=>value===(e.mapping||{})[id])||[])[1]||'—'
    ]))+reviewText('Аргументация за двата инструмента',e.reason)+reviewText('Сравнение с неподходящ вариант',e.contrast);
  }else if(m===2){
    const fields=[['title','Тема на събитието'],['audience','Аудитория'],['program','Програма'],['tools','Инструменти'],['roles','Разпределение на ролите'],['fallback','Резервен план']];
    body=fields.map(([id,title])=>reviewText(title,(e.doc||{})[id])).join('');
    if(Array.isArray(e.comments)&&e.comments.length)body+=`<div class="review-text"><strong>Коментари на екипа</strong>${e.comments.map(c=>`<p><b>${esc(c.nickname||'Ученик')}:</b> ${esc(c.body||'')} ${c.applied?'✓ Приложено':'• Предложение'}</p>`).join('')}</div>`;
    body+=`<div class="review-note">Участници с редакции: ${Number(e.participants||0)} от ${t.players.length}</div>`;
  }else if(m===3){
    const slot=(calSlots.find(([id])=>id===e.slot)||[])[1]||e.slot;
    body=reviewPairs([['Избран час',slot],['Инструмент за съгласуване',e.tool],['План за отсъстващ участник',e.backup==='record'?'Материали и последващи въпроси':e.backup||'—']])+reviewText('Обяснение',e.reason);
  }else if(m===4){
    const rows=m4Needs.map(([key,label])=>[label,(m4Rights.find(([id])=>id===(e.rights||{})[key])||[])[1]||'—']);
    rows.push(['Незабавна реакция', (m4Incidents.find(([id])=>id===e.incident)||[])[1]||e.incident||'—']);
    rows.push(['Възстановяване', (m4Recovery.find(([id])=>id===e.recovery)||[])[1]||e.recovery||'—']);
    body=reviewPairs(rows)+reviewText('Риск и мерки за защита',e.risk);
  }else if(m===5){
    const rows=m5Categories.map(([key,label,choices])=>[
      label,(choices.find(([id])=>id===(e.choices||{})[key])||[])[1]||(e.choices||{})[key]||'—'
    ]);
    rows.push(['Участник със слаба връзка',e.fallback==='async'?'Защитен асинхронен достъп и писмени въпроси':e.fallback||'—']);
    body=reviewPairs(rows)+reviewText('Обосновка №1',e.reason1)+reviewText('Обосновка №2',e.reason2)+reviewText('Сравнение с алтернатива',e.tradeoff);
  }
  return `<details class="review-mission"><summary><span><strong>Мисия ${m}: ${esc(sceneNames[m-1])}</strong></span><span class="tag green">✓ ${a.points} т.</span></summary><div class="review-mission-body">${badges}${body}</div></details>`;
}
function teacherPage(){const s=ui.teacherData?.session;if(!s){teacherSetUp();return;}
const expanded=new Set([...app.querySelectorAll('details[data-team-details][open]')].map(el=>el.dataset.teamDetails));
const teams=[...s.teams].sort((a,b)=>b.score-a.score||(a.finished_at||Infinity)-(b.finished_at||Infinity));const count=teams.reduce((a,t)=>a+t.players.length,0);
const base=ui.lan?`http://${ui.lan}:${location.port||'8765'}`:location.origin;
const joinLink=`${base}/join?code=${s.code}`;
const actions=s.status==='lobby'?btn('start','▶ СТАРТ','primary'):s.status==='running'?btn('pause','Ⅱ ПАУЗА','gold'):s.status==='paused'?btn('resume','▶ ПРОДЪЛЖИ','primary'):'';
const extra=s.status==='running'||s.status==='paused'?btn('finish','■ ПРИКЛЮЧИ','red'):'';
app.innerHTML=shell(`<section class="mission-head"><span class="eyebrow">КОНТРОЛЕН ЦЕНТЪР · ${s.test_mode?'ТЕСТОВА СЕСИЯ':'УЧЕБНА СЕСИЯ'}</span><h1>Команден пункт</h1><p>Тук се показват отборите, точките и напредъкът им. Обновяване на всеки 2,5 секунди.</p></section>
<div class="statrow"><div class="stat"><div class="name">Код за ученици</div><div class="value" style="color:var(--amber);letter-spacing:2px">${s.code}</div></div><div class="stat"><div class="name">Оставащо време</div><div class="value">${fmt(s.duration-s.elapsed)}</div></div><div class="stat"><div class="name">Участници</div><div class="value">${count}</div></div><div class="stat"><div class="name">Статус</div><div class="value" style="font-size:23px">${statusText(s.status)}</div></div></div>
<div class="spread" style="margin-top:18px"><div class="card emphasis"><span class="eyebrow">КОД ЗА ПРИСЪЕДИНЯВАНЕ</span><h3 class="card-title">Дайте адреса на учениците</h3><div class="teacher-join-card"><div class="teacher-join-data"><span class="session-link">${esc(joinLink)}</span><p class="help">Код за въвеждане: <b class="mono">${esc(s.code)}</b></p><div class="flex" style="margin-top:12px">${btn('copy-link','⧉ КОПИРАЙ ВРЪЗКАТА','ghost small')}${btn('copy-code','⧉ КОПИРАЙ КОДА','ghost small')}</div><p class="help">Учениците отварят показания HTTPS адрес през интернет и избират отбор. Не споделяйте секретния код на учителя.</p></div><div class="teacher-qr"><img src="/qr.svg?code=${encodeURIComponent(s.code)}" alt="QR код за включване в играта" width="176" height="176" loading="lazy"><small>Сканирайте за директно присъединяване</small></div></div></div><div class="card"><span class="eyebrow">КОНТРОЛ НА ЧАСА</span><div class="clock-large">${fmt(s.duration-s.elapsed)}</div><div class="flex" style="justify-content:center;margin-top:13px">${actions}${extra}</div><div class="flex" style="justify-content:center;margin-top:14px">${btn('reset','↻ НУЛИРАЙ','ghost small')}${btn('new-session','＋ НОВА СЕСИЯ','ghost small')}</div></div></div>
<section class="section"><h2>Класиране и напредък</h2></section><div class="card"><div style="overflow:auto"><table class="team-table"><thead><tr><th>#</th><th>Отбор</th><th>Членове</th><th>Мисия</th><th>Напредък</th><th>Точки</th><th>Действия</th></tr></thead><tbody>${teams.map((t,i)=>`<tr><td><div class="rank">${i+1}</div></td><td><strong>${esc(t.name)}</strong></td><td>${t.players.map(p=>`<span class="user-chip" title="${p.online?'Онлайн':'Неактивен'}">${p.online?'<span class="signal"></span>':''}${esc(p.nickname)}</span>`).join(' ')||'<span class="subtle">—</span>'}</td><td>${t.finished_at?'✓ Финал':t.current>5?'Код':t.current+'/5'}</td><td style="min-width:135px"><div class="progress"><i style="width:${Math.min(100,(t.current-1)*20)}%"></i></div></td><td><strong style="color:var(--cyan)">${t.score}</strong></td><td>${s.status==='lobby'?`<button class="btn small ghost" data-act="rename" data-team="${t.id}">Име</button>`:''} ${t.current<=5&&s.status!=='finished'?`<button class="btn small ghost" data-act="skip" data-team="${t.id}">Пропусни</button>`:''}</td></tr>`).join('')}</tbody></table></div><p class="help">Всяка нова мисия носи до 60 автоматични и до 40 учителски точки. Максимум 500 точки за петте мисии.</p></div>
<section class="section"><h2>Отговори и педагогическа проверка</h2><p class="subtle">Изберете отбор и разгънете завършените мисии, за да видите решенията, аргументацията, грешните опити и използваните подсказки.</p></section><div class="card"><p class="subtle" style="margin-bottom:12px">Автоматичната проверка дава до 60 точки за решенията. Учителят дава до 40 точки за качество на обосновките. Не оценявайте само дължината на текста.</p>${teams.map(t=>`<details data-team-details="${esc(t.id)}" style="border-top:1px solid #38566d;padding:12px 0"><summary style="cursor:pointer;font-weight:bold">${esc(t.name)} · ${t.score} т. · ${Object.keys(t.answers).length}/5 мисии</summary><div class="stack" style="margin-top:12px">${[1,2,3,4,5].map(m=>teacherMissionReview(t,m)).join('')}</div></details>`).join('')}</div>
<div class="foot-note">Сигурност: секретният код е необходим за този екран. Не го споделяйте с учениците. Играта е публикувана онлайн, като резултатите се запазват в базата данни.</div>`,btn('logout','Изход','small ghost'));
ui.joinLink=joinLink;
app.querySelectorAll('details[data-team-details]').forEach(el=>{if(expanded.has(el.dataset.teamDetails))el.open=true;});
}
function joinPage(){const data=ui.joined;app.innerHTML=shell(`<section class="mission-head"><span class="eyebrow">ДОСТЪП ДО МИСИЯТА</span><h1>Присъедини се към екипа</h1><p>Работете заедно. Всеки участник трябва да има собствен компютър и да избере същия отбор.</p></section><div class="card" style="max-width:730px"><div class="stack"><div><label class="field">Шестсимволен код от учителя</label><div class="flex"><input id="game-code" class="input mono" maxlength="6" placeholder="напр. A7K3PN" value="${esc(ui.code)}" style="flex:1;letter-spacing:2px;text-transform:uppercase">${btn('check-code','ПРОВЕРИ КОДА','primary')}</div></div>${data?`<div class="divider"></div><span class="eyebrow">ИЗБЕРИ ОТБОР</span><div class="two">${data.teams.map(t=>`<button class="select-team ${ui.selectedTeam===t.id?'active':''}" data-act="choose-team" data-team="${t.id}" ${t.full?'disabled':''}><strong>${esc(t.name)}</strong><small>${t.full?'Отборът е пълен':`${t.count}/4 участници`}</small></button>`).join('')}</div><div><label class="field">Твоят прякор (без фамилия)</label><input class="input" id="nickname" placeholder="Например: Агент_7" maxlength="22" value="${esc(ui.typed.nickname||'')}"></div>${btn('join','ВЛЕЗ В МИСИЯТА','gold',ui.selectedTeam?'':'disabled')}<p class="help">Ако играта вече е стартирала, ще се включиш в текущия напредък на избрания отбор.</p>`:''}</div></div>`,ui.token?`<a href="/play" data-nav="/play" class="btn small ghost">Към моята игра</a>`:'');}
function playHeader(d){return `<section class="mission-head"><div class="flex between"><span class="eyebrow">ОТБОР ${esc(d.team.name)} · АГЕНТ ${esc(d.me.nickname)}</span><span class="tag ${d.session.status==='running'?'green':'amber'}">${statusText(d.session.status)}</span></div><h1>МИСИЯ 404 <span style="color:var(--cyan)">/ ОПЕРАЦИЯ</span></h1><div class="flex between" style="margin-top:18px"><div>${progress(d.team.current)}</div><div class="timer">◷ ${fmt(d.session.duration-d.session.elapsed)}</div></div><div class="flex between" style="margin-top:16px"><span class="tag">Точки: <strong data-team-score>${d.team.score}</strong></span><span class="tag">Екип: <strong data-player-count>${d.players.length}</strong>/4 участници</span></div></section>`;}
function missionFrame(d,m,content){return playHeader(d)+`<div class="card emphasis"><div class="flex between"><span class="eyebrow">МИСИЯ 0${m} / 05</span><span class="tag amber">Максимум 100 точки</span></div><h2 style="font-size:clamp(23px,3.2vw,34px);margin:8px 0">${sceneNames[m-1]}</h2><p class="subtle">${missionDescriptions[m-1]}</p></div><div style="height:20px"></div>${content}<div class="card" style="margin-top:15px"><div class="flex between"><div><strong>Нуждаеш се от помощ?</strong><p class="help">Една подсказка за мисия, –10 точки.</p></div>${btn('hint','◈ ПОДСКАЗКА','ghost small')}</div><div data-hint-content>${d.hint_texts[String(m)]?`<div class="info warning" style="margin-top:13px">${esc(d.hint_texts[String(m)])}</div>`:''}</div></div>`;}
function m1(d){let rows=m1Needs.map(([key,label],i)=>`<div class="challenge"><div><span class="kicker">СИТУАЦИЯ 0${i+1}</span><strong>${label}</strong></div><select class="input" data-choose="m1" data-id="${key}"><option value="">— Избери категория —</option>${m1Options(key,d.session.code).map(([value,txt])=>`<option value="${value}" ${ui.mission1[key]===value?'selected':''}>${txt}</option>`).join('')}</select></div>`).join('');return missionFrame(d,1,`<div class="card"><p class="instruction">Разгледайте шест реални проблема около конференцията. Изберете най-подходящия инструмент за всеки. Една категория може да е необходима повече от веднъж — сравнявайте възможностите, не номерата.</p><div class="mission-grid">${rows}</div><div class="divider"></div><label class="field">Посочете две ситуации и аргументирайте защо конкретни инструменти решават проблема.</label><textarea id="m1-reason" placeholder="За ситуация ... избираме ... защото ...; за ситуация ... избираме ... поради ...">${esc(ui.typed.m1||'')}</textarea><label class="field" style="margin-top:14px">Сравнение: защо друга привидно подходяща технология не върши същата работа?</label><textarea id="m1-contrast" placeholder="Чатът и общият документ си приличат, но ...">${esc(ui.typed.m1contrast||'')}</textarea><div class="flex" style="margin-top:17px">${btn('submit1','ПРОВЕРИ РЕШЕНИЕТО →','primary')}</div></div>`);}
function m2(d){const doc=d.m2.doc;const titles=[['title','Заглавие на конференцията'],['audience','За кого е предназначена?'],['program','Програма (3 теми)'],['tools','Дигитални средства за организация'],['roles','Роли и отговорности'],['fallback','Резервен план, ако видеовръзката прекъсне']];return missionFrame(d,2,`<div class="info" style="margin-bottom:17px"><strong>Тайна информация:</strong> Всеки ученик вижда само своята част от уликите. Разкажете си я и изгответе заедно общ план!</div><div class="doc-grid"><div class="card"><span class="eyebrow">СПОДЕЛЕН ОНЛАЙН ДОКУМЕНТ · ТРЕНИРОВЪЧЕН МОДУЛ</span><h3 class="card-title">План за училищен уебинар</h3><div class="stack">${titles.map(([id,title])=>`<div class="doc-field"><label>${title}</label><textarea data-field="${id}" placeholder="Екипът попълва това поле...">${esc(doc[id]?.value||'')}</textarea><div class="flex between"><small class="meta">${doc[id]?'Последна промяна: '+esc(doc[id].nickname):'Няма въведена информация'}</small><button class="btn small ghost" data-act="save-field" data-field="${id}">Запази промяната</button></div></div>`).join('')}</div></div><div class="stack"><div class="card emphasis"><span class="eyebrow">ТВОИТЕ УЛИКИ</span><p class="help" data-m2-clue-info style="margin-top:9px">${d.m2.team_size===1?
  'В момента си сам в отбора и виждаш всички '+d.m2.clues_total+' улики. Ако се присъединят съотборници, те ще бъдат разпределени автоматично.':
  'В отбора има '+d.m2.team_size+' участници. Виждаш '+d.m2.clues.length+' от общо '+d.m2.clues_total+' улики. Останалите са при съотборниците ти — разкажете си ги.'}</p><div data-m2-clues>${d.m2.clues.length?d.m2.clues.map(clue=>`<div class="info" style="margin-top:12px">${esc(clue)}</div>`).join(''):'<p class="help">Няма получена улика. Покани останалите.</p>'}</div><p class="help">Не можеш да видиш уликите на другите агенти — общувайте помежду си.</p></div><div class="card"><span class="eyebrow">ЧЛЕНОВЕ НА ЕКИПА</span><div class="stack" data-m2-members style="gap:8px;margin-top:10px">${d.players.map(pl=>`<div class="flex between"><span class="user-chip ${pl.nickname===d.me.nickname?'me':''}">${pl.online?'● ':''}${esc(pl.nickname)}</span><span class="subtle">${pl.contributions} редакции</span></div>`).join('')}</div><p class="help">Всеки член трябва да запази поне една промяна.</p></div><div class="card"><span class="eyebrow">КОМЕНТАРИ И ПОДОБРЕНИЯ</span><div data-m2-comments style="margin:12px 0">${d.m2.comments.map(c=>`<div class="chatmsg"><small>${esc(c.nickname)}</small><p>${esc(c.body)}</p>${c.applied?'<span class="tag green">✓ Приложено</span>':`<button class="btn small ghost" data-act="apply-comment" data-comment="${c.id}">Отбележи като приложено</button>`}</div>`).join('')||'<p class="help">Още няма коментари.</p>'}</div><textarea id="comment" placeholder="Предложение за подобрение..." style="min-height:74px"></textarea><div style="margin-top:9px">${btn('add-comment','ИЗПРАТИ КОМЕНТАР','ghost small')}</div></div></div></div><div class="card" style="margin-top:17px"><p class="help">Попълнете шестте полета. Всеки ученик записва поне една редакция, а екипът обсъжда и прилага едно предложение. Тогава натиснете проверка.</p><div class="flex" style="margin-top:13px">${btn('submit2','ПОТВЪРДИ СЪВМЕСТНАТА РАБОТА →','primary')}</div></div>`);}
function m3(d){const selected=ui.mission3.slot||'';return missionFrame(d,3,`<div class="card"><p class="instruction">Петима участници са посочили свободните си часове. Намерете <strong>единствения</strong> удобен час за всички и изберете инструмент за координиране на срещата.</p><div class="schedule"><table><thead><tr><th>Участник</th>${calSlots.map(v=>`<th>${v[1]}</th>`).join('')}</tr></thead><tbody>${calPeople.map(([name,slots])=>`<tr><td><strong>${name}</strong></td>${calSlots.map(([id])=>`<td class="${slots.includes(id)?'available':'off'}">${slots.includes(id)?'✓':'—'}</td>`).join('')}</tr>`).join('')}</tbody></table></div><span class="eyebrow">ИЗБЕРИ ОБЩИЯ ЧАС</span><div class="choices" style="margin:13px 0 22px">${calSlots.map(([slot,label])=>`<button class="choice ${selected===slot?'active':''}" data-act="choose-slot" data-slot="${slot}">${label}</button>`).join('')}</div><div class="formgrid"><div><label class="field">Инструмент за съгласуване на дата</label><select id="m3-tool" class="input" data-choose="m3-tool"><option value="">Избери инструмент</option>${['Padlet','Doodle','Google Docs','Paint'].map(x=>`<option ${ui.mission3.tool===x?'selected':''}>${x}</option>`).join('')}</select></div><div><label class="field">Защо този инструмент е подходящ?</label><textarea id="m3-reason" placeholder="Когато участниците имат различни графици...">${esc(ui.typed.m3||'')}</textarea></div></div><div class="divider"></div><label class="field">Гост не успява да се включи в срещата. Как гарантирате, че ще получи информация и ще може да зададе въпроси?</label><select class="input" data-choose="m3-backup"><option value="">Изберете подход</option><option value="record" ${ui.mission3.backup==='record'?'selected':''}>Изпращаме запис/материали с ограничен достъп и възможност за последващи въпроси</option><option value="exclude" ${ui.mission3.backup==='exclude'?'selected':''}>Не му изпращаме нищо, след като е пропуснал срещата</option><option value="public" ${ui.mission3.backup==='public'?'selected':''}>Публикуваме всички материали и лични данни публично</option></select><div style="margin-top:18px">${btn('submit3','ПРОВЕРИ ПЛАНИРАНЕТО →','primary')}</div></div>`);}
function scenarioAnswers(mission,key,items,selected,code){
 return `<div class="scenario-options" role="group" aria-label="Избери отговор">${shuffledChoices(items,'m'+mission+'-'+key,code).map(([id,label],i)=>
 `<button type="button" class="scenario-choice ${selected===id?'active':''}" data-act="scenario-pick" data-mission="${mission}" data-key="${key}" data-value="${id}" aria-pressed="${selected===id?'true':'false'}"><span class="scenario-choice-mark">${String.fromCharCode(1040+i)}</span><span>${esc(label)}</span></button>`).join('')}</div>`;
}
function m4(d){
 const code=d.session.code;
 const rows=m4Needs.map(([key,label],i)=>{
   const allowed=key==='link' ? m4Rights.filter(([id])=>['restricted','public-view','public-comment','public-edit'].includes(id))
     : m4Rights.filter(([id])=>['edit','comment','view','none'].includes(id));
   const opts=shuffledChoices(allowed,'m4-'+key,code).map(([id,title])=>`<option value="${id}" ${ui.mission4[key]===id?'selected':''}>${esc(title)}</option>`).join('');
   return `<div class="challenge"><div><span class="kicker">СИТУАЦИЯ 0${i+1}</span><strong>${esc(label)}</strong></div><select class="input" data-choose="m4" data-id="${key}"><option value="">— Избери подходящо право —</option>${opts}</select></div>`;
 }).join('');
 return missionFrame(d,4,`<div class="card"><div class="info warning" style="margin-bottom:16px"><strong>ИНЦИДЕНТ:</strong> В чернова има контакти на ученици и гости. Непознат потребител е получил достъп чрез неподходящ линк. Възстановете сигурността, без да прекъсвате работата на упълномощените организатори.</div><p class="instruction">За всеки участник изберете минималното право, с което може да изпълни задачата си. Дадено право може да се използва повече от веднъж.</p><div class="mission-grid">${rows}</div><div class="divider"></div><label class="field">Непознатият вече е направил промяна. Коя е първата стъпка за ограничаване на инцидента?</label>${scenarioAnswers(4,'incident',m4Incidents,ui.mission4.incident,code)}<div class="divider"></div><label class="field">Как ще установите и възстановите достоверната версия на документа?</label>${scenarioAnswers(4,'recovery',m4Recovery,ui.mission4.recovery,code)}<div class="divider"></div><label class="field">Обяснете риска, последователността на действията и как ще избегнете повторение.</label><textarea id="m4-reason" placeholder="Първо бихме..., после ще проверим...; за да предотвратим...">${esc(ui.typed.m4||'')}</textarea><div style="margin-top:16px">${btn('submit4','ПРОВЕРИ ЗАЩИТАТА →','primary')}</div></div>`);
}
function m5(d){
 const rows=m5Categories.map(([key,label,choices],i)=>
   `<div class="scenario-card"><span class="kicker">КАЗУС 0${i+1}</span><h3>${esc(label)}</h3>${scenarioAnswers(5,key,choices,ui.mission5[key],d.session.code)}</div>`
 ).join('');
 const fallback=[
   ['async','Предоставяме материали за изтегляне и възможност за писмени въпроси със защитен достъп.'],
   ['video','Изискваме камерата да остане включена, но намаляваме резолюцията на презентацията.'],
   ['record-public','Качваме публичен запис, включително чат с лични данни, за да не се регистрират гостите.'],
   ['remove','Изключваме участника от обсъжданията, но му изпращаме финалния сертификат.']
 ];
 return missionFrame(d,5,`<div class="card"><p class="instruction">Финално предизвикателство: съставете цялостен план за дигитална конференция. Във всеки от четирите казуса сравнете варианти, които имат различни предимства и ограничения. Изберете плана, който изпълнява всички изисквания.</p><div class="scenario-list">${rows}</div><div class="divider"></div><label class="field">Участник със слаба връзка не може да проследи видеото. Как ще го включите, без да разкривате лични данни?</label>${scenarioAnswers(5,'fallback',fallback,ui.mission5.fallback,d.session.code)}<div class="divider"></div><div class="two"><div><label class="field">Обосновка №1 — защо избраният подход е подходящ?</label><textarea id="m5-reason1" placeholder="Този подход изпълнява изискванията, защото...">${esc(ui.typed.m5a||'')}</textarea></div><div><label class="field">Обосновка №2 — как защитавате достъпа и екипната работа?</label><textarea id="m5-reason2" placeholder="Достъпът до съдържанието е..., което позволява...">${esc(ui.typed.m5b||'')}</textarea></div></div><label class="field" style="margin-top:14px">Сравнение: посочете привидно подходяща алтернатива и обяснете кое изискване не изпълнява.</label><textarea id="m5-tradeoff" placeholder="Бихме могли и..., но тогава..., затова...">${esc(ui.typed.m5tradeoff||'')}</textarea><div style="margin-top:17px">${btn('submit5','АКТИВИРАЙ ФИНАЛНИЯ КОД →','primary')}</div></div>`);
}
function finalCode(d){return playHeader(d)+`<div class="card emphasis mid" style="padding:35px"><span class="eyebrow">ОПЕРАЦИЯ: ФИНАЛНО ОТКЛЮЧВАНЕ</span><h2 style="font-size:34px;margin:12px 0">Петте цифри са получени.</h2><p class="subtle">Съберете цифрите от петте успешно изпълнени мисии в правилния ред.</p><div class="digits" style="justify-content:center;margin:22px 0">${d.team.digits.map(n=>`<span class="digit ${n===null?'secret':''}">${n===null?'?':n}</span>`).join('')}</div><div style="max-width:330px;margin:auto"><label class="field">Въведи финалния код</label><input class="input mono" style="font-size:29px;text-align:center;letter-spacing:9px" id="final-code" inputmode="numeric" maxlength="5" placeholder="•••••"><div style="margin-top:14px">${btn('unlock','ОТКЛЮЧИ КОНФЕРЕНЦИЯТА','gold full')}</div></div></div>`;}
function success(d){return playHeader(d)+`<div class="victory"><div class="medal">✦</div><span class="eyebrow">СИСТЕМА 404 · ВЪЗСТАНОВЕНА</span><h1>МИСИЯТА Е ИЗПЪЛНЕНА!</h1><p class="lead" style="margin:0 auto 18px">Поздравления, отбор ${esc(d.team.name)}! Използвахте дигитални средства, за да спасите училищната онлайн конференция.</p><div class="stat" style="display:inline-block;min-width:170px"><div class="value">${d.team.score}</div><div class="name">Заслужени точки</div></div><div class="info" style="max-width:650px;margin:25px auto 0;text-align:left"><strong>Разговор в екипа:</strong> Кое беше най-трудно при съвместната работа? Кой инструмент бихте използвали отново и защо?</div></div>`;}
function playPage(){const d=ui.playData;if(!d){app.innerHTML=shell('<div class="center loading"><div class="spinner"></div>Свързване с отбора...</div>');return;}let main='';if(d.team.finished_at)main=success(d);else if(d.session.status==='lobby')main=playHeader(d)+`<div class="card emphasis mid" style="padding:50px 20px"><span class="eyebrow">ВРЪЗКАТА С ЕКИПА Е УСТАНОВЕНА</span><h2 style="font-size:33px;margin:15px">Очаквайте учителя</h2><p class="subtle">Не затваряйте страницата. Играта ще започне автоматично, след като учителят натисне „Старт“.</p><div class="divider"></div><div class="flex" style="justify-content:center">${d.players.map(p=>`<span class="user-chip">${esc(p.nickname)}</span>`).join('')}</div></div>`;else if(d.session.status==='paused')main=playHeader(d)+`<div class="card mid"><h2>Играта е на пауза</h2><p class="subtle">Учителят скоро ще я продължи. Вашият напредък е запазен.</p></div>`;else if(d.session.status==='finished')main=playHeader(d)+`<div class="card mid"><h2>Времето изтече!</h2><p class="lead" style="margin:auto">Отбор ${esc(d.team.name)} завърши с ${d.team.score} точки и ${Math.min(d.team.current-1,5)} изпълнени мисии.</p></div>`;else if(d.team.current===6)main=finalCode(d);else main=[m1,m2,m3,m4,m5][d.team.current-1](d);
app.innerHTML=shell(main,`${btn('toggle-audio',ui.audio?'♪ Звук: вкл.':'♪ Звук: изкл.','small ghost')}${btn('leave','Изход','small ghost')}`);}
// Sync every 2.5 seconds without rebuilding the page when only the timer changes.
function teacherViewSignature(session){
  if(!session)return 'no-session';
  return JSON.stringify({
    code:session.code,status:session.status,test_mode:session.test_mode,
    teams:session.teams.map(t=>({id:t.id,name:t.name,players:t.players.map(p=>p.nickname),
      current:t.current,score:t.score,answers:t.answers,finished_at:t.finished_at}))
  });
}
// Only switches between missions/phases require rebuilding the student page.
function playViewSignature(d){
  return JSON.stringify({
    session:d.session.code,
    status:d.session.status,
    mission:d.team.current,
    completed:d.team.finished_at,
    name:d.team.name,
    playerId:d.me.id
  });
}
function syncStudentChrome(d){
  const score=app.querySelector('[data-team-score]');
  const count=app.querySelector('[data-player-count]');
  if(score&&score.textContent!==String(d.team.score))score.textContent=String(d.team.score);
  if(count&&count.textContent!==String(d.players.length))count.textContent=String(d.players.length);
  const hint=app.querySelector('[data-hint-content]');
  if(hint){
    const text=d.hint_texts[String(d.team.current)];
    const next=text?`<div class="info warning" style="margin-top:13px">${esc(text)}</div>`:'';
    if(hint.innerHTML!==next)hint.innerHTML=next;
  }
}
// Mission 2 is truly collaborative. Update ONLY changed fields and sidebar areas.
// Never replace a textarea containing a local unsaved draft or holding focus.
function syncMissionTwo(previous,d){
  if(d.team.current!==2||d.session.status!=='running'||!app.querySelector('[data-field]'))return;
  const oldDoc=previous?.m2?.doc||{};
  const tmp=document.createElement('div');
  tmp.innerHTML=m2(d);
  for(const field of app.querySelectorAll('textarea[data-field]')){
    const id=field.dataset.field;
    const newText=String(d.m2.doc[id]?.value||'');
    const previouslySynced=field.dataset.serverValue??String(oldDoc[id]?.value||'');
    const safe=document.activeElement!==field&&field.value===previouslySynced;
    if(safe){
      if(field.value!==newText)field.value=newText;
      field.dataset.serverValue=newText;
    }
    const meta=field.closest('.doc-field')?.querySelector('.meta');
    const nextMeta=tmp.querySelector(`textarea[data-field="${id}"]`)?.closest('.doc-field')?.querySelector('.meta');
    if(meta&&nextMeta&&meta.textContent!==nextMeta.textContent)meta.textContent=nextMeta.textContent;
  }
  for(const attr of ['data-m2-members','data-m2-comments','data-m2-clues','data-m2-clue-info']){
    const live=app.querySelector('['+attr+']');
    const next=tmp.querySelector('['+attr+']');
    if(live&&next&&live.innerHTML!==next.innerHTML)live.innerHTML=next.innerHTML;
  }
}
function syncClocks(){
  if(location.pathname==='/teacher'){
    const s=ui.teacherData?.session;if(!s)return;
    const time=fmt(s.duration-s.elapsed);
    const stat=app.querySelector('.statrow .stat:nth-child(2) .value');
    const large=app.querySelector('.clock-large');
    if(stat&&stat.textContent!==time)stat.textContent=time;
    if(large&&large.textContent!==time)large.textContent=time;
  }else if(location.pathname==='/play'){
    const s=ui.playData?.session;if(!s)return;
    const time='◷ '+fmt(s.duration-s.elapsed);
    const timer=app.querySelector('.timer');
    if(timer&&timer.textContent!==time)timer.textContent=time;
  }
}
async function refresh(force=false){
  const path=location.pathname;
  if(path==='/teacher'){
    if(!ui.teacherKey){login();return;}
    if(ui.creating)return;
    try{
      const data=await api('teacher/state',undefined,'teacher');
      if(location.pathname!==path)return;
      ui.teacherData=data;
      if(!ui.healthChecked){
        ui.healthChecked=true;
        try{const h=await api('health');ui.lan=h.lan||'';}catch{}
      }
      const stamp=teacherViewSignature(data.session);
      const editing=document.activeElement?.matches('input,textarea,select');
      if(force||(!editing&&ui.teacherViewStamp!==stamp)){
        teacherPage();
        ui.teacherViewStamp=stamp;
      }
      syncClocks();
    }catch(e){
      if(e.message.includes('учителски код')||e.message.includes('Учителски код')){
        ui.teacherKey='';localStorage.removeItem(PREFIX+'teacher');login();
      }
      message(e.message,true);
    }
    return;
  }
  if(path==='/join'){
    // A QR link carries the class code, so verify it and show teams automatically.
    if(ui.code&&!ui.joined&&!ui.joinLookupDone&&!ui.joinLookupRunning){
      ui.joinLookupRunning=true;
      try{
        const data=await api('public/session',{code:ui.code});
        if(location.pathname===path)ui.joined=data;
      }catch(e){if(location.pathname===path)message(e.message,true);}
      finally{ui.joinLookupRunning=false;ui.joinLookupDone=true;}
    }
    joinPage();
    return;
  }
  if(path==='/play'){
    if(!ui.token){go('/join');return;}
    try{
      const previous=ui.playData;
      const d=await api('student/state',undefined,'student');
      if(location.pathname!==path)return;
      const stamp=playViewSignature(d);
      ui.playData=d;
      const phaseChanged=!previous||previous.session.status!==d.session.status||previous.team.current!==d.team.current||previous.team.finished_at!==d.team.finished_at||previous.team.name!==d.team.name;
      // Background polling NEVER rebuilds an unchanged mission, even if secondary data differ.
      if(force||phaseChanged||!app.querySelector('.mission-head')){
        playPage();
      }else{
        syncStudentChrome(d);
        syncMissionTwo(previous,d);
      }
      ui.playViewStamp=stamp;
      syncClocks();
    }catch(e){
      if(e.message.includes('Не сте присъединени')||e.message.includes('Не е намерен')){
        ui.token='';localStorage.removeItem(PREFIX+'player');go('/join');
      }else message(e.message,true);
    }
    return;
  }
  renderLanding();
}
async function post(path,data,mode='student'){let r=await api(path,data,mode);await refresh(mode!=='student');return r;}
function getVal(id){return document.getElementById(id)?.value||'';}
function captureTyped(){for(const [id,key] of [['m1-reason','m1'],['m1-contrast','m1contrast'],['m3-reason','m3'],['m4-reason','m4'],['m5-reason1','m5a'],['m5-reason2','m5b'],['m5-tradeoff','m5tradeoff'],['nickname','nickname']]){const el=document.getElementById(id);if(el)ui.typed[key]=el.value;}}
async function click(act,b){
  if(act==='login'){const key=getVal('teacher-key').trim();await api('teacher/auth',{key});ui.teacherKey=key;localStorage.setItem(PREFIX+'teacher',key);await refresh(true);message('Добре дошли, учителю!');}
  else if(act==='logout'){ui.teacherKey='';localStorage.removeItem(PREFIX+'teacher');login();}
  else if(act==='create'||act==='new-session'){
    if(act==='new-session'&&!confirm('Създаването на нова сесия ще замени предишните резултати. Да продължим?'))return;
    if(act==='new-session'){ui.creating=true;ui.teacherData={session:null};teacherSetUp();return;}
    const n=Number(getVal('team-count'))||4;const names=['АЛФА','БЕТА','ГАМА','ДЕЛТА','ОМЕГА','СИГМА','ТЕТА','ЗЕТА'].slice(0,n);
    ui.creating=false;await post('teacher/create',{names,test_mode:document.getElementById('test-mode')?.checked||false},'teacher');message('Сесията е създадена.');
  }
  else if(['start','pause','resume','finish','reset'].includes(act)){
    if(['finish','reset'].includes(act)&&!confirm(act==='reset'?'Нулиране на играта: всички резултати и участници ще бъдат изтрити. Продължаваме ли?':'Да приключим ли играта за всички отбори?'))return;
    await post('teacher/action',{action:act},'teacher');message('Състоянието на играта е обновено.');
  }
  else if(act==='rename'){
    const t=ui.teacherData.session.teams.find(t=>t.id===b.dataset.team);
    const name=prompt('Ново име за отбора:',t?.name||'');if(!name)return;
    await post('teacher/rename',{team_id:b.dataset.team,name},'teacher');
  }
  else if(act==='skip'){
    if(!confirm('Да пропуснем текущата мисия за този отбор? Не се дават точки.'))return;
    await post('teacher/skip',{team_id:b.dataset.team},'teacher');message('Мисията е пропусната за отбора.');
  }
  else if(act==='copy-link'||act==='copy-code'){
    const value=act==='copy-link'?ui.joinLink:ui.teacherData.session.code;
    try{await navigator.clipboard.writeText(value);message('Копирано!');}catch{prompt('Копирайте следния текст:',value);}
  }
  else if(act==='check-code'){
    ui.code=getVal('game-code').trim().toUpperCase();if(!ui.code)throw Error('Въведете код за игра.');
    ui.joined=await api('public/session',{code:ui.code});ui.joinLookupDone=true;ui.selectedTeam='';joinPage();
  }
  else if(act==='choose-team'){captureTyped();ui.selectedTeam=b.dataset.team;joinPage();}
  else if(act==='join'){
    captureTyped();if(!ui.selectedTeam)throw Error('Изберете отбор.');
    const r=await api('student/join',{code:ui.code,team_id:ui.selectedTeam,nickname:getVal('nickname')});ui.token=r.token;localStorage.setItem(PREFIX+'player',r.token);go('/play');
  }
  else if(act==='leave'){if(!confirm('Да излезем от екрана на играта? Напредъкът на отбора се запазва.'))return;ui.token='';localStorage.removeItem(PREFIX+'player');go('/join');}
  else if(act==='toggle-audio'){ui.audio=!ui.audio;localStorage.setItem(PREFIX+'audio',ui.audio?'on':'off');playPage();}
  else if(act==='scenario-pick'){
    const mission=Number(b.dataset.mission),key=b.dataset.key,value=b.dataset.value;
    const selections=mission===4?ui.mission4:ui.mission5;
    selections[key]=value;
    const siblings=b.closest('.scenario-options')?.querySelectorAll('.scenario-choice')||[];
    siblings.forEach(el=>{
      const selected=el.dataset.value===value;
      el.classList.toggle('active',selected);
      el.setAttribute('aria-pressed',String(selected));
    });
  }
  else if(act==='choose-slot'){captureTyped();ui.mission3.slot=b.dataset.slot;playPage();}
  else if(act==='save-field'){
    const field=b.dataset.field;const input=[...document.querySelectorAll('[data-field]')].find(x=>x.dataset.field===field);
    if(!input?.value.trim())throw Error('Попълнете полето преди запазване.');
    await post('student/edit',{field,value:input.value.trim()});message('Промяната е запазена и видима за отбора.');
  }
  else if(act==='add-comment'){
    const body=getVal('comment').trim();await post('student/comment',{action:'add',body});message('Коментарът е добавен.');
  }
  else if(act==='apply-comment'){await post('student/comment',{action:'apply',id:b.dataset.comment});message('Предложението е отбелязано като приложено.');}
  else if(act==='hint'){const r=await post('student/hint',{});message('Подсказката е отключена (–10 точки при завършване).');}
  else if(act.startsWith('submit')){
    captureTyped();const m=Number(act.replace('submit',''));let payload;
    if(m===1)payload={mapping:ui.mission1,reason:ui.typed.m1||'',contrast:ui.typed.m1contrast||''};
    if(m===2)payload={};
    if(m===3)payload={slot:ui.mission3.slot,tool:ui.mission3.tool,backup:ui.mission3.backup,reason:ui.typed.m3||''};
    if(m===4)payload={rights:ui.mission4,incident:ui.mission4.incident,recovery:ui.mission4.recovery,risk:ui.typed.m4||''};
    if(m===5)payload={choices:ui.mission5,fallback:ui.mission5.fallback,reason1:ui.typed.m5a||'',reason2:ui.typed.m5b||'',tradeoff:ui.typed.m5tradeoff||''};
    const r=await api('student/submit',{mission:m,payload},'student');
    if(r.ok){audio();ui.typed={};await refresh(true);window.scrollTo({top:0});message(`МИСИЯ ${m} ИЗПЪЛНЕНА! +${r.earned} точки · Цифра за кода: ${r.digit}`);}else{audio(false);message((r.errors||[]).join(' '),true);}
  }
  else if(act==='unlock'){
    const code=getVal('final-code').trim();const r=await post('student/unlock',{code});audio(true);message('МИСИЯТА Е ИЗПЪЛНЕНА! Поздравления!');
  }
}
document.addEventListener('click',async e=>{
  const a=e.target.closest('a[data-nav]');if(a){e.preventDefault();go(a.dataset.nav);return;}
  const b=e.target.closest('button[data-act]');if(!b)return;
  e.preventDefault();const act=b.dataset.act;
  if(b.disabled||ui.loading)return;
  ui.loading=true;b.disabled=true;
  try{await click(act,b);}catch(err){audio(false);message(err.message||'Възникна грешка.',true);}finally{ui.loading=false;b.disabled=false;}
});
document.addEventListener('change',e=>{
  const target=e.target;
  if(!target.matches('[data-choose]'))return;
  const which=target.dataset.choose,id=target.dataset.id;
  if(which==='m1')ui.mission1[id]=target.value;
  if(which==='m4')ui.mission4[id]=target.value;
  if(which==='m5')ui.mission5[id]=target.value;
  if(which==='m3-tool')ui.mission3.tool=target.value;
  if(which==='m3-backup')ui.mission3.backup=target.value;
});
window.addEventListener('popstate',()=>refresh(true));
refresh(true);
let backgroundRefreshBusy=false;
setInterval(async()=>{
  if(backgroundRefreshBusy||!['/play','/teacher'].includes(location.pathname))return;
  backgroundRefreshBusy=true;
  try{await refresh(false);}finally{backgroundRefreshBusy=false;}
},2500);
