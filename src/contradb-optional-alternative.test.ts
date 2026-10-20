import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {optionalTableAlternative} from './source-alternatives.ts';
import {readContraDbSource} from './contradb-source.ts';
import {readContraDbImport} from './contradb-import.ts';
import {prepareContraDbReview} from './source-review.ts';
const raw=readFileSync(new URL('../test-data/contradb/1546.json',import.meta.url),'utf8');
const record=readContraDbSource(raw).record!;
function changeRow(index:number,change:(html:string)=>string):string {const source=JSON.parse(raw),row=record.rows[index],next=change(row.html);assert.notEqual(next,row.html);assert.ok(source.html.includes(row.html));source.html=source.html.replace(row.html,next);return JSON.stringify(source);}
function changePreamble(preamble:string):string {const source=JSON.parse(raw);const re=/(<div class="dance-show-preamble">)[\s\S]*?(?=<table)/;assert.match(source.html,re);source.html=source.html.replace(re,`$1<div>${preamble}</div></div>\n`);return JSON.stringify(source);}
test('optional alternate review retains the exact source and selects only the current right-and-left-through table',()=>{
 const p=prepareContraDbReview(raw),r=p.result;assert.ok(r.dance,JSON.stringify(r.errors));assert.equal(p.interpretation.preambleReview,'retain-table-optional-alternative');assert.equal(r.record!.preamble,record.preamble);assert.deepEqual(r.dance.figures.map(f=>f.kind),['balance','box-the-gnat','allemande','balance','swing','circle','swing','right-left-through','star']);assert.equal(r.dance.figures.reduce((n,f)=>n+f.beats,0),64);assert.ok(r.dance.figures.every(f=>f.kind!=='promenade'));assert.equal(r.dance.figures.at(-1)!.progression,true);assert.match(r.warnings.join(' '),/unselected alternative/);assert.match(r.warnings.join(' '),/not claimed to have been validated/);
 const choice=structuredClone(p.interpretation);delete choice.preambleReview;const blocked=readContraDbImport(raw,{interpretation:choice});assert.equal(blocked.dance,undefined);assert.ok(blocked.diagnostics.some(d=>d.code==='source-preamble-review'));
 const replay=readContraDbImport(r.dance.sourceText);assert.deepEqual(replay.record,r.record);assert.deepEqual(replay.dance?.figures,r.dance.figures);assert.deepEqual(replay.interpretation,p.interpretation);assert.equal(JSON.parse(r.dance.sourceText).snapshot.html,JSON.parse(raw).html);
});
test('optional alternate grammar requires exact optional wording and one unqualified current row',()=>{
 assert.ok(optionalTableAlternative({...record,title:'Unrelated title',sourceId:'99999'}));
 for(const preamble of [record.preamble+' Then clap.',record.preamble+'\nFace out.',record.preamble.replace('Could','Must'),record.preamble.replace('Could change','Then change'),record.preamble.replace('Could change','Instead change'),record.preamble.replace('Could change','Do not change'),record.preamble.replace('to promenade','to promenade right'),record.preamble.replace('to make','unless tired, to make'),record.preamble.replace('right and left through','neighbors right and left through'),'Could change right and left through to promenade.'])assert.equal(optionalTableAlternative({...record,preamble}),undefined,preamble);
 for(const text of ['partners promenade','neighbors right left through','right left through then clap','right left through without hands','right left through ⁋'])assert.equal(optionalTableAlternative({...record,rows:record.rows.map((r,i)=>i===5?{...r,text}:r)}),undefined,text);
 assert.equal(optionalTableAlternative({...record,rows:record.rows.map((r,i)=>i===5?{...r,beats:4}:r)}),undefined);
 assert.equal(optionalTableAlternative({...record,rows:record.rows.map((r,i)=>i===1?{...r,text:'right left through'}:r)}),undefined);
 assert.equal(optionalTableAlternative({...record,formation:'Becket'}),undefined);
});
test('fresh source mutations cannot use optional-review data to waive instructions or snapshot binding',()=>{
 const p=prepareContraDbReview(raw);
 const bad=[...['Must change','Then change','Instead change','Could change right now'].map(x=>changePreamble(record.preamble.replace('Could change',x))),changePreamble(record.preamble+' Then clap.'),changePreamble(record.preamble+'\nFace out.'),changeRow(5,h=>h.replace('right left through','partners promenade')),changeRow(5,h=>h.replace('right left through','right left through without hands')),changeRow(1,h=>h.replace('gentlespoons allemande left 1½','right left through')),changeRow(1,h=>h.replace('gentlespoons allemande left 1½','unrepresented movement'))];
 for(const input of bad){assert.equal(readContraDbImport(input,{interpretation:p.interpretation}).dance,undefined);assert.equal(prepareContraDbReview(input).result.dance,undefined);const archive=JSON.parse(p.result.dance!.sourceText);archive.snapshot=JSON.parse(input);assert.ok(readContraDbImport(JSON.stringify(archive)).diagnostics.some(d=>d.code==='snapshot-binding'));}
 const wrong=structuredClone(p.interpretation);wrong.preambleReview='corroborated-no-chain-variant';assert.equal(readContraDbImport(raw,{interpretation:wrong}).dance,undefined);
});
