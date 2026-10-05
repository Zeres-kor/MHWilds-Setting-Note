'use strict';

const TalismanCandidates = (() => {
  const RESULT_LIMIT = 200;
  const UNIQUE_LIMIT = 20000;
  const sortSlots = values => values.slice().sort((a, b) => b - a);
  const key = record => JSON.stringify([
    record.skills.map(s => [s.name, s.level]).sort((a, b) => a[0].localeCompare(b[0])),
    sortSlots(record.weaponSlots), sortSlots(record.armorSlots),
  ]);
  const slotsMeet = (have, need) => {
    const a = sortSlots(have), b = sortSlots(need);
    return a.length >= b.length && b.every((size, i) => a[i] >= size);
  };
  function validateQuery(query, names) {
    if (!query || !Array.isArray(query.skills) || !query.skills.length || query.skills.length > 3) throw Error('스킬 조건을 1~3개 지정하세요.');
    const seen = new Set();
    for (const s of query.skills) {
      if (!names.has(s.name)) throw Error('엑셀 그룹에 없는 스킬입니다: ' + s.name);
      if (seen.has(s.name)) throw Error('같은 스킬 조건을 중복 입력할 수 없습니다.');
      seen.add(s.name);
      if (!Number.isInteger(s.level) || s.level < 1 || s.level > 10) throw Error('스킬 레벨은 1~10 정수로 입력하세요.');
    }
    if (![0, 5, 6, 7, 8].includes(query.rarity)) throw Error('지원하지 않는 레어도입니다.');
    for (const part of ['weaponSlots', 'armorSlots']) {
      if (!Array.isArray(query[part]) || query[part].length > 3 || query[part].some(n => !Number.isInteger(n) || n < 1 || n > 3)) throw Error('슬롯은 1~3 크기를 최대 3개 입력하세요.');
    }
    return query;
  }
  // Every repeated skill assignment is excluded. No unverified level summation.
  // A recipe is pruned only if an individual requested skill cannot occur in it.
  function* enumerate(data, query) {
    let examined = 0, repeated = 0;
    for (const recipe of data.recipes) {
      if (query.rarity && recipe.rarity !== query.rarity) continue;
      const groups = recipe.groups.map(id => data.groups[String(id)]);
      if (!query.skills.every(want => groups.some(group => group.some(s => s.name === want.name && s.level >= want.level)))) continue;
      const slots = recipe.slots.filter(slot => slotsMeet(slot.weaponSlots, query.weaponSlots) && slotsMeet(slot.armorSlots, query.armorSlots));
      if (!slots.length) continue;
      const choices = [];
      function* walk(depth) {
        if (depth < groups.length) {
          for (const skill of groups[depth]) { choices.push(skill); yield* walk(depth + 1); choices.pop(); }
          return;
        }
        examined++;
        if (new Set(choices.map(s => s.name)).size !== choices.length) repeated++;
        else if (query.skills.every(want => choices.some(s => s.name === want.name && s.level >= want.level))) {
          for (const slot of slots) {
            yield {kind:'candidate', record:{skills:choices.map(s => ({...s})).sort((a,b) => a.name.localeCompare(b.name)), ...slot}, rarity:recipe.rarity, recipeId:recipe.id};
          }
        }
        if (examined % 5000 === 0) yield {kind:'progress', examined, repeated};
      }
      yield* walk(0);
    }
    yield {kind:'progress', examined, repeated};
  }
  return {RESULT_LIMIT, UNIQUE_LIMIT, key, slotsMeet, validateQuery, enumerate};
})();
if (typeof module !== 'undefined') module.exports = TalismanCandidates;
