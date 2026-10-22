import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync,mkdtempSync,mkdirSync,writeFileSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {availabilityCounts,summarizeResult,aggregateViews,loadSnapshots,inventorySnapshots} from './audit-coverage.mjs';
test('local source inventory validates identity, keeps fixtures authoritative and rejects malformed additions',async()=>{
 const temp=mkdtempSync(join(tmpdir(),'contra-inventory-')),fixtureDir=join(temp,'fixtures'),snapshotDir=join(temp,'local');
 mkdirSync(fixtureDir);mkdirSync(snapshotDir);
 const fixture=id=>readFileSync(new URL(`../test-data/contradb/${id}.json`,import.meta.url),'utf8');
 try{
  writeFileSync(join(fixtureDir,'110.json'),fixture(110));
  writeFileSync(join(snapshotDir,'110.json'),'not valid JSON');
  writeFileSync(join(snapshotDir,'179.json'),fixture(179));
  writeFileSync(join(snapshotDir,'999.json'),fixture(179));
  writeFileSync(join(snapshotDir,'998.json'),'{');
  writeFileSync(join(snapshotDir,'997.json'),JSON.stringify({id:997,title:'metadata only'}));
  writeFileSync(join(snapshotDir,'progress.json'),'{}');
  const loaded=await loadSnapshots({fixtureDir,snapshotDir});
  assert.deepEqual([...loaded.snapshots.keys()],['110','179']);
  assert.equal(loaded.snapshots.get('110').kind,'fixture');
  assert.equal(loaded.shadowed.length,1);
  assert.equal(loaded.rejected.length,3);
  assert.match(loaded.rejected.find(s=>s.id==='999').reason,/identity/);
  const report=await inventorySnapshots({fixtureDir,snapshotDir});
  assert.equal(report.schema,'contra-studio/source-inventory');
  assert.equal(report.totals.validSnapshots,2);
  assert.equal(report.totals.rejectedFiles,3);
  assert.equal(report.sources.find(s=>s.id==='110').totalCounts,64);
  assert.ok(report.sources.every(s=>s.instructions.length===s.rows&&s.snapshotId&&s.sourceUrl));
  assert.equal(report.views,undefined);
 }finally{rmSync(temp,{recursive:true,force:true});}
});
test('availability accounts for overlapping and outside-catalogue sources exactly once',()=>{
 const a=availabilityCounts(['1','2','2','3'],['2','4'],['2','5']);
 assert.deepEqual([a.catalogue,a.retainedSnapshots,a.savedReady,a.union,a.metadataOnly],[3,2,2,5,2]);
 assert.equal(Object.values(a.categories).reduce((x,y)=>x+y,0),a.union);
});
test('checked-in census accounts for current retained files and all per-view source totals',()=>{
 const r=JSON.parse(readFileSync(new URL('../docs/coverage-audit.json',import.meta.url),'utf8'));
 const ids=readdirSync(new URL('../test-data/contradb/',import.meta.url)).filter(f=>/^\d+\.json$/.test(f)).map(f=>f.slice(0,-5)).sort();
 const catalogue=JSON.parse(readFileSync(new URL('../public/contradb-index.json',import.meta.url),'utf8'));
 assert.deepEqual(r.sources.filter(s=>s.retainedSnapshot).map(s=>s.id).sort(),ids);
 assert.equal(r.availability.retainedSnapshots,ids.length);
 assert.equal(r.availability.savedReady,r.sources.filter(s=>s.savedReady).length);
 const generated=JSON.parse(readFileSync(new URL('../qa/ready-library-generation.json',import.meta.url),'utf8'));
 assert.equal(r.availability.savedReady,generated.count,'census must match the current generated Ready package');
 assert.deepEqual(r.sources.filter(s=>s.savedReady).map(s=>s.id).sort(),generated.entries.map(s=>s.id).sort());
 assert.equal(r.availability.union,Object.values(r.availability.categories).reduce((a,b)=>a+b,0));
 assert.deepEqual(r.availability,availabilityCounts(catalogue.records.map(s=>String(s.id)),ids,r.sources.filter(s=>s.savedReady).map(s=>s.id)));
 for(const [view,summary]of Object.entries(r.views)){
  assert.deepEqual(summary,aggregateViews(r.sources,view));
  assert.equal(summary.sources,Object.values(summary.statuses).reduce((a,b)=>a+b,0));
 }
 assert.deepEqual(r.unsavedSuggestionView,aggregateViews(r.sources.filter(s=>!s.savedReady),'conventionalSuggestions'));
 assert.ok(r.sources.filter(s=>s.conventionalSuggestions).every(s=>s.conventionalSuggestions.choiceStatus==='suggested-not-approved'));
});
const result=(coverage,diagnostics=[])=>({coverage:{sourceParsed:true,semanticallyResolved:false,executable:false,...coverage},diagnostics,rows:[]});
test('classification distinguishes missing semantics from motion admission without accepting warnings as blockers',()=>{
 assert.equal(summarizeResult(result({sourceParsed:false})).status,'source-unparsed');
 assert.equal(summarizeResult(result({})).status,'interpretation-blocked');
 assert.equal(summarizeResult(result({semanticallyResolved:true})).status,'motion-or-validation-blocked');
 const admitted=summarizeResult(result({semanticallyResolved:true,executable:true},[{code:'notice',severity:'warning'}]));
 assert.equal(admitted.status,'import-admitted');assert.deepEqual(admitted.blockers,[]);
});
test('frequency and overlapping blockers use source counts, keeping occurrences distinct',()=>{
 const sources=[{id:'1',rawDefaults:{status:'interpretation-blocked',figureKinds:['swing','swing'],blockers:['a','b']}},{id:'2',rawDefaults:{status:'interpretation-blocked',figureKinds:['swing'],blockers:['a']}},{id:'3',savedInterpretation:{status:'import-admitted',figureKinds:['swing'],blockers:[]}}];
 const a=aggregateViews(sources,'rawDefaults');
 assert.equal(a.sources,2);assert.equal(a.figures[0].sources,2);assert.equal(a.figures[0].occurrences,3);
 assert.equal(a.blockers.find(b=>b.code==='a').soleBlockerSources,1);
 assert.deepEqual(a.cooccurringBlockers,[{codes:['a','b'],sources:1,sourceIds:['1']}]);
 assert.equal(Object.values(a.statuses).reduce((x,y)=>x+y,0),a.sources);
});
