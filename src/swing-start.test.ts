import test from 'node:test';
import assert from 'node:assert/strict';
import {compileSwingStartPass,type SwingStartPassOptions} from './swing-start-pass.ts';
import {compileRingPass} from './ring-pass.ts';
import {compileSwingStartImproper} from './swing-start-sequence.ts';
import {compileChoreography} from './choreography.ts';
import {compileDance} from './engine.ts';
import {openingSwingFixture,swingStartCapabilities as caps} from '../test-data/swing-start/fixture.ts';
import {heading,turn} from './ring-twirl-contract.ts';
import type {Dancer,Frame,Pose} from './types.ts';
const distance=(a:Pose,b:Pose)=>Math.hypot(a.position.x-b.position.x,a.position.z-b.position.z);
const corners=(p:Pose[])=>[...p].sort((a,b)=>{const slot=(p:Pose)=>p.position.z<0?(p.position.x<0?0:1):(p.position.x>0?2:3);return slot(a)-slot(b);}).map(p=>p.id);
const hands=(f:Frame,a:number,b:number)=>f.contacts.filter(c=>c.kind==='swing-frame'&&(c.a===a&&c.b===b||c.a===b&&c.b===a));
function passFixture(mixed=false):SwingStartPassOptions {
 const points=[[.55,-.55],[-.55,-.55],[-.55,.55],[.55,.55]],actors:Dancer[]=points.map((_,id)=>({id,name:`Actor ${id}`,role:id%2?'robin':'lark',couple:Math.floor(id/2),direction:id<2?1:-1,color:'#438b86'})),pairs=(p:number[][])=>new Map(p.flatMap(([a,b])=>[[a,b],[b,a]]));
 const entry=new Map(points.map(([x,z],id)=>[id,{position:{x,z},yaw:heading({x,z},{x:0,z:0}),velocity:{x:0,z:0},yawRate:0}])),exit=new Map(points.map(([x,z],id)=>{const active=!mixed||id<2;return[id,{position:{x:Math.sign(x)*.9,z:-Math.sign(z)*(active?1.49:.9)},yaw:(z<0?0:Math.PI)+(active?Math.PI/3:0),velocity:{x:0,z:0},yawRate:0}];}));
 return{actors,entry,exit,relations:{epoch:3,partner:pairs([[0,1],[2,3]]),neighbor:pairs([[0,3],[1,2]])},bindingEpoch:3,cyclicIds:[1,0,3,2],frame:{origin:{x:0,z:0},axis:{x:0,z:1}},beats:4,relation:'neighbor',passingShoulder:'right'};
}
test('the distinct next-swing pass preserves right shoulders, explicit destinations and ordinary pass bounds',()=>{
 for(const mixed of[false,true]){const options=passFixture(mixed),p=compileSwingStartPass(options);assert.throws(()=>compileRingPass(options),/progressed|destination|ring|crossing/i);for(const beat of[0,4])for(const pose of p.sample(beat).poses){const expected=(beat===0?options.entry:options.exit).get(pose.id)!;assert.ok(Math.hypot(pose.position.x-expected.position.x,pose.position.z-expected.position.z)<1e-9);assert.ok(Math.abs(turn(pose.yaw,expected.yaw))<1e-9);}
  for(const gate of p.gates){const poses=p.sample(gate.beat).poses;for(const [a,b]of[gate.pair,[...gate.pair].reverse()]){const A=poses.find(p=>p.id===a)!,B=poses.find(p=>p.id===b)!;assert.ok((B.position.x-A.position.x)*-Math.cos(A.yaw)+(B.position.z-A.position.z)*Math.sin(A.yaw)>.62);}}
  assert.equal(p.sample(.4).contacts.length,0);assert.ok(p.maximumObservedSpeed<=1.35);assert.ok(p.minimumObservedClearance>=.62);const before=p.sample(2);options.entry.get(0)!.position.x=99;options.exit.get(0)!.position.z=99;options.actors[0].role='robin';(options.relations.neighbor as Map<number,number>).clear();assert.deepEqual(p.sample(2),before);assert.throws(()=>{p.exit.get(0)!.position.x=7;});
 }
 for(const change of[{beats:8},{passingShoulder:'left'},{bindingEpoch:4}])assert.throws(()=>compileSwingStartPass({...passFixture(),...change}as SwingStartPassOptions));const wrong=passFixture();wrong.exit.get(0)!.position.z=1.25;assert.throws(()=>compileSwingStartPass(wrong),/destinations/);
});
test('the staged prepared-swing pass rejects unknown top-level or hall-frame options',()=>{const extra=passFixture();(extra as any).extraTravel=true;assert.throws(()=>compileSwingStartPass(extra),/unknown/);const frame=passFixture();(frame.frame as any).mirror=true;assert.throws(()=>compileSwingStartPass(frame),/unknown/);});

