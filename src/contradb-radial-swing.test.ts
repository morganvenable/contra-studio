import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {prepareContraDbReview} from './source-review.ts';
import {readContraDbImport} from './contradb-import.ts';
import {makeContraDbSnapshot} from './contradb-source.ts';
import {REGISTERED_MOTION_CAPABILITIES} from './capabilities.ts';
const caps=REGISTERED_MOTION_CAPABILITIES;
const raw=(id:string)=>readFileSync(new URL(`../test-data/contradb/${id}.json`,import.meta.url),'utf8');

test('actual radial partner frame keeps literal turns, sole balance split and source-bound final event',()=>{
 const text=raw('3087'),p=prepareContraDbReview(text,[],caps),r=p.result.record!,d=p.result.dance;
 assert.ok(d,p.result.errors.join('; '));assert.equal(r.title,'Show of Hands I');assert.equal(r.author,'Melanie Axel-Lute');assert.equal(r.snapshotId,'contradb:3087:9ce19af227b7be1c');assert.deepEqual([r.hook,r.preamble,r.notes],['','','']);
 assert.deepEqual(r.rows.map(row=>[row.beats,row.text]),[[8,'neighbors allemande right 1¼'],[8,'ladles allemande left 1½'],[16,'partners balance & swing'],[8,'circle left 3 places'],[8,'neighbors swing'],[8,'long lines forward & back'],[8,'star left 4 places ⁋']]);
 assert.deepEqual(p.interpretation,{rows:{[r.rows[2].id]:{balanceBeats:4}}});assert.equal(d.figures.reduce((sum,f)=>sum+f.beats,0),64);
 assert.deepEqual(d.figures.slice(0,4).map(f=>[f.kind,f.who,f.direction,f.amount,f.beats]),[['allemande','neighbor','right',1.25,8],['allemande','robins','left',1.5,8],['balance','partner',undefined,undefined,4],['swing','partner',undefined,undefined,12]]);
 assert.equal(d.figures[3].entry,undefined);assert.equal(d.endPolicy,undefined);assert.equal(d.sixTwoPassPolicy,undefined);
 assert.deepEqual(d.progressionEvents,[{afterFigureId:r.rows[6].id,count:1,waitingRoleArrangement:'lark-left',source:{sourceId:r.snapshotId,url:r.sourceUrl,clause:r.rows[6].text,basis:'source-explicit'}}]);
 assert.deepEqual(JSON.parse(d.sourceText).snapshot,JSON.parse(JSON.stringify(makeContraDbSnapshot(r))));assert.deepEqual(readContraDbImport(d.sourceText,{capabilities:caps}).dance,d);
 for(const disabled of ['stateCarryingRadialSwings','stateCarryingSequences']as const)assert.equal(readContraDbImport(d.sourceText,{capabilities:{...caps,[disabled]:false}}).dance,undefined,disabled);
 const withdrawn=structuredClone(p.interpretation);delete withdrawn.rows![r.rows[2].id].balanceBeats;assert.equal(readContraDbImport(text,{interpretation:withdrawn,capabilities:caps}).dance,undefined);
 const noMarker=JSON.parse(text);noMarker.html=noMarker.html.replace('star left 4 places ⁋','star left 4 places');assert.equal(readContraDbImport(JSON.stringify(noMarker),{interpretation:{...p.interpretation,progression:'end-of-cycle'},capabilities:caps}).dance,undefined);
 for(const[from,to]of[['ladles allemande left 1½','ladles allemande left 1½ then clap'],['partners balance &amp; swing','neighbors balance &amp; swing'],['star left 4 places ⁋','star left 4 places ⁋ then turn']]as const){const s=JSON.parse(text);assert.ok(s.html.includes(from));s.html=s.html.replace(from,to);assert.equal(prepareContraDbReview(JSON.stringify(s),[],caps).result.dance,undefined,from);const archive=JSON.parse(d.sourceText);archive.snapshot=s;assert.ok(readContraDbImport(JSON.stringify(archive),{capabilities:caps}).diagnostics.some(x=>x.code==='snapshot-binding'));}
 const renamed=JSON.parse(text);renamed.html=renamed.html.replace('Show of Hands I','Radial frame source control');const other=prepareContraDbReview(JSON.stringify(renamed),[],caps);assert.ok(other.result.dance,other.result.errors.join('; '));assert.notEqual(other.result.record!.snapshotId,r.snapshotId);
});

test('conflicted fixed left-quarter source remains unchanged and blocked by actual clearance',()=>{
 const p=prepareContraDbReview(raw('2987'),[],caps),r=p.result.record!;assert.equal(r.title,'Stay in Touch');assert.equal(r.author,'Donna Calhoun');assert.equal(r.snapshotId,'contradb:2987:22ee319d856f9c08');assert.equal(r.rows[0].text,'neighbors allemande left 1¼');assert.deepEqual([r.hook,r.preamble,r.notes],['','','']);assert.deepEqual(p.interpretation,{rows:{[r.rows[2].id]:{balanceBeats:4}}});assert.equal(p.result.dance,undefined);assert.ok(p.result.errors.some(x=>/torso clearance/.test(x)),p.result.errors.join('; '));assert.equal(p.result.rows[0].figures[0].amount,1.25);
});


test('ordinary same-role turn to balance retains its existing archive and route',()=>{
 const text=raw('2457'),before=prepareContraDbReview(text,[],{...caps,stateCarryingRadialSwings:false}),after=prepareContraDbReview(text,[],caps);assert.ok(before.result.dance,before.result.errors.join('; '));assert.deepEqual(after.result.dance,before.result.dance);assert.deepEqual(after.interpretation,before.interpretation);
});
