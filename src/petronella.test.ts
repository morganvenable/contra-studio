import test from 'node:test';
import assert from 'node:assert/strict';
import {Vector3} from 'three';
import {compilePetronella,type PetronellaOptions} from './petronella.ts';
import {compileRingBalance} from './ring-balance.ts';
import {distance,heading,turn,type TurnConstraint} from './ring-twirl-contract.ts';
import {Avatar,applyBodyContactAnchors} from './scene.ts';
import type {Dancer,Dance,Frame,Pose,StudioState,Vec2} from './types.ts';
const actors:Dancer[]=Array.from({length:4},(_,id)=>({id,name:['L1','R1','L2','R2'][id],role:id%2?'robin':'lark',couple:Math.floor(id/2),direction:id<2?1:-1,color:'#438b86'}));
const pairs=(pairs:number[][])=>new Map(pairs.flatMap(([a,b])=>[[a,b],[b,a]]));
const relations={epoch:7,partner:pairs([[0,1],[2,3]]),neighbor:pairs([[0,3],[1,2]])};
const cycle:[number,number,number,number]=[3,2,1,0];
function fixture():PetronellaOptions {
 const points=[[-.55,.55],[.55,.55],[.55,-.55],[-.55,-.55]],entry=new Map(points.map(([x,z],id)=>[id,{position:{x,z},yaw:heading({x,z},{x:0,z:0}),velocity:{x:0,z:0},yawRate:0}])),exit=new Map(cycle.map((id,i)=>[id,{...entry.get(id)!,position:{...entry.get(cycle[(i+3)%4])!.position},yaw:entry.get(id)!.yaw-3*Math.PI/2}]));
 return{actors:structuredClone(actors),entry,exit,relations:structuredClone(relations),bindingEpoch:7,cyclicIds:[...cycle],beats:4,direction:'right',amount:.25,spinDirection:'right',spinAmount:.75,clap:'none',exitHands:'ring'};
}
test('petronella moves each named actor exactly one station right while spinning clockwise three quarters',()=>{
 const o=fixture(),p=compilePetronella(o);assert.equal(p.epoch,7);assert.deepEqual(p.cyclicIds,cycle);
 for(const id of cycle){const a=p.sample(0).poses.find(x=>x.id===id)!,e=p.sample(4).poses.find(x=>x.id===id)!,i=cycle.indexOf(id);assert.ok(distance(e.position,o.entry.get(cycle[(i+3)%4])!.position)<1e-9);assert.ok(Math.abs(e.yaw-a.yaw+3*Math.PI/2)<1e-9);assert.ok(Math.abs(turn(e.yaw,heading(e.position,{x:0,z:0})))<1e-9);for(const b of[0,4]){const q=p.sample(b).poses.find(x=>x.id===id)!;assert.ok(distance(q.velocity,{x:0,z:0})<1e-8);assert.ok(Math.abs(q.yawRate)<1e-8);}
  for(let i=1;i<400;i++){const q=p.sample(i/100).poses.find(x=>x.id===id)!,before=p.sample((i-1)/100).poses.find(x=>x.id===id)!;assert.ok(q.yaw<before.yaw);assert.ok(Math.abs(distance(q.position,{x:0,z:0})-Math.hypot(.55,.55))<1e-9);}
 }
 assert.ok(p.minimumObservedClearance>=1.1-1e-9);assert.ok(p.maximumObservedSpeed<.38);assert.ok(p.maximumObservedYawRate<1.44);
});
test('petronella releases all four original ring hands, uses no phantom hold during spin, and rejoins the same graph',()=>{
 const p=compilePetronella(fixture()),edges=[[3,2,'left','right'],[2,1,'left','right'],[1,0,'left','right'],[0,3,'left','right']];
 for(const beat of[0,4]){const f=p.sample(beat);assert.deepEqual(f.contacts.map(h=>[h.a,h.b,h.handA,h.handB]),edges);assert.ok(f.contacts.every(h=>h.strength===1));}
 for(const beat of[.3,.5,1,2,3,3.7])assert.deepEqual(p.sample(beat).contacts,[]);
 for(const beat of[.1,.2,3.8,3.9])assert.ok(p.sample(beat).contacts.every(h=>h.strength>0&&h.strength<1));
});
test('petronella owns contracts and fails closed on different timing, turn, clap, IDs and ring slots',()=>{
 const o=fixture(),p=compilePetronella(o),sample=p.sample(2);o.entry.get(0)!.position.x=99;o.exit.get(0)!.yaw=99;(o.relations.partner as Map<number,number>).clear();(o.cyclicIds as number[]).reverse();assert.deepEqual(p.sample(2),sample);
 for(const changes of[{beats:8},{amount:.75},{direction:'left'},{spinDirection:'left'},{spinAmount:1.25},{clap:'twice'},{bindingEpoch:8},{cyclicIds:[0,1,3,2]}])assert.throws(()=>compilePetronella({...fixture(),...changes} as any));
 const wrong=fixture();wrong.exit.get(0)!.position={...wrong.entry.get(0)!.position};assert.throws(()=>compilePetronella(wrong),/right-hand station/);
 const altered=fixture();altered.entry.get(0)!.yaw+=.1;assert.throws(()=>compilePetronella(altered),/inward-facing/);
 assert.throws(()=>p.sample(NaN));assert.throws(()=>p.position(999,.5));
});
test('opaque identities and rotated world frames preserve rightward stations and exact winding',()=>{
 const o=fixture(),mapping=new Map([[0,14],[1,2],[2,99],[3,37]]),theta=.73,origin={x:2.8,z:-1.4},rotate=(p:Vec2)=>({x:origin.x+p.x*Math.cos(theta)-p.z*Math.sin(theta),z:origin.z+p.x*Math.sin(theta)+p.z*Math.cos(theta)}),map=(m:ReadonlyMap<number,TurnConstraint>)=>new Map([...m].map(([id,p])=>[mapping.get(id)!,{...p,position:rotate(p.position),yaw:p.yaw-theta}])),rel=(m:ReadonlyMap<number,number>)=>new Map([...m].map(([a,b])=>[mapping.get(a)!,mapping.get(b)!]));
 const a=compilePetronella(o),b=compilePetronella({...o,actors:o.actors.map(d=>({...d,id:mapping.get(d.id)!})),entry:map(o.entry),exit:map(o.exit),cyclicIds:o.cyclicIds.map(id=>mapping.get(id)!) as [number,number,number,number],relations:{epoch:7,partner:rel(o.relations.partner),neighbor:rel(o.relations.neighbor)}});
 for(let i=0;i<=40;i++)for(const p of a.sample(i/10).poses){const q=b.sample(i/10).poses.find(x=>x.id===mapping.get(p.id))!;assert.ok(distance(q.position,rotate(p.position))<1e-9);assert.ok(Math.abs(q.yaw-(p.yaw-theta))<1e-9);}
});
function rigFixture(){
 const o=fixture(),spin=compilePetronella(o),ring=(entry:typeof o.entry)=>compileRingBalance({...o,entry,exit:entry,hands:'both',exitMode:'same-ring'}),before=ring(o.entry),after=ring(o.exit),dance={figures:[{kind:'ring-balance',beats:4},{kind:'petronella',beats:4},{kind:'ring-balance',beats:4}]} as Dance;
 const sample=(beat:number):Frame=>{const b=Math.max(0,Math.min(12-1e-8,beat)),fi=Math.floor(b/4),local=b-fi*4,frame=fi===0?before.sample(local):fi===1?spin.sample(local):after.sample(local),poses=actors.map(a=>{const p=frame.poses.find(x=>x.id===a.id)!;return{id:a.id,position:p.position,yaw:p.yaw,stride:1,lean:0,bounce:0,turn:0,activity:dance.figures[fi].kind,balance:'balance'in p?p.balance:undefined} as Pose;});return{beat:b,localBeat:b,figureIndex:fi,figureProgress:local/4,repeat:0,poses,contacts:frame.contacts,warnings:[]};};return{dance,sample};
}
test('actual Avatar petronella has one alternating physical landing each beat, fixed limbs and reachable ring joins',()=>{
 globalThis.document={createElement:()=>({getContext:()=>new Proxy({},{get:()=>()=>{},set:()=>true})})} as unknown as Document;
 const {dance,sample}=rigFixture(),avatars=actors.map(d=>new Avatar(d));let clamps=0,maxClamp=0,maxWrist=0;
 for(let i=0;i<=640;i++){const beat=2+i/80,f=sample(beat);for(const a of avatars){a.update(f.poses[a.dancer.id],f,{dance,showLabels:false} as StudioState,sample);const g=a.root.userData.gait;assert.equal(g.phase,beat);assert.equal(g.steps,4);assert.equal(g.maxRate,1);if(beat>=4&&beat<=8){clamps+=g.reachClamps;maxClamp=Math.max(maxClamp,g.maxClampDistance);}for(const leg of a.legs){assert.ok(Math.abs(leg.upper.scale.y*3-.43)<1e-7);assert.ok(Math.abs(leg.lower.scale.y*3-.43)<1e-7);}}
  const posed=applyBodyContactAnchors(avatars,f);avatars.forEach(a=>a.root.updateMatrixWorld(true));for(const h of posed.contacts)if(h.strength===1)for(const[id,hand]of[[h.a,h.handA],[h.b,h.handB]] as const){const arm=avatars[id].arms.find(a=>a.side===(hand==='left'?1:-1))!;maxWrist=Math.max(maxWrist,arm.hand.getWorldPosition(new Vector3()).distanceTo(new Vector3(h.point.x,h.point.y,h.point.z)));assert.ok(Math.abs(arm.upper.scale.y*3-.325)<1e-7);assert.ok(Math.abs(arm.lower.scale.y*3-.325)<1e-7);}
 }
 for(let beat=4;beat<=8;beat++)for(const a of avatars){const leg=a.legs.find(l=>l.side===(beat%2?1:-1))!,f=sample(beat-.5);a.update(f.poses[a.dancer.id],f,{dance,showLabels:false} as StudioState,sample);assert.ok(leg.foot.position.y>.055+1e-5);const at=sample(beat);a.update(at.poses[a.dancer.id],at,{dance,showLabels:false} as StudioState,sample);assert.ok(Math.abs(leg.foot.position.y-.055)<1e-9);}
 avatars.forEach(a=>a.dispose());assert.equal(clamps,0,`max correction ${maxClamp}`);assert.ok(maxWrist<1e-7,`wrist error ${maxWrist}`);
});
test('actual petronella meshes clear other dancers throughout ring release, travel, spin and rejoin',()=>{
 globalThis.document={createElement:()=>({getContext:()=>new Proxy({},{get:()=>()=>{},set:()=>true})})} as unknown as Document;
 const {dance,sample}=rigFixture(),avatars=actors.map(d=>new Avatar(d));
 const parts=(a:Avatar)=>a.legs.flatMap((l,i)=>[['thigh',l.upper],['shin',l.lower],['foot',l.foot]].map(([name,mesh])=>({name:`leg${i}-${name}`,mesh,hand:undefined as string|undefined}))).concat(a.arms.flatMap((l,i)=>[['upper',l.upper],['forearm',l.lower],['hand',l.hand]].map(([name,mesh])=>({name:`arm${i}-${name}`,mesh,hand:l.side===1?'left':'right'}))));
 const penetration=(A:any,B:any)=>{const inv=B.matrixWorld.clone().invert(),attr=A.geometry.attributes.position,scale=B.getWorldScale(new Vector3()),minScale=Math.min(scale.x,scale.y,scale.z);let min=Infinity;for(let i=0;i<attr.count;i++){const v=new Vector3().fromBufferAttribute(attr,i).applyMatrix4(A.matrixWorld).applyMatrix4(inv),q=B.geometry.type==='CapsuleGeometry'?Math.hypot(v.x,v.z,Math.max(0,Math.abs(v.y)-.5)):v.length();min=Math.min(min,(q-1)*minScale);}return min;};
 const rings=[[.91,.197],[.97,.195],[1.11,.17],[1.27,.225],[1.34,.245],[1.40,.18],[1.42,.11]],radius=(y:number)=>{if(y<.91||y>1.42)return 0;let k=1;while(k<rings.length-1&&rings[k][0]<y)k++;return rings[k-1][1]+(rings[k][1]-rings[k-1][1])*(y-rings[k-1][0])/(rings[k][0]-rings[k-1][0]);};
 let minimum=Infinity,worst='';const low=(v:number,info:string)=>{if(v<minimum){minimum=v;worst=info;}};
 for(let i=0;i<=160;i++){const beat=4+i/40,f=sample(beat);for(const a of avatars)a.update(f.poses[a.dancer.id],f,{dance,showLabels:false} as StudioState,sample);const posed=applyBodyContactAnchors(avatars,f);avatars.forEach(a=>a.root.updateMatrixWorld(true));
  for(let ai=0;ai<4;ai++)for(let bi=ai+1;bi<4;bi++){const A=avatars[ai],B=avatars[bi];for(const a of parts(A))for(const b of parts(B)){const joined=a.hand&&b.hand&&posed.contacts.some(c=>c.strength>0&&((c.a===ai&&c.b===bi&&c.handA===a.hand&&c.handB===b.hand)||(c.a===bi&&c.b===ai&&c.handA===b.hand&&c.handB===a.hand)));if(joined)continue;low(Math.min(penetration(a.mesh,b.mesh),penetration(b.mesh,a.mesh)),`${beat}/${ai}/${bi}/${a.name}/${b.name}`);}
   for(const [source,other]of[[A,B],[B,A]])for(const part of parts(source)){const inv=other.body.matrixWorld.clone().invert(),attr=(part.mesh as any).geometry.attributes.position;for(let j=0;j<attr.count;j++){const p=new Vector3().fromBufferAttribute(attr,j).applyMatrix4((part.mesh as any).matrixWorld).applyMatrix4(inv),r=radius(p.y);if(r)low((Math.hypot(p.x,p.z/.7)-r)*.7,`${beat}/${source.dancer.id}/${other.dancer.id}/${part.name}/torso`);low((Math.hypot(p.x/.16,(p.y-1.62)/.21,p.z/.18)-1)*.16,`${beat}/${source.dancer.id}/${other.dancer.id}/${part.name}/head`);}}
  }
 }
 avatars.forEach(a=>a.dispose());assert.ok(minimum>=0,`minimum sampled clearance ${minimum} at ${worst}`);
});

