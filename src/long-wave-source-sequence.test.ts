import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Vector3} from 'three';
import {Avatar,applyBodyContactAnchors} from './scene.ts';
import {readContraDbSource} from './contradb-source.ts';
import {compileLongWaveImproper,LONG_WAVE_GEOMETRY} from './long-wave-source-sequence.ts';
import {joinLongWaveSegments,validateFullLongWave,fullLongWaveContacts} from './full-long-wave.ts';
import {BOB_THE_SURFER} from '../test-data/long-wave/bob-fixture.ts';
import type {StudioState} from './types.ts';
const gap=(a:{x:number;z:number},b:{x:number;z:number})=>Math.hypot(a.x-b.x,a.z-b.z),angle=(a:number,b:number)=>Math.abs(Math.atan2(Math.sin(a-b),Math.cos(a-b)));
const cache=new Map<number,ReturnType<typeof compileLongWaveImproper>>(),compile=(n:number)=>{if(!cache.has(n))cache.set(n,compileLongWaveImproper(BOB_THE_SURFER,n,BOB_THE_SURFER.progressionEvents![0] as any));return cache.get(n)!;};
test('retained Bob the Surfer consumes zero-count setup as an allemande exit without inventing musical time',()=>{
 const r=readContraDbSource(readFileSync(new URL('../test-data/contradb/1591.json',import.meta.url),'utf8')).record!;
 assert.equal(r.title,BOB_THE_SURFER.title);assert.equal(r.author,BOB_THE_SURFER.author);assert.deepEqual(r.rows.map(r=>r.beats),[16,8,8,8,8,0,8,8]);assert.match(r.rows[5].text,/form long waves - gentlespoons face in, ladles face out/);assert.match(r.rows[6].text,/gentlespoons cross while ladles loop right/);assert.match(r.rows[7].text,/ladles cross while gentlespoons loop right, look to next neighbors/);assert.equal(r.rows[7].progression,true);
 const c=compile(2);assert.equal(c.totalBeats,64);assert.equal(c.repeatable,true);assert.deepEqual(c.starts,[0,4,16,24,32,40,48,56]);assert.equal(c.dance.figures.length,8);assert.deepEqual(c.geometry,{halfWidth:.64,rowGap:1.28,allemandeRadius:.39});
 const before=c.sample(48-1e-7),after=c.sample(48);for(let id=0;id<4;id++){assert.ok(gap(before.poses[id].position,after.poses[id].position)<1e-7);assert.ok(angle(before.poses[id].yaw,after.poses[id].yaw)<1e-7);const p=after.poses[id],inward=Math.sin(p.yaw)*-Math.sign(p.position.x);assert.ok(c.dancers[id].role==='lark'?inward>.999:inward<-.999);}
});
test('literal source circulation exchanges occupied slots before any contra-neighbor rebind',()=>{
 const c=compile(2),a=c.sample(48),b=c.sample(56),end=c.sample(64-1e-8),initial=c.sample(0),wave=c.topology(48).wave!,middle=c.topology(56).wave!;
 assert.deepEqual(wave.lines.map(l=>l.order),[[0,3],[1,2]]);assert.deepEqual(middle.lines.map(l=>l.order),[[3,2],[0,1]]);
 for(const[id,destination]of[[0,1],[1,2],[2,3],[3,0]])assert.ok(gap(b.poses[id].position,a.poses[destination].position)<1e-7);
 for(const[id,destination]of[[0,3],[1,2],[2,1],[3,0]])assert.ok(gap(end.poses[id].position,initial.poses[destination].position)<1e-7);
 for(const beat of[0,48,52,56,60,63.99]){assert.equal(c.topology(beat).epoch,0);assert.deepEqual(c.topology(beat).neighbors,[[0,3],[1,2]]);}assert.equal(c.topology(64).epoch,1);assert.equal(c.topology(64).neighbors.length,0);
 for(const beat of[53,54,55]){const f=c.sample(beat);for(const id of[0,2])assert.ok(Math.abs(f.poses[id].position.z-a.poses[id].position.z)<1e-7);for(const id of[1,3])assert.ok(Math.abs(f.poses[id].position.x)>LONG_WAVE_GEOMETRY.halfWidth,'outward dancers loop right outside the sideline');}
});
test('full ordered long waves hold left hands across minor-set boundaries without changing contra neighbors',()=>{
 const c=compile(6),f=c.sample(49),g=c.topology(49).wave!;validateFullLongWave(g,c.sample(48).poses);assert.equal(g.hands.length,10);assert.equal(g.seamHands.length,4);assert.deepEqual(g.seamHands.map(h=>[h.a,h.b,h.handA]),[[3,4,'left'],[7,8,'left'],[2,5,'left'],[6,9,'left']]);assert.equal(f.contacts.length,10);
 const neighbors=new Set(c.topology(49).neighbors.flatMap(([a,b])=>[`${a}:${b}`,`${b}:${a}`]));for(const h of g.seamHands){assert.ok(!neighbors.has(`${h.a}:${h.b}`),'outer wave hand is not silently a current contra neighbor');assert.ok(f.contacts.some(k=>k.a===h.a&&k.b===h.b&&k.handA==='left'&&k.handB==='left'));}
 for(const beat of[48,49,50,51,52,56,57,58,59,60]){const f=c.sample(beat),hands=new Set<string>();for(const h of f.contacts){assert.equal(h.strength,1);for(const[id,hand]of[[h.a,h.handA],[h.b,h.handB]]){assert.ok(!hands.has(`${id}:${hand}`));hands.add(`${id}:${hand}`);}}}
});
test('2–12 couples traverse complete finite periods with all encounters, physical row progression and continuous boundaries',()=>{
 for(let n=2;n<=12;n++){const c=compile(n),met=new Set<string>();assert.equal(c.periodRepeats,2*n);let min=Infinity,maxStep=0;
  for(let round=0;round<c.periodRepeats;round++){const topology=c.topology(round*64+.1);for(const[a,b]of topology.neighbors)met.add([c.dancers[a].couple,c.dancers[b].couple].sort((a,b)=>a-b).join(':'));
   for(const local of[0,4,16,24,32,40,48,52,56,60,62.75,64]){const beat=round*64+local;if(!beat)continue;const A=c.sample(beat-1e-6),B=c.sample(beat+1e-6);for(let id=0;id<2*n;id++){assert.ok(gap(A.poses[id].position,B.poses[id].position)<1e-4,`${n}/${beat}/${id} root continuity`);assert.ok(angle(A.poses[id].yaw,B.poses[id].yaw)<1e-4,`${n}/${beat}/${id} facing continuity`);}}
   let previous=c.sample(round*64);for(let local=.125;local<=64;local+=.125){const frame=c.sample(round*64+local);for(let a=0;a<2*n;a++){maxStep=Math.max(maxStep,gap(frame.poses[a].position,previous.poses[a].position)/.125);for(let b=a+1;b<2*n;b++)min=Math.min(min,gap(frame.poses[a].position,frame.poses[b].position));}if(local<64)for(const h of frame.contacts){assert.ok(!topology.waitingIds.includes(h.a)&&!topology.waitingIds.includes(h.b));}previous=frame;}
   for(const id of topology.waitingIds){const A=c.sample(round*64),B=c.sample(round*64+8),C=c.sample(round*64+63.99);assert.ok(Math.abs(A.poses[id].position.z-B.poses[id].position.z)<1e-7,'same physical end');assert.ok(gap(B.poses[id].position,C.poses[id].position)<1e-7,'wait after compact end exchange');}
  }
  assert.equal(met.size,n*(n-1)/2,`${n} all couple encounters`);assert.ok(min>=.45-1e-7,`${n} global torso roots ${min}`);assert.ok(maxStep<1.8,`${n} speed ${maxStep}`);assert.equal(c.topology(64*c.periodRepeats+49).wave!.bindingEpoch,c.periodRepeats);const A=c.sample(0),B=c.sample(64*c.periodRepeats);for(let id=0;id<2*n;id++){assert.ok(gap(A.poses[id].position,B.poses[id].position)<1e-7);assert.ok(angle(A.poses[id].yaw,B.poses[id].yaw)<1e-7);}
 }
});
test('full wave graph fails closed for missing seam hands, wrong order, duplicate hands, wrong epochs and unreachable spacing',()=>{
 const c=compile(4),p=c.sample(48).poses,original=c.topology(48).wave!;
 for(const mutation of[(g:any)=>g.hands.pop(),(g:any)=>g.lines[0].order.reverse(),(g:any)=>g.hands[1].handA='right',(g:any)=>g.bindingEpoch=-1,(g:any)=>g.actorIds.push(g.actorIds[0]),(g:any)=>g.seamHands.pop(),(g:any)=>g.actorIds[0]=-1]){const g=structuredClone(original);mutation(g);assert.throws(()=>validateFullLongWave(g,p));}
 assert.throws(()=>validateFullLongWave(original,p,original.bindingEpoch+1),/stale/);assert.throws(()=>validateFullLongWave(original,[...p,p[0]]),/unique/);assert.throws(()=>fullLongWaveContacts(original,[...p,p[0]]),/unique/);
 const local={lines:original.lines.map(l=>({...l,order:l.order.slice(0,2)})),hands:original.hands.filter(h=>[0,1,2,3].includes(h.a)&&[0,1,2,3].includes(h.b)).map(h=>({...h}))};local.hands[0].handA='left';assert.throws(()=>joinLongWaveSegments([local],p,[0,1,2,3],0),/hand/);
 const wide=p.map(p=>({...p,position:{x:p.position.x,z:p.position.z*2}}));assert.throws(()=>validateFullLongWave(original,wide),/reachable/);assert.throws(()=>fullLongWaveContacts(original,p,2),/strength/);assert.throws(()=>joinLongWaveSegments([],p,[0],0),/disappear/);assert.throws(()=>{original.hands[0].a=99;});
});
test('source semantics, role selectors, counts, progression targets and input ownership cannot bypass full-set contracts',()=>{
 const changes=[(d:any)=>d.figures[5].exit=undefined,(d:any)=>d.figures[5].amount=.5,(d:any)=>d.figures[5].inwardRole='robin',(d:any)=>d.figures[5].beats=0,(d:any)=>d.figures[6].phaseBeats=[2,6],(d:any)=>d.figures[6].crossRole='robin',(d:any)=>d.figures[7].loopDirection='left',(d:any)=>d.figures[7].exit='long-waves',(d:any)=>d.figures[6].amount=1,(d:any)=>d.figures[5].unconsumed=true,(d:any)=>d.figures[7].progression='later',(d:any)=>d.progressionEvents[0].afterFigureId=d.figures[6].id];
 for(const mutate of changes){const d=structuredClone(BOB_THE_SURFER);mutate(d);assert.throws(()=>compileLongWaveImproper(d,2,d.progressionEvents![0] as any));}
 const d=structuredClone(BOB_THE_SURFER),c=compileLongWaveImproper(d,4,d.progressionEvents![0] as any),before=c.sample(49);d.figures[6].beats=99;d.progressionEvents![0].source.clause='mutated';assert.deepEqual(c.sample(49),before);assert.throws(()=>c.sample(NaN),/finite/);for(const n of[1,13,2.5])assert.throws(()=>compileLongWaveImproper(BOB_THE_SURFER,n,BOB_THE_SURFER.progressionEvents![0] as any),/2–12/);
});
test('actual full-set Avatars retain beat-locked gait, fixed limbs and all internal and seam joined wrists',t=>{
 globalThis.document={createElement:()=>({getContext:()=>new Proxy({},{get:()=>()=>{},set:()=>true})})} as unknown as Document;
 const c=compile(6),avatars=c.dancers.map(d=>new Avatar(d)),state={dance:c.dance,showLabels:false} as StudioState;let clamps=0,maxClamp=0,worst='',maxWrist=0,held=0;
 for(let i=47*120;i<64*120;i++){const beat=i/120,f=c.sample(beat);for(const a of avatars){a.update(f.poses[a.dancer.id],f,state,b=>c.sample(b));const g=a.root.userData.gait;assert.equal(g.phase,beat);assert.equal(g.maxRate,1);assert.equal(g.steps,c.dance.figures[f.figureIndex].beats);clamps+=g.reachClamps;if(g.maxClampDistance>maxClamp){maxClamp=g.maxClampDistance;worst=`${beat}/${a.dancer.id}`;}for(const leg of a.legs){assert.ok(Math.abs(leg.upper.scale.y*3-.43)<1e-7);assert.ok(Math.abs(leg.lower.scale.y*3-.43)<1e-7);}for(const arm of a.arms){assert.ok(Math.abs(arm.upper.scale.y*3-.325)<1e-7);assert.ok(Math.abs(arm.lower.scale.y*3-.325)<1e-7);}}
  const corrected=applyBodyContactAnchors(avatars,f);for(const a of avatars)a.root.updateMatrixWorld(true);for(const h of corrected.contacts)if(h.strength>=1-1e-10){held++;for(const[id,hand]of[[h.a,h.handA],[h.b,h.handB]] as const){const wrist=avatars[id].arms.find(a=>a.side===(hand==='left'?1:-1))!.hand.getWorldPosition(new Vector3());maxWrist=Math.max(maxWrist,wrist.distanceTo(new Vector3(h.point.x,h.point.y,h.point.z)));}}
 }
 avatars.forEach(a=>a.dispose());t.diagnostic(`Full-wave contacts ${held}; joined wrist error ${maxWrist}; leg corrections ${clamps}, largest ${maxClamp} at ${worst}.`);assert.ok(held>9000);assert.ok(maxWrist<1e-7);assert.equal(clamps,0,`generic gait correction ${maxClamp} at ${worst}`);
});

