"use strict";
(function(){
const $=id=>document.getElementById(id);
const STORE="algo01_v3_state", TEACHER="algo01_teacher_v2";
const M=[
 {title:"Подреди алгоритъма",sub:"Последователност",icon:"▦",badge:"Логик"},
 {title:"Диагностика на системата",sub:"7 тайни сигнала",icon:"⌕",badge:"Детектив"},
 {title:"Програмирай робота",sub:"5 приключения",icon:"♟",badge:"Навигатор"},
 {title:"Построй блок-схема",sub:"Два алгоритъма",icon:"◇",badge:"Архитект"},
 {title:"Финално предизвикателство",sub:"Твоят алгоритъм",icon:"✧",badge:"Майстор алгоритми"}
];
const ORDER=[
 {title:"Събуди спасителния робот",prompt:"Системата е изключена! Подреди командите, така че роботът да получи мисията.",steps:["Включи контролния панел.","Свържи спасителния робот с панела.","Избери режим „Спасителна мисия“.","Въведи целевите координати.","Натисни „Старт“."],input:"Координати на целта",output:"Роботът започва мисията"},
 {title:"Изпрати сигнал до Земята",prompt:"Космическата връзка е прекъсната. Възстанови я чрез точен ред на действията.",steps:["Включи радиопредавателя.","Провери дали каналът е активен.","Избери получателя „Земя“.","Въведи аварийното съобщение.","Изпрати сигнала."],input:"Аварийно съобщение",output:"Изпратен сигнал до Земята"},
 {title:"Зареди енергийна клетка",prompt:"Следвай точно процедурата за безопасно зареждане, без да пропускаш стъпки.",steps:["Изключи захранването на енергийната клетка.","Свържи клетката със зарядната станция.","Включи зарядната станция.","Изчакай индикаторът да покаже 100%.","Изключи зарядната станция.","Откачи напълно заредената клетка."],input:"Разредена енергийна клетка",output:"Безопасно заредена клетка"}
];

const PROPS=[
 {name:"Определеност",q:"При едни и същи входни данни един учебен алгоритъм понякога връща 4, а друг път 9. Кое свойство е нарушено?",a:["Масовост","Определеност","Крайност","Сложност"],correct:1,explain:"Определеност: в разглеждания учебен модел еднаквите входни данни водят до един и същи резултат."},
 {name:"Масовост",q:"Имаме алгоритъм, който работи само с числото 7, а задачата е да работи с всички цели числа. Кое свойство липсва?",a:["Дискретност","Резултатност","Масовост","Формалност"],correct:2,explain:"Масовост: алгоритъмът решава цял клас еднотипни задачи, а не само един конкретен пример."},
 {name:"Крайност",q:"Инструкцията е „Повтаряй това завинаги“, без възможност за завършване. Кое свойство липсва?",a:["Крайност","Определеност","Формалност","Сложност"],correct:0,explain:"Крайност: алгоритъмът трябва да завършва след краен брой стъпки."},
 {name:"Резултатност",q:"Програмата спира, но не предоставя решение или предвидения резултат. Кое свойство е нарушено?",a:["Масовост","Дискретност","Крайност","Резултатност"],correct:3,explain:"Резултатност: изпълнението трябва да води до предвиден резултат от задачата."},
 {name:"Дискретност",q:"Целият алгоритъм е една неразделена команда „Приготви закуска“. Кое свойство трябва да подобрим?",a:["Определеност","Сложност","Дискретност","Масовост"],correct:2,explain:"Дискретност: описанието трябва да съдържа ясно разграничени отделни действия."},
 {name:"Формалност",q:"На робота е дадена команда „Използвай тайния код“, но никъде не е зададен кодът. Кое свойство трябва да изпълняват инструкциите?",a:["Формалност","Масовост","Резултатност","Сложност"],correct:0,explain:"Формалност: изпълнителят следва точно описани операции, без да гадае липсваща информация."},
 {name:"Сложност",q:"Два алгоритъма дават един и същ правилен резултат, но използват различно време и памет. Кое свойство сравняваме?",a:["Крайност","Формалност","Определеност","Сложност"],correct:3,explain:"Сложност: оценяваме нужните ресурси, например време и памет."}
];
const ALT_PROMPTS=[
"При едни и същи данни навигацията веднъж показва север, друг път запад. Кое свойство е нарушено?",
"Капитанът иска алгоритъм за всички врати, но програмата може да отвори само врата №3. Кое свойство липсва?",
"Роботът изпълнява завой след завой завинаги и никога не спира. Кое свойство липсва?",
"Алгоритъмът спира, но не изпраща търсените координати към капитана. Кое свойство липсва?",
"Роботът получава само „Поправи станцията“ без изброени отделни действия. Кое свойство липсва?",
"На робота е казано да използва правилната парола, но никъде не е указана паролата. Кое свойство липсва?",
"Два маршрута дават еднакъв резултат, но единият използва 12 стъпки, а другият — 95. Кое свойство сравняваме?"
];
const ALT_PROPS=PROPS.map((p,i)=>({...p,q:ALT_PROMPTS[i]}));

const MAPS=[
 {name:"Първи сигнал",desc:"Достигни портала. Напиши пълния маршрут и наблюдавай как роботът го изпълнява.",cells:["S....",".###.","...#.","##...","...#G"],theme:"Навигация"},
 {name:"Космически лабиринт",desc:"Внимавай за стените и пробвай изпълнение стъпка по стъпка.",cells:["S..#..","##.#..","......",".####.","....#.","###..G"],theme:"Логика"},
 {name:"Кристално ядро",desc:"Преди портала събери всички сини кристали ◆. Самото стигане до целта не е достатъчно!",cells:["S...#..",".##.#..","..E....",".###.#.","....#..",".#....G"],theme:"Събиране"},
 {name:"Заключеният шлюз",desc:"Вземи ключа 🗝 и отключи шлюза 🔒, преди да продължиш към портала.",cells:["S..#..G",".#.#.#.",".K.#...","...D...",".#.#.##","...#...","...#..."],theme:"Условие"},
 {name:"Евакуация ALGO-01",desc:"Финална мисия: събери двата кристала и стигни до портала през лабиринта.",cells:["S...#...",".##.#...","...E....",".####.#.",".E......",".#####..",".......G"],theme:"Финален тест"}
];

const FLOW=[
 {title:"Четно или нечетно?",desc:"Попълни блок-схемата, която проверява дали числото n е четно.",p:[["start","Начало"],["read","Въведи n"],["condition","n % 2 == 0?"],["yes","Изведи „четно“"],["no","Изведи „нечетно“"],["end","Край"]]},
 {title:"Положително ли е x?",desc:"Ако x > 0, изведи „да“, иначе „не“.",p:[["start","Начало"],["read","Въведи x"],["condition","x > 0?"],["yes","Изведи „да“"],["no","Изведи „не“"],["end","Край"]]}
];
const FINALQ=[
 {q:"Какво са входни данни?",a:["Резултатите след изпълнението","Данните, които алгоритъмът получава","Броят компютри в клас","Цветът на блок-схемата"],correct:1,why:"Входът е информацията, с която алгоритъмът започва работа."},
 {q:"Коя фигура в блок-схема обозначава проверка на условие?",a:["Ромб","Елипса","Успоредник","Правоъгълник"],correct:0,why:"Ромбът е блокът за условие, от който излизат клонове „да“ и „не“."},
 {q:"Кое най-точно описва алгоритъм?",a:["Произволен текст","Само компютърна програма","Краен ред от ясни стъпки за решаване на задача","Списък с имена"],correct:2,why:"Алгоритъмът е ясно зададена последователност от действия, която решава задача."},
 {q:"Кога използваме повторение?",a:["Когато няма вход","Когато действия се изпълняват многократно при определено правило","Само когато програмата е грешна","Когато приключваме програмата"],correct:1,why:"Повторението организира многократно изпълнение на действия по зададено правило."}
];
const MORE_FINALQ=[
 {q:"Коя фигура в блок-схема използваме за въвеждане на данни?",a:["Ромб","Елипса","Успоредник","Петоъгълник"],correct:2,why:"Входните и изходните данни се представят с успоредник."},
 {q:"Коя инструкция е най-ясно определена за робот?",a:["Мръдни малко напред.","Направи каквото сметнеш.","Отмести се някъде.","Премести се с точно една клетка надясно."],correct:3,why:"Точната посока и разстояние позволяват на изпълнителя да действа еднозначно."},
 {q:"Какво прави проверката „ако x > 10“?",a:["Сравнява x с 10 и избира клон.","Увеличава x с 10.","Спира винаги алгоритъма.","Въвежда стойността 10."],correct:0,why:"Условието води по единия или другия клон според резултата от проверката."},
 {q:"Кога е нарушена крайността на алгоритъм?",a:["Когато има повече от три стъпки.","Когато няма възможност за завършване.","Когато има входни данни.","Когато получаваме резултат."],correct:1,why:"За крайност е необходимо изпълнението да завършва след краен брой стъпки."},
 {q:"Кое е изход на алгоритъм, който събира две числа?",a:["Двете въведени числа","Броят въпроси","Изчислената сума","Избраният език"],correct:2,why:"Изходът е резултатът на алгоритъма — изчислената сума."}
];
const allFinalQuestions=()=>FINALQ.concat(MORE_FINALQ);
const FLOW_DECOYS=[
 ["Изведи „нула“","n > 5?"],
 ["Въведи y","x == 100?"]
];
const mk=()=>({version:3,propOrder:[],propPerm:[],propVariants:[],quizOrder:[],quizPerm:[],flowBankOrder:[],nick:"",group:"",room:"",studentId:"",studentToken:"",points:[0,0,0,0,0],done:[false,false,false,false,false],orderDone:[false,false,false],propDone:Array(7).fill(false),robotDone:[false,false,false,false,false],flowDone:[false,false],quizDone:[false,false,false,false],freeDone:false,free:{task:"",input:"",steps:"",output:""}});
let st=mk();
try{const o=JSON.parse(localStorage.getItem(STORE));if(o&&o.version===3&&Array.isArray(o.orderDone)&&o.orderDone.length===3)st=Object.assign(mk(),o)}catch(e){}
let teacher=null;
try{teacher=JSON.parse(localStorage.getItem(TEACHER)||"null")}catch(e){}
let view="home",orderIdx=0,orderPool=[],orderSeq=[],propIdx=0,propNotice="",orderNotice="",robotIdx=0,cmd=[],robotTrail=[],robotNotice="",robotBusy=false,flowIdx=0,flowPlaced={},flowPick="",flowNotice="",finalNotice="",board=null,online=false,boardBusy=false;
const escapeHtml=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const shuffle=a=>{let b=[...a];for(let i=b.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[b[i],b[j]]=[b[j],b[i]]}if(b.length>1&&b.every((n,i)=>n===i))b.reverse();return b};
const countDone=()=>st.done.filter(Boolean).length;
const score=()=>st.points.reduce((a,b)=>a+b,0);
const notify=(msg)=>{const el=$("toast");el.textContent=msg;el.classList.add("show");clearTimeout(notify.timer);notify.timer=setTimeout(()=>el.classList.remove("show"),3500)};
function confetti(){if(matchMedia("(prefers-reduced-motion: reduce)").matches)return;let el=document.createElement("div");el.className="confetti";for(let i=0;i<45;i++){let s=document.createElement("span");s.style.left=(Math.random()*100)+"vw";s.style.animationDelay=(Math.random()*.6)+"s";s.style.background=["#65f6df","#ad9aff","#ffd48b","#86a7ff"][i%4];el.appendChild(s)}document.body.appendChild(el);setTimeout(()=>el.remove(),3500)}
function tally(){const prev=st.done.slice();
 st.points[0]=st.orderDone.reduce((n,done,i)=>n+(done?[6,7,7][i]:0),0);
 st.points[1]=st.propDone.reduce((n,b,i)=>n+(b?(i===6?2:3):0),0);
 st.points[2]=st.robotDone.filter(Boolean).length*4;
 st.points[3]=st.flowDone.filter(Boolean).length*10;
 st.points[4]=st.quizDone.filter(Boolean).length*2+(st.freeDone?12:0);
 st.done=[st.orderDone.every(Boolean),st.propDone.every(Boolean),st.robotDone.every(Boolean),st.flowDone.every(Boolean),st.quizDone.every(Boolean)&&st.freeDone];
 if(st.done.some((v,i)=>v&&!prev[i])){confetti();notify("✦ Възстановен модул! Отключи следващата мисия.")}
 persist();
}
function persist(){try{localStorage.setItem(STORE,JSON.stringify(st))}catch(e){} renderHud();if(st.room&&st.studentId&&st.studentToken)sendProgress()}
let syncTimer=null;
function sendProgress(){clearTimeout(syncTimer);syncTimer=setTimeout(async()=>{try{const res=await fetch("/api/class/progress",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({code:st.room,studentId:st.studentId,studentToken:st.studentToken,progress:{points:st.points,done:st.done,final:st.freeDone?st.free:{}}})});if(!res.ok&&res.status===404)notify("Онлайн стаята е изтекла. Напредъкът е запазен на устройството.")}catch(e){}},600)}
function ensureVariations(){
 if(!Array.isArray(st.propOrder)||st.propOrder.length!==7)st.propOrder=shuffle([0,1,2,3,4,5,6]);
 if(!Array.isArray(st.propPerm)||st.propPerm.length!==7)st.propPerm=Array.from({length:7},()=>shuffle([0,1,2,3]));
 if(!Array.isArray(st.propVariants)||st.propVariants.length!==7)st.propVariants=Array.from({length:7},()=>Math.random()<.5?0:1);
 if(!Array.isArray(st.quizOrder)||st.quizOrder.length!==4)st.quizOrder=shuffle(Array.from({length:allFinalQuestions().length},(_,i)=>i)).slice(0,4);
 if(!Array.isArray(st.quizPerm)||st.quizPerm.length!==4)st.quizPerm=Array.from({length:4},()=>shuffle([0,1,2,3]));
 if(!Array.isArray(st.flowBankOrder)||st.flowBankOrder.length!==2)st.flowBankOrder=[shuffle([0,1,2,3,4,5,6,7]),shuffle([0,1,2,3,4,5,6,7])];
 try{localStorage.setItem(STORE,JSON.stringify(st))}catch(e){}
}
function activeProperty(){const i=st.propOrder[propIdx];return {concept:i,q:(st.propVariants[i]?ALT_PROPS:PROPS)[i]}}
function renderHud(){
 $("playerName").textContent=st.nick||"Нов изследовател";
 $("playerClass").textContent=st.group||"Готов за приключение";
 $("rankName").textContent=score()>=80?"Командир":score()>=40?"Изследовател":"Новобранец";
 $("doneCount").textContent=countDone()+"/5";
 $("progressPercent").textContent=(countDone()*20)+"%";
 $("progressFill").style.width=(countDone()*20)+"%";
 $("totalScore").textContent=score()+" / 100";
 $("roomLabel").textContent=st.room||"Самостоятелно";
 $("missionNav").innerHTML='<div class="mission-nav">'+M.map((m,i)=>'<button type="button" class="navitem '+(view==="mission"&&window.mission===i?"active ":"")+(st.done[i]?"complete":"")+'" data-mission="'+i+'" '+(!st.nick||(i>0&&!st.done[i-1])?"disabled":"")+'><span class="nav-symbol">'+(st.done[i]?"✓":m.icon)+'</span><span><span class="navtitle">'+escapeHtml(m.title)+'</span><span class="navdesc">'+escapeHtml(m.sub)+'</span></span><span class="nav-pts">'+st.points[i]+' XP</span></button>').join("")+'</div>';
 $("hero").style.display=view==="home"?"flex":"none";
}
function heading(i,t,description){return '<div class="mission-heading"><div><div class="tagline">✦ МИСИЯ '+(i+1)+' / 5</div><h2>'+escapeHtml(t)+'</h2><p class="lead">'+escapeHtml(description)+'</p></div><span class="big-score">✦ '+st.points[i]+' / 20 XP</span></div>'}
function feedback(msg,kind){return msg?'<div class="feedback '+(kind||"")+'" role="status">'+escapeHtml(msg)+'</div>':""}
function render(){renderHud();let h="";if(view==="home")h=home();else if(view==="mission"){h=[renderOrder,renderProps,renderRobot,renderFlow,renderFinal][window.mission]()}else if(view==="summary")h=summary();else if(view==="teacher")h=teacherView();$("mainContent").innerHTML=h}
function go(next,i){if(next==="mission"&&(!st.nick||(i>0&&!st.done[i-1]))){notify("Завърши предишната мисия, за да отключиш тази.");return}view=next;if(i!==undefined)window.mission=i;render();window.scrollTo({top:0,behavior:"smooth"})}
function home(){return '<div class="tagline">СТАНЦИЯ ALGO-01 • АКТИВНА МИСИЯ</div><h2>Добре дошъл, '+escapeHtml(st.nick||"изследователю")+'! 🚀</h2><p class="lead">Петте системи на станцията чакат да ги възстановиш. Всяка мисия е ново логическо предизвикателство. Не се страхувай да грешиш: поправяй алгоритъма и опитай отново!</p>'+
 (st.nick?'<div class="row"><span class="mini-badge">Играч: '+escapeHtml(st.nick)+'</span>'+(st.room?'<span class="mini-badge">Стая: '+escapeHtml(st.room)+'</span>':'<span class="mini-badge">Самостоятелен режим</span>')+'<button class="btn ghost small" data-act="reset">Нова игра</button></div>':'<button class="btn" data-act="start-modal">Започни мисията →</button>')+
 '<div class="mission-grid">'+M.map((m,i)=>'<button class="mission-card '+(st.done[i]?"complete":(i>0&&!st.done[i-1]?"locked":""))+' '+(i===4?"wide":"")+'" data-mission="'+i+'" '+(!st.nick||(i>0&&!st.done[i-1])?"disabled":"")+'><span class="roundicon">'+m.icon+'</span><span class="corner">'+(st.done[i]?"✓ ГОТОВО":i>0&&!st.done[i-1]?"🔒 ЗАКЛЮЧЕНО":st.points[i]+" / 20 XP")+'</span><strong>0'+(i+1)+'. '+escapeHtml(m.title)+'</strong><p>'+escapeHtml(m.sub)+' · Награда: '+escapeHtml(m.badge)+'</p></button>').join("")+'</div><div class="notice">ⓘ Можеш да играеш и без стая. За общ напредък учителят създава онлайн стая и споделя шестсимволния код.</div><div class="row"><a class="btn secondary" href="/download-game.zip">↓ Изтегли играта като ZIP архив</a></div>'}
function setupOrder(i){orderIdx=i;orderPool=shuffle(ORDER[i].steps.map((_,k)=>k));orderSeq=[];orderNotice=""}
function renderOrder(){const task=ORDER[orderIdx];const row=(id,idx,part)=>'<div class="tile" draggable="true" data-tile="'+id+'" data-origin="'+part+'"><span class="ordernum">'+(part==="seq"?idx+1:"•")+'</span><span class="tiletext">'+escapeHtml(task.steps[id])+'</span><div class="tile-actions">'+(part==="seq"?'<button title="Нагоре" aria-label="Премести нагоре" data-order="up" data-index="'+idx+'">↑</button><button title="Надолу" aria-label="Премести надолу" data-order="down" data-index="'+idx+'">↓</button><button title="Премахни" data-order="remove" data-index="'+idx+'">×</button>':'<button aria-label="Добави стъпката" data-order="add" data-id="'+id+'">＋</button>')+'</div></div>';
return heading(0,"Подреди алгоритъма","Рестартирай три системи на станцията! Подреди командите във верния ред. Можеш да ги влачиш или да използваш бутоните.")+
 '<div class="stepper">'+ORDER.map((t,i)=>'<button class="step '+(i===orderIdx?"active ":"")+(st.orderDone[i]?"complete":"")+'" data-order-task="'+i+'">'+(st.orderDone[i]?"✓ ":"")+(i+1)+'. '+escapeHtml(t.title)+'</button>').join("")+'</div><div class="subpanel"><h3>'+escapeHtml(task.title)+'</h3><p>'+escapeHtml(task.prompt)+'</p><div class="diagram-basic">ВХОД ➜ ДЕЙСТВИЯ ➜ ИЗХОД</div><div class="row"><span class="mini-badge">Вход: '+escapeHtml(task.input)+'</span><span class="mini-badge">Изход: '+escapeHtml(task.output)+'</span></div></div>'+
 '<div class="order-columns"><div><h3>✧ Разбъркани инструкции</h3><div class="tiles" data-drop="pool">'+(orderPool.length?orderPool.map((id,i)=>row(id,i,"pool")).join(""):'<div class="empty">Всички стъпки са преместени.</div>')+'</div></div><div><h3>⌘ Твоят алгоритъм</h3><div class="tiles" data-drop="seq">'+(orderSeq.length?orderSeq.map((id,i)=>row(id,i,"seq")).join(""):'<div class="empty">Добавяй стъпки в правилния ред.</div>')+'</div></div></div>'+
 feedback(orderNotice,orderNotice.startsWith("✓")?"success":"error")+
 '<div class="row"><button class="btn" data-act="check-order" '+(orderSeq.length<task.steps.length?"disabled":"")+'>Провери алгоритъма →</button><button class="btn secondary" data-act="reset-order">↻ Разбъркай</button>'+(st.orderDone[orderIdx]?'<span class="mini-badge">✓ +'+[6,7,7][orderIdx]+' XP</span><button class="btn gold small" data-act="next-order">'+(orderIdx<ORDER.length-1?"Следваща задача →":"Към диагностиката →")+'</button>':"")+'</div>'}
function renderProps(){
 const {concept,q}=activeProperty(),perm=st.propPerm[concept],solved=st.propDone[concept];
 return heading(1,"Диагностика на системата","Сигналите са разбъркани, а отговорите сменят местата си при всяка нова игра. Помисли кое от седемте свойства е нарушено.")+
 '<div class="stepper">'+st.propOrder.map((c,i)=>'<button class="step '+(i===propIdx?"active ":"")+(st.propDone[c]?"complete":"")+'" data-prop="'+i+'">'+(st.propDone[c]?"✓":i+1)+'</button>').join("")+'</div>'+
 '<div class="subpanel light"><span class="mini-badge">СИГНАЛ '+(propIdx+1)+' / 7</span><h3 style="margin-top:16px">'+escapeHtml(q.q)+'</h3><div class="choice-grid">'+perm.map((raw,i)=>'<button class="choice '+(solved&&raw===q.correct?"correct":"")+'" data-prop-answer="'+raw+'" '+(solved?"disabled":"")+'><strong>'+String.fromCharCode(65+i)+'.</strong> '+escapeHtml(q.a[raw])+'</button>').join("")+'</div>'+
 feedback(solved?"✓ "+q.explain:propNotice,solved?"success":"error")+'</div>'+
 '<div class="row"><span class="mini-badge">Решени: '+st.propDone.filter(Boolean).length+' / 7</span>'+
 '<button class="btn" data-act="prop-next">'+(st.propDone.every(Boolean)?"Следваща мисия →":"Следващ сигнал →")+'</button>'+
 '<button class="btn ghost" data-act="prop-hint">💡 Подсказка</button></div>'
}

const dirs={"↑":[-1,0],"↓":[1,0],"←":[0,-1],"→":[0,1]};
let robotIndex=0,robotKey=false,robotDoor=false,robotEnergy=new Set(),robotSpeed=270,robotFinished=false;
function neededCrystals(map){let c=0;for(const row of map)for(const char of row)if(char==="E")c++;return c}
function robotResetTrace(){robotTrail=[origin(MAPS[robotIdx].cells)];robotIndex=0;robotKey=false;robotDoor=false;robotEnergy=new Set();robotFinished=false}
function setupRobot(i){robotIdx=i;cmd=[];robotNotice="";robotBusy=false;robotResetTrace()}
function robotSvg(){
 const map=MAPS[robotIdx].cells,pos=robotTrail[robotTrail.length-1],width=map[0].length;
 return '<div class="robot-grid" style="grid-template-columns:repeat('+width+',minmax(0,1fr))">'+map.map((s,r)=>s.split("").map((k,c)=>{
  const isBot=pos[0]===r&&pos[1]===c,passed=robotTrail.some(p=>p[0]===r&&p[1]===c);
  const icon=isBot?"🤖":k==="#"?"▦":k==="G"?"✦":k==="E"?(robotEnergy.has(r+","+c)?"·":"💎"):k==="K"?(robotKey?"·":"🗝️"):k==="D"?(robotDoor?"🔓":"🔒"):passed?"·":"";
  return '<div class="cell '+(k==="#"?"wall ":k==="G"?"goal ":k==="E"?"energy ":k==="K"?"key-cell ":k==="D"?"door-cell ":"")+(passed?"path ":"")+(isBot?"bot":"")+'" title="'+(isBot?"Робот":k==="#"?"Стена":k==="G"?"Портал":k==="E"?"Кристал":k==="K"?"Ключ":k==="D"?"Шлюз":"Празно")+'">'+icon+'</div>';
 }).join("")).join("")+'</div>';
}
function renderRobot(){
 const map=MAPS[robotIdx];
 const complete=st.robotDone[robotIdx];
 return heading(2,"Програмирай робота","Вече не е само лабиринт! Събирай кристали, отключвай врати и тествай кода стъпка по стъпка. Можеш да го поправяш колкото пъти пожелаеш.")+
 '<div class="stepper">'+MAPS.map((m,i)=>'<button class="step '+(i===robotIdx?"active ":"")+(st.robotDone[i]?"complete":"")+'" data-robot-level="'+i+'" '+(robotBusy?"disabled":"")+'>'+(st.robotDone[i]?"✓ ":"")+"Ниво "+(i+1)+'</button>').join("")+'</div>'+
 '<div class="robot-layout"><div>'+robotSvg()+'<div class="row" style="margin-top:12px"><span class="mini-badge">🤖 Робот</span><span class="mini-badge">✦ Портал</span><span class="mini-badge">▦ Стена</span>'+(neededCrystals(map.cells)?'<span class="mini-badge">💎 '+robotEnergy.size+'/'+neededCrystals(map.cells)+'</span>':"")+(map.cells.join("").includes("K")?'<span class="mini-badge">'+(robotKey?"🗝 Ключът е взет":"🗝 Намери ключа")+'</span>':"")+'</div></div>'+
 '<div class="subpanel" style="margin:0"><span class="mini-badge">'+escapeHtml(map.theme)+' • '+escapeHtml(map.name)+'</span><h3 style="margin-top:15px">'+escapeHtml(map.desc)+'</h3>'+
 '<p>Изпълнени команди: '+robotIndex+' / '+cmd.length+' · максимум 90</p><div class="command-row">'+(cmd.length?cmd.map((a,i)=>'<span class="command" style="'+(i<robotIndex?"background:#276858;":"")+'">'+a+'</span>').join(""):'<span class="subtle">Избери посоки, после натисни „Изпълни“ или „Една стъпка“.</span>')+'</div>'+
 '<div class="dirpad"><button class="btn secondary up" data-dir="↑" '+(robotBusy?"disabled":"")+'>↑</button><button class="btn secondary left" data-dir="←" '+(robotBusy?"disabled":"")+'>←</button><button class="btn secondary down" data-dir="↓" '+(robotBusy?"disabled":"")+'>↓</button><button class="btn secondary right" data-dir="→" '+(robotBusy?"disabled":"")+'>→</button></div>'+
 '<div class="row"><button class="btn" data-act="run-robot" '+(robotBusy||!cmd.length?"disabled":"")+'>▶ Изпълни</button><button class="btn secondary small" data-act="step-robot" '+(robotBusy||robotFinished||robotIndex>=cmd.length?"disabled":"")+'>⏭ Една стъпка</button><button class="btn ghost small" data-act="speed-robot" '+(robotBusy?"disabled":"")+'>⏱ '+(robotSpeed===550?"Бавно":robotSpeed===270?"Нормално":"Бързо")+'</button></div>'+
 '<div class="row" style="margin-top:10px"><button class="btn ghost small" data-act="undo-robot" '+(robotBusy||!cmd.length?"disabled":"")+'>↶ Премахни</button><button class="btn ghost small" data-act="clear-robot" '+(robotBusy?"disabled":"")+'>↻ Изчисти</button><button class="btn ghost small" data-act="hint-robot">💡 Подсказка</button>'+(complete&&robotIdx<MAPS.length-1?'<button class="btn gold small" data-act="next-robot">Следващо ниво →</button>':"")+'</div>'+
 feedback(robotNotice,robotNotice.startsWith("✓")?"success":robotNotice.startsWith("⚠")?"error":"")+'</div></div><p class="subtle">Управление със стрелките на клавиатурата също работи. „Една стъпка“ е режим за откриване на грешки (debugging).</p>';
}
function robotAdvance(){
 if(robotIndex>=cmd.length)return "empty";
 const map=MAPS[robotIdx].cells,d=dirs[cmd[robotIndex]],p=robotTrail[robotTrail.length-1],r=p[0]+d[0],c=p[1]+d[1],step=robotIndex+1;
 if(r<0||r>=map.length||c<0||c>=map[r].length||map[r][c]==="#"){
  robotNotice="⚠ Команда "+step+": препятствие или излизане извън картата. Поправи алгоритъма.";return "blocked";
 }
 const cell=map[r][c];
 if(cell==="D"&&!robotKey){robotNotice="⚠ Шлюзът е заключен! Намери ключа преди команда "+step+".";return "blocked"}
 robotIndex++;
 robotTrail.push([r,c]);
 if(cell==="K")robotKey=true;
 if(cell==="E")robotEnergy.add(r+","+c);
 if(cell==="D")robotDoor=true;
 if(cell==="G"){
   if(robotEnergy.size<neededCrystals(map)){robotNotice="⚠ Достигна портала, но липсват "+(neededCrystals(map)-robotEnergy.size)+" кристала. Редактирай маршрута.";return "blocked"}
   if(map.join("").includes("D")&&!robotDoor){robotNotice="⚠ Шлюзът не е бил отключен. Премини през него.";return "blocked"}
   robotFinished=true;
   robotNotice="✓ Порталът е активиран с "+robotIndex+" команди! "+(robotKey?"Ключът е използван. ":"")+(robotEnergy.size?"Кристалите са събрани.":"");
   if(!st.robotDone[robotIdx]){st.robotDone[robotIdx]=true;tally()}
   return "goal";
 }
 return "moved";
}
async function runRobot(){
 if(robotBusy||!cmd.length)return;
 robotBusy=true;robotNotice="";robotResetTrace();render();
 let result="empty";
 for(let i=0;i<cmd.length;i++){
  await new Promise(ok=>setTimeout(ok,robotSpeed));
  result=robotAdvance();
  if(view==="mission"&&window.mission===2)$("mainContent").innerHTML=renderRobot();
  if(result==="blocked"||result==="goal")break;
 }
 robotBusy=false;
 if(result==="moved"||result==="empty")robotNotice="⚠ Програмата завърши, но порталът още не е активиран. Добави или поправи команди.";
 render();
}
function robotStep(){
 if(robotBusy)return;
 const result=robotAdvance();
 if(result==="moved")robotNotice="Команда "+robotIndex+" е изпълнена. Следващата команда е готова.";
 if(result==="empty")robotNotice="⚠ Няма повече команди. Добави нови стрелки.";
 render();
}

function setupFlow(i){flowIdx=i;flowPick="";flowPlaced={};flowNotice=""}
function renderFlow(){
 const task=FLOW[flowIdx];
 const parts=task.p.concat(FLOW_DECOYS[flowIdx].map((text,i)=>["decoy"+i,text]));
 const used=Object.values(flowPlaced);
 const shape=(key,shapeName,label)=>'<div class="flow-unit">'+(label?'<span class="flow-label">'+label+'</span>':"")+
 '<button class="flow-box '+shapeName+'" data-flow-slot="'+key+'" title="Избери плочка от банката и постави в този блок">'+escapeHtml(flowPlaced[key]||"＋ празен блок")+'</button></div>';
 const bank=st.flowBankOrder[flowIdx].map(i=>parts[i]);
 return heading(3,"Построй блок-схема","Сега плочките са разбъркани, има и две подвеждащи инструкции! Построй правилните връзки на алгоритъма.")+
 '<div class="stepper">'+FLOW.map((t,i)=>'<button class="step '+(i===flowIdx?"active ":"")+(st.flowDone[i]?"complete":"")+'" data-flow-level="'+i+'">'+(st.flowDone[i]?"✓ ":"")+"Схема "+(i+1)+'</button>').join("")+'</div>'+
 '<div class="subpanel"><h3>'+escapeHtml(task.title)+'</h3><p>'+escapeHtml(task.desc)+'</p>'+
 '<div class="mini-badge">Елипса = начало/край • Успоредник = данни • Ромб = условие</div>'+
 '<p class="subtle" style="margin-top:12px">Има 8 плочки, но само 6 места. Две са ненужни за този алгоритъм. Докосни плочка и после празен блок.</p>'+
 '<div class="bank">'+bank.map(([key,text])=>'<button class="'+(flowPick===key?"selected ":"")+(used.includes(text)?"used":"")+'" data-flow-pick="'+key+'">'+escapeHtml(text)+'</button>').join("")+'</div></div>'+
 '<div class="flow-canvas">'+shape("start","pill")+"<div class='flow-arrow'>↓</div>"+shape("read","input")+"<div class='flow-arrow'>↓</div>"+shape("condition","diamond")+
 '<div class="flow-branches"><div>'+shape("yes","input","ДА")+'</div><div>'+shape("no","input","НЕ")+'</div></div>'+
 '<div class="flow-arrow">↘　↙</div><div class="flow-end">'+shape("end","pill")+'</div></div>'+
 feedback(flowNotice,flowNotice.startsWith("✓")?"success":flowNotice.startsWith("⚠")?"error":"")+
 '<div class="row" style="margin-top:17px"><button class="btn" data-act="check-flow">Провери блок-схемата</button>'+
 '<button class="btn secondary" data-act="clear-flow">↻ Изчисти</button>'+
 '<button class="btn ghost" data-act="hint-flow">💡 Подсказка</button><span class="mini-badge">Поставени '+Object.keys(flowPlaced).length+' / 6</span></div>'+
 (st.flowDone[flowIdx]?'<div class="subpanel light"><h3>🧪 Изпитай алгоритъма с число</h3><div class="row"><input class="text-input" type="number" id="flowExample" value="4" style="max-width:150px" aria-label="Примерно число"><button class="btn gold" data-act="simulate-flow">▶ Тествай блок-схемата</button></div></div>':"");
}
function renderFinal(){
 return heading(4,"Финално предизвикателство","Въпросите и отговорите се разместват при всяка нова игра. След теста изгради собствен алгоритъм и го предай за преглед.")+
 '<div class="subpanel"><h3>Част А · 4 случайни въпроса × 2 XP</h3>'+
 st.quizOrder.map((index,i)=>{const q=allFinalQuestions()[index];return '<div class="question"><strong>'+(i+1)+'. '+escapeHtml(q.q)+'</strong><div class="choice-grid">'+
 st.quizPerm[i].map((j,display)=>'<button class="choice '+(st.quizDone[i]&&q.correct===j?"correct":"")+'" data-final-q="'+i+'" data-final-a="'+j+'" '+(st.quizDone[i]?"disabled":"")+'><b>'+String.fromCharCode(65+display)+'.</b> '+escapeHtml(q.a[j])+'</button>').join("")+
 '</div>'+(st.quizDone[i]?feedback("✓ "+q.why,"success"):"")+'</div>'}).join("")+'</div>'+
 '<div class="subpanel light"><h3>Част Б · Създай свой алгоритъм · 12 XP</h3><p>Мисия: помогни на станцията, като опишеш нов алгоритъм. Например „провери температурата“, „избери по-голямото число“, „подготви робота за зареждане“.</p>'+
 '<div class="field"><label for="freeTask">Каква задача решава алгоритъмът?</label><input id="freeTask" maxlength="230" value="'+escapeHtml(st.free.task)+'" placeholder="Например: проверка дали температурата е опасна"></div>'+
 '<div class="field"><label for="freeInput">Входни данни</label><input id="freeInput" maxlength="230" value="'+escapeHtml(st.free.input)+'" placeholder="Например: измерена температура"></div>'+
 '<div class="field"><label for="freeSteps">Точни инструкции — една на ред</label><textarea id="freeSteps" maxlength="2200" placeholder="1. Прочети температурата&#10;2. Провери дали е над 40&#10;3. Покажи предупреждение или нормален статус">'+escapeHtml(st.free.steps)+'</textarea></div>'+
 '<div class="field"><label for="freeOutput">Изход / резултат</label><input id="freeOutput" maxlength="230" value="'+escapeHtml(st.free.output)+'" placeholder="Например: безопасно / опасно"></div>'+
 '<div class="notice">⚠ Получаваш 12 XP за попълнена структура. Смисловата правилност се преглежда от учителя — това не е автоматична оценка.</div>'+
 feedback(finalNotice,finalNotice.startsWith("✓")?"success":"error")+
 '<div class="row"><button class="btn" data-act="submit-free" '+(st.freeDone?"disabled":"")+'>✦ Предай алгоритъма</button><span class="mini-badge">'+(st.freeDone?"✓ Изпратен за преглед":"Очаква алгоритъм")+'</span></div></div>';
}

function summary(){return '<div class="trophy"><div class="trophy-icon">'+(countDone()===5?"🏆":"🛰️")+'</div><div class="tagline">'+(countDone()===5?"МИСИЯТА Е ИЗПЪЛНЕНА":"ТЕКУЩ РЕЗУЛТАТ")+'</div><h2>'+escapeHtml(st.nick||"Командире")+', '+(countDone()===5?"спаси станцията!":"продължавай!")+'</h2><div class="trophy-score">'+score()+' / 100 XP</div><p>'+countDone()+' от 5 възстановени модула</p></div>'+
 '<div class="subpanel"><h3>Отчет от мисиите</h3>'+M.map((m,i)=>'<div class="statline"><span>'+m.icon+' '+escapeHtml(m.title)+'</span><strong>'+st.points[i]+' / 20 XP '+(st.done[i]?"✓":"")+'</strong></div>').join("")+'</div>'+
 '<div class="subpanel"><h3>Спечелени отличия</h3><div class="row">'+M.map((m,i)=>'<span class="mini-badge" style="opacity:'+(st.done[i]?"1":".38")+'">'+(st.done[i]?"★ ":"◇ ")+escapeHtml(m.badge)+'</span>').join("")+'</div></div>'+
 '<div class="row"><button class="btn gold" data-act="print">▤ Принтирай сертификат</button><button class="btn secondary" data-act="export-json">↓ Изтегли отчет</button><button class="btn ghost" data-act="home">Към мисиите</button></div><div class="notice">Точките са за учебна обратна връзка. За свободния алгоритъм се проверява наличието на части, не смисловата правилност.</div>'}
function teacherView(){const b=board,students=b&&b.students||[];return '<div class="tagline">♙ ПАНЕЛ ЗА УЧИТЕЛЯ</div><h2>Контролен център</h2><p class="lead">Създай онлайн стая, покажи кода на учениците и следи напредъка по мисии. Няма нужда от ученически акаунти.</p>'+
 (!teacher?'<div class="subpanel"><h3>Стартирай нов учебен час</h3><p>Системата ще създаде код за учениците и секретен ключ за твоя учителски екран.</p><button class="btn" data-act="create-room">＋ Създай класна стая</button></div>':
 '<div class="subpanel light"><span class="mini-badge">АКТИВНА СТАЯ · ВРЕМЕННА</span><div class="code-display">'+escapeHtml(teacher.code)+'</div><div class="row"><button class="btn" data-act="copy-room">▢ Копирай линка за учениците</button><button class="btn secondary" data-act="refresh-board">↻ Обнови</button><button class="btn ghost" data-act="export-csv">↓ CSV за Excel</button><button class="btn danger" data-act="new-room">Нова стая</button></div><p style="margin-top:14px">Учениците отварят сайта и въвеждат този код. Учителският таен ключ остава само на това устройство.</p></div>')+
 '<div class="notice">Важно за Render Free: резултатите в онлайн стаята се пазят временно в паметта на сървъра (максимум 48 часа). При рестартиране или заспиване на услугата могат да изчезнат. Експортирай CSV преди края на часа. Учениците пазят своя напредък и локално.</div>'+
 (teacher?'<div class="grid-info"><div class="info-card"><b>'+(b?b.count:0)+'</b><span>Присъединили се</span></div><div class="info-card"><b>'+(b?b.complete:0)+'</b><span>Завършили всичко</span></div><div class="info-card"><b>'+(b?b.average:0)+'/100</b><span>Среден резултат</span></div></div><div class="subpanel"><h3>Напредък на учениците</h3>'+(students.length?'<div class="tablewrap"><table class="teacher-table"><thead><tr><th>Псевдоним</th><th>Мисии</th><th>XP</th><th>Алгоритъм</th></tr></thead><tbody>'+students.map((s,i)=>'<tr><td>'+escapeHtml(s.name)+'</td><td>'+s.done.filter(Boolean).length+'/5</td><td>'+s.score+'/100</td><td>'+(s.final&&s.final.task?'<button class="btn ghost small" data-review="'+i+'">Преглед</button>':'—')+'</td></tr>').join("")+'</tbody></table></div>':'<div class="empty">Все още няма ученици в тази стая. Покажи кода на дъската.</div>')+'</div>':"")}
async function api(path,body,headers){const opts={headers:Object.assign({},headers||{}),cache:"no-store"};if(body!==undefined){opts.method="POST";opts.headers["Content-Type"]="application/json";opts.body=JSON.stringify(body)}const res=await fetch(path,opts);const type=res.headers.get("Content-Type")||"";const data=type.includes("json")?await res.json():null;if(!res.ok)throw Error(data&&data.error||"Грешка при връзката със сървъра.");return data}
async function createRoom(){try{const r=await api("/api/class/create",{});teacher={code:r.code,key:r.teacherKey};localStorage.setItem(TEACHER,JSON.stringify(teacher));board=null;render();notify("Нова стая "+r.code+" е създадена.");await getBoard()}catch(e){notify(e.message)}}
async function joinRoom(code,nick){const r=await api("/api/class/join",{code,nickname:nick});st.room=r.code;st.studentId=r.studentId;st.studentToken=r.studentToken}
async function getBoard(){if(!teacher||boardBusy)return;boardBusy=true;try{board=await api("/api/class/board",undefined,{"X-Class-Code":teacher.code,"X-Teacher-Key":teacher.key});if(view==="teacher")render()}catch(e){if(view==="teacher")notify(e.message)}finally{boardBusy=false}}
async function exportCsv(){if(!teacher)return;try{const res=await fetch("/api/class/export",{headers:{"X-Class-Code":teacher.code,"X-Teacher-Key":teacher.key}});if(!res.ok)throw Error("Невъзможен експорт.");const blob=await res.blob();downloadBlob(blob,"ALGO01-"+teacher.code+".csv")}catch(e){notify(e.message)}}
function downloadBlob(blob,name){const u=URL.createObjectURL(blob);const a=document.createElement("a");a.href=u;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),1000)}
function modal(markup){$("modalRoot").innerHTML='<div class="overlay" role="presentation"><div class="modal" role="dialog" aria-modal="true">'+markup+'</div></div>'}
function closeModal(){if(st.nick)$("modalRoot").innerHTML=""}
function introModal(){
 const invited=new URLSearchParams(location.search).get("room");
 if(invited){studentModal(false);return}
 modal('<div class="modal-header"><div><div class="tagline">ПРИСЪЕДИНИ СЕ КЪМ ALGO-01</div><h2>Избери своята роля 🚀</h2></div>'+(st.nick?'<button class="close" data-act="close-modal">×</button>':"")+'</div>'+
 '<p>Един сайт, два режима — интерактивна игра за учениците и контролен център за учителя.</p>'+
 '<div class="role-grid"><button class="role-card" data-act="student-mode"><span class="role-icon">🚀</span><b>Аз съм ученик</b><span>Влез в стая с код или играй самостоятелно.</span></button>'+
 '<button class="role-card teacher-role" data-act="teacher-access"><span class="role-icon">🧑‍🏫</span><b>Аз съм учител</b><span>Създай стая и наблюдавай резултатите на класа.</span></button></div>'+
 '<button class="btn ghost" data-act="solo-mode" style="width:100%;margin-top:13px">⚡ Самостоятелна игра без код</button>'+
 '<div class="notice">Няма нужда от ученически имейли или регистрации. Въвежда се само псевдоним.</div>');
}
function studentModal(solo){
 const p=solo?"":(new URLSearchParams(location.search).get("room")||st.room||"");
 modal('<div class="modal-header"><div><div class="tagline">НОВА МИСИЯ</div><h2>Добре дошъл на борда! 🚀</h2></div><button class="close" data-act="role-back" aria-label="Назад">←</button></div>'+
 '<p>Въведи псевдоним. Не използвай истински фамилии или имейл адреси.</p><form id="startForm">'+
 '<div class="field"><label for="nickname">Твоят псевдоним</label><input id="nickname" required minlength="2" maxlength="32" autocomplete="off" placeholder="Например: Космо17" value="'+escapeHtml(st.nick)+'"></div>'+
 '<div class="field"><label for="group">Клас или група (по желание)</label><input id="group" maxlength="26" placeholder="Например: 10А" value="'+escapeHtml(st.group)+'"></div>'+
 (solo?'':'<div class="field"><label for="classCode">Код на учителската стая (по желание)</label><input id="classCode" maxlength="8" placeholder="Например: 7KMPQ4" value="'+escapeHtml(p)+'"></div>')+
 '<button class="btn" type="submit">Започни приключението →</button><div id="entryError" class="subtle" role="status"></div></form>'+
 '<div class="notice">'+(solo?"Самостоятелният напредък се запазва в браузъра.":"Ако нямаш код, остави полето празно и играй самостоятелно.")+'</div>');
}

