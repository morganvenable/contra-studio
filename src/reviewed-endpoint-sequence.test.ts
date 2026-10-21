import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {prepareContraDbReview} from './source-review.ts';
import {readContraDbImport} from './contradb-import.ts';
import {makeContraDbSnapshot} from './contradb-source.ts';
import {compileChoreography} from './choreography.ts';
import type {CompiledStateSequence} from './state-sequence.ts';
const raw=readFileSync(new URL('../test-data/contradb/3326.json',import.meta.url),'utf8');
function review(text=raw){const p=prepareContraDbReview(text),record=p.result.record!;p.interpretation.notesReview='provenance-only';p.interpretation.rows??={};p.interpretation.rows[record.rows.at(-1)!.id]={chainReceiver:'neighbor'};return p;}
function admitted(text=raw){const p=review(text),r=readContraDbImport(text,{interpretation:p.interpretation});assert.ok(r.dance,r.errors.join('; '));return r;}
const gap=(a:{position:{x:number;z:number}},b:{position:{x:number;z:number}})=>Math.hypot(a.position.x-b.position.x,a.position.z-b.position.z);
test('reviewed endpoint event retains literal unmarked rows, snapshot, counts and removable choices',()=>{
 const p=review(),r=admitted(),d=r.dance!,event=d.progressionEvents![0];
 assert.deepEqual(d.figures.map(f=>f.beats),[8,8,8,8,8,8,8,8]);
 assert.equal(event.source.basis,'reviewed-interpretation');assert.equal(event.source.sourceId,r.record!.snapshotId);assert.equal(event.source.url,r.record!.sourceUrl);
 assert.equal(event.afterFigureId,d.figures.at(-1)!.id);assert.equal(d.figures.at(-1)!.progression,true);
 assert.ok(r.record!.rows.every(row=>!row.progression));assert.ok(r.rows.every(row=>row.figures.every(f=>!f.progression)));
 assert.deepEqual(r.record,p.result.record);assert.deepEqual(JSON.parse(d.sourceText!).snapshot,JSON.parse(JSON.stringify(makeContraDbSnapshot(r.record!))));
 assert.deepEqual(readContraDbImport(d.sourceText!).dance,d);
 delete p.interpretation.progression;assert.equal(readContraDbImport(raw,{interpretation:p.interpretation}).dance,undefined);
 const wrong=review();wrong.interpretation.rows![wrong.result.record!.rows.at(-1)!.id].chainReceiver='partner';assert.equal(readContraDbImport(raw,{interpretation:wrong.interpretation}).dance,undefined);
 const noNotes=review();delete noNotes.interpretation.notesReview;assert.equal(readContraDbImport(raw,{interpretation:noNotes.interpretation}).dance,undefined);
 const invalid=review();(invalid.interpretation as {progression:string}).progression='start-of-cycle';assert.equal(readContraDbImport(raw,{interpretation:invalid.interpretation}).dance,undefined);
});
for(const couples of [3,4])test(`reviewed endpoint sequence preserves actual roles, finite ends and all ${couples}-couple periods`,()=>{
 const d=admitted().dance!,c=compileChoreography(d,couples) as CompiledStateSequence,pairs=new Set<string>();let roleProofs=0,waiting=0,minClearance=Infinity,maxSpeed=0,neighborFrames=0,partnerFrames=0,courtesyContacts=0;
 assert.equal(c.totalBeats,64);assert.equal(c.periodRepeats,2*couples);
 for(let repeat=0;repeat<c.periodRepeats;repeat++){
  const base=repeat*64,topology=c.topology(base),proofs=c.sequenceBoundaries(repeat),first=c.sample(base);
  assert.equal(topology.epoch,repeat);assert.deepEqual(c.topology(base+63.999999),topology);assert.equal(c.topology(base+64).epoch,repeat+1);
  assert.deepEqual(topology.partners,c.dancers.filter(a=>a.role==='lark').map(a=>[a.id,a.id+1]));
  // Independently resolve active neighbors from current finite ranks/directions.
  const rows=c.dancers.filter(a=>a.role==='lark').sort((a,b)=>first.poses[a.id].position.z-first.poses[b.id].position.z),neighbors:number[][]=[],waitingIds:number[]=[];
  for(let i=0;i<rows.length;){const a=rows[i],b=rows[i+1];if(b&&first.poses[a.id].position.x>0&&first.poses[b.id].position.x<0){neighbors.push([a.id,b.id+1].sort((x,y)=>x-y),[a.id+1,b.id].sort((x,y)=>x-y));pairs.add([a.couple,b.couple].sort((x,y)=>x-y).join(':'));i+=2;}else{waitingIds.push(a.id,a.id+1);i++;}}
  assert.deepEqual([...topology.neighbors].sort((a,b)=>a[0]-b[0]),neighbors.sort((a,b)=>a[0]-b[0]));assert.deepEqual([...topology.waitingIds].sort((a,b)=>a-b),waitingIds.sort((a,b)=>a-b));waiting+=waitingIds.length;
  for(const proof of proofs.filter(p=>p.adapterId==='role-dosido-exchange')){roleProofs++;assert.equal(proof.contactPolicy,'strict-carried');assert.equal(proof.entry.sourceBeat,40);assert.equal(proof.exit.sourceBeat,48);assert.deepEqual(proof.incoming,proof.entry);assert.equal(proof.exit.relationshipEpoch,repeat);assert.deepEqual(proof.exit.partner,proof.entry.partner);assert.deepEqual(proof.exit.neighbor,proof.entry.neighbor);assert.deepEqual(proof.exit.heldContacts,[]);
   const robins=proof.entry.actors.filter(a=>a.role==='robin').map(a=>a.id);for(const actor of proof.entry.actors){const origin=proof.entry.poses.find(p=>p.id===(actor.role==='robin'?robins.find(id=>id!==actor.id):actor.id))!;assert.ok(gap(proof.exit.poses.find(p=>p.id===actor.id)!,origin)<1e-8);}
  }
  for(const local of [...c.starts,64]){if(base+local===0)continue;const before=c.sample(base+local-1e-7),after=c.sample(base+local);for(const p of after.poses){assert.ok(gap(p,before.poses[p.id])<1e-5);assert.ok(Math.abs(Math.atan2(Math.sin(p.yaw-before.poses[p.id].yaw),Math.cos(p.yaw-before.poses[p.id].yaw)))<1e-5);}}
  const neighborMap=new Map(neighbors.flatMap(([a,b])=>[[a,b],[b,a]])),partnerMap=new Map(topology.partners.flatMap(([a,b])=>[[a,b],[b,a]]));
  let prior=first;
  for(let k=1;k<=4096;k++){
   const local=k/64,f=c.sample(base+local);for(const p of f.poses){assert.ok(Number.isFinite(p.position.x+p.position.z+p.yaw));maxSpeed=Math.max(maxSpeed,gap(p,prior.poses[p.id])*64);}
   for(let a=0;a<f.poses.length;a++)for(let b=a+1;b<f.poses.length;b++)minClearance=Math.min(minClearance,gap(f.poses[a],f.poses[b]));
   for(const h of f.contacts){assert.ok(h.strength>0&&h.strength<=1);
    if(local>8&&local<16){assert.equal(neighborMap.get(h.a),h.b,'neighbor swing retains actual current neighbors');if(h.kind==='swing-frame'&&h.strength>.999)neighborFrames++;}
    if(local>48&&local<56){assert.equal(partnerMap.get(h.a),h.b,'partner swing retains persistent partners');if(h.kind==='swing-frame'&&h.strength>.999)partnerFrames++;}
    if(local>56&&local<64){if(h.kind==='courtesy'){assert.equal(neighborMap.get(h.a),h.b,'chain courtesy retains actual receiving neighbor');if(h.strength>.999)courtesyContacts++;}else{assert.equal(c.dancers[h.a].role,'robin');assert.equal(c.dancers[h.b].role,'robin');assert.ok(neighborMap.has(h.a)&&neighborMap.has(h.b));}}
   }
   prior=f;
  }
 }
 assert.ok(roleProofs>0&&waiting>0);assert.equal(pairs.size,couples*(couples-1)/2);
 for(const p of c.sample(0).poses){const end=c.sample(c.periodRepeats*64).poses[p.id];assert.ok(gap(p,end)<1e-8);assert.ok(Math.abs(Math.atan2(Math.sin(p.yaw-end.yaw),Math.cos(p.yaw-end.yaw)))<1e-8);}
 assert.ok(neighborFrames>0&&partnerFrames>0&&courtesyContacts>0);assert.deepEqual(c.sample(c.periodRepeats*64).contacts,c.sample(0).contacts);
 console.log(JSON.stringify({source:3326,couples,minClearance,maxSpeed,neighborFrames,partnerFrames,courtesyContacts,sampleStep:1/64,scope:'whole-period root and named-contact evidence; no body/GPU/audio certification'}));
});
test('endpoint review reuses literal semantics under unrelated source identity and title',()=>{
 const snapshot=JSON.parse(raw);snapshot.sourceUrl='https://contradb.com/dances/999991';snapshot.html=snapshot.html.replaceAll('Swamp Stomp','Evening Lantern').replaceAll('/dances/3326','/dances/999991');const r=admitted(JSON.stringify(snapshot));assert.equal(r.dance!.title,'Evening Lantern');assert.match(r.record!.snapshotId,/contradb:999991:/);assert.equal(r.dance!.progressionEvents![0].source.sourceId,r.record!.snapshotId);
});
test('endpoint review cannot waive actual endpoint motion or override literal source markers',()=>{
 const d=structuredClone(admitted().dance!);d.figures[d.figures.length-1]={id:d.figures.at(-1)!.id,label:'stationary cycle ending',kind:'long-lines',who:'all',beats:8,progression:true};assert.throws(()=>compileChoreography(d,3));
 const marked=readFileSync(new URL('../test-data/contradb/522.json',import.meta.url),'utf8'),p=prepareContraDbReview(marked);p.interpretation.progression='end-of-cycle';const r=readContraDbImport(marked,{interpretation:p.interpretation});assert.equal(r.dance,undefined);assert.ok(r.diagnostics.some(d=>d.code==='unused-progression-choice'));
});
