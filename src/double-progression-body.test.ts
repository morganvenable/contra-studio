import test from 'node:test';import assert from 'node:assert/strict';import {Vector3} from 'three';
import {compileChoreography} from './choreography.ts';
import {withBalanceStance} from './stance.ts';import {Avatar,applyBodyContactAnchors} from './scene.ts';
import {reviewed928} from '../test-data/double-progression/fixture.ts';
import {probeWaitingTransitions} from '../test-data/double-progression/wait-mesh-probe.ts';
import {probePetronellaTransitions} from '../test-data/petronella/mesh-probe.ts';
import type {StudioState} from './types.ts';
const dom=()=>{globalThis.document={createElement:()=>({getContext:()=>new Proxy({},{get:()=>()=>{},set:()=>true})})}as unknown as Document;};
const make=(n:number)=>{const{dance,policy}=reviewed928();return compileChoreography(dance,n);};

test('actual928 full finite period and dense new figures preserve actual Avatar cadence, zero new foot corrections and reachable arch/star wrists',()=>{
 dom();const c=make(3),avatars=c.dancers.map(d=>new Avatar(d));let maxNewClamp=0,maxNewWrist=0,maxInheritedBalanceWrist=0;const newKinds=new Set(['do-si-do','box-the-gnat','star','waiting']);
 const beats=[...Array.from({length:3*64*40+1},(_,i)=>i/40),...Array.from({length:3},(_,r)=>r).flatMap(r=>Array.from({length:26*200+1},(_,i)=>r*64+38+i/200))];
 for(const beat of beats){const f=c.sample(beat);for(const a of avatars){const p=f.poses[a.dancer.id];a.update(p,f,{dance:c.dance,showLabels:false}as StudioState,c.sample);const gait=a.root.userData.gait;assert.equal(gait.phase,beat);assert.equal(gait.steps,c.dance.figures[f.figureIndex].beats);assert.equal(gait.maxRate,1);if(newKinds.has(p.activity))maxNewClamp=Math.max(maxNewClamp,gait.maxClampDistance);for(const leg of a.legs){assert.ok(Math.abs(leg.upper.scale.y*3-.43)<1e-8);assert.ok(Math.abs(leg.lower.scale.y*3-.43)<1e-8);}}
  const posed=applyBodyContactAnchors(avatars,f);avatars.forEach(a=>a.root.updateMatrixWorld(true));for(const h of posed.contacts)if(h.strength>=1-1e-10&&(!h.target||h.target==='hands'))for(const[id,hand]of[[h.a,h.handA],[h.b,h.handB]]as const){const arm=avatars[id].arms.find(a=>a.side===(hand==='left'?1:-1))!,error=arm.hand.getWorldPosition(new Vector3()).distanceTo(new Vector3(h.point.x,h.point.y,h.point.z)),activity=f.poses[id].activity;if(activity==='star'||activity==='box-the-gnat')maxNewWrist=Math.max(maxNewWrist,error);if(activity==='balance')maxInheritedBalanceWrist=Math.max(maxInheritedBalanceWrist,error);}
 }
 for(let r=0;r<3;r++)for(let local=39;local<64;local++){const beat=r*64+local,at=c.sample(beat),before=c.sample(beat-.5);for(const a of avatars){if(at.poses[a.dancer.id].activity==='waiting'&&at.poses[a.dancer.id].stride===0)continue;const leg=a.legs.find(l=>l.side===(beat%2?1:-1))!;a.update(before.poses[a.dancer.id],before,{dance:c.dance,showLabels:false}as StudioState,c.sample);assert.ok(leg.foot.position.y>.055+1e-5);a.update(at.poses[a.dancer.id],at,{dance:c.dance,showLabels:false}as StudioState,c.sample);assert.ok(Math.abs(leg.foot.position.y-.055)<1e-9);}}
 avatars.forEach(a=>a.dispose());assert.equal(maxNewClamp,0);assert.ok(maxNewWrist<1e-7);assert.ok(maxInheritedBalanceWrist<.0042);
});

test('literal complete star winds once inside its eight source counts and does not translate any actor to manufacture progression',()=>{
 const c=make(3),sample=c.formationSample!,ids=[0,1,4,5],initial=sample(56).poses,center={x:ids.reduce((n,id)=>n+initial[id].position.x,0)/4,z:ids.reduce((n,id)=>n+initial[id].position.z,0)/4};
 for(const id of ids){let previous=Math.atan2(initial[id].position.z-center.z,initial[id].position.x-center.x),sum=0;for(let i=1;i<=1600;i++){const p=sample(56+i/200-1e-9).poses[id],next=Math.atan2(p.position.z-center.z,p.position.x-center.x);sum+=Math.atan2(Math.sin(next-previous),Math.cos(next-previous));previous=next;}assert.ok(Math.abs(sum-2*Math.PI)<1e-7);const end=sample(64-1e-8).poses[id];assert.ok(Math.hypot(end.position.x-initial[id].position.x,end.position.z-initial[id].position.z)<1e-7);}
});

test('dense new DSD/arch and finite-end mixtures clear other bodies; star permits only the disclosed shared-hand hub overlap',()=>{
 dom();const c=make(3);for(const[name,lo,hi]of[['do-si-do',38,48],['arch',52,56]]as const){const beats=Array.from({length:3},(_,r)=>r).flatMap(r=>Array.from({length:(hi-lo)*20+1},(_,i)=>r*64+lo+i/20)),result=probePetronellaTransitions(c,beats);assert.ok(result.minimum>=0,`${name}: ${JSON.stringify(result)}`);assert.ok(result.minimumSelfForearmTorso>=-.008,`${name}: ${JSON.stringify(result)}`);}
 const stars=Array.from({length:3},(_,r)=>r).flatMap(r=>Array.from({length:161},(_,i)=>r*64+56+i/20)),star=probePetronellaTransitions(c,stars);assert.ok(star.minimumOutsideStarHub>=0,JSON.stringify(star));assert.ok(star.minimum>=-.030,JSON.stringify(star));assert.ok(star.minimumSelfForearmTorso>=-.008,JSON.stringify(star));
});

test('both finite-end exchange intervals clear active dancers without using inherited active swing overlap as a baseline',()=>{dom();for(const n of[2,3]){const c=make(n),beats=Array.from({length:n},(_,r)=>r).flatMap(r=>[0,48].flatMap(start=>Array.from({length:161},(_,i)=>r*64+start+i/20))),result=probeWaitingTransitions(c,beats);assert.ok(result.minimum>=0,JSON.stringify({n,...result}));}});
