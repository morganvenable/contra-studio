/** Whole-line long-wave topology. Local boxes retain their identities; only
 * explicitly adjacent segment endpoints acquire the between-box opposite hands. */
import type {HandContact,Pose} from './types.ts';
import {validateWaveGraph,type WaveGraph,type WaveHand} from './wave-figures.ts';
export interface FullLongWaveGraph extends WaveGraph {readonly actorIds:readonly number[];readonly seamHands:readonly WaveHand[];readonly bindingEpoch:number;}
const EPS=1e-6;
const freeze=<T>(value:T):T=>{if(value&&typeof value==='object'){for(const child of Object.values(value))freeze(child);Object.freeze(value);}return value;};
const wrap=(n:number)=>Math.atan2(Math.sin(n),Math.cos(n));
const checkPoses=(poses:readonly Pose[])=>{if(poses.some(p=>!Number.isSafeInteger(p.id)||p.id<0||![p.position?.x,p.position?.z,p.yaw].every(Number.isFinite))||new Set(poses.map(p=>p.id)).size!==poses.length)throw new Error('Full-wave poses must have finite, unique nonnegative integer identities.');};
/** Explicit west/east segments must be supplied in increasing source slot rank.
 * No sorting or nearest-person selection can choose an outer-wave neighbor. */
