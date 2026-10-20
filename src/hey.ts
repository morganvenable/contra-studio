/** Experimental ordinary four-person hey compiler. Not registered in the production importer.
 * Source pass order is authoritative. Entry/exit integration with a complete dance is separate.
 */
export type Role = 'lark' | 'robin';
export interface Actor { id: string; role: Role; couple: string }
export interface PassToken {
  raw: string;
  selector: 'larks' | 'robins' | 'partner' | 'neighbor';
  neighborOrdinal?: number;
  shoulder: 'right' | 'left';
  completion: 'complete' | 'shoulder-to-shoulder';
}
export interface HeySyntax {
  source: string;
  beats: number;
  fraction: .25 | .5 | .75 | 1;
  axis: 'across';
  tokens: PassToken[];
}
export interface PassEvent {
  token: PassToken;
  phase: 'center' | 'sides';
  pairs: [string, string][];
  loopers: string[];
  incomingOrder: string[];
  outgoingOrder?: string[];
}
export interface HeyEventPlan { syntax: HeySyntax; events: PassEvent[]; endOrder?: string[]; needsPartialExit: boolean }

export function parseHeyNotation(source: string): HeySyntax {
  const match=source.trim().match(/^\((\d+)\) Hey(?: (1\/4|1\/2|3\/4))? \(([^()]*)\)$/);
  if(!match)throw new Error('Unsupported hey syntax: retain the full clause for review.');
  const fraction=match[2]==='1/4'?.25:match[2]==='1/2'?.5:match[2]==='3/4'?.75:1;
  if(Number(match[1])<=0||Number(match[1])>64)throw new Error('Hey timing must be positive and no more than 64 beats.');
  const raw=match[3].split(';');
  const allowedCounts=fraction===.25?[2]:fraction===.5?[3,4]:fraction===.75?[5,6]:[7,8];
  if(!allowedCounts.includes(raw.length))throw new Error('Pass count is inconsistent with this restricted hey grammar.');
  const tokens:PassToken[]=raw.map((token,index)=>{
    const m=token.match(/^(M|W|P|N(?:-?\d+)?)(R|L)(~?)$/);
    if(!m)throw new Error(`Unconsumed pass token: ${token}`);
    if(m[3]&&index!==raw.length-1)throw new Error('Only a final partial pass is supported by this contract.');
    return {raw:token,selector:m[1]==='M'?'larks':m[1]==='W'?'robins':m[1]==='P'?'partner':'neighbor',
      ...(m[1].startsWith('N')?{neighborOrdinal:m[1]==='N'?1:Number(m[1].slice(1))}:{}),
      shoulder:m[2]==='R'?'right':'left',completion:m[3]?'shoulder-to-shoulder':'complete'};
  });
  return {source,beats:Number(match[1]),fraction,axis:'across',tokens};
}

/**
 * Restricted ordinary-four-person pass graph: same-role center passages alternate
 * with two simultaneous relationship passes on the sides. This is not a universal hey model.
 * A partial final pass deliberately has no outgoing slot permutation.
 */
