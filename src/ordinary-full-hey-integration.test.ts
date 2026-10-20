import test from 'node:test';import assert from 'node:assert/strict';
import {Vector3} from 'three';
import {readContraDbImport} from './contradb-import.ts';
import {prepareContraDbReview} from './source-review.ts';
import {compileChoreography} from './choreography.ts';
import {compileOrdinaryFullHeyFigure} from './ordinary-full-hey.ts';
import {Avatar,applyBodyContactAnchors} from './scene.ts';
import {reviewedFullHey,FULL_HEY_CAPABILITIES as caps} from '../test-data/ordinary-full-hey/source-fixture.ts';
import type {Pose,StudioState} from './types.ts';
const gap=(a:Pose,b:Pose)=>Math.hypot(a.position.x-b.position.x,a.position.z-b.position.z),angle=(a:number,b:number)=>Math.abs(Math.atan2(Math.sin(a-b),Math.cos(a-b)));
const corners=(p:Pose[])=>[[-1,-1],[1,-1],[1,1],[-1,1]].map(([x,z])=>p.find(p=>Math.sign(p.position.x)===x&&Math.sign(p.position.z)===z)!.id);

test('actual Hey Fever retains six source rows and all64 counts with an explicit reversible full-hey interpretation',()=>{
 const {raw,review,dance}=reviewedFullHey(),r=review.result;assert.equal(dance.title,'Hey Fever');assert.equal(dance.author,'Tony Parkes');assert.equal(r.record!.rows.length,6);assert.deepEqual(dance.figures.map(f=>[f.kind,f.beats]),[['balance',4],['swing',12],['allemande',8],['swing',8],['promenade',8],['robins-chain',8],['hey',16]]);
 const hey=dance.figures.at(-1)!;assert.deepEqual([hey.who,hey.heyStartRole,hey.centerShoulder,hey.endShoulder,hey.amount,hey.entry,hey.exit,hey.progression],['neighbor','robin','right','left',1,'paired-sidelines','progressed-neighbors',true]);assert.equal(r.record!.rows.at(-1)!.text,'ladles start a full hey - rights in center, lefts on ends ⁋');assert.equal(r.record!.rows.at(-1)!.progression,true);
 const normal=prepareContraDbReview(raw);assert.ok(normal.result.dance,'the reviewed default source path is registered');assert.deepEqual(normal.result.dance.figures,dance.figures);const replay=readContraDbImport(dance.sourceText,{capabilities:caps});assert.deepEqual(replay.dance?.figures,dance.figures);assert.equal(replay.record?.original,r.record!.original);assert.deepEqual(replay.interpretation,review.interpretation);
 assert.equal(readContraDbImport(raw,{capabilities:caps}).dance,undefined,'bare source does not invent omitted chain/promende/hey choices');assert.equal(readContraDbImport(dance.sourceText,{capabilities:{...caps,ordinaryFullHeys:false}}).dance,undefined);
 const choices=structuredClone(review.interpretation);delete choices.rows!['contradb:1697:row:5'].ordinaryHey;assert.equal(readContraDbImport(raw,{capabilities:caps,interpretation:choices}).dance,undefined);
});

test('an independent complete source corner oracle proves progression precedes the identity-returning full hey',()=>{
 const {dance}=reviewedFullHey(),c=compileChoreography(dance,2,caps),logical=c.formationSample!;
 for(const[beat,want]of[[0,[1,0,3,2]],[16,[2,3,0,1]],[24,[0,3,2,1]],[32,[0,3,2,1]],[40,[2,1,0,3]],[48,[2,3,0,1]],[63.999999,[2,3,0,1]]]as const)assert.deepEqual(corners(logical(beat).poses),want,`literal source corners at ${beat}`);
 const context={ids:[0,1,2,3],start:structuredClone(logical(48).poses),dancers:structuredClone(c.dancers),relations:{epoch:0,partner:new Map([[0,1],[1,0],[2,3],[3,2]]),neighbor:new Map([[0,3],[3,0],[1,2],[2,1]])},bindingEpoch:0};
 const p=compileOrdinaryFullHeyFigure(dance.figures.at(-1)!,context);assert.deepEqual(p.heyPlan.events.map(e=>e.token.raw),['WR','PL','MR','NL','WR','PL','MR','NL']);
 for(const beat of[50,51.75,53.5,55.25,57,58.75,60.5,62.25])assert.equal(c.sample(beat).contacts.length,0);for(let id=0;id<4;id++){assert.ok(gap({...context.start[id],position:p.position(id,1)},logical(64-1e-8).poses[id])<1e-7);assert.equal(Math.sign(p.position(id,0).x),Math.sign(p.position(id,1).x));}
});

