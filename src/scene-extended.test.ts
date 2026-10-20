import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Vector3} from 'three';
import {Avatar,applyBodyContactAnchors} from './scene.ts';
import {importContraDb} from './contradb-import.ts';
import {compileChoreography} from './choreography.ts';
import type {StudioState} from './types.ts';
globalThis.document={createElement:()=>({getContext:()=>new Proxy({},{get:()=>()=>{},set:()=>true})})} as unknown as Document;
test('composed right-hand arch and half hey retain reachable fixed limbs and a shared raised hand',()=>{
 const capabilities={archExchanges:true,partialHeys:true},r=importContraDb(readFileSync(new URL('../test-data/contradb/1502.json',import.meta.url),'utf8'),{capabilities,interpretation:{rows:{'contradb:1502:row:0':{balanceBeats:4},'contradb:1502:row:2':{balanceBeats:4},'contradb:1502:row:5':{chainReceiver:'neighbor'}}}});
 assert.ok(r.dance);const dance=r.dance,c=compileChoreography(dance,2,capabilities),avatars=c.dancers.map(d=>new Avatar(d)),state={dance,showLabels:false} as StudioState;
 const samples=[...Array.from({length:401},(_,i)=>i/20),...Array.from({length:21},(_,i)=>40+i/20)];
 for(const beat of samples){
  const f=c.sample(beat),cache=new Map<number,ReturnType<typeof c.sample>>(),sample=(b:number)=>{if(!cache.has(b))cache.set(b,c.sample(b));return cache.get(b)!;};
  for(const a of avatars){a.update(f.poses[a.dancer.id],f,state,sample);assert.equal(a.root.userData.gait.phase,beat);assert.equal(a.root.userData.gait.reachClamps,0,`reach ${beat}/${a.dancer.id}`);}
  // Deliberately do not update matrixWorld before contact correction. The live
  // scene resolves it before the renderer's matrix update too.
  const corrected=applyBodyContactAnchors(avatars,f);for(const a of avatars)a.root.updateMatrixWorld(true);
  for(const h of corrected.contacts){if(h.kind!=='arch'||h.strength<1-1e-10)continue;
   for(const id of[h.a,h.b]){const a=avatars[id],hand=a.arms.find(x=>x.side===-1)!.hand.getWorldPosition(new Vector3());assert.ok(hand.distanceTo(new Vector3(h.point.x,h.point.y,h.point.z))<1e-8,`shared arch hand ${beat}/${id}`);}
  }
 }
 for(const a of avatars)a.dispose();
});
