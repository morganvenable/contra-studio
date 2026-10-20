import test from 'node:test';
import assert from 'node:assert/strict';
import {Vector3} from 'three';
import {Avatar,applyBodyContactAnchors} from './scene.ts';
import {compilePromenade,type PromenadeOptions,type PromenadeConstraint} from './promenade.ts';
import type {Dancer,Dance,Frame,StudioState,Vec2} from './types.ts';
const actors:Dancer[]=Array.from({length:4},(_,id)=>({id,name:['L1','R1','L2','R2'][id],role:id%2?'robin':'lark',couple:Math.floor(id/2),direction:1,color:'#438b86'}));
const pairMap=(pairs:number[][])=>new Map(pairs.flatMap(([a,b])=>[[a,b],[b,a]]));
const gap=(a:Vec2,b:Vec2={x:0,z:0})=>Math.hypot(a.x-b.x,a.z-b.z);
const angle=(a:number,b:number)=>Math.abs(Math.atan2(Math.sin(a-b),Math.cos(a-b)));
const pose=(x:number,z:number,yaw:number):PromenadeConstraint=>({position:{x,z},yaw,velocity:{x:0,z:0},yawRate:0});
function fixture():PromenadeOptions {
 const entry=new Map<number,PromenadeConstraint>(),exit=new Map<number,PromenadeConstraint>();
 for(const[l,r,d]of [[0,1,1],[2,3,-1]])for(const[id,s]of[[l,-d],[r,d]]){entry.set(id,pose(-d*.9,s*.34,d*Math.PI/2));exit.set(id,pose(d*.9,-s*.9,d*Math.PI/2+Math.PI));}
 return{actors:structuredClone(actors),entry,exit,relations:{epoch:12,partner:pairMap([[0,1],[2,3]]),neighbor:pairMap([[0,3],[1,2]])},bindingEpoch:12,pairs:[{leaderId:0,followerId:1,relationship:'partner'},{leaderId:2,followerId:3,relationship:'partner'}],passingShoulder:'left',turnDirection:'left',hold:'skaters',frame:{origin:{x:0,z:0},across:{x:1,z:0}},beats:8,crossingBeats:4,source:'https://www.contralab.org/Definitions.html'};
}
function transform(o:PromenadeOptions,theta:number,origin:Vec2):PromenadeOptions {
 const rotate=(p:Vec2)=>({x:p.x*Math.cos(theta)-p.z*Math.sin(theta),z:p.x*Math.sin(theta)+p.z*Math.cos(theta)}),map=(m:ReadonlyMap<number,PromenadeConstraint>)=>new Map([...m].map(([id,p])=>{const q=rotate(p.position);return[id,{...p,position:{x:q.x+origin.x,z:q.z+origin.z},velocity:rotate(p.velocity),yaw:p.yaw-theta}];}));return{...o,entry:map(o.entry),exit:map(o.exit),frame:{origin,across:rotate({x:1,z:0})}};
}
test('half promenade preserves persistent partners and exact eight-beat endpoints',()=>{
 const o=fixture(),p=compilePromenade(o);assert.equal(p.epoch,12);assert.equal(p.beats,8);assert.equal(p.crossingBeats,4);assert.equal(p.hold,'skaters');assert.deepEqual(p.pairs,o.pairs);
 for(const[beat,m]of[[0,o.entry],[8,o.exit]]as const)for(const a of p.sample(beat).poses){const expected=m.get(a.id)!;assert.ok(gap(a.position,expected.position)<1e-8);assert.ok(angle(a.yaw,expected.yaw)<1e-8);assert.ok(gap(a.velocity)<1e-8);assert.ok(gap(a.acceleration)<1e-8);assert.equal(a.yawRate,0);}
 for(const pair of p.pairs)for(const beat of[.5,1,2,3,4,5,6,7]){const f=p.sample(beat),a=f.poses.find(a=>a.id===pair.leaderId)!,b=f.poses.find(a=>a.id===pair.followerId)!;assert.equal(o.relations.partner.get(a.id),b.id);assert.ok(gap(a.position,b.position)>.6799999);assert.ok(gap(a.position,b.position)<.6800001);const h=f.contacts.filter(h=>h.a===a.id&&h.b===b.id);assert.equal(h.length,2);assert.deepEqual(h.map(h=>[h.handA,h.handB]),[['left','left'],['right','right']]);assert.ok(h.every(h=>h.strength===1));}
});
test('larks pass left shoulders while both named couples travel together and turn left as a unit',()=>{
 const plan=compilePromenade(fixture()),gate=plan.sample(2),a=gate.poses[0],b=gate.poses[2];
 for(const[p,q]of[[a,b],[b,a]]){const left={x:Math.cos(p.yaw),z:-Math.sin(p.yaw)};assert.ok((q.position.x-p.position.x)*left.x+(q.position.z-p.position.z)*left.z>.659);assert.ok(p.velocity.x*Math.sin(p.yaw)+p.velocity.z*Math.cos(p.yaw)>0);}
 for(const beat of[4.5,5,5.5,6]){const f=plan.sample(beat);for(const{leaderId:l,followerId:r}of plan.pairs){const a=f.poses[l],b=f.poses[r];assert.ok(a.yawRate>0);assert.ok(angle(a.yaw,b.yaw)<1e-8);assert.ok(a.velocity.x*Math.sin(a.yaw)+a.velocity.z*Math.cos(a.yaw)<0,'left-slot person backs');assert.ok(b.velocity.x*Math.sin(b.yaw)+b.velocity.z*Math.cos(b.yaw)>0,'right-slot person walks forward');}}
 for(let i=0;i<=1600;i++){const f=plan.sample(i/200),used=new Set<string>();for(const h of f.contacts){assert.equal(actors[h.a].couple,actors[h.b].couple);for(const[id,hand]of[[h.a,h.handA],[h.b,h.handB]]){const key=`${id}/${hand}`;assert.ok(!used.has(key));used.add(key);}}}
});
test('C2 root and facing continuity, rigid transforms, clearance and speed are independently sampled',()=>{
 const plan=compilePromenade(fixture());for(const t of plan.phaseBoundaries.filter(t=>t>0&&t<8)){const a=plan.sample(t-1e-7),b=plan.sample(t+1e-7);for(let id=0;id<4;id++){assert.ok(gap(a.poses[id].position,b.poses[id].position)<1e-6);assert.ok(gap(a.poses[id].velocity,b.poses[id].velocity)<1e-5);assert.ok(gap(a.poses[id].acceleration,b.poses[id].acceleration)<1e-4);assert.ok(angle(a.poses[id].yaw,b.poses[id].yaw)<1e-6);assert.ok(Math.abs(a.poses[id].yawRate-b.poses[id].yawRate)<1e-6);}}
 const theta=.63,origin={x:2.3,z:-1.7},rotated=compilePromenade(transform(fixture(),theta,origin));let minimum=Infinity,maximum=0;
 for(let i=0;i<=8000;i++){const f=plan.sample(i/1000);for(const p of f.poses)maximum=Math.max(maximum,gap(p.velocity));for(let a=0;a<4;a++)for(let b=a+1;b<4;b++)minimum=Math.min(minimum,gap(f.poses[a].position,f.poses[b].position));}
 for(let i=0;i<=128;i++)for(const p of plan.sample(i/16).poses){const q=rotated.sample(i/16).poses[p.id],expected={x:origin.x+p.position.x*Math.cos(theta)-p.position.z*Math.sin(theta),z:origin.z+p.position.x*Math.sin(theta)+p.position.z*Math.cos(theta)};assert.ok(gap(q.position,expected)<1e-8);assert.ok(angle(q.yaw,p.yaw-theta)<1e-8);}
 assert.ok(minimum>=.66-1e-10);assert.ok(maximum<=1.05+1e-10);assert.ok(plan.maximumObservedYawRate<1.28);assert.deepEqual(plan.sample(-1),plan.sample(0));assert.deepEqual(plan.sample(12),plan.sample(8));assert.throws(()=>plan.sample(NaN),/finite/);
});
test('identity snapshots are immutable and every unsupported modifier, stale epoch and wrong partner fails closed',()=>{
 const o=fixture(),p=compilePromenade(o),before=p.sample(5);o.entry.get(0)!.position.x=100;o.exit.get(0)!.position.x=100;o.actors[0].role='robin';(o.relations.partner as Map<number,number>).clear();o.frame.across.x=10;(o.pairs[0]as any).leaderId=2;assert.deepEqual(p.sample(5),before);assert.equal(typeof(p.entry as any).set,'undefined');assert.throws(()=>{p.entry.get(0)!.position.x=10;});assert.throws(()=>{(p.pairs[0]as any).leaderId=4;});before.poses[0].position.x=100;assert.notEqual(p.sample(5).poses[0].position.x,100);
 for(const change of[{bindingEpoch:13},{passingShoulder:'right'},{turnDirection:'right'},{hold:'courtesy'},{beats:16},{crossingBeats:3},{minimumClearance:NaN},{maximumSpeed:.1},{maximumYawRate:.1}])assert.throws(()=>compilePromenade({...fixture(),...change}as any));
 let bad=fixture();bad.relations={...bad.relations,partner:bad.relations.neighbor};assert.throws(()=>compilePromenade(bad),/couple identity/);bad=fixture();bad.pairs=[{leaderId:0,followerId:3,relationship:'partner'},{leaderId:2,followerId:1,relationship:'partner'}];assert.throws(()=>compilePromenade(bad),/partner/);bad=fixture();bad.entry.get(0)!.velocity.x=.1;assert.throws(()=>compilePromenade(bad),/derivatives/);bad=fixture();bad.pairs=[{leaderId:1,followerId:0,relationship:'partner'},bad.pairs[1]];assert.throws(()=>compilePromenade(bad),/left slot/);bad=fixture();for(const p of bad.entry.values())p.position.z=Math.sign(p.position.z)*.9;assert.throws(()=>compilePromenade(bad),/speed/,'the previous swing must prepare reachable compact promenade stance');assert.throws(()=>p.position(99,.5),/outside/);
});
test('actual adult Avatar has one footfall per musical beat, fixed limb lengths and reachable skaters holds',t=>{
 globalThis.document={createElement:()=>({getContext:()=>new Proxy({},{get:()=>()=>{},set:()=>true})})}as unknown as Document;
 const dance={figures:[{kind:'long-lines',beats:8},{kind:'promenade',beats:8},{kind:'long-lines',beats:8}]}as Dance;
 let maxClamp=0,clamps=0,worst='',maxWrist=0,maxLowering=0,held=0;
 for(const options of[fixture(),transform(fixture(),.63,{x:2.3,z:-1.7})]){
  const path=compilePromenade(options),avatars=actors.map(d=>new Avatar(d));
  const sample=(beat:number):Frame=>{beat=Math.max(0,Math.min(24,beat));const t=Math.max(0,Math.min(8,beat-8)),fi=beat<8?0:beat<16?1:2,f=path.sample(t);return{beat,localBeat:beat,figureIndex:fi,figureProgress:(beat-fi*8)/8,repeat:0,poses:f.poses.map(p=>({id:p.id,position:p.position,yaw:p.yaw,stride:1,lean:.03,bounce:fi===1?Math.sin(beat*Math.PI*2)*.018:0,turn:0,activity:fi===1?'promenade':'waiting'})),contacts:fi===1?f.contacts:[],warnings:[]};};
  const planted=new Map<string,{phase:number;position:Vector3}>();
  for(let i=0;i<960;i++){const beat=8+i/120,frame=sample(beat);for(const a of avatars){a.update(frame.poses[a.dancer.id],frame,{dance,showLabels:false}as StudioState,sample);const gait=a.root.userData.gait;assert.equal(gait.phase,beat);assert.equal(gait.maxRate,1);assert.equal(gait.steps,8);clamps+=gait.reachClamps;maxLowering=Math.max(maxLowering,gait.pelvisLowering);if(gait.maxClampDistance>maxClamp){maxClamp=gait.maxClampDistance;worst=`${beat}/${a.dancer.id}`;}}
   const corrected=applyBodyContactAnchors(avatars,frame);for(const a of avatars){a.root.updateMatrixWorld(true);for(const[j,leg]of a.legs.entries()){assert.ok(Math.abs(leg.upper.scale.y*3-.43)<1e-7);assert.ok(Math.abs(leg.lower.scale.y*3-.43)<1e-7);const offset=leg.side>0?1:0,phase=Math.floor((beat-offset)/2)*2+offset,key=`${a.dancer.id}/${j}`,position=leg.foot.getWorldPosition(new Vector3()),previous=planted.get(key);if(beat-phase<1){if(previous?.phase===phase&&maxClamp===0)assert.ok(position.distanceTo(previous.position)<1e-7);planted.set(key,{phase,position});}}for(const arm of a.arms){assert.ok(Math.abs(arm.upper.scale.y*3-.325)<1e-7);assert.ok(Math.abs(arm.lower.scale.y*3-.325)<1e-7);}}
   if(beat>8.5&&beat<15){assert.equal(corrected.contacts.length,4);assert.ok(corrected.contacts.every(h=>h.strength>.99));held++;}
   for(const h of corrected.contacts)if(h.strength===1)for(const[id,hand]of[[h.a,h.handA],[h.b,h.handB]]as const){const wrist=avatars[id].arms.find(a=>a.side===(hand==='left'?1:-1))!.hand.getWorldPosition(new Vector3()),error=wrist.distanceTo(new Vector3(h.point.x,h.point.y,h.point.z));maxWrist=Math.max(maxWrist,error);}
  }avatars.forEach(a=>a.dispose());
 }
 assert.equal(clamps,0,`leg correction ${maxClamp} at ${worst}`);assert.equal(maxClamp,0);assert.ok(maxLowering<=.065);assert.ok(held>0);assert.ok(maxWrist<1e-7,`full-strength wrist miss ${maxWrist}`);t.diagnostic(`Promenade: zero reach corrections; maximum wrist error ${maxWrist}; no extra footfalls.`);
});

