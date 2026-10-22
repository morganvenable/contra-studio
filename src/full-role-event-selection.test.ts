import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {prepareContraDbReview} from './source-review.ts';import {readContraDbImport} from './contradb-import.ts';import {compileChoreography} from './choreography.ts';import {READY_LIBRARY} from './ready-library.ts';
test('a full role return preserves an established terminal ring-pass route',()=>{
 const review=prepareContraDbReview(readFileSync(new URL('../test-data/contradb/671.json',import.meta.url),'utf8'));
 assert.ok(review.result.dance,review.result.errors.join('; '));assert.equal(review.result.dance.progressionEvents,undefined);
 const historical=readContraDbImport(READY_LIBRARY.find(r=>r.id==='671')!.archive);assert.ok(historical.dance);
 const a=compileChoreography(review.result.dance,3),b=compileChoreography(historical.dance,3);
 for(const beat of[0,24,24.8,28.16,31.84,32,40,56,60,64,88,88.8,92.16,95.84,96,104,128]){
  const actual=a.sample(beat),expected=b.sample(beat);assert.deepEqual(actual.poses,expected.poses);assert.deepEqual(actual.contacts,expected.contacts);assert.deepEqual([actual.beat,actual.localBeat,actual.figureIndex,actual.figureProgress,actual.repeat],[expected.beat,expected.localBeat,expected.figureIndex,expected.figureProgress,expected.repeat]);
 }
});
test('a full role return still enables the explicit terminal long-lines progression',()=>{
 const review=prepareContraDbReview(readFileSync(new URL('../test-data/contradb/67.json',import.meta.url),'utf8'));
 assert.ok(review.result.dance,review.result.errors.join('; '));assert.equal(review.result.dance.progressionEvents?.[0].afterFigureId,review.result.dance.figures.at(-1)!.id);assert.equal(review.result.dance.figures.at(-1)!.kind,'long-lines');
});
