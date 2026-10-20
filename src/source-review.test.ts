import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {prepareContraDbReview,isSavedContraDbInterpretation} from './source-review.ts';
import {readContraDbImport} from './contradb-import.ts';
const fixture=(id:number)=>readFileSync(new URL(`../test-data/contradb/${id}.json`,import.meta.url),'utf8');
test('UI prefills conventional combined timing and only uniquely valid formation-derived chain receiver',()=>{
 for(const id of [1166,1502]){const p=prepareContraDbReview(fixture(id));assert.ok(p.result.dance,JSON.stringify(p.result.errors));assert.equal(p.result.coverage.executable,true);assert.ok(p.suggestions.some(s=>s.kind==='conventional-timing'));assert.ok(p.suggestions.some(s=>s.kind==='formation-derived'));assert.equal(p.interpretation.rows?.[`contradb:${id}:row:${id===1166?4:5}`]?.chainReceiver,'neighbor');assert.equal(p.result.record?.original,readContraDbImport(fixture(id)).record?.original);assert.deepEqual(p.result.dance.contraDbInterpretation,p.interpretation);}
});
test('suggestions do not choose unspecified Becket circulation or relax any source blocker',()=>{
 const butter=prepareContraDbReview(fixture(94));assert.equal(butter.interpretation.circulation,undefined);assert.equal(butter.result.dance,undefined);assert.ok(butter.result.diagnostics.some(d=>d.code==='circulation-choice'));
 for(const id of [2006,2212,3363,3533]){const p=prepareContraDbReview(fixture(id));assert.equal(p.result.dance,undefined);assert.ok(p.result.errors.length);}
});
test('remembered choices are bound to exact snapshot and revalidated; saved archive stays unchanged',()=>{
 const first=prepareContraDbReview(fixture(1502));assert.ok(first.result.dance);const memory={sourceSnapshotId:first.result.record!.snapshotId,interpretation:first.interpretation};
 const again=prepareContraDbReview(fixture(1502),[memory]);assert.deepEqual(again.suggestions.map(s=>s.kind),['remembered']);assert.deepEqual(again.interpretation,first.interpretation);
 const changed=JSON.parse(fixture(1502));changed.html=changed.html.replace('star left 4 places','star left 4 places while partner orbits');const altered=prepareContraDbReview(JSON.stringify(changed),[memory]);assert.equal(altered.result.dance,undefined);assert.equal(altered.suggestions.some(s=>s.kind==='remembered'),false);
 const archive=first.result.dance.sourceText;assert.equal(isSavedContraDbInterpretation(archive),true);const restored=prepareContraDbReview(archive,[{...memory,interpretation:{}}]);assert.equal(restored.savedArchive,true);assert.deepEqual(restored.interpretation,first.interpretation);assert.deepEqual(restored.suggestions,[]);assert.equal(restored.result.dance?.sourceText,archive);
});
test('clearing a prefilling choice remains unresolved in the parser; no hidden automatic fallback',()=>{
 const p=prepareContraDbReview(fixture(1502));delete p.interpretation.rows!['contradb:1502:row:0'].balanceBeats;const r=readContraDbImport(fixture(1502),{interpretation:p.interpretation});assert.equal(r.dance,undefined);assert.ok(r.diagnostics.some(d=>d.code==='balance-arch-timing'));
});

test('new actual source773 preserves absent progression marker and validates only its explicit endpoint interpretation',()=>{
 const raw=fixture(773),base=readContraDbImport(raw);assert.equal(base.dance,undefined);assert.ok(base.diagnostics.some(d=>d.code==='progression-count'));
 const p=prepareContraDbReview(raw);assert.ok(p.result.dance,JSON.stringify(p.result.errors));assert.equal(p.result.record?.author,'Dugan Murphy');assert.equal(p.result.record?.rows.some(row=>row.progression),false);assert.equal(p.interpretation.progression,'end-of-cycle');assert.ok(p.suggestions.some(s=>s.kind==='endpoint-progression'));assert.equal(p.result.dance.figures.some(f=>f.progression),false);assert.equal(p.result.dance.figures.reduce((n,f)=>n+f.beats,0),64);
 const reread=readContraDbImport(p.result.dance.sourceText);assert.ok(reread.dance);assert.equal(reread.dance.contraDbInterpretation.progression,'end-of-cycle');assert.equal(reread.record?.original,base.record?.original);
 delete p.interpretation.progression;assert.equal(readContraDbImport(raw,{interpretation:p.interpretation}).dance,undefined);
});
test('endpoint interpretation never overrides existing markers, unsupported formations, or bad motion',()=>{
 const p=prepareContraDbReview(fixture(1502));p.interpretation.progression='end-of-cycle';assert.equal(readContraDbImport(fixture(1502),{interpretation:p.interpretation}).dance,undefined);
 const raw=JSON.parse(fixture(773));raw.html=raw.html.replace('circle left 3 places','circle left 4 places');const bad=prepareContraDbReview(JSON.stringify(raw));assert.equal(bad.result.dance,undefined);assert.ok(bad.result.diagnostics.some(d=>d.code.startsWith('motion:')));
});
test('new exact source8 uses synonymous new-neighbor qualifier without weakening other qualifiers',()=>{
 const r=prepareContraDbReview(fixture(8));assert.ok(r.result.dance,JSON.stringify(r.result.errors));assert.ok(r.result.record?.rows.at(-1)?.text.includes('to new neighbors'));
 const bad=JSON.parse(fixture(8));bad.html=bad.html.replace('to new <u>neighbors</u>','to new <u>neighbors</u> while partner orbits');assert.equal(prepareContraDbReview(JSON.stringify(bad)).result.dance,undefined);
});
test('actual source185 final bare chain can infer a unique receiver without a spurious unresolved-progression diagnostic',()=>{const raw=readFileSync(new URL('../test-data/contradb/185.json',import.meta.url),'utf8'),p=prepareContraDbReview(raw);assert.ok(p.result.dance,JSON.stringify(p.result.errors));assert.equal(p.result.coverage.resolvedRows,7);assert.equal(p.interpretation.rows?.['contradb:185:row:6']?.chainReceiver,'neighbor');assert.equal(p.result.dance.figures.at(-1)?.progression,true);const cleared=JSON.parse(JSON.stringify(p.interpretation));delete cleared.rows['contradb:185:row:6'].chainReceiver;const result=readContraDbImport(raw,{interpretation:cleared});assert.equal(result.dance,undefined);assert.ok(result.diagnostics.some(d=>d.code==='chain-receiver'));assert.equal(result.diagnostics.some(d=>d.code==='progression-variant'),false);});

