'use strict';
(() => {
  const el = id => document.getElementById(id);
  let worker = null, generation = 0, snapshotVersion = null, snapshotRows = [];
  const version = state => state.inventoryVersion + ':' + state.rulesVersion;
  for (const name of TagRules.WEAPONS) el('candidateWeapon').add(new Option(name, name));
  for (const id of ['candidateCommonGrade', 'candidateWeaponGrade']) {
    el(id).add(new Option('전체', ''));
    for (const grade of [...TagRules.GRADES, '미분류']) el(id).add(new Option(grade, grade));
  }
  function stop() {
    generation++;
    worker?.terminate(); worker = null;
    el('candidateStart').disabled = false;
    el('candidateCancel').disabled = true;
  }
  function clear(message) {
    stop(); snapshotVersion = null; snapshotRows = [];
    el('candidateRows').replaceChildren();
    el('candidateResults').hidden = true;
    el('candidateError').textContent = '';
    el('candidateStatus').textContent = message;
  }
  el('candidateDialog').addEventListener('page-enter', () => {
    const weapon = document.getElementById('weapon').value;
    if (el('candidateWeapon').value !== weapon) clear('평가할 무기가 변경됐습니다. 다시 검색하세요.');
    el('candidateWeapon').value = weapon;
  });
  el('candidateDialog').addEventListener('page-leave', () => {
    if (worker) clear('검색이 취소됐습니다. 조건을 확인하고 다시 검색하세요.');
  });
  el('candidateCancel').onclick = () => clear('검색이 취소됐습니다.');
  el('candidateForm').addEventListener('input', () => clear('조건이 변경됐습니다. 다시 검색하세요.'));
  el('candidateForm').addEventListener('change', () => clear('조건이 변경됐습니다. 다시 검색하세요.'));
  document.addEventListener('inventory-state-changed', () => {
    if (snapshotVersion !== null && snapshotVersion !== version(CandidateContext.get())) clear('보유 호석 또는 태그 기준이 변경됐습니다. 최신 데이터로 다시 검색하세요.');
  });
  const readSlots = id => {
    const text = el(id).value.trim();
    if (!text) return [];
    if (!/^[1-3](?:\s*,\s*[1-3]){0,2}$/.test(text)) throw Error('슬롯은 1~3 크기를 쉼표로 구분해 최대 3개 입력하세요.');
    return text.split(',').map(Number);
  };
  function showRows(rows) {
    const fragment = document.createDocumentFragment();
    for (const row of rows) {
      const tr = document.createElement('tr');
      for (const text of [row.skills.map(s => s.name + ' Lv.' + s.level).join(' / '),
        '무기 ' + (row.weaponSlots.join('·') || '—') + ' / 방어구 ' + (row.armorSlots.join('·') || '—'),
        row.rarities.join(', ') + ' / No ' + row.recipeIds.join(', '),
        row.evaluation.common.grade, row.evaluation.weapon.grade,
        row.owned ? '보유 ' + row.owned + '개' : '미보유']) {
        const td = document.createElement('td'); td.textContent = text; tr.append(td);
      }
      fragment.append(tr);
    }
    el('candidateRows').replaceChildren(fragment);
  }
  el('candidateForm').onsubmit = event => {
    event.preventDefault(); clear('호석 후보를 검색하고 있습니다…');
    try {
      const skills = [1,2,3].map(n => ({name:TagRules.cleanSkill(el('candidateSkill' + n).value), level:Number(el('candidateLevel' + n).value)})).filter(s => s.name);
      if (!skills.length) throw Error('스킬 조건을 하나 이상 입력하세요.');
      const state = CandidateContext.get(); snapshotVersion = version(state);
      const request = {query:{skills, rarity:Number(el('candidateRarity').value), weaponSlots:readSlots('candidateWeaponSlots'), armorSlots:readSlots('candidateArmorSlots')},
        weapon:el('candidateWeapon').value, commonGrade:el('candidateCommonGrade').value, weaponGrade:el('candidateWeaponGrade').value,
        records:state.records, rules:state.rules};
      worker = new Worker('candidate-worker.js');
      const current = generation;
      el('candidateStart').disabled = true; el('candidateCancel').disabled = false;
      worker.onmessage = ({data}) => {
        if (generation !== current) return;
        if (data.kind === 'progress') {
          el('candidateStatus').textContent = data.examined.toLocaleString() + '개 스킬 배정 확인 · 조건 일치 구성 ' + data.count.toLocaleString() + '개';
        } else if (data.kind === 'complete') {
          snapshotRows = data.rows;
          showRows(snapshotRows); el('candidateResults').hidden = false;
          el('candidateStatus').textContent = (data.truncated ? '제한 도달 · 부분 검색: 최소 ' : '규칙 기준 검색 완료: ') + data.count.toLocaleString() + '개 구성 · ' + data.rows.length + '개 표시' + (data.count === 0 ? ' · 조건을 줄여보세요.' : '') + (data.truncated ? ' · 레어도와 스킬 조건을 더 지정하세요.' : '');
          stop();
        } else if (data.kind === 'error') {
          el('candidateError').textContent = data.message; el('candidateStatus').textContent = '검색하지 못했습니다.'; stop();
        }
      };
      worker.onerror = () => {
        if (generation !== current) return;
        el('candidateError').textContent = '검색 파일을 실행하지 못했습니다. 웹사이트로 접속한 뒤 다시 시도하세요.';
        el('candidateStatus').textContent = '검색하지 못했습니다.'; stop();
      };
      worker.postMessage(request);
    } catch (error) { stop(); el('candidateError').textContent = error.message; el('candidateStatus').textContent = '검색 조건을 확인하세요.'; }
  };
})();
