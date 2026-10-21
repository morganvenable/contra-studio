import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {readContraDbImport} from './contradb-import.ts';
import {makeContraDbSnapshot} from './contradb-source.ts';
import {prepareContraDbReview} from './source-review.ts';
import {classifySourceHook} from './source-hook.ts';
import {preDanceWalkthroughFeedback} from './source-alternatives.ts';
import {compileChoreography} from './choreography.ts';
const raw=(id:number)=>readFileSync(new URL(`../test-data/contradb/${id}.json`,import.meta.url),'utf8');
const archive=readFileSync(new URL('../test-data/reviewed-interpretations/458.json',import.meta.url),'utf8');
const gap=(a:{position:{x:number;z:number}},b:{position:{x:number;z:number}})=>Math.hypot(a.position.x-b.position.x,a.position.z-b.position.z);
test('458 descriptive review retains exact snapshot, choices and printed source',()=>{
 const r=readContraDbImport(archive);assert.ok(r.dance,r.errors.join('; '));assert.deepEqual(JSON.parse(archive).snapshot,JSON.parse(raw(458)));assert.deepEqual(JSON.parse(archive).snapshot,JSON.parse(JSON.stringify(makeContraDbSnapshot(r.record!))));assert.equal(r.record!.hook,'smooth transitions');assert.deepEqual(r.record!.rows.map(r=>r.beats),[8,8,16,8,8,8,8]);assert.equal(r.record!.rows.filter(r=>r.progression).length,1);assert.equal(r.dance.figures.reduce((n,f)=>n+f.beats,0),64);
 const i=JSON.parse(archive).interpretation;for(const key of ['notesReview']){const copy=structuredClone(i);delete copy[key];assert.equal(readContraDbImport(raw(458),{interpretation:copy}).dance,undefined);}
 for(const hook of ['smooth transitions then pass through','smooth transitions without hands','smooth transitions for active couples'])assert.notEqual(classifySourceHook({...r.record!,hook}).kind,'informational');
});
test('1428 dated pre-floor feedback is a removable annotation, not authority to add a held right hand',()=>{
 const p=prepareContraDbReview(raw(1428)),record=p.result.record!;assert.ok(preDanceWalkthroughFeedback(record));
 for(const suffix of [' begin facing out',' then swing'])assert.equal(preDanceWalkthroughFeedback({...record,preamble:record.preamble+suffix}),undefined);
 for(const [from,to]of [['9-22-19','2-30-19'],['9-22-19','9-22-03'],['Don Flaherty','Someone Else']])assert.equal(preDanceWalkthroughFeedback({...record,preamble:record.preamble.replace(from,to)}),undefined);
 assert.equal(preDanceWalkthroughFeedback({...record,original:record.original.replace('mailto:','https:')}),undefined);
 const interpretation={...p.interpretation,preambleReview:'pre-dance-walkthrough-feedback' as const,notesReview:'provenance-only' as const},r=readContraDbImport(raw(1428),{interpretation});assert.equal(r.dance,undefined);assert.ok(r.errors.some(e=>e.includes('same-role passage')));assert.ok(!r.diagnostics.some(d=>d.code.startsWith('source-preamble')));assert.equal(r.rows[0].figures[0].hands,undefined);
 const removed={...interpretation};delete (removed as any).preambleReview;assert.ok(readContraDbImport(raw(1428),{interpretation:removed}).diagnostics.some(d=>d.code.startsWith('source-preamble')));
});
for(const count of [3,4])test(`458 preserves actual people, finite ends and closure for ${count} couples`,t=>{
 const r=readContraDbImport(archive);assert.ok(r.dance);const c=compileChoreography(r.dance,count);let order=Array.from({length:count},(_,i)=>i),direction=order.map(i=>i%2?-1:1),minGap=Infinity,maxSpeed=0,neighborFrames=0,partnerFrames=0,courtesy=0;
 for(let repeat=0;repeat<2*count;repeat++){
  const neighbors=new Map<number,number>(),waiting:number[]=[],next=[...order];for(let rank=0;rank<count;){const a=order[rank],b=order[rank+1];if(b!==undefined&&direction[a]===1&&direction[b]===-1){for(const[x,y]of [[2*a,2*b+1],[2*a+1,2*b]]){neighbors.set(x,y);neighbors.set(y,x);}next[rank]=b;next[rank+1]=a;rank+=2;}else{assert.ok(rank===0||rank===count-1);waiting.push(2*a,2*a+1);direction[a]*=-1;rank++;}}
  const nextNeighbors=new Map<number,number>();for(let rank=0;rank<count-1;rank++){const a=next[rank],b=next[rank+1];if(direction[a]===1&&direction[b]===-1)for(const[x,y]of [[2*a,2*b+1],[2*a+1,2*b]]){nextNeighbors.set(x,y);nextNeighbors.set(y,x);}}let prior=c.sample(repeat*64);for(let k=1;k<2048;k++){const local=k/32,f=c.sample(repeat*64+local);for(const p of f.poses)maxSpeed=Math.max(maxSpeed,gap(p,prior.poses[p.id])*32);for(let a=0;a<f.poses.length;a++)for(let b=a+1;b<f.poses.length;b++)minGap=Math.min(minGap,gap(f.poses[a],f.poses[b]));
   for(const h of f.contacts.filter(h=>h.strength>1e-8)){if(waiting.includes(h.a)||waiting.includes(h.b)){assert.ok(local>=62&&h.kind==='joined'&&h.handA==='right'&&h.handB==='right');assert.equal(h.b,nextNeighbors.get(h.a));}if(h.kind==='swing-frame'){assert.equal(h.b,local>=16&&local<=32?h.a^1:neighbors.get(h.a));if(h.strength>=.999){if(local>=16&&local<=32)partnerFrames++;else neighborFrames++;}}if(h.kind==='courtesy'){assert.equal(h.b,neighbors.get(h.a));if(h.strength>=.999)courtesy++;}}
   prior=f;
  }
  for(const local of [...c.starts,64]){if(repeat*64+local===0)continue;const before=c.sample(repeat*64+local-1e-7),after=c.sample(repeat*64+local);for(const p of after.poses){assert.ok(gap(p,before.poses[p.id])<1e-5);assert.ok(Math.abs(Math.atan2(Math.sin(p.yaw-before.poses[p.id].yaw),Math.cos(p.yaw-before.poses[p.id].yaw)))<1e-5);}}
  order=next;
 }
 assert.ok(neighborFrames>0&&partnerFrames>0&&courtesy>0);assert.ok(minGap>=.45);assert.ok(maxSpeed<2);assert.deepEqual(c.sample(128*count).poses,c.sample(0).poses);assert.deepEqual(c.sample(128*count).contacts,c.sample(0).contacts);t.diagnostic(JSON.stringify({count,minGap,maxSpeed,neighborFrames,partnerFrames,courtesy}));
});


