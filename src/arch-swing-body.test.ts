import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Vector3} from 'three';
import {Avatar,applyBodyContactAnchors} from './scene.ts';
import {prepareContraDbReview} from './source-review.ts';
import {compileChoreography} from './choreography.ts';
import {REGISTERED_MOTION_CAPABILITIES} from './capabilities.ts';
import type {StudioState} from './types.ts';
globalThis.document={createElement:()=>({getContext:()=>new Proxy({},{get:()=>()=>{},set:()=>true})})} as unknown as Document;
for(const[id,begin,end]of[[2235,4,10],[2235,36,42],[2236,4,10]])test(`actual${id} arch and immediate swing${begin}–${end} retain exact cadence, fixed limbs and full-strength wrists`,()=>{
 const caps={...REGISTERED_MOTION_CAPABILITIES,archSwingExits:true},result=prepareContraDbReview(readFileSync(new URL(`../test-data/contradb/${id}.json`,import.meta.url),'utf8'),[],caps).result;assert.ok(result.dance,result.errors.join('\n'));
 const dance=result.dance,c=compileChoreography(dance,6,caps),avatars=c.dancers.map(d=>new Avatar(d)),state={dance,showLabels:false} as StudioState;
 let worstWrist=0;
 for(let i=0;i<=Math.round((end-begin)*100);i++){const beat=begin+i/100,frame=c.sample(beat);for(const a of avatars){a.update(frame.poses[a.dancer.id],frame,state,c.sample);const gait=a.root.userData.gait;assert.equal(gait.phase,beat);assert.equal(gait.maxRate,1);assert.equal(gait.steps,dance.figures[frame.figureIndex].beats);assert.equal(gait.reachClamps,0,`reach ${id}/${beat}/${a.dancer.id}`);for(const leg of a.legs){assert.ok(Math.abs(leg.upper.scale.y*3-.43)<1e-7);assert.ok(Math.abs(leg.lower.scale.y*3-.43)<1e-7);}for(const arm of a.arms){assert.ok(Math.abs(arm.upper.scale.y*3-.325)<1e-7);assert.ok(Math.abs(arm.lower.scale.y*3-.325)<1e-7);}}
  const corrected=applyBodyContactAnchors(avatars,frame);avatars.forEach(a=>a.root.updateMatrixWorld(true));
  const occupied=new Set<string>();for(const h of corrected.contacts){for(const[actor,hand]of(!h.target||h.target==='hands'?[[h.a,h.handA],[h.b,h.handB]]:[[h.a,h.handA]]) as[number,'left'|'right'][]){const key=`${actor}:${hand}`;assert.ok(!occupied.has(key),`duplicate occupied hand${id}/${beat}/${key}`);occupied.add(key);if(h.strength<1-1e-10)continue;const actual=avatars[actor].arms.find(a=>a.side===(hand==='left'?1:-1))!.hand.getWorldPosition(new Vector3()),error=actual.distanceTo(new Vector3(h.point.x,h.point.y,h.point.z));worstWrist=Math.max(worstWrist,error);assert.ok(error<1e-7,`wrist${id}/${beat}/${key}/${error}`);}}
 }
 // The articulated body, including foot plants and body-anchored frame hands,
 // must be continuous at both completion of the exchange and swing count1.
 const snapshot=(beat:number)=>{const f=c.sample(beat);for(const a of avatars)a.update(f.poses[a.dancer.id],f,state,c.sample);applyBodyContactAnchors(avatars,f);const points:Vector3[]=[];for(const a of avatars){a.root.updateMatrixWorld(true);for(const limb of[...a.arms,...a.legs])for(const mesh of[limb.upper,limb.lower,...('hand' in limb?[limb.hand,limb.elbow]:[limb.foot,limb.knee])]){const vertices=mesh.geometry.attributes.position;for(let i=0;i<vertices.count;i++)points.push(new Vector3().fromBufferAttribute(vertices,i).applyMatrix4(mesh.matrixWorld));}}return points;};
 for(const boundary of[begin+3,begin+4]){const before=snapshot(boundary-1e-6),at=snapshot(boundary),after=snapshot(boundary+1e-6);for(let i=0;i<at.length;i++){assert.ok(at[i].distanceTo(before[i])<1e-5,`body boundary before ${id}/${boundary}/${i}`);assert.ok(at[i].distanceTo(after[i])<1e-5,`body boundary after ${id}/${boundary}/${i}`);}}
 for(const a of avatars)a.dispose();assert.ok(worstWrist<1e-7);
});
