import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createDancers,initialPoses} from './engine.ts';
import {compileCarriedRightLeftThroughStep,needsCarriedRightLeftThroughEntry} from './carried-right-left-through-adapter.ts';
import {compileRightLeftThroughFigure} from './right-left-through-adapter.ts';
import {captureSequenceBoundary,assertSequenceHandoff,ownSequenceBoundary} from './sequence-boundary.ts';
import {sampleFormationEndpoint} from './formation-handoff.ts';
import type {FigureContext,MotionPlan} from './extended-figures.ts';
import type {Figure,HandContact,Pose} from './types.ts';
const evidence=JSON.parse(readFileSync(new URL('../test-data/measured-six-two/prefix-results.json',import.meta.url),'utf8'));
const pair=(pairs:number[][])=>new Map(pairs.flatMap(([a,b])=>[[a,b],[b,a]]));
const angle=(a:number,b:number)=>Math.abs(Math.atan2(Math.sin(a-b),Math.cos(a-b)));
const distance=(a:{x:number;z:number},b:{x:number;z:number})=>Math.hypot(a.x-b.x,a.z-b.z);
const row=(neighbor=false):Figure=>({id:'arbitrary-rlt-row',kind:'right-left-through',beats:8,label:'Right and left through',who:neighbor?'neighbor':'partner',crossingRelation:neighbor?'partner':'neighbor',courtesyLeader:'lark',direction:'right',confidence:'approximate'});
function context(halfWidth=.9,halfDepth=.9):FigureContext {
 const dancers=createDancers(2),start=initialPoses(dancers),points=[[-halfWidth,-halfDepth],[-halfWidth,halfDepth],[halfWidth,halfDepth],[halfWidth,-halfDepth]];
 points.forEach(([x,z],id)=>{start[id]={...start[id],position:{x,z},yaw:x<0?Math.PI/2:-Math.PI/2};});
 return{ids:[0,1,2,3],start,dancers,relations:{epoch:7,partner:pair([[0,1],[2,3]]),neighbor:pair([[0,3],[1,2]])},bindingEpoch:7};
}
function literal(sourceId:340|682){
 const saved=evidence.find((x:any)=>x.sourceId===sourceId),last=saved.boundaries.at(-1),c=context();
 for(const p of last.poses)c.start[p.id]={...c.start[p.id],position:{...p.position},yaw:p.yaw};
 const contacts:HandContact[]=structuredClone(last.heldContacts),boundary=captureSequenceBoundary(c,last.sourceBeat,contacts);
 return{context:c,contacts,boundary,figure:row(sourceId===682),saved};
}
function sampled(plan:MotionPlan,c:FigureContext,t:number):Pose[]{return sampleFormationEndpoint(c,plan,t);}
function metrics(plan:MotionPlan,c:FigureContext){
 let clearance=Infinity,speed=0,yawRate=0;const h=1e-6;
 for(let n=0;n<=3200;n++){
  const t=n/3200,lo=Math.max(0,t-h),hi=Math.min(1,t+h),at=sampled(plan,c,t),left=sampled(plan,c,lo),right=sampled(plan,c,hi),contacts=plan.contacts(t,at),hands=new Set<string>();
  for(const id of c.ids){speed=Math.max(speed,distance(left[id].position,right[id].position)/((hi-lo)*8));yawRate=Math.max(yawRate,angle(left[id].yaw,right[id].yaw)/((hi-lo)*8));}
  for(let a=0;a<4;a++)for(let b=a+1;b<4;b++)clearance=Math.min(clearance,distance(at[c.ids[a]].position,at[c.ids[b]].position));
  for(const contact of contacts){assert.ok(Number.isFinite(contact.strength)&&contact.strength>0&&contact.strength<=1);for(const key of[`${contact.a}/${contact.handA}`,`${contact.b}/${contact.handB}`]){assert.ok(!hands.has(key),`duplicate hand at${t}`);hands.add(key);}}
 }
 return{clearance,speed,yawRate};
}
const corners=(poses:readonly {id:number;position:{x:number;z:number}}[])=>[...poses].sort((a,b)=>{const slot=(p:typeof a)=>p.position.z<0?(p.position.x<0?0:1):(p.position.x>0?2:3);return slot(a)-slot(b);}).map(p=>p.id);
for(const sourceId of[340,682] as const)test(`literal${sourceId} incoming state retains roots, named people, clock, contacts and reflected endpoint`,()=>{
 const f=literal(sourceId),p=compileCarriedRightLeftThroughStep(f.figure,f.context,f.boundary);
 assertSequenceHandoff(f.boundary,p.entryState);assert.equal(p.entryState.sourceBeat,sourceId===340?48:16);assert.equal(p.exitState.sourceBeat,sourceId===340?56:24);assert.equal(p.exitState.relationshipEpoch,7);assert.deepEqual(p.exitState.partner,p.entryState.partner);assert.deepEqual(p.exitState.neighbor,p.entryState.neighbor);
 assert.deepEqual(corners(p.entryState.poses),sourceId===340?[0,3,2,1]:[2,3,0,1]);assert.deepEqual(corners(p.exitState.poses),sourceId===340?[2,1,0,3]:[0,1,2,3]);
 assert.equal(p.entryMode,sourceId===340?'held-ring-release':'released-facing-preparation');
 assert.equal(f.contacts.length,4);assert.ok(f.contacts.every(c=>c.strength===(sourceId===340?1:0)));assert.equal(p.entryState.heldContacts.length,sourceId===340?4:0);assert.deepEqual(p.exitState.heldContacts,[]);
 for(const initial of p.entryState.poses){const end=p.exitState.poses.find(x=>x.id===initial.id)!;assert.ok(Math.abs(end.position.x+initial.position.x)<1e-7);assert.ok(Math.abs(end.position.z+initial.position.z)<1e-7);}
 const m=metrics(p,f.context);assert.ok(m.clearance>=(sourceId===340?.66:.55)-1e-7);assert.ok(m.speed<1.2);assert.ok(m.yawRate<2);assert.ok(Math.abs(m.clearance-p.minimumObservedClearance)<1e-6);assert.ok(Math.abs(m.speed-p.maximumObservedSpeed)<1e-4);assert.ok(Math.abs(m.yawRate-p.maximumObservedYawRate)<1e-4);
 const held=p.contacts(6/8,sampled(p,f.context,6/8));assert.equal(held.length,4);for(const c of held){assert.equal(f.context.dancers[c.a].role,'lark');assert.equal(f.context.relations[sourceId===340?'partner':'neighbor'].get(c.a),c.b);assert.equal(c.kind,'courtesy');assert.equal(c.strength,1);}
 const gate=sampled(p,f.context,2/8),crossed=p.contacts(2/8,gate);assert.equal(crossed.length,2);for(const c of crossed){assert.equal(f.context.relations[sourceId===340?'neighbor':'partner'].get(c.a),c.b);assert.equal(c.handA,'right');assert.equal(c.handB,'right');assert.equal(c.strength,1);for(const[id,other]of[[c.a,c.b],[c.b,c.a]]){const a=gate[id],b=gate[other],right={x:-Math.cos(a.yaw),z:Math.sin(a.yaw)};assert.ok((b.position.x-a.position.x)*right.x+(b.position.z-a.position.z)*right.z>=(sourceId===340?.66:.55)-1e-7);}}
});
test('held ring release and crossing acquisition are explicit, disjoint and continuous within the original eight counts',()=>{
 const f=literal(340),p=compileCarriedRightLeftThroughStep(f.figure,f.context,f.boundary),at=(beat:number)=>p.contacts(beat/8,sampled(p,f.context,beat/8));
 assert.deepEqual(at(0),f.boundary.heldContacts);assert.equal(at(.25).length,4);assert.ok(at(.25).every(c=>c.strength===.5));assert.deepEqual(at(.5),[]);assert.deepEqual(at(1.5),[]);assert.equal(at(2).length,2);assert.equal(at(4).length,4);assert.equal(at(7).length,4);assert.deepEqual(at(7.2),[]);assert.deepEqual(at(8),[]);
 for(const beat of[.5,1.5,2,3.3,4,7,7.2]){const left=sampled(p,f.context,(beat-1e-7)/8),right=sampled(p,f.context,(beat+1e-7)/8);for(const id of f.context.ids){assert.ok(distance(left[id].position,right[id].position)<1e-6);assert.ok(angle(left[id].yaw,right[id].yaw)<1e-6);}}
});
test('a translated synthetic reversed-role/neighbor-courtesy rectangle consumes the same local contract',()=>{
 const c=context(.83,.62),oldPartner=new Map(c.relations.partner),oldNeighbor=new Map(c.relations.neighbor),rename=new Map([[0,8],[1,3],[2,11],[3,6]]),ids=c.ids.map(id=>rename.get(id)!);
 const dancers=createDancers(6),start=initialPoses(dancers);for(const d of c.dancers){const id=rename.get(d.id)!;dancers[id]={...d,id,role:d.role==='lark'?'robin':'lark',couple:d.id===0||d.id===3?14:21};start[id]={...c.start[d.id],id,position:{x:c.start[d.id].position.x+3.2,z:c.start[d.id].position.z-4.7},yaw:c.start[d.id].yaw+.37};}
 const rel=(m:Map<number,number>)=>new Map([...m].map(([a,b])=>[rename.get(a)!,rename.get(b)!])),changed:FigureContext={ids:ids.reverse(),start,dancers,relations:{epoch:23,partner:rel(oldNeighbor),neighbor:rel(oldPartner)},bindingEpoch:23};
 const boundary=captureSequenceBoundary(changed,24,[]),p=compileCarriedRightLeftThroughStep({...row(true),courtesyLeader:'robin',id:'unrelated-synthetic',label:'Different arrangement'},changed,boundary);
 const ordinary=compileCarriedRightLeftThroughStep({...row(true),courtesyLeader:'robin'},changed,boundary,{halfWidth:.9,halfDepth:.9});assertSequenceHandoff(boundary,ordinary.entryState);for(const end of ordinary.exitState.poses){assert.ok(Math.abs(Math.abs(end.position.x-3.2)-.9)<1e-7);assert.ok(Math.abs(Math.abs(end.position.z+4.7)-.9)<1e-7);}assert.ok(ordinary.maximumObservedSpeed<=1.2);assert.ok(ordinary.maximumObservedYawRate<=2);
 assertSequenceHandoff(boundary,p.entryState);assert.equal(p.exitState.sourceBeat,32);assert.ok(Math.abs(p.geometry.halfWidth-.83)<1e-7);assert.ok(Math.abs(p.geometry.halfDepth-.62)<1e-7);assert.ok(p.minimumObservedClearance>.619999);assert.equal(p.entryMode,'released-facing-preparation');
 for(const initial of boundary.poses){const end=p.exitState.poses.find(x=>x.id===initial.id)!;assert.ok(Math.abs(initial.position.x+end.position.x-6.4)<1e-7);assert.ok(Math.abs(initial.position.z+end.position.z+9.4)<1e-7);}
});
test('canonical released old RLT paths and both receiver conventions are byte-exact',()=>{
 for(const halfWidth of[.72,.9])for(const reversed of[false,true]){
  const c=context(halfWidth,.9);if(reversed){for(const d of c.dancers){d.role=d.role==='lark'?'robin':'lark';d.couple=d.id===0||d.id===3?0:1;}[c.relations.partner,c.relations.neighbor]=[c.relations.neighbor,c.relations.partner];}
  const f={...row(reversed),courtesyLeader:reversed?'robin' as const:'lark' as const},old=compileRightLeftThroughFigure(f,c),p=compileCarriedRightLeftThroughStep(f,c,captureSequenceBoundary(c,8,[]));assert.equal(p.entryMode,'established');
  for(let i=0;i<=320;i++){const t=i/320,a=sampled(old,c,t),b=sampled(p,c,t);assert.deepEqual(a,b);assert.deepEqual(p.contacts(t,b),old.contacts(t,a));}
 }
});
test('wrong current identity, epoch, named relation, hold and infeasible input state fail closed',()=>{
 const f=literal(340),compile=(c=f.context,b=f.boundary,figure=f.figure)=>compileCarriedRightLeftThroughStep(figure,c,b);
 assert.throws(()=>compile({...f.context,bindingEpoch:8}),/stale/);assert.throws(()=>compile(f.context,ownSequenceBoundary({...f.boundary,relationshipEpoch:8})),/relationshipEpoch/);
 const changed=structuredClone(f.context);changed.start[0].id=99;assert.throws(()=>compile(changed),/identities/);
 assert.throws(()=>compile(f.context,f.boundary,{...f.figure,who:'neighbor'}),/left slot/);assert.throws(()=>compile(f.context,f.boundary,{...f.figure,crossingRelation:'partner'}),/lane/);assert.throws(()=>compile(f.context,f.boundary,{...f.figure,courtesyLeader:'robin'}),/left slot/);
 const mutate=(edit:(b:any)=>void)=>{const b=structuredClone(f.boundary);edit(b);return b;};
 assert.throws(()=>compile(f.context,mutate(b=>b.heldContacts.pop())),/complete held ring/);
 assert.throws(()=>compile(f.context,mutate(b=>b.heldContacts[0].point.x+=.05)),/midpoint/);
 assert.throws(()=>compile(f.context,mutate(b=>b.heldContacts[0].target='waist')),/actual adjacent/);
 assert.throws(()=>compile(f.context,mutate(b=>b.heldContacts[0].strength=.5)),/actual adjacent/);
 const tooNarrow=context(.9,.54);assert.throws(()=>compile(tooNarrow,captureSequenceBoundary(tooNarrow,0,[])),/envelope/);
 const tooFar=context(.9,.55);for(const p of tooFar.start)p.yaw+=Math.PI;assert.throws(()=>compile(tooFar,captureSequenceBoundary(tooFar,0,[])),/yaw budget/);
 for(const changes of[{beats:16},{progression:true},{exit:'partners-facing-across'},{amount:1},{confidence:'unsupported'}])assert.throws(()=>compile(f.context,f.boundary,{...f.figure,...changes} as Figure));
});
test('compiled carried snapshots resist later ordinary caller mutation and reject nonfinite sample times',()=>{
 const f=literal(340),p=compileCarriedRightLeftThroughStep(f.figure,f.context,f.boundary),before=sampled(p,f.context,.3),contacts=p.contacts(.3,before),savedContext=structuredClone(f.context);
 f.context.start[0].position.x=77;f.context.start[0].yaw=77;f.context.dancers[0].role='robin';f.context.relations.partner.clear();f.figure.courtesyLeader='robin';f.contacts[0].point.x=77;
 assert.deepEqual(sampled(p,savedContext,.3),before);assert.deepEqual(p.contacts(.3,before),contacts);assert.throws(()=>{(p.entryState.poses[0].position as any).x=77;});assert.throws(()=>p.position(0,NaN),/finite/);assert.throws(()=>p.facing(99,.1,[]),/outside/);
});
for(const sourceId of[340,682] as const)test(`literal${sourceId} physically reaches an explicit ordinary .9-square exit requirement within eight counts`,()=>{
 const f=literal(sourceId),required={halfWidth:.9,halfDepth:.9},p=compileCarriedRightLeftThroughStep(f.figure,f.context,f.boundary,required);
 assertSequenceHandoff(f.boundary,p.entryState);assert.deepEqual(p.requiredExit,required);assert.equal(p.exitState.sourceBeat-f.boundary.sourceBeat,8);
 for(const end of p.exitState.poses){assert.ok(Math.abs(Math.abs(end.position.x)-.9)<1e-7);assert.ok(Math.abs(Math.abs(end.position.z)-.9)<1e-7);const initial=f.boundary.poses.find(x=>x.id===end.id)!;assert.equal(Math.sign(end.position.x),-Math.sign(initial.position.x));assert.equal(Math.sign(end.position.z),-Math.sign(initial.position.z));}
 const m=metrics(p,f.context);assert.ok(m.clearance>=(sourceId===340?.66:.55)-1e-7);assert.ok(m.speed<=1.2);assert.ok(m.yawRate<=2);assert.ok(Math.abs(m.clearance-p.minimumObservedClearance)<1e-6);assert.ok(Math.abs(m.speed-p.maximumObservedSpeed)<1e-4);assert.ok(Math.abs(m.yawRate-p.maximumObservedYawRate)<1e-4);
 for(const beat of[.5,1.5,2,4,7,7.2,8]){const left=sampled(p,f.context,Math.max(0,beat-1e-7)/8),right=sampled(p,f.context,Math.min(8,beat+1e-7)/8);for(const id of f.context.ids){assert.ok(distance(left[id].position,right[id].position)<1e-6);assert.ok(angle(left[id].yaw,right[id].yaw)<1e-6);}}
 const at7=sampled(p,f.context,7/8),at8=sampled(p,f.context,1);assert.ok(distance(at7[0].position,at8[0].position)>.55,'courtesy reopening is travelled in final count, not snapped at its boundary');
 required.halfWidth=.7;assert.equal(p.requiredExit!.halfWidth,.9);assert.throws(()=>{(p.requiredExit as any).halfWidth=.7;});
 console.log(`required-exit${sourceId}: ${JSON.stringify(m)}`);
});
test('canonical .9-square explicit exit requirement delegates the established old path byte-for-byte',()=>{
 const c=context(),f=row(),old=compileRightLeftThroughFigure(f,c),p=compileCarriedRightLeftThroughStep(f,c,captureSequenceBoundary(c,0,[]),{halfWidth:.9,halfDepth:.9});assert.equal(p.entryMode,'established');
 for(let i=0;i<=320;i++){const t=i/320,a=sampled(old,c,t),b=sampled(p,c,t);assert.deepEqual(a,b);assert.deepEqual(p.contacts(t,b),old.contacts(t,a));}
 for(const required of[null,{halfWidth:NaN,halfDepth:.9},{halfWidth:.9,halfDepth:.9,extra:true},{halfWidth:.9,halfDepth:.49}])assert.throws(()=>compileCarriedRightLeftThroughStep(f,c,captureSequenceBoundary(c,0,[]),required as any),/footprint|plain data/);
});

