import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {prepareContraDbReview} from './source-review.ts';
import {readContraDbImport,normalizeContraDbRow} from './contradb-import.ts';
import {readContraDbSource,makeContraDbSnapshot} from './contradb-source.ts';
import {REGISTERED_MOTION_CAPABILITIES} from './capabilities.ts';
import {activeSwingExit,isActiveSwingChoice,ACTIVE_SWING_WAIT_DESCRIPTION} from './source-active-swing.ts';
const caps=REGISTERED_MOTION_CAPABILITIES;
const raw=(id:string)=>readFileSync(new URL(`../test-data/contradb/${id}.json`,import.meta.url),'utf8');
const expected={
 '1036':{title:'East Litchfield Volunteers',author:'Jim Gregory',snapshot:'contradb:1036:1777130d5e75be55',exit:'face-down-line',rows:[[8,'circle left 4 places'],[8,'circle right 4 places'],[8,'neighbors allemande right once'],[8,'neighbors allemande left once'],[8,'neighbors do si do once'],[8,'neighbors swing'],[8,'long lines forward & back'],[8,'ones swing - face down to next couple ⁋']]},
 '2141':{title:'Jefferson And Liberty variation',author:'Nicholas Rockstroh',snapshot:'contradb:2141:5db649b33f6f8e85',exit:'progressed-neighbors',rows:[[8,'circle left 4 places'],[8,'circle right 4 places'],[8,'star right 4 places'],[8,'star left 4 places'],[16,'neighbors balance & swing'],[8,'long lines forward & back'],[8,'ones swing and face next neighbors ⁋']]},
}as const;

test('active-ones source mapping preserves rank, exact final facing, counts and separate waiting review',()=>{
 for(const[id,e]of Object.entries(expected)){
  const r=readContraDbSource(raw(id)).record!,last=r.rows.at(-1)!;
  assert.equal(r.title,e.title);assert.equal(r.author,e.author);assert.equal(r.snapshotId,e.snapshot);assert.equal(r.publication,'shared everywhere');assert.deepEqual([r.hook,r.preamble],['','']);assert.deepEqual(r.rows.map(x=>[x.beats,x.text]),e.rows);
  assert.equal(activeSwingExit(last),e.exit);
  for(const changed of[{...last,beats:6},{...last,beats:10},{...last,progression:false}])assert.equal(activeSwingExit(changed),undefined);
  const n=normalizeContraDbRow(last,'duple-improper',{activeSwing:{inactive:'wait-in-place'}},caps);
  assert.equal(n.resolved,true,JSON.stringify(n.diagnostics));assert.deepEqual(n.figures,[{id:last.id,beats:8,label:last.text,confidence:'approximate',kind:'swing',who:'ones',exit:e.exit,progression:true}]);assert.ok(n.interpretations.includes(ACTIVE_SWING_WAIT_DESCRIPTION));
  assert.equal(normalizeContraDbRow(last,'duple-improper',{},caps).resolved,false);
  assert.equal(normalizeContraDbRow(last,'duple-improper',{activeSwing:{inactive:'wait-in-place'}},{...caps,stateCarryingActiveSwings:false}).resolved,false);
  const ordinary=r.rows.find(x=>x.text==='long lines forward & back')!;assert.equal(normalizeContraDbRow(ordinary,'duple-improper',{activeSwing:{inactive:'wait-in-place'}},caps).resolved,false);
 }
 for(const value of[{},null,{inactive:'swing'},{inactive:'wait-in-place',amount:1},{inactive:'wait-in-place',phaseBeats:[1,6,1]}])assert.equal(isActiveSwingChoice(value),false);
 let reads=0;const getter={get inactive(){reads++;return 'wait-in-place';}};assert.equal(isActiveSwingChoice(getter),false);assert.equal(reads,0);
});

