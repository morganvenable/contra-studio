import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {readContraDbSource} from '../src/contradb-source.ts';
import {READY_LIBRARY} from '../src/ready-library.ts';
import {SOURCE_LIBRARY} from '../src/source-library.ts';
import {assembleUnchangedReadyEntry} from './assemble-unchanged-ready.mjs';
const original=readContraDbSource(readFileSync(new URL('../test-data/contradb/773.json',import.meta.url),'utf8')).record;
const prior=READY_LIBRARY.find(e=>e.id==='773'),card=SOURCE_LIBRARY.find(e=>e.id==='773'),reviewed={id:'773',archive:prior.archive};
test('assembly preserves exact bytes only for complete unchanged source and review',()=>{
 const result=assembleUnchangedReadyEntry(original,prior,reviewed,card);
 assert.deepEqual(result,prior);assert.notEqual(result,prior);
 assert.equal(assembleUnchangedReadyEntry(original,prior,undefined,card).archive,prior.archive);
 assert.equal(assembleUnchangedReadyEntry(original,undefined,reviewed,card),undefined);
});
test('retained source metadata and prose changes cannot reuse an archive',()=>{
 const saved=JSON.parse(prior.archive);
 // Same HTML fingerprint is insufficient: every retained snapshot field matters.
 for(const key of Object.keys(saved.snapshot)){
  const changed=structuredClone(saved);changed.snapshot[key]=typeof changed.snapshot[key]==='string'?changed.snapshot[key]+' changed':null;
  const old={...prior,archive:JSON.stringify(changed)};
  assert.equal(assembleUnchangedReadyEntry(original,old,{id:'773',archive:old.archive},card),undefined,key);
 }
 const changed=structuredClone(saved);changed.snapshot.html+=' altered prose';
 const old={...prior,archive:JSON.stringify(changed)};
 assert.equal(assembleUnchangedReadyEntry(original,old,{id:'773',archive:old.archive},card),undefined);
});
test('changed explicit interpretation or even archive whitespace takes the full path',()=>{
 const saved=JSON.parse(prior.archive);saved.interpretation.sourceHook='descriptive';
 for(const archive of[JSON.stringify(saved),prior.archive+'\n'])assert.equal(assembleUnchangedReadyEntry(original,prior,{id:'773',archive},card),undefined);
 assert.equal(assembleUnchangedReadyEntry(original,{...prior,archive:'invalid'},undefined,card),undefined);
 for(const mutate of[s=>s.version=2,s=>s.sourceSnapshotId='stale',s=>delete s.interpretation]){const s=JSON.parse(prior.archive);mutate(s);assert.equal(assembleUnchangedReadyEntry(original,{...prior,archive:JSON.stringify(s)},undefined,card),undefined);}
});
test('card identity mismatches fail and changed presentation takes full checks',()=>{
 for(const key of['id','title','author'])assert.throws(()=>assembleUnchangedReadyEntry(original,prior,reviewed,{...card,[key]:'wrong'}),/identity mismatch/);
 assert.equal(assembleUnchangedReadyEntry(original,prior,reviewed,{...card,formation:'changed'}),undefined);
 assert.equal(assembleUnchangedReadyEntry(original,prior,reviewed,undefined),undefined);
});
