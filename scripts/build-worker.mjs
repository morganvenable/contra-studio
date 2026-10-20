// Package the existing Vite SPA as embedded assets in a supported Worker ESM.
// No external proxy, credentials, database, or new sharing permissions are used.
import {readFile,writeFile,readdir,mkdir,rm} from 'node:fs/promises';
import path from 'node:path';
import {readWorkerHostingManifest} from './worker-hosting-manifest.mjs';
const root = path.resolve(import.meta.dirname,'..');
const dist = path.join(root,'dist');
const assets = {};
const types = {'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.json':'application/json'};
async function collect(dir,prefix='') {
  for (const entry of await readdir(dir,{withFileTypes:true})) {
    if (entry.name==='server'||entry.name==='.openai') continue;
    const rel=prefix+'/'+entry.name, absolute=path.join(dir,entry.name);
    if(entry.isDirectory()) await collect(absolute,rel);
    else {
      const ext=path.extname(entry.name);
      if(!types[ext]) throw new Error('Unsupported asset type: '+rel);
      assets[rel]={body:await readFile(absolute,'utf8'),type:types[ext]};
    }
  }
}
await collect(dist);
if(!assets['/index.html']) throw new Error('Build Vite first.');
const {REVIEWED_SOURCE_IDS}=await import('../src/source-library.ts');
const {readContraDbSource,makeContraDbSnapshot}=await import('../src/contradb-source.ts');
const retainedSourceSnapshots={};
for(const id of REVIEWED_SOURCE_IDS){
 if(!/^[1-9]\d{0,8}$/.test(id))throw new Error('Invalid reviewed public source ID: '+id);
 const raw=await readFile(path.join(root,'test-data/contradb',id+'.json'),'utf8');
 const parsed=readContraDbSource(raw);if(!parsed.record||!parsed.structurallyValid)throw new Error('Retained source could not be parsed: '+id);
 const snapshot=JSON.parse(JSON.stringify(makeContraDbSnapshot(parsed.record)));
 if(readContraDbSource(JSON.stringify(snapshot)).record?.snapshotId!==parsed.record.snapshotId)throw new Error('Retained source fingerprint changed: '+id);
 if(snapshot.schema!=='contra-studio/contradb-snapshot'||snapshot.version!==1||snapshot.sourceUrl!==`https://contradb.com/dances/${id}`||typeof snapshot.html!=='string'||Buffer.byteLength(snapshot.html)>500000||(snapshot.retrievedAt!==undefined&&(typeof snapshot.retrievedAt!=='string'||!Number.isFinite(Date.parse(snapshot.retrievedAt)))))throw new Error('Invalid retained public snapshot: '+id);
 retainedSourceSnapshots[id]=snapshot;
}
const route=await readFile(path.join(root,'worker/public-source.mjs'),'utf8');
const source=route+`\nconst retainedSourceSnapshots=${JSON.stringify(retainedSourceSnapshots)};\nconst assets=${JSON.stringify(assets)};\nexport default {async fetch(request) {
 const api=await publicSource(request,fetch,retainedSourceSnapshots);if(api)return api;
 if(request.method!=='GET'&&request.method!=='HEAD')return new Response('Method not allowed',{status:405});
 const pathname=new URL(request.url).pathname;
 const asset=assets[pathname==='/'?'/index.html':pathname];
 if(!asset)return new Response('Not found',{status:404});
 return new Response(request.method==='HEAD'?null:asset.body,{headers:{'content-type':asset.type,'x-content-type-options':'nosniff','cache-control':pathname.startsWith('/assets/')?'public,max-age=31536000,immutable':'no-cache'}});
}};\n`;
if(Buffer.byteLength(source)>4*1024*1024)throw new Error('Embedded worker exceeds project size budget.');
const manifest=await readWorkerHostingManifest(root);
await rm(dist,{recursive:true});await mkdir(path.join(dist,'server'),{recursive:true});
await writeFile(path.join(dist,'server/index.js'),source);
if(manifest!==undefined){
 await mkdir(path.join(dist,'.openai'),{recursive:true});
 await writeFile(path.join(dist,'.openai/hosting.json'),JSON.stringify(manifest,null,2)+'\n');
}
const mod=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
const home=await mod.default.fetch(new Request('https://example.test/'));
if(home.status!==200||!(await home.text()).includes('<html'))throw new Error('Worker home smoke test failed.');
const liveFetch=globalThis.fetch;
try {
 globalThis.fetch=async()=>new Response('forced outage',{status:502});
 const fallback=await mod.default.fetch(new Request('https://example.test/api/contradb/773')),data=await fallback.json();
 if(fallback.status!==200||data.sourceStatus!=='retained-snapshot'||JSON.stringify(data.snapshot)!==JSON.stringify(retainedSourceSnapshots['773'])||data.fetchedAt!==retainedSourceSnapshots['773'].retrievedAt)throw new Error('Built Worker retained-source fallback smoke test failed.');
} finally {globalThis.fetch=liveFetch;}
console.log('Built Worker ESM with '+Object.keys(assets).length+' embedded assets and '+Object.keys(retainedSourceSnapshots).length+' retained public-source fallbacks.');
