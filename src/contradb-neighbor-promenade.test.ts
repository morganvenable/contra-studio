import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {prepareContraDbReview} from './source-review.ts';
import {readContraDbImport} from './contradb-import.ts';
import {REGISTERED_MOTION_CAPABILITIES} from './capabilities.ts';
const raw=(id:number)=>readFileSync(new URL(`../test-data/contradb/${id}.json`,import.meta.url),'utf8');
const caps={...REGISTERED_MOTION_CAPABILITIES,neighborPromenades:true};
test('actual neighbor promenade sources preserve the named current relation, counts and archived conventional choices',()=>{
 for(const id of[2194,1448]){const p=prepareContraDbReview(raw(id),[],caps),r=p.result;assert.ok(r.dance,JSON.stringify(r.errors));const row=r.rows.find(row=>row.source.text==='neighbors promenade')!;assert.equal(row.figures[0].who,'neighbor');assert.equal(row.figures[0].beats,8);assert.equal(r.dance.figures.reduce((n,f)=>n+f.beats,0),64);assert.match(row.interpretations.join(' '),/neighbor half-promenade/);assert.equal(p.interpretation.rows![row.source.id].promenade!.passingShoulder,'left');const replay=readContraDbImport(r.dance.sourceText,{capabilities:caps});assert.deepEqual(replay.dance?.figures,r.dance.figures);assert.deepEqual(replay.interpretation,p.interpretation);assert.equal(replay.record?.original,r.record!.original);if(id===2194){assert.equal(r.record!.rows.some(x=>x.progression),false);assert.equal(p.interpretation.progression,'end-of-cycle');}else assert.equal(p.interpretation.progression,undefined);}
});
test('neighbor promenade source choices cannot grant a staged capability or waive distinct allemande ingress',()=>{
 const p=prepareContraDbReview(raw(2194),[],caps),id='contradb:2194:row:5';for(const cap of['neighborPromenades','promenades'])assert.equal(readContraDbImport(p.result.dance!.sourceText,{capabilities:{...caps,[cap]:false}}).dance,undefined);
 const cleared=structuredClone(p.interpretation);delete cleared.rows![id].promenade;assert.equal(readContraDbImport(raw(2194),{interpretation:cleared,capabilities:caps}).dance,undefined);
 for(const change of[{passingShoulder:'right'},{who:'partner'},{hold:'none'}]){const c=structuredClone(p.interpretation);Object.assign(c.rows![id].promenade!,change);assert.equal(readContraDbImport(raw(2194),{interpretation:c,capabilities:caps}).dance,undefined);}
 const changed=JSON.parse(raw(2194));changed.html=changed.html.replace('neighbors promenade','neighbors promenade then reverse');assert.equal(prepareContraDbReview(JSON.stringify(changed),[],caps).result.dance,undefined);
 const other=prepareContraDbReview(raw(1744),[],{...caps,allemandePromenadeHandoffs:false});assert.equal(other.result.dance,undefined);assert.ok(other.result.diagnostics.some(d=>d.code.startsWith('motion')),'distinct incoming allemande is a geometry check, not silently repaired');
});
