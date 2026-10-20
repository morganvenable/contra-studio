/** Explicit integration of an ordinary hey with real incoming/outgoing root states.
 * Source time is shared by entrance, named pass phases and exit. No pose is silently projected.
 */
import {compileHeyTrajectory,type HeyEventPlan,type HeyOptions,type HeyPose,type HeyFrame,type Point,type HeyGate} from './hey.ts';
export interface RootConstraint {id:string;position:Point;yaw:number;velocity?:Point;acceleration?:Point;yawRate?:number}
export interface TransitionBudget {minimumClearance?:number;maximumSpeed?:number;endpointAcceleration?:number;maximumYawRate?:number}
export interface IntegratedHeyOptions extends Omit<HeyOptions,'entry'|'durationBeats'>,TransitionBudget {
  entry:RootConstraint[];exit:RootConstraint[];entryBeats:number;exitBeats:number;
}
export interface RootTransition {beats:number;sample(beat:number):HeyFrame;minimumObservedClearance:number;maximumObservedSpeed:number}
export interface IntegratedHey {beats:number;gates:HeyGate[];sample(beat:number):HeyFrame;entry:HeyPose[];exit:HeyPose[];minimumObservedClearance:number;maximumObservedSpeed:number;interpretation:string;}
const length=(v:Point)=>Math.hypot(v.x,v.z);
const dist=(a:Point,b:Point)=>Math.hypot(a.x-b.x,a.z-b.z);
const finite=(p:Point)=>Number.isFinite(p.x)&&Number.isFinite(p.z);
const facing=(yaw:number)=>({x:Math.sin(yaw),z:Math.cos(yaw)});

/** C2 root connection. A stationary endpoint has explicit facing and approach/departure
 * acceleration, so yaw approaches that constraint continuously instead of snapping at the end.
 */
export function solveRootTransition(from:RootConstraint[],to:RootConstraint[],beats:number,budget:TransitionBudget={}):RootTransition{
  const minimum=budget.minimumClearance??.5,maximum=budget.maximumSpeed??1.8,a=budget.endpointAcceleration??.7;
  if(!Number.isFinite(beats)||beats<=0||beats>64||!Number.isFinite(minimum)||minimum<=0||!Number.isFinite(maximum)||maximum<=0||!Number.isFinite(a)||a<=0)throw new Error('Transition duration (at most 64 beats) and physical budgets must be finite and positive.');
  if(from.length!==4||to.length!==4||new Set(from.map(p=>p.id)).size!==4||new Set(to.map(p=>p.id)).size!==4||from.some(p=>!to.some(q=>q.id===p.id)))throw new Error('Four explicit stable dancer identities are required.');
  const prepared=from.map(start=>{
    const end=to.find(p=>p.id===start.id)!;
    if(!finite(start.position)||!finite(end.position)||!Number.isFinite(start.yaw)||!Number.isFinite(end.yaw))throw new Error('Finite root positions and facing constraints are required.');
    const v0=start.velocity??{x:0,z:0},v1=end.velocity??{x:0,z:0};
    const d0=facing(start.yaw),d1=facing(end.yaw);
    const a0=start.acceleration??{x:a*d0.x,z:a*d0.z},a1=end.acceleration??{x:-a*d1.x,z:-a*d1.z};
    if(![v0,v1,a0,a1].every(finite))throw new Error('Root derivatives must be finite.');
    for(const [p,v]of[[start,v0],[end,v1]] as const)if(length(v)>1e-7&&dist(facing(p.yaw),{x:v.x/length(v),z:v.z/length(v)})>1e-6)throw new Error('Endpoint facing contradicts the requested nonzero travel velocity.');
    const coefficients=(k:'x'|'z')=>{
      const delta=end.position[k]-start.position[k],u=v0[k]*beats,v=v1[k]*beats,p=a0[k]*beats*beats,q=a1[k]*beats*beats;
      return[start.position[k],u,p/2,10*delta-6*u-4*v-1.5*p+.5*q,-15*delta+8*u+7*v+1.5*p-q,6*delta-3*u-3*v-.5*p+.5*q];
    };
    const tangentRate=(v:Point,a:Point)=>length(v)>1e-7?(v.z*a.x-v.x*a.z)/(v.x*v.x+v.z*v.z):0;
    const rate0=start.yawRate??tangentRate(v0,a0),rate1=end.yawRate??tangentRate(v1,a1);
    if(!Number.isFinite(rate0)||!Number.isFinite(rate1))throw new Error('Endpoint angular rates must be finite.');
    let turn=Math.atan2(Math.sin(end.yaw-start.yaw),Math.cos(end.yaw-start.yaw));
    // The exactly-opposite branch is chosen once, from the adjoining loop turn, not
    // from floating-point noise in repeated samples. Body facing may differ from
    // travel during these explicit entrance/exit side or backward steps.
    if(Math.abs(Math.abs(turn)-Math.PI)<1e-7)turn=Math.sign(rate1||rate0||1)*Math.PI;
    const U=rate0*beats,V=rate1*beats,yaw=[start.yaw,U,0,10*turn-6*U-4*V,-15*turn+8*U+7*V,6*turn-3*U-3*V];
    return{start,end,x:coefficients('x'),z:coefficients('z'),yaw};
  });
  function sample(beat:number):HeyFrame{
    if(!Number.isFinite(beat))throw new Error('Sample beat must be finite.');
    const t=Math.max(0,Math.min(beats,beat)),u=t/beats;
    const poses=prepared.map(({start,x,z,yaw})=>{
      const evaluate=(c:number[])=>({p:c.reduce((sum,k,i)=>sum+k*u**i,0),v:c.reduce((sum,k,i)=>sum+(i?i*k*u**(i-1)/beats:0),0),a:c.reduce((sum,k,i)=>sum+(i>1?i*(i-1)*k*u**(i-2)/(beats*beats):0),0)});
      const X=evaluate(x),Z=evaluate(z),velocity={x:X.v,z:Z.v};
      return{id:start.id,position:{x:X.p,z:Z.p},velocity,acceleration:{x:X.a,z:Z.a},yaw:evaluate(yaw).p};
    });
    return{beat:t,poses,contacts:[]};
  }
  let minimumObservedClearance=Infinity,maximumObservedSpeed=0;
  const steps=Math.max(400,Math.ceil(beats*200));
  for(let i=0;i<=steps;i++){
    const ps=sample(beats*i/steps).poses;
    for(const p of ps){const speed=length(p.velocity);maximumObservedSpeed=Math.max(maximumObservedSpeed,speed);if(i>steps*.02&&i<steps*.98&&speed<.002)throw new Error('Transition has an interior stationary reversal; a different path is needed.');}
    for(let p=0;p<4;p++)for(let q=p+1;q<4;q++)minimumObservedClearance=Math.min(minimumObservedClearance,dist(ps[p].position,ps[q].position));
  }
  if(minimumObservedClearance<minimum-1e-7)throw new Error(`Transition clearance ${minimumObservedClearance.toFixed(3)} is below ${minimum}.`);
  if(maximumObservedSpeed>maximum+1e-7)throw new Error(`Transition speed ${maximumObservedSpeed.toFixed(3)} exceeds ${maximum}.`);
  const angularBudget=budget.maximumYawRate??3;
  if(!Number.isFinite(angularBudget)||angularBudget<=0)throw new Error('A finite positive angular-speed budget is required.');
  for(const p of prepared)for(let i=0;i<=steps;i++){const u=i/steps,rate=p.yaw.reduce((s,k,j)=>s+(j?j*k*u**(j-1)/beats:0),0);if(Math.abs(rate)>angularBudget+1e-7)throw new Error('The explicit body-facing transition exceeds its angular-speed budget.');}
  return{beats,sample,minimumObservedClearance,maximumObservedSpeed};
}

