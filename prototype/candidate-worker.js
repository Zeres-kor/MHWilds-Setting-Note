'use strict';
importScripts('tag-rules.js', 'inventory-import.js', 'talisman-candidates.js');
self.onmessage = async ({data: request}) => {
  try {
    const response = await fetch('data/talisman-recipes.json');
    if (!response.ok) throw Error('호석 규칙 파일을 불러오지 못했습니다.');
    const data = await response.json();
    if (data.format !== 'mhwilds-workbook-recipes-v1') throw Error('지원하지 않는 호석 규칙 파일입니다.');
    const names = new Set(Object.values(data.groups).flat().map(s => s.name));
    const query = TalismanCandidates.validateQuery(request.query, names);
    const owned = new Map();
    for (const record of request.records) {
      const k = InventoryImport.fingerprint(record);
      owned.set(k, (owned.get(k) || 0) + 1);
    }
    const unique = new Set(), displayed = new Map();
    let examined = 0, repeated = 0, truncated = false;
    for (const item of TalismanCandidates.enumerate(data, query)) {
      if (item.kind === 'progress') {
        ({examined, repeated} = item);
        self.postMessage({kind:'progress', examined, count:unique.size});
        continue;
      }
      const evaluation = TagRules.evaluate(item.record, request.weapon, request.rules);
      if (request.commonGrade && evaluation.common.grade !== request.commonGrade) continue;
      if (request.weaponGrade && evaluation.weapon.grade !== request.weaponGrade) continue;
      const k = TalismanCandidates.key(item.record);
      if (!unique.has(k)) {
        if (unique.size >= TalismanCandidates.UNIQUE_LIMIT) { truncated = true; break; }
        unique.add(k);
        if (displayed.size < TalismanCandidates.RESULT_LIMIT) displayed.set(k, {
          ...item.record, rarities:[], recipeIds:[], evaluation,
          owned:owned.get(InventoryImport.fingerprint(item.record)) || 0,
        });
      }
      const entry = displayed.get(k);
      if (entry) {
        if (!entry.rarities.includes(item.rarity)) entry.rarities.push(item.rarity);
        if (!entry.recipeIds.includes(item.recipeId)) entry.recipeIds.push(item.recipeId);
      }
    }
    self.postMessage({kind:'complete', count:unique.size, truncated, examined, repeated,
      rows:[...displayed.values()].map(row => ({...row, rarities:row.rarities.sort(), recipeIds:row.recipeIds.sort((a,b)=>a-b)}))});
  } catch (error) { self.postMessage({kind:'error', message:error.message}); }
};