function helpModal(){modal('<div class="modal-header"><h2>Как се играе? ✦</h2><button class="close" data-act="close-modal">×</button></div><p>Премини през петте мисии по ред. Получаваш XP за верните решения и отключваш следващия модул. Грешките не отнемат точки.</p><div class="subpanel"><div class="statline">▦ Подреди алгоритъма <b>2 задачи</b></div><div class="statline">⌕ Открий грешката <b>7 казуса</b></div><div class="statline">♟ Програмирай робота <b>5 приключения</b></div><div class="statline">◇ Построй блок-схема <b>2 схеми</b></div><div class="statline">✧ Финално предизвикателство <b>4 въпроса + практика</b></div></div><p>На финала можеш да изтеглиш отчет и да принтираш сертификат. Учителят може да създаде онлайн стая със споделен код.</p><button class="btn" data-act="close-modal">Разбрах!</button>')}
function reviewModal(i){const s=board&&board.students[i];if(!s)return;const f=s.final||{};modal('<div class="modal-header"><h2>Алгоритъм на '+escapeHtml(s.name)+'</h2><button class="close" data-act="close-modal">×</button></div><div class="subpanel"><strong>Задача:</strong><p>'+escapeHtml(f.task||"—")+'</p><strong>Вход:</strong><p>'+escapeHtml(f.input||"—")+'</p><strong>Стъпки:</strong><p style="white-space:pre-wrap">'+escapeHtml(f.steps||"—")+'</p><strong>Изход:</strong><p>'+escapeHtml(f.output||"—")+'</p></div><div class="notice">Учителят проверява дали описаният алгоритъм е логически верен и достатъчно ясен.</div>')}
function clickTile(action,idx,id){if(action==="add"){const at=orderPool.indexOf(id);if(at<0)return;orderPool.splice(at,1);orderSeq.push(id)}else if(action==="remove"){if(idx>=orderSeq.length)return;orderPool.push(orderSeq.splice(idx,1)[0])}else if(action==="up"||action==="down"){const j=idx+(action==="up"?-1:1);if(j<0||j>=orderSeq.length)return;[orderSeq[idx],orderSeq[j]]=[orderSeq[j],orderSeq[idx]]}orderNotice="";render()}
async function handleClick(e){
const b=e.target.closest("button");if(!b)return;
if(b.dataset.mission!==undefined){go("mission",Number(b.dataset.mission));return}
if(b.dataset.orderTask!==undefined){setupOrder(Number(b.dataset.orderTask));render();return}
if(b.dataset.order!==undefined){clickTile(b.dataset.order,Number(b.dataset.index),Number(b.dataset.id));return}
if(b.dataset.prop!==undefined){propIdx=Number(b.dataset.prop);propNotice="";render();return}
if(b.dataset.propAnswer!==undefined){const q=activeProperty().q,ans=Number(b.dataset.propAnswer);if(!st.propDone[activeProperty().concept]){if(ans===q.correct){st.propDone[activeProperty().concept]=true;propNotice="";tally();render()}else{propNotice="Не съвсем. Помисли за определението на свойството и опитай пак.";render()}}return}
if(b.dataset.robotLevel!==undefined){if(robotBusy)return;setupRobot(Number(b.dataset.robotLevel));render();return}
if(b.dataset.dir!==undefined){if(robotBusy||cmd.length>=90)return;cmd.push(b.dataset.dir);robotResetTrace();robotNotice="";render();return}
if(b.dataset.flowLevel!==undefined){setupFlow(Number(b.dataset.flowLevel));render();return}
if(b.dataset.flowPick!==undefined){flowPick=b.dataset.flowPick;render();return}
if(b.dataset.flowSlot!==undefined){if(!flowPick)return;const part=FLOW[flowIdx].p.concat(FLOW_DECOYS[flowIdx].map((text,i)=>["decoy"+i,text])).find(p=>p[0]===flowPick);if(part){for(const key in flowPlaced)if(flowPlaced[key]===part[1])delete flowPlaced[key];flowPlaced[b.dataset.flowSlot]=part[1]}flowPick="";flowNotice="";render();return}
if(b.dataset.finalQ!==undefined){const i=Number(b.dataset.finalQ),a=Number(b.dataset.finalA);if(st.quizDone[i])return;if(a===allFinalQuestions()[st.quizOrder[i]].correct){st.quizDone[i]=true;tally();render()}else notify("Не е този отговор. Опитай отново.");return}
if(b.dataset.review!==undefined){reviewModal(Number(b.dataset.review));return}
switch(b.dataset.act){
case "home":go("home");break;
case "summary":go("summary");break;
case "teacher":go("teacher");if(teacher)await getBoard();break;
case "start-modal":introModal();break;
case "student-mode":studentModal(false);break;
case "solo-mode":studentModal(true);break;
case "role-back":if(st.nick){$("modalRoot").innerHTML=""}else introModal();break;
case "teacher-access":$("modalRoot").innerHTML="";go("teacher");if(teacher)await getBoard();break;
case "close-modal":closeModal();break;
case "help":helpModal();break;
case "reset":if(confirm("Нова игра? Текущият напредък ще бъде изтрит само от това устройство.")){st=mk();ensureVariations();localStorage.removeItem(STORE);view="home";setupOrder(0);setupRobot(0);setupFlow(0);render();introModal()}break;
case "check-order":if(orderSeq.length===ORDER[orderIdx].steps.length&&orderSeq.every((v,i)=>v===i)){if(!st.orderDone[orderIdx]){st.orderDone[orderIdx]=true;tally()}orderNotice="✓ Отлично! Инструкциите са подредени в правилната последователност."}else orderNotice="Стъпките още не са в правилния ред. Опитай да откриеш какво трябва да се случи по-рано.";render();break;
case "reset-order":setupOrder(orderIdx);render();break;
case "next-order":if(st.orderDone[orderIdx]&&orderIdx<ORDER.length-1){setupOrder(orderIdx+1);render()}else if(st.orderDone.every(Boolean)){go("mission",1)}break;
case "prop-next":{const next=st.propOrder.findIndex((c,i)=>i>propIdx&&!st.propDone[c]);const first=st.propOrder.findIndex(c=>!st.propDone[c]);if(next<0&&first<0){go("mission",2);break}propIdx=next<0?first:next;propNotice="";render();break}
case "prop-hint":propNotice="Подсказка: сравни конкретния проблем с определенията за свойствата от учебника.";render();break;
case "run-robot":await runRobot();break;
case "step-robot":robotStep();break;
case "speed-robot":robotSpeed=robotSpeed===550?270:robotSpeed===270?100:550;render();break;
case "hint-robot":{const map=MAPS[robotIdx].cells;robotNotice=map.join("").includes("K")&&!robotKey?"💡 Първо намери символа 🗝️. Шлюзът не се отваря без ключ.":neededCrystals(map)>robotEnergy.size?"💡 Преди да стигнеш портала, посети всяко поле с 💎.":"💡 Планирай безопасен път до ✦. Пробвай „Една стъпка“, за да откриеш грешките.";render();break}
case "next-robot":if(st.robotDone[robotIdx]&&robotIdx<MAPS.length-1){setupRobot(robotIdx+1);render()}break;
case "undo-robot":cmd.pop();robotResetTrace();robotNotice="";render();break;
case "clear-robot":cmd=[];robotResetTrace();robotNotice="";render();break;
case "check-flow":{const task=FLOW[flowIdx];if(task.p.every(([key,text])=>flowPlaced[key]===text)){if(!st.flowDone[flowIdx]){st.flowDone[flowIdx]=true;tally()}flowNotice="✓ Блок-схемата е вярна! И двата клона на условието са поставени правилно."}else flowNotice="⚠ Има неправилно поставени блокове. Провери условието, формите и клоновете ДА/НЕ.";render();break}
case "clear-flow":setupFlow(flowIdx);render();break;
case "hint-flow":flowNotice="Подсказка: елипсите са за Начало и Край. В успоредника се въвеждат или извеждат данни. Ромбът проверява условие, а „ДА“ и „НЕ“ водят до различни изходи.";render();break;
case "simulate-flow":{if(!st.flowDone[flowIdx])break;const raw=$("flowExample").value.trim();if(!raw||!Number.isFinite(Number(raw))){flowNotice="⚠ Въведи валидно число.";render();break}const n=Number(raw),yes=flowIdx===0?n%2===0:n>0;flowNotice="✓ При вход "+n+" условието е "+(yes?"ДА":"НЕ")+". Резултат: "+(flowIdx===0?(yes?"четно":"нечетно"):(yes?"да":"не"))+".";render();break}
case "submit-free":{const f=st.free;const steps=f.steps.split(/\n/).filter(x=>x.replace(/^\s*\d+[.)]\s*/,"").trim().length>=6);if(f.task.trim().length<8||f.input.trim().length<3||f.output.trim().length<3||steps.length<3){finalNotice="Попълни задачата, входа, изхода и поне 3 смислени стъпки на отделни редове.";render();break}st.freeDone=true;finalNotice="✓ Структурата е предадена. Учителят ще провери смисловата правилност.";tally();render();break}
case "print":window.print();break;
case "export-json":downloadBlob(new Blob([JSON.stringify({game:"ALGO-01",nickname:st.nick,group:st.group,points:st.points,done:st.done,final:st.free},null,2)],{type:"application/json"}),"ALGO01-"+(st.nick.replace(/[^a-zA-Z0-9а-яА-Я]/g,"").slice(0,20)||"student")+".json");break;
case "create-room":await createRoom();break;
case "new-room":if(confirm("Създаване на нова стая? Преди това експортирай резултатите от текущата стая."))await createRoom();break;
case "copy-room":if(teacher){const link=location.origin+"/?room="+teacher.code;try{await navigator.clipboard.writeText(link);notify("Линкът е копиран: "+link)}catch(e){notify(link)}}break;
case "refresh-board":await getBoard();break;
case "export-csv":await exportCsv();break;
}}
async function handleSubmit(e){if(e.target.id!=="startForm")return;e.preventDefault();const nick=$("nickname").value.trim(),group=$("group").value.trim(),code=$("classCode")?$("classCode").value.trim().toUpperCase():"";if(nick.length<2)return;const err=$("entryError");err.textContent="Свързване...";try{st=mk();ensureVariations();st.nick=nick;st.group=group;if(code)await joinRoom(code,nick);$("modalRoot").innerHTML="";try{history.replaceState(null,"",location.pathname)}catch(e){}persist();go("home");if(code)notify("Успешно присъединяване към стая "+st.room)}catch(error){err.textContent=error.message+" Ако нямаш код, изтрий го и започни самостоятелно."}}
function onDrop(e){const zone=e.target.closest("[data-drop]");if(!zone||view!=="mission"||window.mission!==0)return;e.preventDefault();try{const d=JSON.parse(e.dataTransfer.getData("application/json"));const id=Number(d.id);if(d.from==="pool"&&zone.dataset.drop==="seq")clickTile("add",0,id);else if(d.from==="seq"&&zone.dataset.drop==="pool"){const i=orderSeq.indexOf(id);if(i>=0)clickTile("remove",i,0)}else if(d.from==="seq"&&zone.dataset.drop==="seq"){let i=orderSeq.indexOf(id);const tile=e.target.closest(".tile");let to=tile?orderSeq.indexOf(Number(tile.dataset.tile)):orderSeq.length-1;if(i>=0&&to>=0&&i!==to){orderSeq.splice(i,1);orderSeq.splice(to,0,id);render()}}}catch(err){}}
async function connect(){try{const r=await api("/api/health");online=!!r.ok;$("connection").textContent="◉ Онлайн станция"}catch(e){online=false;$("connection").textContent="◌ Самостоятелна игра"}}
function init(){window.mission=0;setupOrder(0);setupRobot(0);setupFlow(0);render();connect();if(!st.nick)introModal();document.addEventListener("click",handleClick);document.addEventListener("submit",handleSubmit);$("teacherButton").addEventListener("click",()=>{go("teacher");if(teacher)getBoard()});$("helpButton").addEventListener("click",helpModal);$("homeButton").addEventListener("click",()=>go("home"));$("summaryButton").addEventListener("click",()=>go("summary"));document.addEventListener("input",e=>{const fields={freeTask:"task",freeInput:"input",freeSteps:"steps",freeOutput:"output"};if(fields[e.target.id]){st.free[fields[e.target.id]]=e.target.value;try{localStorage.setItem(STORE,JSON.stringify(st))}catch(err){}}});document.addEventListener("dragstart",e=>{const tile=e.target.closest("[data-tile]");if(tile&&e.dataTransfer)e.dataTransfer.setData("application/json",JSON.stringify({id:tile.dataset.tile,from:tile.dataset.origin}))});document.addEventListener("dragover",e=>{if(e.target.closest("[data-drop]"))e.preventDefault()});document.addEventListener("drop",onDrop);document.addEventListener("keydown",e=>{if(view!=="mission"||window.mission!==2||robotBusy||["INPUT","TEXTAREA"].includes(document.activeElement.tagName))return;const codes={ArrowUp:"↑",ArrowDown:"↓",ArrowLeft:"←",ArrowRight:"→"};if(codes[e.key]&&cmd.length<90){e.preventDefault();cmd.push(codes[e.key]);robotResetTrace();render()}});setInterval(()=>{if(view==="teacher"&&teacher)getBoard()},5000)}
ensureVariations();
init();
})();