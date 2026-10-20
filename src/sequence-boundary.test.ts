import test from 'node:test';
import assert from 'node:assert/strict';
import {ownSequenceBoundary,assertSequenceHandoff,advanceSequenceBeat} from './sequence-boundary.ts';
const raw=()=>({sourceBeat:2.5,relationshipEpoch:7,actors:[{id:10,couple:2,role:'lark'},{id:30,couple:2,role:'robin'},{id:50,couple:4,role:'lark'},{id:70,couple:4,role:'robin'}],partner:[[10,30],[30,10],[50,70],[70,50]],neighbor:[[10,70],[70,10],[30,50],[50,30]],poses:[10,30,50,70].map((id,i)=>({id,position:{x:i%2?2.9:1.1,z:i<2?3.1:4.9},yaw:i%2?-Math.PI/2:Math.PI/2})),heldContacts:[]});

test('the common plain-data boundary captures once, owns nested values and never invokes rejected getters',()=>{
 const source=raw(),owned=ownSequenceBoundary(source);source.poses[0].position.x=99;source.partner[0][1]=70;
 assert.equal(owned.poses[0].position.x,1.1);assert.deepEqual(owned.partner[0],[10,30]);assert.ok(Object.isFrozen(owned.poses[0].position));
 let reads=0;const getter=raw();Object.defineProperty(getter.poses[0].position,'x',{enumerable:true,get(){reads++;return 1.1;}});assert.throws(()=>ownSequenceBoundary(getter));assert.equal(reads,0);
 const hidden=raw();Object.defineProperty(hidden,'alternateEpoch',{value:8});assert.throws(()=>ownSequenceBoundary(hidden));
});

test('one common seam preserves actual roots, discrete identities, source clock and incoming holds',()=>{
 const a=ownSequenceBoundary(raw());assert.doesNotThrow(()=>assertSequenceHandoff(a,structuredClone(a)));
 for(const change of[(b:any)=>b.relationshipEpoch++,(b:any)=>b.sourceBeat+=.5,(b:any)=>b.poses[0].position.x+=.1,(b:any)=>b.partner[0][1]+=1e-8,(b:any)=>b.heldContacts.push({a:10,b:30,handA:'right',handB:'right',kind:'joined',point:{x:2,y:1.18,z:3.1},strength:.005})]){const b=structuredClone(a);change(b);assert.throws(()=>assertSequenceHandoff(a,b));}
 assert.equal(advanceSequenceBeat(2.5,8),10.5);assert.throws(()=>advanceSequenceBeat(1e20,8));
});
