import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {prepareContraDbReview} from './source-review.ts';
import {compileChoreography} from './choreography.ts';
import type {CompiledStateSequence} from './state-sequence.ts';
import {assertSequenceHandoff} from './sequence-boundary.ts';
const gap=(a:{position:{x:number;z:number}},b:{position:{x:number;z:number}})=>Math.hypot(a.position.x-b.position.x,a.position.z-b.position.z);
for(const id of[1144,724])for(const couples of[3,4])test(`${id} role shoulder passage preserves counted full periods with ${couples} couples`,()=>{
 const review=prepareContraDbReview(readFileSync(new URL(`../test-data/contradb/${id}.json`,import.meta.url),'utf8'));assert.ok(review.result.dance,review.result.errors.join('; '));const dance=review.result.dance!,c=compileChoreography(dance,couples) as CompiledStateSequence;assert.equal(dance.figures.find(f=>f.kind==='pass-through')!.beats,2);let proofs=0,maxSpeed=0,minGap=Infinity;
 for(let r=0;r<c.periodRepeats;r++){
  for(const p of c.sequenceBoundaries(r).filter(p=>p.adapterId==='role-shoulder-pass')){proofs++;assert.equal(p.contactPolicy,'strict-carried');assertSequenceHandoff(p.incoming,p.entry);assert.equal(p.exit.sourceBeat-p.entry.sourceBeat,2);assert.deepEqual(p.entry.partner,p.exit.partner);assert.deepEqual(p.entry.neighbor,p.exit.neighbor);assert.equal(p.entry.relationshipEpoch,p.exit.relationshipEpoch);for(const a of p.entry.actors.filter(a=>a.role==='robin'))assert.deepEqual(p.entry.poses.find(q=>q.id===a.id)!.position,p.exit.poses.find(q=>q.id===a.id)!.position);}
  for(const local of[...c.starts,33,34,64]){if(r*64+local===0)continue;const before=c.sample(r*64+local-1e-7),after=c.sample(r*64+local);for(const p of after.poses){assert.ok(gap(p,before.poses[p.id])<1e-5);assert.ok(Math.abs(Math.atan2(Math.sin(p.yaw-before.poses[p.id].yaw),Math.cos(p.yaw-before.poses[p.id].yaw)))<1e-5);}}
  let prev=c.sample(r*64);for(let k=1;k<=4096;k++){const frame=c.sample(r*64+k/64);for(const p of frame.poses)maxSpeed=Math.max(maxSpeed,gap(p,prev.poses[p.id])*64);for(let a=0;a<frame.poses.length;a++)for(let b=a+1;b<frame.poses.length;b++)minGap=Math.min(minGap,gap(frame.poses[a],frame.poses[b]));prev=frame;}
 }
 assert.ok(proofs>0);assert.ok(maxSpeed<2);assert.ok(minGap>.38);for(const p of c.sample(0).poses)assert.ok(gap(p,c.sample(c.periodRepeats*64).poses[p.id])<1e-8);assert.deepEqual(c.sample(0).contacts,c.sample(c.periodRepeats*64).contacts);console.log({id,couples,maxSpeed,minGap});
});
import {createDancers,initialPoses} from './engine.ts';
import {compileRoleShoulderPassStep} from './role-shoulder-pass-step.ts';
import {captureSequenceBoundary} from './sequence-boundary.ts';
import type {FigureContext} from './extended-figures.ts';
import type {Figure} from './types.ts';
const pass:Figure={id:'unrelated',label:'Pass',kind:'pass-through',beats:2,who:'larks',passingShoulder:'left'};
function setup(){const dancers=createDancers(2),start=initialPoses(dancers);for(const[id,x,z,yaw]of[[0,.9,.9,-Math.PI/2],[1,-.9,.9,Math.PI/2],[2,-.9,-.9,Math.PI/2],[3,.9,-.9,-Math.PI/2]])Object.assign(start[id],{position:{x,z},yaw});const context:FigureContext={dancers,start,ids:[0,1,2,3],relations:{epoch:7,partner:new Map([[0,1],[1,0],[2,3],[3,2]]),neighbor:new Map([[0,3],[3,0],[1,2],[2,1]])},bindingEpoch:7,next:{id:'next',label:'Swing',kind:'swing',who:'partner',beats:14}};return{context,boundary:captureSequenceBoundary(context,32,[])};}
test('role passage carries exact roots, anatomical shoulder, timing and owned inputs',()=>{
 for(const shoulder of['left','right']as const){const{context,boundary}=setup(),p=compileRoleShoulderPassStep({...pass,passingShoulder:shoulder},context,boundary);assertSequenceHandoff(boundary,p.entryState);assert.equal(p.exitState.sourceBeat,34);for(const id of[0,2]){const other=id===0?2:0,a=p.position(id,.5),b=p.position(other,.5),yaw=p.facing(id,.5,[]),left=(b.x-a.x)*Math.cos(yaw)-(b.z-a.z)*Math.sin(yaw);assert.ok((shoulder==='left'?left:-left)>.679);}for(let k=0;k<=512;k++){for(const id of[1,3])assert.deepEqual(p.position(id,k/512),context.start[id].position);assert.deepEqual(p.contacts!(k/512),[]);}const before=p.position(0,.2);context.start[0].position.x+=10;assert.deepEqual(p.position(0,.2),before);for(const t of[-.1,1.1,NaN])assert.throws(()=>p.position(0,t));}
});
test('role passage rejects unsupported semantics and stale or held entry state',()=>{
 const{context,boundary}=setup();for(const patch of[{beats:1},{beats:8},{passingShoulder:undefined},{who:'all'},{progression:true},{amount:1},{entry:'ring'}])assert.throws(()=>compileRoleShoulderPassStep({...pass,...patch}as Figure,context,boundary));assert.throws(()=>compileRoleShoulderPassStep(pass,{...context,next:{...context.next!,who:'neighbor'}},boundary));assert.throws(()=>compileRoleShoulderPassStep(pass,{...context,bindingEpoch:6},boundary));assert.throws(()=>compileRoleShoulderPassStep(pass,context,{...boundary,heldContacts:[{a:0,b:3,handA:'left',handB:'right',kind:'joined',point:{x:0,y:1,z:0},strength:1}]}));
});
test('role passage is invariant under opaque IDs and translated rotated actual frames',()=>{
 const base=setup(),a=compileRoleShoulderPassStep(pass,base.context,base.boundary),map=new Map([[0,8],[1,3],[2,10],[3,5]]),theta=.37,rotate=(p:{x:number;z:number})=>({x:4+p.x*Math.cos(theta)+p.z*Math.sin(theta),z:-3-p.x*Math.sin(theta)+p.z*Math.cos(theta)}),dancers=createDancers(6),start=initialPoses(dancers);
 for(const p of base.boundary.poses){const id=map.get(p.id)!;dancers[id]={...base.context.dancers[p.id],id,couple:20+base.context.dancers[p.id].couple};start[id]={...base.context.start[p.id],id,position:rotate(p.position),yaw:p.yaw+theta};}
 const remap=(r:Map<number,number>)=>new Map([...r].map(([a,b])=>[map.get(a)!,map.get(b)!])),context:FigureContext={dancers,start,ids:[10,5,8,3],relations:{epoch:7,partner:remap(base.context.relations.partner as Map<number,number>),neighbor:remap(base.context.relations.neighbor as Map<number,number>)},bindingEpoch:7,next:base.context.next},p=compileRoleShoulderPassStep(pass,context,captureSequenceBoundary(context,32,[]));
 for(let k=0;k<=160;k++)for(const[id,other]of map){const expected=rotate(a.position(id,k/160)),actual=p.position(other,k/160);assert.ok(Math.hypot(actual.x-expected.x,actual.z-expected.z)<1e-8);assert.ok(Math.abs(Math.atan2(Math.sin(p.facing(other,k/160,[])-a.facing(id,k/160,[])-theta),Math.cos(p.facing(other,k/160,[])-a.facing(id,k/160,[])-theta)))<1e-8);}
});
test('source shoulder passage preserves source counts and is independent of title and identifier',()=>{
 const original=JSON.parse(readFileSync(new URL('../test-data/contradb/1144.json',import.meta.url),'utf8'));original.sourceUrl='https://contradb.com/dances/999986';original.html=original.html.replaceAll('/dances/1144','/dances/999986').replaceAll('Piece of Cake','Arbitrary Role Passage');const p=prepareContraDbReview(JSON.stringify(original));assert.ok(p.result.dance,p.result.errors.join('; '));assert.equal(p.result.dance!.figures.reduce((n,f)=>n+f.beats,0),64);const f=p.result.dance!.figures.find(f=>f.kind==='pass-through')!;assert.equal(f.beats,2);assert.equal(f.who,'larks');assert.equal(f.passingShoulder,'left');
});
test('role passage carries heading continuously within the existing yaw budget',()=>{const{context,boundary}=setup(),p=compileRoleShoulderPassStep(pass,context,boundary);let max=0;for(const id of context.ids)for(let k=1;k<=4096;k++){const delta=p.facing(id,k/4096,[])-p.facing(id,(k-1)/4096,[]);max=Math.max(max,Math.abs(Math.atan2(Math.sin(delta),Math.cos(delta)))*4096/2);}assert.ok(max<3.2);});
