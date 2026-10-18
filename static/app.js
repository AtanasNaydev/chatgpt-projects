/* МИСИЯ 404 — vanilla JS client, no CDN/dependencies */
'use strict';
const app = document.getElementById('app');
const PREFIX = 'm404_';
const ui = {
  teacherKey: localStorage.getItem(PREFIX+'teacher')||'', token: localStorage.getItem(PREFIX+'player')||'',
  code: new URLSearchParams(location.search).get('code')||'', joined: null, selectedTeam:'',
  mission1:{}, mission3:{}, mission4:{}, mission5:{}, typed:{},
  audio:localStorage.getItem(PREFIX+'audio')!=='off', teacherData:null, playData:null, lan:'', loading:false, creating:false,
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
const toolOptions=[['docs','Общ документ'],['ideas','Визуална дъска'],['schedule','Анкета за час'],['webinar','Видеосреща'],['storage','Облачно хранилище']];
const m1Needs=[
 ['collab','Трима участници трябва едновременно да редактират поканата за конференцията.'],
 ['brainstorm','Международният екип трябва да събира идеи на обща визуална стена.'],
 ['date','Трябва да се избере подходящ час според свободното време на гостите.'],
 ['meeting','Участниците ще слушат презентации и ще задават въпроси онлайн.'],
 ['archive','Презентациите и материалите трябва да се съхраняват и споделят.']
];
const m4Needs=[
 ['organizer','Организаторът изготвя и променя програмата.'],
 ['teacher','Учителят проверява и предлага корекции, без да променя съдържанието.'],
 ['visitors','Гостите трябва само да прочетат готовата програма.'],
 ['outsider','Непознат човек не трябва да получава файла.'],
 ['link','Настройка за общ достъп до файла.']
];
const m4Rights=[['edit','Редактор'],['comment','Коментатор'],['view','Читател'],['none','Без достъп'],['restricted','Ограничено споделяне'],['public-edit','Всеки с връзката може да редактира']];
const m5Categories=[
 ['webinar','Видео конференция',['Google Meet','Microsoft Teams','Zoom','Gmail']],
 ['docs','Съвместен документ',['Google Docs','Word Online','Photoshop']],
 ['files','Съхранение на файлове',['Google Drive','OneDrive','YouTube']],
 ['time','Съгласуване на час',['Google Maps','Doodle','Paint']],
 ['ideas','Дъска за идеи',['Padlet','Excel','Калкулатор']]
];
const calSlots=[['mon14','Пон. 14:00'],['mon15','Пон. 15:00'],['tue14','Вт. 14:00'],['tue15','Вт. 15:00'],['wed14','Ср. 14:00'],['wed15','Ср. 15:00']];
const calPeople=[['Мария',['mon14','tue15','wed14']],['Иван',['tue14','tue15','wed15']],['Нина',['mon15','tue15','wed14']],['Георги',['tue15','wed14','wed15']],['Теодора',['mon14','tue15','wed15']]];
function esc(s=''){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function fmt(s){let n=Math.max(0,Math.floor(s));return String(Math.floor(n/60)).padStart(2,'0')+':'+String(n%60).padStart(2,'0');}
function statusText(s){return ({lobby:'Изчакване',running:'Активна',paused:'На пауза',finished:'Приключила'})[s]||s;}
function message(msg,error=false){const t=document.getElementById('toast');t.textContent=msg;t.className='toast show'+(error?' error':'');clearTimeout(message.timer);message.timer=setTimeout(()=>t.classList.remove('show'),4700);}
function audio(success=true){if(!ui.audio)return;try{const A=window.AudioContext||window.webkitAudioContext;const c=new A();let o=c.createOscillator(),g=c.createGain();o.connect(g);g.connect(c.destination);o.type='sine';o.frequency.value=success?720:210;g.gain.setValueAtTime(.03,c.currentTime);g.gain.exponentialRampToValueAtTime(.001,c.currentTime+.18);o.start();o.stop(c.currentTime+.18);o.onended=()=>c.close()}catch{}}
function go(path){history.pushState({},'',path);ui.typed={};ui.playData=null;ui.teacherData=null;refresh(true);window.scrollTo({top:0});}
function shell(inner,actions=''){return `<div class="shell slide"><header class="topbar"><a class="brand" href="/" data-nav="/"><span class="brand-mark"></span>МИСИЯ 404 <span style="color:#7e9fb1">//</span> ДИГИТАЛЕН ХАОС</a><nav class="navright">${actions}<span class="tag">ИТ · 10. КЛАС</span></nav></header>${inner}<footer class="foot">МИСИЯ 404 · Практическо упражнение · Дигитално сътрудничество · Данните остават в училищния компютър</footer></div>`;}
function btn(action,text,klass='ghost',extra=''){return `<button class="btn ${klass}" data-act="${action}" ${extra}>${text}</button>`;}
function progress(num){return `<div class="steps">${sceneNames.map((name,i)=>`<span class="step ${i+1<num?'done':i+1===num?'active':''}" title="${esc(name)}">${i+1<num?'✓ ':''}${i+1}</span>`).join('')}</div>`;}
function renderLanding(){app.innerHTML=shell(`<section class="hero"><div class="glow-orb"></div><span class="eyebrow">ПРАКТИЧЕСКА МИСИЯ · 45 МИНУТИ · 5 ПРЕДИЗВИКАТЕЛСТВА</span><h1>МИСИЯ <span>404</span><br>Дигитален хаос</h1><p class="lead">Международната онлайн конференция на училището е пред провал. Само дигитален екип, който умее да работи заедно, може да възстанови организацията.</p><div class="hero-actions"><a data-nav="/join" href="/join" class="btn primary large">▣ &nbsp; Присъедини се към мисия</a><a data-nav="/teacher" href="/teacher" class="btn ghost large">⌘ &nbsp; Панел за учителя</a></div></section>
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
function teacherPage(){const s=ui.teacherData?.session;if(!s){teacherSetUp();return;}
const expanded=new Set([...app.querySelectorAll('details[data-team-details][open]')].map(el=>el.dataset.teamDetails));
const teams=[...s.teams].sort((a,b)=>b.score-a.score||(a.finished_at||Infinity)-(b.finished_at||Infinity));const count=teams.reduce((a,t)=>a+t.players.length,0);
const base=ui.lan?`http://${ui.lan}:${location.port||'8765'}`:location.origin;
const joinLink=`${base}/join?code=${s.code}`;
const actions=s.status==='lobby'?btn('start','▶ СТАРТ','primary'):s.status==='running'?btn('pause','Ⅱ ПАУЗА','gold'):s.status==='paused'?btn('resume','▶ ПРОДЪЛЖИ','primary'):'';
const extra=s.status==='running'||s.status==='paused'?btn('finish','■ ПРИКЛЮЧИ','red'):'';
app.innerHTML=shell(`<section class="mission-head"><span class="eyebrow">КОНТРОЛЕН ЦЕНТЪР · ${s.test_mode?'ТЕСТОВА СЕСИЯ':'УЧЕБНА СЕСИЯ'}</span><h1>Команден пункт</h1><p>Тук се показват отборите, точките и напредъкът им. Обновяване на всеки 2,5 секунди.</p></section>
<div class="statrow"><div class="stat"><div class="name">Код за ученици</div><div class="value" style="color:var(--amber);letter-spacing:2px">${s.code}</div></div><div class="stat"><div class="name">Оставащо време</div><div class="value">${fmt(s.duration-s.elapsed)}</div></div><div class="stat"><div class="name">Участници</div><div class="value">${count}</div></div><div class="stat"><div class="name">Статус</div><div class="value" style="font-size:23px">${statusText(s.status)}</div></div></div>
<div class="spread" style="margin-top:18px"><div class="card emphasis"><span class="eyebrow">КОД ЗА ПРИСЪЕДИНЯВАНЕ</span><h3 class="card-title">Дайте адреса на учениците</h3><span class="session-link">${esc(joinLink)}</span><div class="flex" style="margin-top:12px">${btn('copy-link','⧉ КОПИРАЙ ВРЪЗКАТА','ghost small')}${btn('copy-code','⧉ КОПИРАЙ КОДА','ghost small')}</div><p class="help">Ако учениците са в една локална мрежа, отварят показания адрес и избират отбор. Не споделяйте секретния код на учителя.</p></div><div class="card"><span class="eyebrow">КОНТРОЛ НА ЧАСА</span><div class="clock-large">${fmt(s.duration-s.elapsed)}</div><div class="flex" style="justify-content:center;margin-top:13px">${actions}${extra}</div><div class="flex" style="justify-content:center;margin-top:14px">${btn('reset','↻ НУЛИРАЙ','ghost small')}${btn('new-session','＋ НОВА СЕСИЯ','ghost small')}</div></div></div>
<section class="section"><h2>Класиране и напредък</h2></section><div class="card"><div style="overflow:auto"><table class="team-table"><thead><tr><th>#</th><th>Отбор</th><th>Членове</th><th>Мисия</th><th>Напредък</th><th>Точки</th><th>Действия</th></tr></thead><tbody>${teams.map((t,i)=>`<tr><td><div class="rank">${i+1}</div></td><td><strong>${esc(t.name)}</strong></td><td>${t.players.map(p=>`<span class="user-chip" title="${p.online?'Онлайн':'Неактивен'}">${p.online?'<span class="signal"></span>':''}${esc(p.nickname)}</span>`).join(' ')||'<span class="subtle">—</span>'}</td><td>${t.finished_at?'✓ Финал':t.current>5?'Код':t.current+'/5'}</td><td style="min-width:135px"><div class="progress"><i style="width:${Math.min(100,(t.current-1)*20)}%"></i></div></td><td><strong style="color:var(--cyan)">${t.score}</strong></td><td>${s.status==='lobby'?`<button class="btn small ghost" data-act="rename" data-team="${t.id}">Име</button>`:''} ${t.current<=5&&s.status!=='finished'?`<button class="btn small ghost" data-act="skip" data-team="${t.id}">Пропусни</button>`:''}</td></tr>`).join('')}</tbody></table></div><p class="help">Завършена мисия носи до 100 т., грешките и подсказките намаляват точките, а екипната работа в Мисия 2 дава бонус.</p></div>
<section class="section"><h2>Преглед на отговорите</h2></section><div class="card"><p class="subtle" style="margin-bottom:12px">Отворете отбора, за да видите обосновките и резултатите. Преценете свободните отговори педагогически.</p>${teams.map(t=>`<details data-team-details="${esc(t.id)}" style="border-top:1px solid #38566d;padding:12px 0"><summary style="cursor:pointer;font-weight:bold">${esc(t.name)} · ${t.score} т. · ${Object.keys(t.answers).length}/5 мисии</summary><div class="stack" style="margin-top:12px">${[1,2,3,4,5].map(m=>{const a=t.answers[String(m)];return `<div class="unit"><strong>Мисия ${m}: ${sceneNames[m-1]}</strong>${a?`<p class="subtle">${a.skipped?'Пропусната от учителя':a.points+' точки'}</p><pre style="white-space:pre-wrap;overflow-wrap:anywhere;color:#9ed0df;font-size:12px">${esc(JSON.stringify(a.evidence,null,2))}</pre>`:'<p class="subtle">Не е изпълнена</p>'}</div>`}).join('')}</div></details>`).join('')}</div>
<div class="foot-note">Сигурност: секретният код е необходим за този екран. Не го споделяйте с учениците. Играта е предназначена за локална училищна мрежа.</div>`,btn('logout','Изход','small ghost'));
ui.joinLink=joinLink;
app.querySelectorAll('details[data-team-details]').forEach(el=>{if(expanded.has(el.dataset.teamDetails))el.open=true;});
}
function joinPage(){const data=ui.joined;app.innerHTML=shell(`<section class="mission-head"><span class="eyebrow">ДОСТЪП ДО МИСИЯТА</span><h1>Присъедини се към екипа</h1><p>Работете заедно. Всеки участник трябва да има собствен компютър и да избере същия отбор.</p></section><div class="card" style="max-width:730px"><div class="stack"><div><label class="field">Шестсимволен код от учителя</label><div class="flex"><input id="game-code" class="input mono" maxlength="6" placeholder="напр. A7K3PN" value="${esc(ui.code)}" style="flex:1;letter-spacing:2px;text-transform:uppercase">${btn('check-code','ПРОВЕРИ КОДА','primary')}</div></div>${data?`<div class="divider"></div><span class="eyebrow">ИЗБЕРИ ОТБОР</span><div class="two">${data.teams.map(t=>`<button class="select-team ${ui.selectedTeam===t.id?'active':''}" data-act="choose-team" data-team="${t.id}" ${t.full?'disabled':''}><strong>${esc(t.name)}</strong><small>${t.full?'Отборът е пълен':`${t.count}/4 участници`}</small></button>`).join('')}</div><div><label class="field">Твоят прякор (без фамилия)</label><input class="input" id="nickname" placeholder="Например: Агент_7" maxlength="22" value="${esc(ui.typed.nickname||'')}"></div>${btn('join','ВЛЕЗ В МИСИЯТА','gold',ui.selectedTeam?'':'disabled')}<p class="help">Ако играта вече е стартирала, ще се включиш в текущия напредък на избрания отбор.</p>`:''}</div></div>`,ui.token?`<a href="/play" data-nav="/play" class="btn small ghost">Към моята игра</a>`:'');}
function playHeader(d){return `<section class="mission-head"><div class="flex between"><span class="eyebrow">ОТБОР ${esc(d.team.name)} · АГЕНТ ${esc(d.me.nickname)}</span><span class="tag ${d.session.status==='running'?'green':'amber'}">${statusText(d.session.status)}</span></div><h1>МИСИЯ 404 <span style="color:var(--cyan)">/ ОПЕРАЦИЯ</span></h1><div class="flex between" style="margin-top:18px"><div>${progress(d.team.current)}</div><div class="timer">◷ ${fmt(d.session.duration-d.session.elapsed)}</div></div><div class="flex between" style="margin-top:16px"><span class="tag">Точки: <strong data-team-score>${d.team.score}</strong></span><span class="tag">Екип: <strong data-player-count>${d.players.length}</strong>/4 участници</span></div></section>`;}
function missionFrame(d,m,content){return playHeader(d)+`<div class="card emphasis"><div class="flex between"><span class="eyebrow">МИСИЯ 0${m} / 05</span><span class="tag amber">Максимум 100 точки</span></div><h2 style="font-size:clamp(23px,3.2vw,34px);margin:8px 0">${sceneNames[m-1]}</h2><p class="subtle">${missionDescriptions[m-1]}</p></div><div style="height:20px"></div>${content}<div class="card" style="margin-top:15px"><div class="flex between"><div><strong>Нуждаеш се от помощ?</strong><p class="help">Една подсказка за мисия, –10 точки.</p></div>${btn('hint','◈ ПОДСКАЗКА','ghost small')}</div><div data-hint-content>${d.hint_texts[String(m)]?`<div class="info warning" style="margin-top:13px">${esc(d.hint_texts[String(m)])}</div>`:''}</div></div>`;}
function m1(d){let rows=m1Needs.map(([key,label],i)=>`<div class="challenge"><div><span class="kicker">СИТУАЦИЯ 0${i+1}</span><strong>${label}</strong></div><select class="input" data-choose="m1" data-id="${key}"><option value="">— Избери категория —</option>${toolOptions.map(([value,txt])=>`<option value="${value}" ${ui.mission1[key]===value?'selected':''}>${txt}</option>`).join('')}</select></div>`).join('');return missionFrame(d,1,`<div class="card"><p class="instruction">За всяка ситуация избери подходящата технологична категория. Обсъдете решенията, преди да ги изпратите.</p><div class="mission-grid">${rows}</div><div class="divider"></div><label class="field">Защо избра този вид средства? Дай пример с конкретен инструмент.</label><textarea id="m1-reason" placeholder="Например: Използваме ... защото ...">${esc(ui.typed.m1||'')}</textarea><div class="flex" style="margin-top:17px">${btn('submit1','ПРОВЕРИ РЕШЕНИЕТО →','primary')}</div></div>`);}
function m2(d){const doc=d.m2.doc;const titles=[['title','Заглавие на конференцията'],['audience','За кого е предназначена?'],['program','Програма (3 теми)'],['tools','Дигитални средства за организация'],['roles','Роли и отговорности']];return missionFrame(d,2,`<div class="info" style="margin-bottom:17px"><strong>Тайна информация:</strong> Всеки ученик вижда само своята част от уликите. Разкажете си я и изгответе заедно общ план!</div><div class="doc-grid"><div class="card"><span class="eyebrow">СПОДЕЛЕН ОНЛАЙН ДОКУМЕНТ · ТРЕНИРОВЪЧЕН МОДУЛ</span><h3 class="card-title">План за училищен уебинар</h3><div class="stack">${titles.map(([id,title])=>`<div class="doc-field"><label>${title}</label><textarea data-field="${id}" placeholder="Екипът попълва това поле...">${esc(doc[id]?.value||'')}</textarea><div class="flex between"><small class="meta">${doc[id]?'Последна промяна: '+esc(doc[id].nickname):'Няма въведена информация'}</small><button class="btn small ghost" data-act="save-field" data-field="${id}">Запази промяната</button></div></div>`).join('')}</div></div><div class="stack"><div class="card emphasis"><span class="eyebrow">ТВОИТЕ УЛИКИ</span><div data-m2-clues>${d.m2.clues.length?d.m2.clues.map(clue=>`<div class="info" style="margin-top:12px">${esc(clue)}</div>`).join(''):'<p class="help">Няма получена улика. Покани останалите.</p>'}</div><p class="help">Не можеш да видиш уликите на другите агенти — общувайте помежду си.</p></div><div class="card"><span class="eyebrow">ЧЛЕНОВЕ НА ЕКИПА</span><div class="stack" data-m2-members style="gap:8px;margin-top:10px">${d.players.map(pl=>`<div class="flex between"><span class="user-chip ${pl.nickname===d.me.nickname?'me':''}">${pl.online?'● ':''}${esc(pl.nickname)}</span><span class="subtle">${pl.contributions} редакции</span></div>`).join('')}</div><p class="help">Всеки член трябва да запази поне една промяна.</p></div><div class="card"><span class="eyebrow">КОМЕНТАРИ И ПОДОБРЕНИЯ</span><div data-m2-comments style="margin:12px 0">${d.m2.comments.map(c=>`<div class="chatmsg"><small>${esc(c.nickname)}</small><p>${esc(c.body)}</p>${c.applied?'<span class="tag green">✓ Приложено</span>':`<button class="btn small ghost" data-act="apply-comment" data-comment="${c.id}">Отбележи като приложено</button>`}</div>`).join('')||'<p class="help">Още няма коментари.</p>'}</div><textarea id="comment" placeholder="Предложение за подобрение..." style="min-height:74px"></textarea><div style="margin-top:9px">${btn('add-comment','ИЗПРАТИ КОМЕНТАР','ghost small')}</div></div></div></div><div class="card" style="margin-top:17px"><p class="help">Първо попълнете всички полета, уверете се, че всеки е допринесъл, и приложете поне един коментар. Тогава натиснете проверка.</p><div class="flex" style="margin-top:13px">${btn('submit2','ПОТВЪРДИ СЪВМЕСТНАТА РАБОТА →','primary')}</div></div>`);}
function m3(d){const selected=ui.mission3.slot||'';return missionFrame(d,3,`<div class="card"><p class="instruction">Петима участници са посочили свободните си часове. Намерете <strong>единствения</strong> удобен час за всички и изберете инструмент за координиране на срещата.</p><div class="schedule"><table><thead><tr><th>Участник</th>${calSlots.map(v=>`<th>${v[1]}</th>`).join('')}</tr></thead><tbody>${calPeople.map(([name,slots])=>`<tr><td><strong>${name}</strong></td>${calSlots.map(([id])=>`<td class="${slots.includes(id)?'available':'off'}">${slots.includes(id)?'✓':'—'}</td>`).join('')}</tr>`).join('')}</tbody></table></div><span class="eyebrow">ИЗБЕРИ ОБЩИЯ ЧАС</span><div class="choices" style="margin:13px 0 22px">${calSlots.map(([slot,label])=>`<button class="choice ${selected===slot?'active':''}" data-act="choose-slot" data-slot="${slot}">${label}</button>`).join('')}</div><div class="formgrid"><div><label class="field">Инструмент за съгласуване на дата</label><select id="m3-tool" class="input" data-choose="m3-tool"><option value="">Избери инструмент</option>${['Padlet','Doodle','Google Docs','Paint'].map(x=>`<option ${ui.mission3.tool===x?'selected':''}>${x}</option>`).join('')}</select></div><div><label class="field">Защо този инструмент е подходящ?</label><textarea id="m3-reason" placeholder="Когато участниците имат различни графици...">${esc(ui.typed.m3||'')}</textarea></div></div><div style="margin-top:18px">${btn('submit3','ПРОВЕРИ ПЛАНИРАНЕТО →','primary')}</div></div>`);}
function m4(d){return missionFrame(d,4,`<div class="card"><div class="info warning" style="margin-bottom:16px"><strong>ОПАСНОСТ:</strong> „Всеки с връзката може да редактира“. Открийте какви права трябва да има всеки участник и ограничете общия достъп.</div><div class="mission-grid">${m4Needs.map(([key,label])=>`<div class="challenge"><div><span class="kicker">НАСТРОЙКА</span><strong>${label}</strong></div><select class="input" data-choose="m4" data-id="${key}"><option value="">— Избери право —</option>${m4Rights.filter(x=>key==='link'?['restricted','public-edit'].includes(x[0]):!['restricted','public-edit'].includes(x[0])).map(([val,txt])=>`<option value="${val}" ${ui.mission4[key]===val?'selected':''}>${txt}</option>`).join('')}</select></div>`).join('')}</div><div class="divider"></div><label class="field">Каква опасност може да възникне при неправилно споделяне?</label><textarea id="m4-reason" placeholder="Ако всеки с връзката има право да редактира...">${esc(ui.typed.m4||'')}</textarea><div style="margin-top:16px">${btn('submit4','ПРОВЕРИ ЗАЩИТАТА →','primary')}</div></div>`);}
function m5(d){return missionFrame(d,5,`<div class="card"><p class="instruction">Конференцията е почти спасена. Изберете подходящ инструмент за всяка дейност и аргументирайте два от изборите си.</p><div class="mission-grid">${m5Categories.map(([key,label,choices])=>`<div class="challenge"><div><span class="kicker">РЕСУРС</span><strong>${label}</strong></div><select class="input" data-choose="m5" data-id="${key}"><option value="">— Избери средство —</option>${choices.map(x=>`<option ${ui.mission5[key]===x?'selected':''}>${x}</option>`).join('')}</select></div>`).join('')}</div><div class="divider"></div><div class="two"><div><label class="field">Обосновка №1 — избор на средство за общуване</label><textarea id="m5-reason1" placeholder="Избрахме ..., защото ...">${esc(ui.typed.m5a||'')}</textarea></div><div><label class="field">Обосновка №2 — избор на средство за обща работа</label><textarea id="m5-reason2" placeholder="Избрахме ..., защото ...">${esc(ui.typed.m5b||'')}</textarea></div></div><div style="margin-top:17px">${btn('submit5','АКТИВИРАЙ ФИНАЛНИЯ КОД →','primary')}</div></div>`);}
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
  for(const attr of ['data-m2-members','data-m2-comments','data-m2-clues']){
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
  if(path==='/join'){joinPage();return;}
  if(path==='/play'){
    if(!ui.token){go('/join');return;}
    try{
      const previous=ui.playData;
      const d=await api('student/state',undefined,'student');
      if(location.pathname!==path)return;
      const stamp=playViewSignature(d);
      ui.playData=d;
      if(force||ui.playViewStamp!==stamp||!app.querySelector('.shell')){
        playPage();
        ui.playViewStamp=stamp;
      }else{
        syncStudentChrome(d);
        // Side-by-side updates preserve unsaved work in the shared document.
        syncMissionTwo(previous,d);
      }
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
function captureTyped(){for(const [id,key] of [['m1-reason','m1'],['m3-reason','m3'],['m4-reason','m4'],['m5-reason1','m5a'],['m5-reason2','m5b'],['nickname','nickname']]){const el=document.getElementById(id);if(el)ui.typed[key]=el.value;}}
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
    ui.joined=await api('public/session',{code:ui.code});ui.selectedTeam='';joinPage();
  }
  else if(act==='choose-team'){captureTyped();ui.selectedTeam=b.dataset.team;joinPage();}
  else if(act==='join'){
    captureTyped();if(!ui.selectedTeam)throw Error('Изберете отбор.');
    const r=await api('student/join',{code:ui.code,team_id:ui.selectedTeam,nickname:getVal('nickname')});ui.token=r.token;localStorage.setItem(PREFIX+'player',r.token);go('/play');
  }
  else if(act==='leave'){if(!confirm('Да излезем от екрана на играта? Напредъкът на отбора се запазва.'))return;ui.token='';localStorage.removeItem(PREFIX+'player');go('/join');}
  else if(act==='toggle-audio'){ui.audio=!ui.audio;localStorage.setItem(PREFIX+'audio',ui.audio?'on':'off');playPage();}
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
    if(m===1)payload={mapping:ui.mission1,reason:ui.typed.m1||''};
    if(m===2)payload={};
    if(m===3)payload={slot:ui.mission3.slot,tool:ui.mission3.tool,reason:ui.typed.m3||''};
    if(m===4)payload={rights:ui.mission4,risk:ui.typed.m4||''};
    if(m===5)payload={choices:ui.mission5,reason1:ui.typed.m5a||'',reason2:ui.typed.m5b||''};
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
});
window.addEventListener('popstate',()=>refresh(true));
refresh(true);
let backgroundRefreshBusy=false;
setInterval(async()=>{
  if(backgroundRefreshBusy||!['/play','/teacher'].includes(location.pathname))return;
  backgroundRefreshBusy=true;
  try{await refresh(false);}finally{backgroundRefreshBusy=false;}
},2500);
