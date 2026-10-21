import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {readContraDbSource,makeContraDbSnapshot} from '../src/contradb-source.ts';
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

test('3326 explicit archive preserves unmarked source and all removable review decisions',()=>{
 const raw=readFileSync(new URL('../test-data/contradb/3326.json',import.meta.url),'utf8'),record=readContraDbSource(raw).record,entry=readReviewedArchive(record);
 assert.ok(entry);assert.equal(prepareReadyArchive(raw,record).result.dance,undefined);
 const saved=JSON.parse(entry.archive),p=prepareReadyArchive(raw,record,entry),d=p.result.dance;
 assert.ok(d);assert.equal(p.replayed,true);assert.equal(p.archive,entry.archive);
 assert.deepEqual(saved.snapshot,JSON.parse(JSON.stringify(makeContraDbSnapshot(record))));assert.equal(saved.sourceSnapshotId,record.snapshotId);
 assert.deepEqual(saved.interpretation,{rows:{'contradb:3326:row:2':{squareThrough:{phaseBeats:[4,2,2]}},'contradb:3326:row:6':{chainReceiver:'neighbor'}},progression:'end-of-cycle',notesReview:'provenance-only'});
 assert.deepEqual(d.sourceRecord,record);assert.ok(record.rows.every(row=>row.progression===false));assert.equal(record.rows.reduce((sum,row)=>sum+row.beats,0),64);
 assert.equal(d.progressionEvents[0].source.basis,'reviewed-interpretation');assert.equal(d.progressionEvents[0].source.sourceId,record.snapshotId);
 for(const damage of ['notes','progression','receiver','squareThrough']){
  const altered=structuredClone(saved);
  if(damage==='notes')delete altered.interpretation.notesReview;
  if(damage==='progression')delete altered.interpretation.progression;
  if(damage==='receiver')altered.interpretation.rows['contradb:3326:row:6'].chainReceiver='partner';
  if(damage==='squareThrough')delete altered.interpretation.rows['contradb:3326:row:2'].squareThrough;
  assert.throws(()=>prepareReadyArchive(raw,record,validateReviewedArchive(JSON.stringify(altered),record)),/failed current admission/,damage);
 }
});
