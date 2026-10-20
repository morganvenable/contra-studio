import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {compileChoreography} from './choreography.ts';
import {compileDance} from './engine.ts';
import {REGISTERED_MOTION_CAPABILITIES} from './capabilities.ts';
import type {ContraDbRecord} from './contradb-source.ts';
import {prepareContraDbReview} from './source-review.ts';
import {compileRingTwirlImproper,type RingTwirlDance} from './ring-twirl-source-sequence.ts';
import {CONVENTIONAL_RING_TWIRL,RING_TWIRL_CHOICE_DESCRIPTION,ownRingTwirlPolicy} from './ring-twirl-policy.ts';
import {compilePartnerBalanceTwirlFigure,compileRingReturnTwirlFigure,compileRingRoleGyreSwingFigure} from './ring-twirl-adapter.ts';
import {bindDirectedCoupleSlots} from './progression-topology.ts';
import type {Figure,Pose} from './types.ts';
const raw=()=>readFileSync(new URL('../test-data/contradb/159.json',import.meta.url),'utf8');
/** Every motion regression consumes the exact retained source and removable archive choices. */
function candidate():RingTwirlDance&{sourceRecord:ContraDbRecord} {
 const review=prepareContraDbReview(raw(),[],REGISTERED_MOTION_CAPABILITIES);
 assert.ok(review.result.dance,JSON.stringify(review.result.diagnostics));
 return structuredClone(review.result.dance) as RingTwirlDance&{sourceRecord:ContraDbRecord};
}
const caps=REGISTERED_MOTION_CAPABILITIES;
const compile=(dance:RingTwirlDance,couples:number)=>compileChoreography(dance,couples,caps)as ReturnType<typeof compileRingTwirlImproper>;
const gap=(a:Pose,b:Pose)=>Math.hypot(a.position.x-b.position.x,a.position.z-b.position.z);
const angle=(a:Pose,b:Pose)=>Math.abs(Math.atan2(Math.sin(a.yaw-b.yaw),Math.cos(a.yaw-b.yaw)));
const near=(a:number,b:number)=>assert.ok(Math.abs(a-b)<1e-7,`${a} != ${b}`);
const xy=(poses:Pose[],expected:readonly(readonly[number,number])[])=>expected.forEach(([x,z],id)=>{near(poses[id].position.x,x);near(poses[id].position.z,z);});

test('actual159 preserves each authored interval and named relation through the terminal partner balance/twirl',()=>{
 const d=candidate();assert.equal(d.title,'Heartbeat Contra');assert.deepEqual(d.figures.map(f=>[f.kind,f.beats]),[['ring-balance',4],['petronella',4],['ring-balance',4],['petronella',4],['ring-balance',4],['swing',12],['gyre',8],['swing',8],['circle',8],['balance',4],['california-twirl',4]]);assert.equal(d.figures.reduce((n,f)=>n+f.beats,0),64);assert.deepEqual(d.figures.slice(5).map(f=>f.who),['neighbor','robins','partner','all','partner','partner']);assert.equal(d.figures.filter(f=>f.progression).length,1);assert.equal(d.figures.at(-1)!.progression,true);
 const c=compile(d,2);
 xy(c.sample(0).poses,[[.55,-.55],[-.55,-.55],[-.55,.55],[.55,.55]]);
 xy(c.sample(8).poses,[[-.55,-.55],[-.55,.55],[.55,.55],[.55,-.55]]);
 xy(c.sample(16).poses,[[-.55,.55],[.55,.55],[.55,-.55],[-.55,-.55]]);
 xy(c.sample(32).poses,[[-.9,-.9],[.9,-.9],[.9,.9],[-.9,.9]]);
 xy(c.sample(39).poses,[[-.9,-.9],[-.9,.9],[.9,.9],[.9,-.9]]);
 xy(c.sample(48).poses,[[-.9,-.9],[-.9,.9],[.9,.9],[.9,-.9]]);
 xy(c.sample(56).poses,[[-.9,.9],[.9,.9],[.9,-.9],[-.9,-.9]]);
 xy(c.sample(60).poses,[[-.55,.9],[.55,.9],[.55,-.9],[-.55,-.9]]);
 xy(c.sample(63).poses,[[.55,.9],[-.55,.9],[-.55,-.9],[.55,-.9]]);
 xy(c.sample(64).poses,[[.9,.9],[-.9,.9],[-.9,-.9],[.9,-.9]]);
 // Independently unwrap the actual robin root orbit, not the declared amount.
 let last=Math.atan2(c.sample(32).poses[1].position.z,c.sample(32).poses[1].position.x),sweep=0;
 for(let i=1;i<=224;i++){const p=c.sample(32+7*i/224).poses[1].position,a=Math.atan2(p.z,p.x);sweep+=Math.atan2(Math.sin(a-last),Math.cos(a-last));last=a;}near(sweep,3*Math.PI);
 for(const id of[0,2])near(c.sample(63).poses[id].yaw-c.sample(60).poses[id].yaw,-Math.PI);
 for(const id of[1,3])near(c.sample(63).poses[id].yaw-c.sample(60).poses[id].yaw,Math.PI);
 for(const t of[56.25,57,58,58.75,60.25,61,62.5])for(const h of c.sample(t).contacts.filter(h=>h.strength>0))assert.equal(c.dancers[h.a].couple,c.dancers[h.b].couple,'tail holds persistent partners');
 assert.equal(c.topology(63.999999).epoch,0);assert.equal(c.topology(64).epoch,1);assert.deepEqual(c.topology(64).neighbors,[]);
});

