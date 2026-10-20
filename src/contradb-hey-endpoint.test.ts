import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {prepareContraDbReview} from './source-review.ts';
import {readContraDbImport} from './contradb-import.ts';
import {REGISTERED_MOTION_CAPABILITIES} from './capabilities.ts';
const raw=readFileSync(new URL('../test-data/contradb/1191.json',import.meta.url),'utf8');
const cue='look for new <u>neighbors</u> in line of progression  on the side of set';
const changed=(from:string,to:string)=>{const value=JSON.parse(raw);assert.ok(value.html.includes(from),from);value.html=value.html.replace(from,to);return JSON.stringify(value);};
test('actual terminal full hey retains textual endpoint evidence separately from its absent glyph and reviewed scope',()=>{
 const p=prepareContraDbReview(raw),r=p.result;assert.ok(r.dance,JSON.stringify(r.errors));assert.equal(r.rows.length,6);assert.equal(r.rows.at(-1)!.source.progression,false);assert.equal(r.rows.at(-1)!.progressionFromText,true);assert.match(r.rows.at(-1)!.terminalEndpointQualifier!,/line of progression/);assert.equal(p.interpretation.progression,undefined);
 assert.deepEqual(p.interpretation.rows!['contradb:1191:row:5'],{ordinaryHey:{sidePair:'neighbor',exit:'progressed-neighbors'},nextNeighborQualifier:'after-figure'});assert.equal(p.interpretation.rows!['contradb:1191:row:4'].chainReceiver,'neighbor');
 assert.equal(r.dance.figures.reduce((sum,f)=>sum+f.beats,0),64);assert.equal(r.dance.figures.filter(f=>f.progression).length,1);const hey=r.dance.figures.at(-1)!;assert.deepEqual([hey.kind,hey.beats,hey.amount,hey.heyStartRole,hey.centerShoulder,hey.endShoulder,hey.progression],['hey',16,1,'robin','right','left',true]);
 const replay=readContraDbImport(r.dance.sourceText);assert.deepEqual(replay.dance?.figures,r.dance.figures);assert.deepEqual(replay.interpretation,p.interpretation);assert.equal(replay.record?.original,r.record!.original);assert.equal(replay.record?.rows.at(-1)?.progression,false);
});
test('terminal full-hey wording and both removable context choices remain binding',()=>{
 const p=prepareContraDbReview(raw);for(const key of['ordinaryHey','nextNeighborQualifier']){const c=structuredClone(p.interpretation);delete (c.rows!['contradb:1191:row:5'] as Record<string,unknown>)[key];assert.equal(readContraDbImport(raw,{interpretation:c}).dance,undefined,key);}
 for(const patch of[{nextNeighborQualifier:'before-figure'},{ordinaryHey:{sidePair:'partner',exit:'progressed-neighbors'}},{ordinaryHey:{sidePair:'neighbor',exit:'opposite-paired-balance'}}]){const c=structuredClone(p.interpretation);Object.assign(c.rows!['contradb:1191:row:5'],patch);assert.equal(readContraDbImport(raw,{interpretation:c}).dance,undefined);}
 const badReceiver=structuredClone(p.interpretation);badReceiver.rows!['contradb:1191:row:4'].chainReceiver='partner';assert.equal(readContraDbImport(raw,{interpretation:badReceiver}).dance,undefined);
 assert.equal(readContraDbImport(p.result.dance!.sourceText,{capabilities:{...REGISTERED_MOTION_CAPABILITIES,ordinaryFullHeys:false}}).dance,undefined);
 for(const replacement of['',cue+' and clap',cue.replace('new','previous'),cue.replace('on the side','across the middle'),cue.replace('look for','do not look for')]){const revised=changed(cue,replacement);assert.equal(readContraDbImport(revised,{interpretation:p.interpretation}).dance,undefined,replacement);assert.equal(prepareContraDbReview(revised).result.dance,undefined,replacement);const archive=JSON.parse(p.result.dance!.sourceText);archive.snapshot=JSON.parse(revised);assert.ok(readContraDbImport(JSON.stringify(archive)).diagnostics.some(d=>d.code==='snapshot-binding'));}
});
