const {test}=require('node:test'),assert=require('node:assert/strict'),D=require('../prototype/lbg-rule-presets.js');
test('기본 기준 갱신은 제공 라보 기준만 교체하고 개인 기준과 다른 무기 기준을 보존한다',()=>{
 const personal={id:'personal',scope:'라이트보우건'},other={id:'other',scope:'태도'},old={id:'LBG-META-old'},next={id:'LBG-META-new'};
 const current=[personal,old,other];assert.deepEqual(D.merge(current,[next]),[personal,other,next]);assert.deepEqual(current,[personal,old,other]);assert.deepEqual(D.merge(D.merge(current,[next]),[next]),[personal,other,next]);
});
test('신규 사용자 기본 기준은 확정한 극종결 1170개와 제외 스킬 정책을 보존한다',()=>{
 const rules=require('../prototype/assets/rule-presets/lbg-all.json'),top=D.merge([],rules).filter(r=>r.grade==='극종결');assert.equal(top.length,1170);
 assert.ok(!rules.some(r=>r.skills.some(s=>['납도술','정비','포술','특수 사격 강화'].includes(s.name))));
 assert.ok(!top.some(r=>r.skills.some(s=>['공세','힘의 해방','회피 성능','기절 내성','정령의 가호'].includes(s.name))));
});
