'use strict';

const $ = id => document.getElementById(id);
const {WEAPONS, GRADES} = TagRules;
const LEGACY_KEY = 'mhwilds-inventory-prototype-v1';
const STATE_KEY = 'mhwilds-app-v2';
const BACKUP_FORMAT = 'mhwilds-backup-v2';
let records = [], rules = [], revision = 0, inventoryVersion = 0, rulesVersion = 0, stateRaw = null, storageReady = true;
let selected = new Set(), tagMode = 'add', uploadedRules = null, pendingImport = null;

function announce(message) { $('message').textContent = message; }
function option(select, value, label) {
  const el = document.createElement('option');
  el.value = value;
  el.textContent = label;
  select.append(el);
}

WEAPONS.forEach(weapon => option($('weapon'), weapon, weapon));
$('weapon').value = '태도';
for (const id of ['commonFilter', 'weaponFilter']) {
  option($(id), '', '전체');
  GRADES.forEach(grade => option($(id), grade, grade));
  option($(id), '미분류', '미분류');
}
for (let i = 1; i <= 3; i++) {
  const nameLabel = document.createElement('label'), levelLabel = document.createElement('label');
  nameLabel.textContent = '스킬 ' + i;
  levelLabel.textContent = '레벨';
  const name = document.createElement('input'), level = document.createElement('input');
  name.id = 'skill' + i;
  name.maxLength = 60;
  level.id = 'level' + i;
  level.type = 'number';
  level.min = 1;
  level.max = 10;
  nameLabel.append(name);
  levelLabel.append(level);
  $('skills').append(nameLabel, levelLabel);
}

function validateRecord(record) {
  if (!record || typeof record.id !== 'string' || !record.id || !Array.isArray(record.skills) || record.skills.length < 1 || record.skills.length > 3) throw Error('호석의 ID 또는 스킬 정보를 확인하세요.');
  const skills = record.skills.map(skill => {
    if (!skill || typeof skill.name !== 'string' || !skill.name.trim() || !Number.isInteger(skill.level) || skill.level < 1 || skill.level > 10) throw Error('스킬 이름과 레벨을 확인하세요.');
    return {name: TagRules.clean(skill.name), level: skill.level};
  });
  if (new Set(skills.map(skill => skill.name)).size !== skills.length) throw Error('같은 스킬을 중복 입력할 수 없습니다.');
  for (const key of ['weaponSlots', 'armorSlots']) {
    if (!Array.isArray(record[key]) || record[key].length > 3 || record[key].some(size => !Number.isInteger(size) || size < 1 || size > 3)) throw Error('슬롯은 종류별 최대 3개, 크기 1~3으로 입력하세요.');
  }
  if (!Array.isArray(record.tags) || record.tags.some(tag => typeof tag !== 'string' || tag.length > 40) || typeof record.memo !== 'string' || !Number.isFinite(record.created)) throw Error('태그·메모·등록일 형식을 확인하세요.');
  return {id: record.id, skills, weaponSlots: [...record.weaponSlots].sort((a, b) => b - a),
    armorSlots: [...record.armorSlots].sort((a, b) => b - a), tags: [...new Set(record.tags)], memo: record.memo, created: record.created};
}
function validateList(list) {
  if (!Array.isArray(list)) throw Error('호석 목록 형식이 잘못됐습니다.');
  const clean = list.map(validateRecord);
  if (new Set(clean.map(record => record.id)).size !== clean.length) throw Error('중복 ID가 있습니다.');
  return clean;
}

function readState() {
  try {
    stateRaw = localStorage.getItem(STATE_KEY);
    if (stateRaw) {
      const saved = JSON.parse(stateRaw);
      if (saved.format !== STATE_KEY || !Number.isSafeInteger(saved.revision) || saved.revision < 0) throw Error('저장 버전 형식이 잘못됐습니다.');
      records = validateList(saved.records);
      rules = TagRules.validateRules(saved.rules, SKILL_NAMES);
      revision = saved.revision;
      inventoryVersion = saved.inventoryVersion || 0;
      rulesVersion = saved.rulesVersion || 0;
      if (![inventoryVersion, rulesVersion].every(value => Number.isSafeInteger(value) && value >= 0)) throw Error('저장 데이터 버전이 잘못됐습니다.');
    } else {
      records = validateList(JSON.parse(localStorage.getItem(LEGACY_KEY) || '[]'));
      rules = [];
      revision = 0;
      inventoryVersion = 0;
      rulesVersion = 0;
    }
    storageReady = true;
  } catch (error) {
    storageReady = false;
    records = [];
    rules = [];
    announce('저장 데이터를 읽지 못했습니다. 백업을 복원하기 전에는 저장하지 않습니다. ' + error.message);
  }
}
readState();

