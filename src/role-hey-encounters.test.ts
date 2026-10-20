import test from 'node:test';
import assert from 'node:assert/strict';
import {compileRoleHeyEncounters,type RoleHeyEncounterOptions} from './role-hey-encounters.ts';
import type {SequenceBoundary} from './sequence-boundary.ts';
const boundary=(ids=[10,21,38,49]):SequenceBoundary=>({sourceBeat:24,relationshipEpoch:8,actors:ids.map((id,i)=>({id,role:i%2?'robin':'lark',couple:i<2?701:905})),partner:[[ids[0],ids[1]],[ids[1],ids[0]],[ids[2],ids[3]],[ids[3],ids[2]]],neighbor:[[ids[0],ids[3]],[ids[3],ids[0]],[ids[1],ids[2]],[ids[2],ids[1]]],poses:ids.map((id,i)=>({id,position:{x:i,z:0},yaw:0})),heldContacts:[]});
const options:RoleHeyEncounterOptions={entryOrder:[21,10,38,49],firstRole:'lark',centerShoulder:'right',endShoulder:'left',amount:1,beats:16};
// Hand-written identity oracle: independent of the implementation's swaps.
const oracle=[[[10,38]],[[21,38],[10,49]],[[21,49]],[[38,49],[21,10]],[[38,10]],[[49,10],[38,21]],[[49,21]],[[10,21],[49,38]]];
test('both roles and shoulders retain independently specified people and half/full stations',()=>{
 for(const firstRole of ['lark','robin'] as const)for(const centerShoulder of ['left','right'] as const)for(const amount of [.5,1] as const){
  const b=boundary();if(firstRole==='robin')b.actors.forEach(a=>(a as {role:string}).role=a.role==='lark'?'robin':'lark');
  const before=JSON.stringify(b),p=compileRoleHeyEncounters(b,{...options,firstRole,centerShoulder,endShoulder:centerShoulder==='left'?'right':'left',amount,beats:amount*16});
  assert.deepEqual(p.events.map(e=>e.pairs.map(pair=>pair.map(Number))),oracle.slice(0,amount*8));
  assert.deepEqual(p.events.map(e=>e.token.selector),[firstRole==='lark'?'larks':'robins','neighbor',firstRole==='lark'?'robins':'larks','partner',firstRole==='lark'?'larks':'robins','neighbor',firstRole==='lark'?'robins':'larks','partner'].slice(0,amount*8));
  assert.deepEqual(p.endOrder,amount===1?['21','10','38','49']:['49','38','10','21']);assert.equal(p.needsPartialExit,false);assert.equal(p.events.reduce((n,e)=>n+e.pairs.length,0),amount*12);
  assert.ok(p.events.every((e,i)=>e.token.shoulder===(i%2?(centerShoulder==='left'?'right':'left'):centerShoulder)));assert.equal(JSON.stringify(b),before);
 }
});
test('renumbered actors and current-neighbor sideline entry change relationship labels, not inference from ordering',()=>{
 const b=boundary([104,7,900,33]);const p=compileRoleHeyEncounters(b,{...options,entryOrder:[33,104,900,7],amount:.5,beats:9});
 assert.deepEqual(p.events.map(e=>e.pairs),[[['104','900']],[['33','900'],['104','7']],[['33','7']],[['900','7'],['33','104']]]);
 assert.deepEqual(p.events.map(e=>e.token.selector),['larks','partner','robins','neighbor']);assert.deepEqual(p.endOrder,['7','900','104','33']);assert.equal(p.syntax.beats,9);
});
test('rejects missing, stale, nonreciprocal, partner-disguised neighbor maps and invalid declarations',()=>{
 for(const key of ['partner','neighbor'] as const){const b=structuredClone(boundary());(b as any)[key]=[];assert.throws(()=>compileRoleHeyEncounters(b,options));}
 for(const neighbor of [[[10,49],[49,10],[21,38],[38,49]],[[10,21],[21,10],[38,49],[49,38]],[[10,100],[100,10],[21,38],[38,21]]])assert.throws(()=>compileRoleHeyEncounters({...boundary(),neighbor:neighbor as [number,number][]},options));
 for(const patch of [{entryOrder:[21,10,38,38]},{entryOrder:[21,10,38,999]},{entryOrder:[10,21,38,49]},{firstRole:'robin'},{firstRole:'all'},{centerShoulder:'up'},{endShoulder:'right'},{amount:.75},{beats:0},{beats:NaN}])assert.throws(()=>compileRoleHeyEncounters(boundary(),{...options,...patch} as RoleHeyEncounterOptions));
});
