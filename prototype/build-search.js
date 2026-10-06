'use strict';
const BuildSearch = (() => {
  const weaponBonusesApi = typeof module !== 'undefined' ? require('./weapon-bonuses.js') : WeaponBonuses;
  const candidatesApi = typeof module !== 'undefined' ? require('./talisman-candidates.js') : TalismanCandidates;
  const PARTS = ['head','chest','arms','waist','legs'];
  const counts = slots => {
    const a = [0,0,0,0,0,0];
    for (const s of slots) a[(s.kind === 'weapon' ? 0 : 3) + s.size - 1]++;
    return a;
  };
  const itemCounts = (item, charm=false) => counts(charm ? [
    ...item.weaponSlots.map(size=>({kind:'weapon',size})), ...item.armorSlots.map(size=>({kind:'armor',size}))
  ] : item.slots.map(size=>({kind:item.part?'armor':'weapon',size})));
  const plus = (a,b) => a.map((n,i)=>n+b[i]);
  const dominates = (a,b) => a.v.every((n,i)=>n>=b.v[i]) && a.defense>=b.defense && [0,3].every(offset=>[0,1,2].every(size=>a.slots.slice(offset+size,offset+3).reduce((x,y)=>x+y,0)>=b.slots.slice(offset+size,offset+3).reduce((x,y)=>x+y,0)));
  function frontier(items, check=()=>{}) {
    const out=[];
    for (const item of items.sort((a,b)=>b.defense-a.defense || b.v.reduce((x,y)=>x+y,0)-a.v.reduce((x,y)=>x+y,0))) {
      check();
      if (out.some(a=>dominates(a,item))) continue;
      for(let i=out.length-1;i>=0;i--) if(dominates(item,out[i]))out.splice(i,1);
      out.push(item);
    }
    return out;
  }
  function validateRequest(data, request) {
    const model=new Map(data.skills.map(s=>[s.id,s]));
    if (!request || !Array.isArray(request.goals) || request.goals.length<1) throw Error('목표 스킬을 하나 이상 지정하세요.');
    const seen=new Set();
    for(const goal of request.goals) {
      const skill=model.get(goal.id);
      if(!skill || !Number.isInteger(goal.level) || goal.level<1 || goal.level>skill.maxLevel) throw Error('목표 스킬과 지원 레벨을 확인하세요.');
      if(seen.has(goal.id))throw Error('같은 목표 스킬을 중복 지정할 수 없습니다.');
      seen.add(goal.id);
      if(['set','group'].includes(skill.kind) && !skill.ranks.some(r=>r.level===goal.level && Number.isInteger(r.pieces) && r.pieces>0))throw Error('세트 효과의 필요 부위 수를 확인하지 못했습니다.');
    }
    const weapon=data.weapons.find(w=>w.id===request.weaponId);
    if(!weapon)throw Error('검색할 무기를 선택하세요.');
    weaponBonusesApi.selected(data,weapon,request);
    if(!['all','owned','none'].includes(request.charmMode))throw Error('호석 모드를 확인하세요.');
    if(!['high','low','all'].includes(request.rank))throw Error('방어구 등급을 확인하세요.');
    if(!Number.isInteger(request.minDefense) || request.minDefense<0 || request.minDefense>2000)throw Error('최소 방어력은 0~2000 정수로 입력하세요.');
    return request;
  }
  // Exact decoration search. A larger fitting slot has no advantage when a smaller one is free.
  function fillDecorations(deficits, resources, choices, check=()=>{}, memo=new Map()) {
    check();
    if(deficits.every(n=>n<=0))return [];
    const key=deficits.join(',')+'|'+resources.join(',');
    if(memo.has(key))return memo.get(key);
    let options=null;
    for(let goal=0;goal<deficits.length;goal++) {
      if(deficits[goal]<=0)continue;
      const feasible=[];
      for(const d of choices) {
        if(d.v[goal]<=0)continue;
        const offset=d.item.kind==='weapon'?0:3;
        const size=[d.item.slot,d.item.slot+1,d.item.slot+2].find(n=>n<=3 && resources[offset+n-1]>0);
        if(size)feasible.push({d,size,index:offset+size-1});
      }
      if(!feasible.length){options=[];break;}
      if(options===null || feasible.length<options.length)options=feasible;
    }
    options.sort((a,b)=>a.d.item.slot-b.d.item.slot || b.d.v.reduce((x,y)=>x+y,0)-a.d.v.reduce((x,y)=>x+y,0));
    let answer=null;
    for(const option of options) {
      const nextResources=resources.slice();nextResources[option.index]--;
      const remaining=deficits.map((n,i)=>Math.max(0,n-option.d.v[i]));
      const tail=fillDecorations(remaining,nextResources,choices,check,memo);
      if(tail!==null){answer=[{decoration:option.d.item,kind:option.d.item.kind,slotSize:option.size},...tail];break;}
    }
    if(memo.size>=50000)memo.clear();
    memo.set(key,answer);return answer;
  }
  function search(data, recipeData, request, progress=()=>{}, options={}) {
    validateRequest(data,request);
    const start=Date.now(), maxMs=options.maxMs??20000, maxNodes=options.maxNodes??200000, maxResults=options.maxResults??20;
    const model=new Map(data.skills.map(s=>[s.id,s]));
    const names=new Map(data.skills.map(s=>[s.name,s]));
    const goals=request.goals.map(g=>({...g,skill:model.get(g.id),bonus:['set','group'].includes(model.get(g.id).kind)}));
    const target=goals.map(g=>g.bonus?g.skill.ranks.find(r=>r.level===g.level).pieces:g.level);
    const vector=item=>goals.map((g,i)=>Math.min(target[i],g.bonus?(item.bonuses||[]).includes(g.id)?1:0:item.skills[g.id]||0));
    const weapon=weaponBonusesApi.apply(data,data.weapons.find(w=>w.id===request.weaponId),request);
    const projected=item=>({item,v:vector(item),slots:itemCounts(item),defense:item.defense||0});
    let nodes=0,reason=null,excludedCharms=0;const results=[];
    const stop=why=>{throw {searchStop:true,reason:why};};
    const timeCheck=()=>{if(Date.now()-start>maxMs)stop('time-limit');};
    const step=()=>{nodes++;if(nodes>maxNodes)stop('node-limit');if(nodes%500===0){timeCheck();if(nodes%5000===0)progress({phase:'equipment',nodes,results:results.length});}};
    try {
      const pools=PARTS.map(part=>frontier(data.armor.filter(a=>a.part===part&&(request.rank==='all'||a.rank===request.rank)).map(projected),timeCheck));
      if(pools.some(p=>!p.length))return {results:[],partial:false,reason:null,nodes,excludedCharms};
      const charmBuckets=new Map();
      const addCharm=(record,owned=false,recipeIds=[])=>{
        if(record.skills.some(s=>!names.has(s.name) || s.level>names.get(s.name).maxLevel)) {excludedCharms++;return;}
        const skills=Object.fromEntries(record.skills.map(s=>[names.get(s.name).id,s.level]));
        const candidate={item:record,v:vector({skills,bonuses:[]}),slots:itemCounts(record,true),defense:0,owned,recipeIds};
        const key=candidate.v.join(',')+'|'+candidate.slots.join(',');
        if(!charmBuckets.has(key) || owned&&!charmBuckets.get(key).owned)charmBuckets.set(key,candidate);
      };
      const empty={skills:[],weaponSlots:[],armorSlots:[],tags:[],memo:''};
      addCharm(empty);
      if(request.charmMode==='all') {
        progress({phase:'charms',examined:0});
        for(const entry of candidatesApi.enumerate(recipeData,{skills:[],rarity:0,weaponSlots:[],armorSlots:[]})) {
          if(entry.kind==='progress'){timeCheck();progress({phase:'charms',examined:entry.examined});}
          else addCharm(entry.record,false,[entry.recipeId]);
        }
      }
      if(request.charmMode!=='none')for(const record of request.records||[]) {
        const match=candidatesApi.matchRecord(recipeData,record);
        if(request.charmMode==='owned'||match.matches.length)addCharm(record,true,match.matches.map(m=>m.recipeId));
      }
      const charms=frontier([...charmBuckets.values()],timeCheck);
      const decorationBuckets=new Map();
      for(const item of data.decorations){const v=vector(item);if(!v.some(Boolean))continue;const key=item.kind+'|'+item.slot+'|'+v.join(',');if(!decorationBuckets.has(key))decorationBuckets.set(key,{item,v});}
      const decorations=[...decorationBuckets.values()];
      const maxJewel=goals.map((g,i)=>Array.from({length:6},(_,n)=>Math.max(0,...decorations.filter(d=>d.item.kind===(n<3?'weapon':'armor') && d.item.slot<=n%3+1).map(d=>d.v[i]))));
      const charmMax=target.map((_,i)=>Math.max(...charms.map(c=>c.v[i])));
      const charmSlots=Array.from({length:6},(_,i)=>Math.max(...charms.map(c=>c.slots[i])));
      const remaining=[null,null,null,null,null,{v:target.map(()=>0),slots:[0,0,0,0,0,0],defense:0}];
      for(let n=4;n>=0;n--)remaining[n]={v:plus(remaining[n+1].v,target.map((_,i)=>Math.max(...pools[n].map(a=>a.v[i])))),slots:plus(remaining[n+1].slots,Array.from({length:6},(_,i)=>Math.max(...pools[n].map(a=>a.slots[i])))),defense:remaining[n+1].defense+Math.max(...pools[n].map(a=>a.defense))};
      const memo=new Map(), selected=[];
      const baseWeapon=vector(weapon), weaponResources=itemCounts(weapon);
      function buildResult(charm, plan, defense) {
        const slots=[...weapon.slots.map((size,index)=>({kind:'weapon',size,owner:'weapon',index})),
          ...selected.flatMap(a=>a.item.slots.map((size,index)=>({kind:'armor',size,owner:a.item.part,index}))),
          ...charm.item.weaponSlots.map((size,index)=>({kind:'weapon',size,owner:'talisman',index})),
          ...charm.item.armorSlots.map((size,index)=>({kind:'armor',size,owner:'talisman',index}))];
        const placements=plan.map(p=>{const index=slots.findIndex(s=>s.kind===p.kind&&s.size===p.slotSize&&!s.used);if(index<0)throw Error('장식주 슬롯 배치 검증에 실패했습니다.');const slot=slots[index];slot.used=true;return {decoration:p.decoration,...slot};});
        const totals={}, bonuses={};
        for(const item of [weapon,...selected.map(a=>a.item)]){
          for(const [id,level] of Object.entries(item.skills))totals[id]=(totals[id]||0)+level;
          for(const id of item.bonuses||[])bonuses[id]=(bonuses[id]||0)+1;
        }
        for(const s of charm.item.skills){const id=names.get(s.name).id;totals[id]=(totals[id]||0)+s.level;}
        for(const p of placements)for(const [id,level] of Object.entries(p.decoration.skills))totals[id]=(totals[id]||0)+level;
        const achieved=goals.map(g=>{const pieces=bonuses[g.id]||0;const level=g.bonus?Math.max(0,...g.skill.ranks.filter(r=>r.pieces<=pieces).map(r=>r.level)):Math.min(g.skill.maxLevel,totals[g.id]||0);return {id:g.id,name:g.skill.name,required:g.level,level,pieces:g.bonus?pieces:null,effect:g.bonus?g.skill.ranks.find(r=>r.level===level)?.name:null};});
        if(achieved.some(g=>g.level<g.required))throw Error('목표 스킬 결과 검증에 실패했습니다.');
        const activeBonuses=data.skills.filter(s=>['set','group'].includes(s.kind)).flatMap(s=>{const ranks=s.ranks.filter(r=>r.pieces<=(bonuses[s.id]||0));if(!ranks.length)return [];const rank=ranks.sort((a,b)=>b.level-a.level)[0];return [{name:s.name,effect:rank.name,level:rank.level,pieces:bonuses[s.id]}];});
        return {weapon,armor:selected.map(a=>a.item),charm:charm.item.skills.length?charm.item:null,charmOwned:charm.owned,recipeIds:charm.recipeIds,decorations:placements,achieved,activeBonuses,defense};
      }
      function walk(depth,v,resources,defense){
        step();
        const upperSlots=plus(plus(resources,remaining[depth].slots),charmSlots);
        if(defense+remaining[depth].defense<request.minDefense)return;
        if(target.some((need,i)=>v[i]+remaining[depth].v[i]+charmMax[i]+upperSlots.reduce((sum,n,j)=>sum+n*maxJewel[i][j],0)<need))return;
        if(depth<5){for(const item of pools[depth]){selected.push(item);walk(depth+1,plus(v,item.v),plus(resources,item.slots),defense+item.defense);selected.pop();}return;}
        for(const charm of charms){step();const have=plus(v,charm.v);const deficits=target.map((need,i)=>Math.max(0,need-have[i]));const allSlots=plus(resources,charm.slots);const plan=fillDecorations(deficits,allSlots,decorations,step,memo);if(plan===null)continue;results.push(buildResult(charm,plan,defense));if(results.length>=maxResults)stop('result-limit');}
      }
      progress({phase:'equipment',nodes:0,results:0});walk(0,baseWeapon,weaponResources,weapon.defenseBonus||0);
    } catch(error){if(error.searchStop)reason=error.reason;else throw error;}
    return {results,partial:reason!==null,reason,nodes,excludedCharms,elapsedMs:Date.now()-start};
  }
  return {PARTS,counts,dominates,frontier,validateRequest,fillDecorations,search};
})();
if(typeof module!=='undefined')module.exports=BuildSearch;
