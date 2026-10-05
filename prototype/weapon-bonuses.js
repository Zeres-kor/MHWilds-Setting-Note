'use strict';
const WeaponBonuses=(()=>{
 const gogIds=new Set([1139,1142,1145,1148,1151,1154,1157,1160,1163,1166,1169,1172,1175,1180]);
 function selected(data,weapon,request){const out=[];for(const [field,kind]of [['weaponSeriesSkillId','set'],['weaponGroupSkillId','group']]){const id=request[field];if(id===undefined||id===null||id===0)continue;const skill=data.skills.find(s=>s.id===id&&s.kind===kind);if(!gogIds.has(weapon.id)||!skill)throw Error('거극 아티어의 시리즈·그룹 스킬 입력을 확인하세요.');out.push({id:skill.id,name:skill.name,kind});}return out;}
 function apply(data,weapon,request){const selectedBonuses=selected(data,weapon,request);return {...weapon,bonuses:[...new Set([...(weapon.bonuses||[]),...selectedBonuses.map(s=>s.id)])],selectedBonuses};}
 return {gogIds,selected,apply};
})();
if(typeof module!=='undefined')module.exports=WeaponBonuses;
