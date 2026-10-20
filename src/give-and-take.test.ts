import test from 'node:test';
import assert from 'node:assert/strict';
import {compileGiveAndTake,type GiveAndTakeOptions,type GiveAndTakeConstraint} from './give-and-take.ts';
import {compileGiveAndTakeFigure,type GiveAndTakeFigure} from './give-and-take-adapter.ts';
import {compilePrimitiveFigure} from './engine.ts';
import {Avatar,applyBodyContactAnchors} from './scene.ts';
import {Vector3} from 'three';
import type {Dancer,Dance,Frame,Pose,StudioState,Role,Vec2} from './types.ts';
const actors:Dancer[]=Array.from({length:4},(_,id)=>({id,name:['L1','R1','L2','R2'][id],role:id%2?'robin':'lark',couple:Math.floor(id/2),direction:1,color:'#438b86'}));
const pairMap=(pairs:number[][])=>new Map(pairs.flatMap(([a,b])=>[[a,b],[b,a]]));
const gap=(a:Vec2,b:Vec2={x:0,z:0})=>Math.hypot(a.x-b.x,a.z-b.z);
const angle=(a:number,b:number)=>Math.abs(Math.atan2(Math.sin(a-b),Math.cos(a-b)));
const pose=(x:number,z:number,yaw:number):GiveAndTakeConstraint=>({position:{x,z},yaw,velocity:{x:0,z:0},yawRate:0});
export function giveAndTakeFixture(takeRole:Role='lark'):GiveAndTakeOptions {
 const entry=new Map([[0,pose(-.9,-.45,Math.PI/2)],[1,pose(.9,-.45,-Math.PI/2)],[2,pose(.9,.45,-Math.PI/2)],[3,pose(-.9,.45,Math.PI/2)]]),pairs=takeRole==='lark'?[{takerId:0,takenId:1,relationship:'partner' as const},{takerId:2,takenId:3,relationship:'partner' as const}]:[{takerId:1,takenId:0,relationship:'partner' as const},{takerId:3,takenId:2,relationship:'partner' as const}],exit=new Map<number,GiveAndTakeConstraint>();
 for(const pair of pairs){const s=Math.sign(entry.get(pair.takerId)!.position.x);for(const id of[pair.takerId,pair.takenId]){const z=(actors[id].role==='lark'?s:-s)*.31;exit.set(id,pose(s*.9,z,Math.atan2(0,-z)+Math.PI/3));}}
 return{actors:structuredClone(actors),entry,exit,relations:{epoch:7,partner:pairMap([[0,1],[2,3]]),neighbor:pairMap([[0,3],[1,2]])},bindingEpoch:7,pairs,takeRole,beats:8,phaseBeats:[4,4],approachHold:'joined-inside',hands:'both',exitKind:'same-person-swing',frame:{origin:{x:0,z:0},across:{x:1,z:0}}};
}
const sourceFigure=(role:Role='lark'):GiveAndTakeFigure=>({id:'give',kind:'give-and-take',beats:8,label:'Larks give and take partners',who:'partner',takeRole:role,phaseBeats:[4,4],entry:'side-couples',exit:'same-person-swing',hands:'both',approachHold:'joined-inside'});
const makeContext=(o:GiveAndTakeOptions)=>({ids:o.actors.map(a=>a.id),start:o.actors.map(a=>({id:a.id,position:{...o.entry.get(a.id)!.position},yaw:o.entry.get(a.id)!.yaw,stride:0,lean:0,bounce:0,turn:0,activity:'swing'} as Pose)),dancers:o.actors,relations:o.relations,bindingEpoch:o.bindingEpoch,next:{id:'swing',kind:'swing',beats:8,label:'Partner swing',who:'partner'} as const});
test('both taking roles preserve named partner identity and take back to their own original sideline in exactly eight beats',()=>{
 for(const role of['lark','robin'] as const){const o=giveAndTakeFixture(role),p=compileGiveAndTake(o);assert.equal(p.epoch,7);assert.deepEqual(p.phaseBeats,[4,4]);for(const[beat,m]of[[0,o.entry],[8,o.exit]]as const)for(const a of p.sample(beat).poses){const b=m.get(a.id)!;assert.ok(gap(a.position,b.position)<1e-8);assert.ok(angle(a.yaw,b.yaw)<1e-8);assert.ok(gap(a.velocity)<1e-8);assert.ok(gap(a.acceleration)<1e-8);assert.ok(Math.abs(a.yawRate)<1e-8);}
  for(const pair of p.pairs){assert.equal(o.actors.find(a=>a.id===pair.takerId)!.role,role);assert.equal(o.relations.partner.get(pair.takerId),pair.takenId);const side=Math.sign(o.entry.get(pair.takerId)!.position.x);assert.equal(Math.sign(p.position(pair.takenId,1).x),side);const a=p.sample(5).poses.find(p=>p.id===pair.takerId)!;assert.ok(a.velocity.x*Math.sin(a.yaw)+a.velocity.z*Math.cos(a.yaw)<0,'named taker backs toward own sideline');}
 }
});
test('connected side approach releases before the distinct two-hand received-pair take and releases before swing preparation',()=>{
 const p=compileGiveAndTake(giveAndTakeFixture());assert.equal(p.sample(0).contacts.length,0);for(const t of[.5,1,2,2.6]){const h=p.sample(t).contacts;assert.equal(h.length,2);assert.ok(h.every(c=>c.strength===1));assert.deepEqual(h.map(c=>[c.a,c.b,c.handA,c.handB]),[[0,3,'right','left'],[2,1,'right','left']]);}
 for(const t of[3.6,4,5,6]){const h=p.sample(t).contacts;assert.equal(h.length,4);assert.ok(h.every(c=>c.strength===1));assert.ok(h.every(c=>actors[c.a].couple===actors[c.b].couple));}
 for(let i=0;i<=1600;i++){const f=p.sample(i/200),hands=new Set<string>();for(const h of f.contacts)for(const[id,hand]of[[h.a,h.handA],[h.b,h.handB]]){const key=`${id}/${hand}`;assert.ok(!hands.has(key));hands.add(key);}}
 assert.equal(p.sample(6.65).contacts.length,0);assert.equal(p.sample(8).contacts.length,0);
});
test('exact C2 phase joins, rigid transforms and sampled physical budgets',t=>{
 for(const role of['lark','robin']as const){const o=giveAndTakeFixture(role),p=compileGiveAndTake(o);for(const beat of[4,5.6]){const a=p.sample(beat-1e-7),b=p.sample(beat+1e-7);for(let id=0;id<4;id++){assert.ok(gap(a.poses[id].position,b.poses[id].position)<1e-6);assert.ok(gap(a.poses[id].velocity,b.poses[id].velocity)<1e-5);assert.ok(gap(a.poses[id].acceleration,b.poses[id].acceleration)<1e-4);assert.ok(angle(a.poses[id].yaw,b.poses[id].yaw)<1e-6);}}
  const theta=.63,origin={x:2.3,z:-1.7},rotate=(v:Vec2)=>({x:v.x*Math.cos(theta)-v.z*Math.sin(theta),z:v.x*Math.sin(theta)+v.z*Math.cos(theta)}),map=(m:ReadonlyMap<number,GiveAndTakeConstraint>)=>new Map([...m].map(([id,a])=>{const v=rotate(a.position);return[id,{...a,position:{x:v.x+origin.x,z:v.z+origin.z},velocity:rotate(a.velocity),yaw:a.yaw-theta}];})),r=compileGiveAndTake({...o,entry:map(o.entry),exit:map(o.exit),frame:{origin,across:rotate({x:1,z:0})}});
  for(let i=0;i<=160;i++)for(const a of p.sample(i/20).poses){const b=r.sample(i/20).poses.find(b=>b.id===a.id)!,v=rotate(a.position);assert.ok(gap(b.position,{x:v.x+origin.x,z:v.z+origin.z})<1e-8);assert.ok(angle(b.yaw,a.yaw-theta)<1e-8);}
  assert.ok(p.minimumObservedClearance>=.62-1e-8);assert.ok(p.maximumObservedSpeed<1.06);assert.ok(p.maximumObservedYawRate<2.05);t.diagnostic(`${role}: clearance ${p.minimumObservedClearance}, speed ${p.maximumObservedSpeed}, yaw ${p.maximumObservedYawRate}`);
 }
});
test('unsupported timing, roles, endpoints, stale binding and unconsumed fields fail closed; compiled snapshots stay immutable',()=>{
 const o=giveAndTakeFixture(),p=compileGiveAndTake(o),before=p.sample(5);o.actors[0].role='robin';o.entry.get(0)!.position.x=12;(o.relations.partner as Map<number,number>).clear();(o.pairs[0] as any).takenId=3;assert.deepEqual(p.sample(5),before);assert.equal(typeof(p.entry as any).set,'undefined');assert.throws(()=>{p.exit.get(0)!.position.x=10;});
 for(const edit of[{bindingEpoch:8},{takeRole:'robin'},{phaseBeats:[2,6]},{beats:4},{hands:'right'},{approachHold:'none'},{exitKind:'neighbor-swing'},{maximumSpeed:.1}])assert.throws(()=>compileGiveAndTake({...giveAndTakeFixture(),...edit} as any));
 let bad=giveAndTakeFixture();bad.exit.get(1)!.position.x=.9;assert.throws(()=>compileGiveAndTake(bad),/taker/);bad=giveAndTakeFixture();bad.entry.get(0)!.velocity.x=.1;assert.throws(()=>compileGiveAndTake(bad),/derivatives/);assert.throws(()=>p.sample(NaN),/finite/);assert.throws(()=>p.position(19,.5),/outside/);
 for(const edit of[{amount:1},{direction:'left'},{progression:true},{takeRole:undefined}])assert.throws(()=>compileGiveAndTakeFigure({...sourceFigure(),...edit} as any,makeContext(giveAndTakeFixture())));assert.throws(()=>compileGiveAndTakeFigure(sourceFigure(),{...makeContext(giveAndTakeFixture()),next:{id:'x',kind:'swing',who:'neighbor',beats:8,label:'wrong'}}),/exactly/);
});
test('actual Avatar preserves one footfall per beat and fixed limbs, with reachable new contacts and immediate next swing',t=>{
 globalThis.document={createElement:()=>({getContext:()=>new Proxy({},{get:()=>()=>{},set:()=>true})})} as unknown as Document;
 for(const role of['lark','robin']as const){const o=giveAndTakeFixture(role),context=makeContext(o),f=sourceFigure(role),plan=compileGiveAndTakeFigure(f,context),terminal=context.start.map(p=>({...p,position:plan.position(p.id,1),yaw:plan.facing(p.id,1,context.start)})),swing=compilePrimitiveFigure(context.next,[0,1,2,3],terminal,actors,[1,-1],{swingEntry:'prepared-circle'}),dance={figures:[{kind:'long-lines',beats:8},f,context.next]} as Dance;
  const sample=(beat:number):Frame=>{beat=Math.max(0,Math.min(24-1e-7,beat));const fi=beat<8?0:beat<16?1:2,t=fi===1?(beat-8)/8:fi===2?(beat-16)/8:0,current=fi===2?swing:plan,poses=context.start.map(p=>({...p,position:current.position(p.id,t),yaw:current.facing(p.id,t,context.start),activity:fi===1?'give-and-take':fi===2?'swing':'waiting',stride:fi?1:0,bounce:0,swingPreparation:fi===1?plan.swingPreparation?.(p.id,t):undefined} as Pose));return{beat,localBeat:beat,repeat:0,figureIndex:fi,figureProgress:fi?t:(beat/8),poses,contacts:fi?current.contacts(t,poses):[],warnings:[]};};
  const avatars=actors.map(a=>new Avatar(a));let maxClamp=0,maxWrist=0,held=0,join=0;
  for(let i=0;i<=960;i++){const beat=8+i/120,frame=sample(beat);for(const a of avatars){a.update(frame.poses[a.dancer.id],frame,{dance,showLabels:false}as StudioState,sample);const gait=a.root.userData.gait;assert.equal(gait.phase,beat);assert.equal(gait.maxRate,1);assert.equal(gait.steps,8);maxClamp=Math.max(maxClamp,gait.maxClampDistance);for(const leg of a.legs){assert.ok(Math.abs(leg.upper.scale.y*3-.43)<1e-7);assert.ok(Math.abs(leg.lower.scale.y*3-.43)<1e-7);}}
   const corrected=applyBodyContactAnchors(avatars,frame);avatars.forEach(a=>a.root.updateMatrixWorld(true));for(const h of corrected.contacts)if(h.strength===1){held++;for(const[id,hand]of(!h.target||h.target==='hands'?[[h.a,h.handA],[h.b,h.handB]]:[[h.a,h.handA]])as [number,'left'|'right'][]){const wrist=avatars[id].arms.find(a=>a.side===(hand==='left'?1:-1))!.hand.getWorldPosition(new Vector3());maxWrist=Math.max(maxWrist,wrist.distanceTo(new Vector3(h.point.x,h.point.y,h.point.z)));}}
   if(beat===16)join=corrected.contacts.filter(h=>h.strength===1&&h.kind==='swing-frame').length;
  }avatars.forEach(a=>a.dispose());assert.ok(held>0);assert.equal(join,6);assert.equal(maxClamp,0,`${role} new reach correction ${maxClamp}`);assert.ok(maxWrist<1e-7,`${role} wrist ${maxWrist}`);t.diagnostic(`${role}: zero new leg corrections; wrist error ${maxWrist}; six full frame contacts at first swing count`);
 }
});
test('opaque stable IDs and changed persistent couples keep the explicitly bound received pairs and contact owners',()=>{
 const o=giveAndTakeFixture(),renames=new Map([[0,81],[1,17],[2,402],[3,6]]),id=(n:number)=>renames.get(n)!,map=(m:ReadonlyMap<number,number>)=>new Map([...m].map(([a,b])=>[id(a),id(b)])),end=(m:ReadonlyMap<number,GiveAndTakeConstraint>)=>new Map([...m].map(([a,p])=>[id(a),structuredClone(p)]));
 const renamed={...o,actors:o.actors.map(a=>({...a,id:id(a.id)})),entry:end(o.entry),exit:end(o.exit),relations:{epoch:7,partner:map(o.relations.partner),neighbor:map(o.relations.neighbor)},pairs:o.pairs.map(p=>({...p,takerId:id(p.takerId),takenId:id(p.takenId)}))},p=compileGiveAndTake(o),q=compileGiveAndTake(renamed);
 const neighbor={...giveAndTakeFixture(),actors:actors.map(a=>({...a,couple:a.id===0||a.id===3?0:1})),relations:{epoch:7,partner:pairMap([[0,3],[1,2]]),neighbor:pairMap([[0,1],[2,3]])},pairs:o.pairs.map(p=>({...p,relationship:'neighbor' as const}))},r=compileGiveAndTake(neighbor);
 for(let i=0;i<=160;i++){const a=p.sample(i/20),b=q.sample(i/20),c=r.sample(i/20);for(const x of a.poses){const y=b.poses.find(y=>y.id===id(x.id))!;assert.deepEqual(y.position,x.position);assert.equal(y.yaw,x.yaw);assert.deepEqual(c.poses.find(y=>y.id===x.id),x);}assert.deepEqual(b.contacts,a.contacts.map(h=>({...h,a:id(h.a),b:id(h.b)})));assert.deepEqual(c.contacts,a.contacts);}
});
test('the figure-to-swing adapter also preserves sparse opaque keyed actor identities',()=>{
 const o=giveAndTakeFixture(),context=makeContext(o),renames=new Map([[0,81],[1,17],[2,402],[3,6]]),id=(n:number)=>renames.get(n)!,start:Pose[]=[],dancers:Dancer[]=[];for(const p of context.start)start[id(p.id)]={...p,id:id(p.id),position:{...p.position}};for(const a of actors)dancers[id(a.id)]={...a,id:id(a.id)};const map=(m:ReadonlyMap<number,number>)=>new Map([...m].map(([a,b])=>[id(a),id(b)])),changed={...context,ids:context.ids.map(id),start,dancers,relations:{epoch:7,partner:map(context.relations.partner),neighbor:map(context.relations.neighbor)}},a=compileGiveAndTakeFigure(sourceFigure(),context),b=compileGiveAndTakeFigure(sourceFigure(),changed);
 for(const t of[0,.25,.5,.75,.875,1])for(const n of context.ids){assert.deepEqual(b.position(id(n),t),a.position(n,t));assert.ok(angle(b.facing(id(n),t,start),a.facing(n,t,context.start))<1e-8);const A=a.swingPreparation?.(n,t),B=b.swingPreparation?.(id(n),t);if(A){assert.ok(B);assert.equal(B.strength,A.strength);assert.deepEqual(B.contacts,A.contacts.map(h=>({...h,a:id(h.a),b:id(h.b)})));}else assert.equal(B,undefined);}
});
