import test from 'node:test';
import assert from 'node:assert/strict';
import {compileNeutralRoleHeyStep} from './neutral-role-hey-step.ts';
import {compileNeutralFullHeyStep} from './neutral-full-hey-step.ts';
import {captureSequenceBoundary,assertSequenceHandoff,sampleSequenceBoundary} from './sequence-boundary.ts';
import {sampleFormationEndpoint} from './formation-handoff.ts';
import {createDancers,compilePrimitiveFigure} from './engine.ts';
import {compileChainFigure} from './chain.ts';
import type {Figure} from './types.ts';
import type {FigureContext} from './extended-figures.ts';

const figure=(amount:.5|1=.5,neighbor=false):Figure=>({id:'neutral-role-hey',label:'Explicit role-first hey',kind:'hey',beats:amount*16,amount,who:neighbor?'neighbor':'partner',heyStartRole:neighbor?'lark':'robin',centerShoulder:neighbor?'left':'right',endShoulder:neighbor?'right':'left',entry:'paired-sidelines',exit:(amount===.5?'opposite-slots-facing-across':'same-slots-facing-across') as Figure['exit']});
const context=(neighbor=false,width=.9,depth=.55):FigureContext=>({ids:[0,1,2,3],dancers:createDancers(2),start:(neighbor?[[1,1],[-1,1],[-1,-1],[1,-1]]:[[-1,-1],[-1,1],[1,1],[1,-1]]).map(([x,z],id)=>({id,position:{x:x*width,z:z*depth},yaw:x<0?Math.PI/2:-Math.PI/2,stride:0,lean:0,bounce:0,turn:0,activity:'hey'})),relations:{epoch:7,partner:new Map([[0,1],[1,0],[2,3],[3,2]]),neighbor:new Map([[0,3],[3,0],[1,2],[2,1]])},bindingEpoch:7});
const turn=(a:number,b:number)=>Math.abs(Math.atan2(Math.sin(a-b),Math.cos(a-b)));
const gap=(a:{x:number;z:number},b:{x:number;z:number})=>Math.hypot(a.x-b.x,a.z-b.z);

test('neutral half hey preserves six literal encounters, eight counts and reversed measured stations',()=>{
 const oracles=[
  {tokens:['WR','NL','MR','PL'],pairs:[[[1,3]],[[0,3],[1,2]],[[0,2]],[[3,2],[0,1]]],station:[2,3,0,1]},
  {tokens:['ML','PR','WL','NR'],pairs:[[[2,0]],[[1,0],[2,3]],[[1,3]],[[0,3],[1,2]]],station:[2,3,0,1]}
 ];
 for(const neighbor of[false,true]){
  const c=context(neighbor),incoming=captureSequenceBoundary(c,12,[]),plan=compileNeutralRoleHeyStep(figure(.5,neighbor),c,incoming),want=oracles[Number(neighbor)];
  assertSequenceHandoff(incoming,plan.entryState);
  assert.equal(plan.exitState.sourceBeat,20);assert.equal(plan.exitState.relationshipEpoch,7);
  assert.deepEqual(plan.exitState.actors,incoming.actors);assert.deepEqual(plan.exitState.partner,incoming.partner);assert.deepEqual(plan.exitState.neighbor,incoming.neighbor);assert.deepEqual(plan.exitState.heldContacts,[]);
  assert.deepEqual(plan.heyPlan.events.map(e=>e.token.raw),want.tokens);
  assert.deepEqual(plan.heyPlan.events.map(e=>e.pairs.map(pair=>pair.map(Number))),want.pairs);
  assert.equal(plan.heyPlan.events.reduce((n,e)=>n+e.pairs.length,0),6);
  for(const id of c.ids){
   assert.deepEqual(plan.position(id,1),c.start[want.station[id]].position);
   assert.ok(turn(plan.facing(id,1,[]),plan.position(id,1).x<0?Math.PI/2:-Math.PI/2)<1e-7);
  }
  for(const gate of plan.heyPlan.gates)for(const[a,b]of gate.pairs){
   const poses=plan.heyPlan.sample(gate.beat).poses,A=poses.find(p=>p.id===a)!,B=poses.find(p=>p.id===b)!;
   const side=(B.position.x-A.position.x)*-Math.cos(A.yaw)+(B.position.z-A.position.z)*Math.sin(A.yaw);
   assert.ok(side*(gate.shoulder==='right'?1:-1)>.5);
  }
  assert.ok(plan.heyPlan.minimumCertifiedClearance>=.5);assert.ok(plan.heyPlan.maximumCertifiedSpeed<=1.3);assert.ok(plan.heyPlan.maximumCertifiedYawRate<=4);
  for(const beat of plan.heyPlan.phaseBoundaries.filter(b=>b>0&&b<8))for(const id of c.ids){
   assert.ok(gap(plan.position(id,(beat-1e-7)/8),plan.position(id,(beat+1e-7)/8))<1e-5);
   assert.ok(turn(plan.facing(id,(beat-1e-7)/8,[]),plan.facing(id,(beat+1e-7)/8,[]))<1e-5);
  }
 }
});

