import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {prepareContraDbReview} from './source-review.ts';
import {readContraDbImport,normalizeContraDbRow} from './contradb-import.ts';
import {readContraDbSource,makeContraDbSnapshot} from './contradb-source.ts';
import {REGISTERED_MOTION_CAPABILITIES} from './capabilities.ts';
const caps=REGISTERED_MOTION_CAPABILITIES;
const raw=(id:string)=>readFileSync(new URL(`../test-data/contradb/${id}.json`,import.meta.url),'utf8');
for(const spec of [{id:'1098',title:'Everything Old is New Again',author:'Andrea Nettleton',counts:[4,2,10,8,8,16,16],arches:[[0,'neighbor']],rlt:3,receiver:'partner',crossing:'neighbor'},{id:'115',title:"Sarah's Journey",author:'Gene Hubert',counts:[4,4,8,8,8,4,4,8,8,8],arches:[[0,'neighbor'],[5,'partner']],rlt:8,receiver:'neighbor',crossing:'partner'}]as const)test(`${spec.id} literal bare arches and named pull-bys retain exact source and archive`,()=>{
 const p=prepareContraDbReview(raw(spec.id),[],caps),r=p.result.record!;assert.ok(p.result.dance,p.result.errors.join('; '));const d=p.result.dance!;
 assert.equal(r.title,spec.title);assert.equal(r.author,spec.author);assert.equal(r.publication,'shared everywhere');assert.deepEqual([r.hook,r.preamble,r.notes],['','','']);assert.deepEqual(r.rows.map(x=>x.beats),spec.counts);assert.equal(d.figures.reduce((n,f)=>n+f.beats,0),64);
 for(const[index,who]of spec.arches){const f=p.result.rows[index].figures;assert.equal(f.length,1);assert.deepEqual([f[0].kind,f[0].who,f[0].beats,f[0].hands,f[0].underRole,f[0].entry,f[0].exit],['box-the-gnat',who,4,'right','robin','paired-sidelines','paired-sidelines']);assert.equal(p.interpretation.rows?.[r.rows[index].id],undefined,'literal box has no invented per-source ambiguity');}
 assert.deepEqual(p.interpretation.rows![r.rows[spec.rlt].id].rightLeftThrough,{hand:'right',courtesyReceiver:spec.receiver,courtesyLeader:'lark',crossingRelation:spec.crossing});assert.equal(d.endPolicy,undefined);assert.equal(d.progressionEvents?.length,1);assert.equal(d.progressionEvents![0].afterFigureId,d.figures.at(-1)!.id);assert.equal(d.progressionEvents![0].source.sourceId,r.snapshotId);assert.equal(d.progressionEvents![0].source.url,r.sourceUrl);assert.equal(d.progressionEvents![0].source.basis,'source-explicit');
 assert.deepEqual(JSON.parse(d.sourceText).snapshot,JSON.parse(JSON.stringify(makeContraDbSnapshot(r))));assert.deepEqual(readContraDbImport(d.sourceText,{capabilities:caps}).dance,d);
 for(const[rowId,choices]of Object.entries(p.interpretation.rows??{}))for(const key of Object.keys(choices)){const c=structuredClone(p.interpretation);delete(c.rows![rowId]as Record<string,unknown>)[key];assert.equal(readContraDbImport(raw(spec.id),{interpretation:c,capabilities:caps}).dance,undefined,`${rowId}.${key}`);}
 assert.equal(readContraDbImport(d.sourceText,{capabilities:{...caps,stateCarryingArchPullBys:false}}).dance,undefined);
 assert.deepEqual(d.figures.filter(f=>f.kind==='pull-by').map(f=>[f.who,f.hands,f.beats]),spec.id==='1098'?[['larks','left',2]]:[['larks','left',4],['robins','left',4]]);
});
test('bare arch row qualifiers, counts and terminal source binding stay explicit',()=>{
 const r=readContraDbSource(raw('115')).record!,row=r.rows[0];assert.equal(normalizeContraDbRow(row,'duple-improper',{},caps).resolved,true);
 for(const text of ['neighbors box the gnat then clap','neighbors box the gnat by left','next neighbors box the gnat','neighbors box the gnat ⁋'])assert.equal(normalizeContraDbRow({...row,text,progression:text.endsWith('⁋')},'duple-improper',{},caps).resolved,false,text);
 for(const beats of[2,3,8])assert.equal(normalizeContraDbRow({...row,beats},'duple-improper',{},caps).resolved,false);
 const p=prepareContraDbReview(raw('115'),[],caps);assert.ok(p.result.dance,p.result.errors.join('; '));
 for(const[from,to]of [['neighbors box the gnat','neighbors box the gnat then clap'],['ladles pull by left','ladles pull by left then turn'],['star left 4 places ⁋','star left 4 places']]as const){const snapshot=JSON.parse(raw('115'));assert.ok(snapshot.html.includes(from));snapshot.html=snapshot.html.replace(from,to);const changed=JSON.stringify(snapshot);assert.notEqual(readContraDbSource(changed).record!.snapshotId,r.snapshotId);assert.equal(readContraDbImport(changed,{interpretation:p.interpretation,capabilities:caps}).dance,undefined,from);const archive=JSON.parse(p.result.dance!.sourceText);archive.snapshot=snapshot;assert.ok(readContraDbImport(JSON.stringify(archive),{capabilities:caps}).diagnostics.some(d=>d.code==='snapshot-binding'));}
 const renamed=JSON.parse(raw('115'));renamed.html=renamed.html.replaceAll("Sarah&#39;s Journey",'Unnamed Test Dance').replaceAll('Gene Hubert','Test Author');const renamedRecord=readContraDbSource(JSON.stringify(renamed)).record!;assert.equal(renamedRecord.title,'Unnamed Test Dance');assert.equal(renamedRecord.author,'Test Author');assert.ok(prepareContraDbReview(JSON.stringify(renamed),[],caps).result.dance,'no source title/author admission');
});
