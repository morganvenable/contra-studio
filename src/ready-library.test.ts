import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {READY_LIBRARY} from './ready-library.ts';
import {REVIEWED_SOURCE_IDS} from './source-library.ts';
import {readContraDbImport} from './contradb-import.ts';
import {readContraDbSource,makeContraDbSnapshot} from './contradb-source.ts';
import {compileChoreography} from './choreography.ts';

test('every reviewed source has a local exact archive with its reviewed choices and playable default program',()=>{
 assert.deepEqual(new Set(READY_LIBRARY.map(item=>item.id)),new Set(REVIEWED_SOURCE_IDS));
 assert.equal(READY_LIBRARY.length,REVIEWED_SOURCE_IDS.size);
 assert.ok(Object.isFrozen(READY_LIBRARY));
 const oldFetch=globalThis.fetch;let requests=0;
 globalThis.fetch=(async()=>{requests++;throw Error('network disabled');}) as typeof fetch;
 try{for(const item of READY_LIBRARY){
  assert.ok(Object.isFrozen(item));
  const raw=readFileSync(new URL(`../test-data/contradb/${item.id}.json`,import.meta.url),'utf8');
  const source=readContraDbSource(raw).record;assert.ok(source,item.id);
  const archive=JSON.parse(item.archive);
  assert.equal(archive.schema,'contra-studio/contradb-interpretation');
  assert.equal(archive.sourceSnapshotId,source.snapshotId,item.id);
  assert.deepEqual(archive.snapshot,JSON.parse(JSON.stringify(makeContraDbSnapshot(source))),item.id);
  assert.equal(item.title,source.title);assert.equal(item.author,source.author);
  const result=readContraDbImport(item.archive);assert.ok(result.dance,`${item.id}: ${result.errors.join('; ')}`);
  assert.equal(result.coverage.executable,true,item.id);
  const program=compileChoreography(result.dance,6);assert.equal(program.totalBeats,64,item.id);
  const first=program.sample(0),next=program.sample(.5);
  assert.equal(first.poses.length,12,item.id);assert.equal(next.poses.length,12,item.id);
  for(const frame of[first,next,program.sample(63.99),program.sample(64)])for(const pose of frame.poses)assert.ok(Number.isFinite(pose.position.x+pose.position.z+pose.yaw),item.id);
  assert.notDeepEqual(first.poses,next.poses,item.id+' starts moving');
 }}finally{globalThis.fetch=oldFetch;}
 assert.equal(requests,0);
});
