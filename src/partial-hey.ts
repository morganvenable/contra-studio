/** Identity-explicit ordinary four-person partial heys.
 *
 * The caller owns source interpretation, relationship epochs, and the incoming
 * and outgoing formation. This module never finds a person by proximity or
 * invents a progression. In particular a literal half hey has four alternating
 * pass layers; stopping when meeting a neighbor is a distinct declared plan.
 * Root certificates do not certify articulated feet/arms: the caller must also
 * check the actual Avatar with adjoining figures and its one-step-per-beat gait.
 */
import {compileHeyTrajectory, type HeyEventPlan, type HeyFrame, type HeyGate, type HeyPose, type PassEvent, type Point, type Role} from './hey.ts';

export interface PartialHeyActor {id:string; role:Role}
export interface PartialHeyConstraint {
  position:Point;
  velocity:Point;
  yaw:number;
  /** Omitted derivatives mean zero, never a guessed approach direction. */
  acceleration?:Point;
  yawRate?:number;
}
export interface PartialHeyOptions {
  actors:readonly PartialHeyActor[];
  /** Explicit adjacency, ordered pairs, shoulder, completion, and slot permutations. */
  events:readonly PassEvent[];
  /** All constraints are world-space and keyed by immutable dancer identity. */
  entry:ReadonlyMap<string,PartialHeyConstraint>;
  exit:ReadonlyMap<string,PartialHeyConstraint>;
  frame:{origin:Point;axis:Point};
  beats:number;
  entryBeats:number;
  exitBeats:number;
  /** An integrated boundary replaces the first/last pass endpoints instead of
   * adding staging. Both reserved allocations must then be zero. */
  boundaryMode?:'reserved'|'within-passes';
  /** Explicit gate times for integrated boundaries, strictly inside the budget.
   * Omit for equally spaced pass layers. Subfigure timing is interpretation. */
  gateBeats?:readonly number[];
  /** Relationship tokens require the caller's bound reciprocal relationship. */
  relationships?:Partial<Record<'partner'|'neighbor',ReadonlyMap<string,string>>>;
  slotSpacing?:number;
  passClearance?:number;
  minimumClearance?:number;
  maximumSpeed?:number;
  maximumYawRate?:number;
  source?:string;
}
export interface PartialHeyPose extends HeyPose {yawRate:number}
export interface PartialHeyFrame extends HeyFrame {poses:PartialHeyPose[]}
export interface PartialHeyTrajectory {
  readonly beats:number;
  readonly events:readonly PassEvent[];
  readonly gates:readonly HeyGate[];
  readonly phaseBoundaries:readonly number[];
  readonly entry:readonly PartialHeyPose[];
  readonly exit:readonly PartialHeyPose[];
  readonly endOrder?:readonly string[];
  /** Conservative continuous-curve bounds, obtained by Bezier subdivision. */
  readonly minimumCertifiedClearance:number;
  readonly maximumCertifiedSpeed:number;
  readonly maximumCertifiedYawRate:number;
  readonly interpretation:string;
  sample(beat:number):PartialHeyFrame;
}
interface Polynomial {x:number[];z:number[];yaw?:number[]}
interface Segment {start:number;beats:number;curves:Map<string,Polynomial>;kind:'entry'|'passes'|'exit'}
const EPS=1e-7;
const point=(p:Point)=>({x:p.x,z:p.z});
const finite=(p:Point|undefined):p is Point=>!!p&&Number.isFinite(p.x)&&Number.isFinite(p.z);
const norm=(p:Point)=>Math.hypot(p.x,p.z);
const distance=(a:Point,b:Point)=>Math.hypot(a.x-b.x,a.z-b.z);
const angleDifference=(a:number,b:number)=>Math.atan2(Math.sin(a-b),Math.cos(a-b));
const sameOrder=(a:readonly string[]|undefined,b:readonly string[])=>!!a&&a.length===b.length&&a.every((v,i)=>v===b[i]);
const tangentRate=(v:Point,a:Point)=>norm(v)>1e-9?(v.z*a.x-v.x*a.z)/(v.x*v.x+v.z*v.z):0;
const choose=(n:number,k:number)=>{let r=1;for(let i=1;i<=k;i++)r=r*(n-i+1)/i;return r;};