export function compileBasicPassEvents(syntax: HeySyntax, actors: Actor[], entryOrder: string[]): HeyEventPlan {
  if(actors.length!==4||entryOrder.length!==4||new Set(entryOrder).size!==4||entryOrder.some(id=>!actors.some(a=>a.id===id)))throw new Error('Exactly four unique known dancer IDs are required.');
  const byId=new Map(actors.map(a=>[a.id,a]));
  if(byId.size!==4||new Set(actors.map(a=>a.couple)).size!==2||actors.some(a=>!['lark','robin'].includes(a.role))||actors.some(a=>actors.filter(b=>b.couple===a.couple).length!==2||actors.filter(b=>b.couple===a.couple&&b.role===a.role).length!==1))throw new Error('This adapter requires two distinct couples, each with one lark and one robin.');
  let order=[...entryOrder];
  const events:PassEvent[]=[];
  for(const token of syntax.tokens){
    if(token.selector==='neighbor'&&token.neighborOrdinal!==1)throw new Error('Future or previous neighbors need a relationship-epoch resolver.');
    const phase=(token.selector==='larks'||token.selector==='robins')?'center':'sides';
    if(events.at(-1)?.phase===phase)throw new Error('This adapter requires alternating center and side pass phases.');
    const pairs: [string,string][]=phase==='center'?[[order[1],order[2]]]:[[order[0],order[1]],[order[2],order[3]]];
    for(const [a,b] of pairs){
      const A=byId.get(a)!,B=byId.get(b)!;
      const matches=token.selector==='larks'?(A.role==='lark'&&B.role==='lark'):token.selector==='robins'?(A.role==='robin'&&B.role==='robin'):token.selector==='partner'?A.couple===B.couple:A.couple!==B.couple&&A.role!==B.role;
      if(!matches)throw new Error(`${token.raw} does not match the incoming adjacency and dancer identities.`);
    }
    const incomingOrder=[...order];
    if(token.completion==='shoulder-to-shoulder'){
      events.push({token,phase,pairs,loopers:phase==='center'?[order[0],order[3]]:[],incomingOrder});
      return {syntax,events,needsPartialExit:true};
    }
    if(phase==='center')[order[1],order[2]]=[order[2],order[1]];
    else {[order[0],order[1]]=[order[1],order[0]];[order[2],order[3]]=[order[3],order[2]];}
    events.push({token,phase,pairs,loopers:phase==='center'?[incomingOrder[0],incomingOrder[3]]:[],incomingOrder,outgoingOrder:[...order]});
  }
  return {syntax,events,endOrder:order,needsPartialExit:false};
}

export interface Point { x:number; z:number }
export interface HeyPose { id:string; position:Point; velocity:Point; acceleration:Point; yaw:number }
export interface HeyGate { eventIndex:number; beat:number; pairs:[string,string][]; shoulder:'left'|'right'; completion:'complete'|'shoulder-to-shoulder' }
export interface HeyFrame { beat:number; poses:HeyPose[]; contacts:never[] }
export interface HeyOptions {
  /** Reserve source beats for an explicitly solved entrance/exit. Never stretch the source total. */
  durationBeats?:number;
  /** Logical slot spacing, in uncalibrated scene units. */
  slotSpacing?:number;
  /** Torso-center separation at a scheduled shoulder gate, not literal shoulder width. */
  passClearance?:number;
  origin?:Point;
  /** Unit vector along the line from logical west to logical east. Reflection is not allowed. */
  axis?:Point;
  /** Optional exact incoming root state. A missing entry means standalone staging, not integration. */
  entry?:Array<{id:string;position:Point;velocity:Point;yaw:number}>;
}
export interface HeyTrajectory {
  plan:HeyEventPlan;
  beats:number;
  gates:HeyGate[];
  entry:HeyPose[];
  exit:HeyPose[];
  endOrder?:string[];
  requiresEntryAdapter:boolean;
  requiresPartialExit:boolean;
  timingInterpretation:string;
  sample:(beat:number)=>HeyFrame;
}
const distance=(a:Point,b:Point)=>Math.hypot(a.x-b.x,a.z-b.z);
const finitePoint=(p:Point)=>Number.isFinite(p.x)&&Number.isFinite(p.z);
const EPS=1e-7;
function quintic(p0:number,p1:number,v0:number,v1:number,a0:number,a1:number,duration:number,time:number){
  const u=Math.max(0,Math.min(1,time/duration)),delta=p1-p0,V0=v0*duration,V1=v1*duration,A0=a0*duration*duration,A1=a1*duration*duration;
  const c=[p0,V0,A0/2,10*delta-6*V0-4*V1-1.5*A0+.5*A1,-15*delta+8*V0+7*V1+1.5*A0-A1,6*delta-3*V0-3*V1-.5*A0+.5*A1];
  return {p:c.reduce((s,k,i)=>s+k*u**i,0),v:c.reduce((s,k,i)=>s+(i?i*k*u**(i-1)/duration:0),0),a:c.reduce((s,k,i)=>s+(i>1?i*(i-1)*k*u**(i-2)/(duration*duration):0),0)};
}

