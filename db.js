'use strict';
const ST=['events','todos','routines','checks','notes'],ALL=[...ST,'meta'];
const DB={db:null,
open(){return new Promise((res,rej)=>{const r=indexedDB.open('mydaily',2);
 r.onupgradeneeded=()=>{const d=r.result; // 버전별 마이그레이션: 기존 저장소는 절대 삭제하지 않고 없는 것만 생성
  ST.slice(0,3).forEach(n=>{if(!d.objectStoreNames.contains(n))d.createObjectStore(n,{keyPath:'id'})});
  if(!d.objectStoreNames.contains('checks'))d.createObjectStore('checks',{keyPath:'key'});
  if(!d.objectStoreNames.contains('notes'))d.createObjectStore('notes',{keyPath:'date'});
  if(!d.objectStoreNames.contains('meta'))d.createObjectStore('meta',{keyPath:'k'})};
 r.onsuccess=()=>{this.db=r.result;this.db.onversionchange=()=>this.db.close();res()};
 r.onerror=()=>rej(r.error);r.onblocked=()=>rej(new Error('다른 탭에서 앱이 열려 있습니다. 닫고 다시 실행해 주세요.'))})},
tx(s,fn){return new Promise((res,rej)=>{const t=this.db.transaction(s,'readwrite');let o;t.oncomplete=()=>res(o);t.onerror=t.onabort=()=>rej(t.error||new Error('저장 실패'));o=fn(t)})},
all(s){return new Promise((res,rej)=>{const q=this.db.transaction(s).objectStore(s).getAll();q.onsuccess=()=>res(q.result);q.onerror=()=>rej(q.error)})},
put(s,v){return this.tx([s],t=>{t.objectStore(s).put(v)})},
del(s,k){return this.tx([s],t=>{t.objectStore(s).delete(k)})},
replaceAll(d){return this.tx(ST,t=>{ST.forEach(s=>{const o=t.objectStore(s);o.clear();(d[s]||[]).forEach(v=>o.put(v))})})}, // 단일 트랜잭션: 실패 시 전체 취소(기존 데이터 보존)
wipe(){return this.tx(ALL,t=>{ALL.forEach(s=>t.objectStore(s).clear())})}};
