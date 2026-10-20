import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {READY_LIBRARY} from '../src/ready-library.ts';
import {readContraDbSource,makeContraDbSnapshot} from '../src/contradb-source.ts';
import {compileChoreography} from '../src/choreography.ts';
import {prepareReadyArchive} from './prepare-ready-archive.mjs';

const fixture=id=>{
 const raw=readFileSync(new URL(`../test-data/contradb/${id}.json`,import.meta.url),'utf8');
 const source=readContraDbSource(raw);assert.equal(source.structurallyValid,true);
 return {raw,original:source.record,prior:READY_LIBRARY.find(entry=>entry.id===id)};
};

test('identical complete snapshots replay exact reviewed choices and fresh output',()=>{
 for(const id of ['94','773','3181']){
  const {raw,original,prior}=fixture(id),reused=prepareReadyArchive(raw,original,prior),fresh=prepareReadyArchive(raw,original);
  assert.equal(reused.replayed,true,id);assert.equal(fresh.replayed,false,id);
  assert.equal(reused.archive,prior.archive,id);
  assert.equal(reused.archive,fresh.archive,id);
  assert.deepEqual(reused.result.dance.contraDbInterpretation,JSON.parse(prior.archive).interpretation,id);
  assert.deepEqual(reused.result.dance,fresh.result.dance,id);
  assert.equal(reused.result.coverage.executable,true,id);
  const replayProgram=compileChoreography(reused.result.dance,6),freshProgram=compileChoreography(fresh.result.dance,6);
  assert.equal(replayProgram.totalBeats,64,id);
  for(const beat of [0,1,15.5,32,63.999,64,127.5]){
   const frame=replayProgram.sample(beat);assert.deepEqual(frame,freshProgram.sample(beat),`${id} at ${beat}`);
   assert.ok(frame.poses.length);assert.ok(frame.poses.every(p=>Number.isFinite(p.position.x+p.position.z+p.yaw)));
  }
 }
});

test('changed retained HTML, metadata, or retrieval time use normal preparation',()=>{
 const {raw,original,prior}=fixture('773');
 for(const change of ['html','metadata','retrievedAt']){
  const snapshot=JSON.parse(raw);
  if(change==='html')snapshot.html=snapshot.html.replace('class="dance-show-title"','class="dance-show-title" ');
  if(change==='metadata')snapshot.metadata.updated_at='2026-10-19T00:00:00Z';
  if(change==='retrievedAt')snapshot.retrievedAt='2026-10-19T00:00:00Z';
  const changedRaw=JSON.stringify(snapshot),source=readContraDbSource(changedRaw);
  assert.equal(source.structurallyValid,true,change);
  assert.notDeepEqual(makeContraDbSnapshot(source.record),makeContraDbSnapshot(original),change);
  if(change!=='html')assert.equal(source.record.snapshotId,original.snapshotId,'HTML fingerprint alone cannot establish eligibility');
  const prepared=prepareReadyArchive(changedRaw,source.record,prior),fresh=prepareReadyArchive(changedRaw,source.record);
  assert.equal(prepared.replayed,false,change);assert.equal(prepared.result.coverage.executable,true,change);
  assert.equal(prepared.archive,fresh.archive,change);
  assert.notEqual(prepared.archive,prior.archive,change);
  assert.deepEqual(JSON.parse(prepared.archive).snapshot,JSON.parse(JSON.stringify(makeContraDbSnapshot(source.record))),change);
 }
});

test('raw navigation changes do not invalidate an identical canonical retained snapshot',()=>{
 const {raw,original,prior}=fixture('773'),snapshot=JSON.parse(raw);
 snapshot.html='<!-- different unretained page navigation -->\n'+snapshot.html;
 const changedRaw=JSON.stringify(snapshot),source=readContraDbSource(changedRaw);
 assert.equal(source.structurallyValid,true);
 assert.deepEqual(makeContraDbSnapshot(source.record),makeContraDbSnapshot(original));
 const prepared=prepareReadyArchive(changedRaw,source.record,prior);
 assert.equal(prepared.replayed,true);assert.equal(prepared.archive,prior.archive);
});

test('same-snapshot archives rejected by current admission fail without fresh fallback',()=>{
 const {raw,original,prior}=fixture('773');
 assert.equal(prepareReadyArchive(raw,original).result.coverage.executable,true,'fresh suggestions could otherwise mask a rejected archive');
 for(const damage of ['choices','binding','version','missingChoices']){
  const saved=JSON.parse(prior.archive);
  if(damage==='choices')saved.interpretation.rows['contradb:773:row:2'].balanceBeats=3;
  if(damage==='binding')saved.sourceSnapshotId+='-stale';
  if(damage==='version')saved.version=2;
  if(damage==='missingChoices')delete saved.interpretation.rows;
  assert.throws(()=>prepareReadyArchive(raw,original,{...prior,archive:JSON.stringify(saved)}),/Prior Ready archive failed current admission 773/,damage);
 }
});

test('unreadable prior archives fail closed',()=>{
 const {raw,original,prior}=fixture('773');
 assert.throws(()=>prepareReadyArchive(raw,original,{...prior,archive:'{'}),/Unreadable prior Ready archive 773/);
});