function polynomial(p0:number,p1:number,v0:number,v1:number,a0:number,a1:number,beats:number):number[]{
  const d=p1-p0,u=v0*beats,v=v1*beats,p=a0*beats*beats,q=a1*beats*beats;
  return[p0,u,p/2,10*d-6*u-4*v-1.5*p+.5*q,-15*d+8*u+7*v+1.5*p-q,6*d-3*u-3*v-.5*p+.5*q];
}
function derivative(c:number[],beats:number):number[]{return c.slice(1).map((x,i)=>x*(i+1)/beats);}
function evaluate(c:number[],u:number):number {let sum=0;for(let i=c.length-1;i>=0;i--)sum=sum*u+c[i];return sum;}
function bernstein(c:number[]):number[]{const n=c.length-1;return c.map((_,k)=>c.slice(0,k+1).reduce((s,v,i)=>s+v*choose(k,i)/choose(n,i),0));}
function split(c:number[]):[number[],number[]]{
  const levels=[c];while(levels.at(-1)!.length>1){const a=levels.at(-1)!;levels.push(a.slice(1).map((v,i)=>(a[i]+v)/2));}
  return[levels.map(a=>a[0]),levels.map(a=>a.at(-1)!).reverse()];
}
const lowerAbs=(c:number[])=>Math.min(...c)>0?Math.min(...c):Math.max(...c)<0?-Math.max(...c):0;
const upperAbs=(c:number[])=>Math.max(...c.map(Math.abs));
const lowerNorm=(x:number[],z:number[])=>Math.hypot(lowerAbs(x),lowerAbs(z));
const upperNorm=(x:number[],z:number[])=>Math.max(...x.map((v,i)=>Math.hypot(v,z[i])));
function freeze<T>(value:T):T {
  if(value&&typeof value==='object'){for(const child of Object.values(value))freeze(child);Object.freeze(value);}
  return value;
}

function rootConstraint(id:string,p:PartialHeyConstraint):PartialHeyPose {
  if(!p||!finite(p.position)||!finite(p.velocity)||!Number.isFinite(p.yaw)||p.acceleration!==undefined&&!finite(p.acceleration)||p.yawRate!==undefined&&!Number.isFinite(p.yawRate))throw new Error(`Finite explicit position, velocity, and facing are required for ${id}.`);
  return{id,position:point(p.position),velocity:point(p.velocity),acceleration:point(p.acceleration??{x:0,z:0}),yaw:p.yaw,yawRate:p.yawRate??0};
}
function fromCore(p:HeyPose):PartialHeyPose{return{...p,position:point(p.position),velocity:point(p.velocity),acceleration:point(p.acceleration),yawRate:tangentRate(p.velocity,p.acceleration)};}
function makeSegment(from:PartialHeyPose[],to:PartialHeyPose[],start:number,beats:number,kind:Segment['kind']):Segment{
  const curves=new Map<string,Polynomial>();
  for(const a of from){
    const b=to.find(p=>p.id===a.id)!;
    const x=polynomial(a.position.x,b.position.x,a.velocity.x,b.velocity.x,a.acceleration.x,b.acceleration.x,beats);
    const z=polynomial(a.position.z,b.position.z,a.velocity.z,b.velocity.z,a.acceleration.z,b.acceleration.z,beats);
    let yaw:number[]|undefined;
    if(kind!=='passes'){
      let turn=angleDifference(b.yaw,a.yaw);
      if(Math.abs(Math.abs(turn)-Math.PI)<EPS)turn=Math.sign(b.yawRate||a.yawRate||1)*Math.PI;
      yaw=polynomial(a.yaw,a.yaw+turn,a.yawRate,b.yawRate,0,0,beats);
    }
    // Endpoint overrides in sample() are only for exact representation. They
    // must never conceal an ill-conditioned curve or a numerical teleport.
    for(const [c,p0,p1,v0,v1,a0,a1]of[[x,a.position.x,b.position.x,a.velocity.x,b.velocity.x,a.acceleration.x,b.acceleration.x],[z,a.position.z,b.position.z,a.velocity.z,b.velocity.z,a.acceleration.z,b.acceleration.z]] as const){
      const v=derivative(c,beats),acc=derivative(v,beats);
      if(!c.every(Number.isFinite)||Math.abs(evaluate(c,0)-p0)>EPS||Math.abs(evaluate(c,1)-p1)>EPS||Math.abs(evaluate(v,0)-v0)>EPS||Math.abs(evaluate(v,1)-v1)>EPS||Math.abs(evaluate(acc,0)-a0)>EPS||Math.abs(evaluate(acc,1)-a1)>EPS)throw new Error('The supplied hey constraints cannot be represented continuously at this numeric scale.');
    }
    if(yaw&&(!yaw.every(Number.isFinite)||Math.abs(angleDifference(evaluate(yaw,1),b.yaw))>EPS||Math.abs(evaluate(derivative(yaw,beats),1)-b.yawRate)>EPS))throw new Error('The supplied facing constraints cannot be represented continuously at this numeric scale.');
    curves.set(a.id,{x,z,yaw});
  }
  return{start,beats,curves,kind};
}
function sampleSegment(segment:Segment,u:number,ids:readonly string[]):PartialHeyPose[]{
  return ids.map(id=>{
    const c=segment.curves.get(id)!,vx=derivative(c.x,segment.beats),vz=derivative(c.z,segment.beats),ax=derivative(vx,segment.beats),az=derivative(vz,segment.beats);
    const velocity={x:evaluate(vx,u),z:evaluate(vz,u)},acceleration={x:evaluate(ax,u),z:evaluate(az,u)};
    return{id,position:{x:evaluate(c.x,u),z:evaluate(c.z,u)},velocity,acceleration,
      yaw:c.yaw?evaluate(c.yaw,u):Math.atan2(velocity.x,velocity.z),
      yawRate:c.yaw?evaluate(derivative(c.yaw,segment.beats),u):tangentRate(velocity,acceleration)};
  });
}

