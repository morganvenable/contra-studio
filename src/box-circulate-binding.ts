/** Resolve an explicit-direction box circulate from measured occupied stations.
 * No trajectory, progression, relationship rebinding, or source recognition. */
import {validateWaveGraph,type WaveConstraint,type WaveGraph,type CirculateAssignment} from './wave-figures.ts';
import type {Role} from './hey.ts';
import type {Vec2} from './types.ts';
export interface BoxCirculateBindingInput {entry:ReadonlyMap<number,WaveConstraint>;entryWave:WaveGraph;roles:ReadonlyMap<number,Role>;crossRole:Role;loopRole:Role;loopDirection?:'right'|'left';frame:{origin:Vec2;across:Vec2};}
export interface BoxCirculateBinding {mapping:readonly CirculateAssignment[];exit:ReadonlyMap<number,WaveConstraint>;exitWave:WaveGraph;frame:{origin:Vec2;across:Vec2};}
const freeze=<T>(x:T):T=>{if(x&&typeof x==='object'){Object.values(x).forEach(freeze);Object.freeze(x);}return x;};
function readonlyMap<K,V>(map:Map<K,V>):ReadonlyMap<K,V>{const view:ReadonlyMap<K,V>=Object.freeze({get size(){return map.size;},get:(k:K)=>map.get(k),has:(k:K)=>map.has(k),entries:()=>map.entries(),keys:()=>map.keys(),values:()=>map.values(),[Symbol.iterator]:()=>map[Symbol.iterator](),forEach:(fn:(v:V,k:K,m:ReadonlyMap<K,V>)=>void,thisArg?:unknown)=>map.forEach((v,k)=>fn.call(thisArg,v,k,view))});return view;}
const EPS=1e-7,wrap=(a:number)=>Math.atan2(Math.sin(a),Math.cos(a));
export function resolveBoxCirculateBinding(input:BoxCirculateBindingInput):BoxCirculateBinding {
 const {entry,roles,crossRole,loopRole}=input,loopDirection=input.loopDirection??'right',turn=loopDirection==='left'?1:-1,frame=structuredClone(input.frame),{origin,across}=frame;
 if(!['right','left'].includes(loopDirection)||!['lark','robin'].includes(crossRole)||!['lark','robin'].includes(loopRole)||crossRole===loopRole)throw Error('Box circulate needs distinct explicit crossing and loop roles with a supported direction.');
 if(!origin||!across||![origin.x,origin.z,across.x,across.z].every(Number.isFinite)||Math.abs(Math.hypot(across.x,across.z)-1)>EPS)throw Error('Box circulate needs a finite origin and unit across axis.');
 const ids=[...entry.keys()];if(ids.length!==4||ids.some(id=>!Number.isSafeInteger(id)||id<0)||roles.size!==4||ids.some(id=>!['lark','robin'].includes(roles.get(id)!)))throw Error('Box circulate requires four bound actors and their actual roles.');
 for(const p of entry.values())if(!p||![p.position?.x,p.position?.z,p.yaw,p.velocity?.x,p.velocity?.z,p.yawRate].every(Number.isFinite)||Math.hypot(p.velocity.x,p.velocity.z)>EPS||Math.abs(p.yawRate)>EPS)throw Error('Box circulate requires explicit stationary finite entry constraints.');
 const graph=validateWaveGraph(input.entryWave,entry,ids);if(graph.lines.length!==2||graph.lines.some(l=>l.order.length!==2))throw Error('Box circulate requires two ordered two-person wave lines.');
 const along={x:-across.z,z:across.x},yaw=Math.atan2(across.x,across.z);
 const local=new Map(ids.map(id=>{const p=entry.get(id)!.position;return[id,{x:(p.x-origin.x)*across.x+(p.z-origin.z)*across.z,z:(p.x-origin.x)*along.x+(p.z-origin.z)*along.z}];}));
 const width=Math.abs(local.get(ids[0])!.x),depth=Math.abs(local.get(ids[0])!.z);
 if(width<.6||width>1.1||depth<.35||depth>.65||[...local.values()].some(p=>Math.abs(Math.abs(p.x)-width)>EPS||Math.abs(Math.abs(p.z)-depth)>EPS)||new Set([...local.values()].map(p=>`${Math.sign(p.x)}:${Math.sign(p.z)}`)).size!==4)throw Error('Box circulate requires four actual rectangular corner stations within the existing motion contract.');
 for(const line of graph.lines){const [a,b]=line.order.map(id=>local.get(id)!);if(Math.abs(a.x-b.x)>EPS)throw Error('Each ordered wave line must occupy one actual side of the box.');}
 const mapping:CirculateAssignment[]=ids.map(id=>{
  const p=local.get(id)!,side=Math.sign(p.x),inward=yaw+(side===1?Math.PI:0),outward=yaw+(side===1?0:Math.PI),heading=entry.get(id)!.yaw;
  const cross=Math.abs(wrap(heading-inward))<=EPS,out=Math.abs(wrap(heading-outward))<=EPS;
  if(!cross&&!out||roles.get(id)!==(cross?crossRole:loopRole)||out&&Math.sign(p.z)!==turn*side)throw Error('Measured facing, explicit role, and same-box loop direction must agree.');
  const target={x:cross?-p.x:p.x,z:cross?p.z:-p.z},dest=ids.filter(other=>{const q=local.get(other)!;return Math.hypot(q.x-target.x,q.z-target.z)<=EPS;});if(dest.length!==1)throw Error('Every circulate destination must be an actual unique vacated station.');
  return{id,destinationId:dest[0],mode:cross?'cross':loopDirection==='left'?'loop-left':'loop-right'};
 });
 if(mapping.filter(m=>m.mode==='cross').length!==2||new Set(mapping.map(m=>m.destinationId)).size!==4)throw Error('Box circulate must be a complete permutation with two crossers and two directed loopers.');
 const occupant=new Map(mapping.map(m=>[m.destinationId,m.id]));
 const exit=new Map(mapping.map(m=>[m.id,{position:{...entry.get(m.destinationId)!.position},yaw:entry.get(m.id)!.yaw+(m.mode==='cross'?0:turn*Math.PI),velocity:{x:0,z:0},yawRate:0}]));
 const exitWave=validateWaveGraph({lines:graph.lines.map(l=>({order:l.order.map(id=>occupant.get(id)!),axis:{...l.axis}})),hands:graph.hands.map(h=>({...h,a:occupant.get(h.a)!,b:occupant.get(h.b)!}))},exit,ids);
 for(const p of exit.values())freeze(p);
 return Object.freeze({mapping:freeze(mapping),exit:readonlyMap(exit),exitWave,frame:freeze(frame)});
}
