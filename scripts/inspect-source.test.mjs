import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {parseArgs,inspectSources} from './inspect-source.mjs';

test('CLI requires bounded explicit IDs and finite supported couple counts',()=>{
 for(const args of[[],['../110'],['0'],['831','--couples=NaN'],['831','--couples=3.5'],['831','--couples=13'],['831','--couples=3','--couples=4'],Array(21).fill('831')])assert.throws(()=>parseArgs(args));
 assert.deepEqual(parseArgs(['831','831','110','--couples=3']),{ids:['831','110'],couples:3});
 assert.deepEqual(parseArgs(['--help']),{help:true});
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
