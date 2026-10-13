'use strict';
const ArmorLimitBreak=(()=>{
 function enabled(request){if(request.armorLimitBreak!==undefined&&typeof request.armorLimitBreak!=='boolean')throw Error('한계돌파 슬롯 적용 여부를 확인하세요.');return request.armorLimitBreak!==false;}
 function apply(item,on=true){const base=item.baseSlots||item.slots;return {...item,baseSlots:base.slice(),slots:(on&&item.rank==='high'&&item.limitBreakSlots?item.limitBreakSlots:base).slice()};}
 return {enabled,apply};
})();
if(typeof module!=='undefined')module.exports=ArmorLimitBreak;
