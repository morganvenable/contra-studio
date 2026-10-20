import test from'node:test';
import assert from'node:assert/strict';
import{compileTerminalNamedPullByFigure,assertTerminalNamedPullByComposition}from'./terminal-named-pull-by.ts';
import{compileNamedPullByFigure}from'./named-pull-by-adapter.ts';
import{distance,turn}from'./ring-twirl-contract.ts';
import type{Figure,Dancer,Pose}from'./types.ts';
const pair=(pairs:number[][])=>new Map(pairs.flatMap(([a,b])=>[[a,b],[b,a]]));
const terminal:Figure={id:'terminal',label:'neighbors pull by left ⁋',kind:'pull-by',who:'neighbor',hands:'left',beats:2,exit:'progressed-neighbors',progression:true};
const star:Figure={id:'star',label:'star left 3 places',kind:'star',who:'all',direction:'left',amount:.75,beats:6};
function fixture(){
 const positions=[[.9,-.9],[-.9,-.9],[-.9,.9],[.9,.9]],yaws=[-3*Math.PI/4,-Math.PI/4,Math.PI/4,3*Math.PI/4],dancers:Dancer[]=positions.map((_,id)=>({id,name:`Actor ${id}`,role:id%2?'robin':'lark',couple:Math.floor(id/2),direction:id<2?1:-1,color:'#438b86'}));
 const start:Pose[]=positions.map(([x,z],id)=>({id,position:{x,z},yaw:yaws[id],stride:0,lean:0,bounce:0,turn:0,activity:'star'}));
 return{ids:[0,1,2,3],dancers,start,relations:{epoch:3,partner:pair([[0,1],[2,3]]),neighbor:pair([[0,3],[1,2]])},bindingEpoch:3};
}
test('terminal left pull-by exchanges named current-neighbor slots, releases on source time and faces onward',()=>{
 const c=fixture(),p=compileTerminalNamedPullByFigure(terminal,c),internal=compileTerminalNamedPullByFigure({...terminal,progression:false},c);
 for(let n=0;n<=80;n++)for(const id of c.ids){assert.deepEqual(p.position(id,n/80),internal.position(id,n/80));assert.equal(p.facing(id,n/80,c.start),internal.facing(id,n/80,c.start));}
 for(const id of c.ids){assert.ok(distance(p.position(id,0),c.start[id].position)<1e-8);assert.ok(distance(p.position(id,1),c.start[c.relations.neighbor.get(id)!].position)<1e-8);assert.ok(Math.abs(turn(p.facing(id,0,c.start),c.start[id].yaw))<1e-8);assert.ok(Math.abs(turn(p.facing(id,1,c.start),id<2?0:Math.PI))<1e-8);}
 const gate=c.start.map(pose=>({...pose,position:p.position(pose.id,.5),yaw:p.facing(pose.id,.5,c.start)})),contacts=p.contacts(.5,gate);assert.equal(contacts.length,2);
 for(const[A,B]of[[0,3],[1,2]]){const a=gate[A],b=gate[B],delta={x:b.position.x-a.position.x,z:b.position.z-a.position.z};assert.ok(Math.abs(delta.x*Math.sin(a.yaw)+delta.z*Math.cos(a.yaw))<1e-8);assert.ok(-(-Math.cos(a.yaw)*delta.x+Math.sin(a.yaw)*delta.z)>.69999);const h=contacts.find(h=>h.a===A&&h.b===B)!;assert.ok(h);assert.equal(h.handA,'left');assert.equal(h.handB,'left');assert.ok(h.strength>.99);}
 assert.deepEqual(p.contacts(0,c.start),[]);assert.deepEqual(p.contacts(1,c.start),[]);
 const expected=p.position(0,.8);c.start[0].position.x=99;c.ids[0]=99;c.dancers[0].role='robin';c.relations.neighbor.clear();assert.deepEqual(p.position(0,.8),expected);
});

test('terminal composition consumes one exact source marker and the complete preceding left-star amount/count',()=>{
 assert.doesNotThrow(()=>assertTerminalNamedPullByComposition([star,terminal]));
 for(const change of[{beats:4},{who:'partner'},{hands:'right'},{progression:false},{progression:undefined},{exit:undefined}])assert.throws(()=>assertTerminalNamedPullByComposition([star,{...terminal,...change}as Figure]));
 for(const change of[{kind:'circle'},{amount:1},{amount:.5},{direction:'right'},{beats:8},{who:'neighbor'},{progression:true}])assert.throws(()=>assertTerminalNamedPullByComposition([{...star,...change}as Figure,terminal]));
 assert.throws(()=>assertTerminalNamedPullByComposition([star,terminal,{id:'tail',kind:'long-lines',who:'all',beats:8,label:'Unexpected tail'}]));
 assert.throws(()=>assertTerminalNamedPullByComposition([star,terminal,star,terminal]));
});

test('terminal adapter rejects alternative receivers/hands/counts/facings and cannot weaken the nonterminal adapter',()=>{
 for(const change of[{kind:'pass-through'},{who:'partner'},{hands:'right'},{beats:4},{amount:.5},{direction:'left'},{exit:undefined},{entry:'ring'},{confidence:'unsupported'}])assert.throws(()=>compileTerminalNamedPullByFigure({...terminal,...change}as Figure,fixture()));
 assert.throws(()=>compileTerminalNamedPullByFigure(terminal,{...fixture(),next:star}),/terminal/);assert.throws(()=>compileTerminalNamedPullByFigure(terminal,{...fixture(),bindingEpoch:4}),/stale/);
 const bad=fixture();bad.start[0].position.x=.8;assert.throws(()=>compileTerminalNamedPullByFigure(terminal,bad),/corners/);
 const across=fixture();[across.start[0].position,across.start[1].position]=[across.start[1].position,across.start[0].position];assert.throws(()=>compileTerminalNamedPullByFigure(terminal,across),/sideline|role placement/);
 const reversed=fixture();for(const p of reversed.start)p.position.x*=-1;assert.throws(()=>compileTerminalNamedPullByFigure(terminal,reversed),/role placement/);
 assert.throws(()=>compileNamedPullByFigure(terminal,fixture()),/named pull-by/);
});