test('exact remembered choices survive capability changes without silently reverting to suggestions',()=>{const first=prepareContraDbReview(fixture(1502));assert.ok(first.result.dance);const p=prepareContraDbReview(fixture(1502),[{sourceSnapshotId:first.result.record!.snapshotId,interpretation:first.interpretation}],{archExchanges:false,partialHeys:false});assert.equal(p.result.dance,undefined);assert.deepEqual(p.interpretation,first.interpretation);assert.deepEqual(p.suggestions.map(s=>s.kind),['remembered']);assert.match(p.suggestions[0].message,/not replaced/);});

test('choice binding ignores page chrome and CSRF changes but includes every retained source instruction',()=>{
 const source=JSON.parse(fixture(1502)),first=prepareContraDbReview(JSON.stringify(source));assert.ok(first.result.dance);
 const remembered=[{sourceSnapshotId:first.result.record!.snapshotId,interpretation:first.interpretation}];
 source.html='<nav>Different navigation</nav><meta name="csrf-token" content="different-token"><script>unrelatedPageState=2</script>'+source.html+'<footer>Later page footer</footer>';
 const chrome=prepareContraDbReview(JSON.stringify(source),remembered);assert.equal(chrome.result.record!.snapshotId,first.result.record!.snapshotId);assert.deepEqual(chrome.suggestions.map(s=>s.kind),['remembered']);assert.ok(!chrome.result.record!.original.includes('different-token'));
 assert.ok(source.html.includes('star left'));source.html=source.html.replace('star left','star right');
 const changed=prepareContraDbReview(JSON.stringify(source),remembered);assert.notEqual(changed.result.record!.snapshotId,first.result.record!.snapshotId);assert.ok(!changed.suggestions.some(s=>s.kind==='remembered'));
});

test('bounded joint inference resolves interdependent omitted relations without changing source or saved decisions',()=>{
 // Synthetic regression only: this edited composition is not credited to the
 // source author and is not included in acquired or reviewed record counts.
 const source=JSON.parse(fixture(57)),base=readContraDbImport(fixture(57)),row=base.record!.rows[3];assert.match(row.text,/circle left/);
 source.html=source.html.replace(row.html,row.html.replace('circle left 3 places','ladles chain'));
 const raw=JSON.stringify(source),p=prepareContraDbReview(raw);assert.ok(p.result.dance,JSON.stringify(p.result.errors));
 assert.equal(p.interpretation.rows!['contradb:57:row:3'].chainReceiver,'neighbor');assert.deepEqual(p.interpretation.rows!['contradb:57:row:5'].rightLeftThrough,{hand:'right',courtesyReceiver:'neighbor',courtesyLeader:'lark',crossingRelation:'partner'});assert.ok(p.suggestions.some(s=>/jointly checking/.test(s.message)));
 // A sequential chain search with the conventional partner RLT cannot succeed.
 for(const receiver of['partner','neighbor']as const){const c=structuredClone(p.interpretation);c.rows!['contradb:57:row:3'].chainReceiver=receiver;c.rows!['contradb:57:row:5'].rightLeftThrough!.courtesyReceiver='partner';c.rows!['contradb:57:row:5'].rightLeftThrough!.crossingRelation='neighbor';assert.equal(readContraDbImport(raw,{interpretation:c}).dance,undefined);}
 const replay=readContraDbImport(p.result.dance.sourceText);assert.deepEqual(replay.interpretation,p.interpretation);assert.equal(replay.record?.original,p.result.record!.original);
 const explicit=structuredClone(p.interpretation);explicit.rows!['contradb:57:row:3'].chainReceiver='partner';const remembered=prepareContraDbReview(raw,[{sourceSnapshotId:p.result.record!.snapshotId,interpretation:explicit}]);assert.equal(remembered.result.dance,undefined);assert.deepEqual(remembered.interpretation,explicit);assert.deepEqual(remembered.suggestions.map(s=>s.kind),['remembered']);
 const extra=JSON.parse(raw);extra.html=extra.html.replace('ladles chain','ladles chain then clap');assert.equal(prepareContraDbReview(JSON.stringify(extra)).result.dance,undefined);
});
