"""Cache factual MHDB API fields needed by the local solver. No upstream code/assets."""
import datetime
import hashlib
import json
import urllib.request
from pathlib import Path
from weapon_selection import select_weapons

ROOT = Path(__file__).resolve().parent.parent
BASE = 'https://wilds.mhdb.io/'
def download(route):
    request = urllib.request.Request(BASE + route, headers={'User-Agent':'WildsInventory/1.0 (local data snapshot)'})
    with urllib.request.urlopen(request, timeout=45) as response:
        raw = response.read()
    return json.loads(raw), hashlib.sha256(raw).hexdigest()

version, _ = download('version')
raw = {}
hashes = {}
for kind in ['skills', 'armor', 'weapons', 'decorations']:
    raw[kind], hashes[kind] = download('ko/' + kind)
end_version, _ = download('version')
assert version == end_version, 'API updated during snapshot; retry to capture a consistent import version.'
skills = []
for s in raw['skills']:
    skills.append({'id':s['id'], 'name':s['name'], 'kind':s['kind'],
                   'maxLevel':max(r['level'] for r in s['ranks']),
                   'ranks':[{'level':r['level'], 'name':r['name'], 'pieces':r['setPiecesRequired']} for r in s['ranks']]})
skill_map = {s['id']:s for s in skills}
def abilities(entries):
    normal, bonuses = {}, set()
    for entry in entries:
        sid = entry['skill']['id']
        assert sid in skill_map
        if skill_map[sid]['kind'] in ['set', 'group']:
            bonuses.add(sid)
        else:
            normal[str(sid)] = normal.get(str(sid), 0) + entry['level']
    return {'skills':normal, 'bonuses':sorted(bonuses)}
def slots(a):
    values = a['slots']
    assert len(values) <= 3 and all(isinstance(v,int) and 1 <= v <= 3 for v in values)
    return values
armor = [{'id':a['id'], 'name':a['name'], 'part':a['kind'], 'rank':a['rank'], 'rarity':a['rarity'],
          'slots':slots(a), 'defense':a['defense']['max'], **abilities(a['skills'])} for a in raw['armor']]
# Artian rows are series-less in this API snapshot. Keep skill/slot-equivalent variants once.
selected_weapons = select_weapons(raw['weapons'])
weapons = [{'id':entry['weapon']['id'], 'name':entry['weapon']['name'],
            'kind':entry['weapon']['kind'], 'rarity':entry['weapon']['rarity'],
            'slots':slots(entry['weapon']), 'defenseBonus':entry['weapon']['defenseBonus'],
            'category':entry['category'], 'sourceIds':entry['sourceIds'],
            **abilities(entry['weapon']['skills'])} for entry in selected_weapons]
decorations = [{'id':a['id'], 'name':a['name'], 'kind':a['kind'], 'slot':a['slot'],
                **abilities(a['skills'])} for a in raw['decorations']]
assert all(a['part'] in ['head','chest','arms','waist','legs'] for a in armor)
assert all(a['kind'] in ['weapon','armor'] and 1 <= a['slot'] <= 3 and not a['bonuses'] for a in decorations)
result = {'format':'mhwilds-equipment-v1', 'source':'Monster Hunter Wilds DB (MHDB)',
          'sourceUrl':'https://docs.wilds.mhdb.io', 'apiImportVersion':version['version'],
          'gameVersion':None, 'retrievedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),
          'sourceUrls':{kind:BASE+'ko/'+kind for kind in raw}, 'sourceSha256':hashes,
          'excludedWeapons':len(raw['weapons'])-len(weapons),
          'limitations':['API import timestamp is not the Capcom game version.',
                         'Only crafting tree leaves and Artian base skill/slot configurations are selectable; rolled bonuses are not modeled.',
                         'Decorations are assumed freely available; owned decoration quantities are not modeled.'],
          'skills':skills, 'armor':armor, 'weapons':weapons, 'decorations':decorations}
output = ROOT / 'prototype/data/equipment-snapshot.json'
output.write_text(json.dumps(result, ensure_ascii=False, separators=(',',':'))+'\n')
print({kind:len(result[kind]) for kind in ['skills','armor','weapons','decorations']}, result['apiImportVersion'], 'excluded weapons',result['excludedWeapons'])
