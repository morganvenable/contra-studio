import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {prepareContraDbReview} from './source-review.ts';
import {readContraDbImport} from './contradb-import.ts';
import {REGISTERED_MOTION_CAPABILITIES} from './capabilities.ts';
const raw=(id:number)=>readFileSync(new URL(`../test-data/contradb/${id}.json`,import.meta.url),'utf8');
const caps={...REGISTERED_MOTION_CAPABILITIES,ringPassThroughs:true};
test('actual final ring/pass sources retain four source counts, the original marker and explicit shoulder/neighbor choice',()=>{
 for(const id of[671,2235]){const p=prepareContraDbReview(raw(id),[],caps),r=p.result;assert.ok(r.dance,JSON.stringify(r.errors));const last=r.rows.at(-1)!;assert.equal(last.source.beats,4);assert.equal(last.source.progression,true);assert.deepEqual(p.interpretation.rows![last.source.id].passThrough,{relation:'neighbor',passingShoulder:'right'});assert.deepEqual([last.figures[0].kind,last.figures[0].who,last.figures[0].entry,last.figures[0].exit,last.figures[0].passingShoulder],['pass-through','neighbor','ring','progressed-neighbors','right']);assert.equal(r.dance.figures.filter(f=>f.progression).length,1);assert.equal(r.dance.figures.reduce((n,f)=>n+f.beats,0),64);assert.equal(p.interpretation.progression,undefined);const replay=readContraDbImport(r.dance.sourceText,{capabilities:caps});assert.deepEqual(replay.dance?.figures,r.dance.figures);assert.equal(replay.record?.original,r.record!.original);assert.deepEqual(replay.interpretation,p.interpretation);}
});
test('ring passage keeps omitted choices unresolved and does not extend to other entries, directions or source qualifiers',()=>{
 const p=prepareContraDbReview(raw(671),[],caps),id='contradb:671:row:7';assert.equal(readContraDbImport(p.result.dance!.sourceText,{capabilities:{...caps,ringPassThroughs:false}}).dance,undefined);
 const c=structuredClone(p.interpretation);delete c.rows![id].passThrough;assert.equal(readContraDbImport(raw(671),{interpretation:c,capabilities:caps}).dance,undefined);
 for(const change of[{passingShoulder:'left'},{relation:'partner'},{extraTurn:true}]){const c=structuredClone(p.interpretation);Object.assign(c.rows![id].passThrough!,change);assert.equal(readContraDbImport(raw(671),{interpretation:c,capabilities:caps}).dance,undefined);}
 for(const [from,to]of[['pass through','pass through then turn alone'],['balance the ring','partners balance']]){const s=JSON.parse(raw(671));assert.ok(s.html.includes(from));s.html=s.html.replace(from,to);assert.equal(prepareContraDbReview(JSON.stringify(s),[],caps).result.dance,undefined);}
 const opening=prepareContraDbReview(raw(780),[],{...caps,ringStartSequences:false});assert.equal(opening.result.dance,undefined);assert.equal(opening.interpretation.progression,'end-of-cycle');assert.equal(opening.result.record!.rows.some(row=>row.progression),false);
});
