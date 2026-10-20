import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {Vector3} from 'three';
import {prepareContraDbReview} from './source-review.ts';import {compileChoreography} from './choreography.ts';import {REGISTERED_MOTION_CAPABILITIES} from './capabilities.ts';import {Avatar,applyBodyContactAnchors} from './scene.ts';import type {Pose,StudioState} from './types.ts';
const caps={...REGISTERED_MOTION_CAPABILITIES,terminalPetronellas:true};const source=()=>{const p=prepareContraDbReview(readFileSync(new URL('../test-data/contradb/2211.json',import.meta.url),'utf8'),[],caps);assert.ok(p.result.dance,JSON.stringify(p.result.errors));return p.result.dance;};
const gap=(a:Pose,b:Pose)=>Math.hypot(a.position.x-b.position.x,a.position.z-b.position.z),angle=(a:Pose,b:Pose)=>Math.abs(Math.atan2(Math.sin(a.yaw-b.yaw),Math.cos(a.yaw-b.yaw))),corners=(poses:Pose[])=>[...poses].sort((a,b)=>{const slot=(p:Pose)=>p.position.z<0?(p.position.x<0?0:1):(p.position.x>0?2:3);return slot(a)-slot(b);}).map(p=>p.id);
test('actual2211 retains two complete right stations, a separately counted terminal heading change, and every finite progression endpoint',()=>{
 const d=source(),two=compileChoreography(d,2,caps),logical=two.formationSample!;
 for(const[beat,expected]of[[8,[2,3,0,1]],[16,[0,3,2,1]],[32,[0,3,2,1]],[48,[0,1,2,3]],[56,[1,2,3,0]],[60,[1,2,3,0]],[63,[2,3,0,1]],[64-1e-7,[2,3,0,1]]]as const)assert.deepEqual(corners(logical(beat).poses),expected);
 for(let id=0;id<4;id++){const a=logical(60).poses[id],b=logical(63).poses[id],e=logical(64-1e-7).poses[id];assert.ok(Math.abs(b.yaw-a.yaw+3*Math.PI/2)<1e-7);assert.ok(Math.abs(b.position.x*e.position.z-b.position.z*e.position.x)<1e-7);assert.ok(Math.abs(Math.abs(e.position.x)-.9)<1e-7);assert.ok(Math.abs(Math.abs(e.position.z)-.9)<1e-7);}
 for(const b of[60.225,61,62,63,63.5,63.99])assert.equal(logical(b).contacts.length,0);
 for(let n=2;n<=12;n++){const c=compileChoreography(d,n,caps);assert.equal(c.repeatable,true);for(let repeat=0;repeat<2*n;repeat++)for(const local of[...c.starts,63,64]){const beat=repeat*64+local;if(!beat)continue;const a=c.sample(beat-1e-7),b=c.sample(beat);for(const p of b.poses){assert.ok(gap(p,a.poses[p.id])<2e-5,`${n}/${beat}/${p.id}`);assert.ok(angle(p,a.poses[p.id])<2e-5);}}
  const a=c.sample(61.5),b=c.sample(2*n*64+61.5);for(const p of a.poses){assert.ok(gap(p,b.poses[p.id])<1e-8);assert.ok(angle(p,b.poses[p.id])<1e-8);}
 }
});
test('actual2211 complete round has exact musical cadence and zero leg correction including terminal opening and next balance',()=>{
 globalThis.document={createElement:()=>({getContext:()=>new Proxy({},{get:()=>()=>{},set:()=>true})})} as unknown as Document;
 const dance=source();for(const n of[3,6]){const c=compileChoreography(dance,n,caps),avatars=c.dancers.map(d=>new Avatar(d));let maximum=0;
 for(let i=0;i<=3200;i++){const beat=i/50,frame=c.sample(beat);for(const a of avatars){a.update(frame.poses[a.dancer.id],frame,{dance,showLabels:false}as StudioState,c.sample);const gait=a.root.userData.gait;assert.equal(gait.phase,beat);assert.equal(gait.maxRate,1);assert.equal(gait.maxClampDistance,0,`${n}/${beat}/${a.dancer.id}/${gait.maxClampDistance}`);for(const l of a.legs){assert.ok(Math.abs(l.upper.scale.y*3-.43)<1e-7);assert.ok(Math.abs(l.lower.scale.y*3-.43)<1e-7);}}
  if(beat>=48){const posed=applyBodyContactAnchors(avatars,frame);avatars.forEach(a=>a.root.updateMatrixWorld(true));for(const h of posed.contacts)if(h.strength>=1-1e-10)for(const[id,hand]of[[h.a,h.handA],[h.b,h.handB]]as const){const arm=avatars[id].arms.find(a=>a.side===(hand==='left'?1:-1))!;maximum=Math.max(maximum,arm.hand.getWorldPosition(new Vector3()).distanceTo(new Vector3(h.point.x,h.point.y,h.point.z)));}}
 }assert.ok(maximum<1e-7);avatars.forEach(a=>a.dispose());}
});
test('actual2211 terminal spin, opening and next-neighbor entry clear other dancers in sampled production meshes',async()=>{
 globalThis.document={createElement:()=>({getContext:()=>new Proxy({},{get:()=>()=>{},set:()=>true})})} as unknown as Document;
 const {probePetronellaTransitions}=await import('../test-data/petronella/mesh-probe.ts'),c=compileChoreography(source(),6,caps),result=probePetronellaTransitions(c,Array.from({length:101},(_,i)=>60+i/20));assert.ok(result.minimum>0,JSON.stringify(result));assert.ok(result.minimumSelfForearmTorso>=-.008,JSON.stringify(result));
});