/** Isolate real roots in [0,1] by recursively partitioning at derivative roots.
 * On each resulting interval the polynomial is monotone; no dense-sample aliasing. */
function roots(c:number[]):number[]{
  while(c.length>1&&Math.abs(c.at(-1)!)<1e-11)c=c.slice(0,-1);
  if(c.length===1)return[];
  if(c.length===2){const u=-c[0]/c[1];return u>=-EPS&&u<=1+EPS?[Math.max(0,Math.min(1,u))]:[];}
  const cuts=[0,...roots(derivative(c,1)).filter(u=>u>EPS&&u<1-EPS),1],out:number[]=[];
  for(const u of cuts)if(Math.abs(evaluate(c,u))<1e-9)out.push(u);
  for(let i=0;i<cuts.length-1;i++){
    let lo=cuts[i],hi=cuts[i+1],a=evaluate(c,lo),b=evaluate(c,hi);
    if(a*b>=0||Math.abs(a)<1e-9||Math.abs(b)<1e-9)continue;
    for(let n=0;n<60;n++){const mid=(lo+hi)/2,v=evaluate(c,mid);if(a*v<=0){hi=mid;b=v;}else{lo=mid;a=v;}}
    out.push((lo+hi)/2);
  }
  return out.sort((a,b)=>a-b).filter((u,i,a)=>!i||Math.abs(u-a[i-1])>1e-7);
}

