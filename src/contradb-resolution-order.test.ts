import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {prepareContraDbReview} from './source-review.ts';import {readContraDbImport} from './contradb-import.ts';import {makeContraDbSnapshot} from './contradb-source.ts';import {REGISTERED_MOTION_CAPABILITIES} from './capabilities.ts';
const raw=(id:string)=>readFileSync(new URL(`../test-data/contradb/${id}.json`,import.meta.url),'utf8');

test('receiver candidates are fully validated before dependent source prose is corroborated',()=>{
 let composition:unknown;
 for(const id of ['1420','1434','1496']){
  const p=prepareContraDbReview(raw(id)),r=p.result.record!,d=p.result.dance;assert.ok(d,p.result.errors.join('; '));
  assert.equal(r.title,id==='1420'?'First dance':'First dance variation');assert.equal(r.author,'Don Flaherty');assert.equal(r.publication,id==='1496'?'shared to sketchbook':'shared everywhere');
  assert.deepEqual(r.rows.map(row=>row.beats),[16,8,8,8,8,8,4,4]);assert.equal(d.figures.reduce((sum,f)=>sum+f.beats,0),64);
  assert.equal(r.rows.filter(row=>row.progression).length,1);assert.equal(r.rows.at(-1)!.progression,true);
  assert.equal(p.interpretation.rows![r.rows[1].id].chainReceiver,'partner');assert.equal(p.interpretation.preambleReview,'pre-dance-walkthrough-feedback');assert.equal(p.interpretation.notesReview,'retain-table-optional-alternative');
  assert.deepEqual(JSON.parse(d.sourceText).snapshot,JSON.parse(JSON.stringify(makeContraDbSnapshot(r))));assert.deepEqual(readContraDbImport(d.sourceText).dance,d);
  const normalized=d.figures.map(({id,label,...figure})=>figure);if(composition)assert.deepEqual(normalized,composition);else composition=normalized;
  for(const key of ['preambleReview','notesReview','chainReceiver']){const c=structuredClone(p.interpretation);if(key==='chainReceiver')delete c.rows![r.rows[1].id].chainReceiver;else delete c[key as 'preambleReview'|'notesReview'];assert.equal(readContraDbImport(raw(id),{interpretation:c}).dance,undefined,key);}
  const wrong=structuredClone(p.interpretation);wrong.rows![r.rows[1].id].chainReceiver='neighbor';assert.equal(readContraDbImport(raw(id),{interpretation:wrong}).dance,undefined);
 }
});

test('failed candidate branches cannot waive prose or mutate saved and unsolved choices',()=>{
 const text=raw('1420'),p=prepareContraDbReview(text),r=p.result.record!;assert.ok(p.result.dance);
 const wrong=structuredClone(p.interpretation);wrong.rows![r.rows[1].id].chainReceiver='neighbor';const before=structuredClone(wrong);
 const remembered=prepareContraDbReview(text,[{sourceSnapshotId:r.snapshotId,interpretation:wrong}]);assert.equal(remembered.result.dance,undefined);assert.deepEqual(remembered.interpretation,before);assert.deepEqual(wrong,before);assert.deepEqual(remembered.suggestions.map(s=>s.kind),['remembered']);
 const disabled=prepareContraDbReview(text,[],{...REGISTERED_MOTION_CAPABILITIES,ringPassThroughs:false});assert.equal(disabled.result.dance,undefined);assert.equal(disabled.interpretation.rows?.[r.rows[1].id]?.chainReceiver,undefined);assert.equal(disabled.interpretation.preambleReview,p.interpretation.preambleReview);assert.equal(disabled.interpretation.notesReview,p.interpretation.notesReview);
 const mutations=[['thanks Don Flaherty','thanks Don Flaherty Then clap'],['<u>do si do</u> new <u>neighbors</u>','<u>do si do</u> new <u>neighbors</u> Then turn left'],['href="mailto:do14flah@aol.com"','data-href="mailto:do14flah@aol.com"']];
 for(const[from,to]of mutations){const snapshot=JSON.parse(text);assert.ok(snapshot.html.includes(from),from);snapshot.html=snapshot.html.replace(from,to);const changed=JSON.stringify(snapshot),result=prepareContraDbReview(changed);assert.equal(result.result.dance,undefined,from);assert.equal(result.interpretation.rows?.[r.rows[1].id]?.chainReceiver,undefined,from);assert.equal(readContraDbImport(changed,{interpretation:p.interpretation}).dance,undefined,from);const archive=JSON.parse(p.result.dance.sourceText);archive.snapshot=snapshot;assert.equal(readContraDbImport(JSON.stringify(archive)).dance,undefined);}
});