/**
 * Alternating center / two-side passage phases follow a single serpentine track.
 * The active pair exchanges adjacent logical slots, separated at the named shoulder.
 * End actors make an outside loop during each center phase. Analytic derivatives
 * agree through the pass/loop junctions (C2), so no stationary wait or yaw snap is used.
 * This restricted adapter rejects ricochets, changing shoulders and relation epochs.
 */
export function compileHeyTrajectory(plan:HeyEventPlan,options:HeyOptions={}):HeyTrajectory {
  if(!plan.events.length||plan.events.length>8||!Number.isFinite(plan.syntax.beats)||plan.syntax.beats<=0||plan.syntax.beats>64)throw new Error('A timed nonempty pass plan of at most eight events and 64 beats is required.');
  const spacing=options.slotSpacing??1.1, clearance=options.passClearance??.66, h=clearance/2;
  if(!Number.isFinite(spacing)||spacing<=0||!Number.isFinite(clearance)||clearance<=0||h>=spacing/Math.PI)throw new Error('Pass clearance must be positive and smaller than 2*slotSpacing/pi for this track geometry.');
  const origin=options.origin??{x:0,z:0},axis=options.axis??{x:1,z:0};
  if(!finitePoint(origin)||!finitePoint(axis)||Math.abs(Math.hypot(axis.x,axis.z)-1)>EPS)throw new Error('A finite origin and unit across-line axis are required.');
  const normal={x:-axis.z,z:axis.x};
  const centerToken=plan.events.find(e=>e.phase==='center')?.token;
  if(!centerToken)throw new Error('This ordinary hey adapter needs a center passage.');
  const sign=centerToken.shoulder==='right'?1:-1;
  for(const event of plan.events){
    if((event.phase==='center'?event.token.shoulder===centerToken.shoulder:event.token.shoulder!==centerToken.shoulder)===false)throw new Error('This ordinary hey track requires one center shoulder and the opposite side shoulder.');
    if(event.token.completion!=='complete'&&event!==plan.events.at(-1))throw new Error('Only a final shoulder-to-shoulder gate may be partial.');
  }
  const weights=plan.events.map(e=>e.token.completion==='complete'?1:.5);
  const duration=options.durationBeats??plan.syntax.beats;
  if(!Number.isFinite(duration)||duration<=0||duration>plan.syntax.beats)throw new Error('Pass duration must fit within the source figure beat budget.');
  const nominal=duration/weights.reduce((a,b)=>a+b,0);
  const starts:number[]=[];let clock=0;
  for(const w of weights){starts.push(clock);clock+=nominal*w;}
  const transform=(p:Point,translate=false):Point=>({x:(translate?origin.x:0)+axis.x*p.x+normal.x*p.z,z:(translate?origin.z:0)+axis.z*p.x+normal.z*p.z});
  function sample(beat:number):HeyFrame {
    if(!Number.isFinite(beat))throw new Error('Sample time must be finite.');
    const t=Math.max(0,Math.min(duration,beat));
    let index=starts.findIndex((start,i)=>t>=start&&t<start+weights[i]*nominal);
    if(index<0)index=plan.events.length-1;
    const event=plan.events[index],u=Math.max(0,Math.min(weights[index],(t-starts[index])/nominal));
    const poses=event.incomingOrder.map((id,slot)=>{
      const x0=[-1.5,-.5,.5,1.5][slot]*spacing;
      let p:Point,v:Point,a:Point;
      if(event.phase==='center'&&(slot===0||slot===3)){
        const side=slot===0?-1:1;
        p={x:x0+side*h*Math.sin(Math.PI*u),z:side*h*sign*Math.cos(Math.PI*u)};
        v={x:side*h*Math.PI*Math.cos(Math.PI*u)/nominal,z:-side*h*sign*Math.PI*Math.sin(Math.PI*u)/nominal};
        a={x:-side*h*Math.PI*Math.PI*Math.sin(Math.PI*u)/(nominal*nominal),z:-side*h*sign*Math.PI*Math.PI*Math.cos(Math.PI*u)/(nominal*nominal)};
      }else{
        const direction=event.phase==='center'?(slot===1?1:-1):(slot%2===0?1:-1);
        const outward=event.phase==='sides'&&(slot===1||slot===2),inward=event.phase==='sides'&&!outward;
        const targetSlot=event.phase==='center'?3-slot:slot+(slot%2===0?1:-1),x1=[-1.5,-.5,.5,1.5][targetSlot]*spacing;
        const X=quintic(x0,x1,direction*(inward?h*Math.PI:spacing),direction*(outward?h*Math.PI:spacing),0,0,1,u);
        const z0=inward?direction*h*sign:0,z1=outward?direction*h*sign:0,mid=direction*h*sign;
        const a0=inward?-direction*h*sign*Math.PI*Math.PI:0,a1=outward?-direction*h*sign*Math.PI*Math.PI:0;
        let Z;
        if(event.phase==='center'){
          const theta=Math.PI*(x0+direction*spacing*u)/spacing;
          Z={p:-direction*h*sign*Math.cos(theta),v:h*sign*Math.PI*Math.sin(theta),a:direction*h*sign*Math.PI*Math.PI*Math.cos(theta)};
        }else Z=u<=.5?quintic(z0,mid,outward?direction*h*sign*Math.PI:0,0,a0,0,.5,u):quintic(mid,z1,0,inward?-direction*h*sign*Math.PI:0,0,a1,.5,u-.5);
        p={x:X.p,z:Z.p};v={x:X.v/nominal,z:Z.v/nominal};a={x:X.a/(nominal*nominal),z:Z.a/(nominal*nominal)};
      }
      const position=transform(p,true),velocity=transform(v),acceleration=transform(a);
      return {id,position,velocity,acceleration,yaw:Math.atan2(velocity.x,velocity.z)};
    });
    return {beat:t,poses,contacts:[]};
  }
  const entry=sample(0).poses,exit=sample(duration).poses;
  if(options.entry){
    if(options.entry.length!==4||new Set(options.entry.map(p=>p.id)).size!==4)throw new Error('Incoming state must name all four unique actors.');
    for(const p of entry){const incoming=options.entry.find(v=>v.id===p.id);if(!incoming||!finitePoint(incoming.position)||!incoming.velocity||!finitePoint(incoming.velocity)||!Number.isFinite(incoming.yaw)||distance(incoming.position,p.position)>EPS||distance(incoming.velocity,p.velocity)>EPS||Math.abs(Math.atan2(Math.sin(incoming.yaw-p.yaw),Math.cos(incoming.yaw-p.yaw)))>EPS)throw new Error(`Incoming pose for ${p.id} needs an explicit entry adapter; no snap was inserted.`);}
  }
  return {plan,beats:duration,gates:plan.events.map((e,i)=>({eventIndex:i,beat:starts[i]+nominal*.5,pairs:e.pairs,shoulder:e.token.shoulder,completion:e.token.completion})),entry,exit,endOrder:plan.endOrder,requiresEntryAdapter:!options.entry,requiresPartialExit:plan.needsPartialExit,timingInterpretation:'Equal-duration complete pass phases; a final partial phase has half that duration. This subfigure timing is an animation interpretation, not specified by the source.',sample};
}