function commit(nextRecords, nextRules = rules, recovery = false) {
  if (!storageReady && !recovery) {
    announce('저장 데이터 오류가 있어 변경하지 않았습니다. 정상 백업을 복원하세요.');
    return false;
  }
  try {
    if (!recovery && localStorage.getItem(STATE_KEY) !== stateRaw) {
      readState();
      render();
      announce('다른 탭에서 데이터가 변경됐습니다. 다시 확인한 뒤 작업하세요.');
      return false;
    }
    const cleanRecords = validateList(nextRecords), cleanRules = TagRules.validateRules(nextRules, SKILL_NAMES);
    const nextRevision = revision + 1;
    const nextInventoryVersion = inventoryVersion + Number(JSON.stringify(cleanRecords) !== JSON.stringify(records));
    const nextRulesVersion = rulesVersion + Number(JSON.stringify(cleanRules) !== JSON.stringify(rules));
    const raw = JSON.stringify({format: STATE_KEY, revision: nextRevision, inventoryVersion: nextInventoryVersion,
      rulesVersion: nextRulesVersion, records: cleanRecords, rules: cleanRules});
    localStorage.setItem(STATE_KEY, raw);
    stateRaw = raw;
    records = cleanRecords;
    rules = cleanRules;
    revision = nextRevision;
    inventoryVersion = nextInventoryVersion;
    rulesVersion = nextRulesVersion;
    storageReady = true;
    render();
    return true;
  } catch (error) {
    announce('저장하지 못했습니다. 기존 데이터는 유지됩니다. ' + error.message);
    return false;
  }
}

function visible() {
  const query = $('query').value.trim().toLowerCase(), manual = $('manualFilter').value.trim();
  const type = $('slotType').value, minimum = Number($('slotMin').value), weapon = $('weapon').value;
  const list = records.map(record => ({record, evaluation: TagRules.evaluate(record, weapon, rules)})).filter(({record, evaluation}) =>
    (!query || [...record.skills.map(skill => skill.name), record.memo].join(' ').toLowerCase().includes(query)) &&
    (!manual || record.tags.some(tag => tag.includes(manual))) &&
    (!(minimum || type) || (type ? record[type + 'Slots'] : [...record.weaponSlots, ...record.armorSlots]).some(size => size >= Math.max(1, minimum))) &&
    (!$('commonFilter').value || $('commonFilter').value === evaluation.common.grade) &&
    (!$('weaponFilter').value || $('weaponFilter').value === evaluation.weapon.grade));
  const mode = $('sort').value;
  return list.sort((a, b) => {
    if (mode === 'old') return a.record.created - b.record.created;
    if (mode === 'slot') return Math.max(0, ...b.record.weaponSlots, ...b.record.armorSlots) - Math.max(0, ...a.record.weaponSlots, ...a.record.armorSlots) || b.record.created - a.record.created;
    if (mode === 'common' || mode === 'weapon') return a.evaluation[mode].priority - b.evaluation[mode].priority || b.record.created - a.record.created;
    return b.record.created - a.record.created;
  });
}
function cell(row, value, className) {
  const td = document.createElement('td');
  td.textContent = value;
  if (className) td.className = className;
  row.append(td);
  return td;
}
function gradeCell(row, result) {
  const td = cell(row, result.grade, result.grade === '미분류' ? 'pending' : 'grade');
  if (result.ruleIds.length) td.title = '기준: ' + result.ruleIds.join(', ');
}
function render() {
  const list = visible();
  $('rows').replaceChildren();
  $('count').textContent = '전체 ' + records.length + '개 · 표시 ' + list.length + '개';
  $('weaponHeading').textContent = $('weapon').value + ' 평가';
  for (const {record, evaluation} of list) {
    const row = document.createElement('tr'), check = document.createElement('input');
    check.type = 'checkbox';
    check.checked = selected.has(record.id);
    check.setAttribute('aria-label', record.skills.map(skill => skill.name).join(', ') + ' 선택');
    check.onchange = () => { check.checked ? selected.add(record.id) : selected.delete(record.id); render(); };
    cell(row, '').append(check);
    cell(row, record.skills.map(skill => skill.name + ' Lv.' + skill.level).join(' / '), 'skills-text');
    cell(row, '무기 ' + (record.weaponSlots.join('·') || '—') + ' / 방어구 ' + (record.armorSlots.join('·') || '—'));
    gradeCell(row, evaluation.common);
    gradeCell(row, evaluation.weapon);
    const tags = cell(row, '');
    record.tags.forEach(tag => {
      const badge = document.createElement('span');
      badge.className = 'badge';
      badge.textContent = tag;
      tags.append(badge);
    });
    cell(row, record.memo || '—');
    const edit = document.createElement('button');
    edit.textContent = '상세·수정';
    edit.onclick = () => openEditor(record);
    cell(row, '').append(edit);
    $('rows').append(row);
  }
  $('empty').hidden = list.length > 0;
  $('empty').querySelector('h2').textContent = records.length ? '조건에 맞는 호석이 없습니다' : '첫 호석을 등록해보세요';
  $('empty').querySelector('p').textContent = records.length ? '필터 조건을 줄이거나 초기화해보세요.' : '직접 입력하거나 백업 파일을 가져올 수 있습니다.';
  $('selected').textContent = selected.size + '개 선택';
  for (const id of ['tag', 'untag', 'delete']) $(id).disabled = !selected.size;
  $('all').checked = list.length > 0 && list.every(({record}) => selected.has(record.id));
  $('all').indeterminate = list.some(({record}) => selected.has(record.id)) && !$('all').checked;
}

