import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Vector3} from 'three';
import {Avatar,applyBodyContactAnchors} from './scene.ts';
import {readContraDbSource} from './contradb-source.ts';
import {compileTravelFigure,conventionalTravelBinding,type TravelFigureContext} from './travel-figure-adapter.ts';
import type {Dance,Dancer,Figure,Frame,Pose,StudioState} from './types.ts';

const dancers:Dancer[]=Array.from({length:4},(_,id)=>({id,name:['L1','R1','L2','R2'][id],role:id%2?'robin':'lark',couple:Math.floor(id/2),direction:1,color:'#438b86'}));
const pairMap=(pairs:number[][])=>new Map(pairs.flatMap(([a,b])=>[[a,b],[b,a]]));
function segmentDistance(a:Vector3,b:Vector3,c:Vector3,d:Vector3):number {
 const u=b.clone().sub(a),v=d.clone().sub(c),r=a.clone().sub(c),A=u.dot(u),E=v.dot(v),F=v.dot(r),B=u.dot(v),C=u.dot(r),D=A*E-B*B,clamp=(x:number)=>Math.max(0,Math.min(1,x));
 let s=D>1e-10?clamp((B*F-C*E)/D):0,t=(B*s+F)/E;if(t<0){t=0;s=clamp(-C/A);}else if(t>1){t=1;s=clamp((B-C)/A);}return a.clone().addScaledVector(u,s).distanceTo(c.clone().addScaledVector(v,t));
}
const figure=():Figure=>({id:'hall',kind:'hall-travel',beats:16,label:'Down the hall, turn as couples; return and bend',entry:'paired-sidelines-facing-down',hallTurn:'couples',hallPairRelation:'neighbor',hallPhaseBeats:[4,4,4,4]});
function context():TravelFigureContext {
 const positions=[{x:.9,z:.9},{x:-.9,z:.9},{x:-.9,z:-.9},{x:.9,z:-.9}],start:Pose[]=dancers.map(d=>({id:d.id,position:positions[d.id],yaw:0,stride:0,lean:0,bounce:0,turn:0,activity:'swing'}));
 return{ids:[0,1,2,3],dancers:structuredClone(dancers),start,relations:{epoch:4,partner:pairMap([[0,1],[2,3]]),neighbor:pairMap([[0,3],[2,1]])},bindingEpoch:4,next:{id:'circle',kind:'circle',beats:8,label:'Circle left three places',direction:'left',amount:.75,who:'all'}};
}
test('Nice Combination source-derived binding preserves neighbors, original center, bend adjacency and subsequent partner sides',()=>{
 const source=readContraDbSource(readFileSync(new URL('../test-data/contradb/138.json',import.meta.url),'utf8')).record!;
 assert.equal(source.title,'The Nice Combination');assert.equal(source.author,'Gene Hubert');assert.match(source.rows[0].text,/neighbors balance & swing end facing down the hall/);assert.match(source.rows[1].text,/turn as a couple/);assert.match(source.rows[2].text,/bend into a ring/);assert.match(source.rows[3].text,/circle left 3 places/);assert.match(source.rows[4].text,/partners swing/);
 const c=context(),f=figure(),binding=conventionalTravelBinding(f,c),plan=compileTravelFigure(f,c);assert.deepEqual(binding.lineOrder,[0,3,2,1]);
 const returned=c.ids.map(id=>({id,p:plan.position(id,.75)})).sort((a,b)=>a.p.x-b.p.x);assert.deepEqual(returned.map(p=>p.id),[2,1,0,3]);
 const ring=c.ids.map(id=>({id,p:plan.position(id,1)}));assert.ok(Math.abs(ring.reduce((s,p)=>s+p.p.x,0))<1e-8);assert.ok(Math.abs(ring.reduce((s,p)=>s+p.p.z,0))<1e-8);
 const corners=[[-1,-1],[1,-1],[1,1],[-1,1]].map(([x,z])=>ring.find(({p})=>Math.sign(p.x)===x&&Math.sign(p.z)===z)!.id);assert.deepEqual(corners,[2,3,0,1]);
 for(const[a,b]of[[0,1],[2,3]]){const A=ring.find(p=>p.id===a)!.p,B=ring.find(p=>p.id===b)!.p;assert.ok(Math.abs(A.z-B.z)<1e-8,'partners share the next sideline after a left-three-place rotation');}
 const contacts=plan.contacts(1,c.ids.map(id=>({...c.start[id],position:plan.position(id,1),yaw:plan.facing(id,1,c.start)})));assert.equal(contacts.length,4);assert.ok(contacts.every(h=>h.strength===1));
});
test('conventional binding rejects stale identities, ambiguous layouts, unresolved timings and unconsumed source modifiers',()=>{
 for(const change of[{hallTurn:undefined},{hallPairRelation:undefined},{hallPhaseBeats:undefined},{hallPhaseBeats:[6,2,6,2]},{entry:undefined},{beats:8},{hallPairRelation:'partner'},{exit:'face-down-line'},{direction:'left'},{who:'all'},{amount:.5},{progression:true},{hands:'both'},{notation:'arbitrary'},{unknownModifier:true}])assert.throws(()=>compileTravelFigure({...figure(),...change} as any,context()));
 let c=context();c.bindingEpoch=5;assert.throws(()=>compileTravelFigure(figure(),c),/stale/);c=context();c.start[0].position.z=0;assert.throws(()=>compileTravelFigure(figure(),c),/exact reviewed/);c=context();c.start[0].yaw=.1;assert.throws(()=>compileTravelFigure(figure(),c),/facing down/);
 c=context();c.travelBinding=conventionalTravelBinding(figure(),c);c.travelBinding.turn={mode:'alone',actors:c.ids.map(id=>({id,halfTurn:1}))};assert.throws(()=>compileTravelFigure(figure(),c),/contradicts/);
 c=context();c.travelBinding=conventionalTravelBinding(figure(),c);c.travelBinding.turn={mode:'couples',pairs:[{leftId:0,rightId:1,halfTurn:1},{leftId:2,rightId:3,halfTurn:1}]};assert.throws(()=>compileTravelFigure(figure(),c),/current relation/);
 c=context();c.travelBinding=conventionalTravelBinding(figure(),c);(c.travelBinding.turn as any).pairs[0].halfTurn=-1;assert.throws(()=>compileTravelFigure(figure(),c),/positive half-turn/);
 c=context();c.travelBinding=conventionalTravelBinding(figure(),c);c.travelBinding.turn={mode:'couples',pairs:[{leftId:3,rightId:0,halfTurn:1},{leftId:1,rightId:2,halfTurn:1}]};assert.throws(()=>compileTravelFigure(figure(),c),/lark backing/);
});
test('actual conventional entrance and compact ring use the unchanged Avatar with musical gait and four reachable ring hands',()=>{
 globalThis.document={createElement:()=>({getContext:()=>new Proxy({},{get:()=>()=>{},set:()=>true})})} as unknown as Document;
 const c=context(),f=figure(),plan=compileTravelFigure(f,c),avatars=dancers.map(d=>new Avatar(d)),dance={figures:[{kind:'long-lines',beats:8},f,{kind:'circle',beats:8}]} as Dance;
 const sample=(beat:number):Frame=>{beat=Math.max(0,Math.min(32,beat));const t=Math.max(0,Math.min(1,(beat-8)/16)),fi=beat<8?0:beat<=24?1:2,progress=fi===1?t:fi===0?beat/8:(beat-24)/8,poses=c.ids.map(id=>{const before=plan.position(id,Math.max(0,t-.002)),after=plan.position(id,Math.min(1,t+.002)),stride=Math.min(1,Math.hypot(after.x-before.x,after.z-before.z)/(.004*16)*2.5);return{...c.start[id],position:plan.position(id,t),yaw:plan.facing(id,t,c.start),stride,lean:.03*stride,bounce:Math.sin(beat*Math.PI*2)*.018*stride,activity:'hall-travel' as const};});return{beat,localBeat:beat,figureIndex:fi,figureProgress:progress,repeat:0,poses,contacts:plan.contacts(t,poses),warnings:[]};};
 let maxWrist=0,clamps=0,maxLowering=0,minLegMargin=Infinity,minTorsoMargin=Infinity;
 for(let i=0;i<=1920;i++){const beat=8+i/120,frame=sample(beat);for(const a of avatars){a.update(frame.poses[a.dancer.id],frame,{dance,showLabels:false} as StudioState,sample);assert.equal(a.root.userData.gait.phase,beat);assert.equal(a.root.userData.gait.maxRate,1);assert.equal(a.root.userData.gait.steps,16);clamps+=a.root.userData.gait.reachClamps;maxLowering=Math.max(maxLowering,a.root.userData.gait.pelvisLowering);}
  const corrected=applyBodyContactAnchors(avatars,frame);for(const a of avatars){a.root.updateMatrixWorld(true);for(const leg of a.legs){assert.ok(Math.abs(leg.upper.scale.y*3-.43)<1e-7);assert.ok(Math.abs(leg.lower.scale.y*3-.43)<1e-7);}for(const arm of a.arms){assert.ok(Math.abs(arm.upper.scale.y*3-.325)<1e-7);assert.ok(Math.abs(arm.lower.scale.y*3-.325)<1e-7);}}
  for(const h of corrected.contacts)if(h.strength===1)for(const[id,hand]of[[h.a,h.handA],[h.b,h.handB]] as const){const wrist=avatars[id].arms.find(a=>a.side===(hand==='left'?1:-1))!.hand.getWorldPosition(new Vector3());maxWrist=Math.max(maxWrist,wrist.distanceTo(new Vector3(h.point.x,h.point.y,h.point.z)));}
  const legs=avatars.map(a=>a.legs.flatMap(leg=>{const h=a.root.userData.hipPosition,hip=new Vector3(leg.side*.105+h.x,h.y,h.z).applyMatrix4(a.root.matrixWorld),knee=leg.knee.getWorldPosition(new Vector3()),ankle=leg.foot.position.clone().add(new Vector3(0,.045,-.015)).applyMatrix4(a.root.matrixWorld);return[{a:hip,b:knee,r:.083},{a:knee,b:ankle,r:.064}];}));
  for(let ai=0;ai<4;ai++)for(let bi=ai+1;bi<4;bi++){
   for(const a of legs[ai])for(const b of legs[bi])minLegMargin=Math.min(minLegMargin,segmentDistance(a.a,a.b,b.a,b.b)-a.r-b.r);
   const A=avatars[ai],B=avatars[bi],body=(a:Avatar,y:number)=>new Vector3(0,y,0).applyMatrix4(a.body.matrixWorld);minTorsoMargin=Math.min(minTorsoMargin,segmentDistance(body(A,.91),body(A,1.42),body(B,.91),body(B,1.42))-.49);
  }
  if(i===1920){assert.equal(corrected.contacts.length,4);assert.ok(corrected.contacts.every(h=>h.strength===1));}
 }
 avatars.forEach(a=>a.dispose());assert.equal(clamps,0);assert.ok(maxLowering<=.065);assert.ok(maxWrist<1e-7,`shared wrist error ${maxWrist}`);assert.ok(minLegMargin>0,`actual leg capsule separation ${minLegMargin}`);assert.ok(minTorsoMargin>.1,`conservative torso capsule separation ${minTorsoMargin}`);
});
