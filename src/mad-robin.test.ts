import test from 'node:test';import assert from 'node:assert/strict';
import {compileMadRobin,type MadRobinFigure} from './mad-robin.ts';
import {captureFormationState,assertFormationHandoff,type FormationState} from './formation-handoff.ts';
import {createDancers,initialPoses} from './engine.ts';
const distance=(a:{x:number;z:number},b:{x:number;z:number})=>Math.hypot(a.x-b.x,a.z-b.z);
const angle=(a:number,b:number)=>Math.abs(Math.atan2(Math.sin(a-b),Math.cos(a-b)));
export function madRobinFixture(){
 const dancers=createDancers(2),start=initialPoses(dancers),ids=[0,1,2,3],relations={epoch:4,partner:new Map([[0,1],[1,0],[2,3],[3,2]]),neighbor:new Map([[0,3],[3,0],[1,2],[2,1]])};
 for(const p of start)p.yaw=-Math.sign(p.position.x)*Math.PI/2;
 const state=captureFormationState({ids,start,dancers,relations,bindingEpoch:4},{sourceBeat:56,orderedIds:[1,2,0,3],geometry:{kind:'paired-sidelines',sidePair:'neighbor',origin:{x:0,z:0},halfWidth:.9,pairGap:1.8}});
 const figure:MadRobinFigure={id:'m',label:'Mad robin, robins in front',kind:'mad-robin',who:'all',beats:8,orbitRelation:'neighbor',facingRelation:'partner',frontRole:'robin',orbitDirection:'clockwise',amount:1,entry:'paired-sidelines-facing-across',exit:'same-slots-facing-across'};
 return{state,figure};
}
test('mad robin follows the named neighbor oval while facing the persistent partner across for all eight counts',()=>{
 const {state,figure}=madRobinFixture(),p=compileMadRobin(figure,state),partner=new Map(state.partner);
 assert.equal(p.entryState.sourceBeat,56);assert.equal(p.exitState.sourceBeat,64);assert.equal(p.exitState.relationshipEpoch,4);assert.equal(p.laneRadius,.34);assert.ok(p.minimumObservedClearance>=.68-1e-7);assert.ok(p.maximumObservedSpeed<1.4);
 for(let k=0;k<=960;k++){const t=k/960;assert.deepEqual(p.contacts(t,[]),[]);for(const a of state.actors){const x=p.position(a.id,t),q=p.position(partner.get(a.id)!,t);assert.ok(angle(p.facing(a.id,t,[]),Math.atan2(q.x-x.x,q.z-x.z))<1e-8);}}
 assertFormationHandoff({...state,sourceBeat:64},p.exitState);for(const s of state.orderedSlots){assert.deepEqual(p.position(s.id,0),s.position);assert.deepEqual(p.position(s.id,1),s.position);}
});
test('both passage gates name the original orbit mate and prove the declared inward/outward role order',()=>{
 for(const swap of[false,true])for(const frontRole of['robin','lark']as const){const f=madRobinFixture(),state=structuredClone(f.state);if(swap)for(const s of state.orderedSlots)(s.position as any).z*=-1;const clockwise=(frontRole==='robin')!==swap,p=compileMadRobin({...f.figure,frontRole,orbitDirection:clockwise?'clockwise':'counterclockwise'},state);assert.equal(p.passages.length,2);assert.equal(p.passages[0].innerRole,frontRole);assert.notEqual(p.passages[1].innerRole,frontRole);
  for(const gate of p.passages){const t=(gate.sourceBeat-state.sourceBeat)/8;for(const[a,b]of gate.orbitPairs){assert.equal(new Map(state.neighbor).get(a),b);const A=p.position(a,t),B=p.position(b,t);assert.ok(Math.abs(A.z-B.z)<1e-7);const inner=Math.abs(A.x)<Math.abs(B.x)?a:b;assert.equal(state.actors.find(a=>a.id===inner)!.role,gate.innerRole);assert.ok(distance(A,B)>=.68-1e-7);}}
 }
});
test('the explicit facing relation may be neighbor while the orbit relation is partner in a different actual formation',()=>{
 const f=madRobinFixture(),state=structuredClone(f.state);state.actors.forEach((a:any)=>a.couple=a.id===0||a.id===3?20:30);const partner=state.partner;Object.assign(state,{partner:state.neighbor,neighbor:partner,geometry:{...state.geometry,sidePair:'partner'}});const p=compileMadRobin({...f.figure,orbitRelation:'partner',facingRelation:'neighbor'},state);assert.deepEqual(p.exitState.partner,state.partner);assert.deepEqual(p.exitState.neighbor,state.neighbor);
});
test('mad robin rejects omitted/wrong relations, direction, fractions, hands, timing and held-contact discontinuities',()=>{
 const changes:Array<(f:any,s:any)=>void>=[f=>delete f.orbitDirection,f=>f.orbitDirection='left',f=>f.orbitDirection='counterclockwise',f=>f.frontRole='lark',f=>f.facingRelation='neighbor',f=>f.amount=.5,f=>f.amount=2,f=>f.beats=6,f=>f.hands='both',f=>f.progression=1,(_,s)=>s.geometry.sidePair='partner',(_,s)=>s.relationshipEpoch=-1,(_,s)=>s.sourceBeat=NaN,(_,s)=>s.orderedSlots[0].facing=0,(_,s)=>s.partner[0]=[0,3],(_,s)=>s.heldContacts.push({a:0,b:3,handA:'left',handB:'right',kind:'joined',point:{x:.9,y:1.2,z:0},strength:1})];
 for(const change of changes){const x=madRobinFixture(),f=structuredClone(x.figure),s=structuredClone(x.state);change(f,s);assert.throws(()=>compileMadRobin(f,s));}
});
test('a terminal marker alone does not change actor relations or add terminal travel',()=>{
 const {state,figure}=madRobinFixture(),a=compileMadRobin(figure,state),b=compileMadRobin({...figure,progression:true},state);assert.deepEqual(a.exitState,b.exitState);for(let t=0;t<=1;t+=.05)for(const s of state.orderedSlots)assert.deepEqual(a.position(s.id,t),b.position(s.id,t));
});
test('input/output ownership and scrubbing keep source clocks, named people and roots immutable',()=>{
 const x=madRobinFixture(),state=structuredClone(x.state),figure=structuredClone(x.figure),p=compileMadRobin(figure,state),before=p.position(0,.27);figure.orbitDirection='counterclockwise';(state.orderedSlots[0].position as any).x=20;(state.partner as any)[0]=[0,3];assert.deepEqual(p.position(0,.27),before);p.position(0,.83);assert.deepEqual(p.position(0,.27),before);const out=p.position(0,.27);out.x=200;assert.deepEqual(p.position(0,.27),before);assert.ok(Object.isFrozen(p.exitState.orderedSlots[0].position));assert.throws(()=>p.position(42,.5),/outside/);for(const t of[NaN,Infinity]){assert.throws(()=>p.position(0,t),/finite/);assert.throws(()=>p.facing(0,t,[]),/finite/);assert.throws(()=>p.contacts(t,[]),/finite/);}
});
test('plain-data capture rejects nested accessors without invoking them and captures descriptor changes once',()=>{
 for(const target of['figure','state','geometry','slot','actor']as const){const x=madRobinFixture(),f=structuredClone(x.figure),s=structuredClone(x.state);let reads=0;const obj=target==='figure'?f:target==='state'?s:target==='geometry'?s.geometry:target==='slot'?s.orderedSlots[0]:s.actors[0],key=target==='figure'?'orbitDirection':target==='state'?'sourceBeat':target==='geometry'?'halfWidth':target==='slot'?'position':'role',value=(obj as any)[key];Object.defineProperty(obj,key,{enumerable:true,get(){reads++;return value;}});assert.throws(()=>compileMadRobin(f,s),/accessors/);assert.equal(reads,0);}
 for(const kind of['hidden','symbol','prototype','array-key']){const x=madRobinFixture(),f=structuredClone(x.figure),s=structuredClone(x.state);if(kind==='hidden')Object.defineProperty(f,'extraTurn',{value:1});if(kind==='symbol')(f as any)[Symbol('extraTurn')]=1;if(kind==='prototype')Object.setPrototypeOf(f,null);if(kind==='array-key')(s.orderedSlots as any).extra=1;assert.throws(()=>compileMadRobin(f,s));}
});
test('translated formations and nonadjacent actor IDs keep named bindings instead of relying on screen quadrants or numeric adjacency',()=>{
 const x=madRobinFixture(),s=structuredClone(x.state),ids=new Map([[0,91],[1,14],[2,57],[3,32]]),base=compileMadRobin(x.figure,x.state);
 Object.assign(s.geometry,{origin:{x:8.4,z:-13.2}});for(const a of s.actors)(a as any).id=ids.get(a.id)!;for(const name of['partner','neighbor']as const)(s as any)[name]=s[name].map(([a,b])=>[ids.get(a)!,ids.get(b)!]);for(const slot of s.orderedSlots){(slot as any).id=ids.get(slot.id)!;Object.assign(slot.position,{x:slot.position.x+8.4,z:slot.position.z-13.2});}
 const p=compileMadRobin(x.figure,s);for(let t=0;t<=1;t+=.01)for(const[old,id]of ids){const a=base.position(old,t),b=p.position(id,t);assert.ok(dist2(a,{x:b.x-8.4,z:b.z+13.2})<1e-8);assert.equal(base.facing(old,t,[]),p.facing(id,t,[]));}
 function dist2(a:{x:number;z:number},b:{x:number;z:number}){return Math.hypot(a.x-b.x,a.z-b.z);}
});

test('mad robin retains positive raw holds and representable source clocks at admission',()=>{
 for(const strength of[.005,5e-8]){const{figure,state}=madRobinFixture(),s=structuredClone(state);(s.heldContacts as any).push({a:0,b:3,handA:'left',handB:'right',kind:'joined',point:{x:.9,y:1.2,z:0},strength});assert.throws(()=>compileMadRobin(figure,s),/held contact/);}
 const{figure,state}=madRobinFixture();assert.throws(()=>compileMadRobin(figure,{...state,sourceBeat:1e20}),/source clocks/);
});
