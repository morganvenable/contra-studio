import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {optionalTableAlternative,preDanceWalkthroughFeedback} from './source-alternatives.ts';
import {readContraDbSource} from './contradb-source.ts';
import {readContraDbImport} from './contradb-import.ts';
import {prepareContraDbReview} from './source-review.ts';
const fixture=(id:string)=>readFileSync(new URL(`../test-data/contradb/${id}.json`,import.meta.url),'utf8');
const raw1545=fixture('1545'),raw1550=fixture('1550');
const record1545=readContraDbSource(raw1545).record!,record1550=readContraDbSource(raw1550).record!;
function mutate(raw:string,from:string,to:string):string{const s=JSON.parse(raw);assert.ok(s.html.includes(from),from);s.html=s.html.replace(from,to);return JSON.stringify(s);}
function mutateRow(raw:string,index:number,change:(html:string)=>string):string{const row=readContraDbSource(raw).record!.rows[index],next=change(row.html);assert.notEqual(next,row.html);return mutate(raw,row.html,next);}
function rejectFresh(raw:string,changed:readonly string[]){const p=prepareContraDbReview(raw);assert.ok(p.result.dance);for(const input of changed){assert.equal(prepareContraDbReview(input).result.dance,undefined,input);assert.equal(readContraDbImport(input,{interpretation:p.interpretation}).dance,undefined);const archive=JSON.parse(p.result.dance.sourceText);archive.snapshot=JSON.parse(input);assert.ok(readContraDbImport(JSON.stringify(archive)).diagnostics.some(d=>d.code==='snapshot-binding'));}}

