import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,rm,readdir,copyFile,cp,readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {readWorkerHostingManifest} from './worker-hosting-manifest.mjs';
const project=path.resolve(import.meta.dirname,'..');

test('public checkout needs no owner manifest and does not fabricate one',async()=>{
 const root=await mkdtemp(path.join(tmpdir(),'contra-worker-public-'));
 try {assert.equal(await readWorkerHostingManifest(root),undefined);assert.deepEqual(await readdir(root),[]);}
 finally {await rm(root,{recursive:true,force:true});}
});

test('minimal static assets package into a Worker with or without owner configuration',async()=>{
 const root=await mkdtemp(path.join(tmpdir(),'contra-worker-build-'));
 try {
  for(const dir of ['scripts','src','worker'])await mkdir(path.join(root,dir));
  await writeFile(path.join(root,'package.json'),JSON.stringify({type:'module'}));
  for(const file of ['scripts/build-worker.mjs','scripts/worker-hosting-manifest.mjs','src/source-library.ts','src/contradb-source.ts','worker/public-source.mjs'])await copyFile(path.join(project,file),path.join(root,file));
  await cp(path.join(project,'test-data/contradb'),path.join(root,'test-data/contradb'),{recursive:true});
  const manifest={projectId:'fixture-owner',server:{entrypoint:'server/index.js'}};
  for(const configured of [false,true]){
   await mkdir(path.join(root,'dist'),{recursive:true});
   await writeFile(path.join(root,'dist/index.html'),'<!doctype html><html><body>Packaging test</body></html>');
   if(configured){await mkdir(path.join(root,'.openai'));await writeFile(path.join(root,'.openai/hosting.json'),JSON.stringify(manifest));}
   const output=execFileSync(process.execPath,[path.join(root,'scripts/build-worker.mjs')],{encoding:'utf8',timeout:30000});
   assert.match(output,/Built Worker ESM/);
   assert.match(await readFile(path.join(root,'dist/server/index.js'),'utf8'),/Packaging test/);
   if(configured)assert.deepEqual(JSON.parse(await readFile(path.join(root,'dist/.openai/hosting.json'),'utf8')),manifest);
   else assert.deepEqual(await readdir(path.join(root,'dist')),['server']);
  }
 } finally {await rm(root,{recursive:true,force:true});}
});

test('existing hosting identity is retained and invalid or static manifests still fail',async()=>{
 const root=await mkdtemp(path.join(tmpdir(),'contra-worker-owner-'));
 try {
  await mkdir(path.join(root,'.openai'));
  const file=path.join(root,'.openai/hosting.json'),manifest={projectId:'fixture-owner',server:{entrypoint:'server/index.js'}};
  await writeFile(file,JSON.stringify(manifest));
  assert.deepEqual(await readWorkerHostingManifest(root),manifest);
  await writeFile(file,'{broken');await assert.rejects(()=>readWorkerHostingManifest(root),SyntaxError);
  await writeFile(file,JSON.stringify({static:{directory:'dist'}}));await assert.rejects(()=>readWorkerHostingManifest(root),/Remove static/);
 }
 finally {await rm(root,{recursive:true,force:true});}
});