test('actual active-ones imports and archives retain only the selected current rank and sole terminal event',()=>{
 for(const[id,e]of Object.entries(expected)){
  const text=raw(id),p=prepareContraDbReview(text,[],caps),r=p.result.record!,last=r.rows.at(-1)!,d=p.result.dance;assert.ok(d,p.result.errors.join('; '));
  assert.equal(d.figures.reduce((s,f)=>s+f.beats,0),64);assert.equal(d.figures.filter(f=>f.who==='ones').length,1);assert.equal(d.figures.at(-1)!.who,'ones');assert.equal(d.figures.at(-1)!.exit,e.exit);assert.equal(d.figures.at(-1)!.entry,undefined);assert.equal(d.endPolicy,undefined);
  assert.deepEqual(p.interpretation.rows![last.id],{activeSwing:{inactive:'wait-in-place'}});
  assert.deepEqual(d.progressionEvents,[{afterFigureId:last.id,count:1,waitingRoleArrangement:'lark-left',source:{sourceId:r.snapshotId,url:r.sourceUrl,clause:last.text,basis:'source-explicit'}}]);
  if(id==='1036'){assert.equal(p.interpretation.notesReview,'provenance-only');assert.match(r.notes,/Jim wrote and debuted/);assert.match(r.original,/href="http:\/\/www.biteyourownelbow.com\/conndanc.htm#eastlitchfieldvolunteers"/);}
  else{assert.equal(r.notes,'');assert.equal(p.interpretation.rows![r.rows[4].id].balanceBeats,4);}
  assert.deepEqual(JSON.parse(d.sourceText).snapshot,JSON.parse(JSON.stringify(makeContraDbSnapshot(r))));assert.deepEqual(readContraDbImport(d.sourceText,{capabilities:caps}).dance,d);
  const withdrawn=structuredClone(p.interpretation);delete withdrawn.rows![last.id].activeSwing;assert.equal(readContraDbImport(text,{interpretation:withdrawn,capabilities:caps}).dance,undefined);
  const prefix=structuredClone(p.interpretation);if(id==='1036')delete prefix.notesReview;else delete prefix.rows![r.rows[4].id].balanceBeats;assert.equal(readContraDbImport(text,{interpretation:prefix,capabilities:caps}).dance,undefined);
  for(const cap of['stateCarryingActiveSwings','stateCarryingSequences']as const)assert.equal(readContraDbImport(d.sourceText,{capabilities:{...caps,[cap]:false}}).dance,undefined,cap);
  for(const choice of[{inactive:'swing'},{inactive:'wait-in-place',amount:1}]){const c=structuredClone(p.interpretation);(c.rows![last.id]as any).activeSwing=choice;assert.equal(readContraDbImport(text,{interpretation:c,capabilities:caps}).dance,undefined);}
 }
});

test('active-ones scope, final cue and snapshot cannot be silently changed or inferred',()=>{
 for(const[id,e]of Object.entries(expected)){
  const text=raw(id),p=prepareContraDbReview(text,[],caps),r=p.result.record!,last=r.rows.at(-1)!,archive=JSON.parse(p.result.dance!.sourceText),rawClause=last.html.match(/<div class="show-figure">([\s\S]*?)<\/div>/)![1];
  const changes=[last.text.replace('ones','twos'),last.text.replace('ones','partners'),last.text.replace('face','turn twice and face'),last.text.replace(' ⁋',''),last.text+' then clap',last.text+' ⁋'];
  if(id==='1036')changes.push(last.text.replace('down','up'));else changes.push(last.text.replace('next neighbors','current neighbors'));
  for(const changed of changes){const s=JSON.parse(text);assert.ok(s.html.includes(rawClause));s.html=s.html.replace(rawClause,changed);const fresh=prepareContraDbReview(JSON.stringify(s),[],caps);assert.equal(fresh.result.dance,undefined,changed);const stale={...archive,snapshot:s};assert.ok(readContraDbImport(JSON.stringify(stale),{capabilities:caps}).diagnostics.some(x=>x.code==='snapshot-binding'));if(!changed.includes('⁋'))assert.equal(readContraDbImport(JSON.stringify(s),{interpretation:{...p.interpretation,progression:'end-of-cycle'},capabilities:caps}).dance,undefined);}
  const moved=JSON.parse(text);moved.html=moved.html.replace(rawClause,last.text.replace(' ⁋','')).replace(r.rows[0].text,r.rows[0].text+' ⁋');assert.equal(prepareContraDbReview(JSON.stringify(moved),[],caps).result.dance,undefined);
  const early=JSON.parse(text);early.html=early.html.replace(rawClause,'__ACTIVE_SWING_ROW__').replace('long lines forward &amp; back',last.text).replace('__ACTIVE_SWING_ROW__','long lines forward &amp; back');assert.ok(prepareContraDbReview(JSON.stringify(early),[],caps).result.diagnostics.some(x=>x.code==='active-swing-terminal-context'));
  const renamed=JSON.parse(text);renamed.html=renamed.html.replace(e.title,'Active rank source control');const fresh=prepareContraDbReview(JSON.stringify(renamed),[],caps);assert.ok(fresh.result.dance,fresh.result.errors.join('; '));assert.notEqual(fresh.result.record!.snapshotId,r.snapshotId);
 }
 const notes=JSON.parse(raw('1036'));notes.html=notes.html.replace('the first contra of the night.','the first contra of the night. Then partners swing.');assert.equal(prepareContraDbReview(JSON.stringify(notes),[],caps).result.dance,undefined);
 const held=prepareContraDbReview(raw('3361'),[],caps);assert.equal(held.result.dance,undefined);assert.equal(held.result.record!.publication,'shared to sketchbook');assert.equal(held.result.record!.snapshotId,'contradb:3361:e8dd3b10c3a933e9');
});
