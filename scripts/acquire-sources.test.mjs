import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,writeFile,mkdir,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {acquire,canonicalize,parseArgs} from './acquire-sources.mjs';
const fixture=JSON.parse(await readFile(new URL('../test-data/contradb/110.json',import.meta.url),'utf8'));
const page=fixture.html;
async function context(t){const dir=await mkdtemp(join(tmpdir(),'contra-acquire-'));t.after(()=>rm(dir,{recursive:true,force:true}));await mkdir(join(dir,'fixtures'));let time=0;const waits=[];return{output:dir,deps:{catalogue:[{id:110}],fixtureDir:join(dir,'fixtures'),now:()=>time,sleep:async ms=>{waits.push(ms);time+=ms;}},waits};}
test('canonical retention strips exterior credentials and preserves source fingerprint',()=>{
 const clean=canonicalize(page,110,'2026-10-20T00:00:00Z');
 const withSecrets=canonicalize('<meta name="csrf-token" content="SECRET"><input name="authenticity_token" value="SECRET">'+page,110,'2026-10-20T00:00:00Z');
 assert.equal(withSecrets.fingerprint,clean.fingerprint);assert.ok(!JSON.stringify(withSecrets).includes('SECRET'));
 const injected=page.replace('dance-show-title">','dance-show-title"><input name="token" value="SECRET">');
 assert.notEqual(injected,page);assert.throws(()=>canonicalize(injected,110,'2026-10-20T00:00:00Z'),/sanitization-changed-source/);
});
test('successful acquisition uses credential-free manual redirects, bounded timing and resumes',async t=>{
 const c=await context(t);let calls=0;
 const fetch=async(url,options)=>{calls++;assert.equal(url,'https://contradb.com/dances/110');assert.equal(options.redirect,'manual');assert.equal(options.credentials,'omit');assert.equal(options.headers.Cookie,undefined);return new Response(page,{status:200,headers:{'set-cookie':'SECRET','content-type':'text/html'}});};
 const first=await acquire({run:true,output:c.output},{...c.deps,fetch});assert.equal(first.saved,1);
 const manifest=JSON.parse(await readFile(join(c.output,'manifest.json'),'utf8'));assert.match(manifest.records['110'].responseSha256,/^[a-f0-9]{64}$/);assert.ok(!JSON.stringify(manifest).includes('SECRET'));
 const second=await acquire({run:true,output:c.output},{...c.deps,fetch});assert.equal(second.resumed,1);assert.equal(calls,1);
});
test('existing fixture never fetched or overwritten',async t=>{
 const c=await context(t);await writeFile(join(c.deps.fixtureDir,'110.json'),'preserve');const result=await acquire({run:true,output:c.output},{...c.deps,fetch:()=>{throw Error('must not fetch');}});assert.equal(result.retained,1);assert.equal(await readFile(join(c.deps.fixtureDir,'110.json'),'utf8'),'preserve');
});
test('429 retry-after respected; 403 stops batch with checkpoint and no stored body',async t=>{
 const c=await context(t);let n=0;const result=await acquire({run:true,output:c.output},{...c.deps,catalogue:[{id:110},{id:111}],fetch:async()=>++n===1?new Response('SECRET',{status:429,headers:{'retry-after':'3'}}):new Response('SECRET',{status:403})});
 assert.equal(n,2);assert.ok(c.waits.includes(3000));assert.equal(result.stopped,'http-403');const manifest=await readFile(join(c.output,'manifest.json'),'utf8');assert.ok(!manifest.includes('SECRET'));assert.equal(JSON.parse(manifest).records['110'].attempts,2);
});
test('oversized bodies and redirects are not retained or followed',async t=>{
 const c=await context(t);let n=0;const result=await acquire({run:true,output:c.output},{...c.deps,catalogue:[{id:110},{id:111}],fetch:async()=>++n===1?new Response('x'.repeat(500001),{headers:{'content-type':'text/html'}}):new Response('',{status:302,headers:{location:'https://example.org/'}})});assert.equal(result.failed,2);assert.equal(n,2);const manifest=JSON.parse(await readFile(join(c.output,'manifest.json'),'utf8'));assert.equal(manifest.records['110'].reason,'response-too-large');assert.equal(manifest.records['111'].reason,'http-302');
});
test('network circuit breaks after three attempts; retry failures is explicit',async t=>{
 const c=await context(t);let n=0;const deps={...c.deps,fetch:async()=>{n++;throw Error('SECRET in network error');}};const result=await acquire({run:true,output:c.output},deps);assert.equal(n,3);assert.equal(result.stopped,'network-or-storage-error');await acquire({run:true,output:c.output},deps);assert.equal(n,3);assert.ok(!(await readFile(join(c.output,'manifest.json'),'utf8')).includes('SECRET'));
});
test('CLI requires minimum one second and explicit run',()=>{assert.equal(parseArgs([]).run,false);assert.throws(()=>parseArgs(['--interval-ms','999']));assert.throws(()=>parseArgs(['--limit','0']));assert.equal(parseArgs(['--run','--limit','5']).limit,5);});

test('missing saved snapshot is reacquired; wrong MIME rejected',async t=>{
 const c=await context(t);let calls=0;const fetch=async()=>{calls++;return new Response(page,{headers:{'content-type':'text/html'}});};await acquire({run:true,output:c.output},{...c.deps,fetch});await rm(join(c.output,'snapshots/110.json'));await acquire({run:true,output:c.output},{...c.deps,fetch});assert.equal(calls,2);await rm(join(c.output,'snapshots/110.json'));const r=await acquire({run:true,output:c.output},{...c.deps,fetch:async()=>new Response(page,{headers:{'content-type':'application/json'}})});assert.equal(r.failed,1);assert.equal(JSON.parse(await readFile(join(c.output,'manifest.json'),'utf8')).records['110'].reason,'unexpected-content-type');
});
test('wrong source identity and omitted duplicate fields are refused',()=>{
 assert.throws(()=>canonicalize('<a href="/dances/new?copy_dance_id=999">Copy</a>'+page,110,'2026-10-20T00:00:00Z'),/source-id-conflict/);
 assert.throws(()=>canonicalize('<h1 class="dance-show-title">Duplicate</h1>'+page,110,'2026-10-20T00:00:00Z'),/incomplete-source-preservation/);
});
test('503 uses bounded retry and stops after three responses',async t=>{
 const c=await context(t);let calls=0;const r=await acquire({run:true,output:c.output},{...c.deps,fetch:async()=>{calls++;return new Response('unavailable',{status:503});}});assert.equal(calls,3);assert.equal(r.stopped,'http-503');assert.ok(c.waits.includes(2000));assert.ok(c.waits.includes(4000));
});
