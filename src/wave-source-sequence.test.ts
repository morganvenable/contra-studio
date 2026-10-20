import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Vector3} from 'three';
import {Avatar,applyBodyContactAnchors} from './scene.ts';
import {readContraDbSource} from './contradb-source.ts';
import {compileShortWaveImproper} from './wave-source-sequence.ts';
import {compileChoreography} from './choreography.ts';
import {UNDERCURRENT} from '../test-data/progression/wave-fixture.ts';
import type {Dance,StudioState} from './types.ts';
const gap=(a:{x:number;z:number},b:{x:number;z:number})=>Math.hypot(a.x-b.x,a.z-b.z);
const angle=(a:number,b:number)=>Math.abs(Math.atan2(Math.sin(a-b),Math.cos(a-b)));
const staged={progressionEvents:true,rightLeftThrough:true,shortWaves:true};
const cached=new Map<number,ReturnType<typeof compileShortWaveImproper>>();
const compile=(n:number)=>{if(!cached.has(n))cached.set(n,compileChoreography(UNDERCURRENT as Dance,n,staged) as ReturnType<typeof compileShortWaveImproper>);return cached.get(n)!;};
test('complete retained Undercurrent uses staged public dispatch and keeps every source row and its 64 musical counts',()=>{
 assert.throws(()=>compileChoreography(UNDERCURRENT as Dance,2,{progressionEvents:true,rightLeftThrough:true}),/separately registered/);assert.throws(()=>compileChoreography(UNDERCURRENT as Dance,2,{progressionEvents:true,shortWaves:true}),/capability/);
 const r=readContraDbSource(readFileSync(new URL('../test-data/contradb/1992.json',import.meta.url),'utf8')).record!;assert.equal(r.title,UNDERCURRENT.title);assert.equal(r.author,UNDERCURRENT.author);assert.deepEqual(r.rows.map(r=>r.beats),[8,8,2,2,12,8,8,16]);assert.match(r.rows[1].text,/gentlespoons by left in the center, neighbors by right on the sides/);assert.match(r.rows[2].text,/neighbors allemande right ½/);assert.match(r.rows[3].text,/ladles allemande left ½/);assert.match(r.rows[5].text,/right left through/);assert.match(r.rows[6].text,/ladles allemande right 1½/);assert.equal(r.rows[7].progression,true);
 const c=compile(2);assert.equal(c.totalBeats,64);assert.equal(c.repeatable,true);assert.deepEqual(c.starts,[0,8,16,18,20,32,40,48,52]);assert.equal(c.dance.figures.length,9);assert.deepEqual(c.dance.figures.slice(-2).map(f=>f.beats),[4,12]);
});
test('source corner oracle: two exact half-turns produce named horizontal partners, then swing turns from count one and ends canonically',()=>{
 const c=compile(2),order=(beat:number)=>[...c.sample(beat).poses].sort((a,b)=>a.position.x-b.position.x).map(p=>p.id);assert.deepEqual(order(16),[3,0,2,1]);assert.deepEqual(order(18),[0,3,1,2]);assert.deepEqual(order(20),[0,1,3,2]);
 for(const[beat,pairs,hand]of[[16,[[3,0],[2,1]],'right'],[18,[[3,1]],'left']] as const){const A=c.sample(beat),B=c.sample(beat+2-1e-8);for(const[a,b]of pairs){assert.ok(gap(A.poses[a].position,B.poses[b].position)<1e-7);assert.ok(gap(A.poses[b].position,B.poses[a].position)<1e-7);}assert.ok(c.sample(beat+1).contacts.some(h=>h.handA===hand&&h.handB===hand));}
 const start=c.sample(20),first=c.sample(20.25),one=c.sample(21);for(const[a,b]of[[0,1],[2,3]]){const theta=(frame:typeof start)=>Math.atan2(frame.poses[a].position.z-frame.poses[b].position.z,frame.poses[a].position.x-frame.poses[b].position.x),advance=Math.atan2(Math.sin(theta(first)-theta(start)),Math.cos(theta(first)-theta(start)));assert.ok(advance>.15,'the first quarter-count already rotates, no pre-swing gather');assert.ok(angle(theta(one),theta(start))>.8,'count one is already a swing step');}
 const end=c.sample(32);for(const[a,b]of[[0,1],[2,3]]){assert.ok(Math.abs(end.poses[a].position.x-end.poses[b].position.x)<1e-7);assert.ok(Math.abs(Math.abs(end.poses[a].position.x)-.9)<1e-7);assert.ok(Math.abs(Math.abs(end.poses[a].position.z)-.9)<1e-7);}assert.ok(gap(start.poses[0].position,first.poses[0].position)>.08);
});
test('2–12 couples close through finite end waiting, meet every other couple, and preserve all root/facing joins',()=>{
 for(let n=2;n<=12;n++){const c=compile(n),met=new Set<string>();let min=Infinity;for(let round=0;round<2*n;round++){const topology=c.topology(round*64+.1);for(const[a,b]of topology.neighbors)met.add([c.dancers[a].couple,c.dancers[b].couple].sort((a,b)=>a-b).join(':'));for(const local of[0,8,16,18,20,32,40,48,52,64]){const beat=round*64+local;if(beat<=0)continue;const A=c.sample(beat-1e-6),B=c.sample(beat+1e-6);for(let id=0;id<2*n;id++){assert.ok(gap(A.poses[id].position,B.poses[id].position)<1e-4,`${n}/${beat}/${id} root join`);assert.ok(angle(A.poses[id].yaw,B.poses[id].yaw)<1e-4,`${n}/${beat}/${id} facing join`);}}for(let local=0;local<64;local+=.25){const f=c.sample(round*64+local);for(let a=0;a<2*n;a++)for(let b=a+1;b<2*n;b++)min=Math.min(min,gap(f.poses[a].position,f.poses[b].position));for(const h of f.contacts){assert.ok(h.a!==h.b);assert.ok(!topology.waitingIds.includes(h.a)&&!topology.waitingIds.includes(h.b));}}}
  assert.equal(met.size,n*(n-1)/2,`${n} couples all encounters`);assert.ok(min>=.45,`${n} global root clearance ${min}`);const A=c.sample(0),B=c.sample(128*n);for(let id=0;id<2*n;id++){assert.ok(gap(A.poses[id].position,B.poses[id].position)<1e-6);assert.ok(angle(A.poses[id].yaw,B.poses[id].yaw)<1e-6);}
 }
});
test('complete source rejects changed center roles, dropped handoffs, wrong receiving relations, changed turns and false progression points',()=>{
 const mutations=[(d:typeof UNDERCURRENT)=>(d.figures[1] as any).centerRole='robin',(d:typeof UNDERCURRENT)=>(d.figures[1] as any).phaseBeats=[2,6],(d:typeof UNDERCURRENT)=>delete(d.figures[2] as any).entry,(d:typeof UNDERCURRENT)=>(d.figures[3] as any).amount=1,(d:typeof UNDERCURRENT)=>delete(d.figures[4] as any).entry,(d:typeof UNDERCURRENT)=>(d.figures[5] as any).crossingRelation='partner',(d:typeof UNDERCURRENT)=>(d.figures[6] as any).amount=.75,(d:typeof UNDERCURRENT)=>(d.figures[7] as any).who='partner',(d:typeof UNDERCURRENT)=>d.progressionEvents![0].afterFigureId='wave'];
 for(const mutation of mutations){const d=structuredClone(UNDERCURRENT);mutation(d);assert.throws(()=>compileShortWaveImproper(d,2,d.progressionEvents![0] as any));}
 const d=structuredClone(UNDERCURRENT),c=compileShortWaveImproper(d,2,d.progressionEvents![0] as any),before=c.sample(21);d.figures[1].beats=99;d.progressionEvents![0].source.clause='modified';assert.deepEqual(c.sample(21),before);assert.throws(()=>c.sample(NaN),/finite/);
});
test('actual Avatar keeps beat-locked fixed limbs and exact held wrists, with disclosed two-count half-turn reach corrections',t=>{
 globalThis.document={createElement:()=>({getContext:()=>new Proxy({},{get:()=>()=>{},set:()=>true})})} as unknown as Document;
 const c=compile(2),avatars=c.dancers.map(d=>new Avatar(d)),state={dance:c.dance,showLabels:false} as StudioState;let newClamps=0,maxClamp=0,worst='',maxWrist=0,worstWrist='';const byFigure=new Map<number,number>();
 for(let i=8*120;i<32*120;i++){const beat=i/120,f=c.sample(beat);for(const a of avatars){a.update(f.poses[a.dancer.id],f,state,b=>c.sample(b));const g=a.root.userData.gait;assert.equal(g.phase,beat);assert.equal(g.maxRate,1);assert.equal(g.steps,c.dance.figures[f.figureIndex].beats);newClamps+=g.reachClamps;if(g.maxClampDistance>maxClamp){maxClamp=g.maxClampDistance;worst=`${beat}/${a.dancer.id}`;}byFigure.set(f.figureIndex,Math.max(byFigure.get(f.figureIndex)??0,g.maxClampDistance));for(const leg of a.legs){assert.ok(Math.abs(leg.upper.scale.y*3-.43)<1e-7);assert.ok(Math.abs(leg.lower.scale.y*3-.43)<1e-7);}for(const arm of a.arms){assert.ok(Math.abs(arm.upper.scale.y*3-.325)<1e-7);assert.ok(Math.abs(arm.lower.scale.y*3-.325)<1e-7);}}
 const corrected=applyBodyContactAnchors(avatars,f);for(const a of avatars)a.root.updateMatrixWorld(true);for(const h of corrected.contacts)if(h.strength>=1-1e-10)for(const[id,hand]of[[h.a,h.handA],[h.b,h.handB]] as const){if(h.target&&h.target!=='hands'&&id===h.b)continue;const wrist=avatars[id].arms.find(a=>a.side===(hand==='left'?1:-1))!.hand.getWorldPosition(new Vector3());const error=wrist.distanceTo(new Vector3(h.point.x,h.point.y,h.point.z));if(error>maxWrist){maxWrist=error;worstWrist=`${beat}/${id}/${f.figureIndex}`;}}}
 avatars.forEach(a=>a.dispose());t.diagnostic(`New-figure leg corrections ${newClamps}, maximum ${maxClamp} at ${worst}; by figure ${JSON.stringify([...byFigure])}; full wrist error ${maxWrist} at ${worstWrist}`);// The source's two-count unit-radius hand turns exceed this generic walking
 // rig's comfortable stance envelope. Keep the physical source path and count,
 // bound the disclosed fixed-bone correction, and require clean pass/swing gait.
 assert.equal(byFigure.get(1),0);assert.equal(byFigure.get(4),0);assert.ok(maxClamp<.055,`two-count wave leg correction grew to ${maxClamp} at ${worst}`);assert.ok(maxWrist<1e-7,`new wave wrist miss ${maxWrist}`);
});
test('explicit wave state composes checked primitives and separately counted wave phases without a nine-kind profile',()=>{
 const variants:(typeof UNDERCURRENT)[]=[];
 const synthetic=()=>{const d=structuredClone(UNDERCURRENT);d.id='synthetic-wave-contract';d.title='Synthetic wave composition regression';d.author='Test fixture';d.sourceUrl=undefined;d.progressionEvents![0].source={sourceId:'synthetic-test',url:'https://example.invalid/synthetic-wave-composition',clause:'Test-only explicit final row exchange',basis:'reviewed-interpretation'};return d;};
 let d=synthetic();d.figures[0]={id:'circle-entry',kind:'circle',label:'Circle once before wave',beats:8,direction:'left',amount:1,who:'all'};variants.push(d);
 d=synthetic();const {phaseBeats:_phase,balanceStyle:_style,...pass}=d.figures[1] as any;d.figures.splice(1,1,{...pass,kind:'pass-to-wave',beats:4},{id:'separate-wave-balance',kind:'wave-balance',label:'Balance the explicit wave',beats:4,balanceStyle:'right-left'});variants.push(d);
 d=synthetic();d.figures[0].beats=4;d.figures.splice(2,0,{id:'extra-wave-balance',kind:'wave-balance',label:'Balance the current wave again',beats:4,balanceStyle:'right-left'});variants.push(d);
 d=synthetic();d.figures[5]={id:'star-half',kind:'star',label:'Star halfway after the wave swing',beats:8,who:'all',direction:'right',amount:.5};variants.push(d);
 for(const d of variants)for(const n of[2,6]){const c=compileChoreography(d as Dance,n,staged);assert.equal(c.totalBeats,64);assert.equal(c.repeatable,true);assert.equal(c.starts.length,d.figures.length);for(const beat of c.starts.slice(1)){const A=c.sample(beat-1e-6),B=c.sample(beat+1e-6);for(let id=0;id<n*2;id++){assert.ok(gap(A.poses[id].position,B.poses[id].position)<1e-4);assert.ok(angle(A.poses[id].yaw,B.poses[id].yaw)<1e-4);}}const A=c.sample(0),B=c.sample(128*n);for(let id=0;id<n*2;id++){assert.ok(gap(A.poses[id].position,B.poses[id].position)<1e-6);assert.ok(angle(A.poses[id].yaw,B.poses[id].yaw)<1e-6);}}
});
test('wave-state composition rejects missing entries, discarded graphs, unresolved final waves and false endpoint claims',()=>{
 const mutate=[
  (d:typeof UNDERCURRENT)=>{d.figures[0]={id:'unbound-wave',kind:'wave-balance',label:'No incoming graph',beats:4,balanceStyle:'right-left'};d.figures[1].beats=12;},
  (d:typeof UNDERCURRENT)=>{d.figures[2]={id:'discarded-wave',kind:'long-lines',label:'Cannot silently drop a wave',beats:2,who:'all'};},
  (d:typeof UNDERCURRENT)=>{d.figures[2]={id:'premature-wave-swing',kind:'swing',label:'No declared half-turn exit',beats:12,who:'partner',entry:'short-wave-partners'};d.figures[4].beats=2;},
  (d:typeof UNDERCURRENT)=>{d.figures[8]={id:'neighbor-swing',kind:'circle',label:'Wrong physical progression endpoint',beats:12,who:'all',direction:'left',amount:.25,progression:true};},
  (d:typeof UNDERCURRENT)=>{d.figures[0].beats=12;d.figures[1]={...(d.figures[1] as any),kind:'pass-to-wave',beats:4};delete(d.figures[1] as any).phaseBeats;delete(d.figures[1] as any).balanceStyle;d.figures.splice(2);d.figures[0].beats=60;d.progressionEvents![0].afterFigureId=d.figures[1].id;}
 ];
 for(const mutation of mutate){const d=structuredClone(UNDERCURRENT);mutation(d);assert.throws(()=>compileChoreography(d as Dance,2,staged));}
});
