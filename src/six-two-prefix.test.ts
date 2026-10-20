import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {prepareContraDbReview} from './source-review.ts';
import {readContraDbImport} from './contradb-import.ts';
import {compileSixTwoImproper,type SixTwoSourceDance} from './six-two-source-sequence.ts';
import {compileChoreography} from './choreography.ts';
import {REGISTERED_MOTION_CAPABILITIES} from './capabilities.ts';
import {compileSixTwoPrefixFigure,compactSixTwoTravelBinding,SIX_TWO_HALL_PROMENADE_PREFIX} from './six-two-prefix.ts';
import {bindDirectedCoupleSlots} from './progression-topology.ts';
import {turn,distance} from './ring-twirl-contract.ts';
import type {FigureContext} from './extended-figures.ts';
const raw=readFileSync(new URL('../test-data/contradb/3507.json',import.meta.url),'utf8');
const prepared=()=>{const p=prepareContraDbReview(raw);assert.ok(p.result.dance,JSON.stringify(p.result.errors));return p;};
const fixture=()=>prepared().result.dance as SixTwoSourceDance;
const corners=(poses:readonly {id:number;position:{x:number;z:number}}[])=>[...poses].sort((a,b)=>{const slot=(p:typeof a)=>p.position.z<0?(p.position.x<0?0:1):(p.position.x>0?2:3);return slot(a)-slot(b);}).map(p=>p.id);

test('3507 retains its source count, turn-alone, partner promenade choice and exact source-bound archive',()=>{
 const p=prepared(),r=p.result.record!,d=p.result.dance!;
 assert.equal(r.snapshotId,'contradb:3507:685c4f01ff2763a9');
 assert.deepEqual(r.rows.map(r=>r.beats),[16,8,8,6,10,8,6,2]);
 assert.deepEqual(d.figures.map(f=>[f.kind,f.beats,f.who]),[['balance',4,'neighbor'],['swing',12,'neighbor'],['hall-travel',16,undefined],['circle',6,'all'],['swing',10,'partner'],['promenade',8,'partner'],['circle',6,'all'],['pass-through',2,'neighbor']]);
 assert.equal(d.figures[1].exit,'face-down-line');assert.equal(d.figures[2].hallTurn,'alone');assert.equal(d.figures[2].hallPairRelation,'neighbor');assert.deepEqual(d.figures[2].hallPhaseBeats,[4,4,4,4]);
 assert.equal(d.figures[5].passingShoulder,'left');assert.equal(d.figures[5].promenadeHold,'skaters');assert.equal(d.figures[7].passingShoulder,'right');
 assert.deepEqual(d.sixTwoPassPolicy?.prefix,SIX_TWO_HALL_PROMENADE_PREFIX);
 const replay=readContraDbImport(d.sourceText);assert.deepEqual(replay.record,r);assert.deepEqual(replay.interpretation,p.interpretation);assert.deepEqual(replay.dance?.figures,d.figures);assert.deepEqual(replay.dance?.sixTwoPassPolicy,d.sixTwoPassPolicy);
 for(const key of ['hallEntry','hallPhaseBeats','promenade'] as const){const choices=structuredClone(p.interpretation),row=key==='hallEntry'?0:key==='hallPhaseBeats'?1:5;delete choices.rows![r.rows[row].id][key];assert.equal(readContraDbImport(raw,{interpretation:choices}).dance,undefined,key);}
});

test('3507 named endpoint oracle preserves hall turn-alone identity, partner crossing and literal terminal circle',()=>{
 const c=compileSixTwoImproper(fixture(),2);
 for(const[beat,ids]of[[0,[1,0,3,2]],[16,[2,3,0,1]],[32,[1,0,3,2]],[38,[0,3,2,1]],[48,[0,3,2,1]],[56,[2,1,0,3]],[61.25,[1,0,3,2]],[64,[2,3,0,1]]]as const)assert.deepEqual(corners(c.sample(beat).poses),ids,`named source boundary ${beat}`);
 for(const id of[0,1,2,3]){assert.ok(distance(c.sample(20).poses[id].position,c.sample(24).poses[id].position)<1e-10,'Turn-alone holds every named root in its own slot.');assert.ok(Math.abs(Math.abs(turn(c.sample(24).poses[id].yaw,c.sample(20).poses[id].yaw))-Math.PI)<1e-10);const ring=c.sample(32).poses[id].position;assert.ok(Math.abs(Math.abs(ring.x)-.675)<1e-8);assert.ok(Math.abs(Math.abs(ring.z)-.675)<1e-8);const end=c.sample(56).poses[id].position;assert.ok(Math.abs(Math.abs(end.x)-.72)<1e-8);assert.ok(Math.abs(Math.abs(end.z)-.72)<1e-8);}
 assert.deepEqual(c.topology(63.999).neighbors,[[0,3],[1,2]]);assert.equal(c.topology(64).epoch,1);
});

