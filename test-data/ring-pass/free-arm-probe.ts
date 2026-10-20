/** Offline, bidirectional sampled mesh diagnostic. No GPU or continuous proof. */
import {Vector3} from 'three';
import type {Mesh} from 'three';
import {Avatar,applyBodyContactAnchors} from '../../src/scene.ts';
import type {CompiledDance,Hand,StudioState} from '../../src/types.ts';

function penetration(a:Mesh,b:Mesh){
 const inverse=b.matrixWorld.clone().invert(),vertices=a.geometry.attributes.position,scale=b.getWorldScale(new Vector3()),minimumScale=Math.min(scale.x,scale.y,scale.z);let minimum=Infinity;
 for(let i=0;i<vertices.count;i++){
  const p=new Vector3().fromBufferAttribute(vertices,i).applyMatrix4(a.matrixWorld).applyMatrix4(inverse);
  const radius=b.geometry.type==='CapsuleGeometry'?Math.hypot(p.x,p.z,Math.max(0,Math.abs(p.y)-.5)):p.length();
  minimum=Math.min(minimum,(radius-1)*minimumScale);
 }
 return minimum;
}
const armParts=(a:Avatar)=>a.arms.flatMap(arm=>([['upper',arm.upper],['forearm',arm.lower],['hand',arm.hand]] as const).map(([part,mesh])=>({part,mesh,hand:(arm.side===1?'left':'right') as Hand})));

/** Keep free-arm clearance separate: an inherited torso residual must not mask it. */
export function probeUnassociatedArms(c:CompiledDance,beats:readonly number[]){
 const avatars=c.dancers.map(d=>new Avatar(d));let minimum=Infinity,worst='';
 try{
  for(const beat of beats){
   const frame=c.sample(beat);
   for(const avatar of avatars)avatar.update(frame.poses[avatar.dancer.id],frame,{dance:c.dance,showLabels:false} as StudioState,c.sample);
   const posed=applyBodyContactAnchors(avatars,frame);for(const avatar of avatars)avatar.root.updateMatrixWorld(true);
   for(let ai=0;ai<avatars.length;ai++)for(let bi=ai+1;bi<avatars.length;bi++){
    const a=avatars[ai],b=avatars[bi];if(a.root.position.distanceTo(b.root.position)>2.1)continue;
    for(const ap of armParts(a))for(const bp of armParts(b)){
     const joined=posed.contacts.some(h=>h.strength>0&&((h.a===a.dancer.id&&h.b===b.dancer.id&&h.handA===ap.hand&&h.handB===bp.hand)||(h.a===b.dancer.id&&h.b===a.dancer.id&&h.handA===bp.hand&&h.handB===ap.hand)));
     if(joined)continue;
     const clearance=Math.min(penetration(ap.mesh,bp.mesh),penetration(bp.mesh,ap.mesh));
     if(clearance<minimum){minimum=clearance;worst=`${beat}/${a.dancer.id}/${ap.hand}-${ap.part}/${b.dancer.id}/${bp.hand}-${bp.part}`;}
    }
   }
  }
 }finally{for(const avatar of avatars)avatar.dispose();}
 return{minimum,worst};
}

/** Actual wrist/elbow endpoints, including contact anchoring, at section joins. */
export function probeArmJoins(c:CompiledDance,beats:readonly number[]){
 const avatars=c.dancers.map(d=>new Avatar(d));let maximum=0,worst='';
 try{
  for(const beat of beats){
   const positions=[beat-1e-7,beat].map(t=>{
    const frame=c.sample(t);
    for(const avatar of avatars)avatar.update(frame.poses[avatar.dancer.id],frame,{dance:c.dance,showLabels:false} as StudioState,c.sample);
    applyBodyContactAnchors(avatars,frame);for(const avatar of avatars)avatar.root.updateMatrixWorld(true);
    return avatars.flatMap(a=>a.arms.flatMap(arm=>([['elbow',arm.elbow],['wrist',arm.hand]] as const).map(([part,mesh])=>({id:a.dancer.id,part:`${arm.side}/${part}`,position:mesh.getWorldPosition(new Vector3())}))));
   });
   for(let i=0;i<positions[0].length;i++){
    const a=positions[0][i],b=positions[1][i],jump=a.position.distanceTo(b.position);
    if(jump>maximum){maximum=jump;worst=`${beat}/${a.id}/${a.part}`;}
   }
  }
 }finally{for(const avatar of avatars)avatar.dispose();}
 return{maximum,worst};
}
