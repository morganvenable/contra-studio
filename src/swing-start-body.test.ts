import test from 'node:test';import assert from 'node:assert/strict';import {Vector3} from 'three';
import {openingSwingFixture,swingStartCapabilities} from '../test-data/swing-start/fixture.ts';import {compileChoreography} from './choreography.ts';import {Avatar,applyBodyContactAnchors} from './scene.ts';import {probeArmJoins} from '../test-data/ring-pass/free-arm-probe.ts';import type {StudioState} from './types.ts';
const dom=()=>{globalThis.document={createElement:()=>({getContext:()=>new Proxy({},{get:()=>()=>{},set:()=>true})})}as unknown as Document;};
test('actual881 new opening, right-shoulder return and waiting frames keep beat cadence and exact held wrists',t=>{
 dom();const residuals:Record<string,number>={};let wrist=0,balanceWrist=0;
 for(const n of[3,6]){const dance=openingSwingFixture(),c=compileChoreography(dance,n),avatars=c.dancers.map(d=>new Avatar(d)),state={dance,showLabels:false}as StudioState;
  const update=(beat:number)=>{const frame=c.sample(beat);for(const a of avatars){const pose=frame.poses[a.dancer.id];a.update(pose,frame,state,c.sample);const gait=a.root.userData.gait;assert.equal(gait.phase,beat);assert.equal(gait.steps,dance.figures[frame.figureIndex].beats);assert.equal(gait.maxRate,1);residuals[pose.activity]=Math.max(residuals[pose.activity]??0,gait.maxClampDistance);if(pose.activity!=='allemande')assert.equal(gait.maxClampDistance,0,`${n}/${beat}/${a.dancer.id}`);for(const leg of a.legs){assert.ok(Math.abs(leg.upper.scale.y*3-.43)<1e-7);assert.ok(Math.abs(leg.lower.scale.y*3-.43)<1e-7);}for(const arm of a.arms){assert.ok(Math.abs(arm.upper.scale.y*3-.325)<1e-7);assert.ok(Math.abs(arm.lower.scale.y*3-.325)<1e-7);}}
   const posed=applyBodyContactAnchors(avatars,frame);avatars.forEach(a=>a.root.updateMatrixWorld(true));for(const h of posed.contacts)if(h.strength>1-1e-10)for(const[id,hand]of[[h.a,h.handA],...(!h.target||h.target==='hands'?[[h.b,h.handB]]:[])]as [number,'left'|'right'][]){const a=avatars[id],arm=a.arms.find(p=>(p.side===1?'left':'right')===hand)!,error=arm.hand.getWorldPosition(new Vector3()).distanceTo(new Vector3(h.point.x,h.point.y,h.point.z));if(frame.poses[id].activity==='balance')balanceWrist=Math.max(balanceWrist,error);else wrist=Math.max(wrist,error);}
   return frame;
  };
  for(let i=0;i<=128*40;i++)update(i/40);
  for(let repeat=0;repeat<2*n;repeat++)for(const local of[1,2,3,4,60,61,62,63,64]){const beat=repeat*64+local;update(beat-.5);const air=avatars.map(a=>a.legs.find(l=>l.side===(beat%2?1:-1))!.foot.position.y),frame=update(beat);for(const a of avatars){const id=a.dancer.id;if(frame.poses[id].activity==='waiting'&&frame.poses[id].stride===0)continue;assert.ok(air[id]>.055+1e-5,`airborne ${n}/${beat}/${id}`);assert.ok(Math.abs(a.legs.find(l=>l.side===(beat%2?1:-1))!.foot.position.y-.055)<1e-8,`landing ${n}/${beat}/${id}`);}}
  avatars.forEach(a=>a.dispose());const joins=probeArmJoins(c,Array.from({length:2*n},(_,r)=>[r*64+60,r*64+64]).flat());assert.ok(joins.maximum<1e-6,JSON.stringify(joins));
 }
 assert.ok(wrist<1e-7);assert.ok(balanceWrist<.0042);assert.ok((residuals.allemande??0)<.021);t.diagnostic(JSON.stringify({residuals,wrist,balanceWrist}));
});
