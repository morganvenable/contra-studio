import test from 'node:test';
import assert from 'node:assert/strict';
import {Vector3} from 'three';
import {compileRingBalance,type RingBalanceOptions} from './ring-balance.ts';
import {compileCaliforniaTwirl,type CaliforniaTwirlOptions} from './california-twirl.ts';
import {compileRingBalanceFigure,compileCaliforniaTwirlFigure} from './ring-california-adapter.ts';
import {Avatar,applyBodyContactAnchors} from './scene.ts';
import type {Dancer,Pose,Frame,Dance,StudioState,Vec2,Figure} from './types.ts';
import {distance,heading,turn,type TurnConstraint} from './ring-twirl-contract.ts';
import type {FigureContext} from './extended-figures.ts';
const actors:Dancer[]=Array.from({length:4},(_,id)=>({id,name:['L1','R1','L2','R2'][id],role:id%2?'robin':'lark',couple:Math.floor(id/2),direction:id<2?1:-1,color:'#438b86'}));
const pairs=(pairs:number[][])=>new Map(pairs.flatMap(([a,b])=>[[a,b],[b,a]]));
const relations={epoch:7,partner:pairs([[0,1],[2,3]]),neighbor:pairs([[0,3],[1,2]])};
const constraint=(x:number,z:number,yaw:number):TurnConstraint=>({position:{x,z},yaw,velocity:{x:0,z:0},yawRate:0});
function ring(twirl=true):RingBalanceOptions {
 const points=[[-.55,.55],[.55,.55],[.55,-.55],[-.55,-.55]],entry=new Map(points.map(([x,z],id)=>[id,constraint(x,z,heading({x,z},{x:0,z:0}))])),exit=new Map(points.map(([x,z],id)=>[id,twirl?constraint(x,Math.sign(z)*.9,z>0?Math.PI:0):constraint(x,z,heading({x,z},{x:0,z:0}))]));
 return{actors:structuredClone(actors),entry,exit,relations:structuredClone(relations),bindingEpoch:7,cyclicIds:[3,2,1,0],beats:4,hands:'both',exitMode:twirl?'partner-california-twirl':'same-ring'};
}
function twirl(overId=0):CaliforniaTwirlOptions {const r=ring(),underId=overId+1,ids=[overId,underId],entry=new Map(ids.map(id=>[id,r.exit.get(id)!])),entrySlots=new Map(ids.map(id=>[id,{x:Math.sign(entry.get(id)!.position.x)*.9,z:entry.get(id)!.position.z}])),exit=new Map(ids.map(id=>[id,{...entry.get(id)!,position:{...entrySlots.get(id===overId?underId:overId)!},yaw:entry.get(id)!.yaw+Math.PI}]));return{actors:ids.map(id=>structuredClone(actors[id])),entry,exit,entrySlots,relations:structuredClone(relations),bindingEpoch:7,overId,underId,overHand:'right',underHand:'left',beats:4,direction:'right',amount:.5};}
const context=(r=ring()):FigureContext=>({ids:[0,1,2,3],dancers:r.actors as Dancer[],start:r.actors.map(a=>({id:a.id,position:{...r.entry.get(a.id)!.position},yaw:r.entry.get(a.id)!.yaw,stride:0,bounce:0,lean:0,turn:0,activity:'circle'})),relations:r.relations,bindingEpoch:7,next:twirlFigure});
const ringFigure:Figure={id:'ring',kind:'ring-balance',label:'Balance the ring',beats:4,who:'all',hands:'both',exit:'partner-california-twirl'};
const twirlFigure:Figure={id:'twirl',kind:'california-twirl',label:'Partners California twirl',beats:4,who:'partner',hands:'right-left',underRole:'robin',direction:'right',amount:.5,entry:'side-by-side-facing-same',progression:true};
test('ring balance holds all four named cyclic edges and moves inward then outward on four source counts',()=>{
 for(const prepare of[false,true]){const o=ring(prepare),p=compileRingBalance(o);assert.equal(p.epoch,7);assert.deepEqual(p.cyclicIds,[3,2,1,0]);for(const b of[0,.5,1,2,2.5,3]){const f=p.sample(b);assert.equal(f.contacts.length,4);assert.ok(f.contacts.every(c=>c.strength===1));assert.deepEqual(f.contacts.map(c=>[c.a,c.b,c.handA,c.handB]),[[3,2,'left','right'],[2,1,'left','right'],[1,0,'left','right'],[0,3,'left','right']]);for(const actor of f.poses){assert.equal(actor.balance.otherId,[2,3,0,1][actor.id]);assert.equal(actor.balance.contactIds!.length,2);}}
  for(const id of[0,1,2,3]){const r=(b:number)=>distance(p.sample(b).poses[id].position,{x:0,z:0});assert.ok(r(0)>r(1)&&r(1)>r(2));assert.ok(r(2)<r(2.5)&&r(2.5)<r(3));for(const [b,map]of[[0,o.entry],[4,o.exit]] as const){const q=p.sample(b).poses[id];assert.ok(distance(q.position,map.get(id)!.position)<1e-9);assert.ok(Math.abs(turn(q.yaw,map.get(id)!.yaw))<1e-9);assert.ok(distance(q.velocity,{x:0,z:0})<1e-8);}}
  assert.equal(p.sample(4).contacts.length,prepare?2:4);
 }
});
test('California twirl exchanges explicit partner slots with opposite hands and same-facing entry',()=>{
 for(const over of[0,2]){const o=twirl(over),p=compileCaliforniaTwirl(o);assert.equal(p.beats,4);assert.equal(p.epoch,7);for(const[b,map]of[[0,o.entry],[4,o.exit]] as const)for(const q of p.sample(b).poses){assert.ok(distance(q.position,map.get(q.id)!.position)<1e-9);assert.ok(Math.abs(turn(q.yaw,map.get(q.id)!.yaw))<1e-9);assert.ok(distance(q.velocity,{x:0,z:0})<1e-8);}
  assert.ok(Math.abs(turn(p.sample(0).poses[0].yaw,p.sample(0).poses[1].yaw))<1e-9);for(const b of[.25,.75,1,2,3]){const f=p.sample(b),c=f.contacts[0];assert.deepEqual([c.a,c.b,c.handA,c.handB,c.underId],[over,over+1,'right','left',over+1]);assert.ok(f.poses[0].yawRate<0&&f.poses[1].yawRate>0);const forward={x:Math.sin(o.entry.get(over)!.yaw),z:Math.cos(o.entry.get(over)!.yaw)},v=(id:number)=>{const q=f.poses.find(p=>p.id===id)!,e=o.entry.get(id)!;return(q.position.x-e.position.x)*forward.x+(q.position.z-e.position.z)*forward.z;};assert.ok(v(over)>v(over+1)&&v(over+1)>0);}
  assert.ok(p.minimumObservedClearance>=.5);assert.ok(p.maximumObservedSpeed<1.2);assert.equal(p.sample(4).contacts.length,0);assert.deepEqual(p.sample(-2),p.sample(0));assert.deepEqual(p.sample(8),p.sample(4));assert.throws(()=>p.sample(NaN),/finite/);
 }
});
test('exact ring-to-twirl endpoint roots, facing and held partner wrists are continuous',()=>{
 const c=context(),r=compileRingBalanceFigure(ringFigure,c),end=c.start.map(p=>({...p,position:r.position(p.id,1),yaw:r.facing(p.id,1,[])})),t=compileCaliforniaTwirlFigure(twirlFigure,{...c,start:end,next:undefined}),a=r.contacts(1,end),b=t.contacts(0,end);assert.equal(a.length,2);assert.equal(b.length,2);
 for(const p of end){assert.ok(distance(p.position,t.position(p.id,0))<1e-9);assert.ok(Math.abs(turn(p.yaw,t.facing(p.id,0,end)))<1e-9);const x=a.find(h=>h.a===p.id||h.b===p.id)!,y=b.find(h=>h.a===p.id||h.b===p.id)!;assert.ok(Math.hypot(x.point.x-y.point.x,x.point.y-y.point.y,x.point.z-y.point.z)<1e-9);}
});
test('snapshots cannot be mutated and invalid identities, stale bindings and ignored modifiers reject',()=>{
 const o=ring(),p=compileRingBalance(o),before=p.sample(2);o.entry.get(0)!.position.x=99;(o.relations.partner as Map<number,number>).clear();o.actors[0].role='robin';assert.deepEqual(p.sample(2),before);assert.equal(typeof(p.entry as any).set,'undefined');assert.throws(()=>{p.entry.get(0)!.position.x=2;});assert.throws(()=>compileRingBalance({...ring(),bindingEpoch:8}),/epoch/);assert.throws(()=>compileRingBalance({...ring(),cyclicIds:[3,1,2,0]}),/adjacent/);assert.throws(()=>compileRingBalance({...ring(),beats:8} as any));
 const q=twirl(),t=compileCaliforniaTwirl(q),old=t.sample(2);q.entrySlots.get(0)!.x=99;q.entry.get(0)!.position.x=99;(q.relations.partner as Map<number,number>).clear();assert.deepEqual(t.sample(2),old);
 for(const changes of[{overHand:'left'},{underHand:'right'},{underId:2},{beats:8},{amount:1},{direction:'left'},{bindingEpoch:8}])assert.throws(()=>compileCaliforniaTwirl({...twirl(),...changes} as any));const facing=twirl();facing.entry.get(1)!.yaw+=Math.PI;assert.throws(()=>compileCaliforniaTwirl(facing),/same-facing/);const swapped=twirl();swapped.exit.get(0)!.position.x=-.9;assert.throws(()=>compileCaliforniaTwirl(swapped),/exchange|exit/);
 for(const figure of[{...ringFigure,direction:'left'},{...twirlFigure,notation:'PR'},{...twirlFigure,who:'neighbor'},{...twirlFigure,exit:'partner-two-hand-hold'},{...twirlFigure,phaseBeats:[3,1]}] as Figure[])assert.throws(()=>figure.kind==='ring-balance'?compileRingBalanceFigure(figure,context()):compileCaliforniaTwirlFigure(figure,context()));
});
function rigFixture(){const r=compileRingBalance(ring()),ts=[compileCaliforniaTwirl(twirl(0)),compileCaliforniaTwirl(twirl(2))],dance={figures:[{kind:'circle',beats:4},ringFigure,twirlFigure,{kind:'long-lines',beats:4}]} as Dance;const sample=(beat:number):Frame=>{beat=Math.max(0,Math.min(16-1e-8,beat));const fi=Math.floor(beat/4),local=beat-fi*4,use=fi<2?r.sample(fi===0?0:local):undefined,roots=use?.poses??ts.flatMap(t=>t.sample(fi===2?local:4).poses),contacts=use?.contacts??ts.flatMap(t=>t.sample(fi===2?local:4).contacts),poses=Array.from({length:4},(_,id)=>{const q=roots.find(p=>p.id===id)!;return{id,position:q.position,yaw:q.yaw,stride:1,lean:0,bounce:0,turn:0,activity:dance.figures[fi].kind,balance:fi===1?('balance'in q?q.balance:undefined):undefined,arch:fi===2?{underId:id%2?id:id+1,progress:(q as any).archProgress,kneeLowering:(q as any).kneeLowering}:undefined} as Pose;});return{beat,localBeat:beat,figureIndex:fi,figureProgress:local/4,repeat:0,poses,contacts,warnings:[]};};return{dance,sample};}
test('actual Avatar ring and California twirl retain fixed limbs, one footfall per beat and reachable full-strength wrists',()=>{
 globalThis.document={createElement:()=>({getContext:()=>new Proxy({},{get:()=>()=>{},set:()=>true})})} as unknown as Document;
 const {dance,sample}=rigFixture(),avatars=actors.map(d=>new Avatar(d));let clamps=0,maxClamp=0,maxWrist=0,worst='';
 for(let i=0;i<640;i++){const beat=4+i/80,f=sample(beat);for(const a of avatars){a.update(f.poses[a.dancer.id],f,{dance,showLabels:false} as StudioState,sample);const g=a.root.userData.gait;assert.equal(g.phase,beat);assert.equal(g.steps,4);assert.equal(g.maxRate,1);clamps+=g.reachClamps;if(g.maxClampDistance>maxClamp){maxClamp=g.maxClampDistance;worst=`${beat}/${a.dancer.id}/${f.poses[a.dancer.id].activity}`;}for(const leg of a.legs){assert.ok(Math.abs(leg.upper.scale.y*3-.43)<1e-7);assert.ok(Math.abs(leg.lower.scale.y*3-.43)<1e-7);}}
  const corrected=applyBodyContactAnchors(avatars,f);avatars.forEach(a=>a.root.updateMatrixWorld(true));for(const h of corrected.contacts)if(h.strength>=1-1e-10)for(const[id,hand]of[[h.a,h.handA],[h.b,h.handB]] as const){const arm=avatars[id].arms.find(a=>a.side===(hand==='left'?1:-1))!,actual=arm.hand.getWorldPosition(new Vector3());maxWrist=Math.max(maxWrist,actual.distanceTo(new Vector3(h.point.x,h.point.y,h.point.z)));assert.ok(Math.abs(arm.upper.scale.y*3-.325)<1e-7);assert.ok(Math.abs(arm.lower.scale.y*3-.325)<1e-7);}
 }
 avatars.forEach(a=>a.dispose());assert.equal(clamps,0,`clamps${clamps}, maximum${maxClamp} at${worst}`);assert.ok(maxWrist<1e-7,`hand target miss${maxWrist}`);
});

