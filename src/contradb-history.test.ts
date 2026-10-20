import {REGISTERED_MOTION_CAPABILITIES} from './capabilities.ts';
import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {corroboratedSourceHistory} from './source-history.ts';import {classifySourceHook} from './source-hook.ts';
import {prepareContraDbReview} from './source-review.ts';import {readContraDbImport} from './contradb-import.ts';import {readContraDbSource,type ContraDbRecord} from './contradb-source.ts';
const raw=(id:number)=>readFileSync(new URL(`../test-data/contradb/${id}.json`,import.meta.url),'utf8');
const source=(id:number)=>readContraDbSource(raw(id)).record!;
const changedRow=(r:ContraDbRecord,index:number,change:object):ContraDbRecord=>({...r,rows:r.rows.map((row,i)=>i===index?{...row,...change}:row)});

test('actual current-version history is a removable source-bound choice, retaining all historical text and exact archive',()=>{
 for(const id of[881,65]){const p=prepareContraDbReview(raw(id)),r=p.result;assert.ok(r.dance,JSON.stringify(r.errors));if(id===881){const disabled=readContraDbImport(raw(id),{interpretation:p.interpretation,capabilities:{...REGISTERED_MOTION_CAPABILITIES,swingStartSequences:false}});assert.equal(disabled.dance,undefined);assert.match(disabled.errors.join(' '),/bare opening swing.*initial closed frame.*first swing count/i);}assert.equal(p.interpretation.notesReview,'corroborated-history');assert.equal(r.record!.notes,source(id).notes);const figures=r.rows.flatMap(row=>row.figures);assert.equal(figures.reduce((n,f)=>n+f.beats,0),64);assert.equal(figures.filter(f=>f.progression).length,1);assert.equal(r.coverage.resolvedRows,r.rows.length);assert.match(r.warnings.join('\n'),/Snapshot-bound current-version history review/);
  const archive=r.dance?.sourceText??JSON.stringify({schema:'contra-studio/contradb-interpretation',version:1,sourceSnapshotId:r.record!.snapshotId,snapshot:JSON.parse(raw(id)),interpretation:p.interpretation});const replay=readContraDbImport(archive);assert.deepEqual(replay.record,r.record);assert.deepEqual(replay.interpretation,p.interpretation);assert.deepEqual(replay.rows.flatMap(row=>row.figures),figures);assert.deepEqual(replay.dance?.figures,r.dance!.figures);
  for(const notesReview of[undefined,'provenance-only','corroborated-style-and-provenance']as const){const c={...p.interpretation,notesReview};const blocked=readContraDbImport(raw(id),{interpretation:c});assert.equal(blocked.dance,undefined);assert.ok(blocked.diagnostics.some(d=>d.code==='source-notes-history-review'));}
 }
 assert.match(source(65).notes,/Originally.*neighbor do-si-do 1 1\/2/);assert.ok(!prepareContraDbReview(raw(65)).result.dance!.figures.some(f=>f.kind==='do-si-do'));
 assert.match(prepareContraDbReview(raw(881)).result.warnings.join('\n'),/does not supply an inferred duration/);
});

test('phrase-variation evidence binds the complete A1 and A2 intervals, current role, hand and amount',()=>{
 const r=source(881);assert.equal(corroboratedSourceHistory(r)?.kind,'phrase-variation');
 for(const candidate of[
  changedRow(r,0,{beats:12}),changedRow(r,0,{phrase:'B1'}),changedRow(r,0,{text:'partners long swing'}),changedRow(r,0,{text:'neighbors long swing then clap'}),changedRow(r,0,{progression:true}),
  changedRow(r,1,{beats:4}),changedRow(r,2,{phrase:'B2'}),changedRow(r,2,{text:'gentlespoons allemande right 1½'}),changedRow(r,2,{text:'ladles allemande left 1½'}),changedRow(r,2,{text:'ladles allemande right once'}),changedRow(r,2,{text:'only ones ladles allemande right 1½'}),changedRow(r,2,{text:'ladles allemande right 1½ then stamp'}),
  {...r,notes:r.notes+' Then clap.'},{...r,notes:r.notes.replace('Longer swing','No swing')},{...r,notes:r.notes.replace('RIGHT','LEFT')},{...r,notes:r.notes.replace('The Big Easy','Another title')},
 ])assert.equal(corroboratedSourceHistory(candidate),undefined,JSON.stringify(candidate.notes));
 const renamed={...r,title:'A Distinct Name variation',notes:r.notes.replace('The Big Easy','A Distinct Name'),sourceId:'987654'};assert.equal(corroboratedSourceHistory(renamed)?.kind,'phrase-variation','grammar is not a title or source-ID allowlist');
});

test('replacement history requires the current ring-four/pass-four tail and exactly one final source marker',()=>{
 const r=source(65);assert.equal(corroboratedSourceHistory(r)?.kind,'terminal-replacement');
 for(const candidate of[
  changedRow(r,4,{text:'circle right 3 places'}),changedRow(r,5,{beats:8}),changedRow(r,5,{phrase:'B1'}),changedRow(r,5,{text:'balance the ring and clap'}),changedRow(r,5,{progression:true}),changedRow(r,6,{beats:2}),changedRow(r,6,{progression:false}),changedRow(r,6,{text:'pass through across the set ⁋'}),changedRow(r,6,{text:'pass through to new neighbors ⁋ and stamp'}),
  {...r,notes:r.notes+' Otherwise do the original.'},{...r,notes:r.notes.replace('usually swap','might optionally swap')},{...r,notes:r.notes.replace('neighbor do-si-do 1 1/2','partner do-si-do 1 1/2')},{...r,notes:r.notes.replace('ring balance and pass through','pass through and ring balance')},
 ])assert.equal(corroboratedSourceHistory(candidate),undefined,JSON.stringify(candidate.notes));
 for(const hook of['simple with double progression','simple with reverse progression','simple with easy progression then clap','no, simple with easy progression'])assert.equal(classifySourceHook({...r,hook}).kind,'review',hook);
 assert.equal(classifySourceHook(r).kind,'corroborating');assert.equal(classifySourceHook(changedRow(r,6,{progression:false})).kind,'review');
});

test('fresh changed history and source timing reject both prepared and remembered classification without altering raw source',()=>{
 for(const [id,from,to]of[[881,'RIGHT in A2.','RIGHT in A2. Then clap.'],[65,'usually swap','sometimes optionally swap']]as const){const p=prepareContraDbReview(raw(id)),s=JSON.parse(raw(id));assert.ok(s.html.includes(from));s.html=s.html.replace(from,to);const input=JSON.stringify(s),changed=prepareContraDbReview(input,[{sourceSnapshotId:p.result.record!.snapshotId,interpretation:p.interpretation}]);assert.equal(changed.result.dance,undefined);assert.notEqual(changed.result.record!.snapshotId,p.result.record!.snapshotId);assert.ok(!changed.suggestions.some(s=>s.kind==='remembered'));assert.equal(readContraDbImport(input,{interpretation:p.interpretation}).dance,undefined);assert.ok(changed.result.record!.notes.includes(to.replace(/<[^>]+>/g,'')));}
});
