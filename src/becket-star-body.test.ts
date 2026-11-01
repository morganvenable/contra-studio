import test from 'node:test';import assert from 'node:assert/strict';import {Vector3} from 'three';
import {compileChoreography} from './choreography.ts';import {BUTTER_CANDIDATE} from './catalog.ts';
import {compileStarProgressingBecket} from './becket-star-progression.ts';
import {withBalanceStance} from './stance.ts';import {Avatar,applyBodyContactAnchors} from './scene.ts';
import {reviewedBecketStar} from '../test-data/becket-star/fixture.ts';
import {probePetronellaTransitions} from '../test-data/petronella/mesh-probe.ts';
import {probeWaitingTransitions} from '../test-data/double-progression/wait-mesh-probe.ts';
import type {StudioState} from './types.ts';
const dom=()=>{globalThis.document={createElement:()=>({getContext:()=>new Proxy({},{get:()=>()=>{},set:()=>true})})}as unknown as Document;};
const make=(n:number)=>{const d=reviewedBecketStar();return compileChoreography(d,n,{progressionEvents:true,becketStarProgressions:true}) as ReturnType<typeof compileStarProgressingBecket>;};

test('actual2446 complete finite period preserves one-step-per-count Avatar cadence, fixed limbs, zero foot corrections and honest held contacts',t=>{
 dom();const c=make(3),avatars=c.dancers.map(d=>new Avatar(d)),state={dance:c.dance,showLabels:false}as StudioState;let clamp=0,newWrist=0,balanceWrist=0,partial=0;
 const update=(beat:number)=>{const f=c.sample(beat);for(const a of avatars){const p=f.poses[a.dancer.id];a.update(p,f,state,c.sample);const gait=a.root.userData.gait;assert.equal(gait.phase,beat);assert.equal(gait.steps,c.dance.figures[f.figureIndex].beats);assert.equal(gait.maxRate,1);clamp=Math.max(clamp,gait.maxClampDistance);for(const leg of a.legs){assert.ok(Math.abs(leg.upper.scale.y*3-.43)<1e-8);assert.ok(Math.abs(leg.lower.scale.y*3-.43)<1e-8);}for(const arm of a.arms){assert.ok(Math.abs(arm.upper.scale.y*3-.325)<1e-8);assert.ok(Math.abs(arm.lower.scale.y*3-.325)<1e-8);}}
  const posed=applyBodyContactAnchors(avatars,f);avatars.forEach(a=>a.root.updateMatrixWorld(true));for(const h of posed.contacts){if(h.strength>0&&h.strength<1)partial++;if(h.strength>=1-1e-10)for(const[id,hand]of[[h.a,h.handA],...(!h.target||h.target==='hands'?[[h.b,h.handB]]:[])]as Array<[number,'left'|'right']>){const error=avatars[id].arms.find(a=>a.side===(hand==='left'?1:-1))!.hand.getWorldPosition(new Vector3()).distanceTo(new Vector3(h.point.x,h.point.y,h.point.z));if(f.poses[id].activity==='balance')balanceWrist=Math.max(balanceWrist,error);else newWrist=Math.max(newWrist,error);}}
  return avatars.flatMap(a=>[...a.arms.flatMap(p=>[p.hand,p.elbow]),...a.legs.flatMap(p=>[p.foot,p.knee])].map(p=>p.getWorldPosition(new Vector3())));
 };
 for(let i=0;i<=c.period*64*12;i++)update(i/12);
 for(let r=0;r<c.period;r++){for(let i=32*80;i<48*80;i++)update(r*64+i/80);for(const local of[0,8,16,20,32,40,48,56,64]){const beat=r*64+local;if(!beat)continue;const before=update(beat-1e-6),after=update(beat+1e-6);for(let i=0;i<before.length;i++)assert.ok(before[i].distanceTo(after[i])<.0003,`articulated join${beat}/${i}:${before[i].distanceTo(after[i])}`);}}
 avatars.forEach(a=>a.dispose());assert.equal(clamp,0);assert.ok(newWrist<1e-7);assert.ok(balanceWrist<.0042);assert.ok(partial>0);t.diagnostic(JSON.stringify({clamp,newWrist,balanceWrist,partialContactSamples:partial}));
});

test('actual2446 new left-star and new-neighbor passage clear articulated bodies across the full finite period',t=>{
 dom();const c=make(3);for(const[name,lo,hi]of[['allemande',8,16],['star',32,40],['do-si-do',40,48]]as const){const beats=Array.from({length:c.period},(_,r)=>r).flatMap(r=>Array.from({length:(hi-lo)*12+1},(_,i)=>r*64+lo+i/12)),result=probePetronellaTransitions(c,beats);t.diagnostic(JSON.stringify({name,...result}));assert.ok(result.minimumSelfForearmTorso>=-.05,`${name}:${JSON.stringify(result)}`);if(name==='star'){assert.ok(result.minimumOutsideStarHub>=-.05,JSON.stringify(result));assert.ok(result.minimum>=-.05,JSON.stringify(result));}else assert.ok(result.minimum>=-.05,`${name}:${JSON.stringify(result)}`);}
});

test('actual2446 both ends and reentry clear all active dancers at their own physical ends',t=>{
 dom();for(const n of[2,3]){const c=make(n),beats=Array.from({length:c.period},(_,r)=>r).flatMap(r=>Array.from({length:16*12+1},(_,i)=>r*64+32+i/12)),result=probeWaitingTransitions(c,beats);t.diagnostic(JSON.stringify({n,...result}));assert.ok(result.minimum>=-.05,JSON.stringify(result));}
});

test('actual2446 reports inherited closed swing-frame mesh limits separately from new-path acceptance',t=>{
 dom();const c=make(3),beats=[19.75,20,29.75,30,55.75,56,62.75,63,83.75,84,93.75,94,119.75,120,126.75,127],result=probePetronellaTransitions(c,beats);
 // This is a diagnostic of existing shared styling, never a relaxed clearance
 // certificate. Registering a source cannot make these intersections safe.
 const existing=probePetronellaTransitions(compileChoreography(BUTTER_CANDIDATE,3),[62]);
 t.diagnostic('INHERITED BODY LIMIT; not a safety pass: '+JSON.stringify({newComposition:result,existingButterFrame:existing}));
 assert.ok(Number.isFinite(result.minimum));assert.ok(Math.abs(result.minimum-existing.minimum)<1e-10,'The observed worst closed-frame penetration is unchanged from the existing Butter shared frame.');
});
