import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {prepareContraDbReview} from './source-review.ts';
import {readContraDbImport} from './contradb-import.ts';
import {readContraDbSource} from './contradb-source.ts';
import {REGISTERED_MOTION_CAPABILITIES} from './capabilities.ts';
import {CONVENTIONAL_RING_TWIRL} from './ring-twirl-policy.ts';
import {hasRingTwirlSource} from './source-ring-twirl.ts';
const raw=readFileSync(new URL('../test-data/contradb/159.json',import.meta.url),'utf8');
const caps=REGISTERED_MOTION_CAPABILITIES;
const prepared=()=>prepareContraDbReview(raw,[],caps);
function mutateRow(index:number,change:(html:string)=>string){const s=JSON.parse(raw),row=readContraDbSource(raw).record!.rows[index],next=change(row.html);assert.notEqual(next,row.html);s.html=s.html.replace(row.html,next);return JSON.stringify(s);}

test('159 imports exact source, separate reviewed handoff/end policies and only its terminal source progression',()=>{
 const p=prepared(),r=p.result;assert.ok(r.dance,JSON.stringify(r.diagnostics));const d=r.dance;
 assert.equal(r.record!.snapshotId,'contradb:159:cee6ac6f09418126');assert.equal(d.title,'Heartbeat Contra');assert.equal(d.author,'Don Flaherty');assert.equal(d.figures.reduce((n,f)=>n+f.beats,0),64);assert.equal(d.figures.length,11);assert.equal(r.eventFamily,'improper-ring-twirl');assert.deepEqual(p.interpretation.ringTwirl,CONVENTIONAL_RING_TWIRL);
 assert.deepEqual(r.record!.rows.map(row=>row.beats),[8,8,4,12,8,8,8,4,4]);assert.equal(d.figures[4].exit,'neighbor-swing');assert.equal(d.figures[6].amount,1.5);assert.equal(d.figures[6].passingShoulder,'right');
 assert.equal(d.progressionEvents!.length,1);assert.equal(d.progressionEvents![0].afterFigureId,d.figures.at(-1)!.id);assert.equal(d.progressionEvents![0].count,1);assert.equal(d.progressionEvents![0].source.basis,'source-explicit');assert.equal(d.progressionEvents![0].source.clause,r.record!.rows[8].text);
 for(const policy of[d.ringTwirlPolicy!,d.endPolicy!]){assert.equal(policy.source.basis,'reviewed-interpretation');assert.equal(policy.source.sourceId,r.record!.snapshotId);assert.equal(policy.source.url,r.record!.sourceUrl);}
 assert.equal(d.progressionEvents![0].source.sourceId,r.record!.snapshotId);assert.deepEqual(p.interpretation.eventPolicy,{waitingRoleArrangement:'lark-left',sameEndTurnBeats:8,reentryPreparationBeats:4,sameEndTurnOffsetBeats:4});assert.equal(r.record!.rows.filter(row=>row.progression).length,1);assert.equal(r.record!.rows[8].progression,true);
 const replay=readContraDbImport(d.sourceText,{capabilities:caps});assert.deepEqual(replay.dance,d);assert.deepEqual(replay.record,r.record);assert.deepEqual(replay.interpretation,p.interpretation);assert.deepEqual(JSON.parse(d.sourceText).snapshot,JSON.parse(raw));
 assert.equal(readContraDbImport(d.sourceText,{capabilities:{...caps,ringTwirlSequences:false}}).dance,undefined);assert.ok(hasRingTwirlSource({...r.record!,title:'Different retained title',sourceId:'9999'}));
});
test('159 requires every removable choice and rejects stale or contradictory policies',()=>{
 const p=prepared();assert.ok(p.result.dance);for(const field of['ringTwirl','eventPolicy']as const){const i=structuredClone(p.interpretation);delete i[field];assert.equal(readContraDbImport(raw,{interpretation:i,capabilities:caps}).dance,undefined,field);}
 for(const[index,field]of[[0,'petronella'],[1,'petronella'],[4,'gyreShoulder'],[8,'californiaTwirl']]as const){const i=structuredClone(p.interpretation);delete i.rows![`contradb:159:row:${index}`][field];assert.equal(readContraDbImport(raw,{interpretation:i,capabilities:caps}).dance,undefined,`${index}.${field}`);}
 const changes:Array<(i:typeof p.interpretation)=>void>=[i=>{i.ringTwirl!.gyrePhaseBeats=[6,2]as never;},i=>{i.ringTwirl!.balancePhaseBeats=[2,2]as never;},i=>{i.ringTwirl!.twirlPhaseBeats=[4,0]as never;},i=>{i.ringTwirl!.balance='ring'as never;},i=>{i.ringTwirl!.return='same-ring'as never;},i=>{Object.assign(i.ringTwirl!,{extra:true});},i=>{i.eventPolicy!.sameEndTurnOffsetBeats=0 as never;},i=>{i.eventPolicy!.sameEndTurnBeats=4 as never;},i=>{i.eventPolicy!.reentryPreparationBeats=2;},i=>{i.eventPolicy!.waitingRoleArrangement='lark-right';},i=>{i.eventPolicy!.waitingHands='release-during-exchange';},i=>{i.rows!['contradb:159:row:4'].gyreShoulder='left';}];
 for(const change of changes){const i=structuredClone(p.interpretation);change(i);assert.equal(readContraDbImport(raw,{interpretation:i,capabilities:caps}).dance,undefined,String(change));}
});
test('159 exact complete source matcher rejects changed roles/counts/markers and cannot reuse a stale archive',()=>{
 const p=prepared();assert.ok(p.result.dance);
 const mutations=[
 mutateRow(0,h=>h.replace('petronella','petronella then clap')),
 mutateRow(2,h=>h.replace('balance the ring','partners balance')),
 mutateRow(3,h=>h.replace('neighbors swing','partners swing')),
 mutateRow(4,h=>h.replace('ladles gyre 1½','gentlespoons gyre 1½')),
 mutateRow(4,h=>h.replace('ladles gyre 1½','ladles gyre 1')),
 mutateRow(4,h=>h.replace('dance-show-beats>8','dance-show-beats>6')),
 mutateRow(5,h=>h.replace('partners swing','neighbors swing')),
 mutateRow(6,h=>h.replace('left 3 places','right 3 places')),
 mutateRow(7,h=>h.replace('partners balance','balance the ring')),
 mutateRow(8,h=>h.replace('partners California twirl','neighbors California twirl')),
 mutateRow(8,h=>h.replace('partners California twirl','partners California twirl then join two hands')),
 mutateRow(8,h=>h.replace(' ⁋','')),
 mutateRow(7,h=>h.replace('partners balance','partners balance ⁋')),
 ];
 for(const changed of mutations){assert.equal(prepareContraDbReview(changed,[],caps).result.dance,undefined);assert.equal(readContraDbImport(changed,{interpretation:p.interpretation,capabilities:caps}).dance,undefined);const a=JSON.parse(p.result.dance.sourceText);a.snapshot=JSON.parse(changed);assert.ok(readContraDbImport(JSON.stringify(a),{capabilities:caps}).diagnostics.some(d=>d.code==='snapshot-binding'));}
});