test('released petronella-to-star hand exit preserves every root and facing sample without a last-instant ring grip',()=>{
 const o=fixture(),joined=compilePetronella(o),released=compilePetronella({...o,exitHands:'released'});
 for(let i=0;i<=400;i++){const a=joined.sample(i/100),b=released.sample(i/100);assert.deepEqual(a.poses,b.poses);if(i>=30)assert.deepEqual(b.contacts,[]);else assert.deepEqual(a.contacts,b.contacts);}
 assert.equal(joined.sample(4).contacts.length,4);assert.equal(released.exitHands,'released');assert.throws(()=>compilePetronella({...fixture(),exitHands:'star'} as any));
});
test('actual petronella planted feet stay in world space and seek order does not change posed geometry',()=>{
 globalThis.document={createElement:()=>({getContext:()=>new Proxy({},{get:()=>()=>{},set:()=>true})})} as unknown as Document;
 const {dance,sample}=rigFixture(),avatars=actors.map(d=>new Avatar(d)),capture=(a:Avatar,beat:number)=>{const f=sample(beat);a.update(f.poses[a.dancer.id],f,{dance,showLabels:false} as StudioState,sample);a.root.updateMatrixWorld(true);return a.legs.map(l=>l.foot.getWorldPosition(new Vector3()));};
 for(const a of avatars){for(let beat=4;beat<8;beat++){const index=a.legs.findIndex(l=>l.side===(beat%2?1:-1)),plant=capture(a,beat+.05)[index];for(const offset of[.25,.5,.75,.95])assert.ok(plant.distanceTo(capture(a,beat+offset)[index])<1e-8,`stance slip ${a.dancer.id}/${beat}/${offset}`);}
  const beats=[4.1,4.9,5.5,6.5,7.1,7.9],expected=new Map(beats.map(b=>[b,capture(a,b)]));for(const b of[7.9,4.1,6.5,4.9,7.1,5.5])for(const [i,p]of capture(a,b).entries())assert.ok(p.distanceTo(expected.get(b)![i])<1e-9);
 }
 avatars.forEach(a=>a.dispose());
});