function openEditor(record) {
  $('form').reset();
  $('formError').textContent = '';
  $('editId').value = record?.id || '';
  $('formTitle').textContent = record ? '호석 상세·수정' : '호석 입력';
  $('evaluationDetails').hidden = !record;
  if (record) {
    record.skills.forEach((skill, index) => {
      $('skill' + (index + 1)).value = skill.name;
      $('level' + (index + 1)).value = skill.level;
    });
    $('weaponSlots').value = record.weaponSlots.join(', ');
    $('armorSlots').value = record.armorSlots.join(', ');
    $('tags').value = record.tags.join(', ');
    $('memo').value = record.memo;
    const evaluation = TagRules.evaluate(record, $('weapon').value, rules);
    $('evaluationDetails').textContent = ['common', 'weapon'].map((key, index) => {
      const result = evaluation[key], scope = index ? $('weapon').value : '공통';
      return scope + ': ' + result.grade + (result.matches.length ? '\n기준 버전 ' + rulesVersion + ' · 일치 기준: ' + result.matches.map(rule => rule.id + (rule.description ? ' (' + rule.description + ')' : '')).join(', ') : '');
    }).join('\n');
  }
  $('editor').showModal();
  $('skill1').focus();
}
function slots(text) {
  if (!text.trim()) return [];
  const tokens = text.split(',').map(token => token.trim());
  if (tokens.some(token => !/^\d+$/.test(token))) throw Error('슬롯을 쉼표로 구분한 숫자로 입력하세요.');
  return tokens.map(Number).filter(size => size !== 0).sort((a, b) => b - a);
}
$('form').onsubmit = event => {
  event.preventDefault();
  try {
    const skills = [];
    for (let i = 1; i <= 3; i++) {
      const name = $('skill' + i).value.trim(), level = $('level' + i).value;
      if (!name && !level) continue;
      if (!name || !level) throw Error('스킬 이름과 레벨을 함께 입력하세요.');
      skills.push({name, level: Number(level)});
    }
    const id = $('editId').value, existing = records.find(record => record.id === id);
    const record = validateRecord({id: id || crypto.randomUUID(), skills, weaponSlots: slots($('weaponSlots').value),
      armorSlots: slots($('armorSlots').value), tags: $('tags').value.split(',').map(tag => tag.trim()).filter(Boolean),
      memo: $('memo').value, created: existing?.created || Date.now()});
    const next = id ? records.map(item => item.id === id ? record : item) : [...records, record];
    if (commit(next)) {
      announce('호석을 저장하고 자동 평가를 갱신했습니다.');
      if ($('continue').checked && !id) { $('form').reset(); $('skill1').focus(); }
      else $('editor').close();
    }
  } catch (error) { $('formError').textContent = error.message; }
};
for (const id of ['add', 'emptyAdd']) $(id).onclick = () => openEditor();
$('close').onclick = () => $('editor').close();
for (const id of ['weapon', 'query', 'commonFilter', 'weaponFilter', 'manualFilter', 'slotType', 'slotMin', 'sort']) $(id).addEventListener('input', render);
$('reset').onclick = () => {
  for (const id of ['query', 'commonFilter', 'weaponFilter', 'manualFilter', 'slotType']) $(id).value = '';
  $('slotMin').value = '0';
  $('sort').value = 'new';
  render();
};
$('all').onchange = () => {
  for (const {record} of visible()) $('all').checked ? selected.add(record.id) : selected.delete(record.id);
  render();
};
for (const [id, mode] of [['tag', 'add'], ['untag', 'remove']]) $(id).onclick = () => {
  tagMode = mode;
  $('tagForm').reset();
  $('tagTitle').textContent = mode === 'add' ? '수동 태그 일괄 추가' : '수동 태그 일괄 제거';
  $('tagDialog').showModal();
  $('bulkTag').focus();
};
$('tagCancel').onclick = () => $('tagDialog').close();
$('tagForm').onsubmit = event => {
  event.preventDefault();
  const tag = $('bulkTag').value.trim();
  if (!tag) return;
  const next = records.map(record => !selected.has(record.id) ? record : {...record,
    tags: tagMode === 'add' ? [...new Set([...record.tags, tag])] : record.tags.filter(item => item !== tag)});
  if (commit(next)) {
    $('tagDialog').close();
    announce('선택한 호석의 수동 태그를 변경했습니다.');
  }
};
$('delete').onclick = () => {
  if (confirm('선택한 호석 ' + selected.size + '개를 삭제할까요?')) {
    if (commit(records.filter(record => !selected.has(record.id)))) {
      selected.clear();
      render();
      announce('선택한 호석을 삭제했습니다.');
    }
  }
};
$('export').onclick = () => {
  const data = {format: BACKUP_FORMAT, inventoryVersion, rulesVersion, records, rules};
  const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], {type: 'application/json'}));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = '와일즈_호석_백업.json';
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  announce('호석과 자동 태그 기준을 함께 백업했습니다.');
};
$('restore').onclick = () => $('restoreFile').click();
$('restoreFile').onchange = async event => {
  const file = event.target.files[0];
  if (!file) return;
  try {
    const data = JSON.parse(await file.text());
    if (data.format !== LEGACY_KEY && data.format !== BACKUP_FORMAT) throw Error('지원하지 않는 백업 파일입니다.');
    const nextRecords = validateList(data.records);
    const nextRules = data.format === BACKUP_FORMAT ? TagRules.validateRules(data.rules, SKILL_NAMES) : rules;
    const ruleNotice = data.format === BACKUP_FORMAT ? ', 태그 기준 ' + nextRules.length + '개' : ' (기존 태그 기준 유지)';
    if (confirm('현재 데이터를 호석 ' + nextRecords.length + '개' + ruleNotice + '로 교체할까요?')) {
      if (commit(nextRecords, nextRules, !storageReady)) {
        selected.clear();
        render();
        announce('호석과 해당 백업의 태그 기준을 복원했습니다.');
      }
    }
  } catch (error) { announce('복원하지 못했습니다. 기존 데이터는 유지됩니다. ' + error.message); }
  event.target.value = '';
};

