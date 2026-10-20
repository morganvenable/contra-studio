import test from 'node:test';import assert from 'node:assert/strict';import{readFileSync}from'node:fs';import{prepareContraDbReview}from'./source-review.ts';import{readContraDbImport}from'./contradb-import.ts';import{readContraDbSource}from'./contradb-source.ts';import{compileChoreography}from'./choreography.ts';import{REGISTERED_MOTION_CAPABILITIES}from'./capabilities.ts';
const raw=readFileSync(new URL('../test-data/contradb/443.json',import.meta.url),'utf8'),record=readContraDbSource(raw).record!;
function changed(index:number,from:string,to:string){const s=JSON.parse(raw),r=record.rows[index];assert.ok(r.html.includes(from));s.html=s.html.replace(r.html,r.html.replace(from,to));return JSON.stringify(s);}
test('complete eight-count do-si-do/swing opening uses the same explicit six-plus-two policy',()=>{
 const p=prepareContraDbReview(raw),r=p.result;assert.ok(r.dance,JSON.stringify(r.errors));assert.equal(record.snapshotId,'contradb:443:7333a72e757bb511');assert.deepEqual(record.rows.map(r=>r.beats),[8,8,8,8,8,8,8,6,2]);assert.deepEqual(r.dance.figures.slice(0,2).map(f=>[f.kind,f.who,f.beats,f.amount]),[['do-si-do','neighbor',8,1],['swing','neighbor',8,undefined]]);assert.equal(r.dance.figures.reduce((n,f)=>n+f.beats,0),64);assert.equal(record.rows.at(-1)!.progression,true);assert.match(record.rows.at(-1)!.text,/⁋/u);assert.ok(!record.rows.at(-1)!.text.includes('\\u204b'));assert.equal(r.dance.progressionEvents![0].source.basis,'source-explicit');assert.equal(r.dance.progressionEvents![0].source.sourceId,record.snapshotId);
 const replay=readContraDbImport(r.dance.sourceText);assert.deepEqual(replay.record,r.record);assert.deepEqual(replay.interpretation,p.interpretation);assert.deepEqual(replay.dance?.figures,r.dance.figures);assert.deepEqual(replay.dance?.sixTwoPassPolicy,r.dance.sixTwoPassPolicy);assert.deepEqual(replay.dance?.endPolicy,r.dance.endPolicy);
 for(const n of[2,3,6,12]){const a=compileChoreography(r.dance,n),b=compileChoreography(replay.dance!,n);assert.ok(a.repeatable);for(let beat=0;beat<=64*2*n;beat+=8)assert.deepEqual(a.sample(beat),b.sample(beat));}
 for(const key of['sixTwoPass','eventPolicy']as const){const choice=structuredClone(p.interpretation);delete choice[key];assert.equal(readContraDbImport(raw,{interpretation:choice}).dance,undefined);}const choice=structuredClone(p.interpretation);delete choice.rows![record.rows[8].id].passThrough;assert.equal(readContraDbImport(raw,{interpretation:choice}).dance,undefined);assert.equal(readContraDbImport(r.dance.sourceText,{capabilities:{...REGISTERED_MOTION_CAPABILITIES,sixTwoPasses:false}}).dance,undefined);
});
test('fresh source changes require current semantics while old opening choices and archives remain bound',()=>{
 const p=prepareContraDbReview(raw);assert.ok(p.result.dance);
 const partnerOpening=changed(0,'neighbors','partners');
 for(const input of[changed(0,'once','1½'),partnerOpening,changed(0,'dance-show-beats>8','dance-show-beats>6'),changed(1,'dance-show-beats>8','dance-show-beats>10'),changed(1,'neighbors swing','neighbors long swing'),changed(1,'neighbors swing','partners swing'),changed(8,'⁋',''),changed(8,'⁋','\\u204b'),changed(8,'⁋','then clap ⁋'),changed(7,'circle left','circle right')]){
  assert.equal(readContraDbImport(input,{interpretation:p.interpretation}).dance,undefined);
  const archive=JSON.parse(p.result.dance.sourceText);archive.snapshot=JSON.parse(input);
  assert.ok(readContraDbImport(JSON.stringify(archive)).diagnostics.some(d=>d.code==='snapshot-binding'));
  const fresh=prepareContraDbReview(input).result;
  if(input!==partnerOpening){assert.equal(fresh.dance,undefined);continue;}
  // A fresh literal partner orbit is valid through the state-carrying tail;
  // it must not inherit the old neighbor-opening policy or snapshot evidence.
  assert.ok(fresh.dance,JSON.stringify(fresh.errors));const dance=fresh.dance;
  assert.deepEqual(dance.figures.slice(0,2).map(f=>[f.kind,f.who,f.beats,f.amount]),[['do-si-do','partner',8,1],['swing','neighbor',8,undefined]]);
  assert.equal(dance.figures.reduce((n,f)=>n+f.beats,0),64);assert.equal(dance.sixTwoPassPolicy,undefined);
  assert.notEqual(fresh.record!.snapshotId,record.snapshotId);
  assert.equal(dance.progressionEvents!.length,1);const event=dance.progressionEvents![0];
  assert.equal(event.source.basis,'source-explicit');assert.equal(event.source.sourceId,fresh.record!.snapshotId);assert.equal(event.afterFigureId,dance.figures.at(-1)!.id);
  assert.deepEqual(readContraDbImport(dance.sourceText).dance,dance);
  const program=compileChoreography(dance,2),frame=(beat:number)=>program.formationSample?.(beat)??program.sample(beat);
  const bearing=(beat:number)=>{const poses=frame(beat).poses;return Math.atan2(poses[0].position.z-poses[1].position.z,poses[0].position.x-poses[1].position.x);};
  let winding=0,last=bearing(0);for(let beat=.25;beat<=8;beat+=.25){const next=bearing(beat);winding+=Math.atan2(Math.sin(next-last),Math.cos(next-last));last=next;}
  assert.ok(Math.abs(winding-2*Math.PI)<1e-7,'the literal partner do-si-do completes its full orbit');
  for(let id=0;id<4;id++)assert.ok(Math.hypot(frame(8).poses[id].position.x-frame(0).poses[id].position.x,frame(8).poses[id].position.z-frame(0).poses[id].position.z)<1e-7,'the opening returns to its own slots');
  assert.equal(program.topology!(63.999999).epoch,0);assert.equal(program.topology!(64).epoch,1);
  assert.deepEqual(program.sample(0).poses,program.sample(program.periodRepeats!*64).poses);
 }
});
