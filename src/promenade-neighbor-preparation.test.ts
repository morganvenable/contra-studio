import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Vector3} from 'three';
import {prepareContraDbReview} from './source-review.ts';
import {compileChoreography} from './choreography.ts';
import {Avatar,applyBodyContactAnchors} from './scene.ts';
import type {StudioState} from './types.ts';
function penetration(A:any,B:any){const inv=B.matrixWorld.clone().invert(),p=A.geometry.attributes.position,scale=B.getWorldScale(new Vector3()),factor=Math.min(scale.x,scale.y,scale.z);let minimum=Infinity;for(let n=0;n<p.count;n++){const v=new Vector3().fromBufferAttribute(p,n).applyMatrix4(A.matrixWorld).applyMatrix4(inv);minimum=Math.min(minimum,(Math.hypot(v.x,v.z,Math.max(0,Math.abs(v.y)-.5))-1)*factor);}return minimum;}
test('the full incoming preparation retains a bounded same-pair release artifact comparable to the reviewed partner example',t=>{
 globalThis.document={createElement:()=>({getContext:()=>new Proxy({},{get:()=>()=>{},set:()=>true})})}as unknown as Document;
 const results:Array<{source:number;minimum:number;beat:number;progress:number;actors:number[]}>=[];
 for(const source of[1616,1448,2194]){
  const capabilities={promenades:true,neighborPromenades:true,archExchanges:true},dance=prepareContraDbReview(readFileSync(new URL(`../test-data/contradb/${source}.json`,import.meta.url),'utf8'),[],capabilities).result.dance!;assert.ok(dance);
  const c=compileChoreography(dance,6,capabilities),index=dance.figures.findIndex(f=>f.kind==='promenade'),swing=index-1,start=c.starts[swing],duration=dance.figures[swing].beats,partners=new Map<number,number>();
  for(const h of c.sample(c.starts[index]+2).contacts){partners.set(h.a,h.b);partners.set(h.b,h.a);}
  const avatars=c.dancers.map(d=>new Avatar(d)),out={source,minimum:Infinity,beat:0,progress:0,actors:[]as number[]};
  for(let step=0;step<=150;step++){
   const progress=.85+step/1000,beat=start+duration*progress,frame=c.sample(beat);for(const a of avatars){a.update(frame.poses[a.dancer.id],frame,{dance,showLabels:false}as StudioState,b=>c.sample(b));a.root.updateMatrixWorld(true);}applyBodyContactAnchors(avatars,frame);for(const a of avatars)a.root.updateMatrixWorld(true);
   for(let a=0;a<avatars.length;a++)for(let b=a+1;b<avatars.length;b++){
    const A=avatars[a],B=avatars[b];if(A.root.position.distanceTo(B.root.position)>2.1)continue;
    for(const x of A.arms)for(const y of B.arms){const handA=x.side===1?'left':'right',handB=y.side===1?'left':'right',held=frame.contacts.some(h=>h.strength>0&&((h.a===a&&h.b===b&&h.handA===handA&&h.handB===handB)||(h.a===b&&h.b===a&&h.handA===handB&&h.handB===handA)));if(held)continue;
     const value=Math.min(penetration(x.upper,y.upper),penetration(y.upper,x.upper));if(value<0)assert.equal(partners.get(a),b,`${source} release artifact must remain inside the named pair, actors ${a}/${b}`);
     if(value<out.minimum)Object.assign(out,{minimum:value,beat,progress,actors:[a,b]});
    }
   }
  }
  assert.ok(out.minimum>(source===2194?-.018:-.017),`${source} exceeds its disclosed associated-pair release budget`);avatars.forEach(a=>a.dispose());results.push(out);
 }
 const reference=results[0];for(const result of results.slice(1)){assert.ok(reference.minimum-result.minimum<(result.source===2194?.0015:.001),'neighbor ingress must remain within its disclosed partner-release delta; 2194 is excluded from the clean whole-source release examples');assert.ok(Math.abs(reference.progress-result.progress)<.005,'the artifact occurs at the same normalized release phase');}
 t.diagnostic(`Actual 2.1-unit broadphase, all six couples, normalized final15% swing samples: ${JSON.stringify(results)}. These unjoined upper-arm contacts are within the named released pair; the complete held promenade has separate strict clearance gates.`);
});
