import test from 'node:test';import assert from 'node:assert/strict';
import {createInitialLongWaveState,type InitialLongWaveInput} from './initial-long-wave-state.ts';
import {compileCarriedWaveCirculate} from './carried-wave-circulate.ts';
function fixture():InitialLongWaveInput{
 const ids=[91,8,400,25,17,62,73,39,100,104],actors=ids.map((id,i)=>({id,role:i%2?'robin' as const:'lark' as const,couple:700+Math.floor(i/2)}));
 const poses=actors.map((a,i)=>{const row=Math.floor(i/2),direction=row%2?-1:1;return{id:a.id,position:{x:.64*(a.role==='lark'?direction:-direction)+4,z:row*1.28-3},yaw:direction===1?0:Math.PI,stride:0,lean:0,bounce:0,turn:0,activity:'waiting' as const};});
 const boxes=[ids.slice(0,4),ids.slice(4,8)];return{sourceBeat:0,bindingEpoch:0,actors,poses,partner:ids.map((id,i)=>[id,ids[i%2?i-1:i+1]]),neighbor:boxes.flatMap(([a,b,c,d])=>[[a,d],[d,a],[b,c],[c,b]] as [number,number][]),boxPartitions:boxes,waitingIds:ids.slice(8),inwardRole:'robin',neighborHand:'right'};
}
test('explicit initial formation preserves actual roots, identities, maps and waiters while owning full hands',()=>{
 const input=fixture(),before=structuredClone(input),state=createInitialLongWaveState(input);
 assert.deepEqual(state.poses.map(p=>p.position),input.poses.map(p=>p.position));assert.deepEqual(state.actors,input.actors);assert.deepEqual(state.partner,input.partner);assert.deepEqual(state.neighbor,input.neighbor);assert.equal(state.bindingEpoch,0);
 assert.deepEqual(state.wave.lines.map(l=>l.order),[[8,400,62,73],[91,25,17,39]]);assert.deepEqual(state.wave.seamHands.map(h=>[h.a,h.b]),[[400,62],[25,17]]);assert.equal(state.heldContacts.length,6);
 for(const id of input.waitingIds!)assert.deepEqual(state.poses.find(p=>p.id===id),input.poses.find(p=>p.id===id));
 assert.deepEqual(state.poses.slice(0,4).map(p=>p.yaw),[Math.PI/2,Math.PI/2,-Math.PI/2,-Math.PI/2]);assert.deepEqual(input,before);
 input.poses[0].position.x=99;assert.notEqual(state.poses[0].position.x,99);assert.ok(Object.isFrozen(state.poses[0].position));
 const first=compileCarriedWaveCirculate({kind:'balance-box-circulate',beats:8,crossRole:'robin',loopRole:'lark',loopDirection:'right',phaseBeats:[4,4],balanceStyle:'right-left'},state);assert.equal(first.exitState.sourceBeat,8);assert.equal(first.exitState.bindingEpoch,0);
});
test('role labels do not infer identities or require one source-specific role arrangement',()=>{
 const input=fixture();input.inwardRole='lark';input.actors=input.actors.map(a=>({...a,role:a.role==='lark'?'robin':'lark'}));const state=createInitialLongWaveState(input);assert.deepEqual(state.wave.lines.map(l=>l.order),[[8,400,62,73],[91,25,17,39]]);assert.equal(state.poses[0].yaw,Math.PI/2);
});
test('wrong role/hand convention, missing bindings, malformed stations and runtime clocks reject',()=>{
 const mutations=[(x:any)=>x.sourceBeat=8,(x:any)=>x.neighborHand='left',(x:any)=>x.inwardRole='lark',(x:any)=>x.neighbor[0][1]=400,(x:any)=>x.poses[0].position.x+=.3,(x:any)=>x.waitingIds=[],(x:any)=>x.boxPartitions.reverse(),(x:any)=>x.hidden=true];
 for(const change of mutations){const x=fixture();change(x);assert.throws(()=>createInitialLongWaveState(x));}
});
