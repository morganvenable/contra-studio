import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync}from'node:fs';
import {prepareContraDbReview}from'./source-review.ts';import{readContraDbImport}from'./contradb-import.ts';import{compileChoreography}from'./choreography.ts';import{REGISTERED_MOTION_CAPABILITIES}from'./capabilities.ts';
import {captureFormationState,assertFormationHandoff}from'./formation-handoff.ts';
const caps=REGISTERED_MOTION_CAPABILITIES,raw=(id:number)=>readFileSync(new URL(`../test-data/contradb/${id}.json`,import.meta.url),'utf8');
function source(id:number){const p=prepareContraDbReview(raw(id),[],caps);assert.ok(p.result.dance,p.result.errors.join('; '));return p;}
for(const id of[1093,354,2684])test(`${id}: exact full-hey source, complete archive replay and removable choices`,()=>{
 const p=source(id),r=p.result,d=r.dance!,f=r.rows[2].figures[0];
 assert.equal(r.coverage.resolvedRows,r.record!.rows.length);assert.equal(d.figures.reduce((n,f)=>n+f.beats,0),64);assert.equal(r.record!.rows[2].beats,16);assert.equal(r.record!.rows[2].progression,false);
 assert.deepEqual([f.kind,f.beats,f.amount,f.who,f.heyStartRole,f.centerShoulder,f.endShoulder,f.entry,f.exit,f.progression],['hey',16,1,'partner','robin',id===2684?'left':'right',id===2684?'right':'left','paired-sidelines',id===1093?'same-slots-partner-balance':'same-person-swing',undefined]);
 assert.deepEqual(p.interpretation.rows![`contradb:${id}:row:2`].ordinaryHey,{sidePair:'partner',exit:f.exit});
 const replay=readContraDbImport(d.sourceText,{capabilities:caps});assert.deepEqual(replay.dance?.figures,d.figures);assert.deepEqual(replay.interpretation,p.interpretation);assert.equal(replay.record?.original,r.record!.original);assert.equal(replay.record?.snapshotId,r.record!.snapshotId);
 if(id===1093){assert.equal(r.record!.rows.some(r=>r.progression),false);assert.equal(p.interpretation.progression,'end-of-cycle');}else{assert.equal(r.record!.rows.at(-1)!.progression,true);assert.equal(p.interpretation.progression,undefined);}
 for(const change of[undefined,{sidePair:'neighbor',exit:f.exit},{sidePair:'partner',exit:'opposite-paired-balance'},{sidePair:'partner',exit:'progressed-neighbors'},{sidePair:'partner',exit:f.exit,extraPass:true}]){const choice=structuredClone(p.interpretation)as any;choice.rows[`contradb:${id}:row:2`].ordinaryHey=change;assert.equal(readContraDbImport(raw(id),{interpretation:choice,capabilities:caps}).dance,undefined);}
 assert.equal(readContraDbImport(d.sourceText,{capabilities:{...caps,ordinaryHeyHandoffs:false}}).dance,undefined);assert.throws(()=>compileChoreography(d,2,{...caps,ordinaryHeyHandoffs:false}),/handoff|continuation/i);assert.equal(readContraDbImport(d.sourceText,{capabilities:{...caps,ordinaryFullHeys:false}}).dance,undefined);assert.ok(readContraDbImport(d.sourceText,{capabilities:{...caps,ordinaryHalfHeys:false,partialHeys:false}}).dance);
});
test('source variants cannot inherit the ordinary full-hey continuation by shape or label',()=>{
 const p=source(1093),snapshot=JSON.parse(raw(1093));
 for(const[from,to]of[['full hey','half hey'],['full hey','full dolphin hey'],['full hey','full circular hey'],['full hey','full diagonal hey'],['full hey','full hey and clap'],['rights in center, lefts on ends','rights in center, rights on ends'],['rights in center, lefts on ends','____ in center, ____ on ends'],['partners balance &amp; swing','neighbors balance &amp; swing']]){
  const changed=structuredClone(snapshot);assert.ok(changed.html.includes(from),from);changed.html=changed.html.replace(from,to);const r=readContraDbImport(JSON.stringify(changed),{capabilities:caps,interpretation:p.interpretation});assert.equal(r.dance,undefined,`${from} -> ${to}`);
 }
 for(const id of[1093,354,2684]){const p=source(id),changed=JSON.parse(raw(id));changed.html=changed.html.replace(/(start a full hey - (?:rights|lefts) in center, (?:rights|lefts) on ends)/,'$1 ⁋');assert.equal(readContraDbImport(JSON.stringify(changed),{capabilities:caps,interpretation:p.interpretation}).dance,undefined);const archived=JSON.parse(p.result.dance!.sourceText);archived.snapshot=changed;assert.ok(readContraDbImport(JSON.stringify(archived),{capabilities:caps}).diagnostics.some(d=>d.code==='snapshot-binding'));}
});
test('effective balance/swing handoffs retain roots, partners and contacts through the stance wrapper',()=>{
 for(const id of[1093,354,2684]){const d=source(id).result.dance!,c=compileChoreography(d,2,caps),index=d.figures.findIndex(f=>f.kind==='hey'),beat=c.starts[index]+16,a=c.sample(beat-1e-7),b=c.sample(beat+1e-7),geometry={kind:'paired-sidelines' as const,sidePair:'partner' as const,origin:{x:0,z:0},halfWidth:.9,pairGap:id===1093?1.18:.62};
  const context=(start:typeof a.poses)=>({ids:[0,1,2,3],start,dancers:c.dancers,relations:{epoch:0,partner:new Map([[0,1],[1,0],[2,3],[3,2]]),neighbor:new Map([[0,3],[3,0],[1,2],[2,1]])},bindingEpoch:0});
  const from=captureFormationState(context(a.poses),{sourceBeat:beat,orderedIds:[0,1,2,3],geometry,heldContacts:a.contacts}),to=captureFormationState(context(b.poses),{sourceBeat:beat,orderedIds:[0,1,2,3],geometry,heldContacts:b.contacts});assertFormationHandoff(from,to);
  assert.equal(b.contacts.length,id===1093?4:6);for(const h of b.contacts)assert.equal(c.dancers[h.a].couple,c.dancers[h.b].couple);
  for(const local of[2,3.75,5.5,7.25,9,10.75,12.5,14.25])assert.equal(c.sample(c.starts[index]+local).contacts.length,0,'every named hey gate is hand-free');
 }
});
