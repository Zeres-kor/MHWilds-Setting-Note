'use strict';
const ManualBuild = (() => {
  const limitBreakApi=typeof module!=='undefined'?require('./armor-limit-break.js'):ArmorLimitBreak;
  const bonusesApi=typeof module!=='undefined'?require('./weapon-bonuses.js'):WeaponBonuses;
  const parts=['head','chest','arms','waist','legs'], elements=['fire','water','thunder','ice','dragon'];
  function compose(data, request) {
    const on=limitBreakApi.enabled(request);
    const base=data.weapons.find(w=>w.id===request.weaponId);
    if(!base)throw Error('무기를 선택하세요.');
    const weapon=bonusesApi.apply(data,base,request);
    const armor=parts.map(part=>{
      const item=data.armor.find(a=>a.id===request.armorIds?.[part]&&a.part===part&&a.rank==='high');
      if(!item)throw Error('방어구 다섯 부위를 모두 선택하세요.');
      return limitBreakApi.apply(item,on);
    });
    const charm=request.charm||null;
    if(charm){
      if(!Array.isArray(charm.skills)||charm.skills.length>3||new Set(charm.skills.map(s=>s.name)).size!==charm.skills.length)throw Error('호석 스킬을 확인하세요.');
      for(const s of charm.skills){const skill=data.skills.find(x=>x.name===s.name&&!['set','group'].includes(x.kind));if(!skill||!Number.isInteger(s.level)||s.level<1||s.level>skill.maxLevel)throw Error('장비 데이터에서 지원하지 않는 호석 스킬입니다.');}
      for(const kind of ['weapon','armor'])if(!Array.isArray(charm[kind+'Slots'])||charm[kind+'Slots'].length>3||charm[kind+'Slots'].some(n=>!Number.isInteger(n)||n<1||n>3))throw Error('호석 슬롯을 확인하세요.');
    }
    const used=new Set();
    const decorations=(request.decorations||[]).map(p=>{
      const d=data.decorations.find(d=>d.id===p.decorationId),kind=p.kind;
      const sizes=p.owner==='talisman'?charm?.[kind+'Slots']:[weapon,...armor].find(a=>(a.part||'weapon')===p.owner)?.slots;
      const key=`${p.owner}:${kind}:${p.index}`;
      if(!d||d.kind!==kind||!Number.isInteger(p.index)||p.index<0||!sizes||sizes[p.index]<d.slot||sizes[p.index]===undefined||used.has(key)||(p.owner!=='talisman'&&kind!==(p.owner==='weapon'?'weapon':'armor')))throw Error('장식주의 종류·슬롯 크기·중복 배치를 확인하세요.');
      used.add(key);return {decoration:d,owner:p.owner,kind,index:p.index,size:sizes[p.index]};
    });
    const counts={};
    for(const item of [weapon,...armor])for(const id of item.bonuses||[])counts[id]=(counts[id]||0)+1;
    const activeBonuses=data.skills.filter(s=>['set','group'].includes(s.kind)).flatMap(s=>{
      const rank=s.ranks.filter(r=>r.pieces<= (counts[s.id]||0)).sort((a,b)=>b.level-a.level)[0];
      return rank?[{name:s.name,effect:rank.name,level:rank.level,pieces:counts[s.id]}]:[];
    });
    return {armorLimitBreakDefense:on,armorLimitBreak:on,weapon,armor,charm,charmOwned:request.charmOwned===true,charmRarities:charm?.rarity?[charm.rarity]:[],recipeIds:[],decorations,achieved:[],activeBonuses,
      defense:(weapon.defenseBonus||0)+armor.reduce((n,a)=>n+a.defense,0),
      resistances:Object.fromEntries(elements.map(e=>[e,armor.reduce((n,a)=>n+(a.resistances?.[e]||0),0)])),minResistances:{}};
  }
  return {parts,compose};
})();
if(typeof module!=='undefined')module.exports=ManualBuild;
