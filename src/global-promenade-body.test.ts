/** Public staged compiler and production Avatar; whole-dance registration is separately gated. */
import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {Vector3} from 'three';
import {compileStagedOval as compileOvalImproper} from '../test-data/global-promenade/compiled-fixture.ts';import {reviewedOvalSource} from '../test-data/global-promenade/fixture.ts';
import {Avatar,applyBodyContactAnchors} from './scene.ts';import {Avatar as ProductionAvatar,applyBodyContactAnchors as productionAnchors} from '../test-data/global-promenade/scene-before-oval.ts';
import {copyAvatarCosmetics} from '../qa/copy-avatar-cosmetics.mjs';
import {compileChoreography} from './choreography.ts';import {prepareContraDbReview} from './source-review.ts';import {probePetronellaTransitions} from '../test-data/global-promenade/mesh-probe-candidate.ts';import type {StudioState} from './types.ts';
const dom=()=>{globalThis.document={createElement:()=>({getContext:()=>new Proxy({},{get:()=>()=>{},set:()=>true})})}as unknown as Document;};
const joints=(a:Avatar|ProductionAvatar)=>[...a.arms.flatMap(p=>[p.hand,p.elbow]),...a.legs.flatMap(p=>[p.foot,p.knee])].map(p=>p.getWorldPosition(new Vector3()));
test('typed oval cue preserves ordinary registered skaters promenade articulated output exactly',()=>{
 dom();const d=prepareContraDbReview(readFileSync(new URL('../test-data/contradb/1616.json',import.meta.url),'utf8')).result.dance!;assert.ok(d);const c=compileChoreography(d,3),actual=c.dancers.map(d=>new Avatar(d)),old=c.dancers.map(d=>new ProductionAvatar(d)),state={dance:d,showLabels:false}as StudioState;
 for(let i=0;i<=64*4;i++){const f=c.sample(i/4);for(const a of[...actual,...old])a.update(f.poses[a.dancer.id],f,state,c.sample);applyBodyContactAnchors(actual,f);productionAnchors(old,f);for(let id=0;id<actual.length;id++){actual[id].root.updateMatrixWorld(true);old[id].root.updateMatrixWorld(true);assert.deepEqual(actual[id].root.userData.gait,old[id].root.userData.gait);const before=joints(old[id]);joints(actual[id]).forEach((p,i)=>assert.deepEqual(p.toArray(),before[i].toArray()));}}
 [...actual,...old].forEach(a=>a.dispose());
});
test('both parity classes and the minimum set retain actual Avatar cadence, fixed limbs, exact wrists and complete-period body joins',t=>{
 dom();for(const n of[2,3]){const c=compileOvalImproper(reviewedOvalSource(),n),avatars=c.dancers.map(d=>new Avatar(d)),state={dance:c.dance,showLabels:false}as StudioState;let wrist=0,join=0;
 const update=(beat:number)=>{const f=c.sample(beat);for(const a of avatars){a.update(f.poses[a.dancer.id],f,state,c.sample);const g=a.root.userData.gait;assert.equal(g.phase,beat);assert.equal(g.maxRate,1);assert.equal(g.steps,c.dance.figures[f.figureIndex].beats);assert.equal(g.maxClampDistance,0,`reach ${n}/${beat}/${a.dancer.id}`);for(const leg of a.legs){assert.ok(Math.abs(leg.upper.scale.y*3-.43)<1e-7);assert.ok(Math.abs(leg.lower.scale.y*3-.43)<1e-7);}for(const arm of a.arms){assert.ok(Math.abs(arm.upper.scale.y*3-.325)<1e-7);assert.ok(Math.abs(arm.lower.scale.y*3-.325)<1e-7);}}
 const posed=applyBodyContactAnchors(avatars,f);avatars.forEach(a=>a.root.updateMatrixWorld(true));for(const h of posed.contacts)if(h.strength>=1-1e-10)for(const[id,hand]of[[h.a,h.handA],...(!h.target||h.target==='hands'?[[h.b,h.handB]]:[])]as const){const arm=avatars[id as number].arms.find(a=>a.side===(hand==='left'?1:-1))!;wrist=Math.max(wrist,arm.hand.getWorldPosition(new Vector3()).distanceTo(new Vector3(h.point.x,h.point.y,h.point.z)));}return avatars.flatMap(joints);};
 for(let i=0;i<=c.period*64*12;i++)update(i/12);
 for(let repeat=0;repeat<c.period;repeat++)for(const local of[0,8,15.44,16,22,26,31,32,38,39.65,40,48,56,64]){const beat=repeat*64+local;if(!beat)continue;const a=update(beat-1e-6),b=update(beat+1e-6);join=Math.max(join,...a.map((p,i)=>p.distanceTo(b[i])));}
 for(let beat=1;beat<=c.period*64;beat++){const f=c.sample(beat),half=c.sample(beat-.5);for(const a of avatars){if(f.poses[a.dancer.id].activity==='waiting'&&f.poses[a.dancer.id].stride===0)continue;const leg=a.legs.find(l=>l.side===(beat%2?1:-1))!;a.update(half.poses[a.dancer.id],half,state,c.sample);assert.ok(leg.foot.position.y>.055+1e-5);a.update(f.poses[a.dancer.id],f,state,c.sample);assert.ok(Math.abs(leg.foot.position.y-.055)<1e-9);}}
 assert.ok(wrist<1e-7);assert.ok(join<.0003,`joint delta ${join}`);t.diagnostic(`${n} couples: wrist ${wrist}, boundary joint delta ${join}, zero reach clamps`);avatars.forEach(a=>a.dispose());}
});
test('new global oval and both same-end waiting transfers clear other dancers in the production articulated meshes',t=>{
 dom();const runs=[{n:2,r:1,lo:8,hi:40,waiting:true},{n:3,r:0,lo:8,hi:40,waiting:true},{n:3,r:1,lo:8,hi:40,waiting:true},{n:3,r:0,lo:15.44,hi:32,waiting:false},{n:3,r:1,lo:15.44,hi:32,waiting:false}];
 for(const run of runs){const c=compileOvalImproper(reviewedOvalSource(),run.n),beats=Array.from({length:Math.ceil((run.hi-run.lo)*12)+1},(_,i)=>run.r*64+run.lo+Math.min(run.hi-run.lo,i/12)),focus=run.waiting?new Set(c.topology(run.r*64+1).waitingIds):undefined,r=probePetronellaTransitions(c,beats,focus);assert.ok(r.minimum>=-.05,JSON.stringify({run,r}));assert.ok(r.minimumSelfForearmTorso>=-.05,JSON.stringify({run,r}));t.diagnostic(JSON.stringify({run,r}));}
});
test('source-owned two-count partner preparation reuses the approved central arm route within unchanged inherited-frame envelopes',async t=>{
 dom();const {probeOvalIngress}=await import('../test-data/global-promenade/ingress-probe-candidate.ts');for(const n of[2,6]){const out=probeOvalIngress(compileOvalImproper(reviewedOvalSource(),n));t.diagnostic(JSON.stringify({n,out}));
 for(const key of['minRoot','minLegMesh','minNoncontactArmMesh','minUnassociatedTorso','minArmHead','minExactArmHead','minSelfArmHead'])assert.ok(out[key].value>=-.05,`${n}/${key}: ${JSON.stringify(out[key])}`);
 assert.equal(out.maxClamp.value,0);assert.ok(out.maxWrist.value<1e-7);assert.ok(out.minFreeSelfTorso.value>=-.05);
 assert.ok(out.minSelfForearmTorso.value>=out.minBoundarySelfTorso.value-.05);assert.ok(out.minArmTorso.value>=out.minBoundaryTorso.value-.05);
 assert.ok(out.minPreparedSupportArmMesh.value>-.055);assert.ok(out.minBoundarySupportArmMesh.value>=-.05);assert.ok(out.minPreparedSupportArmMesh.value>=out.minBoundarySupportArmMesh.value-.0215);assert.ok(out.minBoundaryTorso.value>-.125);
 }
});
test('the entire two-and-a-half-count neighbor-swing tangent exit stays within the already reviewed compact-swing release envelope',async t=>{dom();const{probeOvalRelease}=await import('../test-data/global-promenade/release-probe-candidate.ts'),out=probeOvalRelease(compileOvalImproper(reviewedOvalSource(),6));assert.ok(out.minimum>=-.05,JSON.stringify(out));t.diagnostic(JSON.stringify(out));});


