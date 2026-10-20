import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {prepareContraDbReview} from './source-review.ts';
import {readContraDbImport} from './contradb-import.ts';
import {readContraDbSource,makeContraDbSnapshot} from './contradb-source.ts';
import {starReturnFootnote,starReturnProvenanceDescription} from './source-star-return.ts';
import {linkedTitleProvenance} from './contradb-annotations.ts';
import {READY_LIBRARY} from './ready-library.ts';
const raw=(id:string)=>readFileSync(new URL(`../test-data/contradb/${id}.json`,import.meta.url),'utf8');
const figures=(dance:NonNullable<ReturnType<typeof readContraDbImport>['dance']>)=>dance.figures.map(({id,label,...f})=>f);

test('542 and 3051 retain exact source, separate removable prose choices and existing motion declarations',()=>{
 for(const id of ['542','3051']){
  const p=prepareContraDbReview(raw(id)),r=p.result.record!,d=p.result.dance;
  assert.ok(d,p.result.errors.join('; '));
  assert.equal(r.author,id==='542'?'Bill Olson':'Mattie Rynkiewicz');
  assert.equal(r.publication,'shared everywhere');
  assert.deepEqual(r.rows.map(row=>row.beats),id==='542'?[8,8,8,8,16,8,6,2]:[6,10,6,10,16,8,4,4]);
  assert.equal(d.figures.reduce((sum,f)=>sum+f.beats,0),64);
  assert.equal(d.endPolicy,undefined);assert.equal(d.sixTwoPassPolicy,undefined);
  assert.equal(d.progressionEvents?.length,1);
  assert.equal(d.progressionEvents![0].source.sourceId,r.snapshotId);
  assert.equal(d.progressionEvents![0].source.basis,'source-explicit');
  assert.equal(d.progressionEvents![0].afterFigureId,d.figures.at(-1)!.id);
  assert.deepEqual(JSON.parse(d.sourceText).snapshot,JSON.parse(JSON.stringify(makeContraDbSnapshot(r))));
  assert.deepEqual(readContraDbImport(d.sourceText).dance,d);
  const missing=structuredClone(p.interpretation);delete missing.notesReview;
  assert.equal(readContraDbImport(raw(id),{interpretation:missing}).dance,undefined);
  if(id==='542'){
   assert.equal(p.interpretation.notesReview,'star-return-provenance');
   assert.equal(starReturnFootnote(r)?.id,r.rows[1].id);
   assert.doesNotMatch(starReturnProvenanceDescription(r),/outdoor|variation link/i);
   assert.equal(p.interpretation.rows![r.rows[1].id].starReturn,'entry-slots');
   const c=structuredClone(p.interpretation);delete c.rows![r.rows[1].id].starReturn;
   assert.equal(readContraDbImport(raw(id),{interpretation:c}).dance,undefined);
   assert.deepEqual(figures(d),figures(prepareContraDbReview(raw('522')).result.dance!));
  }else{
   assert.equal(p.interpretation.notesReview,'provenance-only');assert.ok(linkedTitleProvenance(r));
   const c=structuredClone(p.interpretation);delete c.rows![r.rows[5].id].petronella;
   assert.equal(readContraDbImport(raw(id),{interpretation:c}).dance,undefined);
   const prior=prepareContraDbReview(raw('3115')).result.dance!;
   assert.deepEqual(figures(d).slice(0,6),figures(prior).slice(0,6));
   assert.deepEqual(d.figures.slice(-4).map(f=>[f.kind,f.beats]),[['ring-balance',4],['petronella',4],['ring-balance',4],['pass-through',4]]);
  }
 }
 const previous=READY_LIBRARY.find(entry=>entry.id==='682')!;
 assert.deepEqual(readContraDbImport(previous.archive).dance,prepareContraDbReview(raw('682')).result.dance);
});

