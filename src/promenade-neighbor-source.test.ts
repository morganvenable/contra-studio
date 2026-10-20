import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Vector3} from 'three';
import {importContraDb} from './contradb-import.ts';
import {prepareContraDbReview} from './source-review.ts';
import {compileChoreography} from './choreography.ts';
import {Avatar,applyBodyContactAnchors} from './scene.ts';
import type {MotionCapabilities,StudioState} from './types.ts';
const capabilities:MotionCapabilities={promenades:true,neighborPromenades:true,archExchanges:true};
const raw=(id:number)=>readFileSync(new URL(`../test-data/contradb/${id}.json`,import.meta.url),'utf8');
const distance=(a:{x:number;z:number},b:{x:number;z:number})=>Math.hypot(a.x-b.x,a.z-b.z);
const angle=(a:number,b:number)=>Math.abs(Math.atan2(Math.sin(a-b),Math.cos(a-b)));
function imported(id:number){const review=prepareContraDbReview(raw(id),[],capabilities),result=review.result;assert.ok(result.dance,JSON.stringify(result.diagnostics));assert.equal(result.coverage.executable,true);return{...result,review};}
for(const id of[2194,1448])test(`actual source #${id} keeps every original row, count, qualifier and explicit convention through archive re-import`,()=>{
 const r=imported(id),dance=r.dance!,p=dance.figures.find(f=>f.kind==='promenade')!,i=dance.figures.indexOf(p),source=r.record!;
 assert.equal(dance.title,id===2194?'Bristol Court':'Fire in the Creek variation');assert.equal(dance.author,id===2194?'Melanie Axel-Lute':'Jim Kitch');assert.equal(dance.sourceRows.length,id===2194?7:8);assert.equal(dance.figures.reduce((n,f)=>n+f.beats,0),64);assert.equal(source.rows.find(r=>r.text==='neighbors promenade')?.beats,8);
 assert.equal(p.who,'neighbor');assert.equal(p.amount,.5);assert.equal(p.passingShoulder,'left');assert.equal(p.direction,'left');assert.equal(p.promenadeHold,'skaters');assert.equal(p.hands,'both');assert.equal(p.courtesyLeader,'lark');assert.equal(dance.figures[i-1].kind,'swing');assert.equal(dance.figures[i-1].who,'neighbor');assert.equal(dance.figures[i-1].beats,id===2194?8:10);assert.equal(dance.figures[i+1].kind,'star');
 if(id===1448){assert.equal(source.rows[4].beats,6);assert.equal(source.rows[5].beats,10);assert.equal(source.rows[7].text,'star left 4 places ⁋');assert.equal(source.rows[7].progression,true);assert.equal(r.interpretation!.progression,undefined);}else{assert.ok(source.rows.every(r=>!r.progression));assert.equal(r.interpretation!.progression,'end-of-cycle');}
 const archived=importContraDb(dance.sourceText,{capabilities});assert.ok(archived.dance);assert.equal(archived.record!.original,source.original);assert.deepEqual(archived.dance.figures,dance.figures);assert.deepEqual(archived.record!.rows,source.rows);assert.equal(importContraDb(raw(id),{capabilities}).dance,undefined);
 assert.equal(importContraDb(dance.sourceText,{capabilities:{...capabilities,neighborPromenades:false}}).dance,undefined);assert.equal(importContraDb(dance.sourceText,{capabilities:{...capabilities,promenades:false}}).dance,undefined);
 const choice=structuredClone(r.interpretation!);delete choice.rows![source.rows.find(r=>r.text==='neighbors promenade')!.id].promenade;assert.equal(importContraDb(raw(id),{capabilities,interpretation:choice}).dance,undefined);
 assert.ok(r.review.suggestions.some(s=>s.kind==='conventional-promenade'&&/neighbor/.test(s.message)&&/chosen|interpretation/.test(s.message)));
});
test('an allemande-entry source remains blocked when its separate handoff capability is disabled',()=>{
 const r=prepareContraDbReview(raw(1744),[],{...capabilities,allemandePromenadeHandoffs:false}).result;assert.equal(r.record!.title,'Another First Time');assert.equal(r.record!.rows[0].text,'neighbors allemande right 1½');assert.equal(r.record!.rows[1].text,'neighbors promenade');assert.equal(r.record!.rows.reduce((s,r)=>s+r.beats!,0),64);assert.equal(r.coverage.semanticallyResolved,true);assert.equal(r.coverage.executable,false);assert.equal(r.dance,undefined);assert.match(r.errors.join('\n'),/allemande-to-promenade.*separately reviewed/);
});
for(const id of[2194,1448])test(`actual source #${id} preserves neighbors through all 2–12-couple finite periods and every physical figure join`,()=>{
 const dance=imported(id).dance!;
 for(let count=2;count<=12;count++){
  const c=compileChoreography(dance,count,capabilities),period=2*count*64,initial=c.sample(0);assert.equal(c.repeatable,true);assert.equal(c.totalBeats,64);
  for(let repeat=0;repeat<2*count;repeat++){
   const first=c.sample(repeat*64),rows=c.dancers.filter(d=>d.role==='lark').sort((a,b)=>first.poses[a.id].position.z-first.poses[b.id].position.z),expected=new Map<number,number>();
   for(let row=0;row<rows.length;){const a=rows[row],b=rows[row+1];if(b&&first.poses[a.id].position.x>0&&first.poses[b.id].position.x<0){expected.set(a.id,b.id+1);expected.set(b.id+1,a.id);expected.set(b.id,a.id+1);expected.set(a.id+1,b.id);row+=2;}else row++;}
   for(let local=0;local<64;local+=.5){const beat=repeat*64+local,f=c.sample(beat),hands=new Set<string>();assert.deepEqual(f.poses.map(p=>p.id),c.dancers.map(d=>d.id));for(let a=0;a<f.poses.length;a++){const p=f.poses[a];assert.ok([p.position.x,p.position.z,p.yaw].every(Number.isFinite));for(let b=a+1;b<f.poses.length;b++)assert.ok(distance(p.position,f.poses[b].position)>(id===2194&&['box-the-gnat','allemande'].includes(dance.figures[f.figureIndex].kind)?.50:.60),`${id}/${count} root clearance at ${beat} actors ${a}/${b}`);}
    for(const h of f.contacts){const owners=[`${h.a}:${h.handA}`];if(!h.target||h.target==='hands')owners.push(`${h.b}:${h.handB}`);for(const owner of owners){assert.ok(!hands.has(owner),`${id}/${count} duplicate ${owner} at ${beat}`);hands.add(owner);}if(dance.figures[f.figureIndex].kind==='promenade'){assert.equal(expected.get(h.a),h.b,`${id}/${count} current epoch ${repeat}`);assert.notEqual(c.dancers[h.a].couple,c.dancers[h.b].couple);assert.equal(h.handA,h.handB);}}
   }
   for(const local of[0,...c.starts,50,52,55]){const beat=repeat*64+local;if(!beat)continue;const before=c.sample(beat-1e-6),after=c.sample(beat+1e-6);for(let actor=0;actor<count*2;actor++){assert.ok(distance(before.poses[actor].position,after.poses[actor].position)<1e-4,`${id}/${count} root jump ${beat}/${actor}`);assert.ok(angle(before.poses[actor].yaw,after.poses[actor].yaw)<1e-3,`${id}/${count} yaw jump ${beat}/${actor}`);}}
   const entry=c.sample(repeat*64+48),gate=c.sample(repeat*64+50),exit=c.sample(repeat*64+56);assert.equal(gate.contacts.length,expected.size);
   for(const[a,b]of expected){assert.ok(Math.abs(distance(entry.poses[a].position,entry.poses[b].position)-.68)<1e-8);assert.ok(Math.abs(distance(exit.poses[a].position,exit.poses[b].position)-1.8)<1e-8);assert.ok(Math.abs(entry.poses[a].position.x+exit.poses[a].position.x)<1e-8);assert.ok(Math.abs(angle(entry.poses[a].yaw,exit.poses[a].yaw)-Math.PI)<1e-8);}
  }
  const closed=c.sample(period);for(let actor=0;actor<count*2;actor++)assert.ok(distance(initial.poses[actor].position,closed.poses[actor].position)<1e-6);const expected=c.sample(51.5);c.sample(period-1);assert.deepEqual(c.sample(51.5),expected);
 }
});
for(const id of[2194,1448])test(`source #${id} promenade and prepared same-neighbor swing retain real Avatar cadence, limb lengths and exact handoffs`,t=>{
 globalThis.document={createElement:()=>({getContext:()=>new Proxy({},{get:()=>()=>{},set:()=>true})})}as unknown as Document;
 const dance=imported(id).dance!;for(const count of[2,6]){const c=compileChoreography(dance,count,capabilities),avatars=c.dancers.map(d=>new Avatar(d)),state={dance,showLabels:false}as StudioState;let wrist=0;const corrections=new Map<string,{samples:number;max:number}>();
 const update=(beat:number)=>{const f=c.sample(beat),kind=dance.figures[f.figureIndex].kind;for(const a of avatars){a.update(f.poses[a.dancer.id],f,state,b=>c.sample(b));const gait=a.root.userData.gait;assert.equal(gait.phase,beat);assert.equal(gait.maxRate,1);assert.equal(gait.steps,dance.figures[f.figureIndex].beats);if(gait.reachClamps){const stat=corrections.get(kind)??{samples:0,max:0};stat.samples+=gait.reachClamps;stat.max=Math.max(stat.max,gait.maxClampDistance);corrections.set(kind,stat);assert.ok(!(beat>= (id===2194?40:38)&&beat<56),`${id}/${count} new neighbor preparation/promendade reach correction at ${beat}/${a.dancer.id}: ${gait.maxClampDistance}`);}}
  const corrected=applyBodyContactAnchors(avatars,f);for(const a of avatars){a.root.updateMatrixWorld(true);for(const leg of a.legs){assert.ok(Math.abs(leg.upper.scale.y*3-.43)<1e-7);assert.ok(Math.abs(leg.lower.scale.y*3-.43)<1e-7);}for(const arm of a.arms){assert.ok(Math.abs(arm.upper.scale.y*3-.325)<1e-7);assert.ok(Math.abs(arm.lower.scale.y*3-.325)<1e-7);}}
  if(kind==='promenade')for(const h of corrected.contacts)if(h.strength>=1-1e-10)for(const[actor,hand]of[[h.a,h.handA],[h.b,h.handB]]as const){const w=avatars[actor].arms.find(a=>a.side===(hand==='left'?1:-1))!.hand.getWorldPosition(new Vector3());wrist=Math.max(wrist,w.distanceTo(new Vector3(h.point.x,h.point.y,h.point.z)));}
  return avatars.flatMap(a=>[...a.arms.flatMap(p=>[p.hand,p.elbow]),...a.legs.flatMap(p=>[p.foot,p.knee])].map(p=>p.getWorldPosition(new Vector3())));
 };
 for(let n=0;n<3840;n++)update(n/60);for(const beat of[48,56]){const before=update(beat-1e-5),after=update(beat+1e-5);for(let n=0;n<before.length;n++)assert.ok(before[n].distanceTo(after[n])<.002,`${id}/${count} articulated join ${beat}/${n}: ${before[n].distanceTo(after[n])}`);}
 assert.ok(wrist<1e-7);assert.ok([...corrections.keys()].every(kind=>kind==='star'),'all inherited corrections stay in the disclosed star figure');assert.ok((corrections.get('star')?.max??0)<(id===2194?.096:.014),'known inherited star reach budget');t.diagnostic(`${id}/${count} inherited full-source reach corrections ${JSON.stringify(Object.fromEntries(corrections))}; new promenade wrist miss ${wrist}.`);avatars.forEach(a=>a.dispose());}
});
test('neighbor promenade preparation changes only its same-relation incoming swing and bounded release interval',()=>{
 globalThis.document={createElement:()=>({getContext:()=>new Proxy({},{get:()=>()=>{},set:()=>true})})}as unknown as Document;
 const dance=imported(1448).dance!,compiled=compileChoreography(dance,2,capabilities),index=dance.figures.findIndex(f=>f.kind==='promenade')-1;
 const snapshot=(beat:number,change:(d:typeof dance)=>void)=>{const d=structuredClone(dance);change(d);const f=compiled.sample(beat),a=new Avatar(compiled.dancers[0]);a.update(f.poses[0],f,{dance:d,showLabels:false}as StudioState,b=>compiled.sample(b));const values:number[]=[];for(const arm of a.arms)for(const mesh of[arm.upper,arm.lower,arm.hand,arm.elbow])values.push(...mesh.position.toArray(),...mesh.quaternion.toArray(),...mesh.scale.toArray());a.dispose();return values;};
 const ordinary=(d:typeof dance)=>{d.figures[index+1]={id:'ordinary',kind:'long-lines',who:'all',beats:8,label:'long lines'};},baseline=snapshot(47.8,ordinary);
 assert.deepEqual(snapshot(47.8,d=>{d.figures[index+1].who='partner';}),baseline);assert.deepEqual(snapshot(47.8,d=>{d.figures[index].who='partner';}),baseline);assert.deepEqual(snapshot(45,d=>{}),snapshot(45,ordinary));assert.notDeepEqual(snapshot(47.8,d=>{}),baseline);
});
test('neighbor promenades share the reviewed partner geometry only under an exact stable-actor slot mapping',()=>{
 const reference=compileChoreography(imported(1616).dance!,2,capabilities),entry=reference.sample(32);
 for(const source of[2194,1448]){const candidate=compileChoreography(imported(source).dance!,2,capabilities),start=candidate.sample(48),mapping=new Map(entry.poses.map(a=>{const matches=start.poses.filter(b=>distance(a.position,b.position)<1e-9&&angle(a.yaw,b.yaw)<1e-9);assert.equal(matches.length,1);assert.equal(reference.dancers[a.id].role,candidate.dancers[matches[0].id].role);return[a.id,matches[0].id];}));
  assert.notDeepEqual([...mapping],entry.poses.map(p=>[p.id,p.id]),'the stable physical actors really differ between partner and neighbor cases');
  for(let n=0;n<960;n++){const beat=n/120,A=reference.sample(32+beat),B=candidate.sample(48+beat);
   for(const a of A.poses){const b=B.poses[mapping.get(a.id)!];assert.ok(distance(a.position,b.position)<1e-9);assert.ok(angle(a.yaw,b.yaw)<1e-9);for(const key of['stride','lean','bounce','turn']as const)assert.ok(Math.abs(a[key]-b[key])<1e-9,`${source}/${beat}/${key}`);for(const key of['activity','swingPreparation','balance','arch']as const)assert.deepEqual(a[key],b[key]);}
   assert.equal(A.contacts.length,B.contacts.length);for(const a of A.contacts){const b=B.contacts.find(b=>b.a===mapping.get(a.a)&&b.b===mapping.get(a.b)&&b.handA===a.handA&&b.handB===a.handB);assert.ok(b);assert.equal(b.kind,a.kind);assert.ok(Math.hypot(a.point.x-b.point.x,a.point.y-b.point.y,a.point.z-b.point.z)<1e-9);assert.ok(Math.abs(a.strength-b.strength)<1e-9);}
  }
 }
 // This certificate covers the complete promenade's root/body-driving and
 // contact fields. The preceding swings are 8/10/12 counts and the following
 // figures are star/allemande, so their actual articulated joins are separately
 // sampled above; no whole-transition mesh equivalence is claimed.
});
