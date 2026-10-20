import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {prepareContraDbReview} from './source-review.ts';
import {readContraDbImport,normalizeContraDbRow} from './contradb-import.ts';
import {rollawaySourceRoles,rollawayDescription,rollawayNeighborHey,ROLLAWAY_DESCRIPTION} from './source-rollaway.ts';
import {REGISTERED_MOTION_CAPABILITIES as caps} from './capabilities.ts';
const raw=readFileSync(new URL('../test-data/contradb/110.json',import.meta.url),'utf8');
const row=()=>readContraDbImport(raw).record!.rows[3];
test('exact source roles are preserved with a removable direction choice; whole110 stays blocked',()=>{
 const r=row(),unreviewed=normalizeContraDbRow(r,'duple-improper');assert.equal(unreviewed.resolved,false);assert.ok(unreviewed.diagnostics.some(d=>d.code==='rollaway-direction-choice'));
 const p=prepareContraDbReview(raw,[],caps),n=p.result.rows[3];assert.equal(n.resolved,true);assert.equal(p.result.coverage.resolvedRows,9);assert.equal(p.result.coverage.executable,false);assert.equal(p.result.dance,undefined);assert.ok(p.result.diagnostics.some(d=>d.category==='motion-compilation'));
 assert.deepEqual(n.figures,[{id:r.id,beats:4,label:r.text,confidence:'approximate',kind:'rollaway',who:'neighbor',rollRole:'lark',sashayRole:'robin',rollRelation:'neighbor',rollDirection:'left-to-right',rollHalfSashay:true}]);
 assert.deepEqual(p.interpretation.rows![r.id].rollaway,{direction:'left-to-right'});assert.match(rollawayDescription(r),/source names robins as the initiating half-sashayers/);assert.match(rollawayDescription(r),/lark-right\/robin-left/);assert.match(p.suggestions.find(s=>s.rowId===r.id)!.message,/lark rolling left to right in front of the robin/);
 const choice=structuredClone(p.interpretation);delete choice.rows![r.id].rollaway;const withdrawn=readContraDbImport(raw,{capabilities:caps,interpretation:choice});assert.equal(withdrawn.rows[3].resolved,false);assert.ok(withdrawn.rows[3].diagnostics.some(d=>d.code==='rollaway-direction-choice'));
});
test('unsupported direction/modifier/count/event/formation and disabled capability cannot resolve',()=>{
 const r=row();for(const rollaway of[{direction:'right-to-left'},{direction:'left-to-right',hands:'both'},{direction:'left-to-right',rollRole:'robin'},null]){const n=normalizeContraDbRow(r,'duple-improper',{rollaway} as any,caps);assert.equal(n.resolved,false);assert.ok(n.diagnostics.some(d=>d.code==='rollaway-direction-choice'));}
 for(const changed of[{...r,beats:8},{...r,progression:true},{...r,text:r.text+' then clap'},{...r,text:'ladles roll away partners with a half sashay'},{...r,text:'ladles roll away neighbors'}]){assert.equal(rollawaySourceRoles(changed),undefined);const n=normalizeContraDbRow(changed,'duple-improper',{rollaway:{direction:'left-to-right'}},caps);assert.equal(n.resolved,false);assert.ok(n.diagnostics.some(d=>d.code==='unused-interpretation'));}
 assert.equal(normalizeContraDbRow(r,'becket',{rollaway:{direction:'left-to-right'}},caps).resolved,false);
 for(const gate of['stateCarryingSequences','stateCarryingRollaways'] as const)assert.equal(normalizeContraDbRow(r,'duple-improper',{rollaway:{direction:'left-to-right'}},{...caps,[gate]:false}).resolved,false);
});
test('old descriptor/description and lark-first hey interpretation family remain unchanged',()=>{
 const old=readContraDbImport(readFileSync(new URL('../test-data/contradb/99.json',import.meta.url),'utf8')).record!,prior=old.rows[1];
 assert.deepEqual(rollawaySourceRoles(prior),{rollRole:'robin',sashayRole:'lark'});assert.equal(rollawayDescription(prior),ROLLAWAY_DESCRIPTION);assert.equal(rollawayNeighborHey(old,old.rows[2]),true);
 assert.equal(rollawayNeighborHey({...old,rows:old.rows.map((r,i)=>i===1?{...r,text:row().text}:r)},old.rows[2]),false);
 const renamed={...row(),id:'unrelated-row',index:0};assert.deepEqual(normalizeContraDbRow(renamed,'duple-improper',{rollaway:{direction:'left-to-right'}},caps).figures.map(f=>[f.rollRole,f.sashayRole]),[['lark','robin']]);
});
