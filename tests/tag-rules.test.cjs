const test = require('node:test');
const assert = require('node:assert/strict');
const TagRules = require('../prototype/tag-rules.js');

const known = ['혼신', '납도술', '공격'];
const row = values => TagRules.HEADERS.map(name => values[name] ?? '');
const base = {
  기준ID:'COMMON-01', 활성:'예', 적용무기:'공통', 태그:'준종결', 우선순위:3,
  스킬판정:'이상', 스킬1:'혼신', 레벨1:2, 슬롯판정:'이상',
  무기슬롯1:0, 방어구슬롯1:1,
};
const record = (skills, weaponSlots = [], armorSlots = []) =>
  ({skills:skills.map(([name, level]) => ({name, level})), weaponSlots, armorSlots});
const parse = values => TagRules.parseRows([TagRules.HEADERS, ...values.map(row)], known);

test('common and weapon tags remain independent and priority chooses one per scope', () => {
  const values = [
    base,
    {...base, 기준ID:'LS-01', 적용무기:'태도', 태그:'종결', 우선순위:2,
      스킬판정:'정확', 스킬1:'납도술', 레벨1:3, 스킬2:'혼신', 레벨2:2,
      슬롯판정:'정확', 방어구슬롯1:1, 방어구슬롯2:1},
    {...base, 기준ID:'LS-02', 적용무기:'태도', 태그:'일반', 우선순위:5},
  ];
  const parsed = parse(values);
  assert.deepEqual(parsed.errors, []);
  const talisman = record([['혼신',2],['납도술',3]], [], [1,1]);
  const result = TagRules.evaluate(talisman, '태도', parsed.rules);
  assert.equal(result.common.grade, '준종결');
  assert.equal(result.weapon.grade, '종결');
  assert.deepEqual(result.weapon.ruleIds, ['LS-01']);
  assert.equal(TagRules.evaluate(talisman, '대검', parsed.rules).weapon.grade, '미분류');
});

test('exact compares all skill levels and slot counts, while minimum allows extras', () => {
  const exact = parse([{...base, 태그:'종결', 우선순위:2, 스킬판정:'정확', 슬롯판정:'정확'}]).rules[0];
  const minimum = parse([base]).rules[0];
  assert.equal(TagRules.matchRule(record([['혼신',2]], [], [1]), exact), true);
  assert.equal(TagRules.matchRule(record([['혼신',3]], [], [1]), exact), false);
  assert.equal(TagRules.matchRule(record([['혼신',2]], [], [1,1]), exact), false);
  assert.equal(TagRules.matchRule(record([['혼신',2],['공격',1]], [], [1]), exact), false);
  assert.equal(TagRules.matchRule(record([['혼신',3],['공격',1]], [], [2,1]), minimum), true);
  assert.equal(TagRules.matchRule(record([['혼신',3]], [2], []), minimum), false);
});

test('slot-only rule and inactive example behave as documented', () => {
  const parsed = parse([
    {...base, 스킬1:'', 레벨1:'', 스킬판정:'정확'},
    {...base, 기준ID:'INACTIVE', 활성:'아니오', 태그:'종결', 우선순위:2},
  ]);
  assert.deepEqual(parsed.errors, []);
  const result = TagRules.evaluate(record([['공격',1]], [], [1]), '태도', parsed.rules);
  assert.equal(result.common.grade, '준종결');
  assert.deepEqual(result.common.ruleIds, ['COMMON-01']);
});

test('bad rules report row and column; conflicts and unknown skills cannot apply', () => {
  assert.match(parse([{...base, 스킬1:'없는 스킬'}]).errors.join(' '), /2행 · 스킬1/);
  assert.match(parse([{...base, 스킬2:'혼신', 레벨2:3}]).errors.join(' '), /2행 · 스킬2/);
  assert.match(parse([{...base, 슬롯판정:'무시'}]).errors.join(' '), /2행 · 방어구슬롯1/);
  assert.match(parse([{...base, 스킬1:'', 레벨1:'', 방어구슬롯1:0}]).errors.join(' '), /조건을 하나 이상/);
  assert.match(parse([base, {...base, 기준ID:'OTHER', 태그:'일반'}]).errors.join(' '), /3행 · 우선순위/);
});

test('merge preserves absent IDs and replacement removes them', () => {
  const a = parse([base]).rules;
  const b = parse([{...base, 기준ID:'OTHER'}]).rules;
  assert.equal(TagRules.mergeRules(a, b, 'merge').length, 2);
  assert.equal(TagRules.mergeRules(a, b, 'replace').length, 1);
  assert.deepEqual(TagRules.validateRules(a, known), a);
});

test('game and spreadsheet skill names remain compatible for tagging and restored rules', () => {
  const parsed = TagRules.parseRows([TagRules.HEADERS, row({...base, 스킬1:'발도술[기]', 스킬2:'양심', 레벨2:1})], ['발도술【기】','앙심']);
  assert.deepEqual(parsed.errors, []);
  assert.equal(TagRules.evaluate(record([['발도술【기】',2],['앙심',1]], [], [1]), '태도', parsed.rules).common.grade, '준종결');
  const oldRule = {...parsed.rules[0], skills:[{name:'발도술[기]',level:2},{name:'양심',level:1}]};
  assert.equal(TagRules.validateRules([oldRule], ['발도술【기】','앙심'])[0].skills[1].name, '앙심');
  assert.equal(TagRules.cleanSkill('constructor'), 'constructor');
});
