import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {prepareContraDbReview} from './source-review.ts';
import {compileChoreography} from './choreography.ts';
import {validateDance} from './validator.ts';
import {REGISTERED_MOTION_CAPABILITIES} from './capabilities.ts';
import {assertFigureArgumentsConsumed} from './figure-semantics.ts';
import type {Dance,Figure} from './types.ts';
const caps={...REGISTERED_MOTION_CAPABILITIES,revolvingDoors:true};
function actual():Dance {const r=prepareContraDbReview(readFileSync(new URL('../test-data/contradb/774.json',import.meta.url),'utf8'),[],caps).result;assert.ok(r.dance,JSON.stringify(r.diagnostics));return structuredClone(r.dance);}

test('retained774 uses real validation and an explicitly withdrawable revolving-door gate',()=>{
 const dance=actual(),report=validateDance(dance,caps);assert.equal(report.playable,true);assert.equal(report.repeatable,true);assert.equal(report.diagnostics.filter(d=>d.severity==='error').length,0);
 const c=compileChoreography(dance,3,caps);assert.equal(c.totalBeats,64);assert.ok(c.repeatable);assert.deepEqual(c.starts,[0,8,16,24,32,40,48,56]);assert.match(c.warnings.join(' '),/Schematic footwork/);
 assert.throws(()=>compileChoreography(dance,3,{...caps,revolvingDoors:false}),/Revolving doors/);
 assert.equal(REGISTERED_MOTION_CAPABILITIES.revolvingDoors,true);
 assert.equal(compileChoreography(dance,3).totalBeats,64);
 const contacts=c.sample(34).contacts;assert.ok(contacts.some(c=>c.target==='waist'&&c.handA==='right'&&c.bodyPoint?.y===1.18));
 for(const c of contacts.filter(c=>c.target==='waist'))assert.equal(c.a%2,0);
});

test('public composition consumes the exact partner swing8, door8, current-neighbor swing8 seam',()=>{
 const base=actual();
 for(const index of[3,5])for(const patch of[{beats:12},{who:index===3?'neighbor':'partner'},{progression:true},{entry:'paired-sidelines'},{exit:'face-down-line'},{direction:'right'},{amount:1},{hands:'right'},{notation:'WR'},{phaseBeats:[4,4]},{spinAmount:undefined}]){
  const d=structuredClone(base);Object.assign(d.figures[index],patch);assert.throws(()=>compileChoreography(d,3,caps),/revolving-door|Revolving|modifier|contract/);
 }
 for(const patch of[{who:'neighbor'},{beats:12},{direction:'left'},{amount:.5},{dropOffAfter:1},{approachHold:'joined-inside'},{entry:'ring'},{exit:'partner-swing'},{phaseBeats:[2,3,2,1]},{progression:true},{spinAmount:undefined}]){
  const d=structuredClone(base);Object.assign(d.figures[4],patch);assert.throws(()=>compileChoreography(d,3,caps),/revolving-door|Revolving|contract/);
 }
 const missing=structuredClone(base);missing.figures.splice(3,1);assert.throws(()=>compileChoreography(missing,3,caps),/revolving-door/);
 for(const index of[3,4,5]){const d=structuredClone(base);Object.defineProperty(d.figures[index],'ignoredSpin',{value:1});assert.throws(()=>compileChoreography(d,3,caps),/contract|modifier/);}
 const sparse=structuredClone(base);delete (sparse.figures[4].phaseBeats as number[])[1];assert.throws(()=>compileChoreography(sparse,3,caps),/contract/);
 assert.throws(()=>assertFigureArgumentsConsumed({...base.figures[0],dropOffAfter:.5}),/does not consume/);
});

test('source identity changes cannot select a hidden motion branch and public output owns its inputs',()=>{
 const a=actual(),b=structuredClone(a);b.id='renamed';b.title='A structural test';b.author='Different label';b.figures.forEach((f,i)=>{f.id=`renamed:${i}`;f.label=`Figure ${i}`;});
 const one=compileChoreography(a,3,caps),two=compileChoreography(b,3,caps);
 for(const beat of[0,23.9,24,31.9,32,33.25,37.35,37.75,38.65,39.5,40,64,96,104,191.9]){assert.deepEqual(one.sample(beat).poses,two.sample(beat).poses);assert.deepEqual(one.sample(beat).contacts,two.sample(beat).contacts);}
 const before=two.sample(37.5);b.figures[4].amount=2;(b.figures[4].phaseBeats as number[])[0]=7;b.figures[5].who='partner';assert.deepEqual(two.sample(37.5),before);assert.ok(Object.isFrozen(two.dance.figures[4].phaseBeats));
});
