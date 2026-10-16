const{test}=require('node:test'),assert=require('node:assert/strict'),T=require('../prototype/tag-rules.js');
test('색인 평가는 전체 규칙 대조와 동일한 후보·정렬·등급을 반환한다',()=>{
 const rules=require('../prototype/assets/rule-presets/lbg-all.json');for(const r of [rules[0],rules[100],rules[2000],rules[8000],rules.at(-1)]){const record={skills:r.skills,weaponSlots:r.weaponSlots,armorSlots:r.armorSlots};const expected=rules.filter(x=>x.active&&x.scope==='라이트보우건'&&T.matchRule(record,x)).sort((a,b)=>a.priority-b.priority||T.GRADES.indexOf(a.grade)-T.GRADES.indexOf(b.grade)||a.id.localeCompare(b.id));const actual=T.evaluate(record,'라이트보우건',rules);assert.deepEqual(actual.weapon.matches,expected);assert.equal(actual.weapon.grade,expected[0]?.grade||'미분류');assert.equal(actual.common.grade,'미분류');}
});
