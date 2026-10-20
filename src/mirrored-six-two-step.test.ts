import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {readContraDbSource} from './contradb-source.ts';
import {fixture,after,sequence as leftSequence,sample} from '../test-data/measured-six-two/probe.ts';
import {compileMirroredSixCountCircleStep,compileMirroredTwoCountPassStep} from './mirrored-six-two-step.ts';
import {captureSequenceBoundary,assertSequenceHandoff} from './sequence-boundary.ts';
import {distance,turn} from './ring-twirl-contract.ts';
import type {FigureContext} from './extended-figures.ts';
import type {Dancer,Figure,HandContact,Pose,Vec2} from './types.ts';

const reflect=(p:Vec2)=>({x:-p.x,z:p.z});
const reflectedPoses=(p:Pose[])=>p.map(p=>({...p,position:reflect(p.position),yaw:-p.yaw}));
const reflectedContact=(c:HandContact):HandContact=>({...c,handA:c.handA==='left'?'right':'left',handB:c.handB==='left'?'right':'left',point:{...c.point,x:-c.point.x}});
function mirrored(h=.9,beat=56){
 const f=fixture(h,beat),figure:Figure={...f.figure,direction:'right'},next:Figure={...f.next,passingShoulder:'left'},context={...f.context,next},boundary=captureSequenceBoundary(context,beat,[]);
 const circle=compileMirroredSixCountCircleStep(figure,context,boundary),passContext=after(context,circle.exitState),pass=compileMirroredTwoCountPassStep(next,passContext,circle.exitState);
 return{figure,next,context,boundary,circle,passContext,pass};
}

test('retained candidates have exact sixty-four-count clocks and one literal terminal right-six/left-two source boundary',()=>{
 for(const id of[3310,3241]){
  const raw=readFileSync(new URL(`../test-data/contradb/${id}.json`,import.meta.url),'utf8'),parsed=readContraDbSource(raw);assert.ok(parsed.record);
  const rows=parsed.record.rows;assert.equal(rows.reduce((n,r)=>n+r.beats!,0),64);assert.equal(rows.filter(r=>r.progression).length,1);
  assert.deepEqual(rows.slice(-2).map(r=>[r.beats,r.text,r.progression]),[[6,'circle right 3 places',false],[2,'pass through left shoulders ⁋',true]]);
  if(id===3310)assert.match(JSON.parse(raw).html,/<del>Based on Solstice Special by Tony Parkes<\/del><br>\s*Nope the dance already existed/);
 }
});

test('mirror equals reflected audited geometry, raw contacts and hands without swapping any roles',()=>{
 const left=leftSequence(.9,13.25),figure:Figure={...left.figure,direction:'right'},next:Figure={...left.next,passingShoulder:'left'},context={...left.context,start:reflectedPoses(left.context.start),next},boundary=captureSequenceBoundary(context,13.25,[]);
 const circle=compileMirroredSixCountCircleStep(figure,context,boundary),passContext=after(context,circle.exitState),pass=compileMirroredTwoCountPassStep(next,passContext,circle.exitState);
 for(const[original,mirrored,originalContext,mirroredContext]of[[left.circle,circle,left.context,context],[left.pass,pass,left.passContext,passContext]] as const){
  for(let n=0;n<=160;n++){
   const t=n/160,oldPoses=sample(originalContext,original,t),newPoses=sample(mirroredContext,mirrored,t);
   for(const id of context.ids){assert.deepEqual(mirrored.position(id,t),reflect(original.position(id,t)));assert.equal(mirrored.facing(id,t,newPoses),-original.facing(id,t,oldPoses));}
   assert.deepEqual(mirrored.contacts(t,newPoses),original.contacts(t,oldPoses).map(reflectedContact));
  }
  for(const state of[mirrored.entryState,mirrored.exitState]){
   assert.deepEqual(state.actors,boundary.actors);assert.deepEqual(state.partner,boundary.partner);assert.deepEqual(state.neighbor,boundary.neighbor);assert.equal(state.relationshipEpoch,3);
  }
  assert.equal(mirrored.minimumObservedClearance,original.minimumObservedClearance);assert.equal(mirrored.maximumObservedSpeed,original.maximumObservedSpeed);
 }
 assertSequenceHandoff(boundary,circle.entryState);assertSequenceHandoff(circle.exitState,pass.entryState);
 assert.deepEqual([circle.entryState.sourceBeat,circle.exitState.sourceBeat,pass.exitState.sourceBeat],[13.25,19.25,21.25]);
 assert.deepEqual(pass.gates.map(g=>g.shoulder),['left','left']);
});

