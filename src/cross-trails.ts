/** Two separately named shoulder passages. Neither this path nor its gates may
 * rebind a neighbor: the formation owner may do so only after the physical exit.
 * The four-plus-four split is a reviewed allocation within eight source counts. */
import type {Dancer,HandContact,Vec2} from './types.ts';
import type {BoundRelationships} from './chain.ts';
import {ownActors,ownConstraints,ownRelations,immutableMap,distance,heading,turn,ease,progress,sampleTime,type TurnConstraint} from './ring-twirl-contract.ts';

export interface CrossTrailsPassage {relation:'partner'|'neighbor';axis:'across'|'along';shoulder:'right'|'left';}
export interface CrossTrailsOptions {
 actors:readonly Dancer[];
 entry:ReadonlyMap<number,TurnConstraint>;
 exit:ReadonlyMap<number,TurnConstraint>;
 relations:BoundRelationships;
 bindingEpoch:number;
 frame:{origin:Vec2;axis:Vec2};
 beats:8;
 phaseBeats:readonly [4,4];
 passages:readonly [CrossTrailsPassage,CrossTrailsPassage];
 minimumClearance?:number;
 maximumSpeed?:number;
 maximumYawRate?:number;
}

export function assertCrossTrailsPassages(passages:unknown):asserts passages is readonly [CrossTrailsPassage,CrossTrailsPassage] {
 if(!Array.isArray(passages)||passages.length!==2||passages.some(p=>!p||typeof p!=='object'||Object.keys(p).sort().join('|')!=='axis|relation|shoulder')||passages[0].relation!=='partner'||passages[0].axis!=='across'||passages[0].shoulder!=='right'||passages[1].relation!=='neighbor'||passages[1].axis!=='along'||passages[1].shoulder!=='left')throw new Error('Cross trails requires the ordered explicit partner/across/right and current-neighbor/along/left passages.');
}

