'use strict';

const XlsxRules = (() => {
  const decoder = new TextDecoder('utf-8', {fatal:true});
  const MAX_ZIP_BYTES = 2 * 1024 * 1024;
  const MAX_XML_BYTES = 8 * 1024 * 1024;
  const MAX_ROWS = 10001;

  function xml(bytes, name) {
    if (!bytes) throw Error(`${name} 파일이 엑셀에 없습니다.`);
    const doc = new DOMParser().parseFromString(decoder.decode(bytes), 'application/xml');
    if (doc.documentElement.localName === 'parsererror' || doc.getElementsByTagName('parsererror').length) throw Error(`${name} XML을 읽을 수 없습니다.`);
    return doc;
  }

  const elements = (node, localName) => [...node.getElementsByTagNameNS('*', localName)];
  const firstText = (node, localName) => elements(node, localName)[0]?.textContent ?? '';

  function workbookRows(bytes) {
    if (bytes.byteLength > MAX_ZIP_BYTES) throw Error('엑셀 파일은 2MB 이하만 업로드할 수 있습니다.');
    let total = 0, count = 0;
    let archive;
    try {
      archive = fflate.unzipSync(bytes, {filter(file) {
        if (++count > 1000) throw Error('엑셀 내부 파일 수가 너무 많습니다.');
        const wanted = file.name === 'xl/workbook.xml' || file.name === 'xl/_rels/workbook.xml.rels' || file.name === 'xl/sharedStrings.xml' || /^xl\/worksheets\/[^/]+\.xml$/.test(file.name);
        if (wanted) {
          total += file.originalSize;
          if (file.originalSize > MAX_XML_BYTES || total > MAX_XML_BYTES * 2) throw Error('엑셀 내부 데이터가 너무 큽니다.');
        }
        return wanted;
      }});
    } catch (error) { throw Error(`엑셀 압축을 읽지 못했습니다. ${error.message}`); }
    const book = xml(archive['xl/workbook.xml'], 'xl/workbook.xml');
    const sheet = elements(book, 'sheet').find(item => item.getAttribute('name') === '태그기준');
    if (!sheet) throw Error('태그기준 시트가 없습니다.');
    const relationId = sheet.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships', 'id');
    const rels = xml(archive['xl/_rels/workbook.xml.rels'], 'xl/_rels/workbook.xml.rels');
    const relation = elements(rels, 'Relationship').find(item => item.getAttribute('Id') === relationId);
    if (!relation || relation.getAttribute('TargetMode') === 'External') throw Error('태그기준 시트 경로가 올바르지 않습니다.');
    const target = relation.getAttribute('Target') || '';
    const path = new URL(target, 'https://workbook.local/xl/').pathname.slice(1);
    if (!/^xl\/worksheets\/[^/]+\.xml$/.test(path)) throw Error('태그기준 시트 경로가 올바르지 않습니다.');
    const sheetXml = xml(archive[path], path);
    const strings = archive['xl/sharedStrings.xml'] ? elements(xml(archive['xl/sharedStrings.xml'], 'xl/sharedStrings.xml'), 'si').map(item => elements(item, 't').map(t => t.textContent).join('')) : [];
    const rows = [];
    for (const row of elements(sheetXml, 'row')) {
      const number = Number(row.getAttribute('r'));
      if (!Number.isSafeInteger(number) || number < 1 || number > MAX_ROWS) throw Error('태그기준 시트의 행 번호가 올바르지 않습니다.');
      const values = [];
      for (const cell of elements(row, 'c')) {
        const address = cell.getAttribute('r') || '';
        const letters = address.match(/^([A-Z]+)[1-9]\d*$/)?.[1];
        if (!letters) throw Error(`태그기준!${number}행: 셀 주소가 올바르지 않습니다.`);
        const column = [...letters].reduce((n, letter) => n * 26 + letter.charCodeAt(0) - 64, 0) - 1;
        if (column > 63) {
          if (firstText(cell, 'v') || firstText(cell, 't')) throw Error(`태그기준!${number}행: 사용 가능한 열 범위를 벗어났습니다.`);
          continue;
        }
        if (elements(cell, 'f').length) throw Error(`태그기준!${number}행 · ${letters}: 수식 대신 값을 입력하세요.`);
        const kind = cell.getAttribute('t');
        let value = '';
        if (kind === 'inlineStr') value = elements(cell, 't').map(item => item.textContent).join('');
        else if (kind === 's') {
          const index = Number(firstText(cell, 'v'));
          if (!Number.isSafeInteger(index) || index < 0 || index >= strings.length) throw Error(`태그기준!${number}행 · ${letters}: 공유 문자열을 읽을 수 없습니다.`);
          value = strings[index];
        } else if (kind === 'e') throw Error(`태그기준!${number}행 · ${letters}: 엑셀 오류 셀이 있습니다.`);
        else value = firstText(cell, 'v');
        values[column] = value;
      }
      rows[number - 1] = values;
    }
    return rows;
  }

  async function parseFile(file, knownNames) {
    if (!file.name.toLowerCase().endsWith('.xlsx')) throw Error('.xlsx 파일을 선택하세요.');
    if (file.size > MAX_ZIP_BYTES) throw Error('엑셀 파일은 2MB 이하만 업로드할 수 있습니다.');
    const rows = workbookRows(new Uint8Array(await file.arrayBuffer()));
    return TagRules.parseRows(rows, knownNames);
  }

  return {workbookRows, parseFile};
})();
