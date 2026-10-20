import test from 'node:test';
import assert from 'node:assert/strict';
import {Vector3} from 'three';
import {starGrips,type StarActor} from './star-grips.ts';
import {compilePrimitiveFigure,createDancers,initialPoses} from './engine.ts';
import {compileChoreography} from './choreography.ts';
import {DANCES} from './catalog.ts';
import {Avatar,applyBodyContactAnchors} from './scene.ts';
import type {Dance,Figure,Frame,Pose,StudioState} from './types.ts';
const actors:StarActor[]=[{id:11,position:{x:-.58,z:-.58},yaw:-Math.PI/4},{id:7,position:{x:.58,z:-.58},yaw:-3*Math.PI/4},{id:42,position:{x:.58,z:.58},yaw:3*Math.PI/4},{id:3,position:{x:-.58,z:.58},yaw:Math.PI/4}];
const distance=(a:{x:number;z:number},b:{x:number;z:number})=>Math.hypot(a.x-b.x,a.z-b.z);
test('star grips retain distinct opposite-hand versus adjacent-wrist graphs and explicit chirality',()=>{
 for(const hand of['left','right'] as const){const across=starGrips(actors,hand,'hands-across',1),wrist=starGrips(actors,hand,'wrist-grip',1);assert.equal(across.length,2);assert.equal(wrist.length,4);for(const c of across){assert.equal(c.target,'hands');assert.equal(c.handA,hand);assert.equal(c.handB,hand);const a=actors.find(a=>a.id===c.a)!,b=actors.find(a=>a.id===c.b)!;assert.ok(distance(a.position,{x:-b.position.x,z:-b.position.z})<1e-9);}for(const c of wrist){assert.equal(c.target,'wrist');const i=actors.findIndex(a=>a.id===c.a);assert.equal(c.b,actors[(i+(hand==='left'?-1:1)+4)%4].id);assert.equal(c.handA,hand);assert.equal(c.handB,hand);}assert.equal(new Set(wrist.map(c=>c.a)).size,4);assert.equal(new Set(wrist.map(c=>c.b)).size,4);}
 const theta=.74,origin={x:1.7,z:-2.4},rotate=(p:{x:number;z:number})=>({x:origin.x+p.x*Math.cos(theta)-p.z*Math.sin(theta),z:origin.z+p.x*Math.sin(theta)+p.z*Math.cos(theta)}),shifted=actors.map(a=>({...a,position:rotate(a.position),yaw:a.yaw-theta}));
 for(const hold of['hands-across','wrist-grip']as const){const A=starGrips(actors,'left',hold,1),B=starGrips(shifted,'left',hold,1);for(const c of A){const b=B.find(b=>b.a===c.a)!;assert.equal(b.b,c.b);assert.ok(distance(rotate(c.point),b.point)<1e-9);}}
 for(const change of[()=>starGrips(actors,'left','unknown' as any,1),()=>starGrips(actors,'left','wrist-grip',NaN),()=>starGrips([...actors.slice(0,3),actors[0]],'left','wrist-grip',1)])assert.throws(change);
});
test('explicit grips never alter star timing, root paths, facing, identities or progression',()=>{
 const source=structuredClone(DANCES.find(d=>d.title==='The Baby Rose')!),index=source.figures.findIndex(f=>f.kind==='star');assert.ok(index>=0);const original=compileChoreography(source,6);
 for(const starGrip of['hands-across','wrist-grip']as const){const dance=structuredClone(source);dance.figures[index].starGrip=starGrip;assert.doesNotThrow(()=>compileChoreography(dance,6));assert.throws(()=>compileChoreography(dance,6,{starGrips:false}),/star grip/);const changed=compileChoreography(dance,6,{starGrips:true});for(let t=0;t<768;t+=.5){const A=original.sample(t),B=changed.sample(t);assert.deepEqual(B.poses,A.poses);assert.equal(B.figureIndex,A.figureIndex);}}
 const bad=structuredClone(source);bad.figures[index].starGrip='bogus' as any;assert.throws(()=>compileChoreography(bad,2,{starGrips:true}),/grip/);bad.figures[index].starGrip=undefined;bad.figures[0].starGrip='hands-across';assert.throws(()=>compileChoreography(bad,2,{starGrips:true}),/does not consume/);
});
test('wrist-grip stars use fixed adult arms with distinct palms close to the next named distal forearm',t=>{
 globalThis.document={createElement:()=>({getContext:()=>new Proxy({},{get:()=>()=>{},set:()=>true})})} as unknown as Document;
 const dancers=createDancers(2),start=initialPoses(dancers),ids=[0,1,2,3];let maximumWrist=0,maximumForearmDistance=0,fullContacts=0;
 for(const hand of['left','right']as const){const figure:Figure={id:'star',kind:'star',beats:8,label:`${hand} wrist-grip star`,who:'all',direction:hand,amount:1,starGrip:'wrist-grip'},plan=compilePrimitiveFigure(figure,ids,start,dancers,[1,-1]),dance={figures:[{kind:'long-lines',beats:8},figure,{kind:'long-lines',beats:8}]}as Dance;
  const sample=(beat:number):Frame=>{beat=Math.max(0,Math.min(24-1e-8,beat));const local=Math.max(0,Math.min(8,beat-8)),q=local/8,fi=beat<8?0:beat<16?1:2,poses:Pose[]=ids.map(id=>({...start[id],position:plan.position(id,q),yaw:plan.facing(id,q,[]),stride:fi===1?1:0,lean:.03,bounce:fi===1?Math.sin(beat*2*Math.PI)*.018:0,activity:fi===1?'star':'waiting'}));return{beat,localBeat:beat,figureIndex:fi,figureProgress:(beat-fi*8)/8,repeat:0,poses,contacts:fi===1?plan.contacts(q,poses):[],warnings:[]};},avatars=dancers.map(d=>new Avatar(d));
  for(let step=0;step<=400;step++){const beat=9.6+step*.012,f=sample(beat);for(const a of avatars)a.update(f.poses[a.dancer.id],f,{dance,showLabels:false}as StudioState,sample);const frame=applyBodyContactAnchors(avatars,f);avatars.forEach(a=>a.root.updateMatrixWorld(true));for(const c of frame.contacts)if(c.strength>.99999){fullContacts++;const a=avatars[c.a].arms.find(a=>a.side===(hand==='left'?1:-1))!,b=avatars[c.b].arms.find(a=>a.side===(hand==='left'?1:-1))!,target=new Vector3(c.point.x,c.point.y,c.point.z),palm=a.hand.getWorldPosition(new Vector3()),elbow=b.elbow.getWorldPosition(new Vector3()),wrist=b.hand.getWorldPosition(new Vector3()),v=wrist.clone().sub(elbow),u=Math.max(0,Math.min(1,target.clone().sub(elbow).dot(v)/v.lengthSq()));maximumWrist=Math.max(maximumWrist,palm.distanceTo(target));maximumForearmDistance=Math.max(maximumForearmDistance,target.distanceTo(elbow.addScaledVector(v,u)));assert.ok(Math.abs(a.upper.scale.y*3-.325)<1e-7);assert.ok(Math.abs(a.lower.scale.y*3-.325)<1e-7);}}
  avatars.forEach(a=>a.dispose());
 }
 t.diagnostic(JSON.stringify({fullContacts,maximumWrist,maximumForearmDistance}));assert.ok(fullContacts>1000);assert.ok(maximumWrist<.001);assert.ok(maximumForearmDistance<.055);
});
