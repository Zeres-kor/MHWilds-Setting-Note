'use strict';
const SavedBuilds=(()=>{
 const parts=['head','chest','arms','waist','legs'];
 const fail=()=>{throw Error('저장 세팅 형식이 잘못됐습니다.');};
 const str=(s,max=160)=>{if(typeof s!=='string'||s.length>max)fail();return s;};
 const num=(n,max=100000)=>{if(!Number.isSafeInteger(n)||n<0||n>max)fail();return n;};
 const resistanceMap=(v,condition=false)=>{if(v===null||v===undefined)return null;if(typeof v!=='object'||Array.isArray(v))fail();const out={};for(const[k,n]of Object.entries(v)){if(!['fire','water','thunder','ice','dragon'].includes(k)||(n!==null&&(!Number.isInteger(n)||n < (condition?-25:-100)||n > (condition?25:100))))fail();if(!condition&&n===null)fail();out[k]=n;}if(!condition&&Object.keys(out).length!==5)fail();return out;};
 const list=(a,max)=>{if(!Array.isArray(a)||a.length>max)fail();return a;};
 const slots=a=>list(a,3).map(n=>{if(n<1||n>3)fail();return num(n,3);});
 // Optional display metadata is captured at save time, never refreshed from live data.
 const skillKind=k=>{if(!['weapon','armor','set','group'].includes(k))fail();return k;};
 const namedLevel=s=>({name:str(s.name),level:num(s.level,10)});
 function detailMetadata(v){if(v==null)return null;return {
  equipment:list(v.equipment,6).map(a=>({part:str(a.part),rarity:a.rarity==null?null:num(a.rarity,10),kind:str(a.kind||''),nativeSkills:list(a.nativeSkills,100).map(namedLevel),nativeBonuses:list(a.nativeBonuses,10).map(b=>({id:num(b.id),name:str(b.name),kind:skillKind(b.kind)}))})),
  skills:list(v.skills,200).map(s=>({name:str(s.name),id:num(s.id),maxLevel:num(s.maxLevel,10),kind:skillKind(s.kind)})),
  bonuses:list(v.bonuses,40).map(b=>({id:num(b.id),name:str(b.name),kind:skillKind(b.kind),parts:list(b.parts,6).map(p=>{if(!['weapon',...parts].includes(p))fail();return p;}),ranks:list(b.ranks,10).map(r=>({level:num(r.level,10),pieces:num(r.pieces,6),name:str(r.name||'')}))})),
  charmRarities:list(v.charmRarities,10).map(n=>num(n,10)),charmOwned:v.charmOwned===true
 };}
 function validateList(entries){const clean=list(entries,200).map(e=>{
  const b=e.build;if(!b)fail();
  const equipment=list(b.equipment,6).map(a=>({id:num(a.id),name:str(a.name),part:str(a.part),slots:slots(a.slots)}));
  if(equipment.length!==6||new Set(equipment.map(a=>a.part)).size!==6||!['weapon',...parts].every(p=>equipment.some(a=>a.part===p)))fail();
  const charm=b.charm===null?null:{skills:list(b.charm.skills,3).map(s=>({name:str(s.name),level:num(s.level,10)})),weaponSlots:slots(b.charm.weaponSlots),armorSlots:slots(b.charm.armorSlots)};
  const used=new Set();const decorations=list(b.decorations,24).map(d=>{const kind=str(d.kind),owner=str(d.owner),index=num(d.index,2),size=num(d.size,3),required=num(d.required,3);if(!['weapon','armor'].includes(kind)||required<1||size<required)fail();const available=owner==='talisman'?charm?.[kind+'Slots']:equipment.find(a=>a.part===owner)?.slots;if(!available||available[index]!==size||(owner!=='talisman'&&kind!==(owner==='weapon'?'weapon':'armor')))fail();const key=owner+kind+index;if(used.has(key))fail();used.add(key);return {id:num(d.id),name:str(d.name),kind,owner,index,size,required};});
  const skills=list(b.skills,200).map(s=>({name:str(s.name),level:num(s.level,10)}));if(new Set(skills.map(s=>s.name)).size!==skills.length)fail();
  const weaponBonuses=list(b.weaponBonuses||[],2).map(s=>{if(!['set','group'].includes(s.kind))fail();return {id:num(s.id),name:str(s.name),kind:s.kind};});if(new Set(weaponBonuses.map(s=>s.kind)).size!==weaponBonuses.length)fail();
  const goals=list(b.goals,Infinity).map(g=>({name:str(g.name),required:num(g.required,10),level:num(g.level,10)}));if(goals.some(g=>g.required<1||g.level<g.required))fail();
  const bonuses=list(b.bonuses,40).map(x=>({name:str(x.name),effect:str(x.effect),pieces:num(x.pieces,6)}));
  return {...(e.folderId===undefined?{}:{folderId:str(e.folderId,80)}),id:str(e.id,80),name:str(e.name,80),memo:str(e.memo,1000),created:num(e.created,Number.MAX_SAFE_INTEGER),build:{detail:detailMetadata(b.detail),equipment,charm,decorations,skills,goals,bonuses,weaponBonuses,resistances:resistanceMap(b.resistances),minResistances:resistanceMap(b.minResistances||{},true),defense:num(b.defense,2000),source:str(b.source),mode:str(b.mode,20)}};
 });if(clean.some(e=>!e.id||!e.name.trim())||new Set(clean.map(e=>e.id)).size!==clean.length)fail();return clean;}
 function snapshot(result,data,mode){const totals={};for(const item of [result.weapon,...result.armor,...result.decorations.map(p=>p.decoration)])for(const[id,n]of Object.entries(item.skills))totals[id]=(totals[id]||0)+n;for(const s of result.charm?.skills||[]){const skill=data.skills.find(x=>x.name===s.name);if(skill)totals[skill.id]=(totals[skill.id]||0)+s.level;}
 const items=[result.weapon,...result.armor];
 const detail={equipment:items.map(a=>({part:a.part||'weapon',rarity:a.rarity??null,kind:a.kind||'',nativeSkills:Object.entries(a.skills).map(([id,level])=>({name:data.skills.find(s=>s.id===Number(id))?.name||'알 수 없는 스킬',level})),nativeBonuses:(a.bonuses||[]).map(id=>data.skills.find(s=>s.id===id)).filter(Boolean).map(s=>({id:s.id,name:s.name,kind:s.kind}))})),skills:data.skills.filter(s=>totals[s.id]).map(s=>({id:s.id,name:s.name,maxLevel:s.maxLevel,kind:s.kind})),bonuses:data.skills.filter(s=>['set','group'].includes(s.kind)&&items.some(a=>(a.bonuses||[]).includes(s.id))).map(s=>({id:s.id,name:s.name,kind:s.kind,parts:items.filter(a=>(a.bonuses||[]).includes(s.id)).map(a=>a.part||'weapon'),ranks:s.ranks.map(r=>({level:r.level,pieces:r.pieces,name:r.name||''}))})),charmRarities:result.charmRarities||[],charmOwned:result.charmOwned===true};
 return {detail,resistances:result.resistances||null,minResistances:result.minResistances||{},weaponBonuses:result.weapon.selectedBonuses||[],equipment:[result.weapon,...result.armor].map(a=>({id:a.id,name:a.name,part:a.part||'weapon',slots:a.slots})),charm:result.charm?{skills:result.charm.skills,weaponSlots:result.charm.weaponSlots,armorSlots:result.charm.armorSlots}:null,decorations:result.decorations.map(p=>({id:p.decoration.id,name:p.decoration.name,required:p.decoration.slot,kind:p.kind,owner:p.owner,index:p.index,size:p.size})),skills:data.skills.filter(s=>totals[s.id]).map(s=>({name:s.name,level:Math.min(s.maxLevel,totals[s.id])})),goals:result.achieved.map(g=>({name:g.name,required:g.required,level:g.level})),bonuses:result.activeBonuses.map(b=>({name:b.name,effect:b.effect,pieces:b.pieces})),defense:result.defense,source:data.apiImportVersion,mode};}
 function validateFolders(folders){const clean=list(folders,100).map(f=>({id:str(f.id,80),name:str(f.name,60).trim()}));if(clean.some(f=>!f.id||!f.name)||new Set(clean.map(f=>f.id)).size!==clean.length||new Set(clean.map(f=>f.name)).size!==clean.length)fail();return clean;}
 function validateCollection(entries,folders=[]){const clean=validateList(entries),groups=validateFolders(folders);if(clean.some(e=>e.folderId&&!groups.some(f=>f.id===e.folderId)))fail();return {entries:clean,folders:groups};}
 return {validateList,validateFolders,validateCollection,snapshot};
})();
if(typeof module!=='undefined')module.exports=SavedBuilds;
