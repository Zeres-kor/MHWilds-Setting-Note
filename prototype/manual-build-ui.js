'use strict';
(()=>{
 const $=id=>document.getElementById(id),page=$('manualPage'),parts={weapon:'무기',head:'머리',chest:'상의',arms:'팔',waist:'허리',legs:'다리',talisman:'호석'};
 const types={'great-sword':'대검','long-sword':'태도','sword-shield':'한손검','dual-blades':'쌍검',hammer:'해머','hunting-horn':'수렵피리',lance:'랜스',gunlance:'건랜스','switch-axe':'슬래시액스','charge-blade':'차지액스','insect-glaive':'조충곤','light-bowgun':'라이트보우건','heavy-bowgun':'헤비보우건',bow:'활'};
 const key='mhwilds-manual-build-v1', fields={}, jewels=new Map();let data,loading=false,charms=[],restoring=false,recordsVersion=null;
 const text=(parent,tag,value)=>{const el=document.createElement(tag);el.textContent=value;parent.append(el);return el;};
 const option=(parent,value,label)=>{const o=text(parent,'option',label);o.value=value;};
 function field(parent,label,id,tag='select'){const wrap=text(parent,'label',label),input=document.createElement(tag);input.id=id;wrap.append(input);return input;}
 function pool(part){if(part==='weapon')return data.weapons.filter(w=>w.kind===$('manualType').value);if(part==='talisman')return charms;return data.armor.filter(a=>a.part===part&&a.rank==='high').map(a=>ArmorLimitBreak.apply(a,$('manualLimitBreak').value==='on'));}
 function skills(item){return (Array.isArray(item.skills)?item.skills.map(s=>`${s.name} Lv.${s.level}`):Object.entries(item.skills).map(([id,n])=>`${data.skills.find(s=>s.id===Number(id))?.name||id} Lv.${n}`)).concat((item.bonuses||[]).map(id=>data.skills.find(s=>s.id===id)?.name||'')).join(' / ');}
 function refresh(part){const f=fields[part],previous=f.select.value,query=f.query.value.replace(/\s/g,'').toLocaleLowerCase('ko');f.select.replaceChildren();option(f.select,'',part==='talisman'?'호석 사용 안 함':'선택하세요');const items=pool(part).filter(a=>a.key===previous||String(a.id)===previous||`${a.name} ${skills(a)}`.replace(/\s/g,'').toLocaleLowerCase('ko').includes(query)).sort((a,b)=>(b.rarity||0)-(a.rarity||0)||a.name.localeCompare(b.name,'ko'));if(part==='talisman'){for(const [prefix,label]of [['crafted:','제작 호석'],['owned:','보유 호석']]){const group=document.createElement('optgroup');group.label=label;for(const a of items.filter(a=>a.key.startsWith(prefix)))option(group,a.key,`${a.name} · ${skills(a)||'기본 스킬 없음'}`);if(group.children.length)f.select.append(group);}}else for(const a of items)option(f.select,a.key||a.id,`${a.name} · ${skills(a)||'기본 스킬 없음'}`);f.select.value=[...f.select.options].some(o=>o.value===previous)?previous:'';}
 function selected(part){const value=fields[part].select.value;return pool(part).find(a=>(a.key||String(a.id))===value)||null;}
 function refreshCharms(){recordsVersion=CandidateContext.get().inventoryVersion;charms=[...(data.craftedCharms||[]).map(c=>({...c,key:'crafted:'+c.id})),...CandidateContext.get().records.map(c=>({...c,key:'owned:'+c.id,name:c.name||'보유 호석'}))];refresh('talisman');}
 function persist(){if(restoring)return;try{localStorage.setItem(key,JSON.stringify({version:1,limitBreak:$('manualLimitBreak').value,type:$('manualType').value,equipment:Object.fromEntries(Object.entries(fields).map(([part,f])=>[part,f.select.value])),series:$('manualSeries').value,group:$('manualGroup').value,jewels:[...jewels]}));$('manualStatus').textContent='선택한 장비와 장식주는 이 브라우저에 자동 저장됩니다.';}catch{$('manualStatus').textContent='선택을 자동 저장하지 못했습니다. 브라우저 저장 공간·설정을 확인하세요.';}}
 function slots(){const out=[];for(const part of Object.keys(parts)){const item=selected(part);if(!item)continue;const kinds=part==='talisman'?['weapon','armor']:[part==='weapon'?'weapon':'armor'];for(const kind of kinds){const sizes=part==='talisman'?item[kind+'Slots']:item.slots;sizes.forEach((size,index)=>out.push({owner:part,kind,size,index,key:`${part}:${kind}:${index}`}));}}return out;}
 function syncBonuses(){const gog=WeaponBonuses.gogIds.has(selected('weapon')?.id);for(const id of ['manualSeries','manualGroup']){if(!gog)$(id).value='0';$(id).disabled=!gog;}}
 // Close only when the gesture starts and ends on the backdrop, never on dialog padding or a drag from its contents.
 function dismissOnBackdrop(dialog){
  const outside=event=>{const r=dialog.getBoundingClientRect();return event.target===dialog&&(event.clientX<r.left||event.clientX>=r.right||event.clientY<r.top||event.clientY>=r.bottom);};
  let beganOutside=false;
  dialog.addEventListener('pointerdown',event=>{beganOutside=outside(event);});
  dialog.addEventListener('click',event=>{if(beganOutside&&outside(event))dialog.close();beganOutside=false;});
  dialog.addEventListener('close',()=>{beganOutside=false;});
 }
 const picker=document.createElement('dialog');picker.className='manual-jewel-picker';picker.setAttribute('aria-labelledby','manualPickerTitle');page.append(picker);
 function chooseJewel(slot){
  picker.replaceChildren();const heading=text(picker,'h2',`${parts[slot.owner]} · ${slot.kind==='weapon'?'무기':'방어구'} ${slot.index+1}번 슬롯 [${slot.size}]`);heading.id='manualPickerTitle';
  const close=text(picker,'button','닫기');close.type='button';close.addEventListener('click',()=>picker.close());
  const query=field(picker,'장식주 이름·스킬 검색','manualPickerQuery','input');query.type='search';
  const list=text(picker,'div','');list.className='manual-jewel-options';
  const fitting=data.decorations.filter(d=>d.kind===slot.kind&&d.slot<=slot.size).sort((a,b)=>Math.max(0,...Object.values(b.skills))-Math.max(0,...Object.values(a.skills))||a.name.localeCompare(b.name,'ko'));
  function draw(){list.replaceChildren();const q=query.value.replace(/\s/g,'').toLocaleLowerCase('ko');for(const d of [null,...fitting].filter(d=>!d||`${d.name} ${skills(d)}`.replace(/\s/g,'').toLocaleLowerCase('ko').includes(q))){const button=text(list,'button','');button.type='button';button.className='manual-jewel-option';button.setAttribute('aria-pressed',String(d?jewels.get(slot.key)===d.id:!jewels.has(slot.key)));button.append(BuildDetail.gem({...slot,decoration:d}),document.createTextNode(d?`${d.name} · ${skills(d)}`:'빈 슬롯 · 장식주 해제'));button.addEventListener('click',()=>{if(d)jewels.set(slot.key,d.id);else jewels.delete(slot.key);picker.close();renderJewels();preview();persist();document.getElementById('manualJewel-'+slot.key)?.focus();});}}
  query.addEventListener('input',draw);draw();picker.showModal();query.focus();
 }
 function slotButton(slot){const decoration=data.decorations.find(d=>d.id===jewels.get(slot.key));const button=document.createElement('button');button.type='button';button.className='manual-slot-button';button.id='manualJewel-'+slot.key;button.setAttribute('aria-haspopup','dialog');button.setAttribute('aria-label',`${parts[slot.owner]} ${slot.kind==='weapon'?'무기':'방어구'} ${slot.index+1}번 슬롯 [${slot.size}]: ${decoration?.name||'빈 슬롯'} · 장식주 선택`);button.append(BuildDetail.gem({...slot,decoration}),document.createTextNode(`${decoration?.name||'빈 슬롯'} [${slot.size}]`));button.addEventListener('click',()=>chooseJewel(slot));return button;}
 function renderJewels(){const available=slots(),keys=new Set(available.map(s=>s.key));for(const k of jewels.keys())if(!keys.has(k))jewels.delete(k);for(const slot of available)if(!data.decorations.some(d=>d.id===jewels.get(slot.key)&&d.kind===slot.kind&&d.slot<=slot.size))jewels.delete(slot.key);}
 function request(){return {armorLimitBreak:$('manualLimitBreak').value==='on',weaponId:selected('weapon')?.id,armorIds:Object.fromEntries(ManualBuild.parts.map(part=>[part,selected(part)?.id])),charm:selected('talisman'),charmOwned:fields.talisman.select.value.startsWith('owned:'),weaponSeriesSkillId:Number($('manualSeries').value),weaponGroupSkillId:Number($('manualGroup').value),decorations:slots().filter(s=>jewels.has(s.key)).map(s=>({...s,decorationId:jewels.get(s.key)}))};}
 const equipmentPicker=document.createElement('dialog');equipmentPicker.className='manual-equipment-picker';equipmentPicker.setAttribute('aria-labelledby','manualEquipmentPickerTitle');
 const equipmentTitle=text(equipmentPicker,'h2','장비 선택');equipmentTitle.id='manualEquipmentPickerTitle';
 const equipmentClose=text(equipmentPicker,'button','닫기');equipmentClose.type='button';equipmentClose.addEventListener('click',()=>equipmentPicker.close());
 equipmentPicker.append($('manualEquipment'));page.append(equipmentPicker);
 dismissOnBackdrop(picker);dismissOnBackdrop(equipmentPicker);
 let editingPart=null;
 equipmentPicker.addEventListener('close',()=>{document.getElementById('manualGear-'+editingPart)?.focus();});
 function chooseEquipment(part){editingPart=part;equipmentTitle.textContent=parts[part]+' 선택';for(const [p,f]of Object.entries(fields))f.select.closest('fieldset').hidden=p!==part;equipmentPicker.showModal();fields[part].query.focus();}
 function preview(){
  const container=$('manualPreview');container.replaceChildren();$('manualError').textContent='';
  try{
   const complete=selected('weapon')&&ManualBuild.parts.every(p=>selected(p));
   // Empty positions are display-only placeholders; saving still requires a complete real loadout.
   const displayData={...data,weapons:[...data.weapons],armor:[...data.armor]},req=request();
   for(const [i,part]of ['weapon',...ManualBuild.parts].entries())if(!selected(part)){
    const placeholder={id:900000+i,name:parts[part]+' 선택',part,kind:part==='weapon'?$('manualType').value:undefined,rank:'high',rarity:0,slots:[],skills:{},bonuses:[],defense:0,resistances:{}};
    if(part==='weapon'){displayData.weapons.push(placeholder);req.weaponId=placeholder.id;}else{displayData.armor.push(placeholder);req.armorIds[part]=placeholder.id;}
   }
   const result=ManualBuild.compose(displayData,req),card=BuildDetail.render(result,displayData,0);
   card.classList.add('manual-loadout-card');card.querySelector('.game-build-heading').remove();
   const footer=card.querySelector('.game-build-footer');footer.replaceChildren();
   if(complete)footer.append(window.createBuildSaveForm(()=>SavedBuilds.snapshot(ManualBuild.compose(data,request()),data,'manual'),'직접 세팅 · '+result.weapon.name));
   else text(footer,'p','장비와 빈 슬롯을 눌러 세팅을 만드세요. 무기와 방어구 다섯 부위를 선택하면 저장할 수 있습니다.');
   for(const row of card.querySelectorAll('.game-equipment-row')){
    const part=row.dataset.part,gear=row.querySelector('.game-gear'),names=gear.querySelector('.game-gear-names');
    const button=document.createElement('button');button.type='button';button.className='manual-gear-button';button.id='manualGear-'+part;button.setAttribute('aria-haspopup','dialog');button.setAttribute('aria-label',parts[part]+' 선택 · '+(selected(part)?.name||'미선택'));
    button.append(gear.querySelector('.game-icon'),names.querySelector('.game-gear-caption'),names.querySelector('.game-gear-name'));gear.prepend(button);
    if(!selected(part))names.querySelector('details')?.remove();
    button.addEventListener('click',()=>chooseEquipment(part));
    const own=slots().filter(s=>s.owner===part);row.querySelectorAll('.game-slot-row').forEach((li,i)=>li.replaceChildren(slotButton(own[i])));
   }
   const charm=card.querySelector('.game-charm-panel'),charmButton=text(charm,'button',selected('talisman')?'호석 변경':'호석 선택 · 사용 안 함');charmButton.type='button';charmButton.id='manualGear-talisman';charmButton.className='manual-charm-button';charmButton.setAttribute('aria-haspopup','dialog');charmButton.addEventListener('click',()=>chooseEquipment('talisman'));charm.querySelector('.game-panel-title').after(charmButton);
   const charmSlots=slots().filter(s=>s.owner==='talisman');card.querySelectorAll('.game-charm-jewels .game-slot-row').forEach((li,i)=>li.replaceChildren(slotButton(charmSlots[i])));
   container.append(card);
  }catch(e){$('manualError').textContent=e.message;}
 }
 function changed(){syncBonuses();for(const [part,f]of Object.entries(fields)){const item=selected(part);f.hint.replaceChildren();f.hint.append(BuildDetail.icon(part==='weapon'?(item?.kind||$('manualType').value):part,'gold',item?.rarity));const description=document.createElement('span');description.textContent=item?`${item.name} · ${part==='weapon'?'슬롯 '+(item.slots.join('/')||'없음'):part==='talisman'?skills(item):'최대 강화 방어력 '+item.defense+' · 슬롯 '+(item.slots.join('/')||'없음')}`:'장비를 선택하세요';f.hint.append(description);}renderJewels();preview();persist();}
 function restore(){restoring=true;try{const raw=localStorage.getItem(key);if(!raw)return;const draft=JSON.parse(raw);if(draft.version!==1)throw Error();if(['on','off'].includes(draft.limitBreak))$('manualLimitBreak').value=draft.limitBreak;if(Object.hasOwn(types,draft.type))$('manualType').value=draft.type;for(const part of Object.keys(parts)){refresh(part);const value=draft.equipment?.[part];if([...fields[part].select.options].some(o=>o.value===value))fields[part].select.value=value;}for(const [id,value]of [['manualSeries',draft.series],['manualGroup',draft.group]])if([...$(id).options].some(o=>o.value===value))$(id).value=value;if(Array.isArray(draft.jewels))for(const pair of draft.jewels)if(Array.isArray(pair)&&pair.length===2&&typeof pair[0]==='string'&&Number.isInteger(pair[1]))jewels.set(...pair);}catch{$('manualStatus').textContent='저장된 선택을 읽지 못했습니다. 선택 초기화로 다시 시작하세요.';}finally{restoring=false;}}
 async function load(){if(data||loading)return;loading=true;$('manualStatus').textContent='장비 데이터를 불러오는 중…';try{const response=await fetch('data/equipment-snapshot.json');if(!response.ok)throw Error('장비 데이터를 불러오지 못했습니다.');data=await response.json();for(const [part,label]of Object.entries(parts)){const group=document.createElement('fieldset');text(group,'legend',label);if(part==='weapon'){const type=field(group,'무기 종류','manualType');for(const [id,name]of Object.entries(types))option(type,id,name);type.value='long-sword';type.addEventListener('change',()=>{fields.weapon.select.value='';refresh('weapon');changed();});}const query=field(group,label+' 이름·스킬 검색','manualQuery-'+part,'input');query.type='search';const select=field(group,label+' 선택','manualSelect-'+part),hint=text(group,'p','');hint.className='hint';fields[part]={select,query,hint};query.addEventListener('input',()=>refresh(part));select.addEventListener('change',()=>{changed();if(equipmentPicker.open)equipmentPicker.close();});$('manualEquipment').append(group);}
 for(const [id,kind]of [['manualSeries','set'],['manualGroup','group']])for(const s of data.skills.filter(s=>s.kind===kind))option($(id),s.id,s.name);refreshCharms();for(const p of Object.keys(parts))refresh(p);restore();changed();$('manualReset').disabled=false;$('manualLimitBreak').disabled=false;}catch(e){data=null;$('manualError').textContent=e.message;}finally{loading=false;}}
 $('manualJewels').closest('section').hidden=true;$('manualForm').before($('manualPreview'));page.addEventListener('page-enter',load);$('manualLimitBreak').addEventListener('change',changed);$('manualForm').addEventListener('submit',e=>e.preventDefault());for(const id of ['manualSeries','manualGroup'])$(id).addEventListener('change',()=>{preview();persist();});$('manualReset').addEventListener('click',()=>{$('manualLimitBreak').value='on';jewels.clear();for(const f of Object.values(fields)){f.query.value='';f.select.value='';}$('manualSeries').value=$('manualGroup').value='0';for(const p of Object.keys(parts))refresh(p);changed();});document.addEventListener('inventory-state-changed',()=>{if(!data||recordsVersion===CandidateContext.get().inventoryVersion)return;refreshCharms();changed();});
})();
