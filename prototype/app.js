'use strict';
const $ = id => document.getElementById(id);
const WEAPONS = ['대검','태도','한손검','쌍검','해머','수렵피리','랜스','건랜스','슬래시액스','차지액스','조충곤','라이트보우건','헤비보우건','활'];
const GRADES = ['극종결','종결','준종결','상급','일반'];
const KEY = 'mhwilds-inventory-prototype-v1';
let records = [], selected = new Set(), tagMode = 'add';
function announce(message){$('message').textContent=message;}
function option(select,value,label){const el=document.createElement('option');el.value=value;el.textContent=label;select.append(el);}
WEAPONS.forEach(w=>option($('weapon'),w,w));$('weapon').value='태도';
for(const id of ['commonFilter','weaponFilter']){option($(id),'','전체');GRADES.forEach(g=>option($(id),g,g));option($(id),'미분류','미분류');}
for(let i=1;i<=3;i++){$('skills').insertAdjacentHTML('beforeend',`<label>스킬 ${i}<input id="skill${i}" maxlength="60"></label><label>레벨<input id="level${i}" type="number" min="1" max="10"></label>`);}
function validateRecord(r){
 if(!r||typeof r.id!=='string'||!r.id||!Array.isArray(r.skills)||r.skills.length<1||r.skills.length>3)throw Error('호석의 ID 또는 스킬 정보를 확인하세요.');
 if(r.skills.some(s=>!s||typeof s.name!=='string'||!s.name.trim()||!Number.isInteger(s.level)||s.level<1||s.level>10))throw Error('스킬 이름과 레벨을 확인하세요.');
 if(new Set(r.skills.map(s=>s.name.trim())).size!==r.skills.length)throw Error('같은 스킬을 중복 입력할 수 없습니다.');
 for(const key of ['weaponSlots','armorSlots'])if(!Array.isArray(r[key])||r[key].length>3||r[key].some(x=>!Number.isInteger(x)||x<1||x>3))throw Error('슬롯은 종류별 최대 3개, 크기 1~3으로 입력하세요.');
 if(!Array.isArray(r.tags)||r.tags.some(x=>typeof x!=='string'||x.length>40)||typeof r.memo!=='string'||!Number.isFinite(r.created))throw Error('태그·메모·등록일 형식을 확인하세요.');
 return {id:r.id,skills:r.skills.map(s=>({name:s.name.trim(),level:s.level})),weaponSlots:[...r.weaponSlots],armorSlots:[...r.armorSlots],tags:[...new Set(r.tags)],memo:r.memo,created:r.created};
}
function validateList(list){if(!Array.isArray(list))throw Error('호석 목록 형식이 잘못됐습니다.');const clean=list.map(validateRecord);if(new Set(clean.map(r=>r.id)).size!==clean.length)throw Error('중복 ID가 있습니다.');return clean;}
try{records=validateList(JSON.parse(localStorage.getItem(KEY)||'[]'));}catch(e){announce('저장 데이터를 읽지 못했습니다. '+e.message);}
function commit(next){try{localStorage.setItem(KEY,JSON.stringify(next));records=next;render();return true;}catch(e){announce('저장하지 못했습니다. 백업을 보관해주세요. '+e.message);return false;}}
function visible(){const q=$('query').value.trim().toLowerCase(),tag=$('manualFilter').value.trim(),type=$('slotType').value,min=Number($('slotMin').value);
 const list=records.filter(r=>(!q||[...r.skills.map(s=>s.name),r.memo].join(' ').toLowerCase().includes(q))&&(!tag||r.tags.some(t=>t.includes(tag)))&&(!(min||type)||(type?r[type+'Slots']:[...r.weaponSlots,...r.armorSlots]).some(x=>x>=Math.max(1,min)))&&(!$('commonFilter').value||$('commonFilter').value==='미분류')&&(!$('weaponFilter').value||$('weaponFilter').value==='미분류'));
 const mode=$('sort').value;return list.sort((a,b)=>mode==='old'?a.created-b.created:mode==='slot'?Math.max(0,...b.weaponSlots,...b.armorSlots)-Math.max(0,...a.weaponSlots,...a.armorSlots)||b.created-a.created:b.created-a.created);
}
function cell(tr,text,cls){const td=document.createElement('td');td.textContent=text;if(cls)td.className=cls;tr.append(td);return td;}
function render(){const list=visible();$('rows').replaceChildren();$('count').textContent=`전체 ${records.length}개 · 표시 ${list.length}개`;$('weaponHeading').textContent=$('weapon').value+' 평가';
 for(const r of list){const tr=document.createElement('tr');const check=document.createElement('input');check.type='checkbox';check.checked=selected.has(r.id);check.setAttribute('aria-label',r.skills.map(s=>s.name).join(', ')+' 선택');check.onchange=()=>{check.checked?selected.add(r.id):selected.delete(r.id);render();};cell(tr,'').append(check);
 cell(tr,r.skills.map(s=>`${s.name} Lv.${s.level}`).join(' / '),'skills-text');cell(tr,`무기 ${r.weaponSlots.join('·')||'—'} / 방어구 ${r.armorSlots.join('·')||'—'}`);cell(tr,'미분류','pending');cell(tr,'미분류','pending');const tags=cell(tr,'');r.tags.forEach(t=>{const el=document.createElement('span');el.className='badge';el.textContent=t;tags.append(el);});cell(tr,r.memo||'—');const edit=document.createElement('button');edit.textContent='상세·수정';edit.onclick=()=>openEditor(r);cell(tr,'').append(edit);$('rows').append(tr);}
 $('empty').hidden=list.length>0;$('empty').querySelector('h2').textContent=records.length?'조건에 맞는 호석이 없습니다':'첫 호석을 등록해보세요';$('empty').querySelector('p').textContent=records.length?'필터 조건을 줄이거나 초기화해보세요.':'직접 입력하거나 백업 파일을 가져올 수 있습니다.';
 $('selected').textContent=selected.size+'개 선택';for(const id of ['tag','untag','delete'])$(id).disabled=!selected.size;$('all').checked=list.length>0&&list.every(r=>selected.has(r.id));$('all').indeterminate=list.some(r=>selected.has(r.id))&&!$('all').checked;
}
function openEditor(r){$('form').reset();$('formError').textContent='';$('editId').value=r?.id||'';$('formTitle').textContent=r?'호석 상세·수정':'호석 입력';if(r){r.skills.forEach((s,i)=>{$('skill'+(i+1)).value=s.name;$('level'+(i+1)).value=s.level;});$('weaponSlots').value=r.weaponSlots.join(', ');$('armorSlots').value=r.armorSlots.join(', ');$('tags').value=r.tags.join(', ');$('memo').value=r.memo;}$('editor').showModal();$('skill1').focus();}
function slots(text){if(!text.trim())return [];const tokens=text.split(',').map(t=>t.trim());if(tokens.some(t=>!/^\d+$/.test(t)))throw Error('슬롯을 쉼표로 구분한 숫자로 입력하세요.');return tokens.map(Number).filter(x=>x!==0).sort((a,b)=>b-a);}
$('form').onsubmit=e=>{e.preventDefault();try{const skills=[];for(let i=1;i<=3;i++){const name=$('skill'+i).value.trim(),level=$('level'+i).value;if(!name&&!level)continue;if(!name||!level)throw Error('스킬 이름과 레벨을 함께 입력하세요.');skills.push({name,level:Number(level)});}const id=$('editId').value,existing=records.find(r=>r.id===id);const r=validateRecord({id:id||crypto.randomUUID(),skills,weaponSlots:slots($('weaponSlots').value),armorSlots:slots($('armorSlots').value),tags:$('tags').value.split(',').map(t=>t.trim()).filter(Boolean),memo:$('memo').value,created:existing?.created||Date.now()});const next=id?records.map(x=>x.id===id?r:x):[...records,r];if(commit(next)){announce('호석을 저장했습니다. 자동 평가는 기준 연결 후 적용됩니다.');if($('continue').checked&&!id){$('form').reset();$('skill1').focus();}else $('editor').close();}}catch(err){$('formError').textContent=err.message;}};
for(const id of ['add','emptyAdd'])$(id).onclick=()=>openEditor();$('close').onclick=()=>$('editor').close();
for(const id of ['weapon','query','commonFilter','weaponFilter','manualFilter','slotType','slotMin','sort'])$(id).addEventListener('input',render);
$('reset').onclick=()=>{for(const id of ['query','commonFilter','weaponFilter','manualFilter','slotType'])$(id).value='';$('slotMin').value='0';$('sort').value='new';render();};
$('all').onchange=()=>{for(const r of visible())$('all').checked?selected.add(r.id):selected.delete(r.id);render();};
for(const [id,mode] of [['tag','add'],['untag','remove']])$(id).onclick=()=>{tagMode=mode;$('tagForm').reset();$('tagTitle').textContent=mode==='add'?'수동 태그 일괄 추가':'수동 태그 일괄 제거';$('tagDialog').showModal();$('bulkTag').focus();};
$('tagCancel').onclick=()=>$('tagDialog').close();$('tagForm').onsubmit=e=>{e.preventDefault();const tag=$('bulkTag').value.trim();if(!tag)return;const next=records.map(r=>!selected.has(r.id)?r:{...r,tags:tagMode==='add'?[...new Set([...r.tags,tag])]:r.tags.filter(t=>t!==tag)});if(commit(next)){$('tagDialog').close();announce('선택한 호석의 수동 태그를 변경했습니다.');}};
$('delete').onclick=()=>{if(confirm(`선택한 호석 ${selected.size}개를 삭제할까요?`)){if(commit(records.filter(r=>!selected.has(r.id)))){selected.clear();render();announce('선택한 호석을 삭제했습니다.');}}};
$('export').onclick=()=>{const blob=new Blob([JSON.stringify({format:KEY,records},null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='와일즈_호석_화면초안_백업.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);announce('호석 백업을 저장했습니다. 이 초안에는 자동 태그 기준과 세팅 데이터가 없습니다.');};
$('restore').onclick=()=>$('restoreFile').click();$('restoreFile').onchange=async e=>{const file=e.target.files[0];if(!file)return;try{const data=JSON.parse(await file.text());if(data.format!==KEY)throw Error('이 화면 초안의 백업 파일이 아닙니다.');const next=validateList(data.records);if(confirm(`현재 ${records.length}개를 백업의 ${next.length}개로 교체할까요?`)){if(commit(next)){selected.clear();render();announce('호석 백업을 복원했습니다.');}}}catch(err){announce('복원하지 못했습니다. 기존 목록은 유지됩니다. '+err.message);}e.target.value='';};
render();
