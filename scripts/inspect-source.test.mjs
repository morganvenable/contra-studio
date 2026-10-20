import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {parseArgs,inspectSources} from './inspect-source.mjs';

test('CLI requires bounded explicit IDs and finite supported couple counts',()=>{
 for(const args of[[],['../110'],['0'],['831','--couples=NaN'],['831','--couples=3.5'],['831','--couples=13'],['831','--couples=3','--couples=4'],['110','--review','--review'],Array(21).fill('831')])assert.throws(()=>parseArgs(args));
 assert.deepEqual(parseArgs(['831','831','110','--couples=3']),{ids:['831','110'],couples:3});
 assert.deepEqual(parseArgs(['--help']),{help:true});
});

test('explicit review labels suggestions and exposes current 110 blocker without inventing an executable dance',async()=>{
 const before=readFileSync(new URL('../test-data/contradb/110.json',import.meta.url),'utf8');
 const report=await inspectSources(['110','831'],{review:true,couples:3});
 const [held,ready]=report.sources;
 assert.equal(held.review.status,'suggested-not-authored');assert.equal(held.review.baselineCoverage.resolvedRows,5);assert.equal(held.coverage.resolvedRows,8);
 assert.ok(held.review.suggestions.items.some(s=>s.kind==='conventional-timing'));assert.ok(held.review.choices.items.some(c=>c.path.endsWith('.balanceBeats')&&c.valueJson==='4'));
 assert.ok(held.diagnostics.items.some(d=>d.code==='unsupported-figure-variant'&&d.row===3));assert.equal(held.compilation.status,'not-run');assert.equal(held.coverage.executable,false);
 assert.equal(ready.review.status,'saved-choices-retained');assert.equal(ready.review.suggestions.total,0);assert.equal(ready.compilation.status,'compiled');
 assert.equal(readFileSync(new URL('../test-data/contradb/110.json',import.meta.url),'utf8'),before);
});

test('offline inspection distinguishes saved choices, unresolved snapshots, metadata and absence',async()=>{
 const previous=globalThis.fetch;globalThis.fetch=()=>{throw Error('Inspection must stay offline');};
 try{
  // Select an actual metadata-only record so newly retained candidate fixtures
  // do not turn this availability test into an obsolete backlog assertion.
  const catalogue=JSON.parse(readFileSync(new URL('../public/contradb-index.json',import.meta.url),'utf8'));
  const metadataId=catalogue.records.find(record=>!existsSync(new URL(`../test-data/contradb/${record.id}.json`,import.meta.url))).id;
  const report=await inspectSources(['831','110',String(metadataId),'9999999999'],{couples:3});
  const [ready,held,metadata,absent]=report.sources;
  assert.equal(ready.availability,'ready-archive');assert.equal(ready.coverage.executable,true);assert.equal(ready.compilation.status,'compiled');assert.equal(ready.compilation.totalBeats,64);assert.equal(ready.compilation.declaredPeriod.periodRepeats,6);assert.ok(ready.compilation.adapters.items.includes('neighbor-dosido-exchange'));
  assert.equal(held.availability,'retained-snapshot');assert.equal(held.coverage.executable,false);assert.ok(held.unresolvedRows.total>0);assert.equal(held.compilation.status,'not-run');
  assert.equal(metadata.availability,'metadata-only');assert.equal(metadata.figures,undefined);assert.equal(metadata.compilation.status,'not-run');
  assert.equal(absent.availability,'absent');assert.equal(absent.title,undefined);
  const json=JSON.stringify(report);assert.ok(json.length<20000);assert.equal(json.includes('"html"'),false);assert.equal(json.includes('"archive"'),false);assert.equal(json.includes('"poses"'),false);
 }finally{globalThis.fetch=previous;}
});