test('actual881 opens and repeats in an explicitly held frame, with exact corners and all finite encounters',()=>{
 const dance=openingSwingFixture(),two=compileChoreography(dance,2,caps),logical=two.formationSample??two.sample;
 for(const[beat,expected]of[[0,[1,0,3,2]],[16,[2,3,0,1]],[24,[2,3,0,1]],[32,[2,1,0,3]],[48,[2,1,0,3]],[56,[1,0,3,2]],[60,[1,0,3,2]],[64-1e-7,[2,3,0,1]]]as const)assert.deepEqual(corners(logical(beat).poses),expected,`source corner ${beat}`);
 for(let n=2;n<=12;n++){const c=compileChoreography(dance,n,caps)as ReturnType<typeof compileSwingStartImproper>,encounters=new Set<string>();assert.equal(c.totalBeats,64);assert.equal(c.repeatable,true);assert.equal(c.periodRepeats,2*n);
  for(let repeat=0;repeat<2*n;repeat++){const at=repeat*64,start=c.sample(at),topology=c.topology(at);assert.equal(topology.epoch,repeat);for(const[a,b]of topology.neighbors){encounters.add([c.dancers[a].couple,c.dancers[b].couple].sort((a,b)=>a-b).join(':'));assert.equal(hands(start,a,b).length,3);assert.ok(hands(start,a,b).every(h=>h.strength>=1-1e-9));const next=c.sample(at+.25),angle=(f:Frame)=>Math.atan2(f.poses[a].position.z-f.poses[b].position.z,f.poses[a].position.x-f.poses[b].position.x);assert.ok(Math.abs(turn(angle(next),angle(start)))>.05);}
   for(const local of[...c.starts,64]){const beat=at+local;if(!beat)continue;const before=c.sample(beat-1e-7),after=c.sample(beat);for(const p of after.poses){assert.ok(distance(p,before.poses[p.id])<2e-5,`root ${n}/${beat}/${p.id}`);assert.ok(Math.abs(turn(p.yaw,before.poses[p.id].yaw))<2e-5,`yaw ${n}/${beat}/${p.id}`);}}
   for(const id of topology.waitingIds)assert.ok(distance(c.sample(at+20).poses[id],c.sample(at+55).poses[id])<1e-9);
   for(const local of[60,61,62,63,63.8]){const f=c.sample(at+local),occupied=new Set<string>();for(const h of f.contacts){for(const slot of[`${h.a}:${h.handA}`,...(!h.target||h.target==='hands'?[`${h.b}:${h.handB}`]:[])]){assert.ok(!occupied.has(slot),`overbooked ${n}/${at+local}/${slot}`);occupied.add(slot);}}assert.equal(c.topology(at+local).epoch,repeat);}
  }
  assert.equal(encounters.size,n*(n-1)/2);for(const beat of[0,4,20,60,62,63.9]){const a=c.sample(beat),b=c.sample(2*n*64+beat);for(const p of a.poses){assert.ok(distance(p,b.poses[p.id])<1e-8);assert.ok(Math.abs(turn(p.yaw,b.poses[p.id].yaw))<1e-8);}}
 }
});
test('opening-frame public admission and direct ownership reject missing or contradictory contracts',()=>{
 const dance=openingSwingFixture();assert.ok(compileChoreography(dance,3).repeatable);assert.throws(()=>compileChoreography(dance,3,{...caps,swingStartSequences:false}),/opening swing/);assert.throws(()=>compileDance(dance,3,caps),/dedicated finite/);const c=compileSwingStartImproper(dance,3),snapshot=c.sample(63.8);dance.endPolicy!.source.clause='changed';dance.figures[0].beats=8;assert.deepEqual(c.sample(63.8),snapshot);assert.throws(()=>{c.starts[0]=99;});assert.throws(()=>c.sample(NaN),/finite/);
 const mutate=(fn:(d:ReturnType<typeof openingSwingFixture>)=>void)=>{const d=openingSwingFixture();fn(d);assert.throws(()=>compileChoreography(d,3,caps));};
 mutate(d=>{delete d.figures[0].entry;});mutate(d=>{d.figures[0].who='partner';});mutate(d=>{d.figures.at(-1)!.exit='progressed-neighbors';});mutate(d=>{d.figures.at(-1)!.passingShoulder='left';});mutate(d=>{delete d.endPolicy;});mutate(d=>{d.endPolicy!.reentryPreparationBeats=0;});mutate(d=>{d.endPolicy!.source.basis='source-explicit';});mutate(d=>{d.progressionEvents![0].afterFigureId=d.figures[0].id;});mutate(d=>{d.progressionEvents![0].source.url='https://example.org/other';});mutate(d=>{d.figures[0].progression=true;});mutate(d=>{(d.figures[2]as any).extraMotion='clap';});
 for(const change of[(d:any)=>{d.sourceRecord.snapshotId='other';},(d:any)=>{d.sourceRecord.sourceUrl='https://example.org/other';},(d:any)=>{d.endPolicy.source.sourceId=d.progressionEvents[0].source.sourceId='forged';}]){const altered=structuredClone(openingSwingFixture());change(altered);assert.throws(()=>compileChoreography(altered,3,caps),/immutable source record/);assert.throws(()=>compileSwingStartImproper(altered,3),/immutable source record/);}
 const renamed=openingSwingFixture();renamed.id='opaque renamed';renamed.title='Independent composition';renamed.author='Another author';assert.deepEqual(compileChoreography(renamed,3,caps).sample(63.8).poses,snapshot.poses);
});
