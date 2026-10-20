import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createDancers,initialPoses,compilePrimitiveFigure} from './engine.ts';
import type {Figure} from './types.ts';
const dancers=createDancers(2),start=initialPoses(dancers),ids=[0,1,2,3],directions=[1,-1];
test('literal role three-quarter turn cannot leak nonfinite roots from a collapsed following swing frame',()=>{
 const figure:Figure={id:'turn',label:'Turn',kind:'allemande',who:'robins',direction:'right',amount:.75,beats:6};
 assert.throws(()=>compilePrimitiveFigure(figure,ids,start,dancers,directions,{circleExit:'neighbor'}),/degenerate named swing frame/);
});
test('the fail-closed frame guard preserves exact valid circle and role-turn samples',()=>{
 const controls:[Figure,string][]=[
 [{id:'turn',label:'Turn',kind:'allemande',who:'larks',direction:'left',amount:1.5,beats:8},'8c1b9ba6efcb117c813bb3d98483b56edb7a7f1128871a331fc38afc2ca9710c'],
 [{id:'turn',label:'Turn',kind:'circle',who:'all',direction:'left',amount:.75,beats:8},'5e156e6b4e050371656f485c6116532a622386f33a547f5c6bc71144d5ab44d3'],
 ];
 for(const[f,hash]of controls){const p=compilePrimitiveFigure(f,ids,start,dancers,directions,{circleExit:'partner'}),out=[];for(let i=0;i<=64;i++){const t=i/64,q=start.map(s=>({...s,position:p.position(s.id,t)}));q.forEach(s=>s.yaw=p.facing(s.id,t,q));assert.ok(q.every(s=>[s.position.x,s.position.z,s.yaw].every(Number.isFinite)));out.push({poses:q,contacts:p.contacts(t,q)});}assert.equal(createHash('sha256').update(JSON.stringify(out)).digest('hex'),hash);}
});