function validateEvents(options:PartialHeyOptions,ids:string[]):PassEvent[]{
  const actors=new Map(options.actors.map(a=>[a.id,a]));
  if(!options.events.length||options.events.length>8)throw new Error('One to eight explicit ordinary hey pass layers are required.');
  const events=options.events.map(e=>structuredClone(e));
  let order=[...events[0].incomingOrder];
  if(order.length!==4||new Set(order).size!==4||order.some(id=>!ids.includes(id)))throw new Error('The incoming pass order must name all four stable actors exactly once.');
  for(const [i,e]of events.entries()){
    if(!sameOrder(e.incomingOrder,order)||!['center','sides'].includes(e.phase)||!['left','right'].includes(e.token.shoulder)||!['complete','shoulder-to-shoulder'].includes(e.token.completion))throw new Error('Pass order, phase, shoulder, and completion must be explicit and consistent.');
    if(i&&events[i-1].phase===e.phase)throw new Error('Ordinary hey pass layers alternate center and sides.');
    const pairs=e.phase==='center'?[[order[1],order[2]]]:[[order[0],order[1]],[order[2],order[3]]];
    if(e.pairs.length!==pairs.length||e.pairs.some((p,k)=>!sameOrder(p,pairs[k])))throw new Error('Declared passing pairs must match the explicit incoming adjacency.');
    if(!sameOrder(e.loopers,e.phase==='center'?[order[0],order[3]]:[]))throw new Error('Outside loopers must be explicit and match the pass layer.');
    const selector=e.token.selector;
    if(selector==='larks'||selector==='robins'){
      if(e.phase!=='center'||e.pairs.some(pair=>pair.some(id=>actors.get(id)!.role!==(selector==='larks'?'lark':'robin'))))throw new Error('Role-named center pass does not match the declared actors.');
    }else if(selector==='partner'||selector==='neighbor'){
      if(e.phase!=='sides'||selector==='neighbor'&&e.token.neighborOrdinal!==1)throw new Error('Relationship epochs and noncurrent neighbors require a separately bound pass adapter.');
      const binding=options.relationships?.[selector];
      if(!binding||e.pairs.some(([a,b])=>binding.get(a)!==b||binding.get(b)!==a))throw new Error(`The ${selector} pass needs the exact reciprocal identity binding.`);
    }else throw new Error('Unknown hey participant selector.');
    if(e.token.completion==='shoulder-to-shoulder'){
      if(i!==events.length-1||e.outgoingOrder!==undefined)throw new Error('Only the final declared pass can end shoulder-to-shoulder, without a completed permutation.');
    }else{
      if(e.phase==='center')[order[1],order[2]]=[order[2],order[1]];
      else{[order[0],order[1]]=[order[1],order[0]];[order[2],order[3]]=[order[3],order[2]];}
      if(!sameOrder(e.outgoingOrder,order))throw new Error('The outgoing order must be the declared pass permutation.');
    }
  }
  return events;
}

/** Prove continuous clearance and speed using convex-hull bounds on each
 * quintic Bezier curve. Tangent-facing angular speed uses interval bounds on
 * velocity and acceleration. Inconclusive certificates fail closed. */
function certify(segments:Segment[],ids:string[],minimum:number,maximum:number,angular:number){
  let minimumCertifiedClearance=Infinity,maximumCertifiedSpeed=0,maximumCertifiedYawRate=0;
  function clearance(x:number[],z:number[],depth=0):void{
    const lower=lowerNorm(x,z);
    if(lower>=minimum-EPS){minimumCertifiedClearance=Math.min(minimumCertifiedClearance,lower);return;}
    const midX=split(x),midZ=split(z);
    if(Math.hypot(midX[0].at(-1)!,midZ[0].at(-1)!)<minimum-EPS)throw new Error('The requested hey entry, passes, or exit violates the torso-clearance budget.');
    if(depth>=18)throw new Error('Continuous hey clearance could not be certified; provide different explicit constraints.');
    clearance(midX[0],midZ[0],depth+1);clearance(midX[1],midZ[1],depth+1);
  }
  function motion(vx:number[],vz:number[],ax:number[],az:number[],yaw:number[]|undefined,depth=0):void{
    const speed=upperNorm(vx,vz),lower=lowerNorm(vx,vz);
    const turn=yaw?upperAbs(yaw):(lower>1e-9?(upperAbs(vz)*upperAbs(ax)+upperAbs(vx)*upperAbs(az))/(lower*lower):Infinity);
    if(speed<=maximum+EPS&&turn<=angular+EPS){maximumCertifiedSpeed=Math.max(maximumCertifiedSpeed,speed);maximumCertifiedYawRate=Math.max(maximumCertifiedYawRate,turn);return;}
    if(depth>=18)throw new Error(`The hey exceeds its speed or angular-speed budget, or tangent motion becomes stationary. Certified subinterval bounds: speed ${speed} (limit ${maximum}), angular speed ${turn} (limit ${angular}), tangent speed lower bound ${lower}.`);
    const x=split(vx),z=split(vz),a=split(ax),b=split(az),y=yaw?split(yaw):undefined;
    motion(x[0],z[0],a[0],b[0],y?.[0],depth+1);motion(x[1],z[1],a[1],b[1],y?.[1],depth+1);
  }
  for(const s of segments){
    for(const id of ids){const c=s.curves.get(id)!,vx=derivative(c.x,s.beats),vz=derivative(c.z,s.beats);motion(bernstein(vx),bernstein(vz),bernstein(derivative(vx,s.beats)),bernstein(derivative(vz,s.beats)),c.yaw?bernstein(derivative(c.yaw,s.beats)):undefined);}
    for(let a=0;a<ids.length;a++)for(let b=a+1;b<ids.length;b++){
      const A=s.curves.get(ids[a])!,B=s.curves.get(ids[b])!;
      clearance(bernstein(A.x.map((v,i)=>v-B.x[i])),bernstein(A.z.map((v,i)=>v-B.z[i])));
    }
  }
  return{minimumCertifiedClearance,maximumCertifiedSpeed,maximumCertifiedYawRate};
}

