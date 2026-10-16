'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const icons=require('../prototype/game-icons.js');
test('장식주 선택과 장착 표시는 원본 슬롯 크기와 저장 스냅샷 크기 모두 같은 아이콘을 사용한다',()=>{
 for(const [name,kind,required] of [['가호주【1】','armor',1],['공격주Ⅱ【2】','weapon',2]]){
  for(let size=required;size<=3;size++){
   const saved=icons.decoration({kind,size,decoration:{name,required}});
   assert.ok(saved);
   assert.equal(icons.decoration({kind,size,decoration:{name,slot:required}}),saved);
  }
 }
 assert.equal(icons.decoration({kind:'armor',size:3,decoration:{name:'가호주【1】',slot:2}}),null);
});
