'use strict';
const InventoryDisplay=(()=>{
 function slots(record){return [record.weaponSlots.length?'무기 '+record.weaponSlots.join('-'):'',record.armorSlots.length?'방어구 '+record.armorSlots.join('-'):''].filter(Boolean).join(' - ');}
 function rarity(record,data){
  if(Number.isInteger(record.rarity)&&record.rarity>=1&&record.rarity<=8)return 'RARE '+record.rarity;
  if(!data)return 'RARE 미확인';
  const engine=typeof module!=='undefined'?require('./talisman-candidates.js'):TalismanCandidates;
  const values=[...new Set(engine.matchRecord(data,record).matches.map(m=>m.rarity))].sort((a,b)=>a-b);
  return values.length?'규칙 RARE '+values.join('-'):'RARE 미확인';
 }
 return {slots,rarity};
})();
if(typeof module!=='undefined')module.exports=InventoryDisplay;