test('ring rejects reachable-looking long rectangular edges that exceed fixed arm lengths',()=>{
 const o=ring(false);for(const[id,p]of o.entry){p.position.x=Math.sign(p.position.x)*.86;p.position.z=Math.sign(p.position.z)*.5;p.yaw=heading(p.position,{x:0,z:0});const e=o.exit.get(id)!;e.position={...p.position};e.yaw=p.yaw;}
 assert.throws(()=>compileRingBalance(o),/unreachable full-strength handhold/);
});
test('stable opaque IDs and rigid world transforms preserve ring and twirl identities',()=>{
 const mapping=new Map([[0,14],[1,2],[2,99],[3,37]]),o=ring(false),theta=.73,origin={x:2.8,z:-1.4},rotate=(p:Vec2)=>({x:origin.x+p.x*Math.cos(theta)-p.z*Math.sin(theta),z:origin.z+p.x*Math.sin(theta)+p.z*Math.cos(theta)}),map=(m:ReadonlyMap<number,TurnConstraint>)=>new Map([...m].map(([id,p])=>[mapping.get(id)!,{...p,position:rotate(p.position),yaw:p.yaw-theta}])),rel=(m:ReadonlyMap<number,number>)=>new Map([...m].map(([a,b])=>[mapping.get(a)!,mapping.get(b)!]));
 const shifted=compileRingBalance({...o,actors:o.actors.map(a=>({...a,id:mapping.get(a.id)!})),entry:map(o.entry),exit:map(o.exit),cyclicIds:o.cyclicIds.map(id=>mapping.get(id)!) as [number,number,number,number],relations:{epoch:7,partner:rel(o.relations.partner),neighbor:rel(o.relations.neighbor)}}),plain=compileRingBalance(o);
 for(let i=0;i<=40;i++)for(const p of plain.sample(i/10).poses){const q=shifted.sample(i/10).poses.find(a=>a.id===mapping.get(p.id))!;assert.ok(distance(q.position,rotate(p.position))<1e-8);assert.ok(Math.abs(turn(q.yaw,p.yaw-theta))<1e-8);assert.equal(q.balance.otherId,mapping.get(p.balance.otherId));}
 const t=twirl(),tp=compileCaliforniaTwirl(t),tt=compileCaliforniaTwirl({...t,actors:t.actors.map(a=>({...a,id:mapping.get(a.id)!})),overId:14,underId:2,entry:map(t.entry),exit:map(t.exit),entrySlots:new Map([...t.entrySlots].map(([id,p])=>[mapping.get(id)!,rotate(p)])),relations:{epoch:7,partner:rel(t.relations.partner),neighbor:rel(t.relations.neighbor)}});
 for(let i=0;i<=40;i++)for(const p of tp.sample(i/10).poses){const q=tt.sample(i/10).poses.find(a=>a.id===mapping.get(p.id))!;assert.ok(distance(q.position,rotate(p.position))<1e-8);assert.ok(Math.abs(turn(q.yaw,p.yaw-theta))<1e-8);}
});
test('actual rig feet physically land on every ring and twirl beat with alternating support',()=>{
 globalThis.document={createElement:()=>({getContext:()=>new Proxy({},{get:()=>()=>{},set:()=>true})})} as unknown as Document;
 const{dance,sample}=rigFixture(),avatars=actors.map(d=>new Avatar(d));let landings=0;
 for(let beat=4;beat<12;beat++)for(const a of avatars){const leg=a.legs.find(l=>l.side===(beat%2?1:-1))!;const f=sample(beat-.5);a.update(f.poses[a.dancer.id],f,{dance,showLabels:false} as StudioState,sample);assert.ok(leg.foot.position.y>.055+1e-5,`airborne ${beat}/${a.dancer.id}`);const at=sample(beat);a.update(at.poses[a.dancer.id],at,{dance,showLabels:false} as StudioState,sample);assert.ok(Math.abs(leg.foot.position.y-.055)<1e-9);landings++;}
 assert.equal(landings,32);avatars.forEach(a=>a.dispose());
});
