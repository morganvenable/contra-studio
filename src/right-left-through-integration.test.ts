import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Vector3} from 'three';
import {importContraDb,type ContraDbInterpretation} from './contradb-import.ts';
import {compileChoreography} from './choreography.ts';
import {Avatar,applyBodyContactAnchors} from './scene.ts';
import type {Pose,StudioState,MotionCapabilities} from './types.ts';
const input=readFileSync(new URL('../test-data/contradb/2259.json',import.meta.url),'utf8');
const capabilities:MotionCapabilities={archExchanges:true,archRelationChanges:true,rightLeftThrough:true};
const interpretation:ContraDbInterpretation={rows:{'contradb:2259:row:0':{balanceBeats:4},'contradb:2259:row:1':{balanceBeats:4},'contradb:2259:row:2':{balanceBeats:4},'contradb:2259:row:5':{rightLeftThrough:{hand:'right',courtesyReceiver:'partner',courtesyLeader:'lark',crossingRelation:'neighbor'}}}};
const source=()=>{const r=importContraDb(input,{capabilities,interpretation});assert.deepEqual(r.errors,[]);assert.ok(r.dance);return r.dance;};
const gap=(a:Pose,b:Pose)=>Math.hypot(a.position.x-b.position.x,a.position.z-b.position.z);
const angle=(a:Pose,b:Pose)=>Math.abs(Math.atan2(Math.sin(a.yaw-b.yaw),Math.cos(a.yaw-b.yaw)));
const corners=(poses:Pose[])=>[...poses].sort((a,b)=>{const slot=(p:Pose)=>p.position.z<0?(p.position.x<0?0:1):(p.position.x>0?2:3);return slot(a)-slot(b);}).map(p=>p.id);
test('actual2259 source remains attributed, snapshot-bound, choice-explicit and independently gated',()=>{
 const d=source();assert.equal(d.title,'Box the Gnat Contra');assert.equal(d.author,'Becky Hill');assert.equal(d.sourceUrl,'https://contradb.com/dances/2259');assert.equal(d.sourceRecord.sourceId,'2259');assert.equal(d.sourceRows.length,7);assert.equal(d.sourceRecord.original,JSON.parse(input).html);
 assert.deepEqual(d.figures.map(f=>[f.kind,f.beats]),[['balance',4],['box-the-gnat',4],['balance',4],['box-the-gnat',4],['balance',4],['swing',12],['allemande',8],['swing',8],['right-left-through',8],['robins-chain',8]]);
 assert.deepEqual([d.figures[8].who,d.figures[8].crossingRelation,d.figures[8].courtesyLeader,d.figures[8].direction],['partner','neighbor','lark','right']);assert.equal(d.figures[8].progression,undefined);assert.equal(d.figures[9].progression,true);
 assert.equal(importContraDb(input,{capabilities:{...capabilities,rightLeftThrough:false},interpretation}).coverage.executable,false);const missing=structuredClone(interpretation);delete missing.rows!['contradb:2259:row:5'].rightLeftThrough;assert.equal(importContraDb(input,{capabilities,interpretation:missing}).coverage.executable,false);
 const restored=importContraDb(d.sourceText,{capabilities});assert.deepEqual(restored.errors,[]);assert.deepEqual(restored.dance!.figures,d.figures);assert.equal(restored.dance!.sourceText,d.sourceText);
});
test('2259 exact source corner permutation survives every finite set period without R&L inventing progression',()=>{
 const d=source(),two=compileChoreography(d,2,capabilities);assert.deepEqual(corners(two.sample(48).poses),[0,3,2,1]);assert.deepEqual(corners(two.sample(56).poses),[2,1,0,3]);assert.deepEqual(corners(two.sample(64-1e-7).poses),[2,3,0,1]);
 for(let couples=2;couples<=12;couples++){const c=compileChoreography(d,couples,capabilities);assert.ok(c.repeatable);for(let repeat=0;repeat<2*couples;repeat++)for(const b of[...c.starts,64]){const t=repeat*64+b;if(t===0)continue;const before=c.sample(t-1e-7),after=c.sample(t);for(const p of after.poses){assert.ok(gap(p,before.poses[p.id])<2e-5,`root${couples}/${t}/${p.id}`);assert.ok(angle(p,before.poses[p.id])<2e-5,`yaw${couples}/${t}/${p.id}`);}}
  const a=c.sample(1.3),b=c.sample(2*couples*64+1.3);for(const p of a.poses){assert.ok(gap(p,b.poses[p.id])<1e-8);assert.ok(angle(p,b.poses[p.id])<1e-8);}
 }
});
test('2259 full-round rig keeps exact musical cadence, strict new-figure reach and explicitly bounded reused-figure residuals',()=>{
 globalThis.document={createElement:()=>({getContext:()=>new Proxy({},{get:()=>()=>{},set:()=>true})})} as unknown as Document;
 const dance=source(),c=compileChoreography(dance,6,capabilities),avatars=c.dancers.map(d=>new Avatar(d));let maximum=0,worst='',clamps=0,maxWrist=0;const residuals:Record<string,number>={};
 const samples=Array.from({length:2561},(_,i)=>i/40);
 for(const beat of samples){const f=c.sample(beat),cache=new Map<number,ReturnType<typeof c.sample>>(),sample=(b:number)=>{if(!cache.has(b))cache.set(b,c.sample(b));return cache.get(b)!;};for(const a of avatars){a.update(f.poses[a.dancer.id],f,{dance,showLabels:false} as StudioState,sample);const g=a.root.userData.gait;assert.equal(g.phase,beat);assert.equal(g.maxRate,1);assert.equal(g.steps,dance.figures[f.figureIndex].beats);clamps+=g.reachClamps;const kind=dance.figures[f.figureIndex].kind;residuals[kind]=Math.max(residuals[kind]??0,g.maxClampDistance);if(g.maxClampDistance>maximum){maximum=g.maxClampDistance;worst=`${beat}/${a.dancer.id}/${dance.figures[f.figureIndex].kind}`;}for(const leg of a.legs){assert.ok(Math.abs(leg.upper.scale.y*3-.43)<1e-7);assert.ok(Math.abs(leg.lower.scale.y*3-.43)<1e-7);}}
  const corrected=applyBodyContactAnchors(avatars,f);avatars.forEach(a=>a.root.updateMatrixWorld(true));for(const h of corrected.contacts)if(h.strength>=1-1e-10&&['arch','courtesy'].includes(h.kind))for(const[id,hand]of[[h.a,h.handA],[h.b,h.handB]] as const){const a=avatars[id],point=a.arms.find(x=>x.side===(hand==='left'?1:-1))!.hand.getWorldPosition(new Vector3());maxWrist=Math.max(maxWrist,point.distanceTo(new Vector3(h.point.x,h.point.y,h.point.z)));}
 }
 avatars.forEach(a=>a.dispose());
 // Reused paths retain measured reach corrections: ≤7mm during allemande
 // acquisition and ≤5mm in chain reopening. They are not a perfect-body
 // certificate. New arches/R&L and every other figure remain strict zero.
 for(const[kind,correction]of Object.entries(residuals)){const budget=kind==='allemande'?.007:kind==='robins-chain'?.005:0;assert.ok(correction<=budget,`${kind} reach ${correction} exceeds its explicit ${budget} budget; whole-round maximum ${maximum} at ${worst}, ${clamps} corrections`);}
 assert.equal(residuals['box-the-gnat'],0);assert.equal(residuals['right-left-through'],0);assert.ok(maxWrist<1e-7,`full-strength hand miss${maxWrist}`);
});

