import test from 'node:test';
import assert from 'node:assert/strict';
import {Vector3} from 'three';
import {compileChoreography} from './choreography.ts';
import {Avatar,applyBodyContactAnchors} from './scene.ts';
import {FREDERICK_REEL} from '../test-data/progression/fixtures.ts';
import type {MotionCapabilities,StudioState} from './types.ts';

const capabilities:MotionCapabilities={deferredNeighbors:true,progressionEvents:true,hallTravel:true};

test('Frederick staged complete source uses musical fixed-limb gait and strict hall joins, with bounded inherited arm limitations',t=>{
 globalThis.document={createElement:()=>({getContext:()=>new Proxy({},{get:()=>()=>{},set:()=>true})})} as unknown as Document;
 const dance=FREDERICK_REEL;
 for(const count of[2,6]){const c=compileChoreography(dance,count,capabilities),avatars=c.dancers.map(d=>new Avatar(d)),state={dance,showLabels:false} as StudioState;let maxAllemande=0,maxBalance=0,maxNew=0;
  const update=(beat:number)=>{const f=c.sample(beat),kind=dance.figures[f.figureIndex].kind;
   for(const a of avatars){a.update(f.poses[a.dancer.id],f,state,b=>c.sample(b));const gait=a.root.userData.gait;assert.equal(gait.phase,beat);assert.equal(gait.maxRate,1);assert.equal(gait.steps,dance.figures[f.figureIndex].beats);assert.equal(gait.reachClamps,0,`leg correction ${count}/${beat}/${a.dancer.id}: ${gait.maxClampDistance}`);}
   const corrected=applyBodyContactAnchors(avatars,f);for(const a of avatars){a.root.updateMatrixWorld(true);for(const leg of a.legs){assert.ok(Math.abs(leg.upper.scale.y*3-.43)<1e-7);assert.ok(Math.abs(leg.lower.scale.y*3-.43)<1e-7);}for(const arm of a.arms){assert.ok(Math.abs(arm.upper.scale.y*3-.325)<1e-7);assert.ok(Math.abs(arm.lower.scale.y*3-.325)<1e-7);}}
   for(const h of corrected.contacts)if(h.strength>=1-1e-10){const owners:[number,'left'|'right'][]=[[h.a,h.handA]];if(!h.target||h.target==='hands')owners.push([h.b,h.handB]);for(const[id,hand]of owners){const wrist=avatars[id].arms.find(a=>a.side===(hand==='left'?1:-1))!.hand.getWorldPosition(new Vector3()),error=wrist.distanceTo(new Vector3(h.point.x,h.point.y,h.point.z));if(kind==='allemande')maxAllemande=Math.max(maxAllemande,error);else if(kind==='balance')maxBalance=Math.max(maxBalance,error);else maxNew=Math.max(maxNew,error);}}
   return avatars.flatMap(a=>[...a.arms.flatMap(p=>[p.hand,p.elbow]),...a.legs.flatMap(p=>[p.foot,p.knee])].map(p=>p.getWorldPosition(new Vector3())));
  };
  // Includes the first-pass exception, the later beat-8 rebind, the same-end
  // waiting exchange, both partner hall entries, and both neighbor swing exits.
  for(let i=0;i<128*120;i++)update(i/120);
  for(const base of[0,64])for(const local of[32,36,40,44,48,56]){const beat=base+local,A=update(beat-1e-5),B=update(beat+1e-5);for(let i=0;i<A.length;i++)assert.ok(A[i].distanceTo(B[i])<.002,`hall articulated join ${count}/${beat}/${i}: ${A[i].distanceTo(B[i])}`);}
  avatars.forEach(a=>a.dispose());assert.ok(maxNew<1e-7,`new hall or adjacent held-wrist miss: ${maxNew}`);assert.ok(maxAllemande<.111,`inherited same-role allemande wrist limit regressed: ${maxAllemande}`);assert.ok(maxBalance<.0042,`inherited balance wrist limit regressed: ${maxBalance}`);
  t.diagnostic(`${count} couples / first two rounds: zero leg corrections, one alternating footfall per beat, unchanged bones; hall/circle/swing wrists ${maxNew}. Inherited same-role allemande wrist miss ${maxAllemande}; balance ${maxBalance}.`);
 }
});