function renderRuleList() {
  $('rulesCurrent').textContent = '기준 버전 ' + rulesVersion + ' · 현재 기준 ' + rules.length + '개 · 활성 ' + rules.filter(rule => rule.active).length + '개';
  $('rulesList').replaceChildren();
  for (const rule of rules.slice(0, 30)) {
    const item = document.createElement('li');
    item.textContent = rule.id + ' · ' + rule.scope + ' · ' + rule.grade + ' · 순위 ' + rule.priority + (rule.active ? '' : ' · 비활성');
    $('rulesList').append(item);
  }
  if (rules.length > 30) {
    const item = document.createElement('li');
    item.textContent = '외 ' + (rules.length - 30) + '개';
    $('rulesList').append(item);
  }
}
function clearPreview() {
  pendingImport = null;
  $('rulesPreview').hidden = true;
  $('rulesApply').disabled = true;
}
function impactCount(candidate) {
  let changed = 0;
  for (const record of records) {
    const oldCommon = TagRules.evaluate(record, WEAPONS[0], rules).common.grade;
    const newCommon = TagRules.evaluate(record, WEAPONS[0], candidate).common.grade;
    if (oldCommon !== newCommon || WEAPONS.some(weapon => TagRules.evaluate(record, weapon, rules).weapon.grade !== TagRules.evaluate(record, weapon, candidate).weapon.grade)) changed++;
  }
  return changed;
}
function preparePreview() {
  clearPreview();
  $('rulesErrors').textContent = '';
  if (!uploadedRules) return;
  try {
    const candidate = TagRules.validateRules(TagRules.mergeRules(rules, uploadedRules, $('rulesMode').value), SKILL_NAMES);
    const old = new Map(rules.map(rule => [rule.id, JSON.stringify(rule)]));
    const next = new Map(candidate.map(rule => [rule.id, JSON.stringify(rule)]));
    const added = [...next.keys()].filter(id => !old.has(id)).length;
    const changed = [...next.keys()].filter(id => old.has(id) && old.get(id) !== next.get(id)).length;
    const removed = [...old.keys()].filter(id => !next.has(id)).length;
    $('rulesPreview').textContent = '적용 미리보기\n추가 ' + added + '개 · 변경 ' + changed + '개 · 삭제 ' + removed + '개\n자동 평가 태그가 달라지는 보유 호석 ' + impactCount(candidate) + '개 / 전체 ' + records.length + '개\n수동 태그와 메모는 유지됩니다. 게임 내 생성 가능 여부는 아직 검증하지 않습니다.';
    $('rulesPreview').hidden = false;
    $('rulesApply').disabled = false;
    pendingImport = {rules: candidate, snapshot: stateRaw};
  } catch (error) { $('rulesErrors').textContent = error.message; }
}
$('rulesNav').onclick = () => {
  uploadedRules = null;
  $('rulesFile').value = '';
  $('rulesErrors').textContent = '';
  clearPreview();
  renderRuleList();
  $('rulesDialog').showModal();
};
$('rulesClose').onclick = $('rulesCancel').onclick = () => $('rulesDialog').close();
$('rulesMode').onchange = preparePreview;
$('rulesFile').onchange = async event => {
  clearPreview();
  uploadedRules = null;
  $('rulesErrors').textContent = '';
  const file = event.target.files[0];
  if (!file) return;
  try {
    const result = await XlsxRules.parseFile(file, SKILL_NAMES);
    if (result.errors.length) {
      $('rulesErrors').textContent = result.errors.slice(0, 20).join('\n') + (result.errors.length > 20 ? '\n외 ' + (result.errors.length - 20) + '개 오류' : '');
      return;
    }
    uploadedRules = result.rules;
    preparePreview();
  } catch (error) { $('rulesErrors').textContent = error.message; }
};
$('rulesApply').onclick = () => {
  if (!pendingImport) return;
  if (localStorage.getItem(STATE_KEY) !== pendingImport.snapshot) {
    readState();
    render();
    clearPreview();
    $('rulesErrors').textContent = '다른 탭에서 데이터가 변경됐습니다. 기준 파일을 다시 선택해 미리보기를 갱신하세요.';
    return;
  }
  if (commit(records, pendingImport.rules)) {
    $('rulesDialog').close();
    pendingImport = null;
    announce('태그 기준을 적용하고 보유 호석의 자동 평가를 갱신했습니다.');
  }
};

window.addEventListener('storage', event => {
  if (event.key !== STATE_KEY) return;
  readState();
  selected.clear();
  render();
  announce('다른 탭의 데이터 변경을 반영했습니다.');
});
render();
