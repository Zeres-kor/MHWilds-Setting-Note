'use strict';
const RuleBulkDelete=(()=>{
 function plan(rules,uploadedIds,includeLegacy){const known=new Set(uploadedIds);return rules.filter(r=>r.id.startsWith('LBG-META-')||(!known.has(r.id)&&!includeLegacy));}
 function setup(){
  const $=id=>document.getElementById(id);let pending=null;
  function clear(){pending=null;$('bulkRuleDeleteApply').hidden=true;$('bulkRuleDeleteCancel').hidden=true;}
  $('bulkRuleDeletePreview').onclick=()=>{
   clear();const current=RuleStore.get(),next=plan(current,RuleImportSources.get(),$('bulkRuleDeleteLegacy').checked),count=current.length-next.length;
   if(!count){$('bulkRuleDeleteStatus').textContent='삭제할 업로드 기준이 없습니다. 이전 기준은 포함 옵션으로 선택할 수 있습니다.';return;}
   pending={next,expected:JSON.stringify(current)};
   $('bulkRuleDeleteStatus').textContent=`기준 ${count}개 삭제 예정 · 유지 ${next.length}개 · 자동 평가가 바뀌는 보유 호석 ${RuleStore.impact(next)}개. 보유 호석·수동 태그·메모는 유지됩니다.`;
   $('bulkRuleDeleteApply').hidden=false;$('bulkRuleDeleteCancel').hidden=false;
  };
  $('bulkRuleDeleteApply').onclick=()=>{if(!pending)return;try{if(!RuleStore.set(pending.next,pending.expected))throw Error('저장하지 못했습니다.');clear();RuleEditor.renderList();$('bulkRuleDeleteStatus').textContent='업로드 기준을 삭제하고 자동 평가를 갱신했습니다.';}catch(e){clear();$('bulkRuleDeleteStatus').textContent=e.message;}};
  $('bulkRuleDeleteCancel').onclick=()=>{clear();$('bulkRuleDeleteStatus').textContent='삭제를 취소했습니다.';};
  $('bulkRuleDeleteLegacy').onchange=()=>{clear();$('bulkRuleDeleteStatus').textContent='삭제 미리보기를 다시 확인하세요.';};
  $('rulesDialog').addEventListener('page-leave',()=>{clear();$('bulkRuleDeleteStatus').textContent='';});
 }
 return {plan,setup};
})();
if(typeof module!=='undefined')module.exports=RuleBulkDelete;else RuleBulkDelete.setup();
