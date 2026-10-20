import test from 'node:test';
import assert from 'node:assert/strict';
import {publicSource} from './public-source.mjs';
const request=(p,method='GET')=>new Request('https://site.test'+p,{method});
test('only numeric exact public record routes can reach upstream',async()=>{
 let calls=0;
 const fetcher=async()=>{calls++;throw Error('unexpected');};
 for(const p of ['/api/contradb/0','/api/contradb/001','/api/contradb/1?url=https://evil.test','/api/contradb/1/extra','/api/contradb/9999999999','/api/contradb/https:evil.test'])
  assert.equal((await publicSource(request(p),fetcher)).status,400);
 assert.equal((await publicSource(request('/api/contradb/94','POST'),fetcher)).status,405);
 assert.equal(await publicSource(request('/index.html'),fetcher),null);assert.equal(calls,0);
});
test('fetch is credential-free, refuses redirects and preserves canonical provenance',async()=>{
 const response=await publicSource(request('/api/contradb/94'),async(url,options)=>{
  assert.equal(url,'https://contradb.com/dances/94');assert.equal(options.credentials,'omit');assert.equal(options.redirect,'manual');
  assert.equal(options.headers.authorization,undefined);assert.equal(options.headers.cookie,undefined);
  return new Response('<html>record</html>',{headers:{'content-type':'text/html; charset=utf-8'}});
 });
 const data=await response.json();assert.equal(data.id,94);assert.equal(data.sourceUrl,'https://contradb.com/dances/94');assert.equal(data.html,'<html>record</html>');assert.ok(Number.isFinite(Date.parse(data.fetchedAt)));
 assert.equal(response.headers.get('cache-control'),'no-store');
});
test('upstream errors, wrong MIME, declared and streamed size limits fail safely',async()=>{
 for(const upstream of [new Response('redirect',{status:302,headers:{location:'https://evil.test'}}),new Response('missing',{status:404}),new Response('{}',{headers:{'content-type':'application/json'}}),new Response('x',{headers:{'content-type':'text/html','content-length':'999999'}}),new Response('x'.repeat(512001),{headers:{'content-type':'text/html'}})]) {
  const r=await publicSource(request('/api/contradb/94'),async()=>upstream);assert.ok(r.status>=400);assert.equal((await r.json()).html,undefined);
 }
 const r=await publicSource(request('/api/contradb/94'),async()=>{throw new Error('secret upstream diagnostic');});
 assert.equal(r.status,502);assert.ok(!(await r.text()).includes('secret'));
});

test('reviewed fallback keeps the exact retained public snapshot and its original date',async()=>{
 const {readFileSync}=await import('node:fs');
 const snapshot=JSON.parse(readFileSync(new URL('../test-data/contradb/773.json',import.meta.url),'utf8'));
 const retained={'773':snapshot};
 for(const fetcher of[
  async()=>new Response('unavailable',{status:502}),
  async()=>new Response('busy',{status:429}),
  async()=>new Response('redirect',{status:302,headers:{location:'https://elsewhere.invalid'}}),
  async()=>new Response('{}',{headers:{'content-type':'application/json'}}),
  async()=>new Response('oversized',{headers:{'content-type':'text/html','content-length':'500001'}}),
  async()=>new Response('x'.repeat(500001),{headers:{'content-type':'text/html'}}),
  async()=>{throw Error('private network details');},
 ]){
  const response=await publicSource(request('/api/contradb/773'),fetcher,retained);
  assert.equal(response.status,200);const body=await response.json();
  assert.equal(body.sourceStatus,'retained-snapshot');assert.equal(body.id,773);
  assert.deepEqual(body.snapshot,snapshot);assert.equal(body.html,snapshot.html);
  assert.equal(body.fetchedAt,snapshot.retrievedAt);assert.equal(body.sourceUrl,snapshot.sourceUrl);
  assert.equal(JSON.stringify(body).includes('private network details'),false);
 }
 const fresh=await publicSource(request('/api/contradb/773'),async()=>new Response('<html>fresh</html>',{headers:{'content-type':'text/html'}}),retained);
 const body=await fresh.json();assert.equal(body.sourceStatus,'live');assert.equal(body.html,'<html>fresh</html>');assert.equal(body.snapshot,undefined);
});

test('retained fallback cannot replace deletion, denied access, unknown or mismatched source records',async()=>{
 const snapshot={schema:'contra-studio/contradb-snapshot',version:1,sourceUrl:'https://contradb.com/dances/773',retrievedAt:'2026-10-18T19:12:00Z',html:'<html>retained</html>'};
 for(const status of[401,403,404,410]){const response=await publicSource(request('/api/contradb/773'),async()=>new Response('unavailable',{status}),{'773':snapshot});assert.equal(response.status,status);assert.equal((await response.json()).snapshot,undefined);}
 for(const retained of[{}, {'774':snapshot},{'773':{...snapshot,sourceUrl:'https://contradb.com/dances/774'}},{'773':{...snapshot,retrievedAt:'invalid'}},{'773':{...snapshot,html:'x'.repeat(500001)}}]){
  const response=await publicSource(request('/api/contradb/773'),async()=>{throw Error('unavailable');},retained);assert.equal(response.status,502);assert.equal((await response.json()).snapshot,undefined);
 }
 const unknown=await publicSource(request('/api/contradb/999999'),async()=>{throw Error('unavailable');},{'773':snapshot});assert.equal(unknown.status,502);assert.equal((await unknown.json()).html,undefined);
});

test('a stalled fetch or body reaches one bounded deadline without retrying or inventing freshness',async()=>{
 const snapshot={schema:'contra-studio/contradb-snapshot',version:1,sourceUrl:'https://contradb.com/dances/773',retrievedAt:'2026-10-18T19:12:00Z',html:'<html>retained</html>'};
 for(const bodyStalls of[false,true]){
  let calls=0,signal;const response=await publicSource(request('/api/contradb/773'),async(_url,options)=>{calls++;signal=options.signal;return bodyStalls?new Response(new ReadableStream({start(){}}),{headers:{'content-type':'text/html'}}):new Promise(()=>{});},{'773':snapshot},{timeoutMs:5});
  assert.equal(calls,1);assert.equal(signal.aborted,true);assert.equal(response.status,200);const data=await response.json();assert.equal(data.sourceStatus,'retained-snapshot');assert.equal(data.fetchedAt,snapshot.retrievedAt);
 }
});

test('undated retained snapshots stay undated and protected statuses survive failed cleanup',async()=>{
 const snapshot={schema:'contra-studio/contradb-snapshot',version:1,sourceUrl:'https://contradb.com/dances/774',html:'<html>retained</html>'};
 const body=await (await publicSource(request('/api/contradb/774'),async()=>new Response('outage',{status:502}),{'774':snapshot})).json();
 assert.deepEqual(body.snapshot,snapshot);assert.equal(body.fetchedAt,null);assert.equal(Object.hasOwn(body.snapshot,'retrievedAt'),false);
 for(const status of[401,403,404,410])for(const stuck of[false,true]){
  const response=await publicSource(request('/api/contradb/774'),async()=>new Response(new ReadableStream({cancel(){return stuck?new Promise(()=>{}):Promise.reject(Error('cleanup failure'));}}),{status}),{'774':snapshot},{timeoutMs:5});
  assert.equal(response.status,status);assert.equal((await response.json()).snapshot,undefined);
 }
});
