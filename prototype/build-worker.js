'use strict';
importScripts('talisman-candidates.js','build-search.js');
self.onmessage=async ({data:request})=>{
  try {
    const files=await Promise.all(['data/equipment-snapshot.json','data/talisman-recipes.json'].map(async url=>{const r=await fetch(url);if(!r.ok)throw Error('검색 데이터를 불러오지 못했습니다.');return r.json();}));
    const result=BuildSearch.search(files[0],files[1],request,p=>self.postMessage({type:'progress',...p}));
    self.postMessage({type:'result',...result});
  }catch(e){self.postMessage({type:'error',message:e.message||'검색 중 오류가 발생했습니다.'});}
};
