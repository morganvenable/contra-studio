import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {readContraDbSource} from './contradb-source.ts';
import {readContraDbImport} from './contradb-import.ts';
import {prepareContraDbReview} from './source-review.ts';
import {quotedEventTitleProvenance} from './contradb-annotations.ts';
import {corroboratedPromenadeComparison} from './source-history.ts';
const raw=(id:string)=>readFileSync(new URL(`../test-data/contradb/${id}.json`,import.meta.url),'utf8');
const source=(id:string)=>readContraDbSource(raw(id)).record!;
test('event title recognition consumes only the complete naming sentence',()=>{
 const record=source('3326');assert.ok(quotedEventTitleProvenance(record));
 for(const suffix of [' Clap twice.',' Partners swing first.',' Wait out at the end.',' Reverse roles.',' Then stomp.','\nUse two counts.'])assert.equal(quotedEventTitleProvenance({...record,notes:record.notes+suffix}),undefined,suffix);
 for(const notes of [record.notes.replace('Cape Fear Contra Dancers','Turn Left'),record.notes.replace('Wilmington, NC','Reverse Roles'),record.notes.replace('Swamp Stomp','Different Title'),'Named after an event. Stomp twice.'])assert.equal(quotedEventTitleProvenance({...record,notes}),undefined,notes);
 assert.equal(quotedEventTitleProvenance({...record,title:'Different Title'}),undefined);
});
test('3326 provenance and endpoint progression remain separate removable reviews',()=>{
 const p=prepareContraDbReview(raw('3326'));assert.equal(p.interpretation.notesReview,undefined);
 p.interpretation.notesReview='provenance-only';p.interpretation.rows??={};p.interpretation.rows['contradb:3326:row:6']={chainReceiver:'neighbor'};
 const r=readContraDbImport(raw('3326'),{interpretation:p.interpretation});assert.ok(r.dance,r.errors.join('; '));
 assert.ok(r.warnings.some(s=>s.includes('event title provenance')));
 assert.equal(r.dance.progressionEvents?.[0].source.basis,'reviewed-interpretation');
 assert.equal(r.record!.rows.filter(row=>row.progression).length,0);
 assert.equal(p.interpretation.progression,'end-of-cycle','missing marker remains a separate removable interpretation');
 const withoutProgression=structuredClone(p.interpretation);delete withoutProgression.progression;
 const held=readContraDbImport(raw('3326'),{interpretation:withoutProgression});assert.equal(held.dance,undefined);assert.ok(held.diagnostics.some(d=>d.code==='progression-count'));
 delete p.interpretation.notesReview;assert.ok(readContraDbImport(raw('3326'),{interpretation:p.interpretation}).diagnostics.some(d=>d.code==='source-notes'));
});
test('historical promenade comparison is bounded to unchanged literal notes and corroborating table',()=>{
 const record=source('2266');assert.ok(corroboratedPromenadeComparison(record));assert.ok(corroboratedPromenadeComparison(source('3142')));
 assert.equal(corroboratedPromenadeComparison({...record,notes:record.notes+' Reverse roles.'}),undefined);
 for(const change of ['replace','counts','append']){
  const r=structuredClone(record),row=r.rows.find(row=>row.text==='neighbors promenade')!;
  if(change==='replace')row.text='right left through';
  if(change==='counts')row.beats=6;
  if(change==='append')r.rows.push({...row,text:'right left through',beats:0});
  assert.equal(corroboratedPromenadeComparison(r),undefined,change);
 }
});
for(const id of ['2266','3142'])test(`${id} explicit current-table review preserves current promenade semantics and removable review`,()=>{
 const p=prepareContraDbReview(raw(id));assert.equal(p.interpretation.notesReview,undefined);
 p.interpretation.notesReview='corroborated-history';p.interpretation.rows??={};p.interpretation.rows[`contradb:${id}:row:4`]={chainReceiver:'neighbor'};
 const r=readContraDbImport(raw(id),{interpretation:p.interpretation});assert.ok(r.dance,r.errors.join('; '));
 assert.ok(r.warnings.some(s=>s.includes('current-version history')));
 assert.equal(r.dance.figures.filter(f=>f.kind==='promenade').length,1);assert.equal(r.dance.figures.find(f=>f.kind==='promenade')!.who,'neighbor');
 assert.equal(r.record!.rows.reduce((n,row)=>n+(row.beats??0),0),64);assert.equal(r.record!.rows.filter(row=>row.progression).length,1);
 p.interpretation.rows[`contradb:${id}:row:4`].chainReceiver='partner';assert.ok(readContraDbImport(raw(id),{interpretation:p.interpretation}).errors.some(s=>s.includes('requested receiving partner')));
 delete p.interpretation.notesReview;assert.ok(readContraDbImport(raw(id),{interpretation:p.interpretation}).diagnostics.some(d=>d.code==='source-notes-history-review'));
});
