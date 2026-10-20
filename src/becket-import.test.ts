import test from 'node:test';import assert from 'node:assert/strict';
import {parseDance}from'./parser.ts';import{BUTTER_CANDIDATE}from'./catalog.ts';import{BUTTER_SOURCE_TEXT}from'./butter-source.ts';import{compileChoreography}from'./choreography.ts';
const parse=(record:unknown)=>parseDance(typeof record==='string'?record:JSON.stringify(record),{enableBecket:true});
const record=()=>JSON.parse(BUTTER_SOURCE_TEXT);

test('reviewed Becket import preserves the exact source and validates without name dispatch',()=>{
  assert.ok(parseDance(BUTTER_SOURCE_TEXT).dance,'reviewed Becket source is enabled by default');
  assert.equal(parseDance(BUTTER_SOURCE_TEXT,{enableBecket:false}).dance,undefined,'explicit capability opt-out remains respected');
  const source=record();source.Name='Unrelated source title';source.ID='900000';const r=parse(source);
  assert.deepEqual(r.errors,[]);assert.equal(r.dance?.formation,'becket');assert.equal(r.dance?.circulation,'cw');assert.equal(r.validation?.playable,true);assert.equal(r.validation?.samples,512);
  assert.deepEqual(r.record?.fields,source);assert.equal(r.record?.original,JSON.stringify(source));
});

test('official JSON and bundled complete Butter agree on positions, facing and contacts',()=>{
  const imported=parse(BUTTER_SOURCE_TEXT);assert.ok(imported.dance,imported.errors.join('\n'));
  const a=compileChoreography(imported.dance,6),b=compileChoreography(BUTTER_CANDIDATE,6);
  for(let beat=0;beat<128;beat+=.5){const A=a.sample(beat),B=b.sample(beat);assert.deepEqual(A.poses,B.poses);assert.deepEqual(A.contacts,B.contacts);}
});

test('Becket qualifiers, unknown clauses and unreviewed exits are retained and blocked',()=>{
  const cases=[
    (r:any)=>r.Direction='CCW',
    (r:any)=>r.Direction='',
    (r:any)=>r.FormationDetail='Indecent',
    (r:any)=>r.CallingNotes=['Begin offset and skip the first shift.'],
    (r:any)=>r.phrases[0].figures[0]='(2) Shift left twice',
    (r:any)=>r.phrases[0].figures[1]='(6) Circle left 1',
    (r:any)=>{r.phrases[0].figures[0]='(0.001) Shift left';r.phrases[0].figures[1]='(7.999) Circle left 3/4';},
    (r:any)=>r.phrases[2].figures[0]='(16) Hey (WR;N2L;MR;PL;WR;NL;MR)',
    (r:any)=>r.phrases[2].figures[0]='(16) Hey (WR;NL;MR;PL;WR;NL;MR) while others orbit',
    (r:any)=>r.phrases[2].figures[0]='(16) Hey 1/2 (WR;PL;MR;NL~)',
    (r:any)=>r.phrases[3].figures[0]='(4) Neighbor balance',
    (r:any)=>r.phrases[2].figures[0]='(16) Hey (WR;PL;MR;NL;WR;PL;MR)',
  ];
  for(const edit of cases){const r=record();edit(r);const result=parse(r);assert.equal(result.dance,undefined,JSON.stringify(r.phrases));assert.ok(result.errors.length);assert.deepEqual(result.record?.fields,r);}
});

test('explicit Becket timed text preserves direction and full pass syntax',()=>{
  const r=record();const card=['Butter','by Gene Hubert','Formation: Duple Minor - Becket','Direction: CW','Progression: Single',...r.phrases.flatMap((p:any)=>[p.name,...p.figures])].join('\n');
  const imported=parse(card);assert.deepEqual(imported.errors,[]);assert.equal(imported.dance?.figures.find(f=>f.kind==='hey')?.notation,'(16) Hey (WR;NL;MR;PL;WR;NL;MR)');
});
