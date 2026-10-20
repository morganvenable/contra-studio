import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Vector3} from 'three';
import {Avatar,applyBodyContactAnchors} from './scene.ts';
import {readContraDbSource} from './contradb-source.ts';
import {compileHallTravel,type HallTravelOptions,type TravelConstraint,type TravelContact} from './travel-figures.ts';
import type {Dance,Dancer,Frame,StudioState,Vec2} from './types.ts';

const gap=(a:Vec2,b:Vec2={x:0,z:0})=>Math.hypot(a.x-b.x,a.z-b.z);
const angle=(a:number,b:number)=>Math.abs(Math.atan2(Math.sin(a-b),Math.cos(a-b)));
const pose=(x:number,z:number,yaw:number):TravelConstraint=>({position:{x,z},yaw,velocity:{x:0,z:0},yawRate:0});
const hands=(order:readonly number[]):TravelContact[]=>order.slice(0,3).map((a,i)=>({a,b:order[i+1],handA:'right',handB:'left'}));
const actors:Dancer[]=Array.from({length:4},(_,id)=>({id,name:['L1','R1','L2','R2'][id],role:id%2?'robin':'lark',couple:Math.floor(id/2),direction:1,color:'#438b86'}));
function fixture(mode:'couples'|'alone'='couples',assembly=false,ring=1):HallTravelOptions {
 // Nice Combination source oracle: west→east down [R1,L2,R2,L1].
 // `lineOrder` instead runs dancers' left→right down: [L1,R2,L2,R1].
 const lineOrder=[0,3,2,1] as const,returned=mode==='couples'?[2,1,0,3]:[1,2,3,0],entry=new Map<number,TravelConstraint>(),exit=new Map<number,TravelConstraint>();
 for(const[id,i]of lineOrder.map((id,i)=>[id,i] as const))entry.set(id,assembly?pose(i<2?.9:-.9,i===0||i===3?.9:-.9,0):pose((1.5-i)*.8,0,0));
 for(const[id,i]of returned.map((id,i)=>[id,i] as const)){const x=(i<2?-1:1)*ring/2,z=i===0||i===3?-ring:0;exit.set(id,pose(x,z,Math.atan2(-x,-ring/2-z)));}
 const source=readContraDbSource(readFileSync(new URL(`../test-data/contradb/${mode==='couples'?138:2026}.json`,import.meta.url),'utf8')).record!,rows=source.rows.filter(r=>/^(down|up) the hall/.test(r.text));
 return{actorIds:[0,1,2,3],lineOrder,entry,exit,frame:{origin:{x:0,z:0},down:{x:0,z:1}},turn:mode==='couples'?{mode,pairs:[{leftId:0,rightId:3,halfTurn:1},{leftId:2,rightId:1,halfTurn:1}]}:{mode,actors:lineOrder.map(id=>({id,halfTurn:1}))},downHands:hands(lineOrder),returnHands:hands(returned),closingHands:{a:returned[3],b:returned[0],handA:'right',handB:'left'},beats:16,sourceBeatBudget:[8,8],phaseBeats:[4,4,4,4],lineSpacing:.8,travelDistance:1.2,ringWidth:ring,ringDepth:ring,source:{url:source.sourceUrl,snapshotId:source.snapshotId,rows:rows.map(r=>({id:r.id,text:r.text,beats:8 as const})) as [any,any]}};
}
function transform(o:HallTravelOptions,theta:number,origin:Vec2):HallTravelOptions {
 const rotate=(p:Vec2)=>({x:p.x*Math.cos(theta)-p.z*Math.sin(theta),z:p.x*Math.sin(theta)+p.z*Math.cos(theta)}),map=(m:ReadonlyMap<number,TravelConstraint>)=>new Map([...m].map(([id,p])=>{const q=rotate(p.position);return[id,{...p,position:{x:q.x+origin.x,z:q.z+origin.z},velocity:rotate(p.velocity),yaw:p.yaw-theta}];}));return{...o,entry:map(o.entry),exit:map(o.exit),frame:{origin,down:rotate({x:0,z:1})}};
}
test('two actual retained sources preserve the separate alone/couple-turn wording and exact 8+8 source rows',()=>{
 const a=fixture(),b=fixture('alone');assert.equal(a.source!.url,'https://contradb.com/dances/138');assert.equal(b.source!.url,'https://contradb.com/dances/2026');
 assert.match(a.source!.rows[0].text,/turn as a couple/);assert.match(b.source!.rows[0].text,/turn alone/);for(const options of[a,b]){const plan=compileHallTravel(options);assert.deepEqual(plan.source,options.source);assert.deepEqual(plan.sourceBeatBudget,[8,8]);assert.deepEqual(plan.phaseBoundaries,[0,4,8,12,16]);assert.match(plan.source!.rows[1].text,/bend into a ring/);}
});
for(const mode of['couples','alone'] as const)test(`${mode} preserves stable identities, explicit endpoint constraints and its different return permutation`,()=>{
 const options=fixture(mode),plan=compileHallTravel(options);assert.deepEqual(plan.returnOrder,mode==='couples'?[2,1,0,3]:[1,2,3,0]);
 for(const [beat,expected]of[[0,options.entry],[16,options.exit]] as const)for(const p of plan.sample(beat).poses){const q=expected.get(p.id)!;assert.ok(gap(p.position,q.position)<1e-8);assert.ok(angle(p.yaw,q.yaw)<1e-8);assert.ok(gap(p.velocity)<1e-8);assert.ok(gap(p.acceleration)<1e-8);assert.ok(Math.abs(p.yawRate)<1e-8);assert.ok(Math.abs(p.yawAcceleration)<1e-8);}
 const start=plan.sample(4),end=plan.sample(8);for(const a of start.poses){const b=end.poses.find(b=>b.id===a.id)!;assert.ok(angle(b.yaw,a.yaw+Math.PI)<1e-8);assert.ok(mode==='alone'?gap(a.position,b.position)<1e-8:Math.abs(gap(a.position,b.position)-.8)<1e-8);}
 if(mode==='couples')for(const pair of(options.turn as Extract<HallTravelOptions['turn'],{mode:'couples'}>).pairs){for(const beat of[4.5,5,6,7,7.5]){const f=plan.sample(beat),A=f.poses.find(p=>p.id===pair.leftId)!,B=f.poses.find(p=>p.id===pair.rightId)!;assert.ok(gap(A.position,B.position)>.79999);assert.ok(A.velocity.x*Math.sin(A.yaw)+A.velocity.z*Math.cos(A.yaw)<0,'explicit left actor backs');assert.ok(B.velocity.x*Math.sin(B.yaw)+B.velocity.z*Math.cos(B.yaw)>0,'explicit right actor advances');assert.equal(f.contacts.length,2);}}
 else for(const beat of[4.1,5,6,7.9])assert.equal(plan.sample(beat).contacts.length,0);
});
test('hand ownership is explicit and unique; center hands release, partner hands survive, then returned line and ring close',()=>{
 const plan=compileHallTravel(fixture());assert.equal(plan.sample(2).contacts.length,3);assert.equal(plan.sample(6).contacts.length,2);assert.equal(plan.sample(9).contacts.length,3);assert.equal(plan.sample(16).contacts.length,4);
 for(let i=0;i<=3200;i++){const f=plan.sample(i/200),owned=new Set<string>();for(const h of f.contacts){for(const[id,hand]of[[h.a,h.handA],[h.b,h.handB]] as const){const key=`${id}/${hand}`;assert.ok(!owned.has(key),key);owned.add(key);const p=f.poses.find(p=>p.id===id)!,side=hand==='left'?1:-1,shoulder={x:p.position.x+side*.235*Math.cos(p.yaw),z:p.position.z-side*.235*Math.sin(p.yaw)};assert.ok(Math.hypot(gap(shoulder,h.point),h.point.y-1.355)<=.620001);}}}
});
test('all joins are C2 and rigid world transforms preserve the same named motion',()=>{
 const plan=compileHallTravel(fixture()),theta=.67,origin={x:2.3,z:-1.8},rotated=compileHallTravel(transform(fixture(),theta,origin));
 for(const t of plan.phaseBoundaries.slice(1,-1)){const A=plan.sample(t-1e-7),B=plan.sample(t+1e-7);for(let id=0;id<4;id++){assert.ok(gap(A.poses[id].position,B.poses[id].position)<1e-6);assert.ok(gap(A.poses[id].velocity,B.poses[id].velocity)<1e-5);assert.ok(gap(A.poses[id].acceleration,B.poses[id].acceleration)<1e-4);assert.ok(angle(A.poses[id].yaw,B.poses[id].yaw)<1e-6);assert.ok(Math.abs(A.poses[id].yawRate-B.poses[id].yawRate)<1e-6);assert.ok(Math.abs(A.poses[id].yawAcceleration-B.poses[id].yawAcceleration)<1e-4);}}
 for(let i=0;i<=160;i++)for(const p of plan.sample(i/10).poses){const q=rotated.sample(i/10).poses[p.id],expected={x:origin.x+p.position.x*Math.cos(theta)-p.position.z*Math.sin(theta),z:origin.z+p.position.x*Math.sin(theta)+p.position.z*Math.cos(theta)};assert.ok(gap(q.position,expected)<1e-8);assert.ok(angle(q.yaw,p.yaw-theta)<1e-8);}
 assert.ok(plan.minimumObservedClearance>=.6);assert.ok(plan.maximumObservedSpeed<.7);assert.deepEqual(plan.sample(-1),plan.sample(0));assert.deepEqual(plan.sample(18),plan.sample(16));assert.throws(()=>plan.sample(NaN),/finite/);
});
test('arbitrary actor IDs, mutations and unrelated roles cannot change owned choreography',()=>{
 const options=fixture(),plan=compileHallTravel(options),before=plan.sample(6);options.entry.get(0)!.position.x=100;options.exit.get(0)!.yaw=NaN;options.frame.down.z=0;(options.lineOrder as number[])[0]=99;(options.turn as Extract<HallTravelOptions['turn'],{mode:'couples'}>).pairs[0].leftId=99;options.downHands[0].a=99;options.source!.rows[0].text='changed';assert.deepEqual(plan.sample(6),before);assert.equal(typeof(plan.entry as any).set,'undefined');assert.throws(()=>{plan.entry.get(0)!.position.x=8;});assert.throws(()=>{plan.source!.rows[0].text='changed';});
 const o=fixture(),names=new Map([[0,81],[1,17],[2,402],[3,6]]),id=(n:number)=>names.get(n)!,contacts=(v:readonly TravelContact[])=>v.map(h=>({...h,a:id(h.a),b:id(h.b)})),p=compileHallTravel({...o,actorIds:o.actorIds.map(id),lineOrder:o.lineOrder.map(id) as any,entry:new Map([...o.entry].map(([i,p])=>[id(i),p])),exit:new Map([...o.exit].map(([i,p])=>[id(i),p])),turn:{mode:'couples',pairs:(o.turn as Extract<HallTravelOptions['turn'],{mode:'couples'}>).pairs.map(p=>({...p,leftId:id(p.leftId),rightId:id(p.rightId)}))},downHands:contacts(o.downHands),returnHands:contacts(o.returnHands),closingHands:contacts([o.closingHands])[0]});
 for(let i=0;i<=160;i++){const A=plan.sample(i/10),B=p.sample(i/10);for(const a of A.poses)assert.deepEqual(B.poses.find(b=>b.id===id(a.id))!.position,a.position);assert.deepEqual(B.contacts,A.contacts.map(h=>({...h,a:id(h.a),b:id(h.b)})));}
});
test('ambiguous actors, ignored turn instructions, unreachable geometry, extra beats and altered endpoints reject',()=>{
 for(const changes of[{actorIds:[0,0,2,3]},{lineOrder:[0,1,2,2]},{beats:18},{sourceBeatBudget:[8,10]},{phaseBeats:[6,4,4,4]},{phaseBeats:[4,4,5,3.1]},{minimumClearance:NaN},{minimumClearance:.9},{maximumSpeed:.1},{maximumYawRate:.1},{lineSpacing:.4},{turn:{mode:'unknown'}},{downHands:[]}])assert.throws(()=>compileHallTravel({...fixture(),...changes} as any));
 let o=fixture();o.entry.get(0)!.velocity.z=.1;assert.throws(()=>compileHallTravel(o),/derivatives/);o=fixture();o.entry.get(0)!.yaw=Math.PI;assert.throws(()=>compileHallTravel(o),/face down/);o=fixture();o.exit.get(0)!.position.x+=.1;assert.throws(()=>compileHallTravel(o),/ring order/);o=fixture();o.returnHands[0].handA='left';assert.throws(()=>compileHallTravel(o),/right hand/);o=fixture();o.closingHands.a=0;assert.throws(()=>compileHallTravel(o),/endpoint hands/);o=fixture();(o.turn as any).pairs[0].rightId=1;assert.throws(()=>compileHallTravel(o),/adjacent/);assert.throws(()=>compileHallTravel(fixture()).position(999,.5),/outside/);assert.throws(()=>compileHallTravel(fixture('couples',true,1.8)),/fully joined/);
});
test('actual adult Avatar: one alternating footfall per audible beat, fixed limbs, planted feet, reachable held hands',()=>{
 globalThis.document={createElement:()=>({getContext:()=>new Proxy({},{get:()=>()=>{},set:()=>true})})} as unknown as Document;
 const dance={figures:[{kind:'long-lines',beats:8},{kind:'hall-travel',beats:16},{kind:'long-lines',beats:8}]} as Dance;
 let clamps=0,maxClamp=0,worst='',maxWrist=0,maxLowering=0,minRoot=Infinity;
 for(const options of[fixture(),fixture('alone'),fixture('couples',true),fixture('couples',true,1.35),transform(fixture('alone'),.63,{x:2.3,z:-1.7})]){
  const path=compileHallTravel(options);assert.equal(path.sample(16).contacts.length,4);assert.ok(path.sample(16).contacts.every(h=>h.strength===1));const avatars=actors.map(d=>new Avatar(d)),sample=(beat:number):Frame=>{beat=Math.max(0,Math.min(32,beat));const t=Math.max(0,Math.min(16,beat-8)),fi=beat<8?0:beat<24?1:2,f=path.sample(t),start=fi===0?0:fi===1?8:24,duration=fi===1?16:8;return{beat,localBeat:beat,figureIndex:fi,figureProgress:(beat-start)/duration,repeat:0,poses:f.poses.map(p=>({id:p.id,position:p.position,yaw:p.yaw,stride:Math.min(1,gap(p.velocity)*2.5),lean:.03*Math.min(1,gap(p.velocity)*2.5),bounce:fi===1?Math.sin(beat*Math.PI*2)*.018*Math.min(1,gap(p.velocity)*2.5):0,turn:0,activity:fi===1?'hall-travel':'waiting'})),contacts:fi===1?f.contacts:[],warnings:[]};};
  const planted=new Map<string,{phase:number;position:Vector3}>();
  for(let i=0;i<960;i++){const beat=8+i/60,frame=sample(beat);for(const a of avatars){a.update(frame.poses[a.dancer.id],frame,{dance,showLabels:false} as StudioState,sample);const gait=a.root.userData.gait;assert.equal(gait.phase,beat);assert.equal(gait.maxRate,1);assert.equal(gait.steps,16);clamps+=gait.reachClamps;maxLowering=Math.max(maxLowering,gait.pelvisLowering);if(gait.maxClampDistance>maxClamp){maxClamp=gait.maxClampDistance;worst=`${beat}/${a.dancer.id}/ring${options.ringWidth}/entry${options.entry.get(0)!.position.x}`;}}
   const corrected=applyBodyContactAnchors(avatars,frame);for(const a of avatars){a.root.updateMatrixWorld(true);for(const[j,leg]of a.legs.entries()){assert.ok(Math.abs(leg.upper.scale.y*3-.43)<1e-7);assert.ok(Math.abs(leg.lower.scale.y*3-.43)<1e-7);const offset=leg.side>0?1:0,phase=Math.floor((beat-offset)/2)*2+offset,key=`${a.dancer.id}/${j}`,position=leg.foot.getWorldPosition(new Vector3()),previous=planted.get(key);if(beat-phase<1){if(previous?.phase===phase&&maxClamp===0)assert.ok(position.distanceTo(previous.position)<1e-7,'planted feet stay fixed');planted.set(key,{phase,position});}}for(const arm of a.arms){assert.ok(Math.abs(arm.upper.scale.y*3-.325)<1e-7);assert.ok(Math.abs(arm.lower.scale.y*3-.325)<1e-7);}}
   for(const h of corrected.contacts)if(h.strength>=1-1e-10)for(const[id,hand]of[[h.a,h.handA],[h.b,h.handB]] as const){const a=avatars[id],wrist=a.arms.find(a=>a.side===(hand==='left'?1:-1))!.hand.getWorldPosition(new Vector3());maxWrist=Math.max(maxWrist,wrist.distanceTo(new Vector3(h.point.x,h.point.y,h.point.z)));}
   for(let a=0;a<4;a++)for(let b=a+1;b<4;b++)minRoot=Math.min(minRoot,gap(frame.poses[a].position,frame.poses[b].position));
  }avatars.forEach(a=>a.dispose());
 }
 assert.equal(clamps,0,`leg correction ${maxClamp} at ${worst}`);assert.ok(maxLowering<=.065);assert.ok(maxWrist<1e-7,`full-strength wrist miss ${maxWrist}`);assert.ok(minRoot>.6,'conservative adult torso-diameter clearance');
});
