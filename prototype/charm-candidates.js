'use strict';
const CharmCandidates=(()=>{
 const key=SavedBuilds.charmKey,panels=new Set(),filtersById=new Map();let wishlistSearch='',wishlistFilter='all';
 const owned=c=>!!c&&CandidateContext.get().records.some(r=>key(r)===key(c));
 const wished=c=>!!c&&CharmWishlistStore.get().some(r=>key(r)===key(c));
 const text=(p,tag,value)=>{const e=document.createElement(tag);e.textContent=value;p.append(e);return e;};
 const label=c=>c?`${c.name?c.name+' · ':''}${c.skills.map(s=>`${s.name} Lv.${s.level}`).join(' / ')} · 무기 ${c.weaponSlots.join('/')||'없음'} / 방어구 ${c.armorSlots.join('/')||'없음'}`:'호석 사용 안 함';
 function toggle(c){if(!c)return false;return CharmWishlistStore.set(wished(c)?CharmWishlistStore.get().filter(r=>key(r)!==key(c)):[...CharmWishlistStore.get(),c]);}
 function panel(candidates,getActive,onChange,id=''){
  const root=document.createElement('section');root.className='build-charm-variants';text(root,'h3',`호석 후보 · ${candidates.length}개`);
  const filters=text(root,'label','후보 필터'),filter=document.createElement('select');filter.setAttribute('aria-label','호석 후보 필터');for(const[v,l]of [['all','전체'],['owned','보유만'],['wish','찜만'],['missing','미보유만']]){const o=text(filter,'option',l);o.value=v;}filter.value=filtersById.get(id)||'all';filters.append(filter);
  const choice=text(root,'label','호석 후보 선택'),select=document.createElement('select');select.className='build-charm-select';select.setAttribute('aria-label','호석 후보 선택');choice.append(select);
  const star=text(root,'button','찜하기');star.type='button';star.className='charm-wish-button';const status=text(root,'p','');status.className='hint';status.setAttribute('role','status');
  const refresh=()=>{const active=getActive(),c=candidates[active]?.charm;select.replaceChildren();candidates.forEach((b,n)=>{const c=b.charm,isOwned=owned(c),isWish=wished(c);if(filter.value==='owned'&&!isOwned||filter.value==='wish'&&!isWish||filter.value==='missing'&&(!c||isOwned))return;const o=text(select,'option',`${isWish?'찜 · ':''}${c?(isOwned?'보유 · ':'미보유 · '):''}${label(c)}`);o.value=n;});select.value=String(active);select.disabled=!select.options.length;star.disabled=!c;star.textContent=wished(c)?'찜 해제':'찜하기';star.setAttribute('aria-pressed',String(wished(c)));status.textContent=`${select.options.length} / ${candidates.length}개 표시${!select.options.length?' · 조건에 맞는 후보가 없습니다.':select.value===''?' · 현재 선택한 호석은 필터에서 제외되었습니다.':''}`;};
  filter.addEventListener('change',()=>{if(id)filtersById.set(id,filter.value);refresh();});select.addEventListener('change',()=>{onChange(Number(select.value));refresh();});star.addEventListener('click',()=>{if(!toggle(candidates[getActive()]?.charm))status.textContent='찜목록을 저장하지 못했습니다. 보유 호석 페이지의 저장 상태를 확인하세요.';else refresh();});
  panels.add({root,refresh});refresh();return root;
 }
 function renderWishlist(root){root.replaceChildren();text(root,'h2',`호석 찜목록 · ${CharmWishlistStore.get().length}개`);const controls=document.createElement('div');controls.className='charm-wishlist-controls';const search=text(controls,'label','스킬·슬롯 검색'),input=document.createElement('input');input.type='search';input.placeholder='예: 납도술';input.value=wishlistSearch;search.append(input);const state=text(controls,'label','보유 여부'),filter=document.createElement('select');for(const[v,l]of [['all','전체'],['owned','보유만'],['missing','미보유만']]){const o=text(filter,'option',l);o.value=v;}filter.value=wishlistFilter;state.append(filter);root.append(controls);const list=document.createElement('div');list.className='charm-wishlist-list';root.append(list);
  function refresh(){list.replaceChildren();const items=CharmWishlistStore.get().filter(c=>(filter.value==='all'||owned(c)===(filter.value==='owned'))&&label(c).toLocaleLowerCase().includes(input.value.trim().toLocaleLowerCase()));if(!items.length)text(list,'p','표시할 찜 호석이 없습니다. 검색 결과나 저장 세팅의 후보에서 찜하기를 누르세요.');for(const c of items){const row=document.createElement('div');row.className='charm-wishlist-row';text(row,'span',`${owned(c)?'보유':'미보유'} · ${label(c)}`);const b=text(row,'button','찜 해제');b.type='button';b.addEventListener('click',()=>{toggle(c);});list.append(row);}}
  input.addEventListener('input',()=>{wishlistSearch=input.value;refresh();});filter.addEventListener('change',()=>{wishlistFilter=filter.value;refresh();});refresh();
 }
 document.addEventListener('inventory-state-changed',()=>{for(const p of panels){if(!p.root.isConnected)panels.delete(p);else p.refresh();}});
 return {owned,wished,panel,renderWishlist};
})();
