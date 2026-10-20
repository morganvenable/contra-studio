import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Vector3} from 'three';
import {importContraDb,type ContraDbInterpretation} from './contradb-import.ts';
import {prepareContraDbReview} from './source-review.ts';
import {readContraDbSource} from './contradb-source.ts';
import {compileChoreography} from './choreography.ts';
import {Avatar,applyBodyContactAnchors} from './scene.ts';
import type {Pose,StudioState,MotionCapabilities} from './types.ts';
const input=readFileSync(new URL('../test-data/contradb/1450.json',import.meta.url),'utf8');
const capabilities:MotionCapabilities={ringBalances:true,californiaTwirls:true};
const interpretation:ContraDbInterpretation={rows:{'contradb:1450:row:0':{balanceBeats:4},'contradb:1450:row:3':{balanceBeats:4},'contradb:1450:row:6':{californiaTwirl:{hands:'right-left',underRole:'robin',direction:'right',amount:.5}}}};
const source=()=>{const r=importContraDb(input,{capabilities,interpretation});assert.deepEqual(r.errors,[]);assert.ok(r.dance);return r.dance;};
const gap=(a:Pose,b:Pose)=>Math.hypot(a.position.x-b.position.x,a.position.z-b.position.z);
const angle=(a:Pose,b:Pose)=>Math.abs(Math.atan2(Math.sin(a.yaw-b.yaw),Math.cos(a.yaw-b.yaw)));
const corners=(poses:Pose[])=>[...poses].sort((a,b)=>{const slot=(p:Pose)=>p.position.z<0?(p.position.x<0?0:1):(p.position.x>0?2:3);return slot(a)-slot(b);}).map(p=>p.id);
test('actual1450 retains its exact64 source beats, credit, ring hands, twirl interpretation and archived choices',()=>{
 const d=source();assert.equal(d.title,'Easy Peasy');assert.equal(d.author,'Diane Silver');assert.equal(d.sourceUrl,'https://contradb.com/dances/1450');assert.equal(d.sourceRows.length,7);assert.equal(d.sourceRecord.original,readContraDbSource(input).record!.original);for(const row of d.sourceRows)assert.ok(JSON.parse(input).html.includes(row.html));
 assert.deepEqual(d.figures.map(f=>[f.kind,f.beats]),[['balance',4],['swing',12],['long-lines',8],['allemande',8],['balance',4],['swing',12],['circle',8],['ring-balance',4],['california-twirl',4]]);
 assert.deepEqual([d.figures[7].who,d.figures[7].hands,d.figures[7].exit],['all','both','partner-california-twirl']);assert.deepEqual([d.figures[8].who,d.figures[8].hands,d.figures[8].underRole,d.figures[8].entry,d.figures[8].progression],['partner','right-left','robin','side-by-side-facing-same',true]);
 for(const gate of['ringBalances','californiaTwirls'])assert.equal(importContraDb(input,{capabilities:{...capabilities,[gate]:false},interpretation}).coverage.executable,false);
 const missing=structuredClone(interpretation);delete missing.rows!['contradb:1450:row:6'].californiaTwirl;assert.equal(importContraDb(input,{capabilities,interpretation:missing}).coverage.executable,false);
 const r=importContraDb(d.sourceText,{capabilities});assert.deepEqual(r.errors,[]);assert.deepEqual(r.dance!.figures,d.figures);assert.deepEqual(r.dance!.contraDbInterpretation,interpretation);assert.equal(r.dance!.sourceText,d.sourceText);const reviewed=prepareContraDbReview(input,[],capabilities);assert.deepEqual(reviewed.interpretation,interpretation);assert.equal(reviewed.result.coverage.executable,true);
});
test('1450 exact independent source corner permutation survives all finite set sizes and complete progression periods',()=>{
 const dance=source(),two=compileChoreography(dance,2,capabilities);assert.deepEqual(corners(two.formationSample!(48).poses),[0,3,2,1]);assert.deepEqual(corners(two.formationSample!(56).poses),[3,2,1,0]);assert.deepEqual(corners(two.formationSample!(64-1e-7).poses),[2,3,0,1]);
 for(let couples=2;couples<=12;couples++){const c=compileChoreography(dance,couples,capabilities);assert.ok(c.repeatable);assert.equal(c.totalBeats,64);for(let repeat=0;repeat<2*couples;repeat++)for(const b of[...c.starts,64]){const t=repeat*64+b;if(!t)continue;const a=c.sample(t-1e-7),z=c.sample(t);assert.equal(z.poses.length,couples*2);for(const p of z.poses){assert.ok(gap(p,a.poses[p.id])<2e-5,`root${couples}/${t}/${p.id}`);assert.ok(angle(p,a.poses[p.id])<2e-5,`yaw${couples}/${t}/${p.id}`);}}
  const a=c.sample(1.25),b=c.sample(2*couples*64+1.25);for(const p of a.poses){assert.ok(gap(p,b.poses[p.id])<1e-8);assert.ok(angle(p,b.poses[p.id])<1e-8);}
 }
});
test('actual1450 ring maintains all four hand identities through count4 and transitions continuously to partner arches',()=>{
 const c=compileChoreography(source(),2,capabilities),expected=[[3,2,'left','right'],[2,1,'left','right'],[1,0,'left','right'],[0,3,'left','right']];
 for(let i=0;i<=120;i++){const f=c.sample(56+i/40);assert.equal(f.contacts.length,4);assert.ok(f.contacts.every(h=>h.strength===1));assert.deepEqual(f.contacts.map(h=>[h.a,h.b,h.handA,h.handB]),expected);for(const p of f.poses){assert.ok(p.balance);assert.equal(p.balance.contactIds!.length,2);}}
 for(const beat of[56,60]){const a=c.sample(beat-1e-7),b=c.sample(beat);for(const h of b.contacts){const other=a.contacts.find(x=>x.a===h.a&&x.b===h.b&&x.handA===h.handA&&x.handB===h.handB||x.a===h.b&&x.b===h.a&&x.handA===h.handB&&x.handB===h.handA);assert.ok(other);assert.ok(Math.hypot(h.point.x-other.point.x,h.point.y-other.point.y,h.point.z-other.point.z)<1e-6);}}
 for(const beat of[60,60.5,61,62,62.5]){const f=c.sample(beat);for(const h of f.contacts){assert.equal(c.dancers[h.a].couple,c.dancers[h.b].couple);assert.equal(h.handA,'right');assert.equal(h.handB,'left');assert.equal(c.dancers[h.a].role,'lark');assert.equal(c.dancers[h.b].role,'robin');assert.equal(h.underId,h.b);}}
});
test('actual1450 complete-round Avatar has exact cadence and fixed bones, with zero new-figure foot reach correction',()=>{
 globalThis.document={createElement:()=>({getContext:()=>new Proxy({},{get:()=>()=>{},set:()=>true})})} as unknown as Document;
 const dance=source(),c=compileChoreography(dance,6,capabilities),avatars=c.dancers.map(d=>new Avatar(d)),residuals:Record<string,number>={};let maxWrist=0,worst='';
 for(let i=0;i<=2560;i++){const beat=i/40,f=c.sample(beat);for(const a of avatars){a.update(f.poses[a.dancer.id],f,{dance,showLabels:false} as StudioState,b=>c.sample(b));const g=a.root.userData.gait,kind=dance.figures[f.figureIndex].kind;assert.equal(g.phase,beat);assert.equal(g.steps,dance.figures[f.figureIndex].beats);assert.equal(g.maxRate,1);residuals[kind]=Math.max(residuals[kind]??0,g.maxClampDistance);if(g.maxClampDistance)worst=`${beat}/${a.dancer.id}/${kind}`;for(const leg of a.legs){assert.ok(Math.abs(leg.upper.scale.y*3-.43)<1e-7);assert.ok(Math.abs(leg.lower.scale.y*3-.43)<1e-7);}}
  const corrected=applyBodyContactAnchors(avatars,f);avatars.forEach(a=>a.root.updateMatrixWorld(true));if(beat>=56)for(const h of corrected.contacts)if(h.strength>=1-1e-10)for(const[id,hand]of[[h.a,h.handA],[h.b,h.handB]] as const){const arm=avatars[id].arms.find(a=>a.side===(hand==='left'?1:-1))!,actual=arm.hand.getWorldPosition(new Vector3());maxWrist=Math.max(maxWrist,actual.distanceTo(new Vector3(h.point.x,h.point.y,h.point.z)));assert.ok(Math.abs(arm.upper.scale.y*3-.325)<1e-7);assert.ok(Math.abs(arm.lower.scale.y*3-.325)<1e-7);}
 }
 avatars.forEach(a=>a.dispose());assert.equal(residuals['ring-balance'],0);assert.equal(residuals['california-twirl'],0);assert.ok(maxWrist<1e-7,`full-strength wrist miss${maxWrist}`);for(const[kind,amount]of Object.entries(residuals)){const budget=kind==='allemande'?.007:0;assert.ok(amount<=budget,`${kind} reach${amount} >${budget}; ${worst}; ${JSON.stringify(residuals)}`);}
});