test('right circle winds three places and prepares literal left-shoulder old-neighbor gates within six plus two counts',t=>{
 const s=mirrored(),{context,circle,pass}=s,h=.9;
 for(const id of context.ids){
  const initial=context.start[id].position,station=circle.position(id,5.25/6),prepared=circle.position(id,1);
  assert.ok(distance(station,{x:-initial.z,z:initial.x})<1e-7);
  assert.ok(distance(prepared,{x:station.x+Math.sign(station.x)*.04+Math.sign(station.z)*.30,z:station.z-Math.sign(station.z)*(2*h-1.20)})<1e-7);
  let angle=Math.atan2(initial.z,initial.x),winding=0;
  for(let n=1;n<=210;n++){const p=circle.position(id,n/40/6),next=Math.atan2(p.z,p.x);winding+=turn(next,angle);angle=next;}
  assert.ok(Math.abs(winding+1.5*Math.PI)<1e-8);
  const end=pass.position(id,1);assert.ok(distance(end,{x:station.x,z:-station.z})<1e-7);
 }
 assert.deepEqual(circle.contacts(0,context.start),[]);assert.equal(circle.contacts(.5,sample(context,circle,.5)).length,4);assert.deepEqual(circle.contacts(1,sample(context,circle,1)),[]);assert.deepEqual(pass.contacts(.5,sample(s.passContext,pass,.5)),[]);
 for(const gate of pass.gates){
  assert.equal(gate.shoulder,'left');assert.equal(context.relations.neighbor.get(gate.pair[0]),gate.pair[1]);
  for(const[id,other]of[gate.pair,[...gate.pair].reverse()]){const a=pass.position(id,gate.beat/2),b=pass.position(other,gate.beat/2),yaw=pass.facing(id,gate.beat/2,s.passContext.start);assert.ok(Math.abs(a.z-b.z)<1e-8);assert.ok((b.x-a.x)*Math.cos(yaw)-(b.z-a.z)*Math.sin(yaw)>.65);}
 }
 assert.ok(pass.maximumObservedSpeed<=.85);assert.ok(pass.minimumObservedClearance>=.65);assert.ok(circle.maximumObservedSpeed<=1.8);assert.ok(circle.minimumObservedClearance>=.65);
 t.diagnostic(JSON.stringify({halfWidth:circle.geometry.halfWidth,rotationBeats:5.25,preparationBeats:.75,passBeats:2,circleSpeed:circle.maximumObservedSpeed,circleGap:circle.minimumObservedClearance,passSpeed:pass.maximumObservedSpeed,passGap:pass.minimumObservedClearance,gateBeats:pass.gates.map(g=>g.beat)}));
});

