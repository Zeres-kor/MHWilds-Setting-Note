const{test}=require('node:test'),assert=require('node:assert/strict'),S=require('../prototype/rule-storage.js');
test('기존 기준을 읽고 기본 기준 전체를 손실 없이 작은 형식으로 왕복한다',()=>{
 const rules=require('../prototype/assets/rule-presets/lbg-all.json');assert.deepEqual(S.unpack(JSON.parse(JSON.stringify(S.pack(rules)))),rules);assert.equal(S.unpack(rules),rules);assert.ok(JSON.stringify(S.pack(rules)).length*2<3*1024*1024);
});
test('손상된 기준 저장 형식은 거부한다',()=>{assert.throws(()=>S.unpack({format:'bad',rows:[]}));assert.throws(()=>S.unpack({format:'rule-rows-v1',rows:[[]]}));});
