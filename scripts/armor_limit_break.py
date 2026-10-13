"""Attach reviewed factual limit-break slot data to the base MHDB snapshot."""
def attach_limit_break(armor, supplement):
    rows = {entry['id']: entry for entry in supplement['armor']}
    for item in armor:
        if item['rank'] != 'high' or item['rarity'] not in (5, 6):
            continue
        row = rows[item['id']]
        assert row['name'] == item['name'], 'Limit-break armor name changed; review supplement.'
        assert row['baseSlots'] == item['slots'], 'Base slots changed; review limit-break supplement.'
        assert len(row['slots']) <= 3 and all(type(n) is int and 1 <= n <= 3 for n in row['slots'])
        item['limitBreakSlots'] = row['slots'][:]
    return armor
