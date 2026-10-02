'use strict';

const InventoryImport = (() => {
  const rulesApi = typeof module !== 'undefined' && module.exports ? require('./tag-rules.js') : TagRules;
  const HEADERS = ['스킬1','레벨1','스킬2','레벨2','스킬3','레벨3',
    '방어구슬롯1','방어구슬롯2','방어구슬롯3','무기슬롯1','무기슬롯2','무기슬롯3'];
  const LIMIT = 500;
  const MAX_CHARS = 256000;
  const clean = value => rulesApi.clean(value);

  function splitCsv(line) {
    const result = [];
    let field = '', quoted = false, closed = false;
    for (let i = 0; i < line.length; i++) {
      const character = line[i];
      if (quoted) {
        if (character === '"' && line[i + 1] === '"') { field += '"'; i++; }
        else if (character === '"') { quoted = false; closed = true; }
        else field += character;
      } else if (character === ',') {
        result.push(field);
        field = '';
        closed = false;
      } else if (character === '"' && !field && !closed) quoted = true;
      else if (character === '"' || (closed && character.trim())) throw Error('따옴표 형식이 잘못됐습니다.');
      else field += character;
    }
    if (quoted) throw Error('닫히지 않은 따옴표가 있습니다.');
    result.push(field);
    return result;
  }

  function parseText(text, source, knownNames) {
    if (source !== 'paste' && source !== 'txt') throw Error('가져오기 형식을 선택하세요.');
    if (typeof text !== 'string' || text.length > MAX_CHARS) throw Error('입력은 256,000자 이하만 처리할 수 있습니다.');
    const lines = text.replace(/^\uFEFF/, '').split(/\r\n|\n|\r/);
    const nonblank = lines.map((content, index) => ({number:index + 1, content})).filter(line => line.content.trim());
    if (!nonblank.length) throw Error('가져올 행이 없습니다.');
    const delimiter = source === 'txt' ? ',' : nonblank[0].content.includes('\t') ? '\t' : ',';
    const split = line => delimiter === '\t' ? line.split('\t') : splitCsv(line);
    let start = 0;
    if (source === 'paste') {
      const first = split(nonblank[0].content).map(clean);
      if (first.length === 13 && !first[12]) first.pop();
      if (first[0] === '스킬1' || first.includes('방어구슬롯1')) {
        const expected = [...HEADERS, ...(first.length === 13 ? ['메모'] : [])];
        if (first.length !== expected.length || first.some((name, index) => name !== expected[index])) throw Error('헤더는 안내된 열 순서와 이름을 사용하세요.');
        start = 1;
      }
    }
    if (nonblank.length - start > LIMIT) throw Error('한 번에 최대 500행까지 가져올 수 있습니다.');
    if (nonblank.length === start) throw Error('헤더 아래에 데이터 행을 입력하세요.');
    const known = new Set(knownNames.map(clean));
    const rows = [];
    for (const line of nonblank.slice(start)) {
      const errors = [], warnings = [];
      let cells;
      try { cells = split(line.content).map(value => value.trim()); }
      catch (error) { rows.push({number:line.number, record:null, errors:[error.message], warnings}); continue; }
      if (cells.length !== 12 && !(source === 'paste' && cells.length === 13)) {
        rows.push({number:line.number, record:null, errors:['12열' + (source === 'paste' ? ' 또는 메모를 포함한 13열' : '') + '이 필요합니다. 현재 ' + cells.length + '열입니다.'], warnings});
        continue;
      }
      const skills = [], names = new Set();
      for (let index = 0; index < 3; index++) {
        const name = clean(cells[index * 2]), levelText = cells[index * 2 + 1];
        const level = levelText === '' ? 0 : Number(levelText);
        if (!name && level === 0) continue;
        if (!name) { errors.push('스킬' + (index + 1) + ' 이름이 없습니다.'); continue; }
        if (!Number.isSafeInteger(level) || level < 1 || level > 10) errors.push('레벨' + (index + 1) + '은 1~10 정수여야 합니다.');
        if (!known.has(name)) warnings.push('스킬' + (index + 1) + ' "' + name + '"은 제공된 스킬 표에 없습니다. 확인 후 선택하세요.');
        if (names.has(name)) errors.push('스킬 "' + name + '"이 중복됐습니다.');
        names.add(name);
        if (Number.isSafeInteger(level) && level >= 1 && level <= 10) skills.push({name, level});
      }
      if (!skills.length) errors.push('스킬을 하나 이상 입력하세요.');
      const readSlots = (from, prefix) => {
        const slots = [];
        for (let index = 0; index < 3; index++) {
          const raw = cells[from + index], size = raw === '' ? 0 : Number(raw);
          if (!Number.isSafeInteger(size) || size < 0 || size > 3) errors.push(prefix + '슬롯' + (index + 1) + '은 0~3 정수여야 합니다.');
          else if (size) slots.push(size);
        }
        return slots.sort((a, b) => b - a);
      };
      const armorSlots = readSlots(6, '방어구'), weaponSlots = readSlots(9, '무기');
      rows.push({number:line.number, errors, warnings, record:errors.length ? null : {
        skills, armorSlots, weaponSlots, memo:source === 'paste' && cells.length === 13 ? cells[12] : '', tags:[]}});
    }
    return rows;
  }

  function fingerprint(record) {
    return JSON.stringify([
      record.skills.map(skill => [clean(skill.name), skill.level]).sort((a, b) => a[0].localeCompare(b[0]) || a[1] - b[1]),
      [...record.armorSlots].sort((a, b) => b - a),
      [...record.weaponSlots].sort((a, b) => b - a),
    ]);
  }

  function analyze(rows, existing) {
    const saved = new Set(existing.map(fingerprint)), seen = new Set();
    return rows.map(row => {
      if (!row.record) return {...row, duplicate:null};
      const key = fingerprint(row.record);
      const duplicate = saved.has(key) ? 'existing' : seen.has(key) ? 'batch' : null;
      seen.add(key);
      return {...row, duplicate};
    });
  }

  return {HEADERS, parseText, fingerprint, analyze};
})();

if (typeof module !== 'undefined') module.exports = InventoryImport;
