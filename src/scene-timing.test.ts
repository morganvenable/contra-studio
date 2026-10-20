import test from 'node:test';
import assert from 'node:assert/strict';
import {Vector3} from 'three';
import {Avatar} from './scene.ts';
import {compileChoreography} from './choreography.ts';
import {DANCES} from './catalog.ts';
import type {StudioState} from './types.ts';
// Actual articulated Avatar, with only its canvas-label surface stubbed.
globalThis.document={createElement:()=>({getContext:()=>new Proxy({},{get:()=>()=>{},set:()=>true})})} as unknown as Document;
test('articulated gait retains exactly one alternating phase per musical beat',()=>{
 for(const dance of DANCES){const c=compileChoreography(dance),a=new Avatar(c.dancers[0]),state={dance,showLabels:false} as StudioState;
  for(let i=0;i<512;i++){const beat=i/8,f=c.sample(beat);a.update(f.poses[0],f,state,b=>c.sample(b));assert.equal(a.root.userData.gait.phase,beat);assert.equal(a.root.userData.gait.maxRate,1);assert.equal(a.root.userData.gait.steps,dance.figures[f.figureIndex].beats);}
  a.dispose();
 }
});
test('balance lands in on audio counts 1/2 and out on 3/4, with count1 at figure start',()=>{
 for(const dance of DANCES){const c=compileChoreography(dance),a=new Avatar(c.dancers[0]),state={dance,showLabels:false} as StudioState;
  const foot=(beat:number,index:number)=>{const f=c.sample(Math.max(0,beat));a.update(f.poses[0],f,state,b=>c.sample(b));a.root.updateMatrixWorld(true);return a.legs[index].foot.getWorldPosition(new Vector3());};
  for(let fi=0;fi<dance.figures.length;fi++){if(dance.figures[fi].kind!=='balance')continue;
   for(const repeat of[0,1]){const start=c.starts[fi]+repeat*c.totalBeats,f=c.sample(start),p=f.poses[0],q=f.poses[p.balance!.otherId],toward=new Vector3(q.position.x-p.position.x,0,q.position.z-p.position.z).normalize();
    for(let count=0;count<4;count++){const beat=start+count,index=beat%2===1?1:0,at=foot(beat,index);
     if(count===0){const neutral=new Vector3(a.legs[index].side*.12,.055,.025).applyAxisAngle(new Vector3(0,1,0),p.yaw).add(new Vector3(p.position.x,0,p.position.z));assert.ok(at.clone().sub(neutral).dot(toward)>.02,`${dance.id} count1 forward loaded placement`);if(beat>0)assert.ok(at.clone().sub(foot(beat-.25,index)).dot(toward)>0,`${dance.id} count1 inward final approach`);}
     else {const delta=at.clone().sub(foot(beat-1,index)).dot(toward);assert.ok(count===1?delta>.02:delta<-.02,`${dance.id} count${count+1} direction, delta ${delta}`);}
    }
   }
  }
  a.dispose();
 }
});
