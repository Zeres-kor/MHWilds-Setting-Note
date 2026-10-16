'use strict';
const RuleStorage=(()=>{
 const fields=['id','active','scope','grade','priority','skillMode','skills','slotMode','weaponSlots','armorSlots','description'];
 function pack(rules){return {format:'rule-rows-v1',rows:rules.map(r=>fields.map(k=>r[k]))};}
 function unpack(value){
  if(Array.isArray(value))return value;
  if(value?.format!=='rule-rows-v1'||!Array.isArray(value.rows))throw Error('저장 기준 형식이 잘못됐습니다.');
  return value.rows.map(row=>{if(!Array.isArray(row)||row.length!==fields.length)throw Error('저장 기준 행이 잘못됐습니다.');return Object.fromEntries(fields.map((k,i)=>[k,row[i]]));});
 }
 return {pack,unpack};
})();
if(typeof module!=='undefined')module.exports=RuleStorage;
