'use strict';
(()=>{
 const $=id=>document.getElementById(id);let pending=null,sequence=0;
 function clear(){sequence++;pending=null;$('lbgPresetApply').hidden=true;$('lbgPresetImpact').hidden=true;}
 $('lbgPresetProfile').addEventListener('change',()=>{clear();$('lbgPresetStatus').textContent='선택한 운용의 미리보기를 확인하세요.';});
 $('rulesDialog').addEventListener('page-leave',()=>{clear();$('lbgPresetStatus').textContent='';});
 $('lbgPresetPreview').addEventListener('click',async()=>{
  clear();const request=sequence,expected=JSON.stringify(RuleStore.get()),file=$('lbgPresetProfile').value;
  $('lbgPresetStatus').textContent='기준을 불러오는 중…';
  try{
   const response=await fetch('assets/rule-presets/'+file);if(!response.ok)throw Error('라보 기준을 불러오지 못했습니다. 다시 시도하세요.');
   const preset=TagRules.validateRules(await response.json(),SKILL_NAMES);
   if(request!==sequence)return;
   if(JSON.stringify(RuleStore.get())!==expected)throw Error('기준이 변경됐습니다. 미리보기를 다시 확인하세요.');
   const keep=RuleStore.get().filter(r=>!r.id.startsWith('LBG-META-'));
   const next=TagRules.validateRules([...keep,...preset],SKILL_NAMES);
   pending={next,expected};
   $('lbgPresetImpact').textContent=`기존 라보 제공 기준 ${RuleStore.get().length-keep.length}개 → ${preset.length}개 · 유지할 개인/다른 기준 ${keep.length}개 · 자동 평가가 바뀌는 보유 호석 ${RuleStore.impact(next)}개`;
   $('lbgPresetImpact').hidden=false;$('lbgPresetApply').hidden=false;$('lbgPresetStatus').textContent='미리보기를 확인한 뒤 적용하세요.';
  }catch(error){if(request!==sequence)return;clear();$('lbgPresetStatus').textContent=error.message;}
 });
 $('lbgPresetApply').addEventListener('click',()=>{
  if(!pending)return;
  try{if(!RuleStore.set(pending.next,pending.expected))throw Error('저장하지 못했습니다. 저장 상태를 확인하세요.');clear();RuleEditor.renderList();$('lbgPresetStatus').textContent='라보 기준을 적용하고 자동 평가를 갱신했습니다.';}
  catch(error){clear();$('lbgPresetStatus').textContent=error.message;}
 });
})();
