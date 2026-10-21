import test from 'node:test';import assert from 'node:assert/strict';import{readFileSync}from'node:fs';
import{prepareContraDbReview}from'./source-review.ts';import{readContraDbImport}from'./contradb-import.ts';import{compileChoreography}from'./choreography.ts';import{REGISTERED_MOTION_CAPABILITIES}from'./capabilities.ts';
import{captureFormationState,assertFormationHandoff}from'./formation-handoff.ts';import{readContraDbSource}from'./contradb-source.ts';
const caps=REGISTERED_MOTION_CAPABILITIES,ids=[769,871,894,3454],clause='partners start a half hey - rights on ends, lefts in center';
const raw=(id:number)=>readFileSync(new URL(`../test-data/contradb/${id}.json`,import.meta.url),'utf8');
function source(id:number){const p=prepareContraDbReview(raw(id),[],caps);assert.ok(p.result.dance,p.result.errors.join('; '));return p;}
for(const id of ids)test(`${id}: exact partner-first source, independent choices and bound archive replay`,()=>{
 const p=source(id),r=p.result,d=r.dance!,row=r.rows.find(row=>row.source.text===clause)!,f=row.figures[0],gyre=id===894||id===3454;
 assert.equal(r.coverage.resolvedRows,r.record!.rows.length);assert.equal(d.figures.reduce((n,f)=>n+f.beats,0),64);assert.equal(row.source.beats,8);assert.equal(row.source.progression,false);
 assert.deepEqual([f.kind,f.beats,f.amount,f.who,f.heyStartPair,f.heyStartRole,f.centerShoulder,f.endShoulder,f.entry,f.exit,f.progression],['hey',8,.5,'partner','partner',undefined,'left','right','paired-sidelines',gyre?'opposite-paired-gyre':'opposite-paired-balance',undefined]);
 assert.deepEqual(p.interpretation.rows![row.source.id].ordinaryHey,{sidePair:'partner',exit:f.exit});
 // Execution figures are owned copies of resolved row figures. Match their
 // stable figure identity rather than relying on shared object references.
 const index=d.figures.findIndex(figure=>figure.id===f.id);assert.ok(index>=0);assert.deepEqual(d.figures[index],f);
 const next=d.figures[index+1];assert.equal(next.who,'partner');assert.equal(next.beats,4);assert.equal(next.kind,gyre?'gyre':'balance');if(gyre){assert.equal(next.passingShoulder,'right');assert.equal(next.amount,1);}
 assert.equal(d.figures.filter(f=>f.progression).length,1);assert.equal(d.figures.at(-1)!.progression,true);assert.equal(p.interpretation.progression,undefined);
 if(id===871){assert.equal(r.record!.hook,'box the gnat into hey');assert.equal(p.interpretation.hookReview,undefined);}
 const replay=readContraDbImport(d.sourceText,{capabilities:caps});assert.deepEqual(replay.dance?.figures,d.figures);assert.deepEqual(replay.interpretation,p.interpretation);assert.equal(replay.record?.original,r.record!.original);assert.equal(replay.record?.snapshotId,r.record!.snapshotId);
 for(const change of[undefined,{sidePair:'neighbor',exit:f.exit},{sidePair:'partner',exit:gyre?'opposite-paired-balance':'opposite-paired-gyre'},{sidePair:'partner',exit:'opposite-paired-swing'},{sidePair:'partner',exit:'progressed-neighbors'},{sidePair:'partner',exit:f.exit,extraPass:true}]){const choice=structuredClone(p.interpretation)as any;choice.rows[row.source.id].ordinaryHey=change;assert.equal(readContraDbImport(raw(id),{interpretation:choice,capabilities:caps}).dance,undefined,JSON.stringify(change));}
 assert.equal(readContraDbImport(d.sourceText,{capabilities:{...caps,partnerFirstHalfHeys:false}}).dance,undefined);assert.throws(()=>compileChoreography(d,2,{...caps,partnerFirstHalfHeys:false}),/partner-first|pair-first/i);assert.equal(readContraDbImport(d.sourceText,{capabilities:{...caps,ordinaryHalfHeys:false}}).dance,undefined);assert.ok(readContraDbImport(d.sourceText,{capabilities:{...caps,ordinaryFullHeys:false,partialHeys:false,ordinaryHeyHandoffs:false}}).dance);
});
test('partner-first source changes cannot inherit stale choices or add unreviewed variants and progression',()=>{
 for(const id of ids){const p=source(id),snapshot=JSON.parse(raw(id));const mutations:Array<[string,string]>=[['half hey','full hey'],['half hey','half dolphin hey'],['half hey','half circular hey'],['half hey','half diagonal hey'],['half hey','half hey and clap'],['partners start','neighbors start'],['rights on ends, lefts in center','rights on ends, rights in center'],['rights on ends, lefts in center','____ on ends, ____ in center'],[clause,`${clause} ⁋`],[clause,`${clause} to new neighbor`],[id===894||id===3454?'partners meltdown swing':'partners balance &amp; swing',id===894||id===3454?'neighbors meltdown swing':'neighbors balance &amp; swing']];
  for(const[from,to]of mutations){const changed=structuredClone(snapshot);assert.ok(changed.html.includes(from),from);changed.html=changed.html.replace(from,to);const text=JSON.stringify(changed);assert.equal(readContraDbImport(text,{capabilities:caps,interpretation:p.interpretation}).dance,undefined,`${id}: ${from} -> ${to}`);assert.equal(prepareContraDbReview(text,[],caps).result.dance,undefined,`fresh ${id}: ${from} -> ${to}`);const archive=JSON.parse(p.result.dance!.sourceText);archive.snapshot=changed;assert.ok(readContraDbImport(JSON.stringify(archive),{capabilities:caps}).diagnostics.some(d=>d.code==='snapshot-binding'));}
  const changed=structuredClone(snapshot),pattern=new RegExp('(class=dance-show-beats>)8(</td>\\s*<td><div class="show-figure">'+clause+')');assert.ok(pattern.test(changed.html));changed.html=changed.html.replace(pattern,'$16$2');assert.equal(readContraDbSource(JSON.stringify(changed)).record?.rows.find(row=>row.text===clause)?.beats,6);assert.equal(prepareContraDbReview(JSON.stringify(changed),[],caps).result.dance,undefined,'six-count source is not stretched');
  const noMarker=structuredClone(snapshot);noMarker.html=noMarker.html.replaceAll('⁋','');assert.equal(readContraDbImport(JSON.stringify(noMarker),{capabilities:caps,interpretation:p.interpretation}).dance,undefined,'the half-hey choice cannot invent terminal progression');
 }
});
test('actual wrapped half-hey boundary preserves people, source counts and effective contacts',()=>{
 for(const id of ids){const d=source(id).result.dance!,c=compileChoreography(d,2,caps),index=d.figures.findIndex(f=>f.heyStartPair==='partner'),beat=c.starts[index]+8,a=c.sample(beat-1e-7),b=c.sample(beat+1e-7),gyre=id===894||id===3454,geometry={kind:'paired-sidelines' as const,sidePair:'partner' as const,origin:{x:0,z:0},halfWidth:.9,pairGap:gyre?1.1:1.18};
  const context=(start:typeof a.poses)=>({ids:[0,1,2,3],start,dancers:c.dancers,relations:{epoch:0,partner:new Map([[0,1],[1,0],[2,3],[3,2]]),neighbor:new Map([[0,3],[3,0],[1,2],[2,1]])},bindingEpoch:0});
  const from=captureFormationState(context(a.poses),{sourceBeat:beat,orderedIds:[0,1,2,3],geometry,heldContacts:a.contacts}),to=captureFormationState(context(b.poses),{sourceBeat:beat,orderedIds:[0,1,2,3],geometry,heldContacts:b.contacts});assertFormationHandoff(from,to);assert.equal(b.contacts.length,gyre?0:4);for(const h of b.contacts)assert.equal(c.dancers[h.a].couple,c.dancers[h.b].couple);
  assert.equal(c.sample(c.starts[index]).contacts.length,0,'actual predecessor has released before the first pass');for(const local of[1.25,35/12,55/12,6.25])assert.equal(c.sample(c.starts[index]+local).contacts.length,0,'every named pass gate remains hand-free');
 }
});
test('unknown-shoulder, six-count partial and sketchbook sources stay excluded with retained snapshots',()=>{
 for(const[id,code]of[[266,'unsupported-figure-variant'],[3280,'partial-hey-entry'],[2494,'sketchbook-source']]as const){
  const text=raw(id),p=prepareContraDbReview(text,[],caps);assert.equal(p.result.dance,undefined);assert.ok(p.result.diagnostics.some(d=>d.code===code),`${id} retains ${code}`);assert.ok(p.result.rows.every(row=>row.figures.every(f=>f.heyStartPair===undefined)));
  const choices=structuredClone(p.interpretation);for(const row of p.result.rows){if(row.source.text==='ladles chain')(choices.rows??={})[row.source.id]={chainReceiver:'neighbor'};if(row.source.text.includes('hey'))(choices.rows??={})[row.source.id]={ordinaryHey:{sidePair:'partner',exit:'opposite-paired-balance'}};}
  assert.equal(readContraDbImport(text,{capabilities:caps,interpretation:choices}).dance,undefined,'a composition choice cannot overwrite missing source semantics');
 }
});