export interface ExitTarget {id:string;position:Point;velocity:Point}
export interface ExitOptions {beats:number;targets:ExitTarget[];minimumClearance?:number;maximumSpeed?:number}
export interface HeyExitTrajectory {beats:number;sample:(beat:number)=>HeyFrame;minimumObservedClearance:number;maximumObservedSpeed:number}
/** Explicit constrained connection only. Never guesses a next figure or a progressed slot.
 * Cubic Hermite root curves honor incoming and outgoing positions/velocities; dense
 * clearance and speed checks reject unsolved geometry rather than projecting endpoints.
 * The caller must reserve these beats inside the source figure before integration.
 */
export function solveExplicitHeyExit(from:HeyPose[],options:ExitOptions):HeyExitTrajectory {
  const {beats,targets}=options,clearance=options.minimumClearance??.45,maxSpeed=options.maximumSpeed??1.8;
  if(!Number.isFinite(beats)||beats<=0||beats>64||!Number.isFinite(clearance)||clearance<=0||!Number.isFinite(maxSpeed)||maxSpeed<=0)throw new Error('Explicit positive exit duration (at most 64 beats) and physical budgets are required.');
  if(from.length!==4||targets.length!==4||new Set(from.map(p=>p.id)).size!==4||new Set(targets.map(p=>p.id)).size!==4||from.some(p=>!targets.some(t=>t.id===p.id)))throw new Error('Exit targets must preserve all four stable dancer identities.');
  for(const p of [...from,...targets])if(!finitePoint(p.position)||!finitePoint(p.velocity)||Math.hypot(p.velocity.x,p.velocity.z)<EPS)throw new Error('Finite positions and nonzero endpoint velocities are required.');
  function sample(beat:number):HeyFrame{
    if(!Number.isFinite(beat))throw new Error('Sample time must be finite.');
    const t=Math.max(0,Math.min(beats,beat)),u=t/beats,u2=u*u,u3=u2*u;
    const poses=from.map(start=>{
      const target=targets.find(p=>p.id===start.id)!;
      const coordinate=(k:'x'|'z')=>({
        p:(2*u3-3*u2+1)*start.position[k]+(u3-2*u2+u)*beats*start.velocity[k]+(-2*u3+3*u2)*target.position[k]+(u3-u2)*beats*target.velocity[k],
        v:((6*u2-6*u)*start.position[k]+(3*u2-4*u+1)*beats*start.velocity[k]+(-6*u2+6*u)*target.position[k]+(3*u2-2*u)*beats*target.velocity[k])/beats,
        a:((12*u-6)*start.position[k]+(6*u-4)*beats*start.velocity[k]+(-12*u+6)*target.position[k]+(6*u-2)*beats*target.velocity[k])/(beats*beats)
      });
      const x=coordinate('x'),z=coordinate('z'),velocity={x:x.v,z:z.v};
      return {id:start.id,position:{x:x.p,z:z.p},velocity,acceleration:{x:x.a,z:z.a},yaw:Math.atan2(velocity.x,velocity.z)};
    });
    return {beat:t,poses,contacts:[]};
  }
  let minimumObservedClearance=Infinity,maximumObservedSpeed=0;
  const steps=Math.max(400,Math.ceil(beats*200));
  for(let i=0;i<=steps;i++){
    const poses=sample(beats*i/steps).poses;
    for(const p of poses){const speed=Math.hypot(p.velocity.x,p.velocity.z);maximumObservedSpeed=Math.max(maximumObservedSpeed,speed);if(speed<.015)throw new Error('Exit solver produced a stationary reversal; a different transition path is required.');}
    for(let a=0;a<4;a++)for(let b=a+1;b<4;b++)minimumObservedClearance=Math.min(minimumObservedClearance,distance(poses[a].position,poses[b].position));
  }
  if(minimumObservedClearance<clearance-EPS)throw new Error(`Exit cannot satisfy the requested torso clearance (${minimumObservedClearance.toFixed(3)} model units).`);
  if(maximumObservedSpeed>maxSpeed+EPS)throw new Error(`Exit exceeds the speed budget (${maximumObservedSpeed.toFixed(3)} model units/beat).`);
  return {beats,sample,minimumObservedClearance,maximumObservedSpeed};
}
