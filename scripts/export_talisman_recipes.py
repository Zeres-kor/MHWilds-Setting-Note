"""Export the user-provided workbook, without claiming game-rule validity."""
import hashlib
import json
import re
from pathlib import Path
import openpyxl

ROOT = Path(__file__).resolve().parent.parent
source = ROOT / 'inputs/호석테이블.xlsx'
w = openpyxl.load_workbook(source, data_only=True)
aliases = {'발도술[기]': '발도술【기】', '발도술[힘]': '발도술【힘】',
           '회심격[속성]': '회심격【속성】', '회심격[특수]': '회심격【특수】', '양심': '앙심'}
groups = {}
for n in range(1, 11):
    entries = []
    for name, level in list(w[f'그룹{n}'].values)[1:]:
        if name is None:
            continue
        assert isinstance(name, str) and int(level) == level and 1 <= level <= 10
        entries.append({'name': aliases.get(name.strip(), name.strip()), 'level': int(level)})
    groups[str(n)] = entries
recipes = []
for row in list(w['0_슬롯표'].values)[1:]:
    if not isinstance(row[0], (int, float)):
        continue
    number, rarity, *rest = row
    ids = [int(v) for v in rest[:3] if isinstance(v, (int, float))]
    assert len(ids) in (2, 3) and all(str(n) in groups for n in ids)
    slots = []
    for combo in re.findall(r'\[([^\]]+)\]', rest[3]):
        weapon, armor = [], []
        for token in combo.split(','):
            token = token.strip()
            size = int(token.removeprefix('W'))
            assert 0 <= size <= 3
            if size:
                (weapon if token.startswith('W') else armor).append(size)
        slots.append({'weaponSlots': sorted(weapon, reverse=True), 'armorSlots': sorted(armor, reverse=True)})
    assert slots
    recipes.append({'id': int(number), 'rarity': int(re.search(r'\d+', rarity).group()), 'groups': ids, 'slots': slots})
assert len(recipes) == 29
raw = sum(__import__('math').prod(len(groups[str(g)]) for g in r['groups']) for r in recipes)
result = {'format': 'mhwilds-workbook-recipes-v1', 'source': '호석테이블.xlsx',
          'sourceSha256': hashlib.sha256(source.read_bytes()).hexdigest(),
          'verifiedInGame': False, 'duplicateSkillPolicy': 'exclude-unverified',
          'slotInterpretation': 'Wn=weapon; n=armor; 0=empty (workbook interpretation)',
          'rawSkillAssignments': raw, 'rawAssignmentsWithSlots': sum(__import__('math').prod(len(groups[str(g)]) for g in r['groups']) * len(r['slots']) for r in recipes), 'groups': groups, 'recipes': recipes}
output = ROOT / 'prototype/data/talisman-recipes.json'
output.parent.mkdir(parents=True, exist_ok=True)
output.write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
print(f'Exported {len(recipes)} recipes, {raw:,} raw skill assignments (not unique/game-valid talismans).')
