import test from 'node:test';import assert from 'node:assert/strict';
import {raw,dance,review,productionCapabilities} from '../test-data/revolving-door/production-source.ts';
import {prepareContraDbReview} from './source-review.ts';
import {compileChoreography} from './choreography.ts';
import {Avatar,applyBodyContactAnchors} from './scene.ts';
import {auditSourceMesh} from '../test-data/revolving-door/production-mesh.probe.ts';
import {REGISTERED_MOTION_CAPABILITIES} from './capabilities.ts';import type {StudioState,Pose} from './types.ts';import {Vector3} from 'three';
const gap=(a:Pose,b:Pose)=>Math.hypot(a.position.x-b.position.x,a.position.z-b.position.z),turn=(a:Pose,b:Pose)=>Math.abs(Math.atan2(Math.sin(a.yaw-b.yaw),Math.cos(a.yaw-b.yaw)));
test('actual774 uses the public registered review, preserves raw source and withdraws playback without replacing choices',()=>{
 assert.equal(review.result.coverage.executable,true);
 assert.equal(review.result.record!.snapshotId,'contradb:774:bc4a0adda98536b5');
 assert.equal(review.result.record!.author,'Bob Isaacs, Robert Cromartie, Isaac Banner');
 assert.equal(review.result.rows[4].source.text,'revolving door - ladles take right hands and drop off partners on other side');
 assert.deepEqual(review.result.record!.rows.map(row=>row.beats),Array(8).fill(8));
 assert.deepEqual(dance.figures.map(f=>[f.kind,f.beats]),[['star',8],['allemande',8],['allemande',8],['swing',8],['revolving-door',8],['swing',8],['long-lines',8],['star',8]]);
 assert.deepEqual(dance.figures.map(f=>[f.id,f.label]),review.result.record!.rows.map(row=>[row.id,row.text]));
 assert.equal(dance.figures[3].who,'partner');assert.equal(dance.figures[5].who,'neighbor');assert.equal(dance.verified,false);
 assert.deepEqual(JSON.parse(dance.sourceText).snapshot,JSON.parse(raw));
 assert.equal(REGISTERED_MOTION_CAPABILITIES.revolvingDoors,true);
 const off={...productionCapabilities,revolvingDoors:false},withdrawn=prepareContraDbReview(raw,[{sourceSnapshotId:review.result.record!.snapshotId,interpretation:review.interpretation}],off);
 assert.equal(withdrawn.result.coverage.executable,false);assert.equal(withdrawn.result.dance,undefined);
 assert.deepEqual(withdrawn.result.record,review.result.record);assert.deepEqual(withdrawn.interpretation,review.interpretation);
 assert.throws(()=>compileChoreography(dance,2,off),/Revolving doors require/);
});
test('public registered actual774 has named crossings, continuous source boundaries and complete2–12 finite periods',t=>{
 let boundaries=0;for(let n=2;n<=12;n++){const c=compileChoreography(dance,n,productionCapabilities);assert.ok(c.repeatable);assert.equal(c.totalBeats,64);for(let r=0;r<2*n;r++){for(const local of[0,8,16,24,32,40,48,56,64]){const beat=64*r+local;if(!beat)continue;const a=c.sample(beat-1e-7),b=c.sample(beat);for(const p of a.poses){assert.ok(gap(p,b.poses[p.id])<2e-5,`root${n}/${beat}/${p.id}`);assert.ok(turn(p,b.poses[p.id])<2e-5,`yaw${n}/${beat}/${p.id}`);}boundaries++;}const start=c.sample(r*64+32),end=c.sample(r*64+40);for(const p of start.poses){if(p.activity==='waiting')continue;assert.equal(Math.sign(end.poses[p.id].position.x),Math.sign(p.position.x)*(c.dancers[p.id].role==='lark'?-1:1));}}
 for(const local of[0,16,32,33.25,37.75,40,63]){const a=c.sample(local),b=c.sample(2*n*64+local);for(const p of a.poses){assert.ok(gap(p,b.poses[p.id])<1e-8);assert.ok(turn(p,b.poses[p.id])<1e-8);}}}assert.equal(boundaries,1375);t.diagnostic('Actual retained source through public production modules and working-tree registered defaults; deployment is a separate release step.');
});
test('actual Avatar keeps one step per count, fixed limbs, exact held wrists and continuous neighboring-swing handoffs',t=>{
 globalThis.document={createElement:()=>({getContext:()=>new Proxy({},{get:()=>()=>{},set:()=>true})})} as unknown as Document;
 for(const n of[2,3,6]){const c=compileChoreography(dance,n,productionCapabilities),avatars=c.dancers.map(d=>new Avatar(d));let wrist=0;const capture=(beat:number)=>{const f=c.sample(beat);for(const a of avatars){a.update(f.poses[a.dancer.id],f,{dance,showLabels:false}as unknown as StudioState,c.sample);const g=a.root.userData.gait;assert.equal(g.phase,beat);assert.equal(g.steps,8);assert.equal(g.maxRate,1);assert.equal(g.maxClampDistance,0,`reach${n}/${beat}/${a.dancer.id}`);for(const arm of a.arms){assert.ok(Math.abs(arm.upper.scale.y*3-.325)<1e-7);assert.ok(Math.abs(arm.lower.scale.y*3-.325)<1e-7);}for(const leg of a.legs){assert.ok(Math.abs(leg.upper.scale.y*3-.43)<1e-7);assert.ok(Math.abs(leg.lower.scale.y*3-.43)<1e-7);}}
 const posed=applyBodyContactAnchors(avatars,f);avatars.forEach(a=>a.root.updateMatrixWorld(true));for(const h of posed.contacts)if(h.strength>=1-1e-10)for(const[id,hand]of(!h.target||h.target==='hands'?[[h.a,h.handA],[h.b,h.handB]]:[[h.a,h.handA]])as[number,'left'|'right'][]){const p=avatars[id].arms.find(a=>a.side===(hand==='left'?1:-1))!.hand.getWorldPosition(new Vector3());wrist=Math.max(wrist,p.distanceTo(new Vector3(h.point.x,h.point.y,h.point.z)));}return avatars.flatMap(a=>[...a.arms.flatMap(p=>[p.hand,p.elbow]),...a.legs.flatMap(p=>[p.foot,p.knee])].map(p=>p.getWorldPosition(new Vector3())));};
 for(let i=0;i<=2400;i++)capture(24+i/100);for(const beat of[32,32.9,33.25,37.15,37.35,37.75,38.45,38.65,39,39.5,40]){const a=capture(beat-1e-7),b=capture(beat+1e-7);assert.ok(Math.max(...a.map((p,j)=>p.distanceTo(b[j])))<.0003,`joint join${n}/${beat}`);}assert.ok(wrist<1e-7);avatars.forEach(a=>a.dispose());t.diagnostic(`${n}couples: wrist${wrist}; zero new-segment reach clamps.`);}
});
test('public registered actual774 clears sampled major unrelated meshes; intentional support depths remain explicit',t=>{
 const beats=[...Array.from({length:161},(_,i)=>32+i/20),...Array.from({length:31},(_,i)=>32.1+i/100),...Array.from({length:61},(_,i)=>39.4+i/100)];const m=auditSourceMesh(beats);for(const key of['minLeg','minNoncontactArm','minUnassociatedTorso','minArmHead','minSelfArmHead'])assert.ok(m[key].value>0,`${key}: ${JSON.stringify(m[key])}`);t.diagnostic(JSON.stringify({minLeg:m.minLeg,minNoncontactArm:m.minNoncontactArm,minDirectedSupportArm:m.minDirectedSupportArm,minSupportTorso:m.minSupportTorso,minSelfForearmTorso:m.minSelfForearmTorso}));
});