export function compileIntegratedHey(plan:HeyEventPlan,options:IntegratedHeyOptions):IntegratedHey{
  if(plan.needsPartialExit)throw new Error('Partial hey exits are not integrated until a source-specific shoulder-to-shoulder continuation constraint is verified.');
  const duration=plan.syntax.beats-options.entryBeats-options.exitBeats;
  const path=compileHeyTrajectory(plan,{slotSpacing:options.slotSpacing,passClearance:options.passClearance,origin:options.origin,axis:options.axis,durationBeats:duration});
  const entering=solveRootTransition(options.entry,path.entry,options.entryBeats,options);
  const leaving=solveRootTransition(path.exit,options.exit,options.exitBeats,options);
  const sample=(beat:number):HeyFrame=>{
    if(!Number.isFinite(beat))throw new Error('Sample time must be finite.');
    const t=Math.max(0,Math.min(plan.syntax.beats,beat));
    const frame=t<options.entryBeats?entering.sample(t):t<options.entryBeats+path.beats?path.sample(t-options.entryBeats):leaving.sample(t-options.entryBeats-path.beats);
    return{...frame,beat:t};
  };
  let minimumObservedClearance=Infinity,maximumObservedSpeed=0;
  const samples=Math.max(400,Math.ceil(plan.syntax.beats*400));
  for(let i=0;i<=samples;i++){
    const poses=sample(plan.syntax.beats*i/samples).poses;
    for(const p of poses)maximumObservedSpeed=Math.max(maximumObservedSpeed,length(p.velocity));
    for(let a=0;a<4;a++)for(let b=a+1;b<4;b++)minimumObservedClearance=Math.min(minimumObservedClearance,dist(poses[a].position,poses[b].position));
  }
  if(minimumObservedClearance<(options.minimumClearance??.5)-1e-7)throw new Error('The complete integrated hey violates the torso-clearance budget.');
  if(maximumObservedSpeed>(options.maximumSpeed??1.8)+1e-7)throw new Error('The complete integrated hey exceeds the speed budget.');
  return{beats:plan.syntax.beats,gates:path.gates.map(g=>({...g,beat:g.beat+options.entryBeats})),sample,entry:sample(0).poses,exit:sample(plan.syntax.beats).poses,
    minimumObservedClearance,maximumObservedSpeed,
    interpretation:`${options.entryBeats} beats of explicit entrance, ${path.beats} beats of named passes and ${options.exitBeats} beats of explicit exit. Body facing is constrained separately during entrance/exit side and backward steps. Gate timing, facing and transition paths are an animation interpretation; source pass order is unchanged.`};
}
