import test from 'node:test';
import assert from 'node:assert/strict';
import {compileCrossTrails,type CrossTrailsOptions} from './cross-trails.ts';
import {compileCrossTrailsFigure} from './cross-trails-adapter.ts';
import {distance,turn,type TurnConstraint} from './ring-twirl-contract.ts';
import type {Dancer,Figure,Vec2} from './types.ts';

const corners=[[-.9,-.9],[.9,-.9],[.9,.9],[-.9,.9]];
const pairs=(values:number[][])=>new Map(values.flatMap(([a,b])=>[[a,b],[b,a]]));
export function crossTrailsFixture():CrossTrailsOptions {
 const actors:Dancer[]=corners.map((_,id)=>({id,name:`Actor ${id}`,role:id%2?'robin':'lark',couple:Math.floor(id/2),direction:id<2?1:-1,color:'#438b86'}));
 return{actors,entry:new Map(corners.map(([x,z],id)=>[id,{position:{x,z},yaw:x<0?Math.PI/2:-Math.PI/2,velocity:{x:0,z:0},yawRate:0}])),exit:new Map(corners.map(([x,z],id)=>[id,{position:{x:-x,z:-z},yaw:z<0?0:Math.PI,velocity:{x:0,z:0},yawRate:0}])),relations:{epoch:7,partner:pairs([[0,1],[2,3]]),neighbor:pairs([[0,3],[1,2]])},bindingEpoch:7,frame:{origin:{x:0,z:0},axis:{x:0,z:1}},beats:8,phaseBeats:[4,4],passages:[{relation:'partner',axis:'across',shoulder:'right'},{relation:'neighbor',axis:'along',shoulder:'left'}]};
}
const order=(poses:readonly{id:number;position:Vec2}[])=>[[-1,-1],[1,-1],[1,1],[-1,1]].map(([x,z])=>poses.find(p=>Math.sign(p.position.x)===x&&Math.sign(p.position.z)===z)!.id);

test('cross trails has separate literal partner-right/across then current-neighbor-left/along gates and exact corner endpoints',t=>{
 const o=crossTrailsFixture(),p=compileCrossTrails(o);
 assert.equal(p.beats,8);assert.deepEqual(p.phaseBeats,[4,4]);assert.equal(p.epoch,7);
 assert.deepEqual(order(p.sample(0).poses),[0,1,2,3]);assert.deepEqual(order(p.sample(4).poses),[1,0,3,2]);assert.deepEqual(order(p.sample(8).poses),[2,3,0,1]);
 // This oracle is literal source/corner evidence, not copied from the plan's gates.
 for(const[beat,pairs,axis,shoulder]of[[2,[[0,1],[2,3]],'x','right'],[6,[[0,3],[1,2]],'z','left']]as const){
  const f=p.sample(beat);for(const pair of pairs)for(const[a,b]of[pair,[...pair].reverse()]){const A=f.poses.find(p=>p.id===a)!,B=f.poses.find(p=>p.id===b)!,sign=shoulder==='right'?1:-1;
   assert.ok(Math.abs(A.position[axis]-B.position[axis])<1e-9);assert.ok(sign*((B.position.x-A.position.x)*-Math.cos(A.yaw)+(B.position.z-A.position.z)*Math.sin(A.yaw))>.879999);
   const before=p.sample(beat-.01).poses,after=p.sample(beat+.01).poses;
   assert.ok((before.find(p=>p.id===a)!.position[axis]-before.find(p=>p.id===b)!.position[axis])*(after.find(p=>p.id===a)!.position[axis]-after.find(p=>p.id===b)!.position[axis])<0,'Physical longitudinal crossing, not a near encounter');
  }
 }
 assert.deepEqual(p.gates.map(g=>[g.beat,[...g.pair],g.relation,g.axis,g.shoulder]),[[2,[0,1],'partner','across','right'],[2,[2,3],'partner','across','right'],[6,[0,3],'neighbor','along','left'],[6,[1,2],'neighbor','along','left']]);
 for(const[beat,map]of[[0,o.entry],[4,p.middle],[8,o.exit]]as const)for(const q of p.sample(beat).poses){const wanted=map.get(q.id)!;assert.ok(distance(q.position,wanted.position)<1e-9);assert.ok(Math.abs(turn(q.yaw,wanted.yaw))<1e-9);assert.ok(distance(q.velocity,{x:0,z:0})<1e-7);assert.ok(Math.abs(q.yawRate)<1e-7);}
 assert.ok(p.minimumObservedClearance>=.70);assert.ok(p.maximumObservedSpeed<=.9);assert.ok(p.maximumObservedYawRate<=2);assert.equal(p.contacts().length,0);assert.deepEqual(p.sample(-1),p.sample(0));assert.deepEqual(p.sample(9),p.sample(8));assert.throws(()=>p.sample(NaN),/finite/);assert.throws(()=>p.position(99,.5),/outside/);
 t.diagnostic(JSON.stringify({clearance:p.minimumObservedClearance,speed:p.maximumObservedSpeed,yaw:p.maximumObservedYawRate}));
});

