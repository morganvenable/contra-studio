import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {prepareContraDbReview} from './source-review.ts';
import {compileChoreography} from './choreography.ts';
import {figureContinuity,compileDance} from './engine.ts';
import {REGISTERED_MOTION_CAPABILITIES} from './capabilities.ts';
const caps={...REGISTERED_MOTION_CAPABILITIES,giveAndTakes:true,heldQuarterAllemandes:true};
const review=()=>prepareContraDbReview(readFileSync(new URL('../test-data/contradb/2604.json',import.meta.url),'utf8'),[],caps);
const wrap=(a:number)=>Math.atan2(Math.sin(a),Math.cos(a));
test('a quarter-ending neighbor turn retains distinct central actors and its literal seven quarter-turns',()=>{
 const r=review();assert.ok(r.result.dance,JSON.stringify(r.result.errors));const d=r.result.dance,c=compileChoreography(d,2,caps);
 assert.equal(d.figures[1].amount,1.75);assert.equal(d.figures[1].beats,8);assert.equal(d.figures[2].amount,1);
 const end=c.sample(16).poses,order=[...end].sort((a,b)=>a.position.x-b.position.x);assert.deepEqual(order.map(p=>p.id),[1,2,0,3]);
 for(const [i,p] of order.entries()){assert.ok(Math.abs(p.position.x-[-1.45,-.35,.35,1.45][i])<1e-7);assert.ok(Math.abs(p.position.z)<1e-7);}
 let last=Math.atan2(c.sample(8).poses[0].position.z,c.sample(8).poses[0].position.x-.9),winding=0;
 for(let i=1;i<=800;i++){const p=c.sample(8+i/100).poses[0].position,a=Math.atan2(p.z,p.x-.9);winding+=wrap(a-last);last=a;}
 assert.ok(Math.abs(winding-Math.PI*3.5)<1e-7,'all1¾ right turns remain');
 let previous=Math.atan2(end[0].position.z,end[0].position.x),leftWinding=0;
 for(let i=1;i<=800;i++){const p=c.sample(16+i/100).poses[0].position,a=Math.atan2(p.z,p.x);leftWinding+=wrap(a-previous);previous=a;}
 assert.ok(Math.abs(leftWinding+Math.PI*2)<1e-7,'central larks retain the whole left turn');
});
test('central turn restores original named neighbor swing centers rather than promoting an outer root extent into formation width',()=>{
 const d=review().result.dance!,c=compileChoreography(d,6,caps),f=c.sample(24);
 for(let base=0;base<12;base+=4)for(const[a,b]of[[base,base+3],[base+2,base+1]]){const A=f.poses[a].position,B=f.poses[b].position;assert.ok(Math.abs(Math.abs((A.x+B.x)/2)-.9)<1e-7);assert.ok(Math.abs(Math.hypot(A.x-B.x,A.z-B.z)-.62)<1e-7);assert.equal(f.contacts.filter(h=>h.kind==='swing-frame'&&h.strength>1-1e-7&&[a,b].includes(h.a)&&[a,b].includes(h.b)).length,3);}
 for(const p of c.sample(32).poses)assert.ok(Math.abs(Math.abs(p.position.x)-.9)<1e-7);
 for(const beat of[8,16,24,32]){const A=c.sample(beat-1e-6),B=c.sample(beat+1e-6);for(let id=0;id<12;id++){assert.ok(Math.hypot(A.poses[id].position.x-B.poses[id].position.x,A.poses[id].position.z-B.poses[id].position.z)<1e-5);assert.ok(Math.abs(wrap(A.poses[id].yaw-B.poses[id].yaw))<1e-5);}}
});
test('held quarter-turn and canonical swing preparation require the exact adjacent relation/hand composition',()=>{
 const d=review().result.dance!;assert.equal(figureContinuity(d.figures,1).heldAllemandeExit,true);assert.equal(figureContinuity(d.figures,2).canonicalSwingLayout,true);assert.equal(figureContinuity(d.figures,3).canonicalSwingLayout,true);
 for(const mutation of[(fs:typeof d.figures)=>fs[1].amount=1.5,(fs:typeof d.figures)=>fs[2].direction='right',(fs:typeof d.figures)=>fs[2].who='neighbor']){const fs=structuredClone(d.figures);mutation(fs);assert.equal(figureContinuity(fs,1).heldAllemandeExit,undefined);assert.equal(figureContinuity(fs,2).canonicalSwingLayout,undefined);assert.equal(figureContinuity(fs,3).canonicalSwingLayout,undefined);}
 const changed=structuredClone(d.figures);changed[3].who='partner';assert.equal(figureContinuity(changed,2).canonicalSwingLayout,undefined);assert.equal(figureContinuity(changed,3).canonicalSwingLayout,undefined);
});

test('disabled give-and-take and opening-ring capabilities cannot be granted by saved source',()=>{
 for(const [id,override]of[[2604,{giveAndTakes:true,heldQuarterAllemandes:true}],[780,{ringStartSequences:true,ringPassThroughs:true}]] as const){
  const raw=readFileSync(new URL(`../test-data/contradb/${id}.json`,import.meta.url),'utf8'),prepared=prepareContraDbReview(raw,[],{...REGISTERED_MOTION_CAPABILITIES,...override});
  assert.ok(prepared.result.dance,prepared.result.errors.join('; '));
  const disabled={...REGISTERED_MOTION_CAPABILITIES,...Object.fromEntries(Object.keys(override).map(key=>[key,false]))};
  assert.equal(prepareContraDbReview(prepared.result.dance.sourceText,[],disabled).result.dance,undefined,'an archived interpretation cannot grant disabled runtime capabilities');
  assert.throws(()=>compileChoreography(prepared.result.dance!,2,disabled),/reviewed|registered|adapter/);
 }
});


test('the held-quarter precursor stays gated even without any give-and-take figure',()=>{
 const d=structuredClone(review().result.dance!);d.figures[4]={id:'ordinary-lines',kind:'long-lines',beats:8,label:'Long lines'};
 assert.ok(d.figures.every(f=>f.kind!=='give-and-take'));
 for(const compile of[compileChoreography,compileDance]){
  assert.throws(()=>compile(d,2,{...REGISTERED_MOTION_CAPABILITIES,heldQuarterAllemandes:false}),/quarter-ending allemande/);
  assert.throws(()=>compile(d,2,{...REGISTERED_MOTION_CAPABILITIES,giveAndTakes:true,heldQuarterAllemandes:false}),/quarter-ending allemande/);
 }
});
