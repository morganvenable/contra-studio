import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {noChainVariantCredit,reviewSourceAnnotations} from './contradb-annotations.ts';
import {readContraDbSource} from './contradb-source.ts';
import {readContraDbImport} from './contradb-import.ts';
import {prepareContraDbReview} from './source-review.ts';
const raw=readFileSync(new URL('../test-data/contradb/3086.json',import.meta.url),'utf8');
const mutate=(from:string,to:string)=>{const s=JSON.parse(raw);assert.ok(s.html.includes(from),from);s.html=s.html.replace(from,to);return JSON.stringify(s);};
test('no-chain variant review preserves separate credits, complete source and removable choices',()=>{
 const p=prepareContraDbReview(raw),r=p.result;assert.ok(r.dance,JSON.stringify(r.errors));assert.equal(r.record!.author,'David Kaynor');assert.equal(r.record!.preamble,'no-chain variant by Maia McCormick');assert.equal(p.interpretation.preambleReview,'corroborated-no-chain-variant');assert.equal(noChainVariantCredit(r.record!),'Maia McCormick');assert.ok(r.rows.every(row=>row.resolved));assert.ok(r.dance.figures.every(f=>f.kind!=='robins-chain'));assert.equal(r.dance.figures.reduce((n,f)=>n+f.beats,0),64);assert.equal(r.dance.figures.at(-1)!.progression,true);assert.match(r.warnings.join(' '),/Variant credit “Maia McCormick” stays separate/);assert.match(r.warnings.join(' '),/no alternative source or authorship history is claimed/);
 const choices=structuredClone(p.interpretation);delete choices.preambleReview;const blocked=readContraDbImport(raw,{interpretation:choices});assert.equal(blocked.dance,undefined);assert.ok(blocked.diagnostics.some(d=>d.code==='source-preamble-review'));
 const replay=readContraDbImport(r.dance.sourceText);assert.deepEqual(replay.record,r.record);assert.deepEqual(replay.interpretation,p.interpretation);assert.deepEqual(replay.dance?.figures,r.dance.figures);assert.equal(JSON.parse(r.dance.sourceText).snapshot.html,JSON.parse(raw).html);
});
test('no-chain credit is an anchored constraint, never an instruction or unresolved-table waiver',()=>{
 const record=readContraDbSource(raw).record!;assert.equal(noChainVariantCredit({...record,title:'Different title',sourceId:'99999',preamble:'no-chain variant by Chris Page'}),'Chris Page');
 for(const preamble of ['no-chain variant by Maia McCormick; then clap','no-chain variant by Maia McCormick. Then Clap','no-chain variant by Maia McCormick\nFace out','no-chain variant by Maia McCormick and Turn Left','no-chain variant by Snap Fingers','no-chain variant by Tap Feet','no-chain variant by Kick High','no-chain variant by Run Away','no-chain variant by Crouch Low','no-chain variant by Lean Back','no-chain variant by Touch Elbows','no-chain variant by Then Clap','no-chain variant by Maia ThenClap','no-chain variant by Maia TurnLeft','no-chain variant by Maia TouchElbows','no-chain variant by Stand Still','no-chain variant by Jog Slowly','no-chain variant by Pivot Around','no-chain variant by Maia JogSlowly','no-chain variant by Maia PivotAround','no-chain variant by Reach High','no-chain variant by Only Ones','no-chain variant by Maia McCormick unless tired','no-chain variant by Maia McCormick, neighbors start left','chain variant by Maia McCormick','no-chain variant by Maia','no-chain variant by Alice Unknown'])assert.equal(noChainVariantCredit({...record,preamble}),undefined,preamble);
 for(const text of ['robins chain','half chain','chain over and back','neighbors swing then chain','chain and swing'])assert.equal(noChainVariantCredit({...record,rows:record.rows.map((r,i)=>i===2?{...r,text}:r)}),undefined,text);
 assert.equal(noChainVariantCredit({...record,formation:'becket'}),undefined);assert.equal(noChainVariantCredit({...record,rows:record.rows.map((r,i)=>i===2?{...r,beats:7}:r)}),undefined);
 assert.ok(reviewSourceAnnotations(record,{preambleReview:'corroborated-no-chain-variant',hasNoChainComposition:false}).diagnostics.some(d=>d.code==='source-preamble-choice-conflict'));
});
test('fresh preamble and table changes cannot reuse archived review as authority',()=>{
 const p=prepareContraDbReview(raw);const from='no-<u>chain</u> variant by Maia McCormick';
 for(const to of [from+'; then clap',from+'. Then Clap','no-chain variant by Turn Left','no-chain variant by Snap Fingers',from+'\nFace out']){const input=mutate(from,to);assert.equal(readContraDbImport(input,{interpretation:p.interpretation}).dance,undefined,to);assert.equal(prepareContraDbReview(input).result.dance,undefined,to);const a=JSON.parse(p.result.dance!.sourceText);a.snapshot=JSON.parse(input);assert.ok(readContraDbImport(JSON.stringify(a)).diagnostics.some(d=>d.code==='snapshot-binding'));}
 for(const to of ['partners chain','partners do si do once then clap','unrecognized action']){const input=mutate('partners do si do once',to);assert.equal(readContraDbImport(input,{interpretation:p.interpretation}).dance,undefined,to);}
});
