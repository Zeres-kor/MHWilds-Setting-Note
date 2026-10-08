'use strict';
// Original SVG silhouettes inspired by the user's in-game screenshots.
// These are interface illustrations, not extracted game textures.
const BuildDetail = (() => {
  const snapshots = typeof module !== 'undefined' ? require('./saved-builds.js') : SavedBuilds;
  const parts = {weapon:'메인 무기',head:'머리 방어구',chest:'몸통 방어구',arms:'팔 방어구',waist:'허리 방어구',legs:'다리 방어구'};
  const elements = [['fire','불'],['water','물'],['thunder','번개'],['ice','얼음'],['dragon','용']];
  function model(result, data) {
    const snapshot = snapshots.snapshot(result, data, 'none');
    const slots = (owner,kind,sizes) => sizes.map((size,index) => {
      const decoration=result.decorations.find(p=>p.owner===owner&&p.kind===kind&&p.index===index)?.decoration||null;
      const name=decoration?.name||'';
      const tint=/공격|도전|역습/.test(name)?'#d99591':/초심|간파|회심|혼신/.test(name)?'#b59bdc':/명검|장인|달인|칼날/.test(name)?'#98bba4':/납도|집중|강화/.test(name)?'#dbc987':/내성|방어|회피/.test(name)?'#98bdcf':kind==='weapon'?'#b59bdc':'#cdbb94';
      return {owner,kind,size,index,decoration,tint};
    });
    const equipment = [result.weapon,...result.armor].map(item => ({...item,part:item.part||'weapon',label:parts[item.part||'weapon'],slots:slots(item.part||'weapon',item.part?'armor':'weapon',item.slots)}));
    const charm = result.charm ? {...result.charm,owned:result.charmOwned,weaponSlots:slots('talisman','weapon',result.charm.weaponSlots),armorSlots:slots('talisman','armor',result.charm.armorSlots)} : null;
    const skills = snapshot.skills.map(s => {const info=data.skills.find(x=>x.name===s.name);return {...s,id:info.id,maxLevel:info.maxLevel,kind:info.kind,target:result.achieved.some(g=>g.id===info.id)};}).sort((a,b)=>Number(b.target)-Number(a.target)||b.level-a.level||a.id-b.id);
    const bonuses = data.skills.filter(s=>s.kind==='set'||s.kind==='group').flatMap(s => {
      const contributors=equipment.filter(item=>(item.bonuses||[]).includes(s.id));
      if(!contributors.length)return [];
      const ranks=s.ranks.map(r=>({...r,active:contributors.length>=r.pieces}));
      return [{...s,contributors,pieces:contributors.length,ranks}];
    });
    return {equipment,charm,skills,bonuses,defense:result.defense,resistances:result.resistances};
  }
  const paths = {
    head:'M7 23V13L11 6H21L25 13V23H20V16H12V23ZM9 12H23M16 6V12M12 23H20',
    chest:'M10 5L6 9L2 15L8 18L10 14V27H22V14L24 18L30 15L26 9L22 5L19 9H13ZM12 16H20M12 21H20',
    arms:'M5 5H13L14 14L11 21L13 25L8 28L3 22L6 14ZM19 5H27L26 14L29 22L24 28L19 25L21 21L18 14ZM5 10H13M19 10H27',
    waist:'M8 5H24L25 11L29 25L21 27L16 19L11 27L3 25L7 11ZM8 10H24M12 11L10 22M20 11L22 22',
    legs:'M6 4H14L13 18L14 26L3 28V23L7 20ZM18 4H26L25 20L29 23V28L18 26L19 18ZM7 10H13M19 10H25',
    talisman:'M10 4H22V9L26 14V27H6V14L10 9ZM10 4Q16 0 22 4M12 13L20 21M20 13L12 21M13 25H19',
    'great-sword':'M24 3L29 8L14 24L9 19ZM6 17L17 28M4 27L9 22',
    'long-sword':'M27 3Q29 13 12 24L9 21Q24 9 27 3ZM6 19L15 28M3 29L9 23',
    'sword-shield':'M7 3L11 8V21H7ZM4 20H14M9 21V29M19 9L28 12V21L23 28L18 21V12ZM23 12V24',
    'dual-blades':'M5 3L12 11L10 20L6 18ZM20 4L28 10L23 21L19 18ZM3 19L12 23M16 19L25 24M5 23L3 28M19 23L17 28',
    hammer:'M5 4L20 2L25 9L22 16L8 18L3 12ZM14 17L18 29L22 28L18 16',
    'hunting-horn':'M8 4L16 2L24 6L25 13L18 18L11 15L5 8ZM12 9L17 6L20 10L16 13ZM12 17L5 28L10 30L17 20',
    lance:'M24 2L28 9L10 25L7 22ZM5 20L13 28M3 29L8 24M5 5L12 7V14L8 18L3 13Z',
    gunlance:'M22 3L28 8L23 14L20 12L10 24L6 20L16 9L14 7ZM4 20L13 28M2 28L7 23M4 4L10 6V13L5 16Z',
    'switch-axe':'M16 2L20 6L18 14L29 12L27 22L17 20L11 30L7 27L12 18L3 15L6 6L13 10Z',
    'charge-blade':'M24 2L29 8L15 22L11 18ZM8 17L18 27M5 29L11 23M5 3L14 6L11 14L5 17L2 10Z',
    'insect-glaive':'M25 2L30 7L21 14L17 12L5 30L2 28L15 9L15 5ZM7 4L12 8L9 15L3 13L2 8ZM5 8L8 11',
    'light-bowgun':'M3 11H20V8H29V14H19L16 20H10L7 27H3L6 18H2ZM12 9V6H20V9M20 14V17H25',
    'heavy-bowgun':'M3 9H22V5H28V18H20L17 23H11L8 28H3L6 20L2 18ZM8 9V6H18V9M12 13H25M20 19L24 28',
    bow:'M9 2Q30 16 9 30L16 16ZM9 2V30M3 16H29M25 12L29 16L25 20',
    shield:'M16 3L27 7V18Q25 25 16 29Q7 25 5 18V7ZM16 7V24M10 12H22',
    affinity:'M16 3L20 12L29 16L20 20L16 29L12 20L3 16L12 12ZM16 9V23M9 16H23',
    set:'M9 3H23L29 10V23L23 29H9L3 23V10ZM9 10H23V22H9ZM12 7V25M20 7V25M7 15H25',
    group:'M16 2L28 9V23L16 30L4 23V9ZM10 10H22V22H10ZM16 6V26M6 16H26',
    fire:'M17 2Q22 11 21 13L25 9Q31 23 20 29H11Q2 25 7 16L13 7L12 16Q19 12 17 2Z',
    water:'M16 2Q7 13 5 20Q5 29 16 30Q27 29 27 20Q25 13 16 2ZM10 20Q9 25 15 26',
    thunder:'M16 2H25L19 13H27L9 31L13 19H5Z',
    ice:'M16 2V30M4 9L28 23M4 23L28 9M11 5L16 9L21 5M11 27L16 23L21 27M5 15L10 13L8 7M24 25L22 19L28 17',
    dragon:'M6 4L16 8L26 3L24 13L28 20L20 28H11L5 21L9 14ZM11 14L15 16M21 14L17 16M12 22H20',
  };
  function el(tag,cls,value){const node=document.createElement(tag);if(cls)node.className=cls;if(value!==undefined)node.textContent=value;return node;}
  function icon(name,tone='gold'){
    const wrap=el('span',`game-icon game-tone-${tone}`);wrap.setAttribute('aria-hidden','true');
    const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 32 32');svg.setAttribute('focusable','false');
    const path=document.createElementNS(svg.namespaceURI,'path');path.setAttribute('d',paths[name]||paths.shield);svg.append(path);wrap.append(svg);return wrap;
  }
  function gem(slot){
    const wrap=el('span',`game-gem ${slot.decoration?'is-filled':'is-empty'} is-${slot.kind}`);wrap.setAttribute('aria-hidden','true');if(slot.tint)wrap.style.setProperty('--gem-color',slot.tint);
    const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 32 32');svg.setAttribute('focusable','false');
    const shapes={1:'M10 7H22L26 16L22 24H10L6 16Z',2:'M9 4H23L27 14L23 27H9L5 14Z',3:'M8 3H24L28 12L25 27H7L4 12Z'};
    const outer=document.createElementNS(svg.namespaceURI,'path');outer.setAttribute('d',shapes[slot.size]);svg.append(outer);
    const cut=document.createElementNS(svg.namespaceURI,'path');cut.setAttribute('d','M9 12L16 18L23 12M16 18V25');cut.setAttribute('class','game-gem-cut');svg.append(cut);
    wrap.append(svg);wrap.append(el('span','game-gem-size',String(slot.size)));return wrap;
  }
  function title(name,extra){const heading=el('h4','game-panel-title',name);if(extra)heading.append(el('span','game-heading-note',extra));return heading;}
  function slotList(slots,emptyText='슬롯 없음'){
    const list=el('ul','game-slot-list');if(!slots.length){list.append(el('li','game-no-slots',emptyText));return list;}
    for(const slot of slots){const row=el('li',`game-slot-row ${slot.decoration?'is-filled':'is-empty'}`);row.append(gem(slot));row.append(el('span','game-slot-name',slot.decoration?.name||'빈 슬롯'));const size=el('span','game-slot-number',`[${slot.size}]`);row.append(size);row.setAttribute('aria-label',`${slot.kind==='weapon'?'무기':'방어구'} ${slot.index+1}번 슬롯 레벨 ${slot.size}: ${slot.decoration?.name||'비어 있음'}`);list.append(row);}return list;
  }
  function gearTone(rarity){return rarity>=8?'amber':rarity===7?'violet':rarity===6?'blue':'teal';}
  function skillIcon(skill){if(skill.kind==='weapon')return ['affinity','gold'];if(/내성|방어|가호|회피|납도/.test(skill.name))return ['shield','blue'];return ['chest','red'];}
  function bonusPanel(info,kind){
    const section=el('section',`game-panel game-bonus-section is-${kind}`);section.append(title(kind==='set'?'시리즈 스킬':'그룹 스킬'));
    const bonuses=info.bonuses.filter(s=>s.kind===kind);if(!bonuses.length)section.append(el('p','game-muted','해당 스킬 없음'));
    for(const bonus of bonuses){const row=el('div','game-bonus');const heading=el('div','game-bonus-name');heading.append(icon(kind,kind==='set'?'red':'teal'),el('strong','',bonus.name),el('span','game-piece-count',`${bonus.pieces}부위`));row.append(heading);
      const pieces=el('div','game-contributors');pieces.setAttribute('aria-label','기여 장비: '+bonus.contributors.map(c=>c.label).join(', '));
      for(const item of info.equipment){const active=bonus.contributors.some(c=>c.part===item.part);const mark=icon(item.part==='weapon'?item.kind:item.part,active?gearTone(item.rarity):'muted');mark.classList.toggle('is-inactive',!active);mark.title=`${item.label}${active?' · 포함':''}`;pieces.append(mark);}row.append(pieces);
      const ranks=el('ul','game-bonus-ranks');for(const rank of bonus.ranks){const li=el('li',rank.active?'is-active':'is-inactive');li.append(el('span','game-rank-pieces',String(rank.pieces)),el('span','',rank.name),el('span','game-rank-state',rank.active?'발동':'미발동'));ranks.append(li);}row.append(ranks);section.append(row);
    }return section;
  }
  function render(result,data,index){
    const info=model(result,data),card=el('article','build-card game-build-card');
    const heading=el('div','game-build-heading');heading.append(el('h3','',`세팅 ${index+1} · 장비 상세`),el('span','game-heading-note','상위 · 최대 강화 기준'));card.append(heading);
    const layout=el('div','game-loadout-layout'),left=el('div','game-loadout-left');
    const equipment=el('section','game-panel game-equipment-panel');equipment.setAttribute('aria-label','무기·방어구와 장식주');const headers=el('div','game-pair-head');headers.append(title('무기·방어구'),title('장식주'));equipment.append(headers);
    for(const item of info.equipment){const row=el('div','game-equipment-row');row.dataset.part=item.part;const gear=el('div','game-gear');gear.append(icon(item.part==='weapon'?item.kind:item.part,gearTone(item.rarity)));const names=el('div','game-gear-names');names.append(el('span','game-gear-part',item.label),el('strong','game-gear-name',item.name));const miniature=el('div','game-gear-slots');for(const slot of item.slots)miniature.append(gem(slot));names.append(miniature);gear.append(names);row.append(gear,slotList(item.slots));equipment.append(row);}
    left.append(equipment);
    const charm=el('section','game-panel game-charm-panel');charm.append(title('호석',info.charm?(info.charm.owned?'보유 호석':'규칙 후보'):'사용 안 함'));
    if(info.charm){const body=el('div','game-charm-body'),gear=el('div','game-charm-skills');const name=el('div','game-charm-name');name.append(icon('talisman','amber'),el('strong','',info.charm.owned?'보유 호석':'후보 호석'));gear.append(name);for(const skill of info.charm.skills){const line=el('div','game-charm-skill');line.append(el('span','',skill.name),el('strong','',`Lv.${skill.level}`));gear.append(line);}body.append(gear);const jewels=el('div','game-charm-jewels');for(const [kind,label]of [['weapon','무기 장식주'],['armor','방어구 장식주']]){jewels.append(el('h5','game-subtitle',label),slotList(info.charm[kind+'Slots']));}body.append(jewels);charm.append(body);}else charm.append(el('p','game-muted','이 세팅은 호석을 사용하지 않습니다.'));left.append(charm);layout.append(left);
    const skillPanel=el('div','game-skills-panel');const equipmentSkills=el('section','game-panel game-equipment-skills');equipmentSkills.setAttribute('aria-label','장비 스킬');equipmentSkills.append(title('장비 스킬'));const skills=el('ul','game-skill-list');
    for(const skill of info.skills){const row=el('li','game-skill-row');row.dataset.skillId=skill.id;const [shape,tone]=skillIcon(skill);row.append(icon(shape,tone));const content=el('div','game-skill-content'),name=el('div','game-skill-name');name.append(el('span','',skill.name));if(skill.target)name.append(el('span','game-target-tag','목표'));content.append(name);const bars=el('span','game-level-bars');bars.setAttribute('aria-hidden','true');for(let n=1;n<=skill.maxLevel;n++)bars.append(el('i',n<=skill.level?'is-filled':''));content.append(bars);row.append(content,el('span','game-skill-level',`Lv.${skill.level}`));skills.append(row);}equipmentSkills.append(skills);skillPanel.append(equipmentSkills,bonusPanel(info,'set'),bonusPanel(info,'group'));layout.append(skillPanel);
    const stats=el('section','game-panel game-defense-panel');stats.append(title('방어 스테이터스'));const values=el('dl','game-defense-values');const defense=el('div','game-stat-row is-defense');const dt=el('dt');dt.append(icon('shield','gold'),el('span','','방어력'));defense.append(dt,el('dd','',String(info.defense)));values.append(defense);for(const[key,label]of elements){const row=el('div','game-stat-row');const dt=el('dt');dt.append(icon(key,key),el('span','',`${label} 내성`));const n=info.resistances?.[key];row.append(dt,el('dd',n<0?'is-negative':'',n===undefined?'미기록':`${n>0?'+':''}${n}`));values.append(row);}stats.append(values,el('p','game-stats-note','최대 강화 방어력 · 기본 방어구 내성\n내성의 스킬·식사 효과 제외'));
    if(result.weapon.selectedBonuses?.length){const bonuses=el('div','game-weapon-bonuses');bonuses.append(el('h5','game-subtitle','무기 부여 스킬'));for(const b of result.weapon.selectedBonuses)bonuses.append(el('p','',`${b.name} · 1부위`));stats.append(bonuses);}layout.append(stats);card.append(layout);
    const footer=el('div','game-build-footer');footer.append(el('span','game-muted','장식주 아이콘 숫자 = 슬롯 레벨 · 빈 슬롯은 테두리로 표시'));card.append(footer);return card;
  }
  return {model,render};
})();
if(typeof module!=='undefined')module.exports=BuildDetail;
