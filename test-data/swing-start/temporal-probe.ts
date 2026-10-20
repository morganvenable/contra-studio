import {openingSwingFixture,swingStartCapabilities} from './fixture.ts';
import {compileChoreography} from '../../src/choreography.ts';
import {Avatar,applyBodyContactAnchors} from '../../src/scene.ts';
import {Vector3} from 'three';
import type {StudioState} from '../../src/types.ts';
globalThis.document={createElement:()=>({getContext:()=>new Proxy({},{get:()=>()=>{},set:()=>true})})}as unknown as Document;
export function probeSwingStartTemporal(){const results=[];
for(const count of[3,6]){
 const dance=openingSwingFixture(),compiled=compileChoreography(dance,count,swingStartCapabilities),avatars=compiled.dancers.map(d=>new Avatar(d)),state={dance,showLabels:false}as StudioState;
 const sample=(beat:number)=>{const f=compiled.sample(beat);for(const a of avatars)a.update(f.poses[a.dancer.id],f,state,compiled.sample);applyBodyContactAnchors(avatars,f);return avatars.flatMap(a=>{a.root.updateMatrixWorld(true);return a.arms.flatMap(ar=>[ar.elbow,ar.hand]).map(p=>p.getWorldPosition(new Vector3()));});};
 for(const rate of[400,800,1600]){let previous=sample(63),maximum=0,at=63,part=0;for(let i=1;i<=rate;i++){const beat=63+i/rate,current=sample(beat);for(let j=0;j<current.length;j++){const speed=current[j].distanceTo(previous[j])*rate;if(speed>maximum){maximum=speed;at=beat;part=j;}}previous=current;}results.push({count,rate,maximum,at,actor:Math.floor(part/4),armPart:part%4});}
 avatars.forEach(a=>a.dispose());
}
return results;}