test('3507 public playback every 2–12-couple finite period closes continuously with no gross root collision, including waiting ends',()=>{
 const d=fixture();
 for(let couples=2;couples<=12;couples++){
  const c=compileChoreography(d,couples) as ReturnType<typeof compileSixTwoImproper>;assert.equal(c.totalBeats,64);assert.equal(c.period,2*couples);assert.equal(c.repeatable,true);let minimum=Infinity;
  for(let repeat=0;repeat<c.period;repeat++){
   for(const local of[...c.starts,20,24,28,32,52,56,61.25,62,64]){const beat=repeat*64+local;if(!beat)continue;const before=c.sample(beat-1e-7),after=c.sample(beat);for(const p of after.poses){assert.ok(distance(p.position,before.poses[p.id].position)<2e-5,`root ${couples}/${beat}/${p.id}`);assert.ok(Math.abs(turn(p.yaw,before.poses[p.id].yaw))<2e-5,`yaw ${couples}/${beat}/${p.id}`);}}
   for(let local=0;local<64;local+=.25){const poses=c.sample(repeat*64+local).poses;for(let a=0;a<poses.length;a++)for(let b=a+1;b<poses.length;b++)minimum=Math.min(minimum,distance(poses[a].position,poses[b].position));}
   for(const id of c.topology(repeat*64).waitingIds){const p=c.sample(repeat*64+16).poses[id];assert.ok(Math.abs(Math.abs(p.position.z)-(couples-1)*.72)<1e-7);}
  }
  assert.ok(minimum>=.6-1e-8,`Global root gap ${couples}: ${minimum}`);
  for(const beat of[0,3,16,20,24,32,38,48,52,56,61.25,63.9]){const a=c.sample(beat),b=c.sample(beat+c.period*64);for(const p of a.poses){assert.ok(distance(p.position,b.poses[p.id].position)<1e-8);assert.ok(Math.abs(turn(p.yaw,b.poses[p.id].yaw))<1e-8);}}
 }
});

test('compact prefixes reject alternate geometry, stale relationships, unprepared facing and modifier changes',()=>{
 const d=fixture(),c=compileSixTwoImproper(d,2),binding=bindDirectedCoupleSlots(c.dancers,0,c.dancers.filter(d=>d.role==='lark').map(d=>({coupleId:d.couple,rank:d.couple,direction:d.direction}))),context:FigureContext={ids:[...binding.groups[0].actors],start:c.sample(16).poses,dancers:[...c.dancers],relations:binding.relations,bindingEpoch:0,next:d.figures[3]},hall=d.figures[2],prefix=SIX_TWO_HALL_PROMENADE_PREFIX;
 assert.ok(compileSixTwoPrefixFigure(hall,context,prefix));assert.equal(compileSixTwoPrefixFigure(hall,context),undefined);
 for(const key of['hallLineSpacing','hallTravelDistance','hallRingWidth','hallRingDepth','promenadeHalfRowGap']as const)assert.throws(()=>compactSixTwoTravelBinding(hall,context,{...prefix,[key]:prefix[key]+.01}));
 assert.throws(()=>compileSixTwoPrefixFigure(hall,{...context,bindingEpoch:1},prefix),/stale/);
 const bad=structuredClone(context.start);bad[0].yaw+=.1;assert.throws(()=>compileSixTwoPrefixFigure(hall,{...context,start:bad},prefix),/finish facing down/);
 for(const delta of[{hallTurn:'couples'},{hallPairRelation:'partner'},{hallPhaseBeats:[3,5,4,4]},{passingShoulder:'left'}])assert.throws(()=>compileSixTwoPrefixFigure({...hall,...delta} as typeof hall,context,prefix));
 const promenade=d.figures[5],pc={...context,start:c.sample(48).poses,next:d.figures[6]};assert.ok(compileSixTwoPrefixFigure(promenade,pc,prefix));for(const delta of[{who:'neighbor'},{passingShoulder:'right'},{direction:'right'},{promenadeHold:'inside-hand'},{beats:10},{amount:1}])assert.throws(()=>compileSixTwoPrefixFigure({...promenade,...delta} as typeof promenade,pc,prefix));
});


test('3507 public capability and retained-prefix controls cannot silently select or discard a route',()=>{
 const p=prepared(),d=p.result.dance!;
 for(const gate of['hallTravel','promenades','sixTwoPasses']as const){const caps={...REGISTERED_MOTION_CAPABILITIES,[gate]:false};assert.throws(()=>compileChoreography(d,2,caps));assert.equal(readContraDbImport(d.sourceText,{capabilities:caps}).dance,undefined,gate);}
 for(const alter of[(d:SixTwoSourceDance)=>{delete d.sixTwoPassPolicy.prefix;},(d:SixTwoSourceDance)=>{(d.sixTwoPassPolicy.prefix as unknown as Record<string,unknown>).extra=true;},(d:SixTwoSourceDance)=>{delete(d.sixTwoPassPolicy.prefix as unknown as Record<string,unknown>).hallLineSpacing;}]){const bad=structuredClone(d) as SixTwoSourceDance;alter(bad);assert.throws(()=>compileChoreography(bad,2));}
 for(const alter of[(prefix:Record<string,unknown>)=>{delete prefix.hallLineSpacing;},(prefix:Record<string,unknown>)=>{prefix.extra=true;}]){const choices=structuredClone(p.interpretation);alter(choices.sixTwoPass!.prefix as unknown as Record<string,unknown>);assert.equal(readContraDbImport(raw,{interpretation:choices}).dance,undefined);}
 const choices=structuredClone(p.interpretation);delete choices.sixTwoPass!.prefix;assert.equal(readContraDbImport(raw,{interpretation:choices}).dance,undefined);
});