export function compileCrossTrails(options:CrossTrailsOptions){
 const allowed=new Set(['actors','entry','exit','relations','bindingEpoch','frame','beats','phaseBeats','passages','minimumClearance','maximumSpeed','maximumYawRate']);
 if(!options||Object.keys(options).some(key=>!allowed.has(key))||!options.frame||Object.keys(options.frame).some(key=>!['origin','axis'].includes(key))||[options.frame.origin,options.frame.axis].some(p=>!p||Object.keys(p).some(key=>!['x','z'].includes(key))))throw new Error('Cross trails does not ignore extra motion, turn or hall-frame modifiers.');
 assertCrossTrailsPassages(options.passages);
 const {actors,ids}=ownActors(options.actors,4),relations=ownRelations(options.relations,options.bindingEpoch,actors),entry=ownConstraints(options.entry,ids),exit=ownConstraints(options.exit,ids);
 const passages=Object.freeze(options.passages.map(p=>Object.freeze({...p}))) as readonly [CrossTrailsPassage,CrossTrailsPassage];
 const origin=Object.freeze({...options.frame?.origin}),axis=Object.freeze({...options.frame?.axis}),across={x:axis.z,z:-axis.x};
 if(options.beats!==8||!Array.isArray(options.phaseBeats)||options.phaseBeats.length!==2||options.phaseBeats[0]!==4||options.phaseBeats[1]!==4||![origin.x,origin.z,axis.x,axis.z].every(Number.isFinite)||Math.abs(Math.hypot(axis.x,axis.z)-1)>1e-8)throw new Error('Cross trails requires eight source counts, an explicit four-plus-four allocation and a finite unit hall frame.');
 const local=(p:Vec2)=>({x:(p.x-origin.x)*across.x+(p.z-origin.z)*across.z,z:(p.x-origin.x)*axis.x+(p.z-origin.z)*axis.z});
 const world=(p:Vec2)=>({x:origin.x+p.x*across.x+p.z*axis.x,z:origin.z+p.x*across.z+p.z*axis.z});
 const directionYaw=(x:number,z:number)=>heading({x:0,z:0},{x:x*across.x+z*axis.x,z:x*across.z+z*axis.z});
 const starts=new Map(ids.map(id=>[id,local(entry.get(id)!.position)])),first=starts.get(ids[0])!,halfWidth=Math.abs(first.x),halfRow=Math.abs(first.z);
 if(halfWidth<.8||halfWidth>1.1||halfRow<.8||halfRow>1.1||new Set(ids.map(id=>{const p=starts.get(id)!;return`${Math.sign(p.x)},${Math.sign(p.z)}`;})).size!==4)throw new Error('Cross trails requires four distinct explicit rectangular corners in its bounded hall frame.');
 const middle=new Map<number,TurnConstraint>();
 for(const id of ids){
  const a=starts.get(id)!,partner=starts.get(relations.partner.get(id)!)!,neighbor=starts.get(relations.neighbor.get(id)!)!,b=local(exit.get(id)!.position),forward=-Math.sign(a.z),acrossYaw=directionYaw(-Math.sign(a.x),0),alongYaw=directionYaw(0,forward);
  if(Math.abs(Math.abs(a.x)-halfWidth)>1e-7||Math.abs(Math.abs(a.z)-halfRow)>1e-7||Math.abs(a.x+partner.x)>1e-7||Math.abs(a.z-partner.z)>1e-7||Math.abs(a.x-neighbor.x)>1e-7||Math.abs(a.z+neighbor.z)>1e-7)throw new Error('Named partners must face across their exact row and named current neighbors must occupy the same sideline.');
  if(distance(b,{x:-a.x,z:-a.z})>1e-7)throw new Error('Cross trails must physically reach each named diagonally opposite corner after both complete passages.');
  if(Math.abs(turn(entry.get(id)!.yaw,acrossYaw))>1e-7||Math.abs(turn(exit.get(id)!.yaw,alongYaw))>1e-7)throw new Error('Cross trails requires partners-facing-across entry and onward along-set exit facings.');
  middle.set(id,Object.freeze({position:Object.freeze(world({x:-a.x,z:a.z})),yaw:entry.get(id)!.yaw+turn(alongYaw,entry.get(id)!.yaw),velocity:Object.freeze({x:0,z:0}),yawRate:0}));
 }
 // Separate parallel lanes meet only at their named shoulder gates. The outer
 // excursion is bounded below half a row so adjoining minor sets stay apart.
 const lane=.44;
 const root=(id:number,beat:number)=>{
  const A=entry.get(id),a=starts.get(id);if(!A||!a)throw new Error('Actor is outside this explicitly bound cross-trails group.');
  const phase=beat<4?0:1,t=(beat-phase*4)/4,u=progress(t),bow=16*u*u*(1-u)*(1-u),sx=Math.sign(a.x),sz=Math.sign(a.z);
  const p=phase===0?{x:a.x*(1-2*u),z:a.z+sx*lane*bow}:{x:-a.x+sz*lane*bow,z:a.z*(1-2*u)};
  const endYaw=middle.get(id)!.yaw,yaw=phase===0?A.yaw+turn(endYaw,A.yaw)*ease((beat-2.5)/1.5):endYaw;
  return{id,position:world(p),yaw};
 };
 const sample=(beat:number)=>{
  beat=sampleTime(beat,8);const h=1e-5,lo=Math.max(0,beat-h),hi=Math.min(8,beat+h);
  return{beat,poses:ids.map(id=>{const p=root(id,beat),a=root(id,lo),b=root(id,hi);return{...p,velocity:{x:(b.position.x-a.position.x)/(hi-lo),z:(b.position.z-a.position.z)/(hi-lo)},yawRate:(b.yaw-a.yaw)/(hi-lo)};}),contacts:[] as HandContact[]};
 };
 const gates=passages.flatMap((passage,phase)=>ids.filter(id=>id<relations[passage.relation].get(id)!).map(id=>{
  const other=relations[passage.relation].get(id)!,beat=phase*4+2,poses=sample(beat).poses,A=poses.find(p=>p.id===id)!,B=poses.find(p=>p.id===other)!;
  for(const [a,b]of[[A,B],[B,A]]){
   const forward={x:Math.sin(a.yaw),z:Math.cos(a.yaw)},right={x:-Math.cos(a.yaw),z:Math.sin(a.yaw)},delta={x:b.position.x-a.position.x,z:b.position.z-a.position.z},sign=passage.shoulder==='right'?1:-1;
   if(Math.abs(delta.x*forward.x+delta.z*forward.z)>1e-7||sign*(delta.x*right.x+delta.z*right.z)<.88-1e-7)throw new Error('The named cross-trails encounter did not reach its independently checked shoulder gate.');
  }
  return Object.freeze({phase,beat,pair:Object.freeze([id,other]) as readonly[number,number],...passage});
 }));
 const minimum=options.minimumClearance??.70,maximum=options.maximumSpeed??.9,angular=options.maximumYawRate??2;
 if(![minimum,maximum,angular].every(x=>Number.isFinite(x)&&x>0))throw new Error('Finite positive cross-trails motion budgets are required.');
 let minimumObservedClearance=Infinity,maximumObservedSpeed=0,maximumObservedYawRate=0;
 for(let n=0;n<=1600;n++){const f=sample(n/200);for(const p of f.poses){maximumObservedSpeed=Math.max(maximumObservedSpeed,distance(p.velocity,{x:0,z:0}));maximumObservedYawRate=Math.max(maximumObservedYawRate,Math.abs(p.yawRate));}for(let a=0;a<ids.length;a++)for(let b=a+1;b<ids.length;b++)minimumObservedClearance=Math.min(minimumObservedClearance,distance(f.poses[a].position,f.poses[b].position));}
 if(minimumObservedClearance<minimum-1e-7||maximumObservedSpeed>maximum+1e-7||maximumObservedYawRate>angular+1e-7)throw new Error(`Cross trails exceeds sampled motion budgets: clearance ${minimumObservedClearance}, speed ${maximumObservedSpeed}, yaw ${maximumObservedYawRate}.`);
 return Object.freeze({beats:8 as const,phaseBeats:Object.freeze([4,4] as const),epoch:relations.epoch,passages,entry:immutableMap(entry),middle:immutableMap(middle),exit:immutableMap(exit),gates:Object.freeze(gates),minimumObservedClearance,maximumObservedSpeed,maximumObservedYawRate,sample,position:(id:number,t:number)=>root(id,sampleTime(t*8,8)).position,facing:(id:number,t:number)=>root(id,sampleTime(t*8,8)).yaw,contacts:()=>[] as HandContact[]});
}
