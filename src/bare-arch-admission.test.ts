/** Public admission for the first carried standalone-arch slice. Motion and
 * finite paths live in the shared adapter/period tests, rather than here. */
import test from 'node:test';import assert from 'node:assert/strict';import{readFileSync}from'node:fs';
import{prepareContraDbReview}from'./source-review.ts';import{compileChoreography}from'./choreography.ts';import{compileDance}from'./engine.ts';import{compileStateSequence}from'./state-sequence.ts';import{REGISTERED_MOTION_CAPABILITIES}from'./capabilities.ts';
const caps=REGISTERED_MOTION_CAPABILITIES;
const dance=()=>{const p=prepareContraDbReview(readFileSync(new URL('../test-data/contradb/1098.json',import.meta.url),'utf8'),[],caps);assert.ok(p.result.dance,p.result.errors.join('; '));return p.result.dance;};
test('declared bare arches require their carried route and all underlying capabilities',()=>{
 const d=dance();assert.equal(compileChoreography(d,3,caps).repeatable,true);
 for(const gate of['stateCarryingArchPullBys','stateCarryingSequences','archExchanges','namedPullBys','progressionEvents']as const)assert.throws(()=>compileChoreography(d,3,{...caps,[gate]:false}),gate);
 assert.throws(()=>compileDance(d,3,caps),/state-carrying|progression|event/i,'legacy direct compiler does not silently ignore the carried contract');
});
test('bare-arch progression stays a separate exact terminal source declaration',()=>{
 const d=dance();
 for(const mutate of[(x:typeof d)=>{delete x.progressionEvents;},(x:typeof d)=>{x.progressionEvents=[];},(x:typeof d)=>{x.progressionEvents![0].afterFigureId=x.figures[0].id;},(x:typeof d)=>{x.progressionEvents!.push(structuredClone(x.progressionEvents![0]));},(x:typeof d)=>{x.figures.at(-1)!.progression=false;}]){
  const x=structuredClone(d);mutate(x);assert.throws(()=>compileChoreography(x,3,caps));assert.throws(()=>compileStateSequence(x,3,caps));
 }
});