export function compilePartialHey(options:PartialHeyOptions):PartialHeyTrajectory {
  const ids=options.actors.map(a=>a.id),minimum=options.minimumClearance??.5,maximum=options.maximumSpeed??2,angular=options.maximumYawRate??4;
  if(ids.length!==4||new Set(ids).size!==4||ids.some(id=>typeof id!=='string'||!id.trim())||options.actors.some(a=>!['lark','robin'].includes(a.role)))throw new Error('Four explicit stable actor IDs and roles are required.');
  const {beats,entryBeats,exitBeats}=options;
  if(![beats,entryBeats,exitBeats,minimum,maximum,angular].every(Number.isFinite)||beats<=0||beats>64||entryBeats<0||exitBeats<0||entryBeats+exitBeats>=beats||minimum<=0||maximum<=0||angular<=0)throw new Error('Finite positive physical budgets and entrance/exit allocations within the source beat budget are required.');
  if(!options.frame||!finite(options.frame.origin)||!finite(options.frame.axis)||Math.abs(norm(options.frame.axis)-1)>EPS)throw new Error('A finite origin and orientation-preserving unit frame axis are required.');
  const integrated=options.boundaryMode==='within-passes';
  if(options.boundaryMode!==undefined&&!['reserved','within-passes'].includes(options.boundaryMode)||integrated&&(entryBeats!==0||exitBeats!==0)||!integrated&&options.gateBeats!==undefined)throw new Error('Integrated pass boundaries require zero reserved entrance/exit beats; custom gates apply only to that mode.');
  for(const [name,map]of[['entry',options.entry],['exit',options.exit]] as const)if(!map||map.size!==4||ids.some(id=>!map.has(id)))throw new Error(`The ${name} map must preserve all four stable dancer identities.`);
  const entry=ids.map(id=>rootConstraint(id,options.entry.get(id)!)),exit=ids.map(id=>rootConstraint(id,options.exit.get(id)!));
  for(const endpoint of[entry,exit])for(let a=0;a<4;a++)for(let b=a+1;b<4;b++)if(distance(endpoint[a].position,endpoint[b].position)<minimum-EPS)throw new Error('An explicit hey endpoint violates the torso-clearance budget.');
  const events=validateEvents(options,ids),last=events.at(-1)!,needsPartialExit=last.token.completion==='shoulder-to-shoulder';
  const axis=point(options.frame.axis),origin=point(options.frame.origin);
  const plan:HeyEventPlan={syntax:{source:options.source??'Explicit ordinary partial-hey pass plan',beats,fraction:.5,axis:'across',tokens:events.map(e=>e.token)},events,endOrder:last.outgoingOrder,needsPartialExit};
  const spacing=options.slotSpacing??1.1,clearance=options.passClearance??.66;
  if(!Number.isFinite(spacing)||spacing<=0||!Number.isFinite(clearance)||clearance<=0)throw new Error('Finite positive slot spacing and pass clearance are required.');
  // The older circular-loop generator assumes a wide longitudinal track.
  // Compress that axis into elliptical loops when a compact physical track is
  // requested. The independently certified polynomial paths, not its heuristic
  // spacing restriction, decide whether the resulting geometry is admissible.
  const generatorSpacing=Math.max(spacing,clearance*Math.PI/2+1e-5),scale=spacing/generatorSpacing;
  const generated=compileHeyTrajectory(plan,{durationBeats:beats-entryBeats-exitBeats,slotSpacing:generatorSpacing,passClearance:clearance,origin,axis});
  const compress=(p:Point,translate=false):Point=>{const projection=(p.x-(translate?origin.x:0))*axis.x+(p.z-(translate?origin.z:0))*axis.z;return{x:p.x+(scale-1)*projection*axis.x,z:p.z+(scale-1)*projection*axis.z};};
  const compressPose=(p:HeyPose):HeyPose=>{const velocity=compress(p.velocity);return{...p,position:compress(p.position,true),velocity,acceleration:compress(p.acceleration),yaw:Math.atan2(velocity.x,velocity.z)};};
  const core={...generated,entry:generated.entry.map(compressPose),exit:generated.exit.map(compressPose),sample:(beat:number)=>{const frame=generated.sample(beat);return{...frame,poses:frame.poses.map(compressPose)};}};
  const coreEntry=core.entry.map(fromCore),coreExit=core.exit.map(fromCore),segments:Segment[]=[];
  function endpointMatches(a:PartialHeyPose[],b:PartialHeyPose[]):boolean{return a.every(p=>{const q=b.find(p2=>p2.id===p.id)!;return distance(p.position,q.position)<EPS&&distance(p.velocity,q.velocity)<EPS&&distance(p.acceleration,q.acceleration)<EPS&&Math.abs(angleDifference(p.yaw,q.yaw))<EPS&&Math.abs(p.yawRate-q.yawRate)<EPS;});}
  const weights=events.map(e=>e.token.completion==='complete'?1:.5),nominal=core.beats/weights.reduce((a,b)=>a+b,0);
  const gateTimes=options.gateBeats?[...options.gateBeats]:core.gates.map(g=>g.beat+entryBeats);
  if(gateTimes.length!==events.length||gateTimes.some((t,i)=>!Number.isFinite(t)||t<=0||t>beats||t===beats&&!(i===events.length-1&&needsPartialExit&&!integrated&&exitBeats===0)||i>0&&t<=gateTimes[i-1]))throw new Error('Every declared pass requires one strictly ordered finite gate inside the source beat budget.');
  const gates=core.gates.map((g,i)=>({...g,beat:gateTimes[i],pairs:g.pairs.map(p=>[...p] as [string,string])}));
  if(integrated){
    if(needsPartialExit)throw new Error('Integrated boundaries currently require completed pass layers; partial gates need an explicit reserved exit.');
    const times=[0];for(let i=0;i<events.length;i++){times.push(gateTimes[i]);times.push(i===events.length-1?beats:(gateTimes[i]+gateTimes[i+1])/2);}
    const knots=times.map((_,i)=>core.sample(i*nominal/2).poses.map(p=>{
      const factor=i===0||i===times.length-1?1:nominal/(times[i+1]-times[i-1]);
      const velocity={x:p.velocity.x*factor,z:p.velocity.z*factor},acceleration={x:p.acceleration.x*factor*factor,z:p.acceleration.z*factor*factor};
      return{...p,velocity,acceleration,yawRate:tangentRate(velocity,acceleration)};
    }));
    knots[0]=entry;knots[knots.length-1]=exit;
    for(let i=0;i<times.length-1;i++)segments.push(makeSegment(knots[i],knots[i+1],times[i],times[i+1]-times[i],i===0?'entry':i===times.length-2?'exit':'passes'));
  }else{
    if(entryBeats)segments.push(makeSegment(entry,coreEntry,0,entryBeats,'entry'));
    else if(!endpointMatches(entry,coreEntry))throw new Error('Zero entrance beats require exact incoming core constraints; no snap was inserted.');
    let clock=0;
    for(const weight of weights){
      for(let u=0;u<weight;u+=.5){const t0=clock+u*nominal,t1=clock+Math.min(weight,u+.5)*nominal;segments.push(makeSegment(core.sample(t0).poses.map(fromCore),core.sample(t1).poses.map(fromCore),entryBeats+t0,t1-t0,'passes'));}
      clock+=weight*nominal;
    }
    if(exitBeats)segments.push(makeSegment(coreExit,exit,entryBeats+core.beats,exitBeats,'exit'));
    else if(!endpointMatches(coreExit,exit))throw new Error('Zero exit beats require exact outgoing core constraints; no snap was inserted.');
  }
  // No connector may smuggle an extra across-line exchange into the source plan.
  for(const s of segments)for(let a=0;a<ids.length;a++)for(let b=a+1;b<ids.length;b++){
    const A=s.curves.get(ids[a])!,B=s.curves.get(ids[b])!;
    const projection=A.x.map((v,i)=>(v-B.x[i])*axis.x+(A.z[i]-B.z[i])*axis.z);
    for(const root of roots(projection)){
      const t=s.start+root*s.beats;
      if(t<EPS||t>beats-EPS)continue;
      const gate=gates.find(g=>Math.abs(g.beat-t)<1e-6&&g.pairs.some(p=>p.includes(ids[a])&&p.includes(ids[b])));
      if(!gate)throw new Error('An explicit hey connector would add an undeclared across-line pass.');
    }
  }
  const certificate=certify(segments,ids,minimum,maximum,angular);
  const sample=(beat:number):PartialHeyFrame=>{
    if(!Number.isFinite(beat))throw new Error('Sample beat must be finite.');
    const t=Math.max(0,Math.min(beats,beat));
    if(t===0)return{beat:t,poses:entry.map(p=>structuredClone(p)),contacts:[]};
    if(t===beats)return{beat:t,poses:exit.map(p=>structuredClone(p)),contacts:[]};
    const s=segments.find(s=>t<s.start+s.beats-1e-10)??segments.at(-1)!;
    return{beat:t,poses:sampleSegment(s,Math.max(0,Math.min(1,(t-s.start)/s.beats)),ids),contacts:[]};
  };
  // Independently inspect the actual polynomial gate, rather than trusting labels.
  for(const gate of gates)for(const [a,b]of gate.pairs){
    const ps=sample(gate.beat).poses,A=ps.find(p=>p.id===a)!,B=ps.find(p=>p.id===b)!;
    if(Math.abs((A.position.x-B.position.x)*axis.x+(A.position.z-B.position.z)*axis.z)>EPS)throw new Error('The actual path misses its named across-line passing gate.');
    for(const [self,other]of[[A,B],[B,A]]){
      const offset={x:other.position.x-self.position.x,z:other.position.z-self.position.z},v=self.velocity;
      const shoulder=(-v.z*offset.x+v.x*offset.z)/norm(v),sign=gate.shoulder==='right'?1:-1;
      if(!Number.isFinite(shoulder)||shoulder*sign<minimum-EPS)throw new Error('The actual pass gate does not honor its declared passing shoulder.');
    }
  }
  return Object.freeze({beats,events:freeze(events),gates:freeze(gates),phaseBoundaries:Object.freeze([...new Set([0,...segments.map(s=>s.start+s.beats)])]),entry:freeze(entry),exit:freeze(exit),endOrder:last.outgoingOrder?Object.freeze([...last.outgoingOrder]):undefined,...certificate,
    interpretation:`${integrated?'Entrance and exit are integrated into the first and last pass layers':`${entryBeats} entrance beats, ${core.beats} named-pass beats, ${exitBeats} exit beats`} within the ${beats}-beat source. Quintic root paths preserve every declared gate and endpoint; body facing is separately constrained during entrance/exit. Timing, curved paths, and facing between source events are animation interpretations. No relationship or progression is inferred.`,sample});
}
