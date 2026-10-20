import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {prepareContraDbReview} from './source-review.ts';
import {compileChoreography} from './choreography.ts';
import {compileDance} from './engine.ts';
import {stateSequenceApplicability} from './sequence-admission.ts';
import {REGISTERED_MOTION_CAPABILITIES} from './capabilities.ts';
import type {Dance,MotionCapabilities} from './types.ts';
const caps:MotionCapabilities=REGISTERED_MOTION_CAPABILITIES;
const cache=new Map<number,Dance>();
function source(id:number):Dance{const found=cache.get(id);if(found)return found;const p=prepareContraDbReview(readFileSync(new URL(`../test-data/contradb/${id}.json`,import.meta.url),'utf8'),[],caps);assert.ok(p.result.dance,p.result.errors.join('; '));cache.set(id,p.result.dance);return p.result.dance;}

test('new role exchanges and neutral full heys select one explicit-event common route',()=>{
 for(const id of[522,3115,975,1983,3214]){
  const dance=source(id);assert.equal(stateSequenceApplicability(dance),'applicable');assert.equal(dance.progressionEvents?.length,1);
  assert.equal(dance.progressionEvents![0].afterFigureId,dance.figures.at(-1)!.id);assert.equal(dance.figures.reduce((n,f)=>n+f.beats,0),64);
  const p=compileChoreography(dance,2,caps);assert.equal(p.repeatable,true);assert.equal(p.totalBeats,64);
  const {progressionEvents:_events,...withoutEvents}=dance;
  assert.equal(stateSequenceApplicability(withoutEvents),'applicable');
  assert.throws(()=>compileChoreography(withoutEvents,2,caps),/one explicit source-bound terminal event/);
  assert.throws(()=>compileDance(withoutEvents,2,caps),/state-carrying/);
 }
});

test('selected role/hey routes cannot fall back after disabled gates or invalid events',()=>{
 for(const id of[522,3115,975,1983,3214]){
  const dance=source(id),gate=id===522||id===3115?'stateCarryingRoleDosidos':'stateCarryingFullHeys';
  for(const disabled of[gate,'stateCarryingSequences','progressionEvents',...(gate==='stateCarryingFullHeys'?['ordinaryFullHeys']:[])])assert.throws(()=>compileChoreography(dance,2,{...caps,[disabled]:false}),`${id} ${disabled}`);
  for(const events of[[],[{...dance.progressionEvents![0],count:2}],[{...dance.progressionEvents![0],afterFigureId:dance.figures[0].id}]])assert.throws(()=>compileChoreography({...dance,progressionEvents:events} as Dance,2,caps));
 }
});
