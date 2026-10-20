import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createDancers,initialPoses} from './engine.ts';
import {compileOrdinaryHalfHeyFigure} from './ordinary-half-hey.ts';
import type {Figure} from './types.ts';
import type {FigureContext} from './extended-figures.ts';
const figure:Figure={id:'local-hey',label:'Lark-left half hey',kind:'hey',who:'neighbor',amount:.5,heyStartRole:'lark',centerShoulder:'left',endShoulder:'right',entry:'paired-sidelines',exit:'opposite-paired-balance',beats:8};
function context(gap:number):FigureContext {const dancers=createDancers(2),start=initialPoses(dancers);for(const[id,x,z]of[[0,-.9,-gap/2],[1,.9,-gap/2],[2,.9,gap/2],[3,-.9,gap/2]]){start[id].position={x,z};start[id].yaw=x<0?Math.PI/2:-Math.PI/2;}return{ids:[0,1,2,3],dancers,start,bindingEpoch:0,relations:{epoch:0,partner:new Map([[0,1],[1,0],[2,3],[3,2]]),neighbor:new Map([[0,3],[3,0],[1,2],[2,1]])},next:{id:'balance',kind:'balance',label:'N balance',who:'neighbor',beats:4}};}
const gap=(a:{x:number;z:number},b:{x:number;z:number})=>Math.hypot(a.x-b.x,a.z-b.z);
test('full-width released half-hey entry keeps its source passes and eight-count endpoint under a local speed certificate',()=>{
 const c=context(1.8),p=compileOrdinaryHalfHeyFigure(figure,c);let minimum=Infinity,peak=0;
 for(let i=0;i<=800;i++){const t=i/800,q=c.ids.map(id=>p.position(id,t));for(let a=0;a<4;a++){for(let b=a+1;b<4;b++)minimum=Math.min(minimum,gap(q[a],q[b]));const lo=Math.max(0,t-1e-5),hi=Math.min(1,t+1e-5);peak=Math.max(peak,gap(p.position(a,lo),p.position(a,hi))/((hi-lo)*8));}assert.deepEqual(p.contacts(t,c.start),[]);}
 assert.ok(minimum>.58);assert.ok(peak>1.3&&peak<1.35);
 for(const[id,x,z]of[[0,.9,.59],[1,-.9,.59],[2,-.9,-.59],[3,.9,-.59]])assert.ok(gap(p.position(id,1),{x,z})<1e-10);
 for(const [beat,pairs]of[[2,[[0,2]]],[3.75,[[3,2],[0,1]]],[5.5,[[3,1]]],[7.25,[[2,1],[3,0]]]] as const)for(const[a,b]of pairs)assert.ok(Math.abs(gap(p.position(a,beat/8),p.position(b,beat/8))-.66)<1e-7);
 console.log(JSON.stringify({minimum,peak,beats:8,gates:[2,3.75,5.5,7.25]}));
});
test('compact released-balance entries retain exact pre-extension motion bytes',()=>{
 const c=context(1.18),p=compileOrdinaryHalfHeyFigure(figure,c),samples=Array.from({length:129},(_,i)=>c.ids.map(id=>({id,position:p.position(id,i/128),yaw:p.facing(id,i/128,c.start)})));
 assert.equal(createHash('sha256').update(JSON.stringify(samples)).digest('hex'),'b9f714214484a29119f563d7ae4fa3d796b67ee6a93b598dbdec6263e348af82');
});
