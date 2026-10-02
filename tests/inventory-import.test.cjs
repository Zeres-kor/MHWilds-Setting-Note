const test = require('node:test');
const assert = require('node:assert/strict');
const InventoryImport = require('../prototype/inventory-import.js');

const known = ['혼신', '납도술', '공격'];
const textRow = (skill = '혼신', level = '2') =>
  [skill,level,'','0','','0','1','2','3','1','0','0'].join(',');

test('legacy TXT preserves all armor and weapon slots without inventing metadata', () => {
  const rows = InventoryImport.parseText(textRow(), 'txt', known);
  assert.equal(rows.length, 1);
  assert.deepEqual(rows[0].errors, []);
  assert.deepEqual(rows[0].record.skills, [{name:'혼신',level:2}]);
  assert.deepEqual(rows[0].record.armorSlots, [3,2,1]);
  assert.deepEqual(rows[0].record.weaponSlots, [1]);
  assert.equal(rows[0].record.memo, '');
  assert.deepEqual(rows[0].record.tags, []);
});

test('spreadsheet paste accepts a header and an optional memo column', () => {
  const header = [...InventoryImport.HEADERS,'메모'].join('\t');
  const line = ['납도술','3','혼신','2','','0','1','1','0','0','0','0','검토 메모'].join('\t');
  const rows = InventoryImport.parseText(header + '\n' + line, 'paste', known);
  assert.equal(rows[0].number, 2);
  assert.equal(rows[0].record.memo, '검토 메모');
  assert.deepEqual(rows[0].record.armorSlots, [1,1]);
  const trailingBlank = InventoryImport.parseText(InventoryImport.HEADERS.join('\t') + '\t\n' + line, 'paste', known);
  assert.equal(trailingBlank[0].record.memo, '검토 메모');
});

test('CSV paste supports a quoted memo containing a comma', () => {
  const line = textRow() + ',"보관, 비교"';
  const rows = InventoryImport.parseText(line, 'paste', known);
  assert.equal(rows[0].record.memo, '보관, 비교');
});

test('unknown skills need review while malformed values block the row', () => {
  const lines = [
    textRow('없는 스킬'),
    textRow('혼신', '2.5'),
    textRow().replace(',3,1,0,0', ',4,1,0,0'),
    '혼신,2',
  ];
  const rows = InventoryImport.parseText(lines.join('\n'), 'txt', known);
  assert.deepEqual(rows.map(row => row.number), [1,2,3,4]);
  assert.ok(rows[0].record);
  assert.deepEqual(rows[0].errors, []);
  assert.match(rows[0].warnings.join(' '), /제공된 스킬 표/);
  assert.ok(rows.slice(1).every(row => !row.record && row.errors.length));
  assert.match(rows[1].errors.join(' '), /레벨1/);
  assert.match(rows[2].errors.join(' '), /방어구슬롯3/);
  assert.match(rows[3].errors.join(' '), /12열/);
});

test('duplicate detection distinguishes saved and same-batch copies', () => {
  const rows = InventoryImport.parseText([textRow(), textRow(), textRow('공격', '1')].join('\n'), 'txt', known);
  const first = InventoryImport.analyze(rows, []);
  assert.deepEqual(first.map(row => row.duplicate), [null, 'batch', null]);
  const saved = InventoryImport.analyze(rows, [rows[0].record]);
  assert.deepEqual(saved.map(row => row.duplicate), ['existing','existing',null]);
  const twoSkills = InventoryImport.parseText('혼신,2,공격,1,,0,1,2,3,1,0,0', 'txt', known)[0].record;
  const sameInDifferentOrder = {...twoSkills, skills:[...twoSkills.skills].reverse(), armorSlots:[...twoSkills.armorSlots].reverse()};
  assert.equal(InventoryImport.fingerprint(twoSkills), InventoryImport.fingerprint(sameInDifferentOrder));
});

test('empty input, wrong headers and oversized batches are rejected', () => {
  assert.throws(() => InventoryImport.parseText('', 'paste', known), /가져올 행/);
  assert.throws(() => InventoryImport.parseText('스킬1,레벨1,메모\n' + textRow(), 'paste', known), /헤더/);
  assert.throws(() => InventoryImport.parseText(Array(501).fill(textRow()).join('\n'), 'txt', known), /500행/);
});
