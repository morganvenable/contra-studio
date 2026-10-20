import {Vector3} from 'three';
import {Avatar,applyBodyContactAnchors} from '../../src/scene.ts';
import type {CompiledDance,StudioState} from '../../src/types.ts';
function penetration(A:any,B:any){const inv=B.matrixWorld.clone().invert(),p=A.geometry.attributes.position,scale=B.getWorldScale(new Vector3()),factor=Math.min(scale.x,scale.y,scale.z);let minimum=Infinity;for(let n=0;n<p.count;n++){const v=new Vector3().fromBufferAttribute(p,n).applyMatrix4(A.matrixWorld).applyMatrix4(inv);minimum=Math.min(minimum,(Math.hypot(v.x,v.z,Math.max(0,Math.abs(v.y)-.5))-1)*factor);}return minimum;}
export function probeOvalRelease(c:CompiledDance){const dance=c.dance,start=8,duration=8,partners=new Map<number,number>();for(const h of c.sample(20).contacts){partners.set(h.a,h.b);partners.set(h.b,h.a);}
  const avatars=c.dancers.map(d=>new Avatar(d)),out={minimum:Infinity,beat:0,progress:0,actors:[]as number[]};
  for(let step=0;step<=313;step++){
   const progress=Math.min(1,.6875+step/1000),beat=start+duration*progress,frame=c.sample(beat);for(const a of avatars){a.update(frame.poses[a.dancer.id],frame,{dance,showLabels:false}as StudioState,b=>c.sample(b));a.root.updateMatrixWorld(true);}applyBodyContactAnchors(avatars,frame);for(const a of avatars)a.root.updateMatrixWorld(true);
   for(let a=0;a<avatars.length;a++)for(let b=a+1;b<avatars.length;b++){
    const A=avatars[a],B=avatars[b];if(A.root.position.distanceTo(B.root.position)>2.1)continue;
    for(const x of A.arms)for(const y of B.arms){const handA=x.side===1?'left':'right',handB=y.side===1?'left':'right',held=frame.contacts.some(h=>h.strength>0&&((h.a===a&&h.b===b&&h.handA===handA&&h.handB===handB)||(h.a===b&&h.b===a&&h.handA===handB&&h.handB===handA)));if(held)continue;
     const value=Math.min(penetration(x.upper,y.upper),penetration(y.upper,x.upper));if(value<0&&partners.get(a)!==b)throw new Error(`Unrelated release collision ${a}/${b}`);
     if(value<out.minimum)Object.assign(out,{minimum:value,beat,progress,actors:[a,b]});
    }
   }
  }
avatars.forEach(a=>a.dispose());return out;
}
