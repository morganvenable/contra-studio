import test from 'node:test';import assert from 'node:assert/strict';
import {createDancers,initialPoses,compilePrimitiveFigure} from './engine.ts';
import {compileRoleTurnSwingPrototype} from './role-turn-swing-prototype.ts';
import {captureSequenceBoundary,assertSequenceHandoff} from './sequence-boundary.ts';
import type {FigureContext} from './extended-figures.ts';import type {Figure} from './types.ts';
const f:Figure={id:'turn',label:'Turn',kind:'allemande',who:'robins',direction:'right',amount:.75,beats:6},next:Figure={id:'swing',label:'Neighbor swing',kind:'swing',who:'neighbor',beats:10};
const wrap=(x:number)=>Math.atan2(Math.sin(x),Math.cos(x));
function fixture():FigureContext{const dancers=createDancers(2);return{ids:[0,1,2,3],dancers,start:initialPoses(dancers),bindingEpoch:4,relations:{epoch:4,partner:new Map([[0,1],[1,0],[2,3],[3,2]]),neighbor:new Map([[0,3],[3,0],[1,2],[2,1]])},next};}
test('complete held three-quarter turn precedes release, frame approach and exact consumer hold',t=>{
 const c=fixture(),b=captureSequenceBoundary(c,12,[]),p=compileRoleTurnSwingPrototype(f,c,b),poses=(beat:number)=>c.start.map(q=>({...q,position:p.position(q.id,beat/6),yaw:p.facing(q.id,beat/6,c.start)}));
 assertSequenceHandoff(b,p.entryState);assert.equal(p.exitState.sourceBeat,18);assert.equal(p.exitState.relationshipEpoch,4);assert.deepEqual(p.exitState.neighbor,b.neighbor);
 let winding=0,prior=Math.atan2(c.start[1].position.z,c.start[1].position.x);for(let n=1;n<=600;n++){const q=p.position(1,n/120/6),angle=Math.atan2(q.z,q.x);winding+=wrap(angle-prior);prior=angle;}assert.ok(Math.abs(winding/(2*Math.PI)-.75)<1e-12);
 assert.equal(p.contacts(5/6,poses(5))[0].strength,1);assert.deepEqual(p.contacts(5.25/6,poses(5.25)),[]);assert.deepEqual(p.contacts(5.5/6,poses(5.5)),[]);
 for(let n=0;n<=30;n++)assert.deepEqual(p.position(1,(5+n/120)/6),p.position(1,5/6));
 const end=poses(6),s=compilePrimitiveFigure(next,c.ids,end,c.dancers,[],{swingEntry:'prepared-circle'});for(const id of c.ids){assert.deepEqual(s.position(id,0),end[id].position);assert.ok(Math.abs(wrap(s.facing(id,0,end)-end[id].yaw))<1e-10);}assert.deepEqual(s.contacts(0,end),p.contacts(1,end));
 assert.equal(p.contacts(.4,poses(2.4))[0].kind,'joined');assert.deepEqual(p.contacts(5.8/6,poses(5.8)),[]);assert.equal(p.contacts(5.99/6,poses(5.99)).length,6);assert.ok(p.contactAudit.passed);assert.ok(p.contactAudit.maximumShoulderReach<=.64);t.diagnostic(JSON.stringify({motion:p.motionCertificate,contact:p.contactAudit}));
});
test('translation and nonzero carried facing survive; unsupported holds reject',()=>{
 const c=fixture();for(const q of c.start){q.position.x+=5;q.position.z-=7;q.yaw+=.1;}const b=captureSequenceBoundary(c,100,[]),p=compileRoleTurnSwingPrototype(f,c,b);assertSequenceHandoff(b,p.entryState);assert.equal(p.exitState.sourceBeat,106);const before=p.position(1,.5);c.start[1].position.x=99;assert.deepEqual(p.position(1,.5),before);
 assert.throws(()=>compileRoleTurnSwingPrototype({...f,amount:1},fixture(),captureSequenceBoundary(fixture(),0,[])),/requires/);
});
test('opaque identity permutation and unsupported boundary controls',()=>{
 const original=fixture(),map=new Map([[0,6],[1,4],[2,7],[3,5]]),dancers=createDancers(4),start=initialPoses(dancers);
 for(const[a,b]of map){dancers[b]={...original.dancers[a],id:b,couple:original.dancers[a].couple+10};start[b]={...original.start[a],id:b,position:{...original.start[a].position}};}
 const c:FigureContext={ids:[7,4,6,5],dancers,start,bindingEpoch:4,relations:{epoch:4,partner:new Map([...original.relations.partner].map(([a,b])=>[map.get(a)!,map.get(b)!])),neighbor:new Map([...original.relations.neighbor].map(([a,b])=>[map.get(a)!,map.get(b)!]))},next};
 const b=captureSequenceBoundary(c,0,[]),p=compileRoleTurnSwingPrototype(f,c,b);assertSequenceHandoff(b,p.entryState);assert.ok(p.contactAudit.passed);
 const base=compileRoleTurnSwingPrototype(f,original,captureSequenceBoundary(original,0,[]));for(let n=0;n<=24;n++)for(const[a,b]of map)assert.deepEqual(p.position(b,n/24),base.position(a,n/24));
 assert.throws(()=>compileRoleTurnSwingPrototype({...f,who:'larks'},c,b),/requires/);assert.throws(()=>compileRoleTurnSwingPrototype({...f,hands:'right'},c,b),/requires/);assert.throws(()=>compileRoleTurnSwingPrototype(f,{...c,next:{...next,beats:8}},b),/requires/);assert.throws(()=>compileRoleTurnSwingPrototype(f,{...c,bindingEpoch:5},b),/stale/);
 assert.throws(()=>compileRoleTurnSwingPrototype(f,c,{...b,heldContacts:[{a:4,b:5,handA:'right',handB:'right',kind:'joined',strength:1,point:{x:0,y:1.14,z:0}}]}),/released/);
 assert.throws(()=>p.position(4,NaN),/finite/);assert.throws(()=>p.position(99,.5),/Unknown/);
});
