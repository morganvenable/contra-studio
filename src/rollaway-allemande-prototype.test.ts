import test from 'node:test';import assert from 'node:assert/strict';
import {createDancers,initialPoses,compilePrimitiveFigure} from './engine.ts';
import {compileRollawayAllemandePrototype} from './rollaway-allemande-prototype.ts';
import {captureSequenceBoundary,assertSequenceHandoff} from './sequence-boundary.ts';
import {sampleFormationEndpoint} from './formation-handoff.ts';
import type {Figure} from './types.ts';import type {FigureContext} from './extended-figures.ts';
const f:Figure={id:'turn',label:'Robin left one-and-a-half turn',kind:'allemande',who:'robins',beats:8,direction:'left',amount:1.5},next:Figure={id:'balance',label:'Partner balance',kind:'balance',who:'partner',beats:4};
const wrap=(x:number)=>Math.atan2(Math.sin(x),Math.cos(x));
// Measured rollaway exit from rollaway-110-investigation: synthetic boundary
// only, not a fabricated source snapshot or a whole-dance interpretation.
function fixture():FigureContext{const dancers=createDancers(2),start=initialPoses(dancers),yaw=[-1.5*Math.PI,-.5*Math.PI,-2.5*Math.PI,.5*Math.PI];for(const p of start){p.position={x:-p.position.x,z:-p.position.z};p.yaw=yaw[p.id];}return{ids:[0,1,2,3],dancers,start,relations:{epoch:2,partner:new Map([[0,1],[1,0],[2,3],[3,2]]),neighbor:new Map([[0,3],[3,0],[1,2],[2,1]])},bindingEpoch:2,next};}
test('actual carried facing and reachable left hands preserve every root sample and full turn',t=>{
 const c=fixture(),b=captureSequenceBoundary(c,24,[]),p=compileRollawayAllemandePrototype(f,c,b),raw=compilePrimitiveFigure(f,c.ids,c.start,c.dancers,[]);assertSequenceHandoff(b,p.entryState);assert.equal(p.exitState.sourceBeat,32);assert.equal(p.exitState.relationshipEpoch,2);assert.deepEqual(p.exitState.partner,b.partner);assert.deepEqual(p.exitState.neighbor,b.neighbor);
 let winding=0,prior=Math.atan2(c.start[1].position.z,c.start[1].position.x);for(let n=0;n<=960;n++){const u=n/960,poses=c.start.map(q=>({...q,position:p.position(q.id,u),yaw:p.facing(q.id,u,c.start)}));for(const id of c.ids)assert.deepEqual(poses[id].position,raw.position(id,u));const angle=Math.atan2(poses[1].position.z,poses[1].position.x);if(n)winding+=wrap(angle-prior);prior=angle;for(const contact of p.contacts(u,poses)){assert.equal(contact.kind,'joined');assert.equal(contact.handA,'left');assert.equal(contact.handB,'left');for(const id of[contact.a,contact.b]){const q=poses[id];assert.ok(Math.hypot(contact.point.x-q.position.x-.235*Math.cos(q.yaw),contact.point.z-q.position.z+.235*Math.sin(q.yaw),contact.point.y-1.355)<=.64);}}}
 assert.ok(Math.abs(winding/(2*Math.PI)+1.5)<1e-12);assert.deepEqual(p.exitState.heldContacts,[]);assert.ok(p.audit.firstFullHoldBeat!<2);assert.ok(p.audit.lastFullHoldBeat!>6);assert.ok(p.audit.maximumStrengthRate<3.1);t.diagnostic(JSON.stringify(p.audit));
 const end=sampleFormationEndpoint(c,p,1),balance=compilePrimitiveFigure(next,c.ids,end,c.dancers,[],{balanceExit:'same-person-swing'});for(const id of c.ids){assert.deepEqual(balance.position(id,0),end[id].position);assert.ok(Math.abs(wrap(balance.facing(id,0,end)-end[id].yaw))<1e-12);}assert.deepEqual(balance.contacts(0,end),[]);
});
test('translated opaque actors and input capture preserve the same local motion',()=>{
 const base=fixture(),map=new Map([[0,6],[1,4],[2,7],[3,5]]),dancers=createDancers(4),start=initialPoses(dancers);for(const[a,b]of map){dancers[b]={...base.dancers[a],id:b,couple:base.dancers[a].couple+10};start[b]={...base.start[a],id:b,position:{x:base.start[a].position.x+3,z:base.start[a].position.z-7}};}
 const remap=(pairs:ReadonlyMap<number,number>)=>new Map([...pairs].map(([a,b])=>[map.get(a)!,map.get(b)!]));const c:FigureContext={ids:[7,4,6,5],dancers,start,relations:{epoch:7,partner:remap(base.relations.partner),neighbor:remap(base.relations.neighbor)},bindingEpoch:7,next};
 const b=captureSequenceBoundary(c,101,[]),p=compileRollawayAllemandePrototype(f,c,b),original=compileRollawayAllemandePrototype(f,base,captureSequenceBoundary(base,24,[]));assertSequenceHandoff(b,p.entryState);assert.equal(p.exitState.sourceBeat,109);
 for(let n=0;n<=32;n++)for(const[a,b]of map){const x=original.position(a,n/32),y=p.position(b,n/32);assert.ok(Math.abs(y.x-x.x-3)<1e-12);assert.ok(Math.abs(y.z-x.z+7)<1e-12);}
 const before=p.position(4,.5);c.start[4].position.x=99;c.relations.partner.clear();assert.deepEqual(p.position(4,.5),before);
});
test('wrong source contract, held/stale state and displaced geometry reject',()=>{
 const c=fixture(),b=captureSequenceBoundary(c,24,[]);for(const edit of[{beats:6},{amount:.75},{direction:'right'},{who:'larks'},{hands:'left'},{progression:true},{confidence:'unsupported'}])assert.throws(()=>compileRollawayAllemandePrototype({...f,...edit} as Figure,c,b),/requires/);
 assert.throws(()=>compileRollawayAllemandePrototype(f,{...c,next:{...next,who:'neighbor'}},b),/requires/);assert.throws(()=>compileRollawayAllemandePrototype(f,{...c,bindingEpoch:3},b),/stale/);
 assert.throws(()=>compileRollawayAllemandePrototype(f,c,{...b,heldContacts:[{a:1,b:3,handA:'left',handB:'left',kind:'joined',strength:1,point:{x:0,y:1.25,z:0}}]}),/released/);
 c.start[1].position.x+=.1;assert.throws(()=>compileRollawayAllemandePrototype(f,c,captureSequenceBoundary(c,24,[])),/standard corners/);
 const clean=fixture(),p=compileRollawayAllemandePrototype(f,clean,captureSequenceBoundary(clean,24,[]));assert.throws(()=>p.position(99,.5),/Unknown/);assert.throws(()=>p.position(1,NaN),/finite/);
});
