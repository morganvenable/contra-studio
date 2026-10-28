import test from 'node:test';
import assert from 'node:assert/strict';
import {Vector3} from 'three';
import {Avatar,applyBodyContactAnchors} from './scene.ts';
import {compileLongWaveImproper,LONG_WAVE_TURN_PREPARATION} from './long-wave-source-sequence.ts';
import {compileEventSection} from './event-section.ts';
import {createDancers,compilePrimitiveFigure,figureContinuity} from './engine.ts';
import {bindDirectedCoupleSlots} from './progression-topology.ts';
import {BOB_THE_SURFER} from '../test-data/long-wave/bob-fixture.ts';
import type {Figure,Frame,Pose,StudioState} from './types.ts';
const documentStub=()=>{globalThis.document={createElement:()=>({getContext:()=>new Proxy({},{get:()=>()=>{},set:()=>true})})} as unknown as Document;};
const rings=[[.91,.197],[.97,.195],[1.11,.17],[1.27,.225],[1.34,.245],[1.40,.18],[1.42,.11]],radius=(y:number)=>{if(y<.91||y>1.42)return 0;let i=1;while(i<rings.length-1&&rings[i][0]<y)i++;return rings[i-1][1]+(rings[i][1]-rings[i-1][1])*(y-rings[i-1][0])/(rings[i][0]-rings[i-1][0]);};
const penetration=(A:any,B:any)=>{const inv=B.matrixWorld.clone().invert(),p=A.geometry.attributes.position,scale=B.getWorldScale(new Vector3()),factor=Math.min(scale.x,scale.y,scale.z);let minimum=Infinity;for(let i=0;i<p.count;i++){const v=new Vector3().fromBufferAttribute(p,i).applyMatrix4(A.matrixWorld).applyMatrix4(inv),q=B.geometry.type==='CapsuleGeometry'?Math.hypot(v.x,v.z,Math.max(0,Math.abs(v.y)-.5)):v.length();minimum=Math.min(minimum,(q-1)*factor);}return minimum;};
const parts=(a:Avatar)=>a.arms.flatMap(arm=>[{mesh:arm.upper,hand:arm.side===1?'left':'right',upper:true},{mesh:arm.lower,hand:arm.side===1?'left':'right',upper:false},{mesh:arm.hand,hand:arm.side===1?'left':'right',upper:false}]);
function bodyMargin(a:Avatar,b:Avatar){const inv=b.body.matrixWorld.clone().invert();let minimum=Infinity;for(const part of parts(a)){if(a===b&&part.upper)continue;const vertices=part.mesh.geometry.attributes.position;for(let j=0;j<vertices.count;j++){const v=new Vector3().fromBufferAttribute(vertices,j).applyMatrix4(part.mesh.matrixWorld).applyMatrix4(inv),r=radius(v.y);if(r)minimum=Math.min(minimum,(Math.hypot(v.x,v.z/.7)-r)*.7);}}return minimum;}
/** Actual production mesh vertices, including adjacent minor sets. Upper arms
 * intentionally attach to their own shoulders, so only that own-body pair is
 * excluded. This sampled check is not a continuous clothing intersection proof. */
