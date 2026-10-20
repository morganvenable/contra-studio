import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createDancers} from './engine.ts';
import {readContraDbSource} from './contradb-source.ts';
import {bindActorGroups,bindDirectedCoupleSlots,rebindAtEndpoint,compileSameEndExchange,compileSameEndArc,createFiniteBecketState,finiteBecketPoses,compileFiniteBecketProgression,compileFiniteProgressionSchedule,bindBecketDiagonal,selectProgressionAssertion,type ProgressionEvidence,type FiniteProgressionStep} from './progression-topology.ts';
import type {Pose} from './types.ts';
const source:ProgressionEvidence={sourceId:'contradb:3004',url:'https://contradb.com/dances/3004',clause:'A2 completed half hey then new-neighbor B1; wait out larks right',basis:'source-explicit'};
const fixture=(id:number)=>readContraDbSource(readFileSync(new URL(`../test-data/contradb/${id}.json`,import.meta.url),'utf8')).record!;
const d=(a:{x:number;z:number},b:{x:number;z:number})=>Math.hypot(a.x-b.x,a.z-b.z);
const pose=(id:number,x:number,z:number,yaw=0):Pose=>({id,position:{x,z},yaw,stride:0,lean:0,bounce:0,turn:0,activity:'waiting'});
const step=(id:string,startBeat=0,direction:1|-1=1):FiniteProgressionStep=>({id,startBeat,travelBeats:4,direction,endTurnDelay:0,endTurnBeats:4,evidence:source});

test('Pandora retained public source keeps its new-neighbor boundary and indecent waiting requirement',()=>{
 const record=fixture(3004);assert.equal(record.title,"Pandora's Box");assert.match(record.rows[3].text,/exactly half.*turn away to progress/);assert.match(record.rows[4].text,/new neighbor/);assert.match(record.notes,/gentlespoons on the right, ladles on the left/);
});

test('Pandora literal half-hey endpoint rebinds at beat32 without moving any root or rewriting partners',()=>{
 const dancers=createDancers(6),before=bindActorGroups(dancers,{epoch:0,groups:[0,1,2].map(g=>({id:`old${g}`,actors:[4*g,4*g+1,4*g+2,4*g+3]})),neighborPairs:[[0,3],[1,2],[4,7],[5,6],[8,11],[9,10]],waitingIds:[]});
 // Literal half-hey output by physical row: top L0 east/R1 west;
 // next row L2 west/R3 east, and so on. These are the motion adapter's
 // declared slot endpoints, not a guessed relationship from their proximity.
 const poses=dancers.map(a=>pose(a.id,(a.couple%2===0?1:-1)*(a.role==='lark'?1:-1)*.9,(a.couple-2.5)*1.8,a.couple%2===0?Math.PI:0));
 const proposed=bindDirectedCoupleSlots(dancers,1,dancers.filter(d=>d.role==='lark').map(d=>({coupleId:d.couple,rank:d.couple,direction:d.couple%2===0?-1:1})));
 assert.deepEqual(proposed.waitingIds,[0,1,10,11]);assert.deepEqual(proposed.groups.map(g=>g.actors),[[2,3,4,5],[6,7,8,9]]);assert.equal(proposed.relations.neighbor.get(2),5);assert.equal(before.relations.neighbor.get(2),1);
 const event={id:'pandora-a2-to-b1',beat:32,expectedEpoch:0,groups:proposed.groups,neighborPairs:[...proposed.relations.neighbor].filter(([a,b])=>a<b),waitingIds:proposed.waitingIds,evidence:source};
 const snapshot=structuredClone(poses),after=rebindAtEndpoint(dancers,before,event,poses,poses);assert.deepEqual(poses,snapshot);assert.equal(after.epoch,1);for(const a of dancers)assert.equal(after.relations.partner.get(a.id),a.id^1);
 const wrong=poses.map(p=>({...p,position:{...p.position}}));wrong[2].position.z+=.2;assert.throws(()=>rebindAtEndpoint(dancers,before,event,wrong,poses),/no reset/);assert.throws(()=>rebindAtEndpoint(dancers,after,event,poses,poses),/stale/);
});