test('full-set composition consumes a checked synthetic primitive prefix without title or fixed-figure-list dispatch',()=>{
 const d=structuredClone(BOB_THE_SURFER);d.id='synthetic-long-wave-composition';d.title='Synthetic long-wave contract regression';d.author='Test fixture';d.sourceUrl=undefined;d.figures[5].progression=false;d.figures[1].beats=8;d.figures.splice(2,0,{id:'extra-dosido',kind:'do-si-do',beats:4,label:'Synthetic four-count neighbor do-si-do',who:'neighbor',direction:'right',amount:1});d.progressionEvents![0].source={sourceId:'synthetic-test',url:'https://example.invalid/full-long-wave-test',clause:'Test-only explicit final row exchange',basis:'reviewed-interpretation'};
 for(const n of[2,6]){const c=compileLongWaveImproper(d,n,d.progressionEvents![0] as any);assert.equal(c.totalBeats,64);assert.deepEqual(c.starts,[0,4,12,16,24,32,40,48,56]);const A=c.sample(0),B=c.sample(c.periodRepeats*64);for(let id=0;id<2*n;id++){assert.ok(gap(A.poses[id].position,B.poses[id].position)<1e-7);assert.ok(angle(A.poses[id].yaw,B.poses[id].yaw)<1e-7);}}
});