test('new neighbor-turn preparation and full long waves clear major other-torso and unrelated-arm intersections',t=>{
 documentStub();const c=compileLongWaveImproper(BOB_THE_SURFER,4,BOB_THE_SURFER.progressionEvents![0] as any),avatars=c.dancers.map(d=>new Avatar(d)),state={dance:c.dance,showLabels:false} as StudioState;let own=Infinity,other=Infinity,unrelated=Infinity,clamps=0;
 assert.deepEqual(LONG_WAVE_TURN_PREPARATION,{outwardCenterShift:.24,openingBeats:1.5,closingBeats:1.5});
 for(let i=40*20;i<=64*20;i++){const beat=i/20,f=c.sample(beat);for(const a of avatars){a.update(f.poses[a.dancer.id],f,state,b=>c.sample(b));clamps+=a.root.userData.gait.reachClamps;}applyBodyContactAnchors(avatars,f);for(const a of avatars)a.root.updateMatrixWorld(true);
  for(const a of avatars)for(const b of avatars){if(a.root.position.distanceTo(b.root.position)>1.5)continue;const margin=bodyMargin(a,b);if(a===b)own=Math.min(own,margin);else other=Math.min(other,margin);if(a.dancer.id>=b.dancer.id)continue;for(const A of parts(a))for(const B of parts(b)){const held=f.contacts.some(c=>c.strength>0&&((c.a===a.dancer.id&&c.b===b.dancer.id&&c.handA===A.hand&&c.handB===B.hand)||(c.a===b.dancer.id&&c.b===a.dancer.id&&c.handA===B.hand&&c.handB===A.hand)));if(!held)unrelated=Math.min(unrelated,penetration(A.mesh,B.mesh),penetration(B.mesh,A.mesh));}}
 }
 avatars.forEach(a=>a.dispose());t.diagnostic(`New 40–64 segment: own-arm margin ${own}; other torso ${other}; unrelated arms ${unrelated}; leg corrections ${clamps}.`);assert.ok(own>-.01,'bound the generic free-arm skin skim below 10 mm');assert.ok(other>.07);assert.ok(unrelated>.07);assert.equal(clamps,0);
});
/** A retained baseline makes the inherited pre-wave swing handoff limitation
 * measurable rather than silently exempting a new compact-body defect. */
test('compact pre-wave lark-turn handoff does not worsen the existing standard-profile own-forearm artifact',t=>{
 documentStub();const compact=compileLongWaveImproper(BOB_THE_SURFER,2,BOB_THE_SURFER.progressionEvents![0] as any),dancers=createDancers(2),geometry={halfWidth:.9,rowGap:1.8,allemandeRadius:.55},initial:Pose[]=dancers.map(d=>({id:d.id,position:{x:geometry.halfWidth*(d.role==='lark'?d.direction:-d.direction),z:(d.couple-.5)*geometry.rowGap},yaw:d.direction===1?0:Math.PI,stride:0,lean:0,bounce:0,turn:0,activity:'waiting'})),binding=bindDirectedCoupleSlots(dancers,0,dancers.filter(d=>d.role==='lark').map(d=>({coupleId:d.couple,rank:d.couple,direction:d.direction}))),figures=BOB_THE_SURFER.figures.slice(0,5) as Figure[],baseline=compileEventSection({dancers,initial,binding,totalBeats:40,steps:figures.map((figure,index)=>({figure,entryFacingBeats:['circle','allemande'].includes(figure.kind)?Math.min(1,figure.beats*.12):0,compile(context){return compilePrimitiveFigure(figure,context.ids,context.start,context.dancers,[1,-1],{...figureContinuity(figures,index),geometry});}}))});
 const measure=(sample:(beat:number)=>Frame)=>{const avatars=dancers.map(d=>new Avatar(d));let own=Infinity,clamps=0;for(let i=23*120;i<=24*120;i++){const beat=i/120,f=sample(beat);for(const a of avatars){a.update(f.poses[a.dancer.id],f,{dance:compact.dance,showLabels:false} as StudioState,sample);clamps+=a.root.userData.gait.reachClamps;}applyBodyContactAnchors(avatars,f);for(const a of avatars){a.root.updateMatrixWorld(true);own=Math.min(own,bodyMargin(a,a));}}avatars.forEach(a=>a.dispose());assert.equal(clamps,0);return own;};
 const standard=measure(beat=>baseline.sample(Math.max(0,Math.min(40,beat)))),small=measure(beat=>compact.sample(beat));t.diagnostic(`Inherited lark-turn/swing handoff own-forearm margin: standard ${standard}; compact ${small}.`);assert.ok(Number.isFinite(standard),'the comparison must retain a measured standard-profile baseline');assert.ok(small>=standard-.002);assert.ok(small>-.054);
});
