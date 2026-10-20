import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {prepareContraDbReview} from './source-review.ts';
import {readContraDbImport} from './contradb-import.ts';
import {readContraDbSource,makeContraDbSnapshot} from './contradb-source.ts';
import {compileChoreography} from './choreography.ts';
const raw=(id:string)=>readFileSync(new URL(`../test-data/contradb/${id}.json`,import.meta.url),'utf8');
function reviewed(id:string){const input=raw(id),p=prepareContraDbReview(input);if(id==='3478'){p.interpretation.notesReview='provenance-only';p.interpretation.rows??={};p.interpretation.rows['contradb:3478:row:2']={chainReceiver:'partner'};}return readContraDbImport(input,{interpretation:p.interpretation});}
test('literal Duple Improper is an alias without rewriting the retained source',()=>{
 const r=reviewed('823');assert.ok(r.dance,r.errors.join('; '));assert.equal(r.record!.formation,'Duple Improper');
 assert.equal(r.dance.formation,'duple-improper');
 const archived=JSON.parse(r.dance.sourceText!);assert.deepEqual(archived.snapshot,JSON.parse(JSON.stringify(makeContraDbSnapshot(readContraDbSource(raw('823')).record!))));
 assert.equal(r.dance.contraDbInterpretation.rows!['contradb:823:row:4'].chainReceiver,'neighbor');
});
test('formation aliases remain exact and do not erase setup qualifiers',()=>{
 const source=JSON.parse(raw('823'));
 for(const formation of ['Duple Improper; begins progressed','Duple Improper double progression','Duple Neutral','Duple Proper','Triple Improper']){
  const changed={...source,html:source.html.replace('Duple Improper',formation)};
  const result=prepareContraDbReview(JSON.stringify(changed)).result;
  assert.equal(result.dance,undefined,formation);assert.ok(result.diagnostics.some(d=>d.code==='formation'),formation);
 }
});
test('3478 retains explicit family-provenance classification and actual partner receiver',()=>{
 const r=reviewed('3478');assert.ok(r.dance,r.errors.join('; '));
 assert.equal(r.record!.notes,'Yet another member of the Small Potatoes / Fingerling Potatoes / Push the Button family');
 const choices=structuredClone(r.dance.contraDbInterpretation);delete choices.notesReview;
 assert.equal(readContraDbImport(raw('3478'),{interpretation:choices}).dance,undefined);
 choices.notesReview='provenance-only';choices.rows!['contradb:3478:row:2'].chainReceiver='neighbor';
 assert.equal(readContraDbImport(raw('3478'),{interpretation:choices}).dance,undefined);
 assert.deepEqual(readContraDbImport(r.dance.sourceText!).dance,r.dance);
});
for(const id of ['823','3478'])for(const couples of [3,4])test(`${id} complete ${couples}-couple period retains joins and closure`,()=>{
 const r=reviewed(id);assert.ok(r.dance,r.errors.join('; '));const p=compileChoreography(r.dance,couples),end=couples*2*64;
 assert.equal(p.totalBeats,64);
 for(let beat=0;beat<=end;beat+=.5){const f=p.sample(beat);assert.equal(f.poses.length,couples*2);for(const q of f.poses)assert.ok(Number.isFinite(q.position.x+q.position.z+q.yaw));}
 for(let repeat=0;repeat<couples*2;repeat++)for(const local of [...p.starts,64]){const beat=repeat*64+local;if(!beat)continue;const a=p.sample(beat-1e-6),b=p.sample(beat);for(const q of b.poses){const prior=a.poses.find(x=>x.id===q.id)!;assert.ok(Math.hypot(q.position.x-prior.position.x,q.position.z-prior.position.z)<2e-5);assert.ok(Math.abs(Math.atan2(Math.sin(q.yaw-prior.yaw),Math.cos(q.yaw-prior.yaw)))<2e-5);}}
 assert.deepEqual(p.sample(end).poses,p.sample(0).poses);assert.deepEqual(p.sample(end).contacts,p.sample(0).contacts);
});
