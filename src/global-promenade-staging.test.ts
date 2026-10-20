/** Whole-set travel must fit the existing bounds-driven room, band and cameras. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {Box3,PerspectiveCamera,Vector3} from 'three';
import {Avatar,applyBodyContactAnchors} from './scene.ts';
import {RobotBand} from './robot-band.ts';
import {choreographyBounds,fitPerspectiveCamera} from './camera-fit.ts';
import {compileStagedOval} from '../test-data/global-promenade/compiled-fixture.ts';
import {reviewedOvalSource} from '../test-data/global-promenade/fixture.ts';
import type {StudioState} from './types.ts';

test('actual whole-set oval clears the animated music-end stage and fits all room presets for 2–12 couples',t=>{
 globalThis.document={createElement:()=>({getContext:()=>new Proxy({},{get:()=>()=>{},set:()=>true})})}as unknown as Document;
 let minimumStageGap=Infinity,minimumMeshStageGap=Infinity,maximumProjected=0;
 for(let count=2;count<=12;count++){
  const c=compileStagedOval(reviewedOvalSource(),count),danceBounds=choreographyBounds(c),band=new RobotBand();band.setFloorBounds(danceBounds);
  const visual=danceBounds.clone().union(band.bounds().expandByScalar(.25)),swept=new Box3(),animatedBand=new Box3();
  // The complete finite period, not just the two repeats used by camera fitting.
  for(let step=0;step<=c.period*64*4;step++)for(const p of c.sample(step/4).poses){swept.expandByPoint(new Vector3(p.position.x-.7,-.05,p.position.z-.7));swept.expandByPoint(new Vector3(p.position.x+.7,2.3,p.position.z+.7));}
  const avatars=c.dancers.map(d=>new Avatar(d)),state={dance:c.dance,showLabels:false}as StudioState,bodyBounds=new Box3();
  // Both spatial/end parities with actual articulated meshes and animated band.
  for(let step=0;step<=128*2;step++){
   const beat=step/2,f=c.sample(beat);band.update(beat,true);const stage=band.bounds();animatedBand.union(stage);
   for(const a of avatars)a.update(f.poses[a.dancer.id],f,state,c.sample);applyBodyContactAnchors(avatars,f);
   for(const a of avatars){a.root.updateMatrixWorld(true);const box=new Box3().setFromObject(a.root);bodyBounds.union(box);minimumMeshStageGap=Math.min(minimumMeshStageGap,box.min.z-stage.max.z);}
  }
  minimumStageGap=Math.min(minimumStageGap,swept.min.z-animatedBand.max.z);assert.ok(swept.min.z>animatedBand.max.z,`stage intersects full-period performer envelope: ${count}`);assert.ok(bodyBounds.min.z>animatedBand.max.z,`stage intersects actual articulated mesh: ${count}`);
  const required=swept.union(bodyBounds).union(animatedBand),target=visual.getCenter(new Vector3());
  for(const aspect of[.4,.55,.75,1.1,1.8,2.4])for(const direction of[[10.2,11.9,14.8],[0,19,.01],[15,4,1]]){
   const camera=new PerspectiveCamera(38,aspect,.1,100);camera.position.copy(target).add(new Vector3(...direction));fitPerspectiveCamera(camera,visual,target,1.1);
   for(const x of[required.min.x,required.max.x])for(const y of[required.min.y,required.max.y])for(const z of[required.min.z,required.max.z]){const p=new Vector3(x,y,z).project(camera);maximumProjected=Math.max(maximumProjected,Math.abs(p.x),Math.abs(p.y));assert.ok(Math.abs(p.x)<1&&Math.abs(p.y)<1&&p.z>=-1&&p.z<=1,`preset clips ${count}/${aspect}/${direction}: ${p.toArray()}`);}
  }
  avatars.forEach(a=>a.dispose());band.dispose();
 }
 assert.ok(minimumStageGap>.5);assert.ok(minimumMeshStageGap>.5);t.diagnostic(JSON.stringify({minimumStageGap,minimumMeshStageGap,maximumProjected}));
});
