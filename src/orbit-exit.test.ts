import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Avatar} from './scene.ts';
import {prepareContraDbReview} from './source-review.ts';
import {compileChoreography} from './choreography.ts';
import type {StudioState} from './types.ts';
globalThis.document={createElement:()=>({getContext:()=>new Proxy({},{get:()=>()=>{},set:()=>true})})} as unknown as Document;
test('source773 shared orbit profiles preserve one beat steps without opening-radius leg overreach',()=>{
 const r=prepareContraDbReview(readFileSync(new URL('../test-data/contradb/773.json',import.meta.url),'utf8')).result;
 assert.ok(r.dance,r.errors.join('; '));const dance=r.dance,c=compileChoreography(dance,6),avatars=c.dancers.map(d=>new Avatar(d)),state={dance,showLabels:false}as StudioState;
 for(let k=0;k<=2560;k++){
  const beat=k/40,frame=c.sample(beat),cache=new Map<number,ReturnType<typeof c.sample>>(),sample=(b:number)=>{if(!cache.has(b))cache.set(b,c.sample(b));return cache.get(b)!;};
  for(const a of avatars){a.update(frame.poses[a.dancer.id],frame,state,sample);const gait=a.root.userData.gait;assert.equal(gait.phase,beat);assert.equal(gait.maxRate,1);assert.equal(gait.reachClamps,0,`unreachable step at ${beat}/${a.dancer.id}`);}
 }
 for(const a of avatars)a.dispose();
});
test('source content cannot enable a relation-event compiler through a stored field',()=>{
 const r=prepareContraDbReview(readFileSync(new URL('../test-data/contradb/773.json',import.meta.url),'utf8')).result;
 assert.ok(r.dance);const dance={...r.dance,progressionEvents:[]};
 assert.throws(()=>compileChoreography(dance,6,{progressionEvents:false}),/event-aware formation compiler/);
 assert.throws(()=>compileChoreography(dance),/exactly one explicit/);
});
