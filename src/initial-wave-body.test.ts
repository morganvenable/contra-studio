/** CPU production Avatar checks; no browser/GPU rendering claim. */
import test from 'node:test';import assert from 'node:assert/strict';import {Vector3} from 'three';
import {syntheticWaveBalanceCandidate} from '../test-data/initial-wave/programs.ts';
import {compilePrimitiveFigure,figureContinuity} from './engine.ts';
import {withBalanceStance} from './stance.ts';
import {compileInitialWaveSequence} from './initial-wave-source-sequence.ts';
import {Avatar,applyBodyContactAnchors} from './scene.ts';import type {StudioState} from './types.ts';
const dom=()=>{globalThis.document={createElement:()=>({getContext:()=>new Proxy({},{get:()=>()=>{},set:()=>true})})}as unknown as Document;};
for(const couples of[3,4])test(`synthetic initial-wave ${couples}-couple path retains actual rig cadence, fixed limbs and held wrists`,t=>{
 dom();const c=compileInitialWaveSequence(syntheticWaveBalanceCandidate(),couples),avatars=c.dancers.map(d=>new Avatar(d)),state={dance:c.dance,showLabels:false}as StudioState;assert.equal(withBalanceStance(c),c);let wrist=0,newPathWrist=0,maxClamp=0,worst='',wristAt='';const byActivity:Record<string,{wrist:number;clamp:number}>={};
 const update=(beat:number)=>{const f=c.sample(beat);assert.equal(new Set(f.poses.map(p=>p.id)).size,couples*2);assert.equal(f.bindingEpoch,Math.floor(beat/64));
  for(const a of avatars){const p=f.poses[a.dancer.id];a.update(p,f,state,c.sample);const g=a.root.userData.gait;byActivity[p.activity]??={wrist:0,clamp:0};byActivity[p.activity].clamp=Math.max(byActivity[p.activity].clamp,g.maxClampDistance);assert.equal(g.phase,beat);assert.equal(g.steps,c.dance.figures[f.figureIndex].beats);assert.equal(g.maxRate,1);if(g.maxClampDistance>maxClamp){maxClamp=g.maxClampDistance;worst=`${beat}/${p.id}/${p.activity}`;}for(const leg of a.legs){assert.ok(Math.abs(leg.upper.scale.y*3-.43)<1e-7);assert.ok(Math.abs(leg.lower.scale.y*3-.43)<1e-7);}for(const arm of a.arms){assert.ok(Math.abs(arm.upper.scale.y*3-.325)<1e-7);assert.ok(Math.abs(arm.lower.scale.y*3-.325)<1e-7);}}
  const posed=applyBodyContactAnchors(avatars,f);avatars.forEach(a=>a.root.updateMatrixWorld(true));for(const h of posed.contacts)if(h.strength>=1-1e-10)for(const[id,hand]of[[h.a,h.handA],...(!h.target||h.target==='hands'?[[h.b,h.handB]]:[])]as[number,'left'|'right'][]){const arm=avatars[id].arms.find(a=>a.side===(hand==='left'?1:-1))!,point=arm.hand.getWorldPosition(new Vector3());assert.ok(point.toArray().every(Number.isFinite));const error=point.distanceTo(new Vector3(h.point.x,h.point.y,h.point.z));if(f.localBeat<40)newPathWrist=Math.max(newPathWrist,error);if(error>wrist){wrist=error;wristAt=[beat,id,f.poses[id].activity,h.kind,h.target].join('/');}byActivity[f.poses[id].activity].wrist=Math.max(byActivity[f.poses[id].activity].wrist,error);}
 };
 try{
  // Two complete repeats cover both active/waiting parity arrangements. Later
  // period checkpoints exercise finite-end return and renewed complete waves.
  for(let tick=0;tick<=128*8;tick++)update(tick/8);
  for(let r=0;r<c.periodRepeats;r++)for(const local of[0,4,7.925,8,12,15.925,16,20,20.075,21.75,29.84,32,33.5,37.5,38,39.5,40,48,56,63.875,64])update(r*64+local);
    // Isolate the inherited partner-swing target from the new full-wave path.
  const at=c.sample(40),probe=c.sample(46.25),neighbors=c.topology(40).neighbors,groups=neighbors.filter(([a,b])=>a<b),seen=new Set<number>();
  for(const [a]of groups){if(seen.has(a))continue;const actor=c.dancers[a],partner=c.dancers.find(d=>d.couple===actor.couple&&d.id!==a)!,neighbor=c.topology(40).neighbors.find(p=>p.includes(a))!.find(id=>id!==a)!,other=c.dancers.find(d=>d.couple===c.dancers[neighbor].couple&&d.id!==neighbor)!,ids=[a,partner.id,neighbor,other.id];ids.forEach(id=>seen.add(id));const kernel=compilePrimitiveFigure(c.dance.figures[5],ids,at.poses,c.dancers,[],{...figureContinuity(c.dance.figures,5),canonicalSwingLayout:true,geometry:{halfWidth:.64,rowGap:1.28}});for(const id of ids){assert.ok(Math.hypot(kernel.position(id,6.25/8).x-probe.poses[id].position.x,kernel.position(id,6.25/8).z-probe.poses[id].position.z)<1e-7);}for(const h of kernel.contacts(6.25/8,probe.poses)){const actual=probe.contacts.find(q=>q.a===h.a&&q.b===h.b&&q.handA===h.handA&&q.handB===h.handB&&q.target===h.target);assert.deepEqual(actual,h);}}
  t.diagnostic(JSON.stringify({newPathWrist,inheritedPartnerSwingWrist:wrist,maxClamp,worst,wristAt,byActivity}));assert.ok(newPathWrist<1e-7,`new wave/swing/circle wrist error ${newPathWrist}`);assert.equal(maxClamp,0,`leg reach correction ${worst}`);
 }finally{avatars.forEach(a=>a.dispose());}
});




