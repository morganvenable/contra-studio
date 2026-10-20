import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Vector3} from 'three';
import {prepareContraDbReview} from './source-review.ts';
import {importContraDb} from './contradb-import.ts';
import {readContraDbSource} from './contradb-source.ts';
import {compileChoreography} from './choreography.ts';
import {Avatar,applyBodyContactAnchors} from './scene.ts';
import type {Pose,StudioState} from './types.ts';
const raw=()=>readFileSync(new URL('../test-data/contradb/2040.json',import.meta.url),'utf8');
const source=()=>{const reviewed=prepareContraDbReview(raw());assert.equal(reviewed.result.coverage.executable,true,JSON.stringify(reviewed.result.diagnostics));assert.ok(reviewed.result.dance);return reviewed;};
const gap=(a:Pose,b:Pose)=>Math.hypot(a.position.x-b.position.x,a.position.z-b.position.z);
const angle=(a:Pose,b:Pose)=>Math.abs(Math.atan2(Math.sin(a.yaw-b.yaw),Math.cos(a.yaw-b.yaw)));
const corners=(poses:Pose[])=>[...poses].sort((a,b)=>{const slot=(p:Pose)=>p.position.z<0?(p.position.x<0?0:1):(p.position.x>0?2:3);return slot(a)-slot(b);}).map(p=>p.id);
test('actual2040 retains source words, explicit twirl choices, 64 beats and a single validated progression',()=>{
 const reviewed=source(),d=reviewed.result.dance!;assert.equal(d.title,'Lark in The Afternoon');assert.equal(d.author,'Yoyo Zhou');assert.equal(d.sourceUrl,'https://contradb.com/dances/2040');assert.equal(d.sourceRows.length,7);assert.equal(d.sourceRows[6].text,'partners California twirl to progress');assert.equal(d.sourceRows[6].progression,false);assert.equal(reviewed.interpretation.progression,undefined);assert.equal(reviewed.result.rows[6].progressionFromText,true);assert.equal(d.sourceRecord.original,readContraDbSource(raw()).record!.original);assert.deepEqual(d.figures.map(f=>[f.kind,f.beats]),[['balance',4],['swing',12],['allemande',8],['do-si-do',8],['balance',4],['swing',12],['circle',8],['ring-balance',4],['california-twirl',4]]);assert.equal(d.figures.filter(f=>f.progression).length,1);assert.equal(d.figures.at(-1)!.progression,true);assert.deepEqual(reviewed.interpretation.rows!['contradb:2040:row:6'].californiaTwirl,{hands:'right-left',underRole:'robin',direction:'right',amount:.5});
 const archived=prepareContraDbReview(d.sourceText);assert.equal(archived.savedArchive,true);assert.equal(archived.result.coverage.executable,true);assert.deepEqual(archived.interpretation,reviewed.interpretation);assert.deepEqual(archived.result.dance!.figures,d.figures);assert.equal(archived.result.dance!.sourceText,d.sourceText);
 const cleared=structuredClone(reviewed.interpretation);delete cleared.rows!['contradb:2040:row:6'].californiaTwirl;assert.equal(importContraDb(raw(),{interpretation:cleared}).coverage.executable,false);for(const gate of['ringBalances','californiaTwirls'])assert.equal(importContraDb(raw(),{interpretation:reviewed.interpretation,capabilities:{[gate]:false}}).coverage.executable,false);
});
test('actual2040 exact corner oracle and continuous endpoints survive every 2–12-couple full finite period',()=>{
 const d=source().result.dance!,two=compileChoreography(d,2);assert.deepEqual(corners(two.formationSample!(48).poses),[0,3,2,1]);assert.deepEqual(corners(two.formationSample!(56).poses),[3,2,1,0]);assert.deepEqual(corners(two.formationSample!(64-1e-7).poses),[2,3,0,1]);
 for(let couples=2;couples<=12;couples++){const c=compileChoreography(d,couples);assert.equal(c.repeatable,true);assert.equal(c.totalBeats,64);for(let repeat=0;repeat<2*couples;repeat++)for(const local of[...c.starts,64]){const beat=repeat*64+local;if(!beat)continue;const a=c.sample(beat-1e-7),b=c.sample(beat);assert.equal(b.poses.length,couples*2);for(const p of b.poses){assert.ok(gap(p,a.poses[p.id])<2e-5,`root ${couples}/${beat}/${p.id}`);assert.ok(angle(p,a.poses[p.id])<2e-5,`yaw ${couples}/${beat}/${p.id}`);}}
  const a=c.sample(2.5),b=c.sample(2*couples*64+2.5);for(const p of a.poses){assert.ok(gap(p,b.poses[p.id])<1e-8);assert.ok(angle(p,b.poses[p.id])<1e-8);}
 }
});
test('actual2040 ring and partner twirl retain all named contacts through their exact source joins',()=>{
 const d=source().result.dance!,c=compileChoreography(d,2);for(let i=0;i<=120;i++){const f=c.sample(56+i/40);assert.equal(f.contacts.length,4);assert.ok(f.contacts.every(h=>h.strength===1));assert.deepEqual(f.contacts.map(h=>[h.a,h.b,h.handA,h.handB]),[[3,2,'left','right'],[2,1,'left','right'],[1,0,'left','right'],[0,3,'left','right']]);}
 for(const beat of[56,60]){const a=c.sample(beat-1e-7),b=c.sample(beat);for(const h of b.contacts){const previous=a.contacts.find(x=>x.a===h.a&&x.b===h.b&&x.handA===h.handA&&x.handB===h.handB||x.a===h.b&&x.b===h.a&&x.handA===h.handB&&x.handB===h.handA);assert.ok(previous);assert.ok(Math.hypot(h.point.x-previous.point.x,h.point.y-previous.point.y,h.point.z-previous.point.z)<1e-6);}}
 for(const beat of[60,60.5,61,62,62.5])for(const h of c.sample(beat).contacts){assert.equal(c.dancers[h.a].couple,c.dancers[h.b].couple);assert.equal(h.handA,'right');assert.equal(h.handB,'left');assert.equal(h.underId,h.b);assert.equal(c.dancers[h.a].role,'lark');assert.equal(c.dancers[h.b].role,'robin');}
});
test('actual2040 complete-round Avatar preserves cadence, fixed limbs and zero new-figure reach corrections',()=>{
 globalThis.document={createElement:()=>({getContext:()=>new Proxy({},{get:()=>()=>{},set:()=>true})})} as unknown as Document;
 const dance=source().result.dance!,c=compileChoreography(dance,6),avatars=c.dancers.map(d=>new Avatar(d)),residuals:Record<string,number>={};let maxWrist=0;
 for(let i=0;i<=2560;i++){const beat=i/40,f=c.sample(beat);for(const a of avatars){a.update(f.poses[a.dancer.id],f,{dance,showLabels:false} as StudioState,c.sample);const g=a.root.userData.gait,kind=dance.figures[f.figureIndex].kind;assert.equal(g.phase,beat);assert.equal(g.steps,dance.figures[f.figureIndex].beats);assert.equal(g.maxRate,1);residuals[kind]=Math.max(residuals[kind]??0,g.maxClampDistance);for(const leg of a.legs){assert.ok(Math.abs(leg.upper.scale.y*3-.43)<1e-7);assert.ok(Math.abs(leg.lower.scale.y*3-.43)<1e-7);}}
  const posed=applyBodyContactAnchors(avatars,f);avatars.forEach(a=>a.root.updateMatrixWorld(true));if(beat>=56)for(const h of posed.contacts)if(h.strength>=1-1e-10)for(const[id,hand]of[[h.a,h.handA],[h.b,h.handB]] as const){const arm=avatars[id].arms.find(a=>a.side===(hand==='left'?1:-1))!,actual=arm.hand.getWorldPosition(new Vector3());maxWrist=Math.max(maxWrist,actual.distanceTo(new Vector3(h.point.x,h.point.y,h.point.z)));assert.ok(Math.abs(arm.upper.scale.y*3-.325)<1e-7);assert.ok(Math.abs(arm.lower.scale.y*3-.325)<1e-7);}
 }
 avatars.forEach(a=>a.dispose());assert.equal(residuals['ring-balance'],0);assert.equal(residuals['california-twirl'],0);assert.ok(maxWrist<1e-7);for(const[kind,amount]of Object.entries(residuals))assert.ok(amount<=(kind==='allemande'?.007:0),`${kind} reach correction ${amount}; ${JSON.stringify(residuals)}`);
});
test('actual2040 final source phrase reuses the exact reviewed1450 actor and contact trajectories',()=>{
 const current=compileChoreography(source().result.dance!,2),priorReview=prepareContraDbReview(readFileSync(new URL('../test-data/contradb/1450.json',import.meta.url),'utf8'));assert.ok(priorReview.result.dance);const prior=compileChoreography(priorReview.result.dance,2);
 for(let i=0;i<640;i++){const beat=48+i/40,a=current.sample(beat),b=prior.sample(beat);for(const p of a.poses){assert.ok(gap(p,b.poses[p.id])<1e-8);assert.ok(angle(p,b.poses[p.id])<1e-8);}assert.equal(a.contacts.length,b.contacts.length);for(const h of a.contacts){const other=b.contacts.find(c=>c.a===h.a&&c.b===h.b&&c.handA===h.handA&&c.handB===h.handB);assert.ok(other);assert.equal(h.kind,other.kind);assert.equal(h.underId,other.underId);assert.ok(Math.abs(h.strength-other.strength)<1e-8);assert.ok(Math.hypot(h.point.x-other.point.x,h.point.y-other.point.y,h.point.z-other.point.z)<1e-8);}}
});
