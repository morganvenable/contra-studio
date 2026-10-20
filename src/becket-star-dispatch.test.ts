import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {prepareContraDbReview} from './source-review.ts';import {REGISTERED_MOTION_CAPABILITIES} from './capabilities.ts';
import {compileChoreography} from './choreography.ts';import {compileStarProgressingBecket} from './becket-star-progression.ts';import {withBalanceStance} from './stance.ts';
import {reviewedBecketStar} from '../test-data/becket-star/fixture.ts';
const caps={progressionEvents:true,becketStarProgressions:true};

test('staged source-bound CCW dispatch preserves the actual renderer and formation paths without applying stance twice',()=>{
 const dance=reviewedBecketStar();for(const count of[2,3,6,12]){const publicPlan=compileChoreography(dance,count,caps),direct=withBalanceStance(compileStarProgressingBecket(dance,count,{...dance.progressionEvents![0],count:1,waitingRoleArrangement:'lark-left'}));assert.equal(publicPlan.totalBeats,64);assert.ok(publicPlan.repeatable);assert.ok(publicPlan.formationSample);assert.ok(Object.isFrozen(publicPlan)&&Object.isFrozen(publicPlan.dance.endPolicy));
  for(const beat of[0,8,15.5,16,19.5,20,32,34,39.99,40,44,48,56,64,104,127.99,64*count*2+16.5]){assert.deepEqual(publicPlan.sample(beat),direct.sample(beat));assert.deepEqual(publicPlan.formationSample!(beat),direct.formationSample!(beat));}
 }
});

test('public CCW gate cannot be supplied by a source or routed through the older clockwise adapter',()=>{
 const dance=reviewedBecketStar();assert.throws(()=>compileChoreography(dance,3,{...caps,becketStarProgressions:false}));assert.throws(()=>compileChoreography(dance,3,{...caps,progressionEvents:false}));
 const forged=structuredClone(dance)as typeof dance&{capabilities:unknown};forged.capabilities=caps;assert.throws(()=>compileChoreography(forged,3,{progressionEvents:true,becketStarProgressions:false}));
 const wrong=structuredClone(dance);wrong.circulation='cw';assert.throws(()=>compileChoreography(wrong,3,caps));delete wrong.endPolicy;assert.throws(()=>compileChoreography(wrong,3,caps));
 const missing=structuredClone(dance);delete missing.endPolicy;assert.throws(()=>compileChoreography(missing,3,caps));
});


test('actual source import matches the independently reviewed source fixture throughout full finite periods',()=>{
 const raw=readFileSync(new URL('../test-data/contradb/2446.json',import.meta.url),'utf8'),review=prepareContraDbReview(raw,[],{...REGISTERED_MOTION_CAPABILITIES,becketStarProgressions:true});assert.ok(review.result.dance,review.result.errors.join('\n'));
 for(const count of[2,3,6]){const imported=compileChoreography(review.result.dance,count,caps),fixture=compileChoreography(reviewedBecketStar(),count,caps);assert.deepEqual(imported.starts,fixture.starts);for(let beat=0;beat<=2*count*64;beat+=.5){const actual=imported.sample(beat),expected=fixture.sample(beat);assert.deepEqual(actual.poses,expected.poses);assert.deepEqual(actual.contacts,expected.contacts);assert.deepEqual(imported.formationSample!(beat).poses,fixture.formationSample!(beat).poses);}}
});


test('CCW public direction metadata names actual initial up/down travel independently from role placement',()=>{
 const dance=reviewedBecketStar();for(const count of[2,3,6,12]){const c=compileChoreography(dance,count,caps);for(const dancer of c.dancers){assert.equal(dancer.direction,dancer.couple%2?1:-1);assert.equal(c.dancers[dancer.id^1].direction,dancer.direction);if(dancer.couple<count-count%2){const entry=c.formationSample!(0).poses[dancer.id];assert.equal(Math.sign(entry.position.x),-dancer.direction);}}}
});
