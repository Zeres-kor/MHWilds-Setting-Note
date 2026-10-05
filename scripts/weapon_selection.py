"""Select crafting tree leaves and unique Artian skill/slot configurations."""
import json

def select_weapons(weapons):
    parents = {w['crafting']['previous']['id'] for w in weapons if w['crafting'].get('previous')}
    result, artian = [], {}
    for w in weapons:
        is_artian = w.get('series') is None
        if not is_artian and (w['id'] in parents or w['crafting']['branches']):
            continue
        if is_artian:
            # Damage, element and sharpness variants are outside this skill solver.
            key = json.dumps([w['kind'], w['name'], w['rarity'], w['slots'], w['defenseBonus'],
                              sorted((s['skill']['id'], s['level']) for s in w['skills'])], ensure_ascii=False)
            if key in artian:
                artian[key]['sourceIds'].append(w['id'])
                continue
        entry = {'weapon':w, 'category':'artian' if is_artian else 'crafted-final', 'sourceIds':[w['id']]}
        result.append(entry)
        if is_artian:
            artian[key] = entry
    return result
