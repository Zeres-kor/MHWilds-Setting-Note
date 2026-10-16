const{test}=require('node:test'),assert=require('node:assert/strict'),D=require('../prototype/inventory-display.js');
test('없는 슬롯 종류를 숨기고 남은 슬롯은 하이픈으로 표시한다',()=>{assert.equal(D.slots({weaponSlots:[],armorSlots:[2,1]}),'방어구 2-1');assert.equal(D.slots({weaponSlots:[1],armorSlots:[1,1]}),'무기 1 - 방어구 1-1');assert.equal(D.slots({weaponSlots:[],armorSlots:[]}),'');});
test('원본 레어도와 규칙 기준 레어도를 구분하고 미확인을 임의로 채우지 않는다',()=>{const data=require('../prototype/data/talisman-recipes.json'),r={skills:[{name:'공격',level:3},{name:'도전자',level:1}],weaponSlots:[1],armorSlots:[1,1]};assert.equal(D.rarity(r,data),'규칙 RARE 8');assert.equal(D.rarity({...r,rarity:7},data),'RARE 7');assert.equal(D.rarity(r,null),'RARE 미확인');});

test('레어도가 확인되면 해당 호석 색상 이미지를 쓰고 미확인은 기본 이미지를 쓴다',()=>{assert.equal(D.rarityIcon({rarity:7},null),'assets/game-icons/talismans/framed/rarity_07.png');assert.equal(D.rarityIcon({skills:[],weaponSlots:[],armorSlots:[]},null),'assets/game-icons/equipment_framed/talisman.png');});
