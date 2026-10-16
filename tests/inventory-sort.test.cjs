const{test}=require('node:test'),assert=require('node:assert/strict'),D=require('../prototype/inventory-display.js');
const row=(rarity,grade,priority,created=1)=>({record:{rarity,created,skills:[],weaponSlots:[],armorSlots:[]},evaluation:{weapon:{grade,priority}}});
test('평가가 같으면 레어도 높은순이고 평가가 다르면 평가 우선순위를 유지한다',()=>{
 const rows=[row(7,'극종결',1),row(8,'종결',2),row(8,'극종결',1),row(undefined,'극종결',1)];const sorted=rows.slice().sort((a,b)=>D.compareEvaluation(a,b,'weapon',null));assert.deepEqual(sorted,[rows[2],rows[0],rows[3],rows[1]]);
});
test('레어도 오름차순·내림차순 모두 미확인은 뒤로 배치한다',()=>{const rows=[row(undefined),row(8),row(6)];assert.deepEqual(rows.slice().sort((a,b)=>D.compareRarity(a.record,b.record,null)).map(r=>r.record.rarity),[8,6,undefined]);assert.deepEqual(rows.slice().sort((a,b)=>D.compareRarity(a.record,b.record,null,true)).map(r=>r.record.rarity),[6,8,undefined]);});
