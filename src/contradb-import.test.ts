import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {readContraDbSource,makeContraDbSnapshot,contraDbRecordUrl} from './contradb-source.ts';
import {readContraDbImport,importContraDb,type ContraDbInterpretation} from './contradb-import.ts';
import {compileChoreography} from './choreography.ts';
const fixture=(id:number)=>readFileSync(new URL(`../test-data/contradb/${id}.json`,import.meta.url),'utf8');
const choices:Record<number,ContraDbInterpretation>={94:{circulation:'cw',rows:{'contradb:94:row:4':{chainReceiver:'partner'},'contradb:94:row:6':{balanceBeats:4}}},1166:{rows:{'contradb:1166:row:0':{balanceBeats:4},'contradb:1166:row:3':{balanceBeats:4},'contradb:1166:row:4':{chainReceiver:'neighbor'}}}};
function edit(id:number,fn:(value:any)=>void){const p=JSON.parse(fixture(id));fn(p);return JSON.stringify(p);}
test('official record URL validation never accepts foreign hosts, credentials, queries or guessed proxies',()=>{
 assert.equal(contraDbRecordUrl('https://contradb.com/dances/94/'),'https://contradb.com/dances/94');
 for(const s of ['http://contradb.com/dances/94','https://contradb.com.evil.test/dances/94','https://u:p@contradb.com/dances/94','https://contradb.com:8443/dances/94','https://contradb.com/dances/0','https://contradb.com/dances/94?foo=1','https://contradb.com/dances/94#x'])assert.equal(contraDbRecordUrl(s),undefined,s);
});
test('eight actual source snapshots preserve author, record IDs, revision, exact row HTML and immutable source spans',()=>{
 for(const id of [94,1166,2006,2212,3004,3363,3533,1502]){const s=readContraDbSource(fixture(id));assert.ok(s.record);assert.equal(s.structurallyValid,true,JSON.stringify(s.diagnostics));assert.equal(s.executable,false);assert.equal(s.record.sourceId,String(id));assert.ok(s.record.author);assert.equal(s.record.revision,s.record.metadata?.updated_at);assert.equal(s.record.variantIdentity,`contradb:${id}`);for(const row of s.record.rows){assert.equal(s.record.original.slice(row.span.start,row.span.end),row.html);assert.ok(Object.isFrozen(row));}const reread=readContraDbSource(JSON.stringify(makeContraDbSnapshot(s.record)));assert.equal(reread.record?.original,s.record.original);assert.equal(reread.record?.snapshotId,s.record.snapshotId);}
});
test('search metadata alone is not choreography and cannot become executable',()=>{
 const r=readContraDbImport(JSON.stringify({numberSearched:2427,numberMatching:2426,dances:[{id:94,title:'Butter'}]}));assert.equal(r.coverage.executable,false);assert.ok(r.errors.some(s=>s.includes('metadata')));
});
test('real Butter requires explicit circulation, recipient and timing decisions; no inferred executable default',()=>{
 const r=readContraDbImport(fixture(94));assert.equal(r.dance,undefined);assert.equal(r.coverage.recognizedRows,7);assert.equal(r.coverage.resolvedRows,5);for(const code of ['circulation-choice','chain-receiver','balance-swing-timing'])assert.ok(r.diagnostics.some(d=>d.code===code));
});
test('real Butter and Baby Rose pass whole-cycle gates only with preserved explicit interpretations',()=>{
 for(const id of [94,1166]){const r=readContraDbImport(fixture(id),{interpretation:choices[id]});assert.deepEqual(r.errors,[]);assert.ok(r.dance);assert.equal(r.coverage.executable,true);assert.equal(r.validation?.playable,true);assert.equal(r.dance.verified,false);assert.equal(r.dance.figures.reduce((n,f)=>n+f.beats,0),64);const c=compileChoreography(r.dance,6);assert.equal(c.repeatable,true);for(const b of [0,16,32,48,63.99,64,127.99,128]){const f=c.sample(b);assert.equal(f.poses.length,12);assert.equal(new Set(f.poses.map(p=>p.id)).size,12);assert.ok(f.poses.every(p=>Number.isFinite(p.position.x)&&Number.isFinite(p.position.z)));}}
});
test('saved interpretation roundtrips exact choices, source text, provenance, version and executable result',()=>{
 for(const id of [94,1166]){const r=importContraDb(fixture(id),{interpretation:choices[id]});assert.ok(r.dance);const p=JSON.parse(r.dance.sourceText);assert.equal(p.schema,'contra-studio/contradb-interpretation');assert.equal(p.version,1);assert.equal(p.sourceSnapshotId,r.record?.snapshotId);assert.deepEqual(p.interpretation,choices[id]);const rr=readContraDbImport(r.dance.sourceText);assert.deepEqual(rr.errors,[]);assert.ok(rr.dance);assert.deepEqual(rr.dance.contraDbInterpretation,choices[id]);assert.equal(rr.record?.original,r.record?.original);assert.equal(rr.record?.revision,r.record?.revision);assert.deepEqual(rr.record?.provenance,r.record?.provenance);assert.equal(rr.dance.id,r.dance.id);}
});
test('unclaimed timed, untimed and extra figure rows are retained and block instead of silently disappearing',()=>{
 for(const row of ['<caption>Reverse roles after every repeat</caption>','Turn around before repeating','<tr><td>B2</td><td class=dance-show-beats>8</td><td>Turn around at the end</td></tr>','<tr><td>Reverse roles after every repeat</td></tr>']){const r=readContraDbImport(edit(94,p=>p.html=p.html.replace('</table>',row+'</table>')),{interpretation:choices[94]});assert.equal(r.dance,undefined);assert.ok(r.record?.original.includes(row));assert.ok(r.errors.length);}
 const r=readContraDbImport(edit(94,p=>p.html=p.html.replace('class="show-figure"','class="unmarked-figure"')),{interpretation:choices[94]});assert.equal(r.dance,undefined);assert.ok(r.diagnostics.some(d=>d.code==='unclaimed-source-row'));assert.ok(r.record?.rows[0].text.includes('slide left'));
});
test('unexpected qualifiers, notes, preambles and complete variants cannot fall through to familiar figure names',()=>{
 for(const suffix of [' with shadow 2',' but reverse roles','; pass through',' while partner orbits',' // swing instead']){const r=readContraDbImport(edit(94,p=>p.html=p.html.replace('circle left 3 places','circle left 3 places'+suffix)),{interpretation:choices[94]});assert.equal(r.dance,undefined,suffix);assert.ok(r.rows[1].source.text.includes(suffix.trim()));}
 for(const id of [2006,2212,3004,3363,3533,1502]){const r=readContraDbImport(fixture(id));assert.equal(r.dance,undefined);assert.equal(r.coverage.executable,false);assert.ok(r.record?.rows.length);}
 assert.equal(readContraDbSource(fixture(2006)).record?.formation,'Becket ccw');assert.equal(readContraDbSource(fixture(2212)).record?.sourceId,'2212');
});
test('contradictory, misspelled, stale and wrong-type interpretation arguments are consumed or rejected',()=>{
 const cases:any[]=[{...choices[94],circulation:'ccw'},{...choices[94],extra:'ignored?'},{...choices[94],rows:{...choices[94].rows,'contradb:94:row:99':{balanceBeats:4}}},{...choices[94],rows:{...choices[94].rows,'contradb:94:row:4':{chainReceiver:'partner',balanceBeats:4}}},{...choices[94],rows:[]},{...choices[94],rows:{'contradb:94:row:4':null}}];
 for(const interpretation of cases){const r=readContraDbImport(fixture(94),{interpretation});assert.equal(r.dance,undefined);assert.ok(r.errors.length);}
 const explicitCW=edit(94,p=>{p.html=p.html.replace('formation: Becket ','formation: Becket cw ');p.metadata.formation='Becket cw';});assert.equal(readContraDbImport(explicitCW,{interpretation:{...choices[94],circulation:'ccw'} as any}).dance,undefined);
 const valid=readContraDbImport(fixture(94),{interpretation:choices[94]}).dance!;assert.equal(readContraDbImport(valid.sourceText,{interpretation:{circulation:'cw'}}).dance,undefined);
});
test('source identity, metadata conflicts and snapshots remain separate even for matching titles',()=>{
 const r=readContraDbImport(edit(94,p=>p.metadata.id=1166),{interpretation:choices[94]});assert.equal(r.dance,undefined);assert.ok(r.diagnostics.some(d=>d.code==='metadata-conflict'));
 const changed=readContraDbSource(edit(94,p=>p.html=p.html.replace('circle left 3 places','circle right 3 places'))).record!,original=readContraDbSource(fixture(94)).record!;assert.equal(changed.variantIdentity,original.variantIdentity);assert.notEqual(changed.snapshotId,original.snapshotId);
});
test('public sketchbook access and software/data licensing are separate preserved facts',()=>{
 const r=readContraDbImport(fixture(1166),{interpretation:choices[1166]});assert.ok(r.dance);assert.equal(r.record?.publication,'shared to sketchbook');assert.ok(r.warnings.some(s=>s.includes('sketchbook')));assert.equal(r.record?.provenance.softwareLicense,'AGPL-3.0');assert.equal(r.record?.provenance.choreographyLicense,'not-established');
});
test('bounded inputs and malformed or duplicate source fields fail closed',()=>{
 assert.equal(readContraDbImport('x'.repeat(500001)).dance,undefined);
 const source=JSON.parse(fixture(94));const r=readContraDbImport(edit(94,p=>p.html+=p.html),{interpretation:choices[94]});assert.equal(r.dance,undefined);assert.ok(r.errors.length);
 source.version=2;assert.equal(readContraDbImport(JSON.stringify(source)).dance,undefined);
});

test('deep or oversized metadata is rejected without recursive overflow',()=>{
 const p=JSON.parse(fixture(94));const nested='['.repeat(10000)+'0'+']'.repeat(10000);
 const raw=JSON.stringify(p).replace('"metadata":{','"metadata":{"deep":'+nested+',');let r:ReturnType<typeof readContraDbImport>|undefined;
 assert.doesNotThrow(()=>{r=readContraDbImport(raw);});assert.equal(r?.dance,undefined);assert.ok(r?.diagnostics.some(d=>d.code==='metadata-shape'));
});

test('stored choices cannot silently carry across a changed source snapshot',()=>{
 const r=readContraDbImport(fixture(94),{interpretation:choices[94]});assert.ok(r.dance);const saved=JSON.parse(r.dance.sourceText);saved.snapshot.html=saved.snapshot.html.replace('circle left 3 places','circle right 3 places');const changed=readContraDbImport(JSON.stringify(saved));assert.equal(changed.dance,undefined);assert.ok(changed.diagnostics.some(d=>d.code==='snapshot-binding'));
});
