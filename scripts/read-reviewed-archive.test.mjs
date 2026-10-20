import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {readContraDbSource} from '../src/contradb-source.ts';
import {prepareReadyArchive} from './prepare-ready-archive.mjs';
import {readReviewedArchive,validateReviewedArchive} from './read-reviewed-archive.mjs';
const raw=readFileSync(new URL('../test-data/contradb/3478.json',import.meta.url),'utf8');
const original=readContraDbSource(raw).record;
const explicit=readReviewedArchive(original);
test('an explicit review resolves a retained uncertain note without changing automatic suggestions',()=>{
 assert.ok(explicit);assert.equal(prepareReadyArchive(raw,original).result.dance,undefined);
 const p=prepareReadyArchive(raw,original,explicit);assert.ok(p.result.dance);assert.equal(p.replayed,true);
 assert.equal(p.archive,explicit.archive);assert.equal(p.result.dance.contraDbInterpretation.notesReview,'provenance-only');
 assert.equal(p.result.dance.contraDbInterpretation.rows['contradb:3478:row:2'].chainReceiver,'partner');
});
test('absent explicit review leaves ordinary preparation available',()=>{
 const source=readContraDbSource(readFileSync(new URL('../test-data/contradb/823.json',import.meta.url),'utf8')).record;
 assert.equal(readReviewedArchive(source),undefined);
});
test('explicit reviews reject stale metadata, retrieval time, HTML, binding and schema without fallback',()=>{
 for(const damage of ['metadata','retrievedAt','html','binding','schema','version']){
  const saved=JSON.parse(explicit.archive);
  if(damage==='metadata')saved.snapshot.metadata={different:true};
  if(damage==='retrievedAt')saved.snapshot.retrievedAt='2000-01-01T00:00:00Z';
  if(damage==='html')saved.snapshot.html+=' ';
  if(damage==='binding')saved.sourceSnapshotId+='-stale';
  if(damage==='schema')saved.schema='invalid';
  if(damage==='version')saved.version=2;
  assert.throws(()=>validateReviewedArchive(JSON.stringify(saved),original),/explicit reviewed archive/i,damage);
 }
 assert.throws(()=>validateReviewedArchive('{',original),/Unreadable explicit/);
});
test('explicit archive loading never waives current semantic admission',()=>{
 for(const damage of ['notes','receiver']){
  const saved=JSON.parse(explicit.archive);
  if(damage==='notes')delete saved.interpretation.notesReview;
  else saved.interpretation.rows['contradb:3478:row:2'].chainReceiver='neighbor';
  const entry=validateReviewedArchive(JSON.stringify(saved),original);
  assert.throws(()=>prepareReadyArchive(raw,original,entry),/failed current admission/);
 }
});
