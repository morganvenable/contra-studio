import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {Vector3} from 'three';
import {Avatar,applyBodyContactAnchors} from './scene.ts';
import {Avatar as HistoricalAppearanceAvatar} from '../test-data/global-promenade/scene-before-oval.ts';
import {copyAvatarCosmetics} from '../qa/copy-avatar-cosmetics.mjs';
import {compileChoreography} from './choreography.ts';
import {prepareContraDbReview} from './source-review.ts';
import {REGISTERED_MOTION_CAPABILITIES} from './capabilities.ts';
import type {CompiledDance,StudioState} from './types.ts';

function mockCanvas(){globalThis.document={createElement:()=>({getContext:()=>new Proxy({},{get:()=>()=>{},set:()=>true})})} as unknown as Document;}
function pose(avatars:Avatar[],c:CompiledDance,beat:number){const frame=c.sample(beat);for(const a of avatars)a.update(frame.poses[a.dancer.id],frame,{dance:c.dance,showLabels:false} as StudioState,b=>c.sample(b));const corrected=applyBodyContactAnchors(avatars,frame);avatars.forEach(a=>a.root.updateMatrixWorld(true));return corrected;}

test('the qualified three-plus-one cue leaves ordinary four-count California bodies byte-equivalent',()=>{
 mockCanvas();
 const reviewed=prepareContraDbReview(readFileSync(new URL('../test-data/contradb/1450.json',import.meta.url),'utf8'),[],REGISTERED_MOTION_CAPABILITIES).result.dance!;
 const c=compileChoreography(reviewed,2,REGISTERED_MOTION_CAPABILITIES),avatars=c.dancers.map(d=>new Avatar(d)),hash=createHash('sha256');
 // The saved hash includes historical torso/hip/hair matrices. Reapply only
 // those cosmetics; production motion, anchors, limbs and the hash stay exact.
 for(const avatar of avatars){const historical=new HistoricalAppearanceAvatar(avatar.dancer);copyAvatarCosmetics(avatar,historical);historical.dispose();}
 // Captured from the ordinary renderer (recaptured 2026-10-28 when free hands
 // began hanging at the sides). Every mesh matrix, gait diagnostic and
 // resolved hand target is owned.
 for(let i=0;i<=640;i++){const frame=pose(avatars,c,56+i/80),snapshot={contacts:frame.contacts,avatars:avatars.map(a=>{const matrices:number[][]=[];a.root.traverse(m=>{if('isMesh' in m&&m.isMesh)matrices.push(m.matrixWorld.toArray());});return{matrices,gait:a.root.userData.gait};})};hash.update(JSON.stringify(snapshot));}
 avatars.forEach(a=>a.dispose());
 // Re-pinned 2026-11-01: held hands bend the elbow down ("W" hands).
 assert.equal(hash.digest('hex'),'67e909595ecb42c025152a53db078a322c0207695b675781b046e98308513b36');
});

test('qualified California body routing keeps fixed limbs, exact cadence and complete articulated joins',()=>{
 mockCanvas();
 const caps={...REGISTERED_MOTION_CAPABILITIES,halfPoussettes:true,poussetteStartSequences:true},review=prepareContraDbReview(readFileSync(new URL('../test-data/contradb/2226.json',import.meta.url),'utf8'),[],caps);assert.deepEqual(review.result.errors,[]);assert.ok(review.result.dance);
 const c=compileChoreography(review.result.dance,6,caps),avatars=c.dancers.map(d=>new Avatar(d));
 for(let i=0;i<=320;i++){
  const beat=60+i/80,frame=pose(avatars,c,beat);
  for(const a of avatars){const p=frame.poses[a.dancer.id],g=a.root.userData.gait;assert.equal(g.phase,beat);assert.equal(g.maxRate,1);assert.equal(g.maxClampDistance,0);assert.equal(g.steps,c.dance.figures[frame.figureIndex].beats);if(beat<64){assert.equal(p.arch?.armRoute,'three-count-poussette');assert.ok(p.arch!.kneeLowering>=0&&p.arch!.kneeLowering<=.231+1e-12);if(p.arch!.underId!==p.id)assert.equal(p.arch!.kneeLowering,0);}for(const arm of a.arms){assert.ok(Math.abs(arm.upper.scale.y*3-.325)<1e-8);assert.ok(Math.abs(arm.lower.scale.y*3-.325)<1e-8);}for(const leg of a.legs){assert.ok(Math.abs(leg.upper.scale.y*3-.43)<1e-8);assert.ok(Math.abs(leg.lower.scale.y*3-.43)<1e-8);}}
  for(const contact of frame.contacts)if(contact.strength>=1-1e-10)for(const[id,hand]of[[contact.a,contact.handA],[contact.b,contact.handB]] as const){const arm=avatars[id].arms.find(a=>a.side===(hand==='left'?1:-1))!;assert.ok(arm.hand.getWorldPosition(new Vector3()).distanceTo(new Vector3(contact.point.x,contact.point.y,contact.point.z))<1e-7);}
 }
 const vertices=(beat:number)=>{pose(avatars,c,beat);return avatars.flatMap(a=>[...a.arms.flatMap(x=>[x.upper,x.lower,x.hand,x.elbow]),...a.legs.flatMap(x=>[x.upper,x.lower,x.foot,x.knee])].flatMap(m=>{const p=m.geometry.attributes.position;return Array.from({length:p.count},(_,i)=>new Vector3().fromBufferAttribute(p,i).applyMatrix4(m.matrixWorld));}));};
 for(const beat of[60,63,63.5,64,124,127,127.5,128]){const before=vertices(beat-1e-7),at=vertices(beat),after=vertices(beat+1e-7);for(let i=0;i<at.length;i++){assert.ok(before[i].distanceTo(at[i])<2e-6,`before ${beat}, vertex ${i}`);assert.ok(after[i].distanceTo(at[i])<2e-6,`after ${beat}, vertex ${i}`);}}
 avatars.forEach(a=>a.dispose());
});
