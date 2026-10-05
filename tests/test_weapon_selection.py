import unittest
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'scripts'))
from weapon_selection import select_weapons

def weapon(wid, previous=None, branches=None, artian=False, name=None, slots=None):
    return {'id':wid,'name':name or str(wid),'kind':'long-sword','rarity':8,'slots':slots or [3,3,3],
            'defenseBonus':0,'skills':[], 'series':None if artian else {'id':1},
            'crafting':{'previous':{'id':previous} if previous else None,'branches':branches or []}}

class WeaponSelection(unittest.TestCase):
    def test_keeps_each_branch_leaf_and_standalone_crafted_weapon(self):
        rows=[weapon(1,branches=[{'id':2},{'id':3}]),weapon(2,previous=1),weapon(3,previous=1),weapon(4)]
        self.assertEqual([e['weapon']['id'] for e in select_weapons(rows)], [2,3,4])
    def test_child_reference_excludes_parent_even_if_branch_list_is_empty(self):
        self.assertEqual([e['weapon']['id'] for e in select_weapons([weapon(1),weapon(2,previous=1)])],[2])
    def test_artian_duplicate_variants_merge_but_different_slots_remain(self):
        rows=[weapon(1,artian=True,name='아티어'),weapon(2,artian=True,name='아티어'),weapon(3,artian=True,name='아티어',slots=[2,2,2])]
        entries=select_weapons(rows)
        self.assertEqual(len(entries),2)
        self.assertEqual(entries[0]['sourceIds'],[1,2])
        self.assertTrue(all(e['category']=='artian' for e in entries))

if __name__=='__main__': unittest.main()
