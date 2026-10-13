"""Normalize fixed MHDB charms, including upgrade ranks (not random charms)."""
def crafted_charms(rows, skills):
    names = {s['id']: s['name'] for s in skills}
    return [{'id': r['id'], 'name': r['name'], 'rarity': r['rarity'],
             'category': 'crafted', 'skills': [{'name': names[s['skill']['id']], 'level': s['level']} for s in r['skills']],
             'weaponSlots': [], 'armorSlots': []}
            for c in rows if not c['random'] for r in c['ranks']
            if all(s['skill']['id'] in names for s in r['skills'])]