test('all2–12couple full finite periods preserve identities, exact single progression, clear roots, hand occupancy and continuous joins',()=>{
 const {dance}=reviewedFullHey();for(let count=2;count<=12;count++){const c=compileChoreography(dance,count,caps),period=2*count*64,initial=c.sample(0);assert.equal(c.repeatable,true);assert.equal(c.totalBeats,64);
  for(let beat=0;beat<=period;beat+=.5){const f=c.sample(beat),hands=new Set<string>();assert.deepEqual(f.poses.map(p=>p.id),c.dancers.map(d=>d.id));for(let a=0;a<f.poses.length;a++){assert.ok([f.poses[a].position.x,f.poses[a].position.z,f.poses[a].yaw].every(Number.isFinite));for(let b=a+1;b<f.poses.length;b++)assert.ok(gap(f.poses[a],f.poses[b])>.48,`${count}/${beat}/${a}/${b}`);}for(const h of f.contacts)for(const hand of[h.a+':'+h.handA,...(!h.target||h.target==='hands'?[h.b+':'+h.handB]:[])]){assert.ok(!hands.has(hand));hands.add(hand);}}
  for(let r=0;r<=count*2;r++)for(const local of[...c.starts,64]){const beat=r*64+local;if(!beat||beat>period)continue;const a=c.sample(beat-1e-7),b=c.sample(beat);for(const p of b.poses){assert.ok(gap(p,a.poses[p.id])<1e-5,`root join${count}/${beat}/${p.id}`);assert.ok(angle(p.yaw,a.poses[p.id].yaw)<1e-5,`facing join${count}/${beat}/${p.id}`);}}
  const final=c.sample(period);for(const p of initial.poses){assert.ok(gap(p,final.poses[p.id])<1e-7);assert.ok(angle(p.yaw,final.poses[p.id].yaw)<1e-7);}const saved=c.sample(55.5);c.sample(Number.MAX_SAFE_INTEGER);assert.deepEqual(c.sample(55.5),saved);
 }
});

test('actual full-hey source Avatar cadence, fixed limbs and new boundary contacts remain explicit across a complete finite period',t=>{
 globalThis.document={createElement:()=>({getContext:()=>new Proxy({},{get:()=>()=>{},set:()=>true})})} as unknown as Document;
 const {dance}=reviewedFullHey(),c=compileChoreography(dance,3,caps),avatars=c.dancers.map(d=>new Avatar(d)),state={dance,showLabels:false}as StudioState;let maxHeyClamp=0,maxHeldWrist=0;const inherited=new Map<string,number>();
 const update=(beat:number)=>{const f=c.sample(beat);for(const a of avatars){a.update(f.poses[a.dancer.id],f,state,c.sample);const g=a.root.userData.gait;assert.equal(g.phase,beat);assert.equal(g.maxRate,1);assert.equal(g.steps,dance.figures[f.figureIndex].beats);if(f.poses[a.dancer.id].activity==='hey')maxHeyClamp=Math.max(maxHeyClamp,g.maxClampDistance);else if(g.maxClampDistance)inherited.set(f.poses[a.dancer.id].activity,Math.max(inherited.get(f.poses[a.dancer.id].activity)??0,g.maxClampDistance));for(const leg of a.legs){assert.ok(Math.abs(leg.upper.scale.y*3-.43)<1e-7);assert.ok(Math.abs(leg.lower.scale.y*3-.43)<1e-7);}for(const arm of a.arms){assert.ok(Math.abs(arm.upper.scale.y*3-.325)<1e-7);assert.ok(Math.abs(arm.lower.scale.y*3-.325)<1e-7);}}
  const posed=applyBodyContactAnchors(avatars,f);avatars.forEach(a=>a.root.updateMatrixWorld(true));for(const h of posed.contacts)if(h.strength>=1-1e-10)for(const[id,hand]of[[h.a,h.handA],...(!h.target||h.target==='hands'?[[h.b,h.handB]]:[])]as Array<[number,'left'|'right']>){const error=avatars[id].arms.find(a=>a.side===(hand==='left'?1:-1))!.hand.getWorldPosition(new Vector3()).distanceTo(new Vector3(h.point.x,h.point.y,h.point.z));maxHeldWrist=Math.max(maxHeldWrist,error);}
  return avatars.flatMap(a=>[...a.arms.flatMap(p=>[p.hand,p.elbow]),...a.legs.flatMap(p=>[p.foot,p.knee])].map(p=>p.getWorldPosition(new Vector3())));
 };
 for(let i=0;i<=384*12;i++)update(i/12);for(let r=0;r<6;r++){for(let i=48*80;i<64*80;i++)update(r*64+i/80);for(const local of[48,64]){const beat=r*64+local,a=update(beat-1e-6),b=update(beat+1e-6);for(let i=0;i<a.length;i++)assert.ok(a[i].distanceTo(b[i])<.0002,`articulated join${beat}/${i}: ${a[i].distanceTo(b[i])}`);}}
 for(let r=0;r<6;r++)for(let local=49;local<64;local++){const beat=r*64+local,at=c.sample(beat),before=c.sample(beat-.5);for(const a of avatars){if(at.poses[a.dancer.id].activity!=='hey')continue;const leg=a.legs.find(l=>l.side===(beat%2?1:-1))!;a.update(before.poses[a.dancer.id],before,state,c.sample);assert.ok(leg.foot.position.y>.055+1e-5,`alternating foot rises at ${beat-.5}/${a.dancer.id}`);a.update(at.poses[a.dancer.id],at,state,c.sample);assert.ok(Math.abs(leg.foot.position.y-.055)<1e-9,`one footfall at ${beat}/${a.dancer.id}`);}}
 avatars.forEach(a=>a.dispose());t.diagnostic(JSON.stringify({maxHeyClamp,maxHeldWrist,inherited:Object.fromEntries(inherited)}));assert.equal(maxHeyClamp,0);assert.ok(maxHeldWrist<.0042);assert.equal(inherited.size,0,'the complete source has no sampled leg reach correction');
});
