import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {prepareContraDbReview} from './source-review.ts';
import {compileChoreography} from './choreography.ts';
import type {Dance} from './types.ts';
import {REGISTERED_MOTION_CAPABILITIES} from './capabilities.ts';
import type {CompiledStateSequence} from './state-sequence.ts';

test('one public sequencer accepts an unseen rearrangement and keeps progression separate from square displacement',()=>{
 const result=prepareContraDbReview(readFileSync(new URL('../test-data/contradb/896.json',import.meta.url),'utf8')).result;assert.ok(result.dance,result.errors.join('; '));
 // A typed synthetic composition has its own evidence, not the source's archive.
 const dance:Dance={id:'synthetic-sequence',title:'Square, long lines, square',author:'Test',formation:'duple-improper',description:'Independent rearrangement',verified:false,sourceUrl:'https://example.invalid/synthetic-sequence',figures:structuredClone(result.dance.figures),progressionEvents:structuredClone(result.dance.progressionEvents)};
 dance.figures.splice(dance.figures.length-1,0,{id:'interposed-lines',kind:'long-lines',label:'Long lines between square units',who:'all',beats:8});
 dance.progressionEvents![0].source={sourceId:'synthetic-sequence',url:dance.sourceUrl!,clause:'One terminal progression after the second square.',basis:'reviewed-interpretation'};
 const program=compileChoreography(dance,2) as CompiledStateSequence;assert.equal(program.totalBeats,72);assert.equal(program.repeatable,true);
 assert.equal(program.topology(56).epoch,0);assert.equal(program.topology(72-1e-8).epoch,0);assert.equal(program.topology(72).epoch,1);assert.deepEqual(program.sample(0).poses,program.sample(288).poses);
 const proofs=program.sequenceBoundaries(0);assert.ok(proofs.some(p=>p.adapterId==='balanced-square-through'&&p.contactPolicy==='strict-carried'));assert.ok(proofs.some(p=>p.figureId==='interposed-lines'&&p.contactPolicy==='established-acquisition'&&p.incoming.sourceBeat===56));
 for(const alter of[(d:Dance)=>delete d.progressionEvents,(d:Dance)=>d.progressionEvents![0].afterFigureId=d.figures.find(f=>f.kind==='square-through')!.id,(d:Dance)=>d.progressionEvents![0].count=2]){const bad=structuredClone(dance);alter(bad);assert.throws(()=>compileChoreography(bad,2));}
});


test('legacy typed terminal-only squares keep their guarded route while new sequences require explicit events',()=>{
 const legacyCaps={...REGISTERED_MOTION_CAPABILITIES,stateCarryingSequences:false};
 const old=prepareContraDbReview(readFileSync(new URL('../test-data/contradb/3496.json',import.meta.url),'utf8'),[],legacyCaps).result.dance;assert.ok(old);assert.equal(old.progressionEvents,undefined);
 const before=compileChoreography(old,2,legacyCaps),after=compileChoreography(old,2);for(const t of[0,56,61,63,64])assert.deepEqual(after.sample(t),before.sample(t));
 for(const id of[896,146,2364]){const d=structuredClone(prepareContraDbReview(readFileSync(new URL(`../test-data/contradb/${id}.json`,import.meta.url),'utf8')).result.dance!);assert.ok(d);delete d.progressionEvents;assert.throws(()=>compileChoreography(d,2));}
});