test('1545 retains the current larks do-si-do and the exact unselected linked long-lines variant',()=>{
 const p=prepareContraDbReview(raw1545),r=p.result;assert.ok(r.dance,JSON.stringify(r.errors));assert.equal(r.record!.title,'Frederick Contra');assert.equal(r.record!.author,'Tom Hinds');assert.equal(r.record!.preamble,record1545.preamble);assert.match(r.record!.original,/href="https:\/\/contradb.com\/dances\/66"/);assert.equal(p.interpretation.preambleReview,'retain-table-optional-alternative');
 assert.deepEqual(r.dance.figures.map(f=>[f.kind,f.beats]),[['do-si-do',8],['allemande',8],['balance',4],['swing',12],['hall-travel',16],['circle',6],['swing',10]]);assert.equal(r.dance.figures[0].who,'larks');assert.equal(r.dance.figures[0].amount,1);assert.equal(r.record!.rows.filter(row=>row.progression).length,1);assert.equal(r.record!.rows.at(-1)!.progression,true);assert.deepEqual(r.dance.figures.filter(f=>f.progression).map(f=>f.id),[r.dance.figures.at(-1)!.id]);assert.ok(!r.dance.figures.some(f=>f.kind==='long-lines'));
 assert.match(r.warnings.join(' '),/linked version.*not been verified/);const removed=structuredClone(p.interpretation);delete removed.preambleReview;assert.equal(readContraDbImport(raw1545,{interpretation:removed}).dance,undefined);
 const replay=readContraDbImport(r.dance.sourceText);assert.deepEqual(replay.record,r.record);assert.deepEqual(replay.dance,r.dance);assert.deepEqual(replay.interpretation,p.interpretation);assert.deepEqual(JSON.parse(r.dance.sourceText).snapshot,JSON.parse(raw1545));
 assert.ok(optionalTableAlternative({...record1545,title:'Different retained title',sourceId:'99999'}));
});
test('1545 current-table selection rejects mandatory, appended, changed actor/count and unrelated-link variants',()=>{
 rejectFresh(raw1545,[
  ...['Mandatory variation','Then','Instead'].map(x=>mutate(raw1545,'Common variation',x)),
  mutate(raw1545,'That version can be found','Then clap. That version can be found'),
  mutate(raw1545,'here</a>.','here</a>. Face out.'),
  mutate(raw1545,'href="https://contradb.com/dances/66"','data-href="https://contradb.com/dances/66"'),
  mutate(raw1545,'href="https://contradb.com/dances/66"',`title='href="https://contradb.com/dances/66"'`),
  mutate(raw1545,'https://contradb.com/dances/66','https://example.com/dances/66'),
  mutate(raw1545,'https://contradb.com/dances/66','https://contradb.com/dances/1545'),
  mutate(raw1545,'>here</a>','>then clap</a>'),
  mutateRow(raw1545,0,h=>h.replace('gentlespoons','ladles')),
  mutateRow(raw1545,0,h=>h.replace('do si do once','long lines forward &amp; back')),
  mutateRow(raw1545,0,h=>h.replace('do si do once','do si do once then clap')),
  mutateRow(raw1545,0,h=>h.replace('dance-show-beats>8','dance-show-beats>4')),
  mutateRow(raw1545,1,h=>h.replace('ladles allemande left 1½','gentlespoons do si do once')),
 ]);
});
test('1550 separately selects the current B2 and classifies the pre-dance walkthrough/feedback request',()=>{
 const p=prepareContraDbReview(raw1550),r=p.result;assert.ok(r.dance,JSON.stringify(r.errors));assert.equal(r.record!.title,'First dance variation');assert.equal(r.record!.author,'Don Flaherty');assert.equal(p.interpretation.preambleReview,'pre-dance-walkthrough-feedback');assert.equal(p.interpretation.notesReview,'retain-table-optional-alternative');assert.equal(r.record!.preamble,record1550.preamble);assert.equal(r.record!.notes,record1550.notes);assert.match(r.record!.original,/mailto:do14flah@aol.com/);
 assert.deepEqual(r.dance.figures.map(f=>[f.kind,f.beats]),[['balance',4],['swing',12],['long-lines',8],['robins-chain',8],['do-si-do',8],['swing',8],['circle',8],['ring-balance',4],['pass-through',4]]);assert.equal(r.dance.figures.filter(f=>f.kind==='do-si-do').length,1);assert.equal(r.dance.figures.find(f=>f.kind==='do-si-do')!.who,'robins');assert.equal(r.dance.figures.reduce((n,f)=>n+f.beats,0),64);assert.equal(r.record!.rows.filter(row=>row.progression).length,1);assert.equal(r.dance.figures.at(-1)!.progression,true);assert.equal(r.dance.endPolicy,undefined);
 assert.match(r.warnings.join(' '),/no contact is made/);assert.match(r.warnings.join(' '),/alternative.*unselected/);
 for(const field of ['preambleReview','notesReview'] as const){const choice=structuredClone(p.interpretation);delete choice[field];assert.equal(readContraDbImport(raw1550,{interpretation:choice}).dance,undefined,field);}
 const wrong=structuredClone(p.interpretation);wrong.notesReview='provenance-only';assert.equal(readContraDbImport(raw1550,{interpretation:wrong}).dance,undefined);
 const replay=readContraDbImport(r.dance.sourceText);assert.deepEqual(replay.dance,r.dance);assert.deepEqual(replay.record,r.record);assert.deepEqual(replay.interpretation,p.interpretation);assert.deepEqual(JSON.parse(r.dance.sourceText).snapshot,JSON.parse(raw1550));
 assert.ok(preDanceWalkthroughFeedback({...record1550,title:'Different retained title',sourceId:'99999'}));
});
test('1550 review cannot waive new walkthrough actions, mandatory alternatives, table changes or extra feedback clauses',()=>{
 rejectFresh(raw1550,[
  ...['during','after','unless tired, before'].map(x=>mutate(raw1550,'before taking',`${x} taking`)),
  mutate(raw1550,'Please walk this dance thru','Please clap then walk this dance thru'),
  mutate(raw1550,'thanks Don Flaherty','thanks Don Flaherty. Then clap'),
  mutate(raw1550,'thanks Don Flaherty','thanks Turn Left'),
  mutate(raw1550,'href="mailto:do14flah@aol.com"','data-href="mailto:do14flah@aol.com"'),
  mutate(raw1550,'href="mailto:do14flah@aol.com"',`title='href="mailto:do14flah@aol.com"'`),
  mutate(raw1550,'mailto:do14flah@aol.com','mailto:someone@example.com'),
  mutate(raw1550,'Alt. B2--','Must B2--'),mutate(raw1550,'Alt. B2--','Then B2--'),mutate(raw1550,'Alt. B2--','Instead B2--'),
  mutate(raw1550,'new <u>neighbors</u></p>','new <u>neighbors</u>. Face out.</p>'),
  mutateRow(raw1550,5,h=>h.replace('left 3 places','right 3 places')),
  mutateRow(raw1550,5,h=>h.replace('dance-show-beats>8','dance-show-beats>6')),
  mutateRow(raw1550,6,h=>h.replace('balance the ring','partners balance')),
  mutateRow(raw1550,7,h=>h.replace('pass through ⁋','neighbors do si do once ⁋')),
  mutateRow(raw1550,7,h=>h.replace('pass through ⁋','pass through then clap ⁋')),
  mutateRow(raw1550,7,h=>h.replace(' ⁋','')),
 ]);
});
test('457 preserves its already-supported literal composition and all five archived choices',()=>{
 const raw=fixture('457'),p=prepareContraDbReview(raw),r=p.result;assert.ok(r.dance,JSON.stringify(r.errors));assert.equal(r.record!.title,'Birthday');assert.equal(r.record!.author,'Robin Banerji');assert.equal(r.record!.hook,'fast, exciting, and simple');assert.deepEqual(r.dance.figures.map(f=>[f.kind,f.beats]),[['balance',4],['swing',12],['right-left-through',8],['circle',8],['balance',4],['swing',12],['ring-balance',4],['petronella',4],['ring-balance',4],['california-twirl',4]]);
 for(const [index,field] of [[0,'balanceBeats'],[1,'rightLeftThrough'],[3,'balanceBeats'],[4,'petronella'],[6,'californiaTwirl']] as const){const choice=structuredClone(p.interpretation);delete choice.rows![`contradb:457:row:${index}`][field];assert.equal(readContraDbImport(raw,{interpretation:choice}).dance,undefined,`${index}.${field}`);}
 assert.equal(r.record!.rows.filter(row=>row.progression).length,1);assert.deepEqual(r.dance.figures.filter(f=>f.progression).map(f=>f.kind),['california-twirl']);assert.deepEqual(readContraDbImport(r.dance.sourceText).dance,r.dance);assert.deepEqual(JSON.parse(r.dance.sourceText).snapshot,JSON.parse(raw));
});