// The frozen oval scene predates the independently reviewed conventional-chain
// arm repair. Preserve all other mesh/gait parity, including chain roots/legs;
// chain-routing and chain-courtesy-mesh tests own the revised arm geometry.
test('oval scene stays byte-identical outside separately reviewed chain arms over both finite end parities',async()=>{
 dom();const {Avatar:CandidateAvatar,applyBodyContactAnchors:candidateAnchors}=await import('./oval-scene-candidate.ts');
 for(const n of[2,3,6]){const c=compileOvalImproper(reviewedOvalSource(),n),actual=c.dancers.map(d=>new Avatar(d)),candidate=c.dancers.map(d=>new CandidateAvatar(d)),state={dance:c.dance,showLabels:false}as StudioState;
 // Normalize only the independently randomized cosmetics on the frozen rigs.
 // Exact articulated matrices and gait assertions remain unchanged below.
 candidate.forEach((avatar,id)=>copyAvatarCosmetics(avatar,actual[id]));
 for(let step=0;step<=Math.min(c.period,6)*64*4;step++){const f=c.sample(step/4);for(const a of[...actual,...candidate])a.update(f.poses[a.dancer.id],f,state,c.sample);applyBodyContactAnchors(actual,f);candidateAnchors(candidate,f);for(let id=0;id<actual.length;id++){const matrices=(a:Avatar|InstanceType<typeof CandidateAvatar>)=>{a.root.updateMatrixWorld(true);const out:number[][]=[],chain=['robins-chain','ladies-chain','right-left-through'].includes(c.dance.figures[f.figureIndex].kind),reviewedChainArms=new Set(chain?a.arms.flatMap(arm=>[arm.upper,arm.lower,arm.elbow,arm.hand]):[]);a.root.traverse(o=>{if(o.type==='Mesh'&&!reviewedChainArms.has(o as any))out.push(o.matrixWorld.toArray());});return out;};assert.deepEqual(matrices(actual[id]),matrices(candidate[id]),`${n}/${step/4}/${id}`);assert.deepEqual(actual[id].root.userData.gait,candidate[id].root.userData.gait);}}
 [...actual,...candidate].forEach(a=>a.dispose());}
});
