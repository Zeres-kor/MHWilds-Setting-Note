// Read a private export locally; print aggregate counts, never compositions.
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const Import = require('../prototype/inventory-import.js');
const Candidates = require('../prototype/talisman-candidates.js');
const data = require('../prototype/data/talisman-recipes.json');
const args = process.argv.slice(2);
if (args.length !== 1) {
  console.error('Usage: node scripts/audit_talisman_export.cjs /path/to/Exported_Talismans.txt');
  process.exitCode = 1;
} else {
  try {
    const contents = fs.readFileSync(path.resolve(args[0]), 'utf8');
    const names = [...new Set(Object.values(data.groups).flat().map(s => s.name))];
    const rows = Import.parseText(contents, 'txt', names);
    const counts = {rows:rows.length, matched:0, invalid:0, unknownSkillLevel:0, duplicateSkill:0, groupMismatch:0, slotMismatch:0};
    const reasons = {'unknown-skill-level':'unknownSkillLevel','duplicate-skill':'duplicateSkill','group-mismatch':'groupMismatch','slot-mismatch':'slotMismatch','invalid-record':'invalid','matched':'matched'};
    for (const row of rows) {
      if (row.errors.length) { counts.invalid++; continue; }
      counts[reasons[Candidates.matchRecord(data,row.record).reason]]++;
    }
    console.log(JSON.stringify({scope:'Workbook plus documented community corrections; not game legality validation', ...counts}, null, 2));
    if (counts.invalid) process.exitCode = 1;
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
