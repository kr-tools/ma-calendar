'use strict';
const VER='1.0.7',$=s=>document.querySelector(s),pad=n=>String(n).padStart(2,'0');
const ds=d=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`,today=()=>ds(new Date());
const P=s=>{const[a,b,c]=s.split('-').map(Number);return new Date(a,b-1,c)};
const addD=(s,n)=>{const d=P(s);d.setDate(d.getDate()+n);return ds(d)};
const DOW=['일','월','화','수','목','금','토'],PRI={high:'높음',mid:'보통',low:'낮음'},PO={high:0,mid:1,low:2};
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,8);
let S={events:[],todos:[],routines:[],checks:[],notes:[]},CK=new Set(),NT={},META={},tab='home',sv=null,calM=today().slice(0,7),selD=today(),rD=today(),PERSIST=null,EST=null,delFn=null,Q=Promise.resolve(),SO=null,SD=null;
async function load(){for(const k in S)S[k]=await DB.all(k);CK=new Set(S.checks.map(c=>c.key));NT=Object.fromEntries(S.notes.map(n=>[n.date,n.text]));META=Object.fromEntries((await DB.all('meta')).map(x=>[x.k,x.v]))}
// 모든 변경은 직렬 처리: IndexedDB 저장 완료 후에만 화면 갱신 및 성공 안내
function run(fn,msg='저장되었습니다'){Q=Q.then(async()=>{try{await fn();await load();render();toast(msg)}catch(e){console.error(e);toast('저장 중 오류가 발생했습니다: '+(e.message||e),1)}});return Q}
function toast(m,err){const t=$('#toast');t.textContent=m;t.className='show'+(err?' err':'');clearTimeout(toast.t);toast.t=setTimeout(()=>t.className='',err?4500:2000)}
const bar=p=>`<div class="bar"><i style="width:${p}%"></i></div>`;
const applies=(r,d)=>d>=r.start&&r.days.includes(P(d).getDay())&&(r.delAt?d<r.delAt:r.active);
const dayRate=d=>{const l=S.routines.filter(r=>applies(r,d)||CK.has(r.id+'|'+d));return{n:l.length,k:l.filter(r=>CK.has(r.id+'|'+d)).length}};
const pct=(k,n)=>n?Math.round(k/n*100):0;
function rng(a,b){let n=0,k=0;for(let d=a;d<=b;d=addD(d,1)){const r=dayRate(d);n+=r.n;k+=r.k}return pct(k,n)}
function streak(){const t=today();let s=0,d=t;for(let i=0;i<730;i++,d=addD(d,-1)){const r=dayRate(d);if(!r.n)continue;if(r.k<r.n){if(d===t)continue;break}s++}return s}
const sec=(t,more,body)=>`<section class="card"><div class="hd"><h2>${t}</h2><div>${more}</div></div>${body}</section>`;
const go=(t,l)=>`<button class="btn sm ghost" data-a="tab" data-t="${t}">${l} ›</button>`;
function evList(d){const l=S.events.filter(e=>e.date===d).sort((a,b)=>(a.time||'').localeCompare(b.time||''));
 return l.length?l.map(e=>`<div class="li"><span class="time">${e.time||'종일'}</span><div class="g" data-a="editEv" data-id="${esc(e.id)}"><p>${esc(e.title)}</p><small>${esc(e.memo)}</small></div></div>`).join(''):'<p class="empty">등록된 일정이 없어요</p>'}
function tdList(d){const l=S.todos.filter(t=>t.date===d).sort((a,b)=>a.done-b.done||PO[a.pri]-PO[b.pri]);
 return l.length?l.map(t=>`<div class="li ${t.done?'done':''}"><button class="cb ${t.done?'on':''}" data-a="tt" data-id="${esc(t.id)}" aria-label="완료"></button><div class="g" data-a="editTd" data-id="${esc(t.id)}"><p>${esc(t.title)}<span class="pri ${t.pri}">${PRI[t.pri]}</span></p></div>${t.done?'':`<button class="ic" title="내일로 미루기" data-a="next" data-id="${esc(t.id)}">➜</button>`}<button class="ic" title="삭제" data-a="tdel" data-id="${esc(t.id)}">✕</button></div>`).join(''):'<p class="empty">등록된 할 일이 없어요</p>'}
const rtList=d=>{const l=S.routines.filter(r=>applies(r,d));return l.length?l.map(r=>`<div class="li"><button class="cb ${CK.has(r.id+'|'+d)?'on':''}" data-a="tr" data-id="${esc(r.id)}" data-d="${d}"></button><div class="g"><p>${esc(r.name)}</p><small>${esc(r.desc)}</small></div></div>`).join(''):'<p class="empty">이 날 수행할 루틴이 없어요</p>'};
function vHome(){const t=today(),d=P(t),h=new Date().getHours(),r=dayRate(t);
 return`<div class="top"><h1>Calendar</h1><div class="d">${d.getFullYear()}년 ${d.getMonth()+1}월 ${d.getDate()}일 ${DOW[d.getDay()]}요일</div><small>${h<12?'좋은 아침이에요. 오늘도 차분하게 시작해요.':h<18?'오후도 힘내요. 할 일을 하나씩 해결해 봐요.':'오늘 하루도 수고했어요.'}</small></div>`+
 sec('오늘의 일정',`${go('cal','캘린더')}<button class="btn sm" data-a="addEv" data-d="${t}">+ 추가</button>`,evList(t))+
 sec('오늘의 할 일',`${go('cal','캘린더')}<button class="btn sm" data-a="addTd" data-d="${t}">+ 추가</button>`,tdList(t))+
 (NT[t]?memoSec(t,'오늘의 메모'):'')+
 sec('오늘의 루틴',go('routine','루틴'),`${r.n?`<div class="stats"><span>${r.n}개 중 ${r.k}개 완료</span><b>${pct(r.k,r.n)}%</b></div>${bar(pct(r.k,r.n))}`:''}${rtList(t)}`)}
const dots=d=>(S.events.some(x=>x.date===d)?'<i></i>':'')+(S.todos.some(x=>x.date===d)?'<i class="t"></i>':'')+(NT[d]?'<i class="n"></i>':'');
function memoSec(d,t='메모'){const v=NT[d];return sec(t,`<button class="btn sm" data-a="addNote" data-d="${d}">${v?'✎ 수정':'+ 메모'}</button>`,v?`<div class="memo" data-a="addNote" data-d="${d}">${esc(v)}</div>`:'<p class="empty">작성된 메모가 없어요</p>')}
function vCal(){const f=P(calM+'-01'),y=f.getFullYear(),m=f.getMonth(),n=new Date(y,m+1,0).getDate(),t=today();
 let c=DOW.map(x=>`<span>${x}</span>`).join('')+'<span></span>'.repeat(f.getDay());
 for(let i=1;i<=n;i++){const d=`${calM}-${pad(i)}`,e=S.events.some(x=>x.date===d),k=S.todos.some(x=>x.date===d);
  c+=`<button class="day ${d===t?'today':''} ${d===selD?'sel':''}" data-a="sel" data-d="${d}">${i}<span class="dots">${dots(d)}</span></button>`}
 const sd=P(selD),dl=`${sd.getMonth()+1}월 ${sd.getDate()}일 (${DOW[sd.getDay()]})`;
 return`<div class="top"><h1>Calendar</h1></div><section class="card"><div class="nav2"><button class="btn sm ghost" data-a="mp">‹</button><b>${y}년 ${m+1}월</b><button class="btn sm ghost" data-a="mn">›</button><button class="btn sm" data-a="mt">오늘</button></div><div class="grid">${c}</div><small>● 일정 &nbsp;<span style="color:#e0a458">●</span> 할 일 &nbsp;<span style="color:#8aa4d6">●</span> 메모</small></section>`+
 sec(`${dl} 일정`,`<button class="btn sm" data-a="addEv" data-d="${selD}">+ 일정</button>`,evList(selD))+
 sec(`${dl} 할 일`,`<button class="btn sm" data-a="addTd" data-d="${selD}">+ 할 일</button>`,tdList(selD))+memoSec(selD,`${dl} 메모`)}
function strip(){const t=today();let h='';for(let i=-90;i<=60;i++){const d=addD(t,i),D=P(d),r=dayRate(d),v=d>t?'':r.n?pct(r.k,r.n):'-';h+=`<div class="sd ${i?'':'today'}" data-d="${d}"><small>${DOW[D.getDay()]}</small><b>${D.getDate()}</b><em>${v}</em></div>`}return`<div id="strip" class="strip">${h}</div>`}
function fixStrip(){const s=$('#strip');if(!s)return;const t=today(),c=s.children[90],mid=()=>c.offsetLeft-(s.clientWidth-c.offsetWidth)/2;if(SO==null||SD!==t){s.scrollLeft=mid();SD=t}else s.scrollLeft=SO;SO=s.scrollLeft;s.onscroll=()=>{SO=s.scrollLeft}}
function vRoutine(){const t=today(),w=(P(t).getDay()+6)%7,r=dayRate(rD),d=P(rD),cnt=S.routines.map(x=>[x.name+(x.delAt?' (삭제됨)':''),S.checks.filter(c=>c.rid===x.id).length]).filter(x=>x[1]||true);
 const act=S.routines.filter(x=>!x.delAt);
 return`<div class="top"><h1>Calendar</h1></div>`+
 sec('루틴 체크',`<button class="btn sm" data-a="addRt">+ 루틴</button>`,`<div class="nav2"><button class="btn sm ghost" data-a="rp">‹</button><b>${d.getMonth()+1}월 ${d.getDate()}일 (${DOW[d.getDay()]})</b><button class="btn sm ghost" data-a="rn">›</button><button class="btn sm" data-a="rt">오늘</button></div>${r.n?`<div class="stats"><span>${r.n}개 중 ${r.k}개</span><b>${pct(r.k,r.n)}%</b></div>${bar(pct(r.k,r.n))}`:''}${rtList(rD)}`)+
 sec('통계',`<button class="btn sm ghost" data-a="sl">‹</button><button class="btn sm" data-a="st">오늘</button><button class="btn sm ghost" data-a="sr">›</button>`,`${strip()}<div class="stats"><span>연속 달성 일수</span><b>${streak()}일</b></div><h2 style="margin:12px 0 4px">루틴별 완료 횟수</h2>${cnt.length?cnt.map(x=>`<div class="li"><div class="g"><p>${esc(x[0])}</p></div><b>${x[1]}회</b></div>`).join(''):'<p class="empty">아직 루틴이 없어요</p>'}`)+
 sec('루틴 관리','',act.length?act.map(x=>`<div class="li"><div class="g" data-a="editRt" data-id="${esc(x.id)}"><p>${esc(x.name)}${x.active?'':' <span class="pri">비활성</span>'}</p><small>${x.days.length===7?'매일':[...x.days].sort().map(i=>DOW[i]).join(' ')}</small></div><button class="ic" data-a="editRt" data-id="${esc(x.id)}">✎</button></div>`).join(''):'<p class="empty">루틴을 추가해 보세요</p>')}
function vSet(){const top='<div class="top"><h1>Calendar</h1></div>';
 if(sv!=='bk')return top+`<button class="menu" data-a="sv" data-v="bk"><b>데이터 백업 및 복원</b><small>데이터를 파일로 저장해 두거나, 저장해 둔 파일에서 되살릴 수 있어요.</small><i>›</i></button>`;
 const lb=META.lastBackup?new Date(META.lastBackup).toLocaleString('ko-KR'):'없음',us=EST&&EST.usage!=null?` (사용량 약 ${(EST.usage/1024).toFixed(0)}KB)`:'';
 return top+`<button class="btn ghost back" data-a="sv" data-v="">← 설정으로 돌아가기</button>`+
 sec('데이터 백업','',`<p class="muted">최근 백업: ${lb}</p><button class="btn full" data-a="exp">백업 파일 저장 (JSON)</button>`)+
 sec('데이터 복원','',`<p class="muted">백업 파일을 불러오면 현재 데이터가 백업 내용으로 교체됩니다. 잘못된 파일은 거부되며 기존 데이터는 보호됩니다.</p><button class="btn full ghost" data-a="imp">백업 파일 불러오기</button>`)+
 sec('저장 상태','',`<p class="muted">데이터는 이 기기의 브라우저(IndexedDB)에만 저장됩니다.<br>영구 저장 권한: ${PERSIST===null?'이 브라우저에서 지원하지 않음':PERSIST?'허용됨':'미허용 (정기적으로 백업해 주세요)'}${us}<br>현재 저장된 일정 ${S.events.length} · 할 일 ${S.todos.length} · 루틴 ${S.routines.filter(r=>!r.delAt).length} · 체크 기록 ${S.checks.length}건 · 메모 ${S.notes.length}건</p>`)+
 sec('기타','',`<p class="muted">앱 버전 ${VER}</p><button class="btn danger full" data-a="wipe">전체 데이터 삭제</button>`)}
function render(){$('#main').innerHTML={home:vHome,cal:vCal,routine:vRoutine,set:vSet}[tab]();document.querySelectorAll('nav button').forEach(b=>b.classList.toggle('on',b.dataset.t===tab));$('#main').className=tab==='routine'?'rt':'';if(tab==='routine')fixStrip()}
// ---- 입력 폼 ----
const F=(n,l,t,v,r,o)=>({n,l,t,v,r,o});
function fld(f){const v=esc(f.v??'');
 if(f.t==='textarea')return`<label>${f.l}<textarea name="${f.n}">${v}</textarea></label>`;
 if(f.t==='select')return`<label>${f.l}<select name="${f.n}">${f.o.map(o=>`<option value="${o[0]}" ${o[0]===f.v?'selected':''}>${o[1]}</option>`).join('')}</select></label>`;
 if(f.t==='days')return`<label>${f.l}</label><div class="frow" style="margin:0"><button type="button" class="btn sm ghost" data-a="pre" data-p="0123456">매일</button><button type="button" class="btn sm ghost" data-a="pre" data-p="12345">평일</button><button type="button" class="btn sm ghost" data-a="pre" data-p="06">주말</button></div><div class="chips">${[1,2,3,4,5,6,0].map(i=>`<label class="chip"><input type="checkbox" name="d" value="${i}" ${f.v.includes(i)?'checked':''}><span>${DOW[i]}</span></label>`).join('')}</div>`;
 if(f.t==='check')return`<label class="chk"><input type="checkbox" name="${f.n}" ${f.v?'checked':''}> ${f.l}</label>`;
 return`<label>${f.l}<input type="${f.t}" name="${f.n}" value="${v}" ${f.r?'required':''} ${f.r&&f.t==='text'?'pattern=".*\\S.*" maxlength="100"':''}></label>`}
function modal(title,fields,ok,del){const m=$('#modal');delFn=del;m.className='open';
 m.innerHTML=`<div class="sheet"><h3>${title}</h3><form id="f">${fields.map(fld).join('')}<div class="frow"><button type="button" class="btn ghost" data-a="close">취소</button><button class="btn">저장</button></div>${del?'<button type="button" class="btn danger full" data-a="mdel">삭제</button>':''}</form></div>`;
 $('#f').onsubmit=e=>{e.preventDefault();if(ok(new FormData(e.target))!==false)closeM()}}
const closeM=()=>{$('#modal').className='';$('#modal').innerHTML='';delFn=null};
const A={};
A.tab=e=>{tab=e.dataset.t;sv=null;SO=null;$('#main').scrollTop=0;render()};
A.sv=e=>{sv=e.dataset.v||null;$('#main').scrollTop=0;render()};
A.close=closeM;A.mdel=()=>{const f=delFn;closeM();f&&f()};
A.pre=e=>{document.querySelectorAll('[name=d]').forEach(c=>c.checked=e.dataset.p.includes(c.value))};
A.tt=e=>{const t=S.todos.find(x=>x.id===e.dataset.id);t&&run(()=>DB.put('todos',{...t,done:!t.done}),t.done?'완료를 취소했어요':'완료!')};
A.next=e=>{const t=S.todos.find(x=>x.id===e.dataset.id);t&&run(()=>DB.put('todos',{...t,date:addD(t.date,1)}),'다음 날로 옮겼어요')};
A.tdel=e=>{if(confirm('이 할 일을 삭제할까요?'))run(()=>DB.del('todos',e.dataset.id),'삭제되었습니다')};
A.tr=e=>{const k=e.dataset.id+'|'+e.dataset.d;run(()=>CK.has(k)?DB.del('checks',k):DB.put('checks',{key:k,rid:e.dataset.id,date:e.dataset.d}),'기록했어요')};
A.addEv=e=>evForm(null,e.dataset.d);A.editEv=e=>evForm(S.events.find(x=>x.id===e.dataset.id));
function evForm(v,d){modal(v?'일정 수정':'일정 추가',[F('title','제목','text',v?.title,1),F('date','날짜','date',v?.date||d,1),F('time','시작 시간','time',v?.time),F('memo','상세 메모','textarea',v?.memo)],
 f=>{run(()=>DB.put('events',{id:v?.id||uid(),title:f.get('title').trim(),date:f.get('date'),time:f.get('time')||'',memo:f.get('memo').trim()}))},v&&(()=>{if(confirm('이 일정을 삭제할까요?'))run(()=>DB.del('events',v.id),'삭제되었습니다')}))}
A.addTd=e=>tdForm(null,e.dataset.d);A.editTd=e=>tdForm(S.todos.find(x=>x.id===e.dataset.id));
function tdForm(v,d){modal(v?'할 일 수정':'할 일 추가',[F('title','할 일','text',v?.title,1),F('date','날짜','date',v?.date||d,1),F('pri','중요도','select',v?.pri||'mid',0,[['high','높음'],['mid','보통'],['low','낮음']])],
 f=>{run(()=>DB.put('todos',{id:v?.id||uid(),title:f.get('title').trim(),date:f.get('date'),pri:f.get('pri'),done:v?v.done:false}))},v&&(()=>{if(confirm('이 할 일을 삭제할까요?'))run(()=>DB.del('todos',v.id),'삭제되었습니다')}))}
A.addRt=()=>rtForm(null);A.editRt=e=>rtForm(S.routines.find(x=>x.id===e.dataset.id));
function rtForm(v){modal(v?'루틴 수정':'루틴 추가',[F('name','루틴 이름','text',v?.name,1),F('desc','간단한 설명','text',v?.desc),F('days','반복 요일','days',v?.days||[0,1,2,3,4,5,6]),F('start','시작일','date',v?.start||today(),1),F('active','활성화','check',v?v.active:true)],
 f=>{const days=f.getAll('d').map(Number);if(!days.length){toast('반복 요일을 선택해 주세요',1);return false}
  run(()=>DB.put('routines',{id:v?.id||uid(),name:f.get('name').trim(),desc:(f.get('desc')||'').trim(),days,start:f.get('start'),active:f.get('active')==='on'}))},
 v&&(()=>{if(confirm('루틴을 삭제할까요?\n오늘 이후로는 표시되지 않으며, 과거 완료 기록과 통계는 보존됩니다.'))run(()=>DB.put('routines',{...v,active:false,delAt:today()}),'삭제되었습니다 (과거 기록은 보존)')}))}
const mv=n=>{const d=P(calM+'-01');d.setMonth(d.getMonth()+n);calM=ds(d).slice(0,7);render()};
A.mp=()=>mv(-1);A.mn=()=>mv(1);A.mt=()=>{calM=today().slice(0,7);selD=today();render()};A.sel=e=>{selD=e.dataset.d;render()};
A.rp=()=>{rD=addD(rD,-1);render()};A.rn=()=>{rD=addD(rD,1);render()};A.rt=()=>{rD=today();render()};
A.exp=()=>{const now=new Date(),o={app:'MY_DAILY',version:1,appVersion:VER,exportedAt:now.toISOString(),data:{events:S.events,todos:S.todos,routines:S.routines,checks:S.checks,notes:S.notes}};
 const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(o,null,2)],{type:'application/json'}));a.download=`MY_DAILY_backup_${ds(now)}.json`;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),5000);
 run(()=>DB.put('meta',{k:'lastBackup',v:now.toISOString()}),'백업 파일을 만들었어요')};
A.imp=()=>$('#file').click();
A.wipe=()=>{if(!confirm('모든 일정, 할 일, 루틴, 기록이 삭제됩니다.\n계속할까요?'))return;if(!confirm('정말 삭제할까요? 되돌릴 수 없습니다.\n(먼저 백업을 권장합니다)'))return;run(()=>DB.wipe(),'모든 데이터를 삭제했어요')};
function check(o){if(!o||typeof o!=='object'||o.app!=='MY_DAILY'||!o.data)return'Calendar 백업 파일이 아닙니다.';const s=x=>typeof x==='string'&&x,dt=x=>/^\d{4}-\d\d-\d\d$/.test(x),d=o.data,
 R={events:x=>s(x.id)&&s(x.title)&&dt(x.date),todos:x=>s(x.id)&&s(x.title)&&dt(x.date)&&PRI[x.pri]&&typeof x.done==='boolean',routines:x=>s(x.id)&&s(x.name)&&Array.isArray(x.days)&&x.days.every(n=>Number.isInteger(n)&&n>=0&&n<=6)&&dt(x.start)&&typeof x.active==='boolean',checks:x=>s(x.key)&&s(x.rid)&&dt(x.date),notes:x=>dt(x.date)&&typeof x.text==='string'};
 if(d.notes===undefined)d.notes=[];for(const k in R){if(!Array.isArray(d[k]))return`'${k}' 데이터가 없습니다.`;if(!d[k].every(x=>x&&typeof x==='object'&&R[k](x)))return`'${k}' 데이터 형식이 올바르지 않습니다.`}return null}
$('#file').onchange=async e=>{const f=e.target.files[0];e.target.value='';if(!f)return;const keep='\n기존 데이터는 그대로 유지됩니다.';let o;
 try{o=JSON.parse(await f.text())}catch{return alert('복원 실패: 올바른 JSON 파일이 아니거나 손상되었습니다.'+keep)}
 const er=check(o);if(er)return alert('복원 실패: '+er+keep);const d=o.data;
 if(!confirm(`백업 시각: ${o.exportedAt?new Date(o.exportedAt).toLocaleString('ko-KR'):'알 수 없음'}\n일정 ${d.events.length} · 할 일 ${d.todos.length} · 루틴 ${d.routines.length} · 기록 ${d.checks.length} · 메모 ${d.notes.length}\n\n현재 데이터가 이 백업으로 교체됩니다. 계속할까요?`))return;
 run(()=>DB.replaceAll(d),'복원이 완료되었습니다')};
function noteForm(d){const v=NT[d]||'';modal(v?'메모 수정':'메모 추가',[F('text','메모','textarea',v)],f=>{const x=f.get('text').trim();if(!x){toast('내용을 입력해 주세요',1);return false}run(()=>DB.put('notes',{date:d,text:x,updated:Date.now()}),'메모를 저장했어요')},v&&(()=>{if(confirm('이 날짜의 메모를 삭제할까요?'))run(()=>DB.del('notes',d),'삭제되었습니다')}))}
A.addNote=e=>noteForm(e.dataset.d);
const sc=n=>{const s=$('#strip');if(s)s.scrollBy({left:n*s.clientWidth,behavior:'smooth'})};
A.sl=()=>sc(-1);A.sr=()=>sc(1);
A.st=()=>{const s=$('#strip'),c=s&&s.children[90];if(c)s.scrollTo({left:c.offsetLeft-(s.clientWidth-c.offsetWidth)/2,behavior:'smooth'})};
document.addEventListener('click',e=>{const el=e.target.closest('[data-a]');if(el&&A[el.dataset.a])A[el.dataset.a](el);else if(e.target.id==='modal')closeM()});
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&!$('#modal').className)render()});
(async()=>{try{await DB.open();await load()}catch(e){$('#main').innerHTML=`<div class="card"><h2>저장소를 열 수 없습니다</h2><p class="muted">${esc(e.message)}<br>사생활 보호 모드이거나 저장소가 차단되었을 수 있습니다.</p></div>`;return}
 if(navigator.storage&&navigator.storage.persist){try{PERSIST=(await navigator.storage.persisted())||(await navigator.storage.persist())}catch{PERSIST=false}}
 try{EST=await navigator.storage.estimate()}catch{}
 render();
 if('serviceWorker'in navigator){const had=!!navigator.serviceWorker.controller;navigator.serviceWorker.register('service-worker.js').catch(()=>{});let rl=false;navigator.serviceWorker.addEventListener('controllerchange',()=>{if(had&&!rl&&!$('#modal').className){rl=true;location.reload()}})}})();
