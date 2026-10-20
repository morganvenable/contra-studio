import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {compileChoreography,compileBecketDance} from './choreography.ts';
import {compileDance} from './engine.ts';
import {prepareContraDbReview} from './source-review.ts';
import {BUTTER_CANDIDATE} from './catalog.ts';
import {SIMPLICITY_SWING,PANDORAS_BOX} from '../test-data/progression/fixtures.ts';
import {compileProgressingImproper} from './progressing-improper.ts';
import type {Dance} from './types.ts';
const source=(id:number)=>{const review=prepareContraDbReview(readFileSync(new URL(`../test-data/contradb/${id}.json`,import.meta.url),'utf8'));assert.ok(review.result.dance,review.result.errors.join('; '));return review.result.dance;};

test('public and direct improper compilers reject duplicate, misplaced and nonboolean source progression markers',()=>{
 for(const id of[180,1821,2484]){
  const dance=source(id);assert.equal(compileChoreography(dance,2).repeatable,true);
  for(const mutate of[
   (d:Dance)=>{d.figures[0].progression=true;},
   (d:Dance)=>{d.figures.at(-1)!.progression=false;d.figures[0].progression=true;},
   (d:Dance)=>{(d.figures.at(-1)! as any).progression='yes';},
   (d:Dance)=>{(d.figures[0] as any).progression=0;}
  ]){const changed=structuredClone(dance);mutate(changed);for(const compile of[compileChoreography,compileDance])assert.throws(()=>compile(changed,2),/progression marker/i);}
  const inferred=structuredClone(dance);for(const f of inferred.figures)delete f.progression;assert.equal(compileChoreography(inferred,2).repeatable,true);
 }
});

test('source-bound event adapters retain valid mid-cycle progression and reject unrelated marker declarations',()=>{
 for(const original of[SIMPLICITY_SWING,PANDORAS_BOX]){
  assert.equal(compileChoreography(original,2).repeatable,true);
  const eventIndex=original.figures.findIndex(f=>f.id===original.progressionEvents![0].afterFigureId);
  const wrong=eventIndex===0?1:0;
  for(const mutation of['duplicate','moved','nonboolean']){const dance=structuredClone(original);for(const f of dance.figures)f.progression=false;dance.figures[eventIndex].progression=true;if(mutation==='moved')dance.figures[eventIndex].progression=false;if(mutation==='nonboolean')(dance.figures[eventIndex] as any).progression='yes';else dance.figures[wrong].progression=true;assert.throws(()=>compileChoreography(dance,2),/progression marker/i);}
 }
 const direct=structuredClone(SIMPLICITY_SWING);direct.figures[0].progression=true;const declaration=direct.progressionEvents![0];assert.throws(()=>compileProgressingImproper(direct,2,{...declaration,count:1,waitingRoleArrangement:'lark-left'}),/progression marker/i);
 // The actual Frederick source has a legitimate first-pass exception at beat 8.
 const deferred=source(66);assert.equal(compileChoreography(deferred,2).repeatable,true);
});

test('opening-shift Becket accepts only its actual shift-boundary marker',()=>{
 for(const compile of[compileChoreography,compileBecketDance]){
  const dance=structuredClone(BUTTER_CANDIDATE);dance.figures[0].progression=true;assert.equal(compile(dance,2).repeatable,true);
  dance.figures.at(-1)!.progression=true;assert.throws(()=>compile(dance,2),/progression marker/i);
  dance.figures[0].progression=false;assert.throws(()=>compile(dance,2),/progression marker/i);
 }
});
