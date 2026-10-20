import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {prepareContraDbReview} from './source-review.ts';
import {readContraDbImport,normalizeContraDbRow} from './contradb-import.ts';
import {readContraDbSource,makeContraDbSnapshot} from './contradb-source.ts';
import {corroboratedTeachingSummary} from './contradb-annotations.ts';
import {REGISTERED_MOTION_CAPABILITIES} from './capabilities.ts';
const caps=REGISTERED_MOTION_CAPABILITIES;
const raw=(id:string)=>readFileSync(new URL(`../test-data/contradb/${id}.json`,import.meta.url),'utf8');
const specs=[{id:'896',title:'Saturday Night Fever',author:'Erik Hoffman',beats:[16,8,8,8,8,8,8],squareRows:[5,6],receivers:[[4,'neighbor']]},{id:'146',title:'Friday Night Fever',author:'Tony Parkes',beats:[16,8,8,8,8,16],squareRows:[5],receivers:[[4,'neighbor']]},{id:'2364',title:'When It Chains It Pours',author:'Deanna Rubin',beats:[16,8,8,16,8,8],squareRows:[5],receivers:[[1,'partner'],[4,'neighbor']]}]as const;
for(const spec of specs)test(`${spec.id} actual source, removable choices and archive use the common square sequence`,()=>{
 const p=prepareContraDbReview(raw(spec.id),[],caps),r=p.result.record!;assert.ok(p.result.dance,p.result.errors.join('; '));const d=p.result.dance!;
 assert.equal(r.title,spec.title);assert.equal(r.author,spec.author);assert.deepEqual(r.rows.map(r=>r.beats),spec.beats);assert.equal(d.figures.reduce((n,f)=>n+f.beats,0),64);assert.deepEqual(r.rows.filter(r=>r.progression).map(r=>r.index),[r.rows.length-1]);
 assert.equal(d.progressionEvents?.length,1);assert.equal(d.progressionEvents![0].afterFigureId,d.figures.at(-1)!.id);assert.equal(d.progressionEvents![0].source.sourceId,r.snapshotId);assert.equal(d.progressionEvents![0].source.url,r.sourceUrl);assert.equal(d.progressionEvents![0].source.basis,'source-explicit');assert.equal(d.endPolicy,undefined);
 for(const[index,receiver]of spec.receivers)assert.equal(p.interpretation.rows![r.rows[index].id].chainReceiver,receiver);
 for(const index of spec.squareRows)assert.deepEqual(p.interpretation.rows![r.rows[index].id].squareThrough,{phaseBeats:[4,2,2]});
 const archive=JSON.parse(d.sourceText);assert.deepEqual(archive.snapshot,JSON.parse(JSON.stringify(makeContraDbSnapshot(r))));assert.deepEqual(archive.interpretation,p.interpretation);assert.deepEqual(readContraDbImport(d.sourceText,{capabilities:caps}).dance,d);
 for(const[rowId,choices]of Object.entries(p.interpretation.rows??{}))for(const key of Object.keys(choices)){const c=structuredClone(p.interpretation);delete(c.rows![rowId]as Record<string,unknown>)[key];assert.equal(readContraDbImport(raw(spec.id),{interpretation:c,capabilities:caps}).dance,undefined,`${rowId}.${key}`);}
 if(spec.id==='146'){assert.equal(r.publication,'shared to sketchbook');assert.ok(p.result.diagnostics.some(d=>d.code==='sketchbook-source'));const chain=d.figures.find(f=>f.kind==='robins-chain')!;assert.equal(chain.exit,'partners-facing-across');assert.equal(chain.hands,'right');const units=d.figures.filter(f=>f.kind==='square-through');assert.deepEqual(units.map(f=>[f.id,f.beats,f.exit,!!f.progression]),[[`${r.rows[5].id}:first`,8,'partners-facing-across',false],[`${r.rows[5].id}:repeat`,8,'progressed-neighbors',true]]);assert.ok(units.every(f=>f.label===r.rows[5].text));}
 if(spec.id==='2364'){assert.equal(p.interpretation.notesReview,'corroborated-teaching-summary');const c=structuredClone(p.interpretation);delete c.notesReview;assert.equal(readContraDbImport(raw(spec.id),{interpretation:c,capabilities:caps}).dance,undefined);}
 assert.equal(readContraDbImport(d.sourceText,{capabilities:{...caps,stateCarryingSequences:false}}).dance,undefined);
});
test('row grammar preserves literal repetition and the named partner-facing chain assertion',()=>{
 const r=readContraDbSource(raw('146')).record!,square=r.rows[5],chain=r.rows[4];
 const normalized=normalizeContraDbRow(square,'duple-improper',{squareThrough:{phaseBeats:[4,2,2]}},caps);assert.equal(normalized.resolved,true);assert.equal(normalized.figures.length,2);assert.deepEqual(normalized.figures.map(f=>!!f.progression),[false,true]);
 for(const text of[square.text.replace('then repeat','then swing'),square.text.replace('four','two'),square.text.replace('then neighbors','then partners'),square.text+' if active'])assert.equal(normalizeContraDbRow({...square,text},'duple-improper',{squareThrough:{phaseBeats:[4,2,2]}},caps).resolved,false);
 assert.equal(normalizeContraDbRow(chain,'duple-improper',{chainReceiver:'neighbor'},caps).resolved,true);
 for(const text of[chain.text.replace('right hand','left hand'),chain.text.replace('partner across','neighbor across'),chain.text+' then turn'])assert.equal(normalizeContraDbRow({...chain,text},'duple-improper',{chainReceiver:'neighbor'},caps).resolved,false);
});
test('the teaching-note choice corroborates local table claims without waiving added instructions',()=>{
 const record=readContraDbSource(raw('2364')).record!;assert.ok(corroboratedTeachingSummary(record));
 for(const note of[record.notes+' Then clap.',record.notes.replace('two chains','three chains'),record.notes.replace('followed by B&S','preceded by B&S')])assert.equal(corroboratedTeachingSummary({...record,notes:note}),undefined);
 const changed=structuredClone(record);changed.rows[1].text='long lines forward & back';assert.equal(corroboratedTeachingSummary(changed),undefined);
 const after=structuredClone(record);after.rows[3].text='partners swing';assert.equal(corroboratedTeachingSummary(after),undefined);
});
test('fresh altered clauses and stale archive bindings cannot borrow the accepted square interpretation',()=>{
 for(const[id,from,to]of[['896','neighbors pull by left ⁋','neighbors pull by left'],['146','give right hand to partner','give left hand to partner'],['2364','there are two chains','there are three chains']]as const){const p=prepareContraDbReview(raw(id),[],caps);assert.ok(p.result.dance,p.result.errors.join('; '));const snapshot=JSON.parse(raw(id));assert.ok(snapshot.html.includes(from));snapshot.html=snapshot.html.replace(from,to);const input=JSON.stringify(snapshot);assert.notEqual(readContraDbSource(input).record?.snapshotId,p.result.record!.snapshotId);assert.equal(prepareContraDbReview(input,[],caps).result.dance,undefined);const archive=JSON.parse(p.result.dance!.sourceText);archive.snapshot=snapshot;const replay=readContraDbImport(JSON.stringify(archive),{capabilities:caps});assert.equal(replay.dance,undefined);assert.ok(replay.diagnostics.some(d=>d.code==='snapshot-binding'));}
});
