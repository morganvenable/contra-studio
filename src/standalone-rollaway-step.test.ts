import test from 'node:test';
import assert from 'node:assert/strict';
import {compileStandaloneRollawayStep,assertStandaloneRollawayFigure,type StandaloneRollawayFigure} from './standalone-rollaway-step.ts';
import {compileRollaway,type RollawayOptions} from './rollaway.ts';
import {compilePrimitiveFigure,createDancers,initialPoses} from './engine.ts';
import {assertSequenceHandoff,captureSequenceBoundary} from './sequence-boundary.ts';
import {sampleFormationEndpoint} from './formation-handoff.ts';
import {distance,ease,progress,turn} from './ring-twirl-contract.ts';
import type {FigureContext} from './extended-figures.ts';
import type {Figure} from './types.ts';

const figure=():StandaloneRollawayFigure=>({id:'opaque-standalone',label:'Named neighbors exchange with half sashay',kind:'rollaway',who:'neighbor',beats:4,rollRole:'robin',sashayRole:'lark',rollRelation:'neighbor',rollDirection:'left-to-right',rollHalfSashay:true});
function actual(){
 const dancers=createDancers(2),start=initialPoses(dancers),ids=[0,1,2,3],relations={epoch:0,partner:new Map([[0,1],[1,0],[2,3],[3,2]]),neighbor:new Map([[0,3],[3,0],[1,2],[2,1]])},circle:Figure={id:'independent-circle',label:'Circle left half',kind:'circle',who:'all',beats:4,direction:'left',amount:.5};
 const producer=compilePrimitiveFigure(circle,ids,start,dancers,[1,-1]),context:FigureContext={ids,dancers,start,relations,bindingEpoch:0};context.start=sampleFormationEndpoint(context,producer,1);
 const incoming=captureSequenceBoundary(context,4,producer.contacts(1,context.start));return{context,incoming,plan:compileStandaloneRollawayStep(figure(),context,incoming)};
}
function mirrored(){
 const base=actual(),ids=new Map([[0,17],[1,4],[2,12],[3,1]]),theta=.31,dx=4.25,dz=-3.5,reflect=(p:{x:number;z:number})=>({x:dx-p.x*Math.cos(theta)-p.z*Math.sin(theta),z:dz-p.x*Math.sin(theta)+p.z*Math.cos(theta)}),dancers=createDancers(9),start=initialPoses(dancers);
 for(const p of base.incoming.poses){const id=ids.get(p.id)!;dancers[id]={...base.context.dancers[p.id],id,couple:20+Math.floor(p.id/2)};start[id]={...base.context.start[p.id],id,position:reflect(p.position),yaw:-p.yaw-theta};}
 const remap=(m:ReadonlyMap<number,number>)=>new Map([...m].reverse().map(([a,b])=>[ids.get(a)!,ids.get(b)!])),context:FigureContext={ids:[1,17,12,4],dancers,start,relations:{epoch:13,partner:remap(base.context.relations.partner),neighbor:remap(base.context.relations.neighbor)},bindingEpoch:13,next:{id:'future-unknown',kind:'unknown',label:'Unseen successor',beats:3}};
 const incoming=captureSequenceBoundary(context,27.5,[]),f={...figure(),id:'unrelated-title-free-producer',label:'Reflected named actors',rollDirection:'right-to-left' as const};return{base,ids,theta,reflect,context,incoming,f,plan:compileStandaloneRollawayStep(f,context,incoming)};
}
test('actual circle exit carries diagonal facings, full-width slots and named relations through four counts',()=>{
 const{context,incoming,plan}=actual(),expected=[[-.9,.9,3*Math.PI/4],[.9,.9,-3*Math.PI/4],[.9,-.9,-Math.PI/4],[-.9,-.9,Math.PI/4]];
 for(const p of incoming.poses){const[x,z,yaw]=expected[p.id];assert.ok(distance(p.position,{x,z})<1e-12);assert.ok(Math.abs(turn(p.yaw,yaw))<1e-12);assert.deepEqual(plan.position(p.id,0),p.position);assert.equal(plan.facing(p.id,0,[]),p.yaw);assert.ok(distance(plan.position(p.id,.025),p.position)>0,'slot movement overlaps facing acquisition');}
 assert.deepEqual(incoming.heldContacts,[]);assertSequenceHandoff(incoming,plan.entryState);assert.equal(plan.exitState.sourceBeat,8);assert.equal(plan.epoch,0);
 for(const key of['actors','partner','neighbor','relationshipEpoch'] as const)assert.deepEqual(plan.exitState[key],incoming[key]);assert.deepEqual(plan.exitState.heldContacts,[]);
 assert.deepEqual(plan.namedPairs.map(p=>[p.rollingId,p.sashayingId]),[[1,2],[3,0]]);assert.equal(plan.facingAcquisitionBeats,1.5);
 for(const pair of plan.namedPairs){assert.ok(Math.abs(pair.width-1.8)<1e-12);const roller=incoming.poses.find(p=>p.id===pair.rollingId)!,sashayer=incoming.poses.find(p=>p.id===pair.sashayingId)!;
  assert.ok(distance(plan.position(roller.id,1),sashayer.position)<1e-12);assert.ok(distance(plan.position(sashayer.id,1),roller.position)<1e-12);
  for(let n=0;n<=160;n++){const beat=n/40,q=progress(beat/4),frame=plan.sample(beat),a=frame.poses.find(p=>p.id===roller.id)!,b=frame.poses.find(p=>p.id===sashayer.id)!,acquired=roller.yaw+turn(pair.pairYaw,roller.yaw)*ease(beat/1.5);
   assert.ok(Math.abs(a.yaw-acquired+2*Math.PI*q)<1e-12);assert.ok(Math.abs(b.yaw-sashayer.yaw-turn(pair.pairYaw,sashayer.yaw)*ease(beat/1.5))<1e-12);assert.ok(a.yawRate<1e-6,'the measured roller does not reverse body turn during early acquisition');
   if(beat>0&&beat<4){const forward={x:Math.sin(pair.pairYaw),z:Math.cos(pair.pairYaw)};assert.ok((a.position.x-b.position.x)*forward.x+(a.position.z-b.position.z)*forward.z>0,'actual named roller passes in front');}
  }
  assert.ok(Math.abs(plan.facing(roller.id,1,[])-roller.yaw-turn(pair.pairYaw,roller.yaw)+2*Math.PI)<1e-12);
 }
 assert.ok(plan.minimumObservedClearance>=.67-1e-12);assert.ok(plan.minimumClearanceBound>.666);assert.ok(plan.maximumObservedSpeed<.7);assert.ok(plan.maximumObservedYawRate<2);assert.ok(plan.maximumYawRateBound<2.9);assert.ok(plan.maximumRawHandReach<.645);
 const received={...context,start:sampleFormationEndpoint(context,plan,1)};assertSequenceHandoff(plan.exitState,captureSequenceBoundary(received,8,[]));
});
test('released hands are acquired from actual poses, changed only after release and released again',()=>{
 for(const {plan}of[actual(),mirrored()]){const seen=new Set<string>();let maximumStep=0,previous=new Map<string,number>();
  for(let n=0;n<=1600;n++){const f=plan.sample(n/400),owned=new Set<string>(),strengths=new Map<string,number>();for(const c of f.contacts){assert.equal(c.kind,'joined');assert.equal(c.underId,undefined);assert.ok(c.point.y<1.3);seen.add(`${c.handA}:${c.handB}`);strengths.set(`${c.a}:${c.handA}`,c.strength);for(const[id,hand]of[[c.a,c.handA],[c.b,c.handB]] as const){const key=`${id}:${hand}`;assert.ok(!owned.has(key));owned.add(key);const p=f.poses.find(p=>p.id===id)!,s=hand==='left'?1:-1;assert.ok(Math.hypot(c.point.x-p.position.x-s*.235*Math.cos(p.yaw),c.point.y-1.355,c.point.z-p.position.z+s*.235*Math.sin(p.yaw))<.645);}}for(const key of new Set([...strengths.keys(),...previous.keys()]))maximumStep=Math.max(maximumStep,Math.abs((strengths.get(key)??0)-(previous.get(key)??0)));previous=strengths;}
  assert.deepEqual(plan.sample(0).contacts,[]);assert.deepEqual(plan.sample(2).contacts,[]);assert.deepEqual(plan.sample(4).contacts,[]);assert.deepEqual([...seen].sort(),['left:right','right:left']);assert.ok(maximumStep<.05,`contact ramp sample step ${maximumStep}`);
 }
});
test('reflected rotated translated reordered named actors preserve roles and invert direction without identity repair',()=>{
 const {base,ids,theta,reflect,plan,incoming,context,f}=mirrored();assert.equal(plan.epoch,13);assert.equal(plan.exitState.sourceBeat,31.5);assert.deepEqual(plan.entryState,incoming);for(const a of incoming.actors)assert.equal(a.role,base.incoming.actors.find(b=>ids.get(b.id)===a.id)!.role);
 for(let n=0;n<=160;n++)for(const p of base.plan.sample(n/40).poses){const q=plan.sample(n/40).poses.find(q=>q.id===ids.get(p.id))!;assert.ok(distance(q.position,reflect(p.position))<1e-12);assert.ok(Math.abs(turn(q.yaw,-p.yaw-theta))<1e-12);}
 const noNext=compileStandaloneRollawayStep(f,{...context,next:undefined},incoming);assert.deepEqual(noNext.exitState,plan.exitState);assert.deepEqual(noNext.gates,plan.gates);
 assert.throws(()=>compileStandaloneRollawayStep({...f,rollDirection:'left-to-right'},context,incoming),/starting side/);
});
test('measured partner rows use actual persistent identities rather than a neighbor-only recognizer',()=>{
 const{context,incoming}=actual(),f={...figure(),who:'partner' as const,rollRelation:'partner' as const,rollDirection:'right-to-left' as const},p=compileStandaloneRollawayStep(f,context,incoming);
 assert.deepEqual(p.namedPairs.map(pair=>[pair.rollingId,pair.sashayingId]),[[1,0],[3,2]]);for(const pair of p.namedPairs){assert.ok(distance(p.position(pair.rollingId,1),context.start[pair.sashayingId].position)<1e-12);assert.ok(distance(p.position(pair.sashayingId,1),context.start[pair.rollingId].position)<1e-12);}assert.deepEqual(p.exitState.partner,incoming.partner);assert.deepEqual(p.exitState.neighbor,incoming.neighbor);assert.ok(p.minimumClearanceBound>.666);
});
test('primitive facing opt-in is descriptor-safe, bounded and does not silently relax old calls',()=>{
 const{context,incoming}=actual(),pair=[1,2],options:RollawayOptions={actors:pair.map(id=>context.dancers[id]),entry:new Map(pair.map(id=>[id,{position:{...context.start[id].position},yaw:context.start[id].yaw,velocity:{x:0,z:0},yawRate:0}])),exit:new Map(pair.map(id=>[id,{position:{...context.start[context.relations.neighbor.get(id)!].position},yaw:-Math.PI/2,velocity:{x:0,z:0},yawRate:0}])),relations:context.relations,bindingEpoch:0,relationship:'neighbor',rollingId:1,sashayingId:2,direction:'left-to-right',halfSashay:true,beats:4};
 assert.throws(()=>compileRollaway(options),/side-by-side/);assert.throws(()=>compileRollaway({...options,pairYaw:-Math.PI/2}),/explicit finite pair frame/);assert.throws(()=>compileRollaway({...options,entryFacing:'unknown'} as any),/explicit finite pair frame/);assert.throws(()=>compileRollaway({...options,entryFacing:'acquire-pair-frame'}),/explicit finite pair frame/);
 const accepted={...options,entryFacing:'acquire-pair-frame' as const,pairYaw:-Math.PI/2};assert.ok(compileRollaway(accepted));for(const key of['entryFacing','pairYaw'] as const){let reads=0;const hostile={...accepted};Object.defineProperty(hostile,key,{enumerable:true,get(){reads++;return accepted[key];}});assert.throws(()=>compileRollaway(hostile),/accessors/);assert.equal(reads,0);const hidden={...accepted};Object.defineProperty(hidden,key,{enumerable:false,value:accepted[key]});assert.throws(()=>compileRollaway(hidden),/visible data/);}
 const bad=structuredClone(accepted);bad.entry.get(1)!.yaw-=.1;assert.throws(()=>compileRollaway(bad),/forty-five/);assert.deepEqual(compileRollaway(accepted).sample(0).poses.map(p=>p.position),pair.map(id=>incoming.poses.find(p=>p.id===id)!.position));
});
test('unexpected modifiers, false directions, held contacts and stale or discontinuous carried boundaries fail closed',()=>{
 const{context,incoming}=actual();for(const edit of[{who:'all'},{who:'partner'},{beats:8},{rollRole:'lark',sashayRole:'robin'},{rollHalfSashay:false},{rollDirection:'right-to-left'},{rollRelation:'partner'},{progression:true},{progression:'yes'},{entry:'ring'},{exit:'paired-sidelines'},{hands:'both'},{phaseBeats:[1,3]},{amount:1},{confidence:'unsupported'},{id:''},{label:7}])assert.throws(()=>compileStandaloneRollawayStep({...figure(),...edit} as StandaloneRollawayFigure,context,incoming));
 const held={...incoming,heldContacts:[{a:0,b:3,handA:'left' as const,handB:'right' as const,point:{x:-.9,y:1.19,z:0},strength:5e-8,kind:'joined' as const}]};assert.throws(()=>compileStandaloneRollawayStep(figure(),context,held),/incoming held contact/);
 assert.throws(()=>compileStandaloneRollawayStep(figure(),{...context,bindingEpoch:4},incoming),/epoch/);const moved=structuredClone(incoming);moved.poses[0].position.x+=.01;assert.throws(()=>compileStandaloneRollawayStep(figure(),context,moved),/discontinuous/);
 assert.throws(()=>compileStandaloneRollawayStep(figure(),context,{...incoming,sourceBeat:2**55}),/source-count/);
 for(const change of[(c:FigureContext)=>c.start[0].yaw+=.2,(c:FigureContext)=>c.start[0].position.x+=.1,(c:FigureContext)=>c.start.forEach(p=>p.position.x*=.5),(c:FigureContext)=>c.start.forEach(p=>p.position.z*=1.1)]){const c=structuredClone(context);change(c);assert.throws(()=>compileStandaloneRollawayStep(figure(),c,captureSequenceBoundary(c,4,[])));}
});
test('figure, boundary, returned gates and context are safely owned; nonfinite samples reject',()=>{
 const{context,incoming}=actual(),f=figure(),plan=compileStandaloneRollawayStep(f,context,incoming),sample=()=>plan.sample(1.25),before=sample();context.start[0].position.x=500;context.relations.neighbor.clear();f.rollRole='lark';const changed=structuredClone(incoming);changed.poses[0].position.z=500;assert.deepEqual(sample(),before);const output=sample();output.poses[0].position.x=100;output.contacts.length=0;assert.deepEqual(sample(),before);assert.ok(Object.isFrozen(plan.namedPairs[0]));assert.ok(Object.isFrozen(plan.gates[0].poses));assert.ok(Object.isFrozen(plan.entryState.poses));
 assert.throws(()=>plan.position(999,.5),/outside/);assert.throws(()=>plan.facing(999,.5,[]),/outside/);assert.throws(()=>plan.sample(NaN),/finite/);assert.throws(()=>plan.contacts(Infinity,[]),/finite/);
 let reads=0;const accessor=figure();Object.defineProperty(accessor,'beats',{enumerable:true,get(){reads++;return 4;}});assert.throws(()=>assertStandaloneRollawayFigure(accessor),/accessor/);assert.equal(reads,0);for(const key of['hiddenExtra',Symbol('hidden')]){const hidden=figure();Object.defineProperty(hidden,key,{value:1});assert.throws(()=>assertStandaloneRollawayFigure(hidden),/hidden|symbol/);}
});