test('applicability is decided from immediate held state, facing and depth before compilation',()=>{
 for(const width of[.65,.72,.9,1.1]){const c=context(width,.9);assert.equal(needsCarriedRightLeftThroughEntry(captureSequenceBoundary(c,0,[])),false);}
 for(const id of[340,682] as const)assert.equal(needsCarriedRightLeftThroughEntry(literal(id).boundary),true);
 const c=context();c.start[0].yaw+=.1;assert.equal(needsCarriedRightLeftThroughEntry(captureSequenceBoundary(c,0,[])),true);
});

test('released 135-degree star facings complete preparation inside unchanged crossing and yaw budget',()=>{
 const c=context();for(const id of c.ids)c.start[id].yaw+=id%2?3*Math.PI/4:Math.PI/4;
 const b=captureSequenceBoundary(c,48,[]),p=compileCarriedRightLeftThroughStep(row(),c,b),m=metrics(p,c);
 assertSequenceHandoff(b,p.entryState);assert.equal(p.exitState.sourceBeat,56);assert.ok(m.yawRate<=2+1e-7);assert.ok(m.clearance>=.45);assert.ok(m.speed<1.2);
 const beat=3*Math.PI/4*1.875/2,poses=sampled(p,c,beat/8),contacts=p.contacts(beat/8,poses);
 assert.equal(contacts.length,2);assert.ok(contacts.every(h=>h.handA==='right'&&h.handB==='right'&&h.strength>.99));
 for(const id of c.ids)assert.ok(angle(poses[id].yaw,Math.sign(c.start[id].position.x)*-Math.PI/2)<1e-7);
 const opposite=context();for(const id of opposite.ids)opposite.start[id].yaw+=Math.PI;
 assert.throws(()=>compileCarriedRightLeftThroughStep(row(),opposite,captureSequenceBoundary(opposite,0,[])),/preparation envelope/);
});