test('Pandora out partners exchange at their same physical end, finish in eight beats, wait indecent, then reenter explicitly',()=>{
 const dancers=createDancers(6),roles=new Map(dancers.map(d=>[d.id,d.role]));
 for(const [end,ids,z]of[['top',[0,1],-4.5],['bottom',[10,11],4.5]] as const){
  const initial=end==='top'?[pose(ids[0],.9,z,Math.PI),pose(ids[1],-.9,z,Math.PI)]:[pose(ids[0],-.9,z,0),pose(ids[1],.9,z,0)];
  const turn=compileSameEndExchange({ids,roles,entry:initial,end,roleArrangement:'lark-right',startBeat:32,beats:8,evidence:source});
  assert.deepEqual(turn.sample(32).map(p=>p.position),initial.map(p=>p.position));const final=turn.sample(40);assert.equal(Math.sign(final[0].position.x),end==='top'?-1:1);assert.ok(Math.abs(final[0].yaw-(end==='top'?0:Math.PI))<1e-7);assert.ok(d(final[0].position,initial[0].position)>1.79);
  for(const beat of[40,48,64,96])assert.deepEqual(turn.sample(beat),final);
  for(let beat=32;beat<=40;beat+=.025){const p=turn.sample(beat);assert.ok(d(p[0].position,p[1].position)>1.79);assert.ok(p.every(a=>Math.abs(a.position.z-z)<1.36));}
  for(const boundary of[32,40])for(let i=0;i<2;i++)assert.ok(d(turn.sample(boundary-1e-6)[i].position,turn.sample(boundary+1e-6)[i].position)<1e-8);
 }
 const afterWait=bindDirectedCoupleSlots(dancers,2,[{coupleId:0,rank:0,direction:1},{coupleId:2,rank:1,direction:-1},{coupleId:1,rank:2,direction:1},{coupleId:4,rank:3,direction:-1},{coupleId:3,rank:4,direction:1},{coupleId:5,rank:5,direction:-1}]);
 assert.equal(afterWait.waitingIds.length,0);assert.equal(afterWait.relations.neighbor.get(0),5);assert.equal(afterWait.relations.partner.get(0),1);
});

test('circulation and role placement vary independently with exact compact finite-end closure for2–12 couples',()=>{
 for(let count=2;count<=12;count++)for(const circulation of['cw','ccw'] as const)for(const roleArrangement of['lark-left','lark-right'] as const){
  let state=createFiniteBecketState(count,{circulation,roleArrangement});
  for(let epoch=0;epoch<32;epoch++){
   const p=compileFiniteBecketProgression(state,step(`shift-${epoch}`));assert.equal(p.afterTravel.epoch,epoch+1);assert.deepEqual(p.sample(0).map(p=>p.position),finiteBecketPoses(state).map(p=>p.position));const finish=p.sample(8),expected=finiteBecketPoses(p.nextState);for(const a of finish){assert.ok(d(a.position,expected[a.id].position)<1e-7);assert.ok(Math.abs(Math.atan2(Math.sin(a.yaw-expected[a.id].yaw),Math.cos(a.yaw-expected[a.id].yaw)))<1e-7);assert.equal(p.nextState.binding.relations.partner.get(a.id),a.id^1);}
   assert.deepEqual(p.sample(60),p.sample(8));state=p.nextState;
  }
 }
});

test('double and reverse progression consume explicit count, direction and intermediate epochs in any phrase length',()=>{
 const initial=createFiniteBecketState(8,{circulation:'cw',roleArrangement:'lark-left'}),double=compileFiniteProgressionSchedule(initial,[step('first',12),step('second',36)],{totalBeats:96,expectedCount:2});
 assert.equal(double.netProgression,2);assert.equal(double.bindingAt(15.999).epoch,0);assert.equal(double.bindingAt(16).epoch,1);assert.equal(double.bindingAt(40).epoch,2);assert.notDeepEqual(double.bindingAt(16).relations.neighbor,double.bindingAt(40).relations.neighbor);assert.deepEqual(double.sample(96),double.sample(44));
 const reverse=compileFiniteProgressionSchedule(initial,[step('back',0,-1)],{totalBeats:48,expectedCount:-1});assert.equal(reverse.plans[0].afterTravel.couples[0].rank,initial.couples[0].rank-1);
 assert.throws(()=>compileFiniteProgressionSchedule(initial,[step('only')],{totalBeats:64,expectedCount:2}),/count/);assert.throws(()=>compileFiniteProgressionSchedule(initial,[step('one'),step('two',5)],{totalBeats:64,expectedCount:2}),/settled/);assert.throws(()=>compileFiniteProgressionSchedule(initial,[step('late',60)],{totalBeats:64,expectedCount:1}),/budget/);
});

