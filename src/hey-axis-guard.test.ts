import test from 'node:test';
import assert from 'node:assert/strict';
import {compileChoreography} from './choreography.ts';
import {compileDance} from './engine.ts';
import {compileHalfHeyFigure,type FigureContext} from './extended-figures.ts';
import {compileOrdinaryHalfHeyFigure} from './ordinary-half-hey.ts';
import {compileOrdinaryFullHeyFigure} from './ordinary-full-hey.ts';
import {REGISTERED_MOTION_CAPABILITIES} from './capabilities.ts';
import {HAY_IN_THE_BARN} from '../test-data/ordinary-half-hey/fixtures.ts';

test('ordinary public and direct hey adapters cannot silently ignore a declared travel axis',()=>{
 const base=compileChoreography(HAY_IN_THE_BARN,2);
 const context:FigureContext={ids:[0,1,2,3],start:base.formationSample!(24).poses,dancers:base.dancers,relations:{epoch:0,partner:new Map([[0,1],[1,0],[2,3],[3,2]]),neighbor:new Map([[0,3],[3,0],[1,2],[2,1]])},bindingEpoch:0,next:HAY_IN_THE_BARN.figures[4]};
 for(const axis of ['across','left-diagonal','right-diagonal'] as const){
  const dance=structuredClone(HAY_IN_THE_BARN);dance.figures[3].heyAxis=axis;
  for(const capabilities of [REGISTERED_MOTION_CAPABILITIES,{...REGISTERED_MOTION_CAPABILITIES,diagonalHalfHeys:true}]){
   assert.throws(()=>compileChoreography(dance,2,capabilities),/axis|diagonal/i);
   assert.throws(()=>compileDance(dance,2,capabilities),/axis|diagonal/i);
  }
  for(const compiler of [compileHalfHeyFigure,compileOrdinaryHalfHeyFigure,compileOrdinaryFullHeyFigure])assert.throws(()=>compiler(dance.figures[3],context),/axis|diagonal/i);
 }
 assert.deepEqual(compileChoreography(HAY_IN_THE_BARN,2).sample(30),base.sample(30));
});
