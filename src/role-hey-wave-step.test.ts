import test from 'node:test';import assert from 'node:assert/strict';
import {compileRoleHeyWaveStep,type RoleHeyWaveSpec} from './role-hey-wave-step.ts';
import {compileChainFigure} from './chain.ts';
import {createDancers} from './engine.ts';
import {captureSequenceBoundary,ownSequenceBoundary} from './sequence-boundary.ts';
import type {FigureContext} from './extended-figures.ts';
function fixture(){
 const start=[[-.64,-.55],[-.64,.55],[.64,.55],[.64,-.55]].map(([x,z],id)=>({id,position:{x,z},yaw:x<0?Math.PI/2:-Math.PI/2,stride:0,lean:0,bounce:0,turn:0,activity:'waiting' as const})),context:FigureContext={ids:[0,1,2,3],dancers:createDancers(2),start,bindingEpoch:4,relations:{epoch:4,partner:new Map([[0,1],[1,0],[2,3],[3,2]]),neighbor:new Map([[0,3],[3,0],[1,2],[2,1]])}};
 const chain=compileChainFigure({id:'producer',label:'Robins chain to neighbors',kind:'robins-chain',who:'neighbor',beats:8},context);
 const next={...context,start:start.map(p=>({...p,position:chain.position(p.id,1),yaw:chain.facing(p.id,1,start)}))},boundary=captureSequenceBoundary(next,56,[]);
 const spec:RoleHeyWaveSpec={beats:8,firstRole:'robin',sidePair:'neighbor',centerShoulder:'right',endShoulder:'left',inwardRole:'robin',exitPoses:[{id:0,position:{x:.64,z:.64},yaw:Math.PI/2},{id:1,position:{x:-.64,z:.64},yaw:Math.PI/2},{id:2,position:{x:-.64,z:-.64},yaw:-Math.PI/2},{id:3,position:{x:.64,z:-.64},yaw:-Math.PI/2}]};return{boundary,spec};
}
test('actual compact chain exit reaches half-permuted local wave stations in eight counts with unchanged certificates',()=>{
 const {boundary,spec}=fixture(),p=compileRoleHeyWaveStep(boundary,spec);assert.deepEqual(p.entryState,boundary);assert.equal(p.exitState.sourceBeat,64);assert.equal(p.exitState.relationshipEpoch,4);assert.deepEqual(p.exitState.partner,boundary.partner);assert.deepEqual(p.exitState.neighbor,boundary.neighbor);assert.deepEqual(p.exitState.heldContacts,[]);
 assert.deepEqual(p.heyPlan.events.map(e=>e.token.raw),['WR','PL','MR','NL']);assert.deepEqual(p.heyPlan.events.map(e=>e.pairs),[[['3','1']],[['0','1'],['3','2']],[['0','2']],[['1','2'],['0','3']]]);
 for(const q of spec.exitPoses){assert.deepEqual(p.position(q.id,1),q.position);assert.ok(Math.abs(p.facing(q.id,1,[])-q.yaw)<1e-8);}assert.ok(p.heyPlan.minimumCertifiedClearance>=.5);assert.ok(p.heyPlan.maximumCertifiedSpeed<=1.3);assert.ok(p.heyPlan.maximumCertifiedYawRate<=4);for(let i=0;i<=128;i++)assert.deepEqual(p.contacts(i/128,[]),[]);
});
test('renumbered translated carried identities retain exact relative path without source selectors',()=>{
 const {boundary,spec}=fixture(),ids=[19,4,81,23],point=(p:{x:number;z:number})=>({x:p.x+3,z:p.z-5}),b=ownSequenceBoundary({...boundary,actors:boundary.actors.map(a=>({...a,id:ids[a.id],couple:a.couple+20})),poses:boundary.poses.map(p=>({...p,id:ids[p.id],position:point(p.position)})),partner:boundary.partner.map(([a,b])=>[ids[a],ids[b]]),neighbor:boundary.neighbor.map(([a,b])=>[ids[a],ids[b]])}),s={...spec,exitPoses:spec.exitPoses.map(p=>({...p,id:ids[p.id],position:point(p.position)}))},a=compileRoleHeyWaveStep(boundary,spec),p=compileRoleHeyWaveStep(b,s);
 for(let i=0;i<=64;i++)for(const id of[0,1,2,3]){const expected=point(a.position(id,i/64)),actual=p.position(ids[id],i/64);assert.ok(Math.hypot(actual.x-expected.x,actual.z-expected.z)<1e-7);assert.ok(Math.abs(p.facing(ids[id],i/64,[])-a.facing(id,i/64,[]))<1e-7);}
});
test('arbitrary destination permutation, width, centers, wave facing, held entry and hidden arguments reject',()=>{
 const {boundary,spec}=fixture();for(const mutate of[(s:any)=>s.exitPoses[0].position.x+=.1,(s:any)=>s.exitPoses.forEach((p:any)=>p.position.z+=1),(s:any)=>{const q=s.exitPoses[0].position;s.exitPoses[0].position=s.exitPoses[1].position;s.exitPoses[1].position=q;},(s:any)=>s.exitPoses[0].yaw=0,(s:any)=>s.exitPoses[0].extra=true,(s:any)=>s.beats=16,(s:any)=>s.hidden='ignored']){const s=structuredClone(spec);mutate(s);assert.throws(()=>compileRoleHeyWaveStep(boundary,s));}
 assert.throws(()=>compileRoleHeyWaveStep({...boundary,heldContacts:[{a:0,b:3,handA:'right',handB:'right',kind:'joined',point:{x:-.64,y:1.28,z:0},strength:1}]},spec));
});
