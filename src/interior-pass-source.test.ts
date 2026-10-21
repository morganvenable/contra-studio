import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {readContraDbImport} from './contradb-import.ts';import {compileChoreography} from './choreography.ts';import type {CompiledStateSequence} from './state-sequence.ts';import {assertSequenceHandoff} from './sequence-boundary.ts';
const archive=readFileSync(new URL('../test-data/reviewed-interpretations/3431.json',import.meta.url),'utf8');
const source=()=>{const r=readContraDbImport(archive);assert.ok(r.dance,r.errors.join('; '));return r;};
const gap=(a:{position:{x:number;z:number}},b:{position:{x:number;z:number}})=>Math.hypot(a.position.x-b.position.x,a.position.z-b.position.z);
test('source interior pass and ring preparation retain independent removable choices and printed counts',()=>{
 const r=source(),d=r.dance!;assert.equal(d.figures.reduce((s,f)=>s+f.beats,0),64);assert.equal(d.figures.at(-1)!.exit,'ring');assert.deepEqual(d.figures.at(-1)!.phaseBeats,[6,2]);assert.equal(d.progressionEvents![0].afterFigureId,'contradb:3431:row:6');assert.equal(d.progressionEvents![0].source.basis,'source-explicit');assert.equal(r.record!.rows.at(-1)!.beats,8);assert.equal(r.record!.rows.at(-1)!.progression,false);
 for(const choice of [undefined,{phaseBeats:[4,4]},{phaseBeats:[6,2],extra:true}]){const a=JSON.parse(archive);a.interpretation.rows['contradb:3431:row:7'].dosidoRing=choice;const q=readContraDbImport(JSON.stringify(a));assert.equal(q.dance,undefined);}
});
for(const couples of [3,4])test(`source interior event carries complete ${couples}-couple periods without boundary jumps`,t=>{
 const d=source().dance!,c=compileChoreography(d,couples) as CompiledStateSequence;let minClearance=Infinity,maxSpeed=0,held=0,swings=0;assert.equal(c.periodRepeats,2*couples);
 for(let repeat=0;repeat<c.periodRepeats;repeat++){
  const base=repeat*64;assert.equal(c.topology(base+55.999999).epoch,repeat);assert.equal(c.topology(base+56).epoch,repeat+1);
  for(const proof of c.sequenceBoundaries(repeat).filter(p=>p.adapterId==='dosido-to-held-ring')){assertSequenceHandoff(proof.incoming,proof.entry);assert.deepEqual(proof.entry.heldContacts,[]);assert.equal(proof.entry.sourceBeat,56);assert.equal(proof.exit.sourceBeat,64);assert.equal(proof.exit.heldContacts.length,4);assert.equal(proof.exit.relationshipEpoch,repeat+1);held++;}
  for(const local of [...c.starts,64]){if(base+local===0)continue;const a=c.sample(base+local-1e-7),b=c.sample(base+local);for(const p of a.poses){assert.ok(gap(p,b.poses[p.id])<1e-5);assert.ok(Math.abs(Math.atan2(Math.sin(p.yaw-b.poses[p.id].yaw),Math.cos(p.yaw-b.poses[p.id].yaw)))<1e-5);}}
  let prior=c.sample(base);for(let k=1;k<=4096;k++){const local=k/64,f=c.sample(base+local);for(const p of f.poses)maxSpeed=Math.max(maxSpeed,gap(p,prior.poses[p.id])*64);for(let a=0;a<f.poses.length;a++)for(let b=a+1;b<f.poses.length;b++)minClearance=Math.min(minClearance,gap(f.poses[a],f.poses[b]));for(const h of f.contacts.filter(h=>h.kind==='swing-frame')){assert.equal(c.dancers[h.a].couple===c.dancers[h.b].couple,local>=32&&local<=48,JSON.stringify({local,a:h.a,b:h.b,kind:f.figureIndex}));swings++;}prior=f;}
 }
 assert.ok(held>0&&swings>0);assert.ok(minClearance>=.45);assert.ok(maxSpeed<2);assert.deepEqual(c.sample(0).poses,c.sample(c.periodRepeats*64).poses);assert.deepEqual(c.sample(0).contacts,c.sample(c.periodRepeats*64).contacts);t.diagnostic(JSON.stringify({couples,minClearance,maxSpeed,held,swings}));
});

