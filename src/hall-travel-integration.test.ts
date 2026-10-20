import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Vector3} from 'three';
import {importContraDb,type ContraDbInterpretation} from './contradb-import.ts';
import {compileChoreography} from './choreography.ts';
import {Avatar,applyBodyContactAnchors} from './scene.ts';
import type {MotionCapabilities,StudioState} from './types.ts';

const snapshot=readFileSync(new URL('../test-data/contradb/138.json',import.meta.url),'utf8');
const capabilities:MotionCapabilities={hallTravel:true};
const interpretation:ContraDbInterpretation={rows:{'contradb:138:row:0':{balanceBeats:4},'contradb:138:row:1':{hallPhaseBeats:[4,4,4,4]},'contradb:138:row:5':{chainReceiver:'neighbor'}}};
const distance=(a:{x:number;z:number},b:{x:number;z:number})=>Math.hypot(a.x-b.x,a.z-b.z);
const angle=(a:number,b:number)=>Math.abs(Math.atan2(Math.sin(a-b),Math.cos(a-b)));
function imported(){const result=importContraDb(snapshot,{interpretation,capabilities});assert.ok(result.dance,JSON.stringify(result.diagnostics));assert.equal(result.coverage.executable,true);return result;}

test('actual Nice Combination source retains both hall clauses, exact sixteen beats and explicit prior swing facing',()=>{
 const result=imported(),dance=result.dance!,hall=dance.figures.find(f=>f.kind==='hall-travel')!,i=dance.figures.indexOf(hall);assert.equal(dance.title,'The Nice Combination');assert.equal(dance.author,'Gene Hubert');assert.equal(dance.figures.reduce((s,f)=>s+f.beats,0),64);assert.equal(hall.beats,16);assert.equal(hall.hallTurn,'couples');assert.equal(hall.hallPairRelation,'neighbor');assert.deepEqual(hall.hallPhaseBeats,[4,4,4,4]);assert.equal(hall.entry,'paired-sidelines-facing-down');assert.equal(dance.figures[i-1].kind,'swing');assert.equal(dance.figures[i-1].exit,'face-down-line');assert.equal(dance.figures[i+1].kind,'circle');assert.equal(dance.sourceRows[1].beats,8);assert.equal(dance.sourceRows[2].beats,8);assert.match(dance.sourceRows[1].text,/turn as a couple/);assert.match(dance.sourceRows[2].text,/bend into a ring/);assert.equal(result.rows.length,7);assert.ok(result.rows.every(r=>r.resolved));assert.equal(JSON.parse(dance.sourceText).sourceSnapshotId,result.record!.snapshotId);
 const reread=importContraDb(dance.sourceText,{capabilities});assert.ok(reread.dance);assert.equal(reread.record!.original,result.record!.original);assert.deepEqual(reread.dance!.figures,dance.figures);
 assert.equal(importContraDb(snapshot,{interpretation,capabilities:{hallTravel:false}}).dance,undefined);
});
test('Frederick requires its declared deferred-neighbor capability and Broken Sixpence active-only swing remains blocked',()=>{
 const frederick=importContraDb(readFileSync(new URL('../test-data/contradb/66.json',import.meta.url),'utf8'),{capabilities:{...capabilities,deferredNeighbors:false},interpretation:{rows:{'contradb:66:row:2':{balanceBeats:4},'contradb:66:row:3':{hallPhaseBeats:[4,4,4,4]}}}});
 assert.equal(frederick.dance,undefined);assert.equal(frederick.coverage.executable,false);assert.equal(frederick.record!.rows[0].progression,true);assert.match(frederick.record!.notes,/next ladle/);assert.ok(frederick.diagnostics.some(d=>d.code==='deferred-adapter-gate'));
 const sixpence=importContraDb(readFileSync(new URL('../test-data/contradb/2026.json',import.meta.url),'utf8'),{capabilities,interpretation:{rows:{'contradb:2026:row:4':{hallPhaseBeats:[4,4,4,4]}}}});
 assert.equal(sixpence.dance,undefined);assert.equal(sixpence.coverage.executable,false);assert.match(sixpence.record!.rows[3].text,/ones swing end facing down to split the twos/);assert.match(sixpence.record!.rows[4].text,/turn alone/);assert.ok(sixpence.diagnostics.some(d=>d.code==='hall-composition'));
});
test('Nice Combination runs complete 2–12-couple finite circulation without identity swaps, resets or intergroup collisions',()=>{
 const dance=imported().dance!;
 for(let count=2;count<=12;count++){
  const c=compileChoreography(dance,count,capabilities),period=count*2*64;assert.equal(c.repeatable,true);assert.equal(c.totalBeats,64);const initial=c.sample(0);
  for(let beat=0;beat<=period;beat+=.5){const f=c.sample(beat),hands=new Set<string>();assert.deepEqual(f.poses.map(p=>p.id),c.dancers.map(d=>d.id));for(let a=0;a<f.poses.length;a++){const p=f.poses[a];assert.ok([p.position.x,p.position.z,p.yaw].every(Number.isFinite));for(let b=a+1;b<f.poses.length;b++)assert.ok(distance(p.position,f.poses[b].position)>.48,`${count} couples, beat ${beat}, actors ${a}/${b}`);}for(const h of f.contacts){const owners=[`${h.a}:${h.handA}`];if(!h.target||h.target==='hands')owners.push(`${h.b}:${h.handB}`);for(const owner of owners){assert.ok(!hands.has(owner),`${count} couples, duplicate ${owner} at ${beat}`);hands.add(owner);}}}
  for(let repeat=0;repeat<=2*count;repeat++)for(const local of[0,...c.starts,20,24,28]){const beat=repeat*64+local;if(beat===0||beat>period)continue;const before=c.sample(beat-1e-6),after=c.sample(beat+1e-6);for(let id=0;id<count*2;id++){assert.ok(distance(before.poses[id].position,after.poses[id].position)<1e-4,`root jump ${count}/${id}/${beat}`);assert.ok(angle(before.poses[id].yaw,after.poses[id].yaw)<1e-3,`yaw jump ${count}/${id}/${beat}`);}}
  const closed=c.sample(period);for(let id=0;id<count*2;id++)assert.ok(distance(initial.poses[id].position,closed.poses[id].position)<1e-6,`finite closure ${count}/${id}`);
  const expected=c.sample(23.5);c.sample(period-1);assert.deepEqual(c.sample(23.5),expected,'scrubbing must be deterministic');
 }
});
test('source hall-to-circle handoff retains the same four named hands and continuous target points',()=>{
 const c=compileChoreography(imported().dance!,2,capabilities),before=c.sample(32-1e-6),after=c.sample(32+1e-6),key=(h:typeof before.contacts[number])=>[`${h.a}:${h.handA}`,`${h.b}:${h.handB}`].sort().join('/');
 assert.equal(before.contacts.length,4);assert.equal(after.contacts.length,4);for(const a of before.contacts){const b=after.contacts.find(b=>key(a)===key(b));assert.ok(b,`missing named hand pair ${key(a)}`);assert.ok(a.strength>.99999&&b.strength>.99999);assert.ok(Math.hypot(a.point.x-b.point.x,a.point.y-b.point.y,a.point.z-b.point.z)<1e-5);}
});
test('actual complete-source gait and fixed bones preserve strict new-hall gates while reporting inherited star/balance limits',t=>{
 globalThis.document={createElement:()=>({getContext:()=>new Proxy({},{get:()=>()=>{},set:()=>true})})} as unknown as Document;
 const dance=imported().dance!;for(const count of[2,6]){const c=compileChoreography(dance,count,capabilities),avatars=c.dancers.map(d=>new Avatar(d)),state={dance,showLabels:false} as StudioState;let clamps=0,maxClamp=0,worst='',maxWrist=0,newFigureWrist=0;
 const update=(beat:number)=>{const f=c.sample(beat),kind=dance.figures[f.figureIndex].kind;for(const a of avatars){a.update(f.poses[a.dancer.id],f,state,b=>c.sample(b));const gait=a.root.userData.gait;assert.equal(gait.phase,beat);assert.equal(gait.maxRate,1);assert.equal(gait.steps,dance.figures[f.figureIndex].beats);clamps+=gait.reachClamps;if(gait.reachClamps)assert.equal(kind,'star',`New or handoff leg correction at ${beat}/${a.dancer.id}`);if(gait.maxClampDistance>maxClamp){maxClamp=gait.maxClampDistance;worst=`${beat}/${a.dancer.id}`;}}
  const corrected=applyBodyContactAnchors(avatars,f);for(const a of avatars){a.root.updateMatrixWorld(true);for(const leg of a.legs){assert.ok(Math.abs(leg.upper.scale.y*3-.43)<1e-7);assert.ok(Math.abs(leg.lower.scale.y*3-.43)<1e-7);}for(const arm of a.arms){assert.ok(Math.abs(arm.upper.scale.y*3-.325)<1e-7);assert.ok(Math.abs(arm.lower.scale.y*3-.325)<1e-7);}}
  for(const h of corrected.contacts)if(h.strength>=1-1e-10){const owners:[number,'left'|'right'][]=[[h.a,h.handA]];if(!h.target||h.target==='hands')owners.push([h.b,h.handB]);for(const[id,hand]of owners){const wrist=avatars[id].arms.find(a=>a.side===(hand==='left'?1:-1))!.hand.getWorldPosition(new Vector3()),error=wrist.distanceTo(new Vector3(h.point.x,h.point.y,h.point.z));maxWrist=Math.max(maxWrist,error);if(kind==='hall-travel'||kind==='circle')newFigureWrist=Math.max(newFigureWrist,error);else if(error>1e-7)assert.equal(kind,'balance','Unreported full-strength hold regression');}}
  return avatars.flatMap(a=>[...a.arms.flatMap(p=>[p.hand,p.elbow]),...a.legs.flatMap(p=>[p.foot,p.knee])].map(p=>p.getWorldPosition(new Vector3())));
 };
 for(let i=0;i<7680;i++)update(i/120);
 for(const beat of[16,20,24,28,32,40]){const before=update(beat-1e-5),after=update(beat+1e-5);for(let i=0;i<before.length;i++)assert.ok(before[i].distanceTo(after[i])<.002,`articulated join ${beat}/${i}: ${before[i].distanceTo(after[i])}`);}
 // The inherited full-star path has measured 13.52 mm (two couples) / 84.89 mm
 // (six couples, next-neighbor balance preparation) reach corrections, and
 // the existing balance a 4.15 mm wrist miss. These are explicit regressions
 // budgets, not evidence of anatomically perfect full-dance playback. Hall,
 // its incoming swing, outgoing circle, partner swing and chain stay strict.
 avatars.forEach(a=>a.dispose());assert.ok(maxClamp<(count===2?.014:.086),`legacy star correction worsened for ${count} couples: ${maxClamp} at ${worst}`);assert.ok(maxWrist<.0042,`legacy balance wrist miss worsened: ${maxWrist}`);assert.ok(newFigureWrist<1e-7,`new hall/circle wrist miss ${newFigureWrist}`);t.diagnostic(`Known inherited limits for ${count} couples: ${clamps} star-only reach-correction samples, maximum ${maxClamp} at ${worst}; balance wrist error ${maxWrist}. No extra footfalls.`);}
});
