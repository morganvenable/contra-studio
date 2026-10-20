import test from 'node:test';
import assert from 'node:assert/strict';
import {createDancers,initialPoses,compilePrimitiveFigure} from './engine.ts';
import {compileGyreFigure,type GyreFigure} from './gyre-adapter.ts';
import {compileStarGyreStep} from './star-gyre-step.ts';
import {captureSequenceBoundary,assertSequenceHandoff} from './sequence-boundary.ts';
import {sampleFormationEndpoint} from './formation-handoff.ts';
import type {FigureContext} from './extended-figures.ts';
import type {Figure} from './types.ts';
import type {Dance} from './types.ts';
import {compileChoreography} from './choreography.ts';
import type {CompiledStateSequence} from './state-sequence.ts';
const star:Figure={id:'star',label:'Right star three quarters',kind:'star',who:'all',direction:'right',amount:.75,beats:8};
const gyre:GyreFigure={id:'gyre',label:'Partner gyre',kind:'gyre',who:'partner',passingShoulder:'right',amount:1,beats:4};
const swing:Figure={id:'swing',label:'Partner swing',kind:'swing',who:'partner',beats:12};
const turn=(a:number,b:number)=>Math.atan2(Math.sin(a-b),Math.cos(a-b));
function fixture():FigureContext {
 const dancers=createDancers(2),initial=initialPoses(dancers),ids=[0,1,2,3];
 const n:Figure={id:'neighbor',label:'Neighbor swing',kind:'swing',who:'neighbor',beats:12};
 const p=compilePrimitiveFigure(n,ids,initial,dancers,[1,-1]);
 return{ids,dancers,start:sampleFormationEndpoint({ids,start:initial,dancers}as FigureContext,p,1),bindingEpoch:3,relations:{epoch:3,partner:new Map([[0,1],[1,0],[2,3],[3,2]]),neighbor:new Map([[0,3],[3,0],[1,2],[2,1]])},next:gyre};
}
test('star release prepares the actual gyre without changing roots, counts or identities',t=>{
 const c=fixture(),raw=compilePrimitiveFigure(star,c.ids,c.start,c.dancers,[]),oldExit=sampleFormationEndpoint(c,raw,1);
 assert.throws(()=>compileGyreFigure(gyre,{...c,start:oldExit,next:swing}),/Gyre facing rate 5\.126/);
 const incoming=captureSequenceBoundary(c,24,[]),p=compileStarGyreStep(star,c,incoming);
 assertSequenceHandoff(incoming,p.entryState);assert.equal(p.exitState.sourceBeat,32);assert.equal(p.exitState.relationshipEpoch,3);assert.deepEqual(p.exitState.partner,incoming.partner);assert.deepEqual(p.exitState.neighbor,incoming.neighbor);assert.deepEqual(p.exitState.heldContacts,[]);
 let maxYaw=0;
 for(let n=0;n<=960;n++){const u=n/960,poses=sampleFormationEndpoint(c,p,u);for(const id of c.ids){assert.deepEqual(p.position(id,u),raw.position(id,u));if(n)maxYaw=Math.max(maxYaw,Math.abs(turn(p.facing(id,u,poses),p.facing(id,(n-1)/960,poses)))*120);}if(u>=.82)assert.deepEqual(p.contacts(u,poses),[]);}
 assert.ok(maxYaw<3.2,`star yaw ${maxYaw}`);
 const exit=sampleFormationEndpoint(c,p,1),g=compileGyreFigure(gyre,{...c,start:exit,next:swing});
 for(const id of c.ids){const a=g.position(id,0),b=exit[id].position;assert.ok(Math.hypot(a.x-b.x,a.z-b.z)<1e-7);assert.ok(Math.abs(turn(g.facing(id,0,exit),exit[id].yaw))<1e-7);}
 assert.deepEqual(g.contacts(.5,exit),[]);assert.ok(g.swingPreparation!(0,1));
 t.diagnostic(`star max facing rate ${maxYaw}; original gyre rejection reproduced; prepared gyre passes unchanged budgets`);
});
test('translated and differently timed boundaries reuse the same local adapter; held entries reject',()=>{
 const c=fixture();for(const p of c.start){p.position.x+=3;p.position.z-=7;}
 const b=captureSequenceBoundary(c,104,[]),p=compileStarGyreStep({...star,id:'other-star'},c,b);assertSequenceHandoff(b,p.entryState);assert.equal(p.exitState.sourceBeat,112);
 const exit=sampleFormationEndpoint(c,p,1);compileGyreFigure(gyre,{...c,start:exit,next:swing});
 const held={...b,heldContacts:[{a:0,b:3,handA:'right' as const,handB:'right' as const,kind:'joined' as const,point:{x:3,y:1.3,z:-7},strength:.001}]};assert.throws(()=>compileStarGyreStep(star,c,held),/released incoming/);
 assert.throws(()=>compileStarGyreStep({...star,beats:6},c,b),/eight-count/);
 const displaced=structuredClone(c);displaced.start[0].position.x+=.1;assert.throws(()=>compileStarGyreStep(star,displaced,captureSequenceBoundary(displaced,104,[])),/four-corner/);
 const stale=structuredClone(c);stale.bindingEpoch++;assert.throws(()=>compileStarGyreStep(star,stale,b),/stale/);
 const before=p.position(0,.5);c.start[0].position.x=99;c.relations.partner.clear();assert.deepEqual(p.position(0,.5),before);
});

