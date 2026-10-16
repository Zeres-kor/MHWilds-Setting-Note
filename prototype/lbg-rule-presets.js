'use strict';
const LbgDefaultRules=(()=>{
 const VERSION='f4862bd188273b0f';
 const VERSION_KEY='mhwilds-lbg-default-rules-version';
 function merge(current,preset){return [...current.filter(r=>!r.id.startsWith('LBG-META-')),...preset];}
 async function initialize(){
  const status=document.getElementById('lbgPresetStatus');
  try{
   if(localStorage.getItem(VERSION_KEY)===VERSION){status.textContent='라보 기본 기준이 적용되어 있습니다.';return;}
   status.textContent='라보 기본 기준을 불러오는 중…';
   const response=await fetch('assets/rule-presets/lbg-all.json?v='+VERSION,{cache:'no-cache'});
   if(!response.ok)throw Error('라보 기본 기준을 불러오지 못했습니다. 새로고침해 주세요.');
   const preset=TagRules.validateRules(await response.json(),SKILL_NAMES);
   const current=RuleStore.get(),expected=JSON.stringify(current);
   const next=TagRules.validateRules(merge(current,preset),SKILL_NAMES);
   if(!RuleStore.set(next,expected))throw Error('라보 기본 기준을 저장하지 못했습니다. 저장 상태를 확인하세요.');
   localStorage.setItem(VERSION_KEY,VERSION);
   status.textContent='라보 기본 기준을 자동으로 적용했습니다.';
  }catch(error){status.textContent=error.message;}
 }
 return {merge,initialize,VERSION};
})();
if(typeof module!=='undefined')module.exports=LbgDefaultRules;
else LbgDefaultRules.initialize();
