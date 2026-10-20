import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Vector3} from 'three';
import {Avatar,applyBodyContactAnchors} from './scene.ts';
import {readContraDbSource} from './contradb-source.ts';
import {importContraDb} from './contradb-import.ts';
import {compileRightLeftThrough,type RightLeftThroughOptions,type RightLeftConstraint} from './right-left-through.ts';
import type {Dancer,Dance,Frame,StudioState,Vec2} from './types.ts';
const actors:Dancer[]=Array.from({length:4},(_,id)=>({id,name:['L1','R1','L2','R2'][id],role:id%2?'robin':'lark',couple:Math.floor(id/2),direction:1,color:'#438b86'}));
const pairMap=(pairs:number[][])=>new Map(pairs.flatMap(([a,b])=>[[a,b],[b,a]]));
const gap=(a:Vec2,b:Vec2={x:0,z:0})=>Math.hypot(a.x-b.x,a.z-b.z);
const angle=(a:number,b:number)=>Math.abs(Math.atan2(Math.sin(a-b),Math.cos(a-b)));
const pose=(x:number,z:number,yaw:number):RightLeftConstraint=>({position:{x,z},yaw,velocity:{x:0,z:0},yawRate:0});
function fixture(reversed=false):RightLeftThroughOptions {
 const entry=new Map<number,RightLeftConstraint>(),exit=new Map<number,RightLeftConstraint>(),pairs=reversed?[[1,2],[3,0]]:[[0,1],[2,3]];
 for(const [[leader,follower],i]of pairs.map((p,i)=>[p,i] as const)){const d=i===0?1:-1,yaw=d*Math.PI/2;entry.set(leader,pose(-d*.9,-d*.9,yaw));entry.set(follower,pose(-d*.9,d*.9,yaw));exit.set(leader,pose(d*.9,d*.9,yaw+Math.PI));exit.set(follower,pose(d*.9,-d*.9,yaw+Math.PI));}
 return{actors:structuredClone(actors),entry,exit,relations:{epoch:12,partner:pairMap([[0,1],[2,3]]),neighbor:pairMap([[0,3],[1,2]])},bindingEpoch:12,crossingPairs:reversed?[[1,0],[2,3]]:[[0,3],[1,2]],passingHand:'right',passingShoulder:'right',courtesyPairs:pairs.map(([leaderId,followerId])=>({leaderId,followerId,relationship:reversed?'neighbor':'partner'})),courtesyHold:'left-front-right-waist',frame:{origin:{x:0,z:0},across:{x:1,z:0}},beats:8,crossingBeats:4};
}
function transform(o:RightLeftThroughOptions,theta:number,origin:Vec2):RightLeftThroughOptions {
 const rotate=(p:Vec2)=>({x:p.x*Math.cos(theta)-p.z*Math.sin(theta),z:p.x*Math.sin(theta)+p.z*Math.cos(theta)}),map=(m:ReadonlyMap<number,RightLeftConstraint>)=>new Map([...m].map(([id,p])=>{const q=rotate(p.position);return[id,{...p,position:{x:q.x+origin.x,z:q.z+origin.z},velocity:rotate(p.velocity),yaw:p.yaw-theta}];}));return{...o,entry:map(o.entry),exit:map(o.exit),frame:{origin,across:rotate({x:1,z:0})}};
}
const retained=(id:number)=>readFileSync(new URL(`../test-data/contradb/${id}.json`,import.meta.url),'utf8');
test('six retained public sources contain seven R&L rows without erasing hands, scope, progression, or final-facing qualifiers',()=>{
 let rows=0;for(const id of[1312,2672,3004,3533,495,907]){const source=readContraDbSource(retained(id));assert.equal(source.structurallyValid,true);assert.equal(source.record!.publication,'shared everywhere');const r=source.record!.rows.filter(r=>r.text.includes('right left through'));rows+=r.length;assert.ok(r.every(r=>r.beats===8));assert.equal(importContraDb(retained(id)).coverage.executable,false,'primitive coverage never silently unlocks a complete source');}
 assert.equal(rows,7);const pandora=readContraDbSource(retained(3004)).record!;assert.equal(pandora.author,'Koren Wake');assert.match(pandora.rows[2].text,/ladles courtesy turn this same neighbor gentlespoon/);assert.match(pandora.notes,/gentlespoons on the right, ladles on the left/);
 assert.match(readContraDbSource(retained(907)).record!.notes,/without hands/);assert.match(readContraDbSource(retained(2672)).record!.rows[5].text,/left diagonal.*⁋/);assert.match(readContraDbSource(retained(3533)).record!.rows[1].text,/face partner up & down/);
});
for(const reversed of[false,true])test(`${reversed?'Pandora robin-led same-neighbor':'ordinary lark-led partner'} courtesy preserves stable identities and exact eight-beat endpoint constraints`,()=>{
 const options=fixture(reversed),plan=compileRightLeftThrough(options);assert.equal(plan.beats,8);assert.equal(plan.epoch,12);assert.deepEqual(plan.courtesyPairs,options.courtesyPairs);
 for(const [beat,expected]of[[0,options.entry],[8,options.exit]] as const)for(const p of plan.sample(beat).poses){const q=expected.get(p.id)!;assert.ok(gap(p.position,q.position)<1e-8);assert.ok(angle(p.yaw,q.yaw)<1e-8);assert.ok(gap(p.velocity)<1e-8);assert.ok(gap(p.acceleration)<1e-8);assert.equal(p.yawRate,0);}
 for(const pair of plan.courtesyPairs){assert.equal(options.relations[pair.relationship].get(pair.leaderId),pair.followerId);assert.equal(actors[pair.leaderId].role,reversed?'robin':'lark');for(const beat of[4.5,5,5.5,6]){const f=plan.sample(beat),L=f.poses.find(p=>p.id===pair.leaderId)!,R=f.poses.find(p=>p.id===pair.followerId)!;assert.ok(angle(L.yaw,R.yaw)<1e-8);assert.ok(L.velocity.x*Math.sin(L.yaw)+L.velocity.z*Math.cos(L.yaw)<0,'leader backs');assert.ok(R.velocity.x*Math.sin(R.yaw)+R.velocity.z*Math.cos(R.yaw)>0,'follower advances');const holds=f.contacts.filter(h=>h.a===pair.leaderId&&h.b===pair.followerId);assert.equal(holds.length,2);assert.deepEqual(holds.map(h=>[h.handA,h.handB]),[['left','left'],['right','right']]);}}
});
test('each named crossing is right shoulder and right hand, with no other contacts or duplicate hand ownership',()=>{
 const plan=compileRightLeftThrough(fixture()),gate=plan.sample(2);assert.equal(gate.contacts.length,2);
 for(const[a,b]of plan.crossingPairs){for(const[id,other]of[[a,b],[b,a]]){const P=gate.poses.find(p=>p.id===id)!,Q=gate.poses.find(p=>p.id===other)!,right={x:-Math.cos(P.yaw),z:Math.sin(P.yaw)};assert.ok((Q.position.x-P.position.x)*right.x+(Q.position.z-P.position.z)*right.z>.659);assert.ok(P.velocity.x*Math.sin(P.yaw)+P.velocity.z*Math.cos(P.yaw)>0);}const h=gate.contacts.find(h=>h.a===a&&h.b===b)!;assert.equal(h.handA,'right');assert.equal(h.handB,'right');assert.equal(h.strength,1);}
 for(let i=0;i<=1600;i++){const f=plan.sample(i/200),owned=new Set<string>();for(const h of f.contacts)for(const[id,hand]of[[h.a,h.handA],[h.b,h.handB]]){const key=`${id}/${hand}`;assert.ok(!owned.has(key));owned.add(key);}}
});
test('continuous C2 trajectories and facing stay inside the exact beat budget and preserve world transforms',()=>{
 const options=fixture(),plan=compileRightLeftThrough(options);for(const t of plan.phaseBoundaries.filter(t=>t>0&&t<8)){const a=plan.sample(t-1e-7),b=plan.sample(t+1e-7);for(let id=0;id<4;id++){assert.ok(gap(a.poses[id].position,b.poses[id].position)<1e-6);assert.ok(gap(a.poses[id].velocity,b.poses[id].velocity)<1e-5);assert.ok(gap(a.poses[id].acceleration,b.poses[id].acceleration)<1e-4);assert.ok(angle(a.poses[id].yaw,b.poses[id].yaw)<1e-6);assert.ok(Math.abs(a.poses[id].yawRate-b.poses[id].yawRate)<1e-6);}}
 const theta=.63,origin={x:2.3,z:-1.7},rotated=compileRightLeftThrough(transform(options,theta,origin));for(let i=0;i<=128;i++)for(const p of plan.sample(i/16).poses){const q=rotated.sample(i/16).poses[p.id],expected={x:origin.x+p.position.x*Math.cos(theta)-p.position.z*Math.sin(theta),z:origin.z+p.position.x*Math.sin(theta)+p.position.z*Math.cos(theta)};assert.ok(gap(q.position,expected)<1e-8);assert.ok(angle(q.yaw,p.yaw-theta)<1e-8);}
 assert.ok(plan.minimumObservedClearance>=.5);assert.ok(plan.maximumObservedSpeed<1.2);assert.ok(plan.maximumObservedYawRate<2);assert.deepEqual(plan.sample(-1),plan.sample(0));assert.deepEqual(plan.sample(12),plan.sample(8));assert.throws(()=>plan.sample(NaN),/finite/);
});
test('compiled identity and endpoint snapshots cannot be mutated by the caller or returned metadata',()=>{
 const options=fixture(),plan=compileRightLeftThrough(options),before=plan.sample(5);options.entry.get(0)!.position.x=100;options.exit.get(0)!.position.x=100;options.actors[0].role='robin';(options.relations.partner as Map<number,number>).clear();options.frame.across.x=10;(options.courtesyPairs[0] as any).leaderId=2;(options.crossingPairs[0] as number[])[0]=2;assert.deepEqual(plan.sample(5),before);assert.equal(typeof(plan.entry as any).set,'undefined');assert.throws(()=>{plan.entry.get(0)!.position.x=10;});assert.throws(()=>{(plan.courtesyPairs[0] as any).leaderId=4;});before.poses[0].position.x=100;assert.notEqual(plan.sample(5).poses[0].position.x,100);
});
test('reject stale or invalid current relations, implicit leaders, wrong role order, omitted modifiers, and changed endpoints',()=>{
 for(const changes of[{bindingEpoch:13},{bindingEpoch:12.5},{passingHand:'none'},{passingShoulder:'left'},{courtesyHold:'modified'},{beats:16},{crossingBeats:3},{minimumClearance:NaN},{maximumSpeed:.1},{maximumYawRate:.1}])assert.throws(()=>compileRightLeftThrough({...fixture(),...changes} as any));
 let o=fixture();o.actors=[o.actors[0],o.actors[0],...o.actors.slice(2)];assert.throws(()=>compileRightLeftThrough(o),/identities/);o=fixture();(o.entry as Map<number,RightLeftConstraint>).delete(0);assert.throws(()=>compileRightLeftThrough(o),/identities/);o=fixture();o.entry.get(0)!.velocity.x=.1;assert.throws(()=>compileRightLeftThrough(o),/derivatives/);o=fixture();o.relations={...o.relations,partner:o.relations.neighbor};assert.throws(()=>compileRightLeftThrough(o),/couple identity/);o=fixture();(o.relations.neighbor as Map<number,number>).set(0,1);assert.throws(()=>compileRightLeftThrough(o),/reciprocal/);o=fixture();o.courtesyPairs=[{leaderId:1,followerId:0,relationship:'partner'},o.courtesyPairs[1]];assert.throws(()=>compileRightLeftThrough(o),/left slot/);o=fixture();o.crossingPairs=[[0,2],[1,3]];assert.throws(()=>compileRightLeftThrough(o),/lane/);o=fixture();o.exit.get(0)!.yaw=0;assert.throws(()=>compileRightLeftThrough(o),/final-facing/);o=fixture();o.exit.get(0)!.position.x=-.9;assert.throws(()=>compileRightLeftThrough(o),/exit slots/);assert.throws(()=>compileRightLeftThrough(fixture()).position(999,.5),/outside/);
});
test('actual adult Avatar keeps exactly one step per audible beat, fixed limbs, and reachable explicit holds',()=>{
 globalThis.document={createElement:()=>({getContext:()=>new Proxy({},{get:()=>()=>{},set:()=>true})})} as unknown as Document;
 const dance={figures:[{kind:'long-lines',beats:8},{kind:'right-left-through',beats:8},{kind:'long-lines',beats:8}]} as Dance;
 let maxClamp=0,clamps=0,worst='',maxWrist=0,minHoldReach=Infinity,maxLowering=0,requiredHands=0;
 for(const options of[fixture(),fixture(true),transform(fixture(true),.63,{x:2.3,z:-1.7})]){
  const path=compileRightLeftThrough(options),avatars=actors.map(d=>new Avatar(d));
  const sample=(beat:number):Frame=>{beat=Math.max(0,Math.min(24,beat));const t=Math.max(0,Math.min(8,beat-8)),fi=beat<8?0:beat<16?1:2,f=path.sample(t);return{beat,localBeat:beat,figureIndex:fi,figureProgress:(beat-fi*8)/8,repeat:0,poses:f.poses.map(p=>({id:p.id,position:p.position,yaw:p.yaw,stride:1,lean:.03,bounce:fi===1?Math.sin(beat*Math.PI*2)*.018:0,turn:0,activity:fi===1?'right-left-through':'waiting'})),contacts:fi===1?f.contacts:[],warnings:[]};};
  const planted=new Map<string,{phase:number;position:Vector3}>();
  for(let i=0;i<960;i++){const beat=8+i/120,frame=sample(beat);for(const a of avatars){a.update(frame.poses[a.dancer.id],frame,{dance,showLabels:false} as StudioState,sample);const gait=a.root.userData.gait;assert.equal(gait.phase,beat);assert.equal(gait.maxRate,1);assert.equal(gait.steps,8);clamps+=gait.reachClamps;maxLowering=Math.max(maxLowering,gait.pelvisLowering);if(gait.maxClampDistance>maxClamp){maxClamp=gait.maxClampDistance;worst=`${beat}/${a.dancer.id}`;}}
   const corrected=applyBodyContactAnchors(avatars,frame);for(const a of avatars){a.root.updateMatrixWorld(true);for(const[j,leg]of a.legs.entries()){assert.ok(Math.abs(leg.upper.scale.y*3-.43)<1e-7);assert.ok(Math.abs(leg.lower.scale.y*3-.43)<1e-7);const offset=leg.side>0?1:0,phase=Math.floor((beat-offset)/2)*2+offset,key=`${a.dancer.id}/${j}`,position=leg.foot.getWorldPosition(new Vector3()),previous=planted.get(key);if(beat-phase<1){if(previous?.phase===phase&&maxClamp===0)assert.ok(position.distanceTo(previous.position)<1e-7,'planted feet must stay fixed');planted.set(key,{phase,position});}}
    for(const arm of a.arms){assert.ok(Math.abs(arm.upper.scale.y*3-.325)<1e-7);assert.ok(Math.abs(arm.lower.scale.y*3-.325)<1e-7);}}
   if(beat>12.5&&beat<14){assert.equal(corrected.contacts.length,4);assert.ok(corrected.contacts.every(h=>h.strength>.99));requiredHands++;}
   for(const h of corrected.contacts)if(h.strength>=1-1e-10)for(const[id,hand]of[[h.a,h.handA],[h.b,h.handB]] as const){const a=avatars[id],wrist=a.arms.find(a=>a.side===(hand==='left'?1:-1))!.hand.getWorldPosition(new Vector3()),error=wrist.distanceTo(new Vector3(h.point.x,h.point.y,h.point.z));maxWrist=Math.max(maxWrist,error);minHoldReach=Math.min(minHoldReach,h.strength);}
  }avatars.forEach(a=>a.dispose());
 }
 assert.equal(clamps,0,`leg correction ${maxClamp} at ${worst}`);assert.equal(maxClamp,0);assert.ok(maxLowering<=.065);assert.ok(requiredHands>0);assert.ok(maxWrist<1e-7,`full-strength wrist miss ${maxWrist}`);assert.equal(minHoldReach,1);
});
test('arbitrary stable actor IDs and exchanged role labels cannot change leader identity, choreography, or contact ownership',()=>{
 const source=fixture(),renames=new Map([[0,81],[1,17],[2,402],[3,6]]),id=(n:number)=>renames.get(n)!,pairs=(m:ReadonlyMap<number,number>)=>new Map([...m].map(([a,b])=>[id(a),id(b)])),endpoints=(m:ReadonlyMap<number,RightLeftConstraint>)=>new Map([...m].map(([i,p])=>[id(i),structuredClone(p)]));
 const renamed:RightLeftThroughOptions={...source,actors:source.actors.map(a=>({...a,id:id(a.id),role:a.role==='lark'?'robin':'lark'})),entry:endpoints(source.entry),exit:endpoints(source.exit),relations:{epoch:12,partner:pairs(source.relations.partner),neighbor:pairs(source.relations.neighbor)},crossingPairs:source.crossingPairs.map(([a,b])=>[id(a),id(b)]),courtesyPairs:source.courtesyPairs.map(p=>({...p,leaderId:id(p.leaderId),followerId:id(p.followerId)}))};
 const original=compileRightLeftThrough(source),changed=compileRightLeftThrough(renamed);for(let i=0;i<=80;i++){const A=original.sample(i/10),B=changed.sample(i/10);assert.deepEqual(B.poses.map(p=>p.id),[81,17,402,6]);for(const a of A.poses){const b=B.poses.find(b=>b.id===id(a.id))!;assert.deepEqual(b.position,a.position);assert.equal(b.yaw,a.yaw);}assert.deepEqual(B.contacts,A.contacts.map(c=>({...c,a:id(c.a),b:id(c.b)})));}
});
test('dense independent samples preserve clearance and fixed endpoints with explicit compact post-arch entry stance',()=>{
 const o=fixture(true);for(const p of o.entry.values())p.position.x*=.55/.9;const path=compileRightLeftThrough(o);let minimum=Infinity,maximum=0;
 for(let i=0;i<=8000;i++){const f=path.sample(i/1000);for(const p of f.poses)maximum=Math.max(maximum,gap(p.velocity));for(let a=0;a<4;a++)for(let b=a+1;b<4;b++)minimum=Math.min(minimum,gap(f.poses[a].position,f.poses[b].position));}
 assert.ok(minimum>=.5);assert.ok(maximum<1.2);for(const p of path.sample(0).poses)assert.ok(gap(p.position,o.entry.get(p.id)!.position)<1e-8);for(const p of path.sample(8).poses)assert.ok(gap(p.position,o.exit.get(p.id)!.position)<1e-8);
});
test('both courtesy holds last through the complete half-turn before the final on-beat stance opening',()=>{
 for(const reversed of[false,true]){const o=fixture(reversed),p=compileRightLeftThrough(o);for(const beat of[4.5,5,6,6.5,6.9,7]){const f=p.sample(beat);assert.equal(f.contacts.length,4);assert.ok(f.contacts.every(h=>h.kind==='courtesy'&&h.strength===1));for(const pair of p.courtesyPairs){const A=f.poses.find(p=>p.id===pair.leaderId)!,B=f.poses.find(p=>p.id===pair.followerId)!;assert.ok(Math.abs(gap(A.position,B.position)-.68)<1e-8);}}
  for(const a of p.sample(7).poses){assert.ok(angle(a.yaw,o.entry.get(a.id)!.yaw+Math.PI)<1e-8);assert.equal(a.yawRate,0);assert.ok(gap(a.velocity)<1e-8);}assert.deepEqual(p.sample(7.2).contacts,[]);for(const a of p.sample(8).poses)assert.ok(gap(a.position,o.exit.get(a.id)!.position)<1e-8);
 }
});
/** Uses actual production mesh vertices. It deliberately includes own forearms
 * and hands but excludes their intentional upper-arm/shoulder attachment. This
 * sampled regression is not a continuous collision certificate or browser QA. */
