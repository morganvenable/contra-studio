import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {readContraDbImport} from './contradb-import.ts';import {wristStarNoteProvenance} from './contradb-annotations.ts';import {prepareContraDbReview} from './source-review.ts';
const raw=readFileSync(new URL('../test-data/contradb/885.json',import.meta.url),'utf8');
test('885 variation motivation requires its actual four plus twelve table and retains unverified publication claims',()=>{
 const p=prepareContraDbReview(raw),r=p.result.record!;assert.equal(p.interpretation.notesReview,'corroborated-style-and-provenance');assert.ok(wristStarNoteProvenance(r.notes,r));assert.equal(wristStarNoteProvenance(r.notes),undefined);
 assert.ok(r.notes.includes('All rights reserved by the author; used by permission.'));assert.ok(p.result.warnings.some(w=>w.includes('publication/permission claims have not been independently verified')));
 for(const text of [r.notes+' Then pass through.',r.notes.replace('longer partner swing','longer neighbor swing'),r.notes.replace('See notes about original dance below:','Replace the original dance below:')])assert.equal(wristStarNoteProvenance(text,{...r,notes:text}),undefined);
 for(const mutate of [(r:typeof p.result.record)=>{r!.rows[2].beats=2;r!.rows[3].beats=14;},(r:typeof p.result.record)=>{r!.rows[2].text='gentlespoons pull by right';},(r:typeof p.result.record)=>{r!.rows[3].text='neighbors swing';}]){const copy=structuredClone(r);mutate(copy);assert.equal(wristStarNoteProvenance(copy.notes,copy),undefined);}
 assert.ok(p.result.dance,p.result.errors.join('; '));assert.ok(!p.result.diagnostics.some(d=>d.code.startsWith('source-notes')));
 const removed=readContraDbImport(raw);assert.ok(removed.diagnostics.some(d=>d.code.startsWith('source-notes')));assert.equal(removed.dance,undefined);
});


