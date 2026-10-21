import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {prepareContraDbReview} from './source-review.ts';import {compileStateSequence} from './state-sequence.ts';
import {compilePhasedStateSequence} from './phased-state-sequence.ts';import {REGISTERED_MOTION_CAPABILITIES as caps} from './capabilities.ts';
import type {Dance} from './types.ts';
function source(){const r=prepareContraDbReview(readFileSync(new URL('../test-data/contradb/166.json',import.meta.url),'utf8')).result;assert.ok(r.dance,r.errors.join('; '));return r.dance;}
function phased():Dance{const d=structuredClone(source());delete d.sourceRecord;delete d.sourceText;delete d.sourceRows;delete d.contraDbInterpretation;delete d.sourceUrl;d.id='synthetic-interior-passage';d.title='A differently placed source clock';d.figures=[...d.figures.slice(1),d.figures[0]];d.progressionEvents![0].source={sourceId:'synthetic-interior-passage',url:'https://example.test/interior',clause:'Progress at the declared pass, then do-si-do the new neighbor for eight counts.',basis:'source-explicit'};return d;}
for(const couples of [3,4])test(`interior event retains exact ${couples}-couple carried motion and original source clock`,()=>{
 const d=phased(),c=compilePhasedStateSequence(d,couples,caps),original=source(),canonical=compileStateSequence(original,couples,caps);
 assert.equal(c.totalBeats,64);assert.equal(c.starts.at(-1),56);assert.equal(c.dance.figures.at(-1)!.kind,'do-si-do');
 for(let repeat=0;repeat<c.periodRepeats;repeat++){
  assert.equal(c.topology(repeat*64+55.999999).epoch,repeat);assert.equal(c.topology(repeat*64+56).epoch,repeat+1);
  for(let local=0;local<64;local+=.25){const beat=repeat*64+local,f=c.sample(beat),expected=canonical.sample(beat+8);assert.deepEqual(f.poses,expected.poses);assert.deepEqual(f.contacts,expected.contacts);assert.equal(f.beat,beat);assert.equal(f.localBeat,local);assert.equal(f.repeat,repeat);assert.equal(d.figures[f.figureIndex].id,original.figures[expected.figureIndex].id);}
  for(const p of c.sequenceBoundaries(repeat)){assert.ok(p.entry.sourceBeat>=0&&p.exit.sourceBeat<=64);assert.equal(p.entry.relationshipEpoch,repeat+Number(p.entry.sourceBeat>=56));assert.equal(p.exit.relationshipEpoch,p.entry.relationshipEpoch);}
  for(const seam of [...c.starts,64]){if(repeat===0&&seam===0)continue;const before=c.sample(repeat*64+seam-1e-7),after=c.sample(repeat*64+seam);for(const p of after.poses)assert.ok(Math.hypot(p.position.x-before.poses[p.id].position.x,p.position.z-before.poses[p.id].position.z)<1e-5);}
 }
 assert.deepEqual(c.sample(64*c.periodRepeats).poses,c.sample(0).poses);assert.deepEqual(c.sample(64*c.periodRepeats).contacts,c.sample(0).contacts);
});
test('interior event cannot override missing, conflicting or reviewed-only declarations',()=>{
 for(const mutate of [(d:Dance)=>{delete d.progressionEvents;},(d:Dance)=>{d.progressionEvents![0].count=2;},(d:Dance)=>{d.progressionEvents![0].source.basis='reviewed-interpretation';},(d:Dance)=>{d.figures[0].progression=true;}]){const d=phased();mutate(d);assert.throws(()=>compilePhasedStateSequence(d,3,caps));}
});
test('phased sequence owns metadata and returns independent proof and frame data',()=>{const d=phased(),c=compilePhasedStateSequence(d,3,caps),frame=c.sample(0),proofs=c.sequenceBoundaries(0);d.figures[0].beats=99;assert.equal(c.totalBeats,64);assert.ok(Object.isFrozen(c.starts));assert.ok(Object.isFrozen(c.dance.figures));frame.poses[0].position.x+=100;assert.notEqual(c.sample(0).poses[0].position.x,frame.poses[0].position.x);const first=proofs[0].entry.poses[0].position.x;(proofs[0].entry.poses[0].position as {x:number}).x+=100;assert.equal(c.sequenceBoundaries(0)[0].entry.poses[0].position.x,first);assert.throws(()=>c.sample(NaN));assert.throws(()=>c.sequenceBoundaries(.5));});
