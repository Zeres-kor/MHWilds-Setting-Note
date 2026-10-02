'use strict';

const TagRules = (() => {
  const HEADERS = ['기준ID','활성','적용무기','태그','우선순위','스킬판정','스킬1','레벨1','스킬2','레벨2','스킬3','레벨3','슬롯판정','무기슬롯1','무기슬롯2','무기슬롯3','방어구슬롯1','방어구슬롯2','방어구슬롯3','설명'];
  const WEAPONS = ['대검','태도','한손검','쌍검','해머','수렵피리','랜스','건랜스','슬래시액스','차지액스','조충곤','라이트보우건','헤비보우건','활'];
  const GRADES = ['극종결','종결','준종결','상급','일반'];
  const empty = value => value === null || value === undefined || String(value).trim() === '';
  const clean = value => String(value).normalize('NFC').trim().replace(/\s+/g, ' ');
  const sortedSlots = values => values.filter(Boolean).slice().sort((a, b) => b - a);

  function parseRows(rows, knownNames) {
    const errors = [], rules = [];
    const known = new Set(knownNames.map(clean));
    if (!Array.isArray(rows) || !Array.isArray(rows[0])) return {rules, errors:['태그기준!1행: 헤더가 없습니다.']};
    const names = rows[0].map(v => empty(v) ? '' : clean(v));
    const positions = new Map();
    names.forEach((name, index) => {
      if (!name) return;
      if (positions.has(name)) errors.push(`태그기준!1행 · ${name}: 중복 헤더입니다.`);
      else if (!HEADERS.includes(name)) errors.push(`태그기준!1행 · ${name}: 알 수 없는 헤더입니다.`);
      else positions.set(name, index);
    });
    for (const name of HEADERS) if (!positions.has(name)) errors.push(`태그기준!1행 · ${name}: 필수 헤더가 없습니다.`);
    if (errors.length) return {rules, errors};
    const ids = new Set(), priorities = new Map();
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i] || [];
      if (row.every(empty)) continue;
      const at = name => row[positions.get(name)];
      const fail = (name, reason) => errors.push(`태그기준!${i + 1}행 · ${name}: ${reason}`);
      const required = name => {
        const value = at(name);
        if (empty(value)) { fail(name, '값을 입력하세요.'); return ''; }
        return clean(value);
      };
      const integer = (name, min, max) => {
        const raw = at(name), value = Number(raw);
        if (empty(raw) || !Number.isSafeInteger(value) || value < min || value > max) {
          fail(name, `${min}~${max} 정수를 입력하세요.`); return null;
        }
        return value;
      };
      const id = required('기준ID');
      if (id && ids.has(id)) fail('기준ID', '중복 ID입니다.');
      ids.add(id);
      const activeText = required('활성'), active = activeText === '예';
      if (activeText && !['예','아니오'].includes(activeText)) fail('활성', '예 또는 아니오를 입력하세요.');
      const scope = required('적용무기');
      if (scope && scope !== '공통' && !WEAPONS.includes(scope)) fail('적용무기', '공통 또는 지원 무기를 입력하세요.');
      const grade = required('태그');
      if (grade && !GRADES.includes(grade)) fail('태그', '정해진 평가 태그를 입력하세요.');
      const priority = integer('우선순위', 1, 1000000);
      const skillMode = required('스킬판정');
      if (skillMode && !['이상','정확'].includes(skillMode)) fail('스킬판정', '이상 또는 정확을 입력하세요.');
      const skills = [], skillSet = new Set();
      for (let n = 1; n <= 3; n++) {
        const rawName = at(`스킬${n}`), rawLevel = at(`레벨${n}`);
        if (empty(rawName) && empty(rawLevel)) continue;
        if (empty(rawName)) { fail(`스킬${n}`, '레벨과 함께 입력하세요.'); continue; }
        const name = clean(rawName);
        if (!known.has(name)) fail(`스킬${n}`, '제공된 호석 스킬 표에 없는 이름입니다.');
        if (skillSet.has(name)) fail(`스킬${n}`, '같은 스킬을 중복 입력할 수 없습니다.');
        skillSet.add(name);
        const level = integer(`레벨${n}`, 1, 10);
        if (level !== null) skills.push({name, level});
      }
      const slotMode = required('슬롯판정');
      if (slotMode && !['이상','정확','무시'].includes(slotMode)) fail('슬롯판정', '이상, 정확 또는 무시를 입력하세요.');
      const slots = {weapon:[], armor:[]};
      for (const [part, prefix] of [['weapon','무기'],['armor','방어구']]) {
        for (let n = 1; n <= 3; n++) {
          const label = `${prefix}슬롯${n}`, raw = at(label);
          if (slotMode === '무시' && !empty(raw)) fail(label, '슬롯판정이 무시이면 비워두세요.');
          if (empty(raw)) continue;
          const size = integer(label, 0, 3);
          if (size) slots[part].push(size);
        }
        slots[part] = sortedSlots(slots[part]);
      }
      if (!skills.length && !slots.weapon.length && !slots.armor.length) fail('스킬1', '스킬이나 슬롯 조건을 하나 이상 지정하세요.');
      const description = empty(at('설명')) ? '' : clean(at('설명'));
      if (active && scope && grade && priority !== null) {
        const key = `${scope}\u0000${priority}`;
        if (priorities.has(key) && priorities.get(key) !== grade) fail('우선순위', '같은 범위·순위에 다른 활성 태그가 있습니다.');
        else priorities.set(key, grade);
      }
      rules.push({id, active, scope, grade, priority, skillMode, skills, slotMode, weaponSlots:slots.weapon, armorSlots:slots.armor, description});
    }
    return {rules, errors};
  }

  function validateRules(rules, knownNames) {
    if (!Array.isArray(rules)) throw Error('태그 기준 목록 형식이 잘못됐습니다.');
    const rows = [HEADERS];
    for (const rule of rules) {
      if (!rule || typeof rule !== 'object' || typeof rule.active !== 'boolean' || typeof rule.id !== 'string' ||
        typeof rule.scope !== 'string' || typeof rule.grade !== 'string' || typeof rule.skillMode !== 'string' ||
        typeof rule.slotMode !== 'string' || typeof rule.description !== 'string' || !Array.isArray(rule.skills) ||
        !Array.isArray(rule.weaponSlots) || !Array.isArray(rule.armorSlots) || rule.skills.length > 3 ||
        rule.weaponSlots.length > 3 || rule.armorSlots.length > 3) throw Error('태그 기준 항목 형식이 잘못됐습니다.');
      rows.push([rule.id,rule.active?'예':'아니오',rule.scope,rule.grade,rule.priority,rule.skillMode,
        ...[0,1,2].flatMap(i => [rule.skills[i]?.name ?? '',rule.skills[i]?.level ?? '']),rule.slotMode,
        ...[0,1,2].map(i => rule.weaponSlots[i] ?? ''),...[0,1,2].map(i => rule.armorSlots[i] ?? ''),rule.description ?? '']);
    }
    const result = parseRows(rows, knownNames);
    if (result.errors.length) throw Error(result.errors[0]);
    return result.rules;
  }

  function matchRule(record, rule) {
    const actual = new Map(record.skills.map(skill => [clean(skill.name), skill.level]));
    if (rule.skills.length && rule.skillMode === '정확' && actual.size !== rule.skills.length) return false;
    if (!rule.skills.every(skill => actual.has(skill.name) && (rule.skillMode === '정확' ? actual.get(skill.name) === skill.level : actual.get(skill.name) >= skill.level))) return false;
    if (rule.slotMode === '무시') return true;
    for (const part of ['weaponSlots','armorSlots']) {
      const have = sortedSlots(record[part]), need = rule[part];
      if (rule.slotMode === '정확') {
        if (have.length !== need.length || have.some((size, i) => size !== need[i])) return false;
      } else if (have.length < need.length || need.some((size, i) => have[i] < size)) return false;
    }
    return true;
  }

  function evaluate(record, weapon, rules) {
    const result = {};
    for (const [key, scope] of [['common','공통'],['weapon',weapon]]) {
      const matches = rules.filter(rule => rule.active && rule.scope === scope && matchRule(record, rule))
        .sort((a, b) => a.priority - b.priority || GRADES.indexOf(a.grade) - GRADES.indexOf(b.grade) || a.id.localeCompare(b.id));
      const first = matches[0];
      result[key] = first ? {grade:first.grade, priority:first.priority, ruleIds:matches.filter(rule => rule.grade === first.grade && rule.priority === first.priority).map(rule => rule.id), matches} : {grade:'미분류', priority:Infinity, ruleIds:[], matches:[]};
    }
    return result;
  }

  function mergeRules(current, incoming, mode) {
    if (mode === 'replace') return incoming;
    if (mode !== 'merge') throw Error('알 수 없는 기준 적용 방식입니다.');
    const result = new Map(current.map(rule => [rule.id, rule]));
    for (const rule of incoming) result.set(rule.id, rule);
    return [...result.values()];
  }

  return {HEADERS,WEAPONS,GRADES,clean,parseRows,validateRules,matchRule,evaluate,mergeRules};
})();

if (typeof module !== 'undefined') module.exports = TagRules;
