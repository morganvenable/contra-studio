import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Vector3} from 'three';
import {importContraDb} from './contradb-import.ts';
import {prepareContraDbReview} from './source-review.ts';
import {compileChoreography} from './choreography.ts';
import {Avatar,applyBodyContactAnchors} from './scene.ts';
import type {MotionCapabilities,StudioState} from './types.ts';
const snapshot=readFileSync(new URL('../test-data/contradb/1616.json',import.meta.url),'utf8');
const capabilities:MotionCapabilities={promenades:true};
const distance=(a:{x:number;z:number},b:{x:number;z:number})=>Math.hypot(a.x-b.x,a.z-b.z);
const angle=(a:number,b:number)=>Math.abs(Math.atan2(Math.sin(a-b),Math.cos(a-b)));
function imported(){const review=prepareContraDbReview(snapshot,[],capabilities),result=review.result;assert.ok(result.dance,JSON.stringify(result.diagnostics));assert.equal(result.coverage.executable,true);return{...result,review};}

test('actual Patience source retains all six rows and exact64 beats while half-promenade choices remain separate interpretations',()=>{
 const result=imported(),dance=result.dance!,p=dance.figures.find(f=>f.kind==='promenade')!,i=dance.figures.indexOf(p);assert.equal(dance.title,'Patience');assert.equal(dance.author,'Chris Page');assert.equal(dance.figures.reduce((s,f)=>s+f.beats,0),64);assert.equal(dance.sourceRows.length,6);assert.equal(dance.sourceRows[3].text,'partners promenade');assert.equal(dance.sourceRows[3].beats,8);assert.equal(dance.sourceRows[5].text,'neighbors long swing');assert.equal(dance.sourceRows[5].beats,16);
 assert.equal(p.beats,8);assert.equal(p.who,'partner');assert.equal(p.amount,.5);assert.equal(p.passingShoulder,'left');assert.equal(p.direction,'left');assert.equal(p.promenadeHold,'skaters');assert.equal(p.hands,'both');assert.equal(p.courtesyLeader,'lark');assert.equal(dance.figures[i-1].kind,'swing');assert.equal(dance.figures[i-1].who,'partner');assert.equal(dance.figures[i+1].kind,'allemande');assert.equal(dance.figures.at(-1)!.beats,16);
 assert.equal(result.rows.length,6);assert.ok(result.rows.every(r=>r.resolved));assert.equal(result.interpretation!.progression,'end-of-cycle');assert.equal(result.interpretation!.rows!['contradb:1616:row:2'].balanceBeats,4);assert.equal(JSON.parse(dance.sourceText).sourceSnapshotId,result.record!.snapshotId);
 const reread=importContraDb(dance.sourceText,{capabilities});assert.ok(reread.dance);assert.equal(reread.record!.original,result.record!.original);assert.deepEqual(reread.dance!.figures,dance.figures);assert.equal(importContraDb(dance.sourceText,{capabilities:{promenades:false}}).dance,undefined);assert.equal(importContraDb(snapshot,{capabilities}).dance,undefined,'bare source never silently authorizes inferred promenade semantics');
});
test('actual Patience has deterministic full2–12-couple finite circulation with no identity swaps, resets, duplicate hands or intergroup collision',()=>{
 const dance=imported().dance!;
 for(let count=2;count<=12;count++){
  const c=compileChoreography(dance,count,capabilities),period=count*2*64;assert.equal(c.repeatable,true);assert.equal(c.totalBeats,64);const initial=c.sample(0);
  for(let beat=0;beat<=period;beat+=.5){const f=c.sample(beat),hands=new Set<string>();assert.deepEqual(f.poses.map(p=>p.id),c.dancers.map(d=>d.id));for(let a=0;a<f.poses.length;a++){const p=f.poses[a];assert.ok([p.position.x,p.position.z,p.yaw].every(Number.isFinite));for(let b=a+1;b<f.poses.length;b++)assert.ok(distance(p.position,f.poses[b].position)>.61,`${count}couples, beat${beat}, actors${a}/${b}`);}for(const h of f.contacts){const owners=[`${h.a}:${h.handA}`];if(!h.target||h.target==='hands')owners.push(`${h.b}:${h.handB}`);for(const owner of owners){assert.ok(!hands.has(owner),`${count}couples duplicate${owner} at${beat}`);hands.add(owner);}if(dance.figures[f.figureIndex].kind==='promenade')assert.equal(c.dancers[h.a].couple,c.dancers[h.b].couple,'persistent partners only');}}
  for(let repeat=0;repeat<=2*count;repeat++)for(const local of[0,...c.starts,34,36,39]){const beat=repeat*64+local;if(beat===0||beat>period)continue;const before=c.sample(beat-1e-6),after=c.sample(beat+1e-6);for(let id=0;id<count*2;id++){assert.ok(distance(before.poses[id].position,after.poses[id].position)<1e-4,`root jump${count}/${id}/${beat}`);assert.ok(angle(before.poses[id].yaw,after.poses[id].yaw)<1e-3,`yaw jump${count}/${id}/${beat}`);}}
  const closed=c.sample(period);for(let id=0;id<count*2;id++)assert.ok(distance(initial.poses[id].position,closed.poses[id].position)<1e-6,`finite closure${count}/${id}`);const expected=c.sample(35.5);c.sample(period-1);assert.deepEqual(c.sample(35.5),expected);
 }
});
test('Patience incoming swing prepares compact same-partner promenade inside existing counts, then restores logical side-couple exit',()=>{
 const c=compileChoreography(imported().dance!,6,capabilities),entry=c.sample(32),gate=c.sample(34),exit=c.sample(40);
 for(const dancer of c.dancers){const p=c.dancers.find(p=>p.couple===dancer.couple&&p.id!==dancer.id)!;assert.ok(Math.abs(distance(entry.poses[dancer.id].position,entry.poses[p.id].position)-.68)<1e-8);assert.ok(Math.abs(distance(exit.poses[dancer.id].position,exit.poses[p.id].position)-1.8)<1e-8);}
 assert.equal(gate.contacts.length,12);for(const h of gate.contacts){assert.equal(c.dancers[h.a].couple,c.dancers[h.b].couple);assert.equal(h.handA,h.handB);assert.equal(h.strength,1);}
});
test('actual full-source Avatar keeps strict promenade and handoff gates while explicitly budgeting inherited figure limitations',t=>{
 globalThis.document={createElement:()=>({getContext:()=>new Proxy({},{get:()=>()=>{},set:()=>true})})}as unknown as Document;
 const dance=imported().dance!;for(const count of[2,6]){const c=compileChoreography(dance,count,capabilities),avatars=c.dancers.map(d=>new Avatar(d)),state={dance,showLabels:false}as StudioState;let maxClamp=0,worst='',maxWrist=0,newFigureWrist=0;const corrections=new Map<string,{samples:number;max:number}>();
 const update=(beat:number)=>{const f=c.sample(beat),kind=dance.figures[f.figureIndex].kind;for(const a of avatars){a.update(f.poses[a.dancer.id],f,state,b=>c.sample(b));const gait=a.root.userData.gait;assert.equal(gait.phase,beat);assert.equal(gait.maxRate,1);assert.equal(gait.steps,dance.figures[f.figureIndex].beats);if(gait.reachClamps){assert.ok(['long-lines','allemande','swing'].includes(kind),`new promenade leg correction at${beat}/${a.dancer.id}`);assert.ok(!(beat>=20&&beat<40),'the incoming partner swing and promenade must remain strict');const stat=corrections.get(kind)??{samples:0,max:0};stat.samples+=gait.reachClamps;stat.max=Math.max(stat.max,gait.maxClampDistance);corrections.set(kind,stat);}if(gait.maxClampDistance>maxClamp){maxClamp=gait.maxClampDistance;worst=`${beat}/${a.dancer.id}`;}}
  const corrected=applyBodyContactAnchors(avatars,f);for(const a of avatars){a.root.updateMatrixWorld(true);for(const leg of a.legs){assert.ok(Math.abs(leg.upper.scale.y*3-.43)<1e-7);assert.ok(Math.abs(leg.lower.scale.y*3-.43)<1e-7);}for(const arm of a.arms){assert.ok(Math.abs(arm.upper.scale.y*3-.325)<1e-7);assert.ok(Math.abs(arm.lower.scale.y*3-.325)<1e-7);}}
  for(const h of corrected.contacts)if(h.strength>=1-1e-10){const owners:[number,'left'|'right'][]=[[h.a,h.handA]];if(!h.target||h.target==='hands')owners.push([h.b,h.handB]);for(const[id,hand]of owners){const wrist=avatars[id].arms.find(a=>a.side===(hand==='left'?1:-1))!.hand.getWorldPosition(new Vector3()),error=wrist.distanceTo(new Vector3(h.point.x,h.point.y,h.point.z));maxWrist=Math.max(maxWrist,error);if(kind==='promenade')newFigureWrist=Math.max(newFigureWrist,error);else if(error>1e-7)assert.equal(kind,'balance','unreported full-strength hold regression');}}
  return avatars.flatMap(a=>[...a.arms.flatMap(p=>[p.hand,p.elbow]),...a.legs.flatMap(p=>[p.foot,p.knee])].map(p=>p.getWorldPosition(new Vector3())));
 };
 for(let i=0;i<7680;i++)update(i/120);for(const beat of[8,16,20,32,40,48,64]){const before=update(beat-1e-5),after=update(beat+1e-5);for(let i=0;i<before.length;i++)assert.ok(before[i].distanceTo(after[i])<.002,`articulated join${beat}/${i}: ${before[i].distanceTo(after[i])}`);}
 // These are measured inherited choreography limitations, not anatomical
 // perfection. The new promenade and prepared incoming partner swing are strict.
 assert.ok((corrections.get('long-lines')?.max??0)<.0155);assert.ok((corrections.get('allemande')?.max??0)<.021);assert.ok((corrections.get('swing')?.max??0)<.0007);assert.ok(maxWrist<.0232);assert.ok(newFigureWrist<1e-7);avatars.forEach(a=>a.dispose());t.diagnostic(`${count}couples: inherited reach corrections ${JSON.stringify(Object.fromEntries(corrections))}; max${maxClamp} at${worst}; balance wrist miss${maxWrist}; promenade wrist miss${newFigureWrist}. One footfall per beat.`);}
});
test('skaters preparation changes only the explicitly following same-partner promenade; unrelated swing exits remain identical',()=>{
 globalThis.document={createElement:()=>({getContext:()=>new Proxy({},{get:()=>()=>{},set:()=>true})})}as unknown as Document;
 const dance=imported().dance!,compiled=compileChoreography(dance,2,capabilities),index=dance.figures.findIndex(f=>f.kind==='promenade')-1;
 const snapshot=(beat:number,change:(d:typeof dance)=>void)=>{const d=structuredClone(dance);change(d);const f=compiled.sample(beat),a=new Avatar(compiled.dancers[0]);a.update(f.poses[0],f,{dance:d,showLabels:false}as StudioState,b=>compiled.sample(b));const values:number[]=[];for(const arm of a.arms)for(const mesh of[arm.upper,arm.lower,arm.hand,arm.elbow])values.push(...mesh.position.toArray(),...mesh.quaternion.toArray(),...mesh.scale.toArray());a.dispose();return values;};
 const ordinary=(d:typeof dance)=>{d.figures[index+1]={id:'ordinary',kind:'long-lines',who:'all',beats:8,label:'long lines'};};
 const baseline=snapshot(31.8,ordinary);
 assert.deepEqual(snapshot(31.8,d=>{d.figures[index+1].who='neighbor';}),baseline,'a neighbor promenade must not inherit the partner preparation');
 assert.deepEqual(snapshot(31.8,d=>{d.figures[index].who='neighbor';}),baseline,'a neighbor swing must not prepare partner hands');
 assert.deepEqual(snapshot(29,d=>{}),snapshot(29,ordinary),'there is no preparation before the bounded final swing release');
 assert.notDeepEqual(snapshot(31.8,d=>{}),baseline,'the explicit partner transition actually prepares the free arms');
});