test('straight and right/left diagonal Becket bindings are exact distinct slots with explicit missing ends',()=>{
 const state=createFiniteBecketState(8,{circulation:'cw',roleArrangement:'lark-left'}),right=bindBecketDiagonal(state,'right'),left=bindBecketDiagonal(state,'left');
 assert.deepEqual(state.binding.groups[0].actors,[0,1,2,3]);assert.deepEqual(right.groups[0].actors,[4,5,2,3]);assert.deepEqual(left.groups[0].actors,[0,1,6,7]);assert.deepEqual(right.unmatchedCouples,[0,7]);assert.deepEqual(left.unmatchedCouples,[1,6]);
});

test('retained Dreamland metadata conflict requires selection, Pigeon double metadata does not merge source variants',()=>{
 const registry=JSON.parse(readFileSync(new URL('../test-data/progression/callersbox-18164.json',import.meta.url),'utf8')),html=readFileSync(new URL('../test-data/progression/contradb-2006.html',import.meta.url),'utf8');assert.equal(registry.Direction,'CW');assert.match(html,/Becket ccw/);
 const assertions=[{value:'cw',evidence:{...source,sourceId:'callersbox:18164',url:registry.request}},{value:'ccw',evidence:{...source,sourceId:'contradb:2006',url:'https://contradb.com/dances/2006'}}];assert.throws(()=>selectProgressionAssertion(assertions),/explicit source/);const selected=selectProgressionAssertion(assertions,'contradb:2006');assert.equal(selected.selected.value,'ccw');assert.equal(selected.alternatives[0].value,'cw');assert.equal(selected.alternatives.length,2);
 for(const id of[19801,18624]){const r=JSON.parse(readFileSync(new URL(`../test-data/progression/callersbox-${id}.json`,import.meta.url),'utf8'));assert.equal(r.Progression,'Double');assert.equal(r.Permission,'search');assert.deepEqual(r.phrases,[]);}assert.match(readFileSync(new URL('../test-data/progression/contradb-2212.html',import.meta.url),'utf8'),/double progression/);
});

test('scoped bicycle-chain arcs round the same physical end instead of teleporting across the hall',()=>{
 for(const end of['top','bottom'] as const){const z=end==='top'?-20:20,arc=compileSameEndArc({from:{x:-.9,z},to:{x:.9,z},end,startBeat:4,beats:4,evidence:{...source,sourceId:'acdol:anticipation',url:'https://www.quiteapair.us/calling/ACDOL.html',clause:'Anticipation A1: end dancers go around to the other line like a bicycle chain'}});assert.ok(d(arc.sample(4),{x:-.9,z})<1e-8);assert.ok(d(arc.sample(8),{x:.9,z})<1e-8);for(let t=4;t<=8;t+=.01){const p=arc.sample(t);assert.ok(Math.abs(p.z-z)<=.9+1e-8);assert.ok((p.z-z)*(end==='top'?-1:1)>=-1e-8);}assert.deepEqual(arc.sample(100),arc.sample(8));}
 assert.throws(()=>compileSameEndArc({from:{x:-.9,z:-20},to:{x:.9,z:20},end:'top',startBeat:0,beats:4,evidence:source}),/same physical end/);
});

test('relationship snapshots reject malformed partitions, stale roots and accidental nearest actors',()=>{
 const dancers=createDancers(4);assert.throws(()=>bindActorGroups(dancers,{epoch:0,groups:[{id:'a',actors:[0,1,2,3]}],neighborPairs:[[0,3],[1,2]],waitingIds:[]}),/partition/);assert.throws(()=>bindActorGroups(dancers,{epoch:0,groups:[{id:'a',actors:[0,1,2,3]},{id:'b',actors:[4,5,6,7]}],neighborPairs:[[0,7]],waitingIds:[]}),/explicit active group/);assert.throws(()=>bindDirectedCoupleSlots(dancers,0,[{coupleId:0,rank:0,direction:1},{coupleId:1,rank:1,direction:1},{coupleId:2,rank:2,direction:1},{coupleId:3,rank:3,direction:-1}]),/interior/);
 const state=createFiniteBecketState(4,{circulation:'cw',roleArrangement:'lark-left'});assert.equal(typeof(state.binding.relations.partner as any).set,'undefined');assert.throws(()=>{(state.couples[0] as any).rank=10;});
});