test('actual159 closes every2–12-couple finite period with continuous roots/facings, stable identities and no gross overlaps',(t)=>{
 const d=candidate();for(let couples=2;couples<=12;couples++){
  const c=compile(d,couples),pairs=new Set<string>();let minimum=Infinity;
  assert.equal(c.totalBeats,64);assert.equal(c.repeatable,true);
  for(let repeat=0;repeat<2*couples;repeat++){
   const b=c.topology(repeat*64+1);assert.equal(b.epoch,repeat);for(const[a,z]of b.neighbors)pairs.add([c.dancers[a].couple,c.dancers[z].couple].sort((a,b)=>a-b).join(':'));
   for(const local of[...c.starts,39,59,63,64]){const beat=repeat*64+local;if(!beat)continue;const before=c.sample(beat-1e-7),at=c.sample(beat);for(const p of at.poses){assert.equal(p.id,before.poses[p.id].id);assert.ok(gap(p,before.poses[p.id])<2e-5,`${couples}/${beat}/${p.id}: root join`);assert.ok(angle(p,before.poses[p.id])<2e-5,`${couples}/${beat}/${p.id}: facing join`);}}
   for(let k=0;k<256;k++){const f=c.sample(repeat*64+k/4),hands=new Map<string,number>();for(const h of f.contacts.filter(h=>h.strength>.001))for(const[a,hand,z]of[[h.a,h.handA,h.b],[h.b,h.handB,h.a]]as const){const key=`${a}:${hand}`;assert.ok(!hands.has(key)||hands.get(key)===z,`${couples}/${repeat}/${k}: competing hand targets`);hands.set(key,z);}for(let a=0;a<f.poses.length;a++)for(let z=a+1;z<f.poses.length;z++)minimum=Math.min(minimum,gap(f.poses[a],f.poses[z]));}
   for(const id of b.waitingIds){assert.ok(gap(c.sample(repeat*64+13).poses[id],c.sample(repeat*64+59).poses[id])<1e-9,'waiting stays at the same end');assert.ok(gap(c.sample(repeat*64).poses[id],c.sample(repeat*64+3.99).poses[id])<1e-9,'first four counts wait');}
  }
  assert.ok(minimum>=.45-1e-7,`${couples}: minimum ${minimum}`);assert.equal(pairs.size,couples*(couples-1)/2);t.diagnostic(`${couples} couples: full period ${2*couples} repeats, minimum sampled root gap ${minimum.toFixed(6)}`);
  for(const beat of[0,7.75,19.5,32,39,40,56,59.5,61.5,63.75]){const a=c.sample(beat),b=c.sample(2*couples*64+beat);for(const p of a.poses){assert.ok(gap(p,b.poses[p.id])<1e-8);assert.ok(angle(p,b.poses[p.id])<1e-8);}}
 }
});