// Independent finite-line oracle: neighboring inward-facing couples exchange
// ranks; unmatched end couples reverse direction without wrapping the hall.
function lineOracle(count:number){
 let order=Array.from({length:count},(_,i)=>i),directions=order.map(i=>i%2?-1:1);
 return {snapshot(){const pairs:number[][]=[],waiting:number[]=[];for(let r=0;r<count;){const a=order[r],b=order[r+1];if(b!==undefined&&directions[a]===1&&directions[b]===-1){pairs.push([2*a,2*b+1],[2*a+1,2*b]);r+=2;}else{waiting.push(2*a,2*a+1);r++;}}return {pairs:pairs.map(p=>p.sort((a,b)=>a-b)).sort((a,b)=>a[0]-b[0]),waiting:waiting.sort((a,b)=>a-b)};},step(){const next=[...order];for(let r=0;r<count;){const a=order[r],b=order[r+1];if(b!==undefined&&directions[a]===1&&directions[b]===-1){next[r]=b;next[r+1]=a;r+=2;}else{assert.ok(r===0||r===count-1);directions[a]*=-1;r++;}}order=next;}};
}
for(const couples of [3,4])test(`independent ${couples}-couple neighbor and finite waiter oracle survives the interior event`,()=>{
 const c=compileChoreography(source().dance!,couples) as CompiledStateSequence,o=lineOracle(couples),initial=o.snapshot(),encounters=new Set<string>();let fullNeighbor=0,fullPartner=0;
 for(let repeat=0;repeat<c.periodRepeats;repeat++){
  const before=o.snapshot();o.step();const after=o.snapshot();
  for(let local=0;local<64;local+=.25){const expected=local<56?before:after,beat=repeat*64+local,t=c.topology(beat),f=c.sample(beat);
   assert.equal(t.epoch,repeat+Number(local>=56));assert.deepEqual(t.neighbors.sort((a,b)=>a[0]-b[0]),expected.pairs);assert.deepEqual([...t.waitingIds].sort((a,b)=>a-b),expected.waiting);assert.deepEqual(t.partners,Array.from({length:couples},(_,i)=>[2*i,2*i+1]));
   const neighbor=new Map(expected.pairs.flatMap(([a,b])=>[[a,b],[b,a]]));
   for(const h of f.contacts.filter(h=>h.strength>1e-8)){assert.ok(!expected.waiting.includes(h.a)&&!expected.waiting.includes(h.b),'waiting actors cannot acquire another group');if(h.kind==='swing-frame'){
    if(local>=32&&local<=48){assert.equal(h.b,h.a^1);if(h.strength>=.999)fullPartner++;}else{assert.equal(h.b,neighbor.get(h.a));if(h.strength>=.999)fullNeighbor++;}
   }}
   for(const [a,b]of expected.pairs)encounters.add([Math.floor(a/2),Math.floor(b/2)].sort((a,b)=>a-b).join(':'));
  }
  for(const p of c.sequenceBoundaries(repeat)){
   const expected=p.entry.sourceBeat<56?before:after,neighbors=new Map(expected.pairs.flatMap(([a,b])=>[[a,b],[b,a]]));
   for(const b of [p.incoming,p.entry,p.exit]){assert.equal(b.relationshipEpoch,repeat+Number(p.entry.sourceBeat>=56));for(const [a,n]of b.neighbor)assert.equal(n,neighbors.get(a));for(const [a,n]of b.partner)assert.equal(n,a^1);assert.ok(b.actors.every(a=>!expected.waiting.includes(a.id)));}
   const actual=(c.formationSample??c.sample)(repeat*64+p.entry.sourceBeat);for(const p0 of p.entry.poses){assert.ok(gap(p0,actual.poses[p0.id])<1e-7,JSON.stringify({repeat,adapter:p.adapterId,beat:p.entry.sourceBeat,p0,actual:actual.poses[p0.id]}));assert.ok(Math.abs(Math.atan2(Math.sin(p0.yaw-actual.poses[p0.id].yaw),Math.cos(p0.yaw-actual.poses[p0.id].yaw)))<1e-7);}
  }
 }
 assert.ok(fullNeighbor>0&&fullPartner>0);assert.equal(encounters.size,couples*(couples-1)/2);assert.deepEqual(o.snapshot(),initial);
});
test('source identity is not motion dispatch and unsupported timing or missing source choices cannot compile',()=>{
 const original=source().dance!,renamed=structuredClone(original);renamed.id='independent-retained-record';renamed.title='Independent retained source identity';renamed.author='Test author';const a=compileChoreography(original,3),b=compileChoreography(renamed,3);
 for(let beat=0;beat<=384;beat+=2){assert.deepEqual(a.sample(beat).poses,b.sample(beat).poses);assert.deepEqual(a.sample(beat).contacts,b.sample(beat).contacts);}
 for(const mutate of [(d:typeof original)=>{d.figures.at(-1)!.beats=6;},(d:typeof original)=>{d.figures.at(-1)!.phaseBeats=[4,4];},(d:typeof original)=>{d.progressionEvents![0].count=2;}]){const d=structuredClone(original);mutate(d);assert.throws(()=>compileChoreography(d,3));}
 for(const key of ['contradb:3431:row:6','contradb:3431:row:7']){const a=JSON.parse(archive);delete a.interpretation.rows[key];assert.equal(readContraDbImport(JSON.stringify(a)).dance,undefined);}
});