/** New widened arch releases must not blend the far right wrist through its
 * owner's chest. This is deliberately narrower than a whole-body certificate:
 * small existing free-left-hand and upper-arm/head overlaps remain reported. */
test('2259 both new arch exits route right forearms and hands outside their own torsos',()=>{
 globalThis.document={createElement:()=>({getContext:()=>new Proxy({},{get:()=>()=>{},set:()=>true})})} as unknown as Document;
 const dance=source(),c=compileChoreography(dance,6,capabilities),avatars=c.dancers.map(d=>new Avatar(d));
 const rings=[[.91,.197],[.97,.195],[1.11,.17],[1.27,.225],[1.34,.245],[1.40,.18],[1.42,.11]],radius=(y:number)=>{if(y<.91||y>1.42)return 0;let k=1;while(k<rings.length-1&&rings[k][0]<y)k++;return rings[k-1][1]+(rings[k][1]-rings[k-1][1])*(y-rings[k-1][0])/(rings[k][0]-rings[k-1][0]);};
 let minimum=Infinity,worst='';
 for(const start of[4,12])for(let i=0;i<160;i++){const beat=start+i/40,f=c.sample(beat);for(const a of avatars)a.update(f.poses[a.dancer.id],f,{dance,showLabels:false} as StudioState,b=>c.sample(b));applyBodyContactAnchors(avatars,f);
  for(const a of avatars){a.root.updateMatrixWorld(true);const inv=a.body.matrixWorld.clone().invert(),right=a.arms.find(arm=>arm.side===-1)!;
   for(const mesh of[right.lower,right.hand]){const attr=mesh.geometry.attributes.position;for(let j=0;j<attr.count;j++){const p=new Vector3().fromBufferAttribute(attr,j).applyMatrix4(mesh.matrixWorld).applyMatrix4(inv),r=radius(p.y);if(!r)continue;const margin=(Math.hypot(p.x,p.z/.7)-r)*.7;if(margin<minimum){minimum=margin;worst=`${beat}/${a.dancer.id}`;}}}
  }
 }
 avatars.forEach(a=>a.dispose());assert.ok(minimum>=0,`New right-arm release enters own torso ${minimum} at ${worst}`);
});
test('arch release routing is explicitly scoped to widened endpoints and cannot change registered equal-spacing1502',()=>{
 const wide=compileChoreography(source(),2,capabilities);for(const beat of[4.5,6.5,12.5,14.5])assert.ok(wide.sample(beat).poses.every(p=>p.arch?.releaseRouting==='wide-exit'));
 const r=importContraDb(readFileSync(new URL('../test-data/contradb/1502.json',import.meta.url),'utf8'),{capabilities:{archExchanges:true,partialHeys:true},interpretation:{rows:{'contradb:1502:row:0':{balanceBeats:4},'contradb:1502:row:2':{balanceBeats:4},'contradb:1502:row:5':{chainReceiver:'neighbor'}}}});assert.deepEqual(r.errors,[]);assert.ok(r.dance);const narrow=compileChoreography(r.dance,2,{archExchanges:true,partialHeys:true});for(const beat of[4.5,6.5,7.5])assert.ok(narrow.sample(beat).poses.every(p=>p.arch&&p.arch.releaseRouting===undefined));
});
