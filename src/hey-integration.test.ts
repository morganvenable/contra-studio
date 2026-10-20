import test from 'node:test';import assert from 'node:assert/strict';
import {BUTTER_SOURCE_TEXT}from'./butter-source.ts';
import {parseHeyNotation,compileBasicPassEvents,type Actor}from'./hey.ts';
import {compileIntegratedHey,solveRootTransition,type RootConstraint}from'./hey-transition.ts';
const actors:Actor[]=[{id:'L1',role:'lark',couple:'1'},{id:'R1',role:'robin',couple:'1'},{id:'L2',role:'lark',couple:'2'},{id:'R2',role:'robin',couple:'2'}];
const source='(16) Hey (WR;NL;MR;PL;WR;NL;MR)';
const plan=()=>compileBasicPassEvents(parseHeyNotation(source),actors,['L2','R2','R1','L1']);
const entry:RootConstraint[]=[{id:'L2',position:{x:-.9,z:-.9},yaw:Math.PI/2},{id:'R2',position:{x:-.9,z:.9},yaw:Math.PI/2},{id:'R1',position:{x:.9,z:-.9},yaw:-Math.PI/2},{id:'L1',position:{x:.9,z:.9},yaw:-Math.PI/2}];
const exit=entry.map(p=>({...p,yaw:p.position.z<0?0:Math.PI}));
const options={entry,exit,entryBeats:2,exitBeats:2,slotSpacing:1.1,passClearance:.66};
const dist=(a:{x:number;z:number},b:{x:number;z:number})=>Math.hypot(a.x-b.x,a.z-b.z);
const angle=(a:number,b:number)=>Math.abs(Math.atan2(Math.sin(a-b),Math.cos(a-b)));

test('Butter source hey fits actual chain-end corners and partner-balance exits within16beats',()=>{
  const t=compileIntegratedHey(plan(),options);
  assert.equal(t.beats,16);assert.equal(t.gates.length,7);
  for(const expected of entry){const actual=t.entry.find(p=>p.id===expected.id)!;assert.ok(dist(actual.position,expected.position)<1e-10);assert.ok(angle(actual.yaw,expected.yaw)<1e-10);}
  for(const expected of exit){const actual=t.exit.find(p=>p.id===expected.id)!;assert.ok(dist(actual.position,expected.position)<1e-10);assert.ok(angle(actual.yaw,expected.yaw)<1e-10);}
  let minimum=Infinity;
  for(let i=0;i<=6400;i++){const frame=t.sample(16*i/6400);assert.deepEqual(frame.contacts,[]);for(let a=0;a<4;a++)for(let b=a+1;b<4;b++)minimum=Math.min(minimum,dist(frame.poses[a].position,frame.poses[b].position));}
  assert.ok(minimum>=.65999);assert.ok(t.maximumObservedSpeed<1);
});

test('Butter transition joins are C2 and facing-continuous without endpoint correction',()=>{
  const t=compileIntegratedHey(plan(),options);
  for(const beat of[2,14])for(const id of actors.map(p=>p.id)){
    const A=t.sample(beat-1e-7).poses.find(p=>p.id===id)!,B=t.sample(beat+1e-7).poses.find(p=>p.id===id)!;
    assert.ok(dist(A.position,B.position)<1e-6);assert.ok(dist(A.velocity,B.velocity)<1e-6);assert.ok(dist(A.acceleration,B.acceleration)<2e-6);assert.ok(angle(A.yaw,B.yaw)<1e-6);
  }
  for(const time of[1e-7,16-1e-7])for(const id of actors.map(p=>p.id)){
    const p=t.sample(time).poses.find(p=>p.id===id)!,end=(time<1?entry:exit).find(p=>p.id===id)!;assert.ok(angle(p.yaw,end.yaw)<1e-4);
  }
});

test('official JSON and independent canonical clause produce identical hey roots and facing',()=>{
  const record=JSON.parse(BUTTER_SOURCE_TEXT);
  const sourceClause=record.phrases.find((p:{name:string})=>p.name==='B1').figures[0];assert.equal(sourceClause,source);
  const imported=compileIntegratedHey(compileBasicPassEvents(parseHeyNotation(sourceClause),actors,['L2','R2','R1','L1']),options);
  const canonical=compileIntegratedHey(plan(),options);
  for(let t=0;t<=16;t+=.125)assert.deepEqual(imported.sample(t),canonical.sample(t));
});

test('transition body facing has bounded angular speed and no near-zero fallback jump',()=>{
  const t=compileIntegratedHey(plan(),options);let maxRate=0;
  for(const time of[0,1e-12,1e-10,1e-8,1e-7])for(const p of t.sample(time).poses){const expected=entry.find(e=>e.id===p.id)!;assert.ok(angle(p.yaw,expected.yaw)<1e-6);}
  for(let i=1;i<=6400;i++){const a=t.sample((i-1)*16/6400).poses,b=t.sample(i*16/6400).poses;for(const p of a){const q=b.find(q=>q.id===p.id)!;maxRate=Math.max(maxRate,angle(p.yaw,q.yaw)/(16/6400));}}
  assert.ok(maxRate<2.4,`Observed ${maxRate} radians per beat`);
  assert.throws(()=>compileIntegratedHey(plan(),{...options,maximumYawRate:1}),/angular-speed budget/);
});

test('partial exits, altered entry identities, missing budgets and nonfinite/huge transitions remain blocked',()=>{
  const partial=compileBasicPassEvents(parseHeyNotation('(8) Hey 1/2 (WR;PL;MR;NL~)'),actors,['L1','R2','R1','L2']);
  assert.throws(()=>compileIntegratedHey(partial,options),/Partial hey exits/);
  assert.throws(()=>compileIntegratedHey(plan(),{...options,entryBeats:10,exitBeats:10}),/beat budget/);
  assert.throws(()=>solveRootTransition(entry,exit,1e12),/64 beats/);
  assert.throws(()=>solveRootTransition(entry,exit.map((p,i)=>({...p,position:{x:i===0?NaN:p.position.x,z:p.position.z}})),2),/Finite/);
});