test('local footnote and linked title review reject changed attachment, extra actions and fake anchors',()=>{
 const cases:Record<string,Array<[string,string]>>={
  '542':[['4 places +','3 places +'],['4 places +','4 places'],['/+ <u>star</u> back where you came from','/+ <u>star</u> back before the box'],['Collected from Liz Burkhart at MMiSL 2018.','Collected from Liz Burkhart at MMiSL 2018. Then clap.']],
  '3051':[['Title from Charli xcx','Title from Charli xcx then clap'],['href="https://www.youtube.com/watch?v=If4-ckGcr0c"','data-href="https://www.youtube.com/watch?v=If4-ckGcr0c"'],['href="https://www.youtube.com/watch?v=If4-ckGcr0c"',`title='href="https://www.youtube.com/watch?v=If4-ckGcr0c"'`],['href="https://www.youtube.com/watch?v=If4-ckGcr0c"','href="https://www.youtube.com/watch?v=If4-ckGcr0c" href="https://example.com"'],['</a></p>','</a> Then turn left.</p>']]
 };
 for(const[id,changes]of Object.entries(cases)){
  const p=prepareContraDbReview(raw(id));assert.ok(p.result.dance);
  for(const[from,to]of changes){
   const snapshot=JSON.parse(raw(id));assert.ok(snapshot.html.includes(from),from);snapshot.html=snapshot.html.replace(from,to);const changed=JSON.stringify(snapshot);
   const changedRecord=readContraDbSource(changed).record;if(changedRecord)assert.notEqual(changedRecord.snapshotId,p.result.record!.snapshotId);
   assert.equal(prepareContraDbReview(changed).result.dance,undefined,`${id} ${from}`);
   assert.equal(readContraDbImport(changed,{interpretation:p.interpretation}).dance,undefined,`${id} existing selection`);
   const archive=JSON.parse(p.result.dance.sourceText);archive.snapshot=snapshot;
   const replay=readContraDbImport(JSON.stringify(archive));assert.equal(replay.dance,undefined);if(changedRecord)assert.ok(replay.diagnostics.some(d=>d.code==='snapshot-binding'));
  }
  const renamed=JSON.parse(raw(id));renamed.html=renamed.html.replace(p.result.record!.title.replaceAll("'",'&#39;'),'Uncatalogued source').replace(p.result.record!.author,'Test Choreographer');
  const r=prepareContraDbReview(JSON.stringify(renamed));assert.ok(r.result.dance,r.result.errors.join('; '));assert.equal(r.result.record!.author,'Test Choreographer');
 }
});

test('1464 clean chained-role composition retains exact receivers, counts and four removable choices',()=>{
 const p=prepareContraDbReview(raw('1464')),r=p.result.record!,d=p.result.dance;
 assert.ok(d,p.result.errors.join('; '));assert.equal(r.title,'Plain Vanilla');assert.equal(r.author,'James Hutson');
 assert.deepEqual([r.hook,r.preamble,r.notes],['','','']);
 assert.deepEqual(r.rows.map(row=>row.beats),[16,8,8,8,8,8,6,2]);
 assert.deepEqual([p.interpretation.rows![r.rows[1].id].chainReceiver,p.interpretation.rows![r.rows[2].id].chainReceiver],['partner','neighbor']);
 assert.deepEqual(d.figures.slice(4,6).map(f=>[f.kind,f.who,f.beats,f.amount]),[['do-si-do','robins',8,1.5],['swing','partner',8,undefined]]);
 assert.equal(d.figures.reduce((sum,f)=>sum+f.beats,0),64);assert.equal(d.progressionEvents?.length,1);
 assert.equal(d.progressionEvents![0].source.sourceId,r.snapshotId);assert.equal(d.progressionEvents![0].source.basis,'source-explicit');
 assert.equal(d.progressionEvents![0].afterFigureId,d.figures.at(-1)!.id);
 assert.deepEqual(JSON.parse(d.sourceText).snapshot,JSON.parse(JSON.stringify(makeContraDbSnapshot(r))));assert.deepEqual(readContraDbImport(d.sourceText).dance,d);
 let withdrawals=0;for(const[row,choices]of Object.entries(p.interpretation.rows??{}))for(const key of Object.keys(choices)){const c=structuredClone(p.interpretation);delete(c.rows![row]as Record<string,unknown>)[key];assert.equal(readContraDbImport(raw('1464'),{interpretation:c}).dance,undefined,`${row}.${key}`);withdrawals++;}assert.equal(withdrawals,4);
});
