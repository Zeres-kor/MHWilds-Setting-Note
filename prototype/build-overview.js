'use strict';
const BuildOverview=(()=>{
 const parts=[['head','머리'],['chest','몸통'],['arms','팔'],['waist','허리'],['legs','다리']];
 const elements=[['fire','불'],['water','물'],['thunder','번개'],['ice','얼음'],['dragon','용']];
 function model(snapshot){
  const used=new Set(snapshot.decorations.map(d=>`${d.owner}:${d.kind}:${d.index}`)),empty={weapon:[0,0,0],armor:[0,0,0]};
  const count=(owner,kind,sizes)=>sizes.forEach((size,index)=>{if(!used.has(`${owner}:${kind}:${index}`))empty[kind][size-1]++;});
  for(const a of snapshot.equipment)count(a.part,a.part==='weapon'?'weapon':'armor',a.slots);
  for(const kind of ['weapon','armor'])count('talisman',kind,snapshot.charm?.[kind+'Slots']||[]);
  const goals=new Map(snapshot.goals.map(g=>[g.name,g.required]));
  const additional=snapshot.skills.flatMap(s=>{const required=goals.get(s.name)||0,amount=s.level-required;return amount>0?[{name:s.name,label:required?`${s.name} +${amount} (총 Lv.${s.level})`:`${s.name} Lv.${s.level}`,different:false}]:[];});
  const bonuses=snapshot.bonuses.map(b=>({name:b.name,label:`${b.name} · ${b.effect}`,target:goals.has(b.name),different:false}));
  const ownership=snapshot.detail?.charmOwned??(snapshot.mode==='owned'?true:null);
  return {weapon:snapshot.equipment.find(a=>a.part==='weapon'),armor:parts.map(([part,label])=>({...snapshot.equipment.find(a=>a.part===part),label})),charm:snapshot.charm,ownership,empty,defense:snapshot.defense,resistances:snapshot.resistances,
   additional:[...additional,...bonuses.filter(b=>!goals.has(b.name))],allSkills:[...snapshot.skills.map(s=>({name:s.name,level:s.level,label:`${s.name} Lv.${s.level}`,target:goals.has(s.name)})).sort((a,b)=>Number(b.target)-Number(a.target)||b.level-a.level||a.name.localeCompare(b.name,'ko')),...bonuses],limitBreak:snapshot.armorLimitBreak,limitBreakDefense:snapshot.armorLimitBreakDefense};
 }
 function node(tag,cls,text){const el=document.createElement(tag);if(cls)el.className=cls;if(text!==undefined)el.textContent=text;return el;}
 function render(snapshot,options={}){
  const info=model(snapshot),root=node('div','build-overview');
  const weapon=node('span','overview-weapon');weapon.append(node('span','overview-label','무기'),node('span','',info.weapon.name),node('span','overview-status',info.limitBreak===undefined?'한계돌파 미기록':info.limitBreak?(info.limitBreakDefense===undefined?'한계돌파 슬롯 ON':'한계돌파 ON'):'한계돌파 OFF'));root.append(weapon);
  const gear=node('span','overview-equipment');gear.setAttribute('role','group');gear.setAttribute('aria-label','부위별 장비');
  for(const a of info.armor){const cell=node('span','overview-gear-cell');cell.append(node('span','overview-part',a.label),node('span','overview-gear-name',a.name));gear.append(cell);}
  const charm=node('div','overview-gear-cell overview-charm'),header=node('span','overview-charm-header');header.append(node('span','overview-part','호석'));charm.append(header);
  if(info.charm){
   if(options.ownership!==undefined||info.ownership!==null)header.append(node('span','overview-owned'+((options.ownership??info.ownership)?' is-owned':''),((options.ownership??info.ownership)?'보유':'미보유')));
   if(info.charm.name)charm.append(node('span','overview-gear-name',info.charm.name));
   const skills=node('span','overview-charm-skills',info.charm.skills.map(s=>`${s.name} Lv.${s.level}`).join(' / '));charm.append(skills);
   const charmSlots=node('span','overview-charm-slots');
   for(const kind of ['weapon','armor']){const sizes=info.charm[kind+'Slots'],group=node('span','overview-charm-slot-kind');group.setAttribute('aria-label',`${kind==='weapon'?'무기':'방어구'} 슬롯 ${sizes.map(n=>'레벨 '+n).join(', ')||'없음'}`);group.append(BuildDetail.icon(kind==='weapon'?(snapshot.detail?.equipment.find(a=>a.part==='weapon')?.kind||'great-sword'):'chest'),node('span','',sizes.map(n=>'Lv'+n).join('·')||'없음'));charmSlots.append(group);}header.append(charmSlots);
  }else charm.append(node('span','overview-gear-name','사용 안 함'));
  if(options.charmControls)charm.append(options.charmControls);gear.append(charm);root.append(gear);
  const numbers=node('span','overview-numbers'),stats=node('span','overview-stats');stats.setAttribute('role','group');stats.setAttribute('aria-label','방어력과 기본 내성');
  const values=[['shield','방어력',info.defense],...elements.map(([key,label])=>[key,label+' 내성',info.resistances?.[key]])];
  for(const [icon,label,value]of values){const cell=node('span','overview-stat');cell.append(BuildDetail.icon(icon,icon==='shield'?'gold':icon),node('span','overview-stat-label',label),node('strong',value<0?'is-negative':'',value===undefined?'미기록':icon==='shield'?String(value):`${value>0?'+':''}${value}`));stats.append(cell);}numbers.append(stats);
  const slots=node('span','overview-empty-slots');slots.setAttribute('role','group');slots.setAttribute('aria-label','빈 장식주 슬롯 · 호석 포함');
  slots.append(node('span','overview-label','빈 슬롯'));
  for(const kind of ['weapon','armor']){const group=node('span','overview-slot-kind');const slotLabel=node('span','overview-slot-label');slotLabel.append(BuildDetail.icon(kind==='weapon'?(snapshot.detail?.equipment.find(a=>a.part==='weapon')?.kind||'great-sword'):'chest'),node('span','',kind==='weapon'?'무기':'방어구'));group.append(slotLabel);for(const size of [3,2,1]){const count=info.empty[kind][size-1];if(!count)continue;const cell=node('span','overview-slot-count'+(!count?' is-zero':''));cell.setAttribute('aria-label',`${kind==='weapon'?'무기':'방어구'} 레벨 ${size} 빈 슬롯 ${count}개`);const gem=BuildDetail.gem({kind,size,decoration:null});gem.querySelector('.game-gem-size').textContent='Lv'+size;cell.append(gem,node('span','',`×${count}`));group.append(cell);}if(group.children.length>1)slots.append(group);}if(slots.children.length>1)numbers.append(slots);root.append(numbers);
  const skillRow=node('span','overview-skills'),items=options.additional|| (options.saved?info.allSkills:info.additional);skillRow.append(node('span','overview-label',options.saved?'장비 스킬':'추가 스킬'));
  if(!items.length)skillRow.append(node('span','overview-none','없음'));
  for(const skill of items){const chip=node('span','overview-skill'+(skill.different?' is-different':''));if(options.saved&&skill.target)chip.append(node('small','','목표'));chip.append(node('span','',skill.label));skillRow.append(chip);}root.append(skillRow);
  return root;
 }
 return {parts,elements,model,render};
})();
if(typeof module!=='undefined')module.exports=BuildOverview;