test('star preparation consumes successor declarations and retains strict plain-data ownership',()=>{
 const c=fixture(),b=captureSequenceBoundary(c,24,[]);
 for(const patch of[{progression:true},{progression:0},{confidence:'unsupported'},{hands:'right'},{entry:'paired-sidelines'},{exit:'partner-swing'},{phaseBeats:[2,2]},{direction:'left'}]){
  assert.throws(()=>compileStarGyreStep(star,{...c,next:{...gyre,...patch} as Figure},b),JSON.stringify(patch));
 }
 for(const patch of[{who:'partner'},{confidence:'unsupported'},{hands:'right'},{starGrip:'invalid'}])assert.throws(()=>compileStarGyreStep({...star,...patch} as Figure,c,b),JSON.stringify(patch));
 let reads=0;
 const accessor={...gyre};Object.defineProperty(accessor,'notes',{enumerable:true,get:()=>{reads++;return '';}});
 assert.throws(()=>compileStarGyreStep(star,{...c,next:accessor},b),/accessors/);assert.equal(reads,0);
 const facing=structuredClone(c),raw=compilePrimitiveFigure(star,c.ids,c.start,c.dancers,[]);for(const id of facing.ids)facing.start[id].yaw=raw.facing(id,.09,c.start)+Math.PI;
 assert.throws(()=>compileStarGyreStep(star,facing,captureSequenceBoundary(facing,24,[])),/facing preparation/);
});

for(const couples of[3,4])test(`independent 72-count composition carries star/gyre through the complete ${couples}-couple period`,()=>{
 const dance:Dance={id:'synthetic-star-gyre',title:'Independent star/gyre composition',author:'Test',description:'Local composition evidence, not an interpretation of source 2299',formation:'duple-improper',figures:[
  {id:'balance',label:'Neighbor balance',kind:'balance',who:'neighbor',beats:4},
  {...swing,id:'neighbor',who:'neighbor'},
  {id:'lines',label:'Long lines',kind:'long-lines',who:'all',beats:8},star,gyre,swing,
  {id:'circle',label:'Circle three quarters',kind:'circle',who:'all',direction:'left',amount:.75,beats:8},
  {...swing,id:'neighbor-again',who:'neighbor',beats:8},
  {id:'terminal',label:'Left star',kind:'star',who:'all',direction:'left',amount:1,beats:8,progression:true},
 ],progressionEvents:[{afterFigureId:'terminal',count:1,waitingRoleArrangement:'lark-left',source:{sourceId:'synthetic-star-gyre',url:'https://example.invalid/star-gyre',basis:'reviewed-interpretation',clause:'Terminal one-place progression'}}]};
 const p=compileChoreography(dance,couples)as CompiledStateSequence;assert.equal(p.totalBeats,72);assert.ok(p.repeatable);
 for(let repeat=0;repeat<p.periodRepeats;repeat++){
  const proofs=p.sequenceBoundaries(repeat).filter(x=>x.adapterId==='star-to-partner-gyre');assert.ok(proofs.length);
  for(const proof of proofs){assert.equal(proof.contactPolicy,'strict-carried');assertSequenceHandoff(proof.incoming,proof.entry);assert.equal(proof.exit.sourceBeat-proof.entry.sourceBeat,8);assert.equal(proof.exit.relationshipEpoch,repeat);}
  assert.equal(p.topology(repeat*72+72-1e-7).epoch,repeat);assert.equal(p.topology(repeat*72+72).epoch,repeat+1);
  for(const local of [...p.starts,72]){const beat=repeat*72+local;if(!beat)continue;const before=p.sample(beat-1e-7),after=p.sample(beat);for(const a of after.poses){const b=before.poses[a.id];assert.ok(Math.hypot(a.position.x-b.position.x,a.position.z-b.position.z)<2e-5,`root ${beat}/${a.id}`);assert.ok(Math.abs(turn(a.yaw,b.yaw))<2e-5,`yaw ${beat}/${a.id}`);}}
  for(let local=0;local<72;local+=.5){const frame=p.sample(repeat*72+local);for(const a of frame.poses)assert.ok([a.position.x,a.position.z,a.yaw].every(Number.isFinite));}
 }
 assert.deepEqual(p.sample(0).poses,p.sample(p.periodRepeats*72).poses);assert.deepEqual(p.sample(0).contacts,p.sample(p.periodRepeats*72).contacts);
});