import {compileChoreography} from './choreography.ts';
import {makeContraDbSnapshot} from './contradb-source.ts';
const archive=readFileSync(new URL('../test-data/reviewed-interpretations/885.json',import.meta.url),'utf8');
const gap=(a:{position:{x:number;z:number}},b:{position:{x:number;z:number}})=>Math.hypot(a.position.x-b.position.x,a.position.z-b.position.z);
test('885 saved review preserves literal counts, wrist grips, one source progression and exact replay',()=>{
 const r=readContraDbImport(archive);assert.ok(r.dance,r.errors.join('; '));assert.deepEqual(JSON.parse(archive).snapshot,JSON.parse(raw));assert.deepEqual(JSON.parse(archive).snapshot,JSON.parse(JSON.stringify(makeContraDbSnapshot(r.record!))));assert.deepEqual(r.record!.rows.map(r=>r.beats),[8,8,4,12,6,10,8,8]);assert.deepEqual(r.record!.rows.map(r=>r.progression),[false,false,false,false,false,false,false,true]);assert.deepEqual(r.dance.figures.filter(f=>f.kind==='star').map(f=>f.starGrip),['wrist-grip','wrist-grip']);assert.deepEqual(readContraDbImport(r.dance.sourceText!).dance,r.dance);
 const changed=structuredClone(r.dance);changed.title='Independent variation label';changed.id='independent-885-execution';const a=compileChoreography(r.dance,3),b=compileChoreography(changed,3);for(let beat=0;beat<=384;beat+=4)assert.deepEqual(a.sample(beat).poses,b.sample(beat).poses);
 for(const mutate of [(d:typeof changed)=>{d.figures[2].beats=3;},(d:typeof changed)=>{d.figures[2].hands=undefined;},(d:typeof changed)=>{d.figures[2].progression=true;},(d:typeof changed)=>{d.figures[3].who='neighbor';}]){const copy=structuredClone(r.dance);mutate(copy);assert.throws(()=>compileChoreography(copy,3));}
});
for(const count of [3,4])test(`885 named right passage and persistent partner exit survive full ${count}-couple period`,t=>{
 const r=readContraDbImport(archive);assert.ok(r.dance);const c=compileChoreography(r.dance,count);let order=Array.from({length:count},(_,i)=>i),direction=order.map(i=>i%2?-1:1),minGap=Infinity,maxSpeed=0,passage=0,partner=0,neighbor=0,wrist=0;
 for(let repeat=0;repeat<2*count;repeat++){
  const neighbors=new Map<number,number>(),waiting:number[]=[],next=[...order],roles=new Map<number,number>();for(let rank=0;rank<count;){const a=order[rank],b=order[rank+1];if(b!==undefined&&direction[a]===1&&direction[b]===-1){for(const[x,y]of [[2*a,2*b+1],[2*a+1,2*b]]){neighbors.set(x,y);neighbors.set(y,x);}roles.set(2*a+1,2*b+1);roles.set(2*b+1,2*a+1);next[rank]=b;next[rank+1]=a;rank+=2;}else{assert.ok(rank===0||rank===count-1);waiting.push(2*a,2*a+1);direction[a]*=-1;rank++;}}
  const entry=(c.formationSample??c.sample)(repeat*64+16),exit=(c.formationSample??c.sample)(repeat*64+20);for(const[a,b]of roles)assert.ok(gap(exit.poses[a],entry.poses[b])<1e-7);for(const id of neighbors.keys())assert.ok(Math.abs(exit.poses[id].position.x-exit.poses[id^1].position.x)<1e-7);
  for(const[a,b]of roles)if(a<b){const beat=repeat*64+18,gate=c.sample(beat),p=gate.poses[a],q=gate.poses[b],delta={x:q.position.x-p.position.x,z:q.position.z-p.position.z};assert.ok(-Math.cos(p.yaw)*delta.x+Math.sin(p.yaw)*delta.z>.69999,'actual right-side passage');const longitudinal=(beat:number)=>{const f=c.sample(beat),p0=f.poses[a].position,q0=f.poses[b].position;return(q0.x-p0.x)*Math.sin(p.yaw)+(q0.z-p0.z)*Math.cos(p.yaw);};assert.ok(longitudinal(beat-.001)*longitudinal(beat+.001)<0);const h=gate.contacts.find(h=>h.a===a&&h.b===b||h.a===b&&h.b===a);assert.ok(h&&h.strength>=.999&&h.handA==='right'&&h.handB==='right');}
  let prior=c.sample(repeat*64);for(let k=1;k<4096;k++){const local=k/64,f=c.sample(repeat*64+local);for(const p of f.poses)maxSpeed=Math.max(maxSpeed,gap(p,prior.poses[p.id])*64);for(let a=0;a<f.poses.length;a++)for(let b=a+1;b<f.poses.length;b++)minGap=Math.min(minGap,gap(f.poses[a],f.poses[b]));
   for(const h of f.contacts.filter(h=>h.strength>1e-8)){assert.ok(!waiting.includes(h.a)&&!waiting.includes(h.b));if(local>16&&local<20){assert.equal(h.b,roles.get(h.a));assert.equal(h.handA,'right');assert.equal(h.handB,'right');if(h.strength>=.999)passage++;}if(h.kind==='swing-frame'){if(local>=20&&local<=32){assert.equal(h.b,h.a^1);if(h.strength>=.999)partner++;}else{assert.equal(h.b,neighbors.get(h.a));if(h.strength>=.999)neighbor++;}}if(h.target==='wrist'){assert.equal(h.handA,local<8?'left':'right');assert.equal(h.handB,h.handA);wrist++;}}
   prior=f;
  }
  for(const local of [...c.starts,64]){if(repeat*64+local===0)continue;const a=c.sample(repeat*64+local-1e-7),b=c.sample(repeat*64+local);for(const p of b.poses){assert.ok(gap(p,a.poses[p.id])<1e-5);assert.ok(Math.abs(Math.atan2(Math.sin(p.yaw-a.poses[p.id].yaw),Math.cos(p.yaw-a.poses[p.id].yaw)))<1e-5);}}
  order=next;
 }
 assert.ok(passage>0&&partner>0&&neighbor>0&&wrist>0);assert.ok(minGap>=.45);assert.ok(maxSpeed<2);assert.deepEqual(c.sample(128*count).poses,c.sample(0).poses);assert.deepEqual(c.sample(128*count).contacts,c.sample(0).contacts);t.diagnostic(JSON.stringify({count,minGap,maxSpeed,passage,partner,neighbor,wrist}));
});