test('full-mode compatibility wrapper delegates the same samples and boundaries',()=>{
 for(const neighbor of[false,true]){
  const c=context(neighbor),incoming=captureSequenceBoundary(c,0,[]),f=figure(1,neighbor),old=compileNeutralFullHeyStep(f,c,incoming),plan=compileNeutralRoleHeyStep(f,c,incoming);
  assert.deepEqual(plan.entryState,old.entryState);assert.deepEqual(plan.exitState,old.exitState);
  for(const id of c.ids)for(let k=0;k<=64;k++){assert.deepEqual(plan.position(id,k/64),old.position(id,k/64));assert.equal(plan.facing(id,k/64,[]),old.facing(id,k/64,[]));}
 }
});

test('translated unequal measured station offsets survive without successor-driven normalization',()=>{
 const c=context(false,.82,.6);for(const p of c.start){p.position.x+=2;p.position.z-=4;}
 // Shift both members of each actual sideline independently; no reflected-root shortcut.
 for(const id of[0,1])c.start[id].position.z+=.04;
 for(const id of[2,3])c.start[id].position.z-=.04;
 const incoming=captureSequenceBoundary(c,2.5,[]),plan=compileNeutralRoleHeyStep(figure(),c,incoming);
 for(const id of c.ids)assert.deepEqual(plan.position(id,1),c.start[[2,3,0,1][id]].position);
 const lines:Figure={id:'new-successor',label:'Long lines',kind:'long-lines',beats:8,who:'all'},nextContext={...c,start:sampleFormationEndpoint(c,plan,1),next:undefined};
 const next=compilePrimitiveFigure(lines,c.ids,nextContext.start,c.dancers,[1,-1]);
 assertSequenceHandoff(plan.exitState,sampleSequenceBoundary(nextContext,next,10.5,0));
 for(const successor of[lines,undefined,{...lines,kind:'unknown' as const}]){
  const variant=compileNeutralRoleHeyStep({...figure(),id:'arbitrary',label:'No source selector'},{...c,next:successor},incoming);
  for(const id of c.ids)for(const t of[0,.2,.6,1])assert.deepEqual(variant.position(id,t),plan.position(id,t));
 }
});

test('released opposite stations satisfy independent chain geometry and receiver identity',()=>{
 const c=context(),incoming=captureSequenceBoundary(c,0,[]),plan=compileNeutralRoleHeyStep(figure(),c,incoming),nextContext={...c,start:sampleFormationEndpoint(c,plan,1)};
 const chain:Figure={id:'chain',label:'Robins chain to neighbors',kind:'robins-chain',who:'neighbor',beats:8};
 const next=compileChainFigure(chain,nextContext);
 assert.deepEqual([...next.receivers].sort((a,b)=>a[0]-b[0]),[[1,2],[3,0]]);
 for(const id of c.ids)assert.deepEqual(next.position(id,0),plan.position(id,1));
 // The chain primitive derives its own approach tangent. Its existing public
 // wrapper owns entry-facing acquisition; this direct geometry check does not
 // certify a bare-primitive yaw handoff.
});

test('the same eight-count schedule certifies compact and wide incoming stations',()=>{
 for(const depth of[.55,.9]){
  const c=context(false,.9,depth),incoming=captureSequenceBoundary(c,0,[]),plan=compileNeutralRoleHeyStep(figure(),c,incoming);
  assert.deepEqual(plan.heyPlan.gates.map(g=>g.beat),[17/8,43/12,121/24,13/2]);
  assert.ok(plan.heyPlan.maximumCertifiedSpeed<=1.3);
  assert.ok(plan.heyPlan.maximumCertifiedYawRate<=4);
  assert.ok(plan.heyPlan.minimumCertifiedClearance>=.5);
  assertSequenceHandoff(incoming,plan.entryState);
  for(const id of c.ids)assert.deepEqual(plan.position(id,1),c.start[[2,3,0,1][id]].position);
 }
});

test('explicit unsupported meaning, stale state and held entry reject instead of being repaired',()=>{
 const c=context(),incoming=captureSequenceBoundary(c,0,[]),f=figure();
 for(const patch of[{beats:7},{amount:.25},{progression:true},{exit:'same-slots-facing-across'},{heyStartPair:'partner'},{centerShoulder:'left'},{notation:'(8) Hey 1/2 (WR;NL;MR;PL)'},{direction:'left'},{confidence:'unsupported'}]){
  assert.throws(()=>compileNeutralRoleHeyStep({...f,...patch} as Figure,c,incoming));
 }
 assert.throws(()=>compileNeutralRoleHeyStep(f,c,{...incoming,relationshipEpoch:8}));
 assert.throws(()=>compileNeutralRoleHeyStep(f,c,{...incoming,heldContacts:[{a:0,b:1,handA:'left',handB:'right',kind:'joined',point:{x:0,y:1,z:0},strength:1}]}));
 const plan=compileNeutralRoleHeyStep(f,c,incoming);
 assert.throws(()=>plan.position(999,.5));assert.throws(()=>plan.position(0,NaN));
});

