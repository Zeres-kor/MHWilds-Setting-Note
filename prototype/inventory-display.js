'use strict';
const InventoryDisplay=(()=>{
 function search(query,knownNames){
  const normalize=value=>String(value||'').normalize('NFC').trim().replace(/\s+/g,' ').toLocaleLowerCase('ko');
  const term=normalize(query),exact=knownNames.some(name=>normalize(name)===term);
  return record=>!term||(exact?record.skills.some(s=>normalize(s.name)===term):[...record.skills.map(s=>s.name),record.memo].some(value=>normalize(value).includes(term)));
 }
 function slots(record){return [record.weaponSlots.length?'무기 '+record.weaponSlots.join('-'):'',record.armorSlots.length?'방어구 '+record.armorSlots.join('-'):''].filter(Boolean).join(' - ');}
 let rarityData,rarityCache=new WeakMap();
 function rarityValues(record,data){
  if(Number.isInteger(record.rarity)&&record.rarity>=1&&record.rarity<=8)return [record.rarity];
  if(!data)return [];
  if(rarityData!==data){rarityData=data;rarityCache=new WeakMap();}
  if(rarityCache.has(record))return rarityCache.get(record);
  const engine=typeof module!=='undefined'?require('./talisman-candidates.js'):TalismanCandidates;
  const values=[...new Set(engine.matchRecord(data,record).matches.map(m=>m.rarity))].sort((a,b)=>a-b);
  rarityCache.set(record,values);return values;
 }
 function rarity(record,data){
  const values=rarityValues(record,data);
  return values.length?(Number.isInteger(record.rarity)?'RARE ':'규칙 RARE ')+values.join('-'):'RARE 미확인';
 }
 function compareRarity(a,b,data,ascending=false){
  const av=rarityValues(a,data),bv=rarityValues(b,data);
  if(!av.length||!bv.length)return Number(!av.length)-Number(!bv.length);
  return ascending?Math.max(...av)-Math.max(...bv):Math.max(...bv)-Math.max(...av);
 }
 function compareEvaluation(a,b,scope,data){
  const aa=a.evaluation[scope],bb=b.evaluation[scope];
  return (aa.grade===bb.grade?0:aa.priority-bb.priority)||compareRarity(a.record,b.record,data)||aa.priority-bb.priority||b.record.created-a.record.created;
 }
 return {slots,rarity,search,rarityValues,compareRarity,compareEvaluation};
})();
if(typeof module!=='undefined')module.exports=InventoryDisplay;
