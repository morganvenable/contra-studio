import test from 'node:test';
import assert from 'node:assert/strict';
import {compileInitialWaveSequence,type InitialWaveProgram,type InitialWaveStep} from './initial-wave-source-sequence.ts';
import {candidate,syntheticWaveBalanceCandidate} from '../test-data/initial-wave/programs.ts';
for(const couples of [2,3,4,5,6,7,8,9,10,11,12])test(`explicit paired-balance wave candidate preserves finite ${couples}-couple period`,()=>{
 const c=compileInitialWaveSequence(candidate(),couples);
 assert.equal(c.totalBeats,64);assert.equal(c.periodRepeats,2*couples);
 const a=c.sample(0),b=c.sample(c.periodRepeats*64);
 for(const p of a.poses){assert.ok(Math.hypot(p.position.x-b.poses[p.id].position.x,p.position.z-b.poses[p.id].position.z)<1e-7);assert.ok(Math.abs(Math.atan2(Math.sin(p.yaw-b.poses[p.id].yaw),Math.cos(p.yaw-b.poses[p.id].yaw)))<1e-7);}
 assert.ok(c.proofs.some(p=>p.policy==='strict-full-wave'));
 for(let repeat=0;repeat<c.periodRepeats;repeat++){
  const at=repeat*64,ledger=c.topology(at),before=at?c.topology(at-1e-7):ledger;
  assert.equal(ledger.epoch,repeat);assert.deepEqual(ledger.partners,c.topology(0).partners);
  const sample=c.sample(at),active=new Set(ledger.neighbors.flat());
  assert.equal(active.size+ledger.waitingIds.length,2*couples);
  for(const id of ledger.waitingIds)assert.ok(!active.has(id));
  for(const [a,b]of ledger.neighbors)assert.ok(sample.contacts.some(h=>(h.a===a&&h.b===b||h.a===b&&h.b===a)&&h.handA==='right'&&h.handB==='right'&&h.strength===1));
  if(repeat)assert.equal(before.epoch,repeat-1);
 }
 assert.ok(Object.isFrozen(c.program)&&Object.isFrozen(c.dancers)&&Object.isFrozen(c.proofs));
 const ledger=c.topology(0);ledger.neighbors[0][0]=999;assert.notEqual(c.topology(0).neighbors[0][0],999);
 for(let repeat=0;repeat<c.periodRepeats;repeat++)for(const count of [8,16,20,32,40,48,56,64]){
  const boundary=repeat*64+count,before=c.sample(boundary-1e-7),after=c.sample(boundary);
  for(const p of before.poses){
   assert.ok(Math.hypot(p.position.x-after.poses[p.id].position.x,p.position.z-after.poses[p.id].position.z)<1e-5,`Root join at ${boundary}`);
   assert.ok(Math.abs(Math.atan2(Math.sin(p.yaw-after.poses[p.id].yaw),Math.cos(p.yaw-after.poses[p.id].yaw)))<1e-5,`Facing join at ${boundary}`);
  }
  const edge=(h:typeof before.contacts[number])=>`${h.a}/${h.handA}:${h.b}/${h.handB}:${h.kind}`;
  for(const h of before.contacts.filter(h=>h.strength>1e-6)){
   const next=after.contacts.find(n=>edge(n)===edge(h));assert.ok(next,`Held contact lost at ${boundary}`);
   assert.ok(Math.abs(h.strength-next.strength)<1e-5);
  }
 }
});
test('a local balance cannot silently discard full-wave hands',()=>{
 const p=candidate();delete (p.steps[1] as any).spec.exit;
 assert.throws(()=>compileInitialWaveSequence(p,2),/discard a complete carried wave/);
});
test('explicit program rejects unknown fields and contradictory lowering before motion',()=>{
 const policy=candidate();(policy.dance as any).ovalPolicy={};assert.throws(()=>compileInitialWaveSequence(policy,2),/unconsumed/);
 const flag=candidate();delete flag.steps.at(-1)!.figure.progression;assert.throws(()=>compileInitialWaveSequence(flag,2),/endpoint/);
 const evidence=candidate();evidence.dance.sourceUrl='https://example.com/different';assert.throws(()=>compileInitialWaveSequence(evidence,2),/retained source/);
 const snapshot=candidate();(snapshot.dance as any).sourceRecord={snapshotId:'different',sourceUrl:'https://contradb.com/dances/187'};assert.throws(()=>compileInitialWaveSequence(snapshot,2),/retained source/);
 const extra=candidate();(extra.initial as any).resetPositions=true;
 assert.throws(()=>compileInitialWaveSequence(extra,2),/unconsumed/);
 const roles=candidate();(roles.steps[0] as any).spec.crossRole='lark';
 assert.throws(()=>compileInitialWaveSequence(roles,2),/contradicts/);
 const hey=candidate();(hey.steps.at(-1) as any).centerShoulder='left';
 assert.throws(()=>compileInitialWaveSequence(hey,2),/contradicts/);
 const prep=candidate();(prep.steps[6] as any).preparation.teleport=true;
 assert.throws(()=>compileInitialWaveSequence(prep,2),/unconsumed/);
 const wrongPrep=candidate();(wrongPrep.steps[4] as any).preparation={receiverYield:.3};
 assert.throws(()=>compileInitialWaveSequence(wrongPrep,2),/supported chain yield/);
 const counts=candidate();counts.steps[0].figure.beats=4;
 assert.throws(()=>compileInitialWaveSequence(counts,2),/contradicts/);
});

for(const couples of [2,3,4,5,6,7,8,9,10,11,12])test(`synthetic wave-balance path preserves finite ${couples}-couple period`,()=>{
 const c=compileInitialWaveSequence(syntheticWaveBalanceCandidate(),couples);assert.equal(c.periodRepeats,2*couples);
});

test('playback exposes frame metadata, moving gait, and owned program data',()=>{
 const input=syntheticWaveBalanceCandidate(),c=compileInitialWaveSequence(input,3);
 assert.equal(c.repeatable,true);assert.deepEqual(c.starts,[0,8,16,20,32,40,48,56]);assert.equal(c.geometry.rowGap,1.28);
 // The renderer samples before beat zero while planning its opening footplant.
 assert.deepEqual(c.sample(-.5),c.sample(0));assert.deepEqual(c.topology(-1),c.topology(0));
 assert.throws(()=>c.sample(NaN));assert.throws(()=>c.sample(Infinity));
 const frame=c.sample(21);assert.equal(frame.figureIndex,3);assert.equal(frame.localBeat,21);assert.equal(frame.figureProgress,1/12);assert.ok(frame.poses.some(p=>p.activity==='swing'&&p.stride>0));
 const waiting=new Set(c.topology(2).waitingIds);assert.ok(c.sample(2).poses.some(p=>waiting.has(p.id)&&p.stride>0));assert.ok(c.sample(12).poses.filter(p=>waiting.has(p.id)).every(p=>p.stride===0));
 const chain=c.sample(54);assert.ok(chain.poses.some(p=>p.chainCourtesyPreparation));
 input.dance.title='Mutated caller title';input.initial.rowGap=999 as any;assert.notEqual(c.dance.title,input.dance.title);assert.equal(c.geometry.rowGap,1.28);
 assert.throws(()=>{c.dancers[0].role='robin';},TypeError);
 frame.poses[0].position.x=999;assert.notEqual(c.sample(21).poses[0].position.x,999);
});
