import test from 'node:test';import assert from 'node:assert/strict';
import {compileChoreography} from './choreography.ts';
import {probePetronellaTransitions} from '../test-data/petronella/mesh-probe.ts';
import {reviewedFullHey,FULL_HEY_CAPABILITIES as caps} from '../test-data/ordinary-full-hey/source-fixture.ts';

test('actual full hey and adjoining chain/next-neighbor transition clear other bodies in dense articulated mesh samples',t=>{
 globalThis.document={createElement:()=>({getContext:()=>new Proxy({},{get:()=>()=>{},set:()=>true})})}as unknown as Document;
 const {dance}=reviewedFullHey();
 for(const count of[2,3,6]){const c=compileChoreography(dance,count,caps),rounds=count===3?6:1,beats=Array.from({length:rounds},(_,r)=>r).flatMap(r=>Array.from({length:17*20+1},(_,i)=>r*64+47.5+i/20)),out=probePetronellaTransitions(c,beats);t.diagnostic(JSON.stringify({count,...out}));assert.ok(out.minimum>=-.05,`unrelated limb, torso or head collision: ${JSON.stringify({count,...out})}`);assert.ok(out.minimumSelfForearmTorso>=-.05,'existing free-hand/shirt styling is separately bounded');}
 // The probe poses the actual Avatar and checks both limb-mesh directions plus
 // the actual shirt profile and conservative head envelope. It is an offline
 // sampled regression, not a continuous whole-body certificate or GPU proof.
});