test('ring/twirl declarations reject missing or unconsumed choices, changed relations/counts and false endpoint events',()=>{
 const mutate:Array<(d:RingTwirlDance)=>void>=[
  d=>{delete (d as Partial<RingTwirlDance>).ringTwirlPolicy;},d=>{delete d.endPolicy;},d=>{delete d.progressionEvents;},
  d=>{d.ringTwirlPolicy.gyrePhaseBeats=[6,2] as never;},d=>{d.ringTwirlPolicy.balancePhaseBeats=[4,0] as never;},d=>{d.ringTwirlPolicy.twirlPhaseBeats=[2,2] as never;},d=>{d.ringTwirlPolicy.return='ring' as never;},d=>{(d.ringTwirlPolicy as unknown as Record<string,unknown>).ignored=true;},
  d=>{d.sourceUrl='https://contradb.com/dances/999';},d=>{d.ringTwirlPolicy.source.sourceId='wrong';},d=>{d.ringTwirlPolicy.source.basis='source-explicit';},d=>{d.ringTwirlPolicy.source.clause=' ';},
  d=>{d.endPolicy!.sameEndTurnOffsetBeats=0;},d=>{d.endPolicy!.reentryPreparationBeats=2;},d=>{d.endPolicy!.waitingHands='release-during-exchange';},
  d=>{d.progressionEvents![0].count=2;},d=>{d.progressionEvents![0].afterFigureId=d.figures[9].id;},d=>{d.progressionEvents![0].initialBinding='retain-starting-neighbors';},d=>{d.progressionEvents![0].source.basis='reviewed-interpretation';},d=>{d.figures[9].progression=true;},d=>{d.figures[10].progression=false;},
  d=>{d.figures[9].who='all';},d=>{d.figures[9].hands='both';},d=>{d.figures[6].passingShoulder='left';},d=>{d.figures[6].who='larks';},d=>{d.figures[6].amount=.5;},d=>{d.figures[6].beats=7;d.figures[7].beats=9;},d=>{d.figures[8].who='partner';},d=>{d.figures[8].direction='right';},
  ...[5,7].flatMap(i=>[(d:RingTwirlDance)=>{d.figures[i].entry='circle-exit';},(d:RingTwirlDance)=>{d.figures[i].exit='face-down-line';}]),
  ...(['hands','underRole','direction','amount','entry','exit','phaseBeats']as const).map(key=>(d:RingTwirlDance)=>{Object.assign(d.figures[10],{[key]:({hands:'both',underRole:'lark',direction:'left',amount:1,entry:'ring',exit:'ring',phaseBeats:[3,1]}as Record<string,unknown>)[key]});}),
  d=>{d.figures[0].phaseBeats=[3,1];},d=>{d.figures[1].exit='progressed-neighbors';},d=>{d.figures[2].exit='partner-swing';},d=>{d.figures[4].exit=undefined;},d=>{d.circulation='cw';},
 ];
 for(const change of mutate){const d=structuredClone(candidate());change(d);assert.throws(()=>compileRingTwirlImproper(d,2),undefined,String(change));}
 for(const n of[1,13,2.5,NaN])assert.throws(()=>compileRingTwirlImproper(candidate(),n));
});

test('isolated adapters reject stale/rebound partners and own their inputs',()=>{
 const d=candidate(),c=compile(d,2),dancers=c.dancers.map(x=>({...x})),binding=bindDirectedCoupleSlots(dancers,0,dancers.filter(d=>d.role==='lark').map(d=>({coupleId:d.couple,rank:d.couple,direction:d.direction}))),ctx=(beat:number,next?:Figure)=>({ids:[0,1,2,3],start:c.sample(beat).poses,dancers,relations:binding.relations,bindingEpoch:0,next}),policy=d.ringTwirlPolicy;
 const stale=ctx(56,d.figures[10]);stale.bindingEpoch=1;assert.throws(()=>compilePartnerBalanceTwirlFigure(d.figures[9],stale,policy),/stale/);
 const gyre=ctx(32,d.figures[7]);gyre.next={...gyre.next!,entry:'circle-exit'};assert.throws(()=>compileRingRoleGyreSwingFigure(d.figures[6],gyre),/partner swing/);
 const destination=new Map(c.sample(64).poses.map(p=>[p.id,{position:{...p.position},yaw:p.yaw,velocity:{x:0,z:0},yawRate:0}]));destination.get(0)!.position.x=-.9;assert.throws(()=>compileRingReturnTwirlFigure(d.figures[10],ctx(60),destination,policy),/named sides/);
 const owned=ownRingTwirlPolicy(policy);assert.ok(Object.isFrozen(owned)&&Object.isFrozen(owned.source)&&Object.isFrozen(owned.gyrePhaseBeats));
 const before=c.sample(61.25);d.figures[10].hands='both';d.endPolicy!.sameEndTurnBeats=4;d.ringTwirlPolicy.source.clause='changed';assert.deepEqual(c.sample(61.25),before);for(const t of[NaN,Infinity])assert.throws(()=>c.sample(t),/finite/);
});

 test('public registration is explicit and cannot bypass source evidence or required figure gates',()=>{
 const d=candidate();for(const gate of['ringTwirlSequences','ringStartSequences','ringPetronellaStarts','ringBalances','petronellas','gyres','californiaTwirls','progressionEvents']as const)assert.throws(()=>compileChoreography(d,2,{...caps,[gate]:false}),/reviewed/);
 assert.equal(compileChoreography(d,2,{...caps,ringPassThroughs:false}).totalBeats,64);
 assert.throws(()=>compileDance(d,2,caps),/dedicated/);
 for(const key of['snapshotId','sourceUrl']as const){const changed=structuredClone(candidate());changed.sourceRecord[key]='mismatched';assert.throws(()=>compileRingTwirlImproper(changed,2),/snapshot identity/);}
 const changed=candidate();changed.ringTwirlPolicy.source.url=changed.endPolicy!.source.url=changed.progressionEvents![0].source.url='https://contradb.com/dances/999';assert.throws(()=>compileRingTwirlImproper(changed,2),/actual dance source URL/);
 });
