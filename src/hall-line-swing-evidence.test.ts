import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {readContraDbImport} from './contradb-import.ts';
import {compileHallLinePolicyDance} from './hall-line-policy.ts';
const dance=(id:string)=>{const r=readContraDbImport(readFileSync(new URL(`../test-data/reviewed-interpretations/${id}.json`,import.meta.url),'utf8'));assert.ok(r.dance);return r.dance;};
test('long-lines swing evidence names reached neighbors and bounds actual acquisition over finite repeats',()=>{
 for(const couples of[3,6]){const c=compileHallLinePolicyDance(dance('257'),couples);for(let repeat=0;repeat<2*couples;repeat++){const evidence=c.swingEntryEvidence(repeat);assert.equal(evidence.length,1);const e=evidence[0];assert.equal(e.kind,'compact-released-inward');assert.equal(e.sourceBeat,repeat*64+40);assert.deepEqual(e.heldAtEntry,[]);assert.ok(e.pairs.length);const initial=c.sample(e.sourceBeat),full=c.sample(e.sourceBeat+1.75),turn=c.sample(e.sourceBeat+1.25);for(const[a,b]of e.pairs){assert.notEqual(c.dancers[a].couple,c.dancers[b].couple);assert.notEqual(initial.poses[a].activity,'waiting');const contacts=full.contacts.filter(h=>h.kind==='swing-frame'&&(h.a===a&&h.b===b||h.a===b&&h.b===a));assert.equal(contacts.length,3);assert.ok(contacts.every(h=>h.strength>=1-1e-8));const angle=(f:typeof full)=>Math.atan2(f.poses[a].position.z-f.poses[b].position.z,f.poses[a].position.x-f.poses[b].position.x),delta=angle(turn)-angle(initial);assert.ok(Math.abs(Math.atan2(Math.sin(delta),Math.cos(delta)))>.005);}}assert.throws(()=>c.swingEntryEvidence(-1));assert.throws(()=>c.swingEntryEvidence(.5));}
});
test('other hall contracts do not claim a long-lines released entry',()=>{for(const id of['840','1618'])assert.deepEqual(compileHallLinePolicyDance(dance(id),3).swingEntryEvidence(0),[]);});
