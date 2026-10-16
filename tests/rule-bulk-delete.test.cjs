const{test}=require('node:test'),assert=require('node:assert/strict'),B=require('../prototype/rule-bulk-delete.js');
test('업로드한 기준만 삭제하며 기본/직접 추가 기준을 유지한다',()=>{const rows=[{id:'LBG-META-1'},{id:'uploaded'},{id:'personal'}];assert.deepEqual(B.plan(rows,['uploaded','LBG-META-1'],false),[rows[0],rows[2]]);assert.equal(rows.length,3);});
test('이전 기준 포함은 명시 선택할 때만 적용하고 기본 기준을 보존한다',()=>{const rows=[{id:'LBG-META-1'},{id:'legacy'}];assert.deepEqual(B.plan(rows,[],false),rows);assert.deepEqual(B.plan(rows,[],true),[rows[0]]);});