// Public retained ContraDB interpretation is paired balance, distinct from the
// synthetic author-wave-balance timing above. Exercise its additional seam.
import {readFileSync} from 'node:fs';
import {prepareContraDbReview} from './source-review.ts';
import {REGISTERED_MOTION_CAPABILITIES} from './capabilities.ts';
import {compileChoreography} from './choreography.ts';
test('public imported187 paired balance keeps cadence, fixed limbs and actual held wrists',t=>{
 dom();const reviewed=prepareContraDbReview(readFileSync(new URL('../test-data/contradb/187.json',import.meta.url),'utf8'),[],REGISTERED_MOTION_CAPABILITIES);assert.ok(reviewed.result.dance,reviewed.result.errors.join('; '));const c=compileChoreography(reviewed.result.dance,3),avatars=c.dancers.map(d=>new Avatar(d)),state={dance:c.dance,showLabels:false}as StudioState;let wrist=0,clamp=0,worst='';
 try{for(let tick=12*32;tick<=24*32;tick++){const beat=tick/32,f=c.sample(beat);for(const a of avatars){a.update(f.poses[a.dancer.id],f,state,c.sample);const g=a.root.userData.gait;assert.equal(g.phase,beat);assert.equal(g.steps,c.dance.figures[f.figureIndex].beats);clamp=Math.max(clamp,g.maxClampDistance);for(const leg of a.legs)assert.ok(Math.abs(leg.upper.scale.y*3-.43)<1e-7&&Math.abs(leg.lower.scale.y*3-.43)<1e-7);for(const arm of a.arms)assert.ok(Math.abs(arm.upper.scale.y*3-.325)<1e-7&&Math.abs(arm.lower.scale.y*3-.325)<1e-7);}const posed=applyBodyContactAnchors(avatars,f);avatars.forEach(a=>a.root.updateMatrixWorld(true));for(const h of posed.contacts)if(h.strength>=1-1e-10)for(const[id,hand]of[[h.a,h.handA],...(!h.target||h.target==='hands'?[[h.b,h.handB]]:[])]as[number,'left'|'right'][]){const arm=avatars[id].arms.find(a=>a.side===(hand==='left'?1:-1))!,error=arm.hand.getWorldPosition(new Vector3()).distanceTo(new Vector3(h.point.x,h.point.y,h.point.z));if(error>wrist){wrist=error;worst=[beat,id,f.poses[id].activity,h.target].join('/');}}}t.diagnostic(JSON.stringify({wrist,clamp,worst}));assert.ok(wrist<1e-7);assert.equal(clamp,0);}finally{avatars.forEach(a=>a.dispose());}
});
