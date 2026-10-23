/** Facing-only Hermite exit after the final actual passing gate.
 * Root trajectories, pass times and held contacts remain owned by the caller. */
import type {PartialHeyTrajectory} from './partial-hey.ts';
export function compileHeyExitFacing(path:PartialHeyTrajectory,maximumYawRate=3.2){
 const start=path.gates.at(-1)!.beat,end=path.beats,duration=end-start;
 if(!(duration>0)||maximumYawRate!==3.2)throw Error('Facing preparation requires a final completed gate and the reviewed turning bound.');
 let maximumExitYawRate=0;
 const curves=new Map<string,{a:number;b:number;c:number;d:number}>();
 for(const p of path.sample(start).poses){let previous=p.yaw,delta=0;for(let i=1;i<=96;i++){const yaw=path.sample(start+duration*i/96).poses.find(q=>q.id===p.id)!.yaw;delta+=Math.atan2(Math.sin(yaw-previous),Math.cos(yaw-previous));previous=yaw;}
 const d=p.yaw,c=p.yawRate*duration,b=3*delta-2*c,a=c-2*delta;
 const rate=(u:number)=>(3*a*u*u+2*b*u+c)/duration,candidates=[0,1];if(Math.abs(a)>1e-12){const u=-b/(3*a);if(u>0&&u<1)candidates.push(u);}
 const max=Math.max(...candidates.map(u=>Math.abs(rate(u))));if(max>maximumYawRate+1e-8)throw Error(`Hey exit facing exceeds reviewed rate: ${max}.`);
 maximumExitYawRate=Math.max(maximumExitYawRate,max);
 curves.set(p.id,{a,b,c,d});
 }
 return Object.freeze({start,beats:end,maximumExitYawRate,facing:(id:string,beat:number)=>{if(!Number.isFinite(beat)||beat<0||beat>end)throw Error('Facing sample must stay within source counts.');if(beat<=start)return path.sample(beat).poses.find(p=>p.id===id)!.yaw;const c=curves.get(id);if(!c)throw Error('Unknown hey actor.');const u=(beat-start)/duration;return((c.a*u+c.b)*u+c.c)*u+c.d;}});
}
