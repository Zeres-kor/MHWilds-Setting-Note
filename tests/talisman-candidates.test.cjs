const test = require('node:test');
const assert = require('node:assert/strict');
const C = require('../prototype/talisman-candidates.js');
const T = require('../prototype/tag-rules.js');
const data = require('../prototype/data/talisman-recipes.json');
const skill = (name,level) => ({name,level});
const query = (skills, extras={}) => ({skills, rarity:0, weaponSlots:[], armorSlots:[], ...extras});
const candidates = (data,q) => [...C.enumerate(data,q)].filter(v=>v.kind==='candidate');
const tiny = {groups:{1:[skill('A',1),skill('B',2)],2:[skill('A',2),skill('C',1)]}, recipes:[
 {id:1,rarity:5,groups:[1,2],slots:[{weaponSlots:[],armorSlots:[2,1]}]},
 {id:2,rarity:8,groups:[2,1],slots:[{weaponSlots:[1],armorSlots:[1,1]}]},
]};
test('all skill conditions require individual minimum levels; repeated skills are excluded',()=>{
 const rows=candidates(tiny,query([skill('A',1)]));
 assert.equal(rows.length,4);
 assert(rows.every(r=>new Set(r.record.skills.map(s=>s.name)).size===2));
 assert.equal(candidates(tiny,query([skill('A',2),skill('B',2)])).length,2);
 assert.equal(candidates(tiny,query([skill('A',3)])).length,0);
 assert.equal(candidates(tiny,query([skill('C',1),skill('A',2)])).length,0);
});
test('weapon and armor slots stay independent and match by size/count, not total',()=>{
 assert.equal(candidates(tiny,query([skill('B',1)],{weaponSlots:[1]})).length,2);
 assert.equal(candidates(tiny,query([skill('B',1)],{armorSlots:[2]})).length,2);
 assert.equal(candidates(tiny,query([skill('B',1)],{armorSlots:[3]})).length,0);
 assert.equal(C.slotsMeet([3],[1,1]),false);
 assert.equal(C.slotsMeet([1,2],[1,2]),true);
 assert.equal(candidates(tiny,query([skill('B',1)],{rarity:8})).length,2);
});
test('canonical identity ignores assignment order; rarity provenance is separate',()=>{
 const a={skills:[skill('A',1),skill('B',2)],weaponSlots:[1],armorSlots:[1,2]};
 assert.equal(C.key(a),C.key({...a,skills:a.skills.slice().reverse(),armorSlots:[2,1]}));
 assert.notEqual(C.key(a),C.key({...a,weaponSlots:[]}));
});
test('export preserves source rules and explicitly records unresolved assumptions',()=>{
 assert.equal(data.recipes.length,29);
 assert.equal(data.rawAssignmentsWithSlots,2134102);
 assert.equal(data.rawSkillAssignments,633379);
 assert.equal(data.verifiedInGame,false);
 assert.match(data.sourceSha256,/^[a-f0-9]{64}$/);
 assert.equal(data.sourceSha256,require('node:crypto').createHash('sha256').update(require('node:fs').readFileSync(require('node:path').join(__dirname,'../inputs/호석테이블.xlsx'))).digest('hex'));
 const r=data.recipes.find(r=>r.id===22);
 assert.deepEqual(r.slots,[{weaponSlots:[1],armorSlots:[]},{weaponSlots:[1],armorSlots:[1]},{weaponSlots:[1],armorSlots:[1,1]}]);
 assert(Object.values(data.groups).flat().every(s=>T.cleanSkill(s.name)===s.name));
});
test('query validation rejects malformed criteria before enumeration',()=>{
 const names=new Set(['A']);
 assert.throws(()=>C.validateQuery(query([]),names));
 assert.throws(()=>C.validateQuery(query([skill('Z',1)]),names));
 assert.throws(()=>C.validateQuery(query([skill('A',1),skill('A',2)]),names));
 assert.throws(()=>C.validateQuery(query([skill('A',1.5)]),names));
 assert.throws(()=>C.validateQuery(query([skill('A',1)],{weaponSlots:[4]}),names));
 assert.throws(()=>C.validateQuery(query([skill('A',1)],{rarity:9}),names));
});
test('optimized recipe pruning matches an independent brute-force reference on a fixture',()=>{
 for(const q of [query([skill('A',1)]),query([skill('B',2),skill('C',1)]),query([skill('C',1)],{weaponSlots:[1]})]){
  const expected=[];
  for(const r of tiny.recipes){
   for(const a of tiny.groups[r.groups[0]])for(const b of tiny.groups[r.groups[1]]){
    if(a.name===b.name)continue;
    if(!q.skills.every(w=>[a,b].some(s=>s.name===w.name&&s.level>=w.level)))continue;
    for(const slot of r.slots){
     if(q.weaponSlots.length&&!slot.weaponSlots.length)continue;
     expected.push(JSON.stringify([r.id,C.key({skills:[a,b],...slot})]));
    }
   }
  }
  const actual=candidates(tiny,q).map(r=>JSON.stringify([r.recipeId,C.key(r.record)]));
  assert.deepEqual(actual.sort(),expected.sort());
 }
});
