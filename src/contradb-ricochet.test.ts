import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {prepareContraDbReview} from './source-review.ts';
import {readContraDbImport} from './contradb-import.ts';
import {REGISTERED_MOTION_CAPABILITIES} from './capabilities.ts';
const raw=()=>readFileSync(new URL('../test-data/contradb/1067.json',import.meta.url),'utf8');
const caps={...REGISTERED_MOTION_CAPABILITIES,ricochetHeys:true};
test('actual ricochet source retains its second-encounter role, exact phrase budgets and misplaced raw progression glyph',()=>{
 const p=prepareContraDbReview(raw(),[],caps),r=p.result;assert.ok(r.dance,JSON.stringify(r.errors));
 assert.equal(r.coverage.resolvedRows,6);assert.equal(r.dance.figures.reduce((n,f)=>n+f.beats,0),64);
 assert.deepEqual(r.rows.map(row=>row.figures.reduce((n,f)=>n+f.beats,0)),[16,16,16,8,4,4]);
 const hey=r.rows[1].figures[0];assert.equal(hey.kind,'ricochet-hey');assert.equal(hey.who,'neighbor');assert.equal(hey.ricochetExitRelation,'partner');assert.deepEqual(hey.ricochets,[{role:'lark',occurrence:2,direction:'back-left',facing:'across',hands:'both'}]);
 assert.equal(r.record!.rows[4].progression,true);assert.equal(r.record!.rows[5].progression,false);assert.match(r.record!.rows[4].text,/⁋/);assert.equal(r.rows[4].figures[0].progression,undefined);assert.equal(r.rows[5].figures[0].progression,true);assert.equal(r.dance.figures.filter(f=>f.progression).length,1);
 assert.deepEqual(r.rows[4].progressionScope,{sourceRowId:r.record!.rows[4].id,afterRowId:r.record!.rows[5].id});assert.match(r.rows[4].interpretations.join(' '),/glyph remains.*after the twirl/);
 const replay=readContraDbImport(r.dance.sourceText,{capabilities:caps});assert.deepEqual(replay.dance?.figures,r.dance.figures);assert.deepEqual(replay.interpretation,p.interpretation);assert.equal(replay.record?.original,r.record!.original);assert.equal(replay.record?.snapshotId,r.record!.snapshotId);
});
test('ricochet and marker-scope decisions remain required and cannot grant capabilities or erase source qualifications',()=>{
 const p=prepareContraDbReview(raw(),[],caps);assert.equal(readContraDbImport(p.result.dance!.sourceText,{capabilities:{...caps,ricochetHeys:false}}).dance,undefined);
 for(const [row,key]of[[1,'ricochetHey'],[4,'ringProgression']]as const){const c=structuredClone(p.interpretation);delete c.rows![`contradb:1067:row:${row}`][key];assert.equal(readContraDbImport(raw(),{interpretation:c,capabilities:caps}).dance,undefined);}
 for(const change of[{exitPair:'neighbor'},{bounceDirection:'forward-right'},{bounceHands:'none'},{amount:.5},{extraPass:true}]){const c=structuredClone(p.interpretation);Object.assign(c.rows!['contradb:1067:row:1'].ricochetHey!,change);assert.equal(readContraDbImport(raw(),{interpretation:c,capabilities:caps}).dance,undefined,JSON.stringify(change));}
 for(const [index,from,to]of[[1,'second time','first time'],[1,'<s>men</s> ricochet','<s>women</s> ricochet'],[4,'⁋',''],[5,'California twirl','California twirl then clap']]as const){const row=p.result.record!.rows[index],snapshot=JSON.parse(raw());assert.ok(row.html.includes(from));snapshot.html=snapshot.html.replace(row.html,row.html.replace(from,to));assert.equal(prepareContraDbReview(JSON.stringify(snapshot),[],caps).result.dance,undefined,`${from}→${to}`);}
 const c=structuredClone(p.interpretation);c.rows!['contradb:1067:row:3']={ringProgression:'after-following-twirl'};assert.equal(readContraDbImport(raw(),{interpretation:c,capabilities:caps}).dance,undefined);
});