/** Uses actual production mesh vertices. It deliberately includes own forearms
 * and hands but excludes their intentional upper-arm/shoulder attachment. This
 * sampled regression is not a continuous collision certificate or browser QA. */
test('actual promenade ingress, held turn and release keep forearms outside both torsos and unrelated arms apart',t=>{
 globalThis.document={createElement:()=>({getContext:()=>new Proxy({},{get:()=>()=>{},set:()=>true})})} as unknown as Document;
 const rings=[[.91,.197],[.97,.195],[1.11,.17],[1.27,.225],[1.34,.245],[1.40,.18],[1.42,.11]],radius=(y:number)=>{if(y<.91||y>1.42)return 0;let i=1;while(i<rings.length-1&&rings[i][0]<y)i++;return rings[i-1][1]+(rings[i][1]-rings[i-1][1])*(y-rings[i-1][0])/(rings[i][0]-rings[i-1][0]);};
 const penetration=(A:any,B:any)=>{const inv=B.matrixWorld.clone().invert(),p=A.geometry.attributes.position,scale=B.getWorldScale(new Vector3()),factor=Math.min(scale.x,scale.y,scale.z);let minimum=Infinity;for(let i=0;i<p.count;i++){const v=new Vector3().fromBufferAttribute(p,i).applyMatrix4(A.matrixWorld).applyMatrix4(inv),q=B.geometry.type==='CapsuleGeometry'?Math.hypot(v.x,v.z,Math.max(0,Math.abs(v.y)-.5)):v.length();minimum=Math.min(minimum,(q-1)*factor);}return minimum;};
 const parts=(a:Avatar)=>a.arms.flatMap(arm=>[{mesh:arm.upper,hand:arm.side===1?'left':'right',upper:true},{mesh:arm.lower,hand:arm.side===1?'left':'right',upper:false},{mesh:arm.hand,hand:arm.side===1?'left':'right',upper:false}]);
 for(const o of[fixture(),transform(fixture(),.63,{x:2.3,z:-1.7})]){const path=compilePromenade(o),avatars=actors.map(d=>new Avatar(d)),dance={figures:[{kind:'long-lines',beats:8},{kind:'promenade',beats:8},{kind:'long-lines',beats:8}]} as Dance;
  const sample=(beat:number):Frame=>{beat=Math.max(0,Math.min(24,beat));const fi=beat<8?0:beat<16?1:2,f=path.sample(Math.max(0,Math.min(8,beat-8)));return{beat,localBeat:beat,figureIndex:fi,figureProgress:(beat-fi*8)/8,repeat:0,poses:f.poses.map(p=>({...p,stride:1,lean:.03,bounce:fi===1?Math.sin(beat*Math.PI*2)*.018:0,turn:0,activity:fi===1?'promenade':'waiting'})),contacts:fi===1?f.contacts:[],warnings:[]};};
  let own=Infinity,other=Infinity,unrelated=Infinity,heldUnrelated=Infinity,ownAt='',otherAt='',unrelatedAt='',heldAt='';
  for(let i=0;i<=320;i++){const beat=8+i/40,frame=sample(beat);for(const a of avatars){a.update(frame.poses[a.dancer.id],frame,{dance,showLabels:false} as StudioState,sample);a.root.updateMatrixWorld(true);}
   for(const a of avatars)for(const b of avatars){if(a.root.position.distanceTo(b.root.position)>1.5)continue;const inv=b.body.matrixWorld.clone().invert();for(const part of parts(a)){if(a===b&&part.upper)continue;const vertices=part.mesh.geometry.attributes.position;for(let j=0;j<vertices.count;j++){const v=new Vector3().fromBufferAttribute(vertices,j).applyMatrix4(part.mesh.matrixWorld).applyMatrix4(inv),r=radius(v.y);if(!r)continue;const margin=(Math.hypot(v.x,v.z/.7)-r)*.7;if(a===b){if(margin<own){own=margin;ownAt=`${beat}/${a.dancer.id}/${part.hand}/${part.upper}`;}}else if(margin<other){other=margin;otherAt=`${beat}/${a.dancer.id}/${b.dancer.id}/${part.hand}/${part.upper}`;}}}
    if(a.dancer.id>=b.dancer.id)continue;for(const A of parts(a))for(const B of parts(b)){const held=frame.contacts.some(c=>c.strength>0&&((c.a===a.dancer.id&&c.b===b.dancer.id&&c.handA===A.hand&&c.handB===B.hand)||(c.a===b.dancer.id&&c.b===a.dancer.id&&c.handA===B.hand&&c.handB===A.hand)));if(!held){const q=Math.min(penetration(A.mesh,B.mesh),penetration(B.mesh,A.mesh));if(beat>8.5&&beat<15&&q<heldUnrelated){heldUnrelated=q;heldAt=`${beat}/${a.dancer.id}/${A.hand}/${A.upper}/${b.dancer.id}/${B.hand}/${B.upper}`;}if(q<unrelated){unrelated=q;unrelatedAt=`${beat}/${a.dancer.id}/${A.hand}/${A.upper}/${b.dancer.id}/${B.hand}/${B.upper}`;}}}
   }
  }
  t.diagnostic(`Mesh clearance own ${own} at ${ownAt}; other ${other} at ${otherAt}; unrelated ${unrelated} at ${unrelatedAt}; held ${heldUnrelated} at ${heldAt}`);assert.ok(own>.004,`own torso clearance ${own}`);assert.ok(other>.006,`other torso clearance ${other}`);assert.ok(unrelated>.02,`unrelated arms ${unrelated}`);avatars.forEach(a=>a.dispose());
 }
});
test('arbitrary stable IDs and exchanged role labels cannot alter explicit partner leaders or contact ownership',()=>{
 const source=fixture(),renames=new Map([[0,81],[1,17],[2,402],[3,6]]),id=(n:number)=>renames.get(n)!,pairs=(m:ReadonlyMap<number,number>)=>new Map([...m].map(([a,b])=>[id(a),id(b)])),endpoints=(m:ReadonlyMap<number,PromenadeConstraint>)=>new Map([...m].map(([i,p])=>[id(i),structuredClone(p)]));
 const renamed:PromenadeOptions={...source,actors:source.actors.map(a=>({...a,id:id(a.id),role:a.role==='lark'?'robin':'lark'})),entry:endpoints(source.entry),exit:endpoints(source.exit),relations:{epoch:12,partner:pairs(source.relations.partner),neighbor:pairs(source.relations.neighbor)},pairs:source.pairs.map(p=>({...p,leaderId:id(p.leaderId),followerId:id(p.followerId)}))};
 const original=compilePromenade(source),changed=compilePromenade(renamed);for(let i=0;i<=80;i++){const A=original.sample(i/10),B=changed.sample(i/10);assert.deepEqual(B.poses.map(p=>p.id),[81,17,402,6]);for(const a of A.poses){const b=B.poses.find(b=>b.id===id(a.id))!;assert.deepEqual(b.position,a.position);assert.equal(b.yaw,a.yaw);}assert.deepEqual(B.contacts,A.contacts.map(c=>({...c,a:id(c.a),b:id(c.b)})));}
});