test('cross trails owns source actors, two ordered passages, endpoints and current epoch',()=>{
 const o=crossTrailsFixture(),p=compileCrossTrails(o),expected=p.sample(5.17);o.entry.get(0)!.position.x=99;o.exit.get(0)!.position.z=99;(o.actors as Dancer[])[0].role='robin';(o.relations.neighbor as Map<number,number>).clear();(o.phaseBeats as number[])[0]=5;(o.passages[0] as any).shoulder='left';o.frame.axis.x=1;assert.deepEqual(p.sample(5.17),expected);assert.equal(typeof(p.entry as any).set,'undefined');assert.throws(()=>{p.middle.get(0)!.position.x=99;});assert.throws(()=>{p.passages[0].shoulder='left';});
 for(const change of[{beats:4},{phaseBeats:[3,5]},{bindingEpoch:8},{passages:[{relation:'partner',axis:'across',shoulder:'left'},{relation:'neighbor',axis:'along',shoulder:'right'}]},{passages:[{relation:'partner',axis:'across',shoulder:'right'}]},{frame:{origin:{x:0,z:0},axis:{x:1,z:1}}}])assert.throws(()=>compileCrossTrails({...crossTrailsFixture(),...change}as CrossTrailsOptions));
 const extra=crossTrailsFixture();(extra.passages[0]as any).amount=.5;assert.throws(()=>compileCrossTrails(extra),/ordered/);
 const wrong=crossTrailsFixture();wrong.exit.get(0)!.position.z=-.9;assert.throws(()=>compileCrossTrails(wrong),/opposite corner/);
 const relation=crossTrailsFixture();relation.relations.neighbor=pairs([[0,1],[2,3]]);assert.throws(()=>compileCrossTrails(relation),/identity/);
 const backwards=crossTrailsFixture();backwards.entry.get(0)!.yaw=-Math.PI/2;assert.throws(()=>compileCrossTrails(backwards),/facings/);
 for(const extra of[{direction:'left'},{extraTurn:true},{frame:{...crossTrailsFixture().frame,extra:true}},{frame:{...crossTrailsFixture().frame,axis:{x:0,z:1,extra:true}}}])assert.throws(()=>compileCrossTrails({...crossTrailsFixture(),...extra}as CrossTrailsOptions),/extra/);
});

test('cross-trails gates and lanes are rigid-frame invariant with unrelated opaque IDs',()=>{
 const o=crossTrailsFixture(),idMap=new Map([[0,70],[1,12],[2,99],[3,4]]),theta=.71,origin={x:-2,z:5};
 const rot=(p:Vec2)=>({x:p.x*Math.cos(theta)-p.z*Math.sin(theta),z:p.x*Math.sin(theta)+p.z*Math.cos(theta)}),world=(p:Vec2)=>{const q=rot(p);return{x:origin.x+q.x,z:origin.z+q.z};},map=(m:ReadonlyMap<number,TurnConstraint>)=>new Map([...m].map(([id,p])=>[idMap.get(id)!,{...p,position:world(p.position),yaw:p.yaw-theta}])),rel=(m:ReadonlyMap<number,number>)=>new Map([...m].map(([a,b])=>[idMap.get(a)!,idMap.get(b)!]));
 const a=compileCrossTrails(o),b=compileCrossTrails({...o,actors:o.actors.map(d=>({...d,id:idMap.get(d.id)!})),entry:map(o.entry),exit:map(o.exit),relations:{epoch:7,partner:rel(o.relations.partner),neighbor:rel(o.relations.neighbor)},frame:{origin,axis:rot({x:0,z:1})}});
 for(let n=0;n<=160;n++)for(const p of a.sample(n/20).poses){const q=b.sample(n/20).poses.find(q=>q.id===idMap.get(p.id))!;assert.ok(distance(q.position,world(p.position))<1e-8);assert.ok(Math.abs(turn(q.yaw,p.yaw-theta))<1e-8);}
});

test('terminal improper adapter owns its mutable context and rejects ignored modifier or relation alternatives',()=>{
 const o=crossTrailsFixture(),context={ids:o.actors.map(a=>a.id),dancers:o.actors as Dancer[],start:o.actors.map(a=>({id:a.id,position:{...o.entry.get(a.id)!.position},yaw:o.entry.get(a.id)!.yaw,stride:0,lean:0,bounce:0,turn:0,activity:'robins-chain' as const})),relations:o.relations,bindingEpoch:7};
 const f:Figure={id:'cross',kind:'cross-trails',label:'Cross trails',beats:8,who:'all',entry:'partners-facing-across',exit:'progressed-neighbors',phaseBeats:[4,4],passages:structuredClone(o.passages),progression:true};
 const p=compileCrossTrailsFigure(f,context),before=p.position(0,.71),facing=p.facing(0,.71,context.start);
 for(const change of[{kind:'pass-through'},{beats:4},{who:'partner'},{entry:'ring'},{exit:'ring'},{passingShoulder:'right'},{direction:'left'},{amount:1},{hands:'both'},{phaseBeats:[2,6]},{confidence:'unsupported'}])assert.throws(()=>compileCrossTrailsFigure({...f,...change}as Figure,context));
 assert.throws(()=>compileCrossTrailsFigure(f,{...context,next:{id:'next',kind:'long-lines',label:'Not terminal',beats:8}}),/terminal/);
 assert.throws(()=>compileCrossTrailsFigure(f,{...context,bindingEpoch:8}),/stale/);
 const incompatible=structuredClone(context);incompatible.start[0].position.x=-.8;assert.throws(()=>compileCrossTrailsFigure(f,incompatible),/corners/);
 context.ids[0]=99;context.start[0].position.x=99;context.dancers[0].role='robin';(context.relations.neighbor as Map<number,number>).clear();f.phaseBeats=[3,5];f.passages![0].shoulder='left';
 assert.deepEqual(p.position(0,.71),before);assert.equal(p.facing(0,.71,[]),facing);
});
