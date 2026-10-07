'use strict';
const SavedBuilds=(()=>{
 const parts=['head','chest','arms','waist','legs'];
 const fail=()=>{throw Error('저장 세팅 형식이 잘못됐습니다.');};
 const str=(s,max=160)=>{if(typeof s!=='string'||s.length>max)fail();return s;};
 const num=(n,max=100000)=>{if(!Number.isSafeInteger(n)||n<0||n>max)fail();return n;};
 const resistanceMap=(v,condition=false)=>{if(v===null||v===undefined)return null;if(typeof v!=='object'||Array.isArray(v))fail();const out={};for(const[k,n]of Object.entries(v)){if(!['fire','water','thunder','ice','dragon'].includes(k)||(n!==null&&(!Number.isInteger(n)||n < (condition?-25:-100)||n > (condition?25:100))))fail();if(!condition&&n===null)fail();out[k]=n;}if(!condition&&Object.keys(out).length!==5)fail();return out;};
 const list=(a,max)=>{if(!Array.isArray(a)||a.length>max)fail();return a;};
 const slots=a=>list(a,3).map(n=>{if(n<1||n>3)fail();return num(n,3);});
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
  return {id:str(e.id,80),name:str(e.name,80),memo:str(e.memo,1000),created:num(e.created,Number.MAX_SAFE_INTEGER),build:{equipment,charm,decorations,skills,goals,bonuses,weaponBonuses,resistances:resistanceMap(b.resistances),minResistances:resistanceMap(b.minResistances||{},true),defense:num(b.defense,2000),source:str(b.source),mode:str(b.mode,20)}};
 });if(clean.some(e=>!e.id||!e.name.trim())||new Set(clean.map(e=>e.id)).size!==clean.length)fail();return clean;}
 function snapshot(result,data,mode){const totals={};for(const item of [result.weapon,...result.armor,...result.decorations.map(p=>p.decoration)])for(const[id,n]of Object.entries(item.skills))totals[id]=(totals[id]||0)+n;for(const s of result.charm?.skills||[]){const skill=data.skills.find(x=>x.name===s.name);if(skill)totals[skill.id]=(totals[skill.id]||0)+s.level;}
 return {resistances:result.resistances||null,minResistances:result.minResistances||{},weaponBonuses:result.weapon.selectedBonuses||[],equipment:[result.weapon,...result.armor].map(a=>({id:a.id,name:a.name,part:a.part||'weapon',slots:a.slots})),charm:result.charm?{skills:result.charm.skills,weaponSlots:result.charm.weaponSlots,armorSlots:result.charm.armorSlots}:null,decorations:result.decorations.map(p=>({id:p.decoration.id,name:p.decoration.name,required:p.decoration.slot,kind:p.kind,owner:p.owner,index:p.index,size:p.size})),skills:data.skills.filter(s=>totals[s.id]).map(s=>({name:s.name,level:Math.min(s.maxLevel,totals[s.id])})),goals:result.achieved.map(g=>({name:g.name,required:g.required,level:g.level})),bonuses:result.activeBonuses.map(b=>({name:b.name,effect:b.effect,pieces:b.pieces})),defense:result.defense,source:data.apiImportVersion,mode};}
 return {validateList,snapshot};
})();
if(typeof module!=='undefined')module.exports=SavedBuilds;