export function joinLongWaveSegments(segments:readonly WaveGraph[],poses:readonly Pose[],actorIds:readonly number[],bindingEpoch:number):FullLongWaveGraph {
 checkPoses(poses);
 if(!Number.isSafeInteger(bindingEpoch)||bindingEpoch<0||new Set(actorIds).size!==actorIds.length||actorIds.some(id=>!Number.isSafeInteger(id)||id<0))throw new Error('The full wave needs one current binding epoch and unique stable actors.');
 if(!segments.length){if(actorIds.length)throw new Error('Active actors cannot disappear from the long-wave graph.');return freeze({lines:[],hands:[],actorIds:[],seamHands:[],bindingEpoch});}
 if(segments.some(s=>s.lines.length!==2||s.lines.some(l=>l.order.length!==2||l.axis.x!==0||l.axis.z!==1)))throw new Error('The full wave requires explicitly ordered west/east two-person segments.');
 const poseMap=new Map(poses.map(p=>[p.id,{position:p.position,yaw:p.yaw,velocity:{x:0,z:0},yawRate:0}]));
 const segmentHand=segments[0].hands[0]?.handA;if(!['left','right'].includes(segmentHand))throw new Error('Explicit box hand direction required.');
 for(const segment of segments){const ids=segment.lines.flatMap(l=>[...l.order]);validateWaveGraph(segment,poseMap,ids);for(const line of segment.lines){const matching=segment.hands.filter(h=>h.a===line.order[0]&&h.b===line.order[1]||h.a===line.order[1]&&h.b===line.order[0]);if(matching.length!==1||matching[0].handA!==segmentHand||matching[0].handB!==segmentHand)throw new Error('Every explicit box segment must preserve its declared uniform side edges.');}}
 const lines=[0,1].map(side=>({order:segments.flatMap(s=>[...s.lines[side].order]),axis:{x:0,z:1}})),hands:WaveHand[]=[],seamHands:WaveHand[]=[];
 for(const line of lines)for(let i=0;i<line.order.length-1;i++){const h:WaveHand={a:line.order[i],b:line.order[i+1],handA:i%2?(segmentHand==='right'?'left':'right'):segmentHand,handB:i%2?(segmentHand==='right'?'left':'right'):segmentHand};hands.push(h);if(i%2)seamHands.push(h);}
 const graph=freeze({lines,hands,actorIds:[...actorIds],seamHands,bindingEpoch});validateFullLongWave(graph,poses,bindingEpoch);return graph;
}
export function validateFullLongWave(graph:FullLongWaveGraph,poses:readonly Pose[],expectedBindingEpoch?:number):void {
 if(expectedBindingEpoch!==undefined&&(!Number.isSafeInteger(expectedBindingEpoch)||expectedBindingEpoch<0||graph.bindingEpoch!==expectedBindingEpoch))throw new Error('The full-wave graph has a stale relationship epoch.');
 checkPoses(poses);
 const byId=new Map(poses.map(p=>[p.id,p])),seen=new Set<number>(),held=new Set<string>(),edges=new Set<string>(),seams=new Set<string>();
 if(!Number.isSafeInteger(graph.bindingEpoch)||graph.bindingEpoch<0||new Set(graph.actorIds).size!==graph.actorIds.length||graph.actorIds.some(id=>!Number.isSafeInteger(id)||id<0)||graph.actorIds.length%4!==0||graph.lines.length!==(graph.actorIds.length?2:0))throw new Error('Malformed full-wave identity partition.');
 for(const line of graph.lines){if(line.axis.x!==0||line.axis.z!==1||line.order.length!==graph.actorIds.length/2||line.order.length<2)throw new Error('Long waves need explicit along-hall lines.');for(let i=0;i<line.order.length;i++){const id=line.order[i],p=byId.get(id);if(!p||!graph.actorIds.includes(id)||seen.has(id)||![p.position.x,p.position.z,p.yaw].every(Number.isFinite)||Math.abs(Math.cos(p.yaw))>EPS)throw new Error('Every full-wave actor must have one finite, perpendicular-facing slot.');seen.add(id);if(i){const a=byId.get(line.order[i-1])!,spacing=p.position.z-a.position.z;if(Math.abs(p.position.x-a.position.x)>EPS||spacing<.65-EPS||spacing>1.7+EPS||Math.abs(Math.abs(wrap(p.yaw-a.yaw))-Math.PI)>EPS)throw new Error('Full-wave adjacency must be collinear, reachable and alternating-facing.');edges.add(`${line.order[i-1]}:${id}`);if(i%2===0)seams.add(`${line.order[i-1]}:${id}`);}}}
 if(seen.size!==graph.actorIds.length||graph.hands.length!==edges.size)throw new Error('Full-wave graph must name every active actor and every adjacent edge.');
 for(const h of graph.hands){if(!edges.delete(`${h.a}:${h.b}`)||!['left','right'].includes(h.handA)||!['left','right'].includes(h.handB))throw new Error('Long-wave hands must name exact ordered adjacent actors.');for(const[id,hand,other]of[[h.a,h.handA,h.b],[h.b,h.handB,h.a]] as const){const key=`${id}:${hand}`,p=byId.get(id)!,q=byId.get(other)!,toward=(q.position.x-p.position.x)*Math.cos(p.yaw)-(q.position.z-p.position.z)*Math.sin(p.yaw);if(held.has(key)||(hand==='left'?1:-1)*toward<=0)throw new Error('Every named full-wave hand must point at its unique receiver.');held.add(key);}}
 if(graph.seamHands.length!==seams.size||graph.seamHands.some(h=>!seams.delete(`${h.a}:${h.b}`)||h.handA!==h.handB||!graph.hands.some(k=>k.a===h.a&&k.b===h.b&&k.handA===h.handA&&k.handB===h.handB)))throw new Error('Every between-box hand must belong to the complete graph.');
 fullLongWaveContacts(graph,poses);
}
/** Fixed adult arm envelope, including all between-minor-set hands. */
export function fullLongWaveContacts(graph:FullLongWaveGraph,poses:readonly Pose[],strength=1):HandContact[]{
 if(!Number.isFinite(strength)||strength<0||strength>1)throw new Error('Full-wave contact strength must be in [0,1].');if(!strength)return[];
 checkPoses(poses);
 const byId=new Map(poses.map(p=>[p.id,p]));return graph.hands.map(h=>{const A=byId.get(h.a),B=byId.get(h.b);if(!A||!B||h.a===h.b||!graph.actorIds.includes(h.a)||!graph.actorIds.includes(h.b)||!['left','right'].includes(h.handA)||!['left','right'].includes(h.handB))throw new Error('Every wave hand needs its exact named actor and valid owned hand.');const point={x:(A.position.x+B.position.x)/2,y:1.28,z:(A.position.z+B.position.z)/2};for(const[p,hand]of[[A,h.handA],[B,h.handB]] as const){const side=hand==='left'?1:-1,reach=Math.hypot(point.x-p.position.x-side*.235*Math.cos(p.yaw),point.y-1.355,point.z-p.position.z+side*.235*Math.sin(p.yaw));if(reach>.62+EPS)throw new Error(`Long-wave hand ${p.id}/${hand} exceeds adult reach (${reach}).`);}return{...h,point,strength,kind:'joined' as const};});
}
