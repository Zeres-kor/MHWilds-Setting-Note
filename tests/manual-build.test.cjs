const {test}=require('node:test'),assert=require('node:assert/strict');
const M=require('../prototype/manual-build.js'),S=require('../prototype/saved-builds.js');
function fixture(){return {apiImportVersion:'2026-04-15',skills:[{id:1,name:'공격',kind:'weapon',maxLevel:3,ranks:[{level:1},{level:2},{level:3}]},{id:2,name:'방어',kind:'armor',maxLevel:3,ranks:[{level:1},{level:2},{level:3}]},{id:3,name:'세트',kind:'set',maxLevel:1,ranks:[{level:1,pieces:2,name:'발동'}]}],weapons:[{id:1172,name:'거극 무기',kind:'long-sword',slots:[3],skills:{1:1},bonuses:[],defenseBonus:5}],armor:M.parts.map((part,i)=>({id:i+1,name:part,part,rank:'high',rarity:8,slots:[2],skills:{2:1},bonuses:i===0?[3]:[],defense:10,resistances:{fire:-1,water:2,thunder:0,ice:0,dragon:1}})),decorations:[{id:1,name:'복합주',kind:'weapon',slot:2,skills:{1:2,2:1},bonuses:[]},{id:2,name:'방어주',kind:'armor',slot:1,skills:{2:1},bonuses:[]} ]};}
const request=()=>({weaponId:1172,armorIds:Object.fromEntries(M.parts.map((p,i)=>[p,i+1])),weaponSeriesSkillId:3,decorations:[{owner:'weapon',kind:'weapon',index:0,decorationId:1}]});
test('직접 선택한 장비·복합 장식주·제작 호석을 합산하고 저장·복원한다',()=>{
 const d=fixture(),q=request();q.charm={name:'공격의 호석Ⅰ',category:'crafted',rarity:5,skills:[{name:'공격',level:1}],weaponSlots:[],armorSlots:[]};
 const r=M.compose(d,q),b=S.snapshot(r,d,'manual');assert.equal(r.defense,55);assert.equal(r.resistances.fire,-5);assert.equal(r.resistances.water,10);assert.equal(r.activeBonuses[0].pieces,2);assert.equal(b.skills.find(s=>s.name==='공격').level,3);assert.equal(b.skills.find(s=>s.name==='방어').level,3);assert.equal(b.charm.name,q.charm.name);assert.equal(b.goals.length,0);
 const entry={id:'manual',name:'직접 세팅',memo:'',created:1,build:b};assert.deepEqual(S.validateList(JSON.parse(JSON.stringify([entry])))[0].build,b);
});
test('장식주 종류·크기·중복 및 잘못된 방어구 부위를 거부한다',()=>{
 const d=fixture(),q=request();assert.throws(()=>M.compose(d,{...q,decorations:[...q.decorations,...q.decorations]}));assert.throws(()=>M.compose(d,{...q,decorations:[{owner:'head',kind:'armor',index:0,decorationId:1}]}));d.weapons[0].slots=[1];assert.throws(()=>M.compose(d,q));assert.throws(()=>M.compose(d,{...q,armorIds:{...q.armorIds,head:2},decorations:[]}));
});
test('호석의 같은 번호 슬롯도 종류별로 사용하고 알 수 없는 스킬을 거부한다',()=>{
 const d=fixture(),q=request();q.charm={skills:[{name:'공격',level:1}],weaponSlots:[2],armorSlots:[1]};q.charmOwned=true;q.decorations=[{owner:'talisman',kind:'weapon',index:0,decorationId:1},{owner:'talisman',kind:'armor',index:0,decorationId:2}];const r=M.compose(d,q);assert.equal(r.decorations.length,2);assert.equal(r.charmOwned,true);q.charm.skills=[{name:'알 수 없음',level:1}];assert.throws(()=>M.compose(d,q));
});
