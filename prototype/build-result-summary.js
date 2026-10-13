'use strict';
const BuildResultSummary=(()=>{
 const snapshots=typeof module!=='undefined'?require('./saved-builds.js'):SavedBuilds;
 const parts=['head','chest','arms','waist','legs'];
 const preferred={푸른:'푸른',퀸:'퀸',이그:'이',오메:'오',레다:'레',다하:'다',고그:'그',스컬:'스컬',기운:'모리바',미러:'미러',애널:'애널라이즈',오리:'오리온',푸푸:'푸푸로'};
 const familyKey=name=>{const compact=name.replace(/\s/g,'');return compact.startsWith('퀸')?'퀸':compact.startsWith('본')?'본':letters(name).slice(0,2).join('');};
 const letters=name=>Array.from(name.replace(/\s/g,'').replace(/[αβγ]$/u,''));
 function abbreviationMap(armor){
  const families=[...new Set(armor.map(a=>familyKey(a.name)))];
  const labels=new Map(families.map(f=>{const chars=Array.from(f),overlap=families.some(other=>other!==f&&Array.from(other)[0]===chars[0]);return [f,preferred[f]||(overlap?(chars[1]||chars[0]):chars[0])];}));
  // If second letters also collide, keep two letters to preserve the distinction.
  const counts=new Map();for(const label of labels.values())counts.set(label,(counts.get(label)||0)+1);
  for(const [family,label]of labels)if(counts.get(label)>1&&!preferred[family])labels.set(family,family);
  return labels;
 }
 function abbreviation(name,labels=new Map()){const chars=letters(name),family=familyKey(name);return (preferred[family]||labels.get(family)||chars[0]||'')+(name.replace(/\s/g,'').match(/[αβγ]$/u)?.[0]||'');}

 function emptySlots(result){
  const slots=[...result.weapon.slots.map((size,index)=>({owner:'weapon',kind:'weapon',size,index})),
   ...result.armor.flatMap(a=>a.slots.map((size,index)=>({owner:a.part,kind:'armor',size,index}))),
   ...['weapon','armor'].flatMap(kind=>(result.charm?.[kind+'Slots']||[]).map((size,index)=>({owner:'talisman',kind,size,index})))];
  const used=new Set(result.decorations.map(d=>`${d.owner}:${d.kind}:${d.index}`));
  return slots.filter(s=>!used.has(`${s.owner}:${s.kind}:${s.index}`));
 }
 function slotText(slots){return ['weapon','armor'].flatMap(kind=>{const counts=[3,2,1].map(size=>({size,count:slots.filter(s=>s.kind===kind&&s.size===size).length})).filter(s=>s.count);return counts.length?[`${kind==='weapon'?'무기':'방어구'} ${counts.map(s=>`[${s.size}]×${s.count}`).join(' · ')}`]:[];}).join(' / ')||'없음';}
 function describe(result,data){
  const snapshot=snapshots.snapshot(result,data,'none'),goals=new Map(result.achieved.map(g=>[g.name,g.required]));
  const additional=snapshot.skills.flatMap(s=>{const required=goals.get(s.name)||0,amount=s.level-required;if(amount<=0)return [];return [{key:'skill:'+s.name,name:s.name,level:s.level,amount,label:required?`${s.name} +${amount} (총 Lv.${s.level})`:`${s.name} Lv.${s.level}`}];});
  for(const bonus of result.activeBonuses){const required=goals.get(bonus.name)||0,amount=bonus.level-required;if(amount>0)additional.push({key:'bonus:'+bonus.name,name:bonus.name,level:bonus.level,amount,label:`${bonus.name} · ${bonus.effect}${required?` (목표보다 +${amount}단계)`:''}`});}
  const armor=parts.map(part=>result.armor.find(a=>a.part===part)),labels=abbreviationMap(data.armor||armor),abbreviations=armor.map(a=>abbreviation(a.name,labels)),title=abbreviations.join('·');
  const charm=result.charm,charmType=!charm?'호석 사용 안 함':charm.category==='crafted'?'제작 호석':result.charmOwned?'보유 호석':'규칙 호석';
  const charmSkills=charm?.skills.map(s=>`${s.name} Lv.${s.level}`).join(' / ')||'';
  const empty=emptySlots(result);
  return {title,armor,abbreviations,additional,charmLabel:charm?`${charmType}${charm.name?' · '+charm.name:''} · ${charmSkills}`:charmType,emptySlots:slotText(empty),charmEmptySlots:slotText(empty.filter(s=>s.owner==='talisman'))};
 }
 function compare(results,data){const source=data.armor?data:{...data,armor:results.flatMap(r=>r.armor)};const summaries=results.map(r=>describe(r,source));return summaries.map(s=>({...s,additional:s.additional.map(a=>({...a,different:summaries.length>1&&summaries.some(other=>(other.additional.find(x=>x.key===a.key)?.amount||0)!==a.amount)})).sort((a,b)=>Number(b.different)-Number(a.different)||b.amount-a.amount||a.name.localeCompare(b.name,'ko'))}));}
 return {familyKey,abbreviationMap,abbreviation,emptySlots,slotText,describe,compare};
})();
if(typeof module!=='undefined')module.exports=BuildResultSummary;
