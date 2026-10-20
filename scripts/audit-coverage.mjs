#!/usr/bin/env node
/** Offline census. No source acquisition, archive regeneration or saved-choice mutation. */
import {readFileSync,readdirSync,writeFileSync} from 'node:fs';
import {pathToFileURL,fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
const root=new URL('../',import.meta.url);
const sorted=values=>[...new Set(values)].sort();
export function provenance(runtimeMilliseconds){
 const cwd=fileURLToPath(root);
 const git=(...args)=>execFileSync('git',['-c',`safe.directory=${cwd.replaceAll('\\','/').replace(/\/$/,'')}`,...args],{cwd,encoding:'utf8',stdio:['ignore','pipe','ignore']}).trim();
 let revision,workingTreeModified;
 try{revision=git('rev-parse','HEAD');workingTreeModified=git('status','--porcelain').length>0;}catch{revision='unavailable';}
 return {generatedAt:new Date().toISOString(),revision,workingTreeModified,...(runtimeMilliseconds===undefined?{}:{runtimeMilliseconds}),node:process.version};
}
export function summarizeResult(result){
 const blockers=sorted(result.diagnostics.filter(d=>d.severity!=='warning').map(d=>d.code));
 return {
  status:result.coverage.executable?'import-admitted':!result.coverage.sourceParsed?'source-unparsed':!result.coverage.semanticallyResolved?'interpretation-blocked':'motion-or-validation-blocked',
  coverage:result.coverage,
  figureKinds:result.rows.flatMap(row=>row.figures.map(f=>f.kind)),
  blockers,
  diagnostics:[...new Map(result.diagnostics.filter(d=>d.severity!=='warning').map(d=>[d.code,{code:d.code,message:d.message}])).values()],
  unresolvedRows:result.rows.filter(r=>!r.resolved).map(r=>({row:r.source.index,text:r.source.text.length>240?r.source.text.slice(0,237)+'...':r.source.text,recognized:r.recognized,figureKinds:sorted(r.figures.map(f=>f.kind)),blockers:sorted(r.diagnostics.filter(d=>d.severity!=='warning').map(d=>d.code))})),
 };
}
export function aggregateViews(sources,view){
 const selected=sources.filter(s=>s[view]),statuses={},figures=new Map(),blockers=new Map(),pairs=new Map();
 for(const source of selected){
  const item=source[view];statuses[item.status]=(statuses[item.status]??0)+1;
  for(const kind of new Set(item.figureKinds)){
   const entry=figures.get(kind)??{kind,sourceIds:[],occurrences:0};
   entry.sourceIds.push(source.id);entry.occurrences+=item.figureKinds.filter(k=>k===kind).length;figures.set(kind,entry);
  }
  for(const code of new Set(item.blockers)){const ids=blockers.get(code)??[];ids.push(source.id);blockers.set(code,ids);}
  const codes=sorted(item.blockers);
  for(let i=0;i<codes.length;i++)for(let j=i+1;j<codes.length;j++){const key=JSON.stringify([codes[i],codes[j]]),ids=pairs.get(key)??[];ids.push(source.id);pairs.set(key,ids);}
 }
 const rank=(a,b)=>b.sources-a.sources||JSON.stringify(a).localeCompare(JSON.stringify(b));
 return {sources:selected.length,statuses,
  figures:[...figures.values()].map(f=>({...f,sources:f.sourceIds.length})).sort(rank),
  blockers:[...blockers].map(([code,sourceIds])=>({code,sources:sourceIds.length,sourceIds,soleBlockerSources:selected.filter(s=>s[view].blockers.length===1&&s[view].blockers[0]===code).length})).sort(rank),
  cooccurringBlockers:[...pairs].map(([codes,sourceIds])=>({codes:JSON.parse(codes),sources:sourceIds.length,sourceIds})).sort(rank),
 };
}
export function availabilityCounts(catalogueIds,snapshotIds,readyIds){
 const catalogue=new Set(catalogueIds),snapshots=new Set(snapshotIds),ready=new Set(readyIds),all=new Set([...catalogue,...snapshots,...ready]);
 const categories={};
 for(const id of all){const key=`catalogue:${catalogue.has(id)} snapshot:${snapshots.has(id)} saved:${ready.has(id)}`;categories[key]=(categories[key]??0)+1;}
 return {catalogue:catalogue.size,retainedSnapshots:snapshots.size,savedReady:ready.size,union:all.size,metadataOnly:[...catalogue].filter(id=>!snapshots.has(id)&&!ready.has(id)).length,categories};
}
export async function auditCoverage({onProgress=()=>{},maxMilliseconds=600000}={}){
 const started=Date.now();
 const [{READY_LIBRARY},{readContraDbImport},{prepareContraDbReview}]=await Promise.all([import('../src/ready-library.ts'),import('../src/contradb-import.ts'),import('../src/source-review.ts')]);
 const catalogue=JSON.parse(readFileSync(new URL('public/contradb-index.json',root),'utf8'));
 const snapshotIds=readdirSync(new URL('test-data/contradb/',root)).filter(f=>/^\d+\.json$/.test(f)).map(f=>f.slice(0,-5));
 const ready=new Map(READY_LIBRARY.map(s=>[String(s.id),s]));
 const sources=[];
 for(const id of sorted([...snapshotIds,...ready.keys()]).sort((a,b)=>Number(a)-Number(b))){
  if(Date.now()-started>maxMilliseconds)throw Error('Census exceeded ten-minute default time budget; no reports written.');
  const source={id,retainedSnapshot:snapshotIds.includes(id),savedReady:ready.has(id)};
  if(source.retainedSnapshot){
   const input=readFileSync(new URL(`test-data/contradb/${id}.json`,root),'utf8');
   const raw=readContraDbImport(input);source.title=raw.record?.title;source.snapshotId=raw.record?.snapshotId;
   source.rawDefaults=summarizeResult(raw);
   const review=prepareContraDbReview(input);
   source.conventionalSuggestions={...summarizeResult(review.result),choiceStatus:'suggested-not-approved',suggestionKinds:sorted(review.suggestions.map(s=>s.kind)),interpretation:review.interpretation};
  }
  if(source.savedReady){source.title??=ready.get(id).title;source.savedInterpretation=summarizeResult(readContraDbImport(ready.get(id).archive));}
  sources.push(source);
  if(sources.length%20===0)onProgress(sources.length);
 }
 return {schema:'contra-studio/coverage-audit',version:1,provenance:provenance(Date.now()-started),
  method:{network:false,rawDefaults:'Retained snapshot imported with no new explicit choices.',conventionalSuggestions:'Independent hypothetical review using current conventional suggestions, never saved or treated as approved.',savedInterpretation:'Existing Ready archive and its saved choices, revalidated unchanged.',validation:'Existing importer validation (including its internal sampled checks) and six-couple compile gate; no additional full-period motion, body, browser, GPU or audio certification.',limitations:'Retained sources are a selected sample, not a random corpus sample. Metadata-only records have unknown choreography coverage. Diagnostic counts overlap; removing a blocker may reveal another. No projected unlock counts.'},
  availability:availabilityCounts(catalogue.records.map(r=>String(r.id)),snapshotIds,[...ready.keys()]),
  views:Object.fromEntries(['rawDefaults','conventionalSuggestions','savedInterpretation'].map(view=>[view,aggregateViews(sources,view)])),
  unsavedSuggestionView:aggregateViews(sources.filter(s=>!s.savedReady),'conventionalSuggestions'),sources};
}
export function renderMarkdown(report){
 const a=report.availability,lines=['# Offline choreography coverage audit','',
 'Regenerate: `node --experimental-strip-types scripts/audit-coverage.mjs --write`.',
 `Generated ${report.provenance?.generatedAt??'before provenance was added'}; code revision ${report.provenance?.revision??'unrecorded'}${report.provenance?.workingTreeModified?' with local modifications':''}. Runtime ${report.provenance?.runtimeMilliseconds===undefined?'not recorded':`${(report.provenance.runtimeMilliseconds/1000).toFixed(1)} seconds`}.`,
 'This reads existing data only. It does not fetch sources, regenerate archives or approve suggested interpretations.','',
 `There are **${a.catalogue} catalogue records**, **${a.retainedSnapshots} retained snapshots**, and **${a.savedReady} saved Ready interpretations**. **${a.metadataOnly} catalogue records have metadata only**; their figure content and motion coverage are unknown. These are overlapping sets, not additive counts. Exact set intersections are in the JSON.`, '',
 '| Input view | Sources | Import admitted | Interpretation blocked | Motion/validation blocked | Unparsed |','| --- | ---: | ---: | ---: | ---: | ---: |'];
 for(const [name,v]of Object.entries(report.views))lines.push(`| ${name} | ${v.sources} | ${v.statuses['import-admitted']??0} | ${v.statuses['interpretation-blocked']??0} | ${v.statuses['motion-or-validation-blocked']??0} | ${v.statuses['source-unparsed']??0} |`);
 lines.push('','“Import admitted” includes existing importer validation, its internal sampled checks and six-couple compile gate. It is not a new whole-period motion or visual certification. Raw defaults, hypothetical suggestions, and saved interpretations are separate views of overlapping sources.',
 '“Interpretation blocked” identifies the importer stage, not necessarily ambiguous authorship: this stage also enforces implementation-specific context and capability gates. Read the diagnostic causes before assigning research versus engineering work.','',
 '## Blockers among retained sources without a saved Ready interpretation','',
 'This table uses hypothetical conventional suggestions to expose remaining obstacles. Suggestions are not authored facts or approvals. Counts overlap. “Sole diagnostic” means the only currently exposed diagnostic code; it does not predict that fixing it will admit the dance.','',
 '| Diagnostic | Sources | Sole diagnostic | IDs | Example cause |','| --- | ---: | ---: | --- | --- |');
 for(const b of report.unsavedSuggestionView.blockers){
  const example=report.sources.find(s=>s.id===b.sourceIds[0]).conventionalSuggestions.diagnostics.find(d=>d.code===b.code)?.message??'';
  const short=example.length>200?example.slice(0,197)+'...':example;
  lines.push(`| ${b.code} | ${b.sources} | ${b.soleBlockerSources} | ${b.sourceIds.join(', ')} | ${short.replaceAll('|','/').replaceAll('\n',' ')} |`);
 }
 const composition=report.sources.filter(s=>!s.savedReady&&s.conventionalSuggestions?.status==='motion-or-validation-blocked');
 lines.push('',`**Semantically resolved but motion/validation blocked after hypothetical suggestions: ${composition.length} sources** (${composition.map(s=>s.id).join(', ')||'none'}). These have all source rows resolved under those suggestions; they are the clearest current composition/validation backlog, not promised admissions.`);
 lines.push('');
 for(const s of composition)lines.push(`- ${s.id}, ${s.title}: ${s.conventionalSuggestions.diagnostics.map(d=>d.message).join(' ')}`);
 const candidates=report.sources.filter(s=>!s.savedReady&&s.conventionalSuggestions?.status==='import-admitted'),divergent=report.sources.filter(s=>s.savedReady&&s.conventionalSuggestions?.status!=='import-admitted');
 lines.push('',`The ${report.unsavedSuggestionView.sources} unsaved retained records split into ${candidates.length} import-admitted candidates, ${composition.length} motion/validation blocks and ${report.unsavedSuggestionView.statuses['interpretation-blocked']??0} interpretation-stage blocks.`,
 `Candidates, **not saved Ready admissions**: ${candidates.map(s=>`${s.id} (${s.title})`).join(', ')||'none'}.`,
 `Saved records that hypothetical suggestions cannot reconstruct: ${divergent.map(s=>`${s.id} (${s.title}; ${s.conventionalSuggestions.blockers.join(', ')})`).join('; ')||'none'}. Their saved interpretation is tested separately. Thus the hypothetical admitted total must not be subtracted from saved Ready to count new candidates.`);
 lines.push('','## Figure frequencies in retained raw sources','',
 'These are normalized figure occurrences recognized by the importer, not a linguistic census of every source instruction. Choices can split compound instructions into new figures: raw balance frequency is especially incomplete without balance/swing timing choices. Unsupported text can be missing here; see unresolved rows in JSON. Columns count sources containing each kind, with their different denominators; these views overlap.','',
 `| Kind | Raw / ${report.views.rawDefaults.sources} | Suggested / ${report.views.conventionalSuggestions.sources} | Saved / ${report.views.savedInterpretation.sources} |`,'| --- | ---: | ---: | ---: |');
 const kinds=sorted(Object.values(report.views).flatMap(v=>v.figures.map(f=>f.kind)));
 for(const kind of kinds)lines.push(`| ${kind} | ${['rawDefaults','conventionalSuggestions','savedInterpretation'].map(view=>report.views[view].figures.find(f=>f.kind===kind)?.sources??0).join(' | ')} |`);
 lines.push('','## What this permits us to conclude','',
 '- Missing source acquisition is the largest measurable coverage gap; metadata alone cannot establish which figures would unlock it.',
 '- The retained sample was selected during development. Its frequencies must not be projected onto the complete catalogue.',
 '- JSON includes per-source blockers, unresolved row references and co-occurring blocker counts for targeted research.',
 '- Parser categories and compiler diagnostics are implementation observations, not authoritative definitions of dancing.',
 '- No additional full-period motion suite, GPU, audio or browser checks run in this census.','');
 return lines.join('\n');
}
if(process.argv[1]&&pathToFileURL(process.argv[1]).href===import.meta.url){
 if(process.argv.slice(2).some(a=>a!=='--write'))throw Error('Usage: node scripts/audit-coverage.mjs [--write]');
 const report=await auditCoverage({onProgress:n=>process.stderr.write(`Audited ${n} available sources.\n`)});
 if(process.argv.includes('--write')){
  writeFileSync(new URL('docs/coverage-audit.json',root),JSON.stringify(report,null,2)+'\n');
  writeFileSync(new URL('docs/coverage-audit.md',root),renderMarkdown(report));
 }
 process.stdout.write(JSON.stringify({availability:report.availability,views:Object.fromEntries(Object.entries(report.views).map(([k,v])=>[k,{sources:v.sources,statuses:v.statuses}])),unsavedBlockers:report.unsavedSuggestionView.blockers},null,2)+'\n');
}
