import test from 'node:test';import assert from 'node:assert/strict';
import {fetchContraDbSnapshot} from './source-fetch.ts';
const payload={id:'94',sourceUrl:'https://contradb.com/dances/94',html:'<p>Source</p>',fetchedAt:'2026-10-18T18:00:00Z'};
const respond=(value:unknown,status=200,type='application/json')=>new Response(typeof value==='string'?value:JSON.stringify(value),{status,headers:{'content-type':type}});
test('static hosting directs source imports to saved files without making a network request',async()=>{
 let called=false;
 await assert.rejects(()=>fetchContraDbSnapshot('94',{downloaderAvailable:false,fetcher:async()=>{called=true;return respond(payload);}}),/save it as HTML/);
 assert.equal(called,false);
});
test('ContraDB fetch only sends a strict numeric ID to the same-origin endpoint',async()=>{
 let called='';const result=await fetchContraDbSnapshot('https://contradb.com/dances/94',{fetcher:async(input,init)=>{called=String(input);assert.equal(init?.method,'GET');assert.equal(init?.credentials,'same-origin');return respond(payload);}});assert.equal(called,'/api/contradb/94');assert.equal(result.sourceUrl,payload.sourceUrl);assert.equal(result.retrievedAt,payload.fetchedAt);
 for(const bad of ['https://example.com/dances/94','https://contradb.com/dances/94?url=http://evil','94/../1','-1','0','https://user@contradb.com/dances/94'])await assert.rejects(()=>fetchContraDbSnapshot(bad),/numeric/);
});
test('mismatched source identity, oversized responses and unavailable static fallback are rejected',async()=>{
 for(const bad of [{...payload,id:95},{...payload,sourceUrl:'https://example.com/dances/94'},{...payload,fetchedAt:'not a timestamp'},{...payload,html:'x'.repeat(500001)}])await assert.rejects(()=>fetchContraDbSnapshot('94',{fetcher:async()=>respond(bad)}),/mismatched|malformed/);
 await assert.rejects(()=>fetchContraDbSnapshot('94',{fetcher:async()=>respond('<html>static</html>',200,'text/html')}),/saved HTML/);
 await assert.rejects(()=>fetchContraDbSnapshot('94',{fetcher:async()=>respond({},404)}),/saved HTML/);
 await assert.rejects(()=>fetchContraDbSnapshot('94',{fetcher:async()=>respond('x'.repeat(1000001))}),/bounded/);
});
test('cancelled and timed-out downloads cannot return a later source snapshot',async()=>{
 const fetcher:typeof fetch=async(_input,init)=>new Promise((_resolve,reject)=>{const stop=()=>reject(new Error('aborted'));if(init?.signal?.aborted)stop();else init?.signal?.addEventListener('abort',stop,{once:true});});
 const controller=new AbortController(),promise=fetchContraDbSnapshot('94',{fetcher,signal:controller.signal});controller.abort();await assert.rejects(promise,/cancelled/);
 await assert.rejects(()=>fetchContraDbSnapshot('94',{fetcher,timeoutMs:1}),/timed out/);
});

test('retained outage response preserves the exact 773 snapshot and reports its original date separately',async()=>{
 const {readFile}=await import('node:fs/promises');
 const snapshot=JSON.parse(await readFile(new URL('../test-data/contradb/773.json',import.meta.url),'utf8'));
 const envelope={id:773,sourceUrl:snapshot.sourceUrl,html:snapshot.html,fetchedAt:snapshot.retrievedAt,sourceStatus:'retained-snapshot',snapshot};
 const deliveries:unknown[]=[];
 const result=await fetchContraDbSnapshot('773',{fetcher:async()=>respond(envelope),onDelivery:d=>deliveries.push(d)});
 assert.deepEqual(result,snapshot);assert.deepEqual(deliveries,[{sourceStatus:'retained-snapshot',retrievedAt:snapshot.retrievedAt}]);
 assert.equal(Object.hasOwn(result,'sourceStatus'),false);
 const {prepareContraDbReview}=await import('./source-review.ts');
 const original=prepareContraDbReview(JSON.stringify(snapshot)),cached=prepareContraDbReview(JSON.stringify(result));
 assert.ok(original.result.dance);assert.ok(cached.result.dance);assert.equal(cached.result.dance.sourceRecord?.snapshotId,original.result.dance.sourceRecord?.snapshotId);assert.deepEqual(cached.result.dance.figures,original.result.dance.figures);assert.deepEqual(cached.interpretation,original.interpretation);assert.equal(cached.result.dance.sourceText,original.result.dance.sourceText);
});
test('retained response cannot mismatch identity, rewrite its date, inject snapshot fields or masquerade as live',async()=>{
 const {readFile}=await import('node:fs/promises');
 const snapshot=JSON.parse(await readFile(new URL('../test-data/contradb/773.json',import.meta.url),'utf8'));
 const envelope={id:773,sourceUrl:snapshot.sourceUrl,html:snapshot.html,fetchedAt:snapshot.retrievedAt,sourceStatus:'retained-snapshot',snapshot};
 for(const changed of [
  {...envelope,snapshot:undefined}, {...envelope,sourceStatus:'cached-maybe'}, {...envelope,sourceStatus:'live'},
  {...envelope,html:snapshot.html+' '}, {...envelope,fetchedAt:'2026-10-19T00:00:00Z'},
  {...envelope,snapshot:{...snapshot,sourceUrl:'https://contradb.com/dances/94'}},
  {...envelope,snapshot:{...snapshot,capabilities:{revolvingDoors:true}}},
  {...envelope,snapshot:{...snapshot,metadata:{...snapshot.metadata,id:94}}},
  {...envelope,snapshot:{...snapshot,html:'<p>Not a source</p>'},html:'<p>Not a source</p>'},
 ]){let delivered=false;await assert.rejects(()=>fetchContraDbSnapshot('773',{fetcher:async()=>respond(changed),onDelivery:()=>{delivered=true;}}),/provenance|malformed|unknown|substitute/);assert.equal(delivered,false);}
 let mode='';await fetchContraDbSnapshot('94',{fetcher:async()=>respond({...payload,sourceStatus:'live'}),onDelivery:d=>{mode=d.sourceStatus;}});assert.equal(mode,'live');
});

test('undated retained snapshots stay undated and cannot be mistaken for fresh responses',async()=>{
 const {readFile}=await import('node:fs/promises');const snapshot=JSON.parse(await readFile(new URL('../test-data/contradb/1616.json',import.meta.url),'utf8'));
 assert.equal(Object.hasOwn(snapshot,'retrievedAt'),false);
 const envelope={id:1616,sourceUrl:snapshot.sourceUrl,html:snapshot.html,fetchedAt:null,sourceStatus:'retained-snapshot',snapshot};
 let delivery:unknown;assert.deepEqual(await fetchContraDbSnapshot('1616',{fetcher:async()=>respond(envelope),onDelivery:d=>{delivery=d;}}),snapshot);assert.deepEqual(delivery,{sourceStatus:'retained-snapshot',retrievedAt:null});
 for(const changed of [{...envelope,sourceStatus:'live',snapshot:undefined},{...envelope,fetchedAt:'2026-10-19T00:00:00Z'},{...envelope,snapshot:{...snapshot,retrievedAt:null}}])await assert.rejects(()=>fetchContraDbSnapshot('1616',{fetcher:async()=>respond(changed)}),/date|provenance/);
});
