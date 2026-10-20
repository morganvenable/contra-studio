import test from'node:test';import assert from'node:assert/strict';import{readFileSync}from'node:fs';
import{READY_LIBRARY}from'./ready-library.ts';import{readContraDbImport}from'./contradb-import.ts';import{prepareContraDbReview}from'./source-review.ts';import{compileChoreography}from'./choreography.ts';import{compileStateSequence}from'./state-sequence.ts';import{withBalanceStance}from'./stance.ts';import{stateSequenceApplicability}from'./sequence-admission.ts';import{motionCompilationFailure,isMotionCompilationFailure}from'./motion-compilation-result.ts';import{REGISTERED_MOTION_CAPABILITIES}from'./capabilities.ts';
const shipped=(id:string)=>{const entry=READY_LIBRARY.find(x=>x.id===id)!;const r=readContraDbImport(entry.archive);assert.ok(r.dance,r.errors.join('; '));return{entry,dance:r.dance};};
function explicit1166(){const {entry,dance}=shipped('1166'),last=dance.sourceRecord.rows.at(-1)!;assert.equal(last.progression,true);assert.match(last.text,/star left.*⁋/);const alternate=structuredClone(dance);alternate.progressionEvents=[{afterFigureId:alternate.figures.at(-1)!.id,count:1,waitingRoleArrangement:'lark-left',source:{sourceId:dance.sourceRecord.snapshotId,url:dance.sourceRecord.sourceUrl,clause:last.text,basis:'source-explicit'}}];return{entry,dance,alternate};}
test('shipped1166 remains valid and its genuine terminal-event alternate selects the shared route',()=>{
 const{entry,dance,alternate}=explicit1166();assert.equal(dance.progressionEvents,undefined);assert.equal(stateSequenceApplicability(dance),'not-applicable');assert.equal(stateSequenceApplicability(alternate),'applicable');
 const old=compileChoreography(dance,3),publicProgram=compileChoreography(alternate,3),direct=withBalanceStance(compileStateSequence(alternate,3,REGISTERED_MOTION_CAPABILITIES));
 for(let r=0;r<6;r++)for(const b of[0,4,8,16,32,48,63.999999]){const t=r*64+b;assert.deepEqual(publicProgram.sample(t),direct.sample(t));assert.deepEqual(publicProgram.sample(t),old.sample(t));}
 assert.equal(shipped('1166').entry.archive,entry.archive);assert.equal(publicProgram.repeatable,true);
});
test('selected terminal-route semantic failures cannot fall back into legacy compilation',()=>{
 const{alternate}=explicit1166();
 for(const change of[(d:typeof alternate)=>{d.progressionEvents![0].afterFigureId=d.figures[0].id;},(d:typeof alternate)=>{d.progressionEvents![0].count=2;},(d:typeof alternate)=>{d.progressionEvents![0].source.sourceId+=':wrong';},(d:typeof alternate)=>{d.progressionEvents=[];},(d:typeof alternate)=>{d.figures.at(-1)!.progression=false;}]){const d=structuredClone(alternate);change(d);assert.equal(stateSequenceApplicability(d),'applicable');assert.throws(()=>compileChoreography(d,3));}
 for(const id of['2693','1992']){const legacy=shipped(id).dance;assert.equal(stateSequenceApplicability(legacy),'not-applicable');assert.equal(compileChoreography(legacy,3).repeatable,true);}
});
test('receiver search consumes a stable compilation category rather than adapter display codes',()=>{
 assert.equal(isMotionCompilationFailure(motionCompilationFailure('future-adapter-code','failure')),true);assert.equal(isMotionCompilationFailure({}),false);
 const raw=readFileSync(new URL('../test-data/contradb/115.json',import.meta.url),'utf8'),p=prepareContraDbReview(raw);assert.ok(p.result.dance,p.result.errors.join('; '));const row=p.result.record!.rows[8].id,wrong=structuredClone(p.interpretation);wrong.rows![row].rightLeftThrough={hand:'right',courtesyReceiver:'partner',courtesyLeader:'lark',crossingRelation:'neighbor'};const rejected=readContraDbImport(raw,{interpretation:wrong});assert.equal(rejected.dance,undefined);assert.ok(rejected.diagnostics.some(d=>d.code==='motion:event-compile'&&isMotionCompilationFailure(d)));
 assert.deepEqual(p.interpretation.rows![row].rightLeftThrough,{hand:'right',courtesyReceiver:'neighbor',courtesyLeader:'lark',crossingRelation:'partner'});
 const malformed=JSON.parse(p.result.dance.sourceText);malformed.sourceSnapshotId='';const bad=readContraDbImport(JSON.stringify(malformed));assert.ok(bad.diagnostics.some(d=>d.code==='snapshot-binding'&&!isMotionCompilationFailure(d)));
});
