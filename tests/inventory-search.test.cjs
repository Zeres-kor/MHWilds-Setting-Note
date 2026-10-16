const{test}=require('node:test'),assert=require('node:assert/strict'),D=require('../prototype/inventory-display.js');
const names=['공격','공격적인 방어','번개속성 공격 강화','간파','가드 성능 Up'];
const record=(skills,memo='')=>({skills:skills.map(name=>({name,level:1})),memo});
test('공격을 검색하면 정확한 공격 스킬만 일치하고 속성 공격·메모는 제외한다',()=>{const match=D.search('공격',names);assert.ok(match(record(['공격','간파'])));assert.ok(!match(record(['번개속성 공격 강화'])));assert.ok(!match(record(['공격적인 방어'])));assert.ok(!match(record(['간파'],'공격 세팅')));});
test('미완성 스킬명은 부분 검색하고 일반 메모 검색과 빈 검색을 유지한다',()=>{assert.ok(D.search('번개',names)(record(['번개속성 공격 강화'])));assert.ok(D.search('보관',names)(record(['간파'],'보관용')));assert.ok(D.search('',names)(record(['간파'])));assert.ok(D.search('가드   성능 up',names)(record(['가드 성능 Up'])));});
