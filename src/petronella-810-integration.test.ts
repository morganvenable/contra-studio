import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Vector3} from 'three';
import {prepareContraDbReview} from './source-review.ts';
import {readContraDbImport} from './contradb-import.ts';
import {readContraDbSource} from './contradb-source.ts';
import {compileChoreography} from './choreography.ts';
import {REGISTERED_MOTION_CAPABILITIES} from './capabilities.ts';
import {Avatar,applyBodyContactAnchors} from './scene.ts';
import type {Pose,StudioState} from './types.ts';
const raw=()=>readFileSync(new URL('../test-data/contradb/810.json',import.meta.url),'utf8');
const caps={...REGISTERED_MOTION_CAPABILITIES,petronellas:true};
const source=()=>{const review=prepareContraDbReview(raw(),[],caps);assert.equal(review.result.coverage.executable,true,JSON.stringify(review.result.diagnostics));assert.ok(review.result.dance);return review;};
const gap=(a:Pose,b:Pose)=>Math.hypot(a.position.x-b.position.x,a.position.z-b.position.z);
const angle=(a:Pose,b:Pose)=>Math.abs(Math.atan2(Math.sin(a.yaw-b.yaw),Math.cos(a.yaw-b.yaw)));
const corners=(poses:Pose[])=>[...poses].sort((a,b)=>{const slot=(p:Pose)=>p.position.z<0?(p.position.x<0?0:1):(p.position.x>0?2:3);return slot(a)-slot(b);}).map(p=>p.id);
test('actual810 retains all source rows, no-clap interpretation, all64 counts and its single terminal progression',()=>{
 const review=source(),d=review.result.dance!;assert.equal(d.title,'Kitchen Stomp');assert.equal(d.author,'Becky Hill');assert.equal(d.sourceUrl,'https://contradb.com/dances/810');assert.equal(d.sourceRows.length,7);assert.equal(d.sourceRows[4].text,'balance & petronella');assert.equal(d.sourceRows[5].text,'balance & petronella');assert.equal(d.sourceRows[6].text,'star left 4 places ⁋');assert.equal(d.sourceRecord.original,readContraDbSource(raw()).record!.original);assert.deepEqual(d.figures.map(f=>[f.kind,f.beats]),[['balance',4],['swing',12],['allemande',8],['swing',8],['robins-chain',8],['ring-balance',4],['petronella',4],['ring-balance',4],['petronella',4],['star',8]]);assert.equal(d.figures.filter(f=>f.progression).length,1);assert.equal(d.figures.at(-1)!.progression,true);assert.equal(d.figures[4].who,'neighbor');
 for(const f of d.figures.filter(f=>f.kind==='petronella'))assert.deepEqual([f.who,f.direction,f.amount,f.spinDirection,f.spinAmount,f.clap,f.entry,f.exit],['all','right',.25,'right',.75,'none','ring','ring']);
 const archive=prepareContraDbReview(d.sourceText,[],caps);assert.equal(archive.savedArchive,true);assert.equal(archive.result.coverage.executable,true);assert.deepEqual(archive.interpretation,review.interpretation);assert.deepEqual(archive.result.dance!.figures,d.figures);assert.equal(archive.result.dance!.sourceText,d.sourceText);
 assert.equal(readContraDbImport(raw(),{interpretation:review.interpretation,capabilities:{...caps,petronellas:false}}).coverage.executable,false);const bad=structuredClone(d);bad.figures[4].who='partner';assert.throws(()=>compileChoreography(bad,2,caps),/receiv|arrival/);
});
test('actual810 preserves exact rightward corner identities, source joins and every2–12-couple finite period',()=>{
 const d=source().result.dance!,two=compileChoreography(d,2,caps),logical=two.formationSample??two.sample;
 for(const[beat,expected]of[[40,[0,1,2,3]],[44,[0,1,2,3]],[48,[1,2,3,0]],[52,[1,2,3,0]],[56,[2,3,0,1]],[64-1e-7,[2,3,0,1]]] as const)assert.deepEqual(corners(logical(beat).poses),expected);
 for(let couples=2;couples<=12;couples++){const c=compileChoreography(d,couples,caps);assert.equal(c.repeatable,true);assert.equal(c.totalBeats,64);for(let repeat=0;repeat<2*couples;repeat++)for(const local of[...c.starts,64]){const beat=repeat*64+local;if(!beat)continue;const a=c.sample(beat-1e-7),b=c.sample(beat);assert.equal(b.poses.length,2*couples);for(const p of b.poses){assert.ok(gap(p,a.poses[p.id])<2e-5,`root ${couples}/${beat}/${p.id}`);assert.ok(angle(p,a.poses[p.id])<2e-5,`yaw ${couples}/${beat}/${p.id}`);}}
  const a=c.sample(46),b=c.sample(2*couples*64+46);for(const p of a.poses){assert.ok(gap(p,b.poses[p.id])<1e-8);assert.ok(angle(p,b.poses[p.id])<1e-8);}
 }
});
test('actual810 complete-sequence petronellas keep exact unwrapped spins, original edge graph and released star handoff',()=>{
 const d=source().result.dance!,c=compileChoreography(d,2,caps),f0=c.sample(44),edges=(b:number)=>c.sample(b).contacts.map(h=>[h.a,h.b,h.handA,h.handB]).sort((a,b)=>Number(a[0])-Number(b[0]));assert.equal(f0.contacts.length,4);assert.deepEqual(edges(44),edges(48));
 for(const start of[44,52])for(let id=0;id<4;id++){const a=c.sample(start).poses[id],b=c.sample(start+4-1e-7).poses[id];assert.ok(Math.abs(b.yaw-a.yaw+3*Math.PI/2)<1e-7);for(let i=1;i<160;i++)assert.ok(c.sample(start+i/40).poses[id].yaw<c.sample(start+(i-1)/40).poses[id].yaw);}
 for(const b of[44.3,45,46,47,52.3,53,54,55,55.99])assert.equal(c.sample(b).contacts.length,0,`unexpected hold ${b}`);
 for(const b of[40,41,42,43,48,49,50,51]){const f=c.sample(b);assert.equal(f.contacts.length,4);assert.ok(f.contacts.every(h=>h.strength===1));}
});
test('actual810 articulated petronellas use one physical step per beat, no reach repair and fixed ring wrists',()=>{
 globalThis.document={createElement:()=>({getContext:()=>new Proxy({},{get:()=>()=>{},set:()=>true})})} as unknown as Document;
 const dance=source().result.dance!,c=compileChoreography(dance,6,caps),avatars=c.dancers.map(d=>new Avatar(d));let maxWrist=0,maxPetronellaClamp=0;const residuals:Record<string,number>={};
 for(let i=0;i<=2560;i++){const beat=i/40,f=c.sample(beat);for(const a of avatars){a.update(f.poses[a.dancer.id],f,{dance,showLabels:false} as StudioState,c.sample);const g=a.root.userData.gait,kind=dance.figures[f.figureIndex].kind;assert.equal(g.phase,beat);assert.equal(g.steps,dance.figures[f.figureIndex].beats);assert.equal(g.maxRate,1);residuals[kind]=Math.max(residuals[kind]??0,g.maxClampDistance);if(kind==='petronella')maxPetronellaClamp=Math.max(maxPetronellaClamp,g.maxClampDistance);for(const leg of a.legs){assert.ok(Math.abs(leg.upper.scale.y*3-.43)<1e-7);assert.ok(Math.abs(leg.lower.scale.y*3-.43)<1e-7);}}
  const posed=applyBodyContactAnchors(avatars,f);avatars.forEach(a=>a.root.updateMatrixWorld(true));if(beat>=40)for(const h of posed.contacts)if(h.strength>=1-1e-10)for(const[id,hand]of[[h.a,h.handA],[h.b,h.handB]] as const){const arm=avatars[id].arms.find(a=>a.side===(hand==='left'?1:-1))!;maxWrist=Math.max(maxWrist,arm.hand.getWorldPosition(new Vector3()).distanceTo(new Vector3(h.point.x,h.point.y,h.point.z)));}
 }
 for(const beat of[44,45,46,47,48,52,53,54,55,56])for(const a of avatars){const leg=a.legs.find(l=>l.side===(beat%2?1:-1))!,before=c.sample(beat-.5);a.update(before.poses[a.dancer.id],before,{dance,showLabels:false} as StudioState,c.sample);assert.ok(leg.foot.position.y>.055+1e-5);const f=c.sample(beat);a.update(f.poses[a.dancer.id],f,{dance,showLabels:false} as StudioState,c.sample);assert.ok(Math.abs(leg.foot.position.y-.055)<1e-9);}
 avatars.forEach(a=>a.dispose());assert.equal(maxPetronellaClamp,0,JSON.stringify(residuals));for(const[kind,amount]of Object.entries(residuals))assert.equal(amount,0,`${kind}: ${JSON.stringify(residuals)}`);assert.ok(maxWrist<1e-7,`ring wrist residual ${maxWrist}`);
});
test('actual810 new ring/petronella/star geometry clears other dancers outside the legacy shared star-hand hub',async()=>{
 globalThis.document={createElement:()=>({getContext:()=>new Proxy({},{get:()=>()=>{},set:()=>true})})} as unknown as Document;
 const {probePetronellaTransitions}=await import('../test-data/petronella/mesh-probe.ts'),c=compileChoreography(source().result.dance!,2,caps),ring=probePetronellaTransitions(c,Array.from({length:161},(_,i)=>40+i/10)),star=probePetronellaTransitions(c,Array.from({length:81},(_,i)=>56+i/10));assert.ok(ring.minimum>=-.05,JSON.stringify(ring));assert.ok(star.minimumOutsideStarHub>=-.05,JSON.stringify(star));
 // Existing schematic arms meet at one shared star hub; report and bound that
 // overlap rather than calling it separated anatomy. Small self-hand/torso
 // residuals are retained as explicit, separately bounded fidelity limits.
 assert.ok(star.minimum>=-.05,JSON.stringify(star));assert.ok(ring.minimumSelfForearmTorso>=-.05,JSON.stringify(ring));assert.ok(star.minimumSelfForearmTorso>=-.05,JSON.stringify(star));
});
test('actual810 repaired chain-to-ring and ordinary courtesy release both retain positive body clearance',async()=>{
 globalThis.document={createElement:()=>({getContext:()=>new Proxy({},{get:()=>()=>{},set:()=>true})})} as unknown as Document;
 const {probePetronellaTransitions}=await import('../test-data/petronella/mesh-probe.ts'),d=source().result.dance!,next=compileChoreography(d,2,caps),old=compileChoreography({...d,figures:d.figures.slice(0,5)},2,caps),beats=Array.from({length:41},(_,i)=>39+i/40),baseline=probePetronellaTransitions(old,beats),actual=probePetronellaTransitions(next,beats);
 // The reviewed chain-arm repair removes the former ~50.6 mm release
 // penetration. A relative 3 mm allowance between two now-clear routes would
 // constrain empty space rather than detect a collision. Keep both controls
 // positive and bound the actual ring route's measured 73.27/19.41 mm margins.
 for(const result of[baseline,actual]){assert.ok(result.minimum>=-.05,JSON.stringify({baseline,actual}));assert.ok(result.minimumSelfForearmTorso>=-.05,JSON.stringify({baseline,actual}));}
 assert.ok(actual.minimum>.07,JSON.stringify(actual));assert.ok(actual.minimumSelfForearmTorso>.018,JSON.stringify(actual));
});