test('actual R&L ingress, held turn and release keep forearms outside both torsos and unrelated arms apart',()=>{
 globalThis.document={createElement:()=>({getContext:()=>new Proxy({},{get:()=>()=>{},set:()=>true})})} as unknown as Document;
 const rings=[[.91,.197],[.97,.195],[1.11,.17],[1.27,.225],[1.34,.245],[1.40,.18],[1.42,.11]],radius=(y:number)=>{if(y<.91||y>1.42)return 0;let i=1;while(i<rings.length-1&&rings[i][0]<y)i++;return rings[i-1][1]+(rings[i][1]-rings[i-1][1])*(y-rings[i-1][0])/(rings[i][0]-rings[i-1][0]);};
 const penetration=(A:any,B:any)=>{const inv=B.matrixWorld.clone().invert(),p=A.geometry.attributes.position,scale=B.getWorldScale(new Vector3()),factor=Math.min(scale.x,scale.y,scale.z);let minimum=Infinity;for(let i=0;i<p.count;i++){const v=new Vector3().fromBufferAttribute(p,i).applyMatrix4(A.matrixWorld).applyMatrix4(inv),q=B.geometry.type==='CapsuleGeometry'?Math.hypot(v.x,v.z,Math.max(0,Math.abs(v.y)-.5)):v.length();minimum=Math.min(minimum,(q-1)*factor);}return minimum;};
 const parts=(a:Avatar)=>a.arms.flatMap(arm=>[{mesh:arm.upper,hand:arm.side===1?'left':'right',upper:true},{mesh:arm.lower,hand:arm.side===1?'left':'right',upper:false},{mesh:arm.hand,hand:arm.side===1?'left':'right',upper:false}]);
 for(const reversed of[false,true]){const o=fixture(reversed),path=compileRightLeftThrough(o),avatars=actors.map(d=>new Avatar(d)),dance={figures:[{kind:'long-lines',beats:8},{kind:'right-left-through',beats:8},{kind:'long-lines',beats:8}]} as Dance;
  const sample=(beat:number):Frame=>{beat=Math.max(0,Math.min(24,beat));const fi=beat<8?0:beat<16?1:2,f=path.sample(Math.max(0,Math.min(8,beat-8)));return{beat,localBeat:beat,figureIndex:fi,figureProgress:(beat-fi*8)/8,repeat:0,poses:f.poses.map(p=>({...p,stride:1,lean:.03,bounce:fi===1?Math.sin(beat*Math.PI*2)*.018:0,turn:0,activity:fi===1?'right-left-through':'waiting'})),contacts:fi===1?f.contacts:[],warnings:[]};};
  let own=Infinity,other=Infinity,unrelated=Infinity;
  for(let i=0;i<=320;i++){const beat=8+i/40,frame=sample(beat);for(const a of avatars){a.update(frame.poses[a.dancer.id],frame,{dance,showLabels:false} as StudioState,sample);a.root.updateMatrixWorld(true);}
   for(const a of avatars)for(const b of avatars){if(a.root.position.distanceTo(b.root.position)>1.5)continue;const inv=b.body.matrixWorld.clone().invert();for(const part of parts(a)){if(a===b&&part.upper)continue;const vertices=part.mesh.geometry.attributes.position;for(let j=0;j<vertices.count;j++){const v=new Vector3().fromBufferAttribute(vertices,j).applyMatrix4(part.mesh.matrixWorld).applyMatrix4(inv),r=radius(v.y);if(!r)continue;const margin=(Math.hypot(v.x,v.z/.7)-r)*.7;if(a===b)own=Math.min(own,margin);else other=Math.min(other,margin);}}
    if(a.dancer.id>=b.dancer.id)continue;for(const A of parts(a))for(const B of parts(b)){const held=frame.contacts.some(c=>c.strength>0&&((c.a===a.dancer.id&&c.b===b.dancer.id&&c.handA===A.hand&&c.handB===B.hand)||(c.a===b.dancer.id&&c.b===a.dancer.id&&c.handA===B.hand&&c.handB===A.hand)));if(!held)unrelated=Math.min(unrelated,penetration(A.mesh,B.mesh),penetration(B.mesh,A.mesh));}
   }
  }
  assert.ok(own>.004,`own torso clearance ${own}`);assert.ok(other>.006,`other torso clearance ${other}`);assert.ok(unrelated>.03,`unrelated arms ${unrelated}`);avatars.forEach(a=>a.dispose());
 }
});
