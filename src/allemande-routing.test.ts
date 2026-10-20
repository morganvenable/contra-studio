import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Vector3} from 'three';
import {prepareContraDbReview} from './source-review.ts';
import {compileChoreography} from './choreography.ts';
import {REGISTERED_MOTION_CAPABILITIES} from './capabilities.ts';
import {figureContinuity} from './engine.ts';
import {Avatar,applyBodyContactAnchors} from './scene.ts';
import type {StudioState} from './types.ts';
const capabilities={...REGISTERED_MOTION_CAPABILITIES,giveAndTakes:true,heldQuarterAllemandes:true};
const reviewed=()=>prepareContraDbReview(readFileSync(new URL('../test-data/contradb/2604.json',import.meta.url),'utf8'),[],capabilities).result.dance!;
const wrap=(n:number)=>Math.atan2(Math.sin(n),Math.cos(n));
globalThis.document={createElement:()=>({getContext:()=>new Proxy({},{get:()=>()=>{},set:()=>true})})} as unknown as Document;
test('held-quarter preparation faces its named same-role actor before acquiring the opposite hand',()=>{
 const dance=reviewed(),c=compileChoreography(dance,6,capabilities);
 assert.equal(figureContinuity(dance.figures,1).sameRoleExit,'larks');
 for(const base of[0,4,8])for(const [a,b] of[[base,base+2],[base+2,base]]){const f=c.sample(16),A=f.poses[a],B=f.poses[b],target=Math.atan2(B.position.x-A.position.x,B.position.z-A.position.z);assert.ok(Math.abs(wrap(A.yaw-target))<1e-9);}
 for(const beat of[17,20,22]){const frame=c.sample(beat),left=frame.contacts.filter(c=>c.handA==='left'&&c.handB==='left');assert.equal(left.length,3,'same-role hands retain all three groups');for(const h of left)assert.equal(h.strength,1,'reachable acquired hands must stay fully held');}
 const mutated=structuredClone(dance.figures);mutated[2].direction='right';assert.equal(figureContinuity(mutated,1).sameRoleExit,undefined);
});
test('source2604 handoff and swing ingress retain fixed limbs, cadence and continuous articulated joins',()=>{
 const dance=reviewed(),c=compileChoreography(dance,6,capabilities),avatars=c.dancers.map(d=>new Avatar(d));
 const pose=(beat:number)=>{const frame=c.sample(beat);for(const a of avatars){a.update(frame.poses[a.dancer.id],frame,{dance,showLabels:false} as StudioState,c.sample);assert.equal(a.root.userData.gait.phase,beat);assert.equal(a.root.userData.gait.steps,8);assert.equal(a.root.userData.gait.maxRate,1);}const corrected=applyBodyContactAnchors(avatars,frame);for(const a of avatars){a.root.updateMatrixWorld(true);for(const arm of a.arms){assert.ok(Math.abs(arm.upper.scale.y*3-.325)<1e-7);assert.ok(Math.abs(arm.lower.scale.y*3-.325)<1e-7);}for(const leg of a.legs){assert.ok(Math.abs(leg.upper.scale.y*3-.43)<1e-7);assert.ok(Math.abs(leg.lower.scale.y*3-.43)<1e-7);}}for(const h of corrected.contacts)if(h.strength>=1-1e-10)for(const[id,hand]of(!h.target||h.target==='hands'?[[h.a,h.handA],[h.b,h.handB]]:[[h.a,h.handA]]) as [number,'left'|'right'][]){const p=avatars[id].arms.find(a=>a.side===(hand==='left'?1:-1))!.hand.getWorldPosition(new Vector3());assert.ok(p.distanceTo(new Vector3(h.point.x,h.point.y,h.point.z))<1e-7);}return avatars.flatMap(a=>[...a.arms.flatMap(x=>[x.hand,x.elbow]),...a.legs.flatMap(x=>[x.foot,x.knee])].map(mesh=>mesh.getWorldPosition(new Vector3())));};
 for(let i=0;i<=16*120;i++)pose(8+i/120);
 for(const beat of[8,14.5,15,15.5,16,16.5,17.5,23,24]){const before=pose(beat-1e-6),after=pose(beat+1e-6);for(let i=0;i<before.length;i++)assert.ok(before[i].distanceTo(after[i])<.0005,`articulated join ${beat}/${i}`);}
 avatars.forEach(a=>a.dispose());
});