test('independent translated, rotated and opaque-ID-reordered use retains roles and actual immutable state',()=>{
 const a=mirrored(),angle=.71,origin={x:4,z:-3},map=new Map([[0,41],[1,7],[2,95],[3,12]]),rotate=(p:Vec2)=>({x:p.x*Math.cos(angle)-p.z*Math.sin(angle),z:p.x*Math.sin(angle)+p.z*Math.cos(angle)}),world=(p:Vec2)=>{const q=rotate(p);return{x:q.x+origin.x,z:q.z+origin.z};},start:Pose[]=[],dancers:Dancer[]=[];
 for(const id of a.context.ids){const next=map.get(id)!;start[next]={...a.context.start[id],id:next,position:world(a.context.start[id].position),yaw:a.context.start[id].yaw-angle};dancers[next]={...a.context.dancers[id],id:next};}
 const relations=(m:ReadonlyMap<number,number>)=>new Map([...m].map(([id,other])=>[map.get(id)!,map.get(other)!])),context:FigureContext={...a.context,ids:[95,41,12,7],start,dancers,relations:{epoch:3,partner:relations(a.context.relations.partner),neighbor:relations(a.context.relations.neighbor)},next:{...a.next,id:'different-pass',label:'Independent next row'}};
 const boundary=captureSequenceBoundary(context,27.5,[]),circle=compileMirroredSixCountCircleStep({...a.figure,id:'different-circle',label:'Independent producer'},context,boundary),pc=after(context,circle.exitState),pass=compileMirroredTwoCountPassStep(context.next!,pc,circle.exitState);
 for(let n=0;n<=80;n++){const t=n/80;for(const id of a.context.ids)for(const[before,after]of[[a.circle,circle],[a.pass,pass]]){assert.ok(distance(after.position(map.get(id)!,t),world(before.position(id,t)))<1e-7);assert.ok(Math.abs(turn(after.facing(map.get(id)!,t,start),before.facing(id,t,a.context.start)-angle))<1e-7);}}
 assertSequenceHandoff(boundary,circle.entryState);assertSequenceHandoff(circle.exitState,pass.entryState);assert.deepEqual(pass.exitState.actors,boundary.actors);assert.deepEqual(pass.exitState.neighbor,boundary.neighbor);assert.deepEqual(pass.exitState.partner,boundary.partner);assert.equal(pass.exitState.sourceBeat,35.5);
 const expected=pass.position(41,.4);context.start[41].position.x=99;context.dancers[41].role='robin';(context.relations.neighbor as Map<number,number>).clear();assert.deepEqual(pass.position(41,.4),expected);assert.throws(()=>{(pass.exitState.poses[0].position as Vec2).x=99;});
});

test('mirror rejects opposite chirality, extra semantics, retained holds, stale context and nonprepared pass roots',()=>{
 const f=mirrored();
 for(const change of[{beats:8},{direction:'left'},{amount:1},{phaseBeats:[5.25,.75]},{turnToward:'partner'},{progression:true},{who:'neighbor'}])assert.throws(()=>compileMirroredSixCountCircleStep({...f.figure,...change} as Figure,f.context,f.boundary));
 for(const change of[{beats:4},{who:'partner'},{passingShoulder:'right'},{entry:'ring'}])assert.throws(()=>compileMirroredTwoCountPassStep({...f.next,...change} as Figure,f.passContext,f.circle.exitState));
 assert.throws(()=>compileMirroredSixCountCircleStep(f.figure,{...f.context,next:undefined},f.boundary),/immediate/);
 assert.throws(()=>compileMirroredSixCountCircleStep(f.figure,{...f.context,bindingEpoch:4},f.boundary),/stale/);
 const moved=structuredClone(f.context.start);moved[0].position.x+=.1;assert.throws(()=>compileMirroredSixCountCircleStep(f.figure,{...f.context,start:moved},f.boundary),/discontinuous/);
 const held={...f.boundary,heldContacts:[{a:0,b:1,handA:'left' as const,handB:'right' as const,point:{x:.9,y:1.14,z:0},strength:1,kind:'joined' as const}]};assert.throws(()=>compileMirroredSixCountCircleStep(f.figure,f.context,held),/released/);
 assert.throws(()=>compileMirroredTwoCountPassStep(f.next,{...f.passContext,next:f.figure},f.circle.exitState),/finite event/);
 const bad=structuredClone(f.passContext.start);bad[0].position.z+=.02;const context={...f.passContext,start:bad};assert.throws(()=>compileMirroredTwoCountPassStep(f.next,context,captureSequenceBoundary(context,62,[])),/preparation/);
 for(const plan of[f.circle,f.pass]){assert.throws(()=>plan.position(999,.5));assert.throws(()=>plan.position(0,NaN));assert.deepEqual(plan.position(0,-1),plan.position(0,0));assert.deepEqual(plan.position(0,2),plan.position(0,1));}
});
