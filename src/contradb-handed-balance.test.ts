import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {prepareContraDbReview} from './source-review.ts';
import {readContraDbImport,normalizeContraDbRow} from './contradb-import.ts';
import {readContraDbSource,makeContraDbSnapshot} from './contradb-source.ts';
import {REGISTERED_MOTION_CAPABILITIES} from './capabilities.ts';
const raw=()=>readFileSync(new URL('../test-data/contradb/333.json',import.meta.url),'utf8');
test('333 preserves separate literal right-hand balance and prepared box rows without reacquisition',()=>{
 const p=prepareContraDbReview(raw()),r=p.result.record!,d=p.result.dance;assert.ok(d,p.result.errors.join('; '));
 assert.equal(r.title,'Once More With Feeling');assert.equal(r.author,'Isaac Banner');assert.equal(r.snapshotId,'contradb:333:042ffdf4bf28911b');assert.deepEqual([r.hook,r.preamble,r.notes],['','','']);assert.deepEqual(r.rows.map(x=>x.beats),[4,4,8,16,8,8,8,8]);
 assert.equal(r.rows[0].text,'neighbors balance right hand');assert.deepEqual(d.figures.slice(0,2).map(({id,label,confidence,...f})=>f),[{beats:4,kind:'balance',who:'neighbor',hands:'right'},{beats:4,kind:'box-the-gnat',who:'neighbor',hands:'right',underRole:'robin'}]);
 assert.equal(d.figures[0].id,r.rows[0].id);assert.equal(d.figures[1].id,r.rows[1].id);assert.equal(p.interpretation.rows?.[r.rows[0].id],undefined);assert.equal(p.interpretation.rows?.[r.rows[1].id],undefined);assert.equal(d.figures.reduce((sum,f)=>sum+f.beats,0),64);assert.equal(d.figures.filter(f=>f.progression).length,1);assert.equal(d.figures.at(-1)!.kind,'petronella');assert.equal(d.figures.at(-1)!.exit,'progressed-neighbors');
 assert.deepEqual(JSON.parse(d.sourceText).snapshot,JSON.parse(JSON.stringify(makeContraDbSnapshot(r))));assert.deepEqual(readContraDbImport(d.sourceText).dance,d);
 assert.deepEqual(readContraDbImport(d.sourceText,{capabilities:{...REGISTERED_MOTION_CAPABILITIES,stateCarryingArchPullBys:false}}).dance,d,'already-held balance/box uses its existing prepared contract');
 assert.equal(readContraDbImport(d.sourceText,{capabilities:{...REGISTERED_MOTION_CAPABILITIES,archExchanges:false}}).dance,undefined);
 for(const[rowId,choices]of Object.entries(p.interpretation.rows??{}))for(const key of Object.keys(choices)){const c=structuredClone(p.interpretation);delete(c.rows![rowId]as Record<string,unknown>)[key];assert.equal(readContraDbImport(raw(),{interpretation:c}).dance,undefined,`${rowId}.${key}`);}
});
test('handed balance grammar preserves exact relation, hand, count and source binding',()=>{
 const p=prepareContraDbReview(raw()),row=p.result.record!.rows[0];
 for(const text of ['neighbors balance right hand','neighbors right hand balance'])assert.deepEqual(normalizeContraDbRow({...row,text},'duple-improper').figures.map(({label,...f})=>f),p.result.rows[0].figures.map(({label,...f})=>f));
 for(const text of ['neighbors balance left hand','neighbors balance right hand then clap','next neighbors balance right hand','neighbors balance right hand ⁋'])assert.equal(normalizeContraDbRow({...row,text,progression:text.endsWith('⁋')},'duple-improper').resolved,false,text);
 for(const beats of [2,3,8])assert.equal(normalizeContraDbRow({...row,beats},'duple-improper').resolved,false);
 for(const replacement of ['neighbors balance left hand','partners balance right hand','neighbors balance right hand then clap']){const snapshot=JSON.parse(raw());assert.ok(snapshot.html.includes('neighbors balance right hand'));snapshot.html=snapshot.html.replace('neighbors balance right hand',replacement);const changed=JSON.stringify(snapshot);assert.notEqual(readContraDbSource(changed).record!.snapshotId,p.result.record!.snapshotId);assert.equal(prepareContraDbReview(changed).result.dance,undefined,replacement);const archive=JSON.parse(p.result.dance!.sourceText);archive.snapshot=snapshot;assert.ok(readContraDbImport(JSON.stringify(archive)).diagnostics.some(d=>d.code==='snapshot-binding'));}
});
