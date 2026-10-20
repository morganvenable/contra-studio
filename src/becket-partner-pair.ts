/** A real two-person Becket partner phrase, including an odd end couple.
 * The pair owns its stationary sideline center; no fourth actor is fabricated.
 * Root/contact equations match the established shared partner balance/swing. */
import {smooth,makeBalanceCue} from './engine.ts';
import type {MotionPlan} from './extended-figures.ts';
import type {Dancer,Figure,Pose,Vec2,HandContact} from './types.ts';
const TAU=2*Math.PI,clamp=(t:number)=>Math.max(0,Math.min(1,t)),mix=(a:Vec2,b:Vec2,q:number)=>({x:a.x+(b.x-a.x)*q,z:a.z+(b.z-a.z)*q}),heading=(a:Vec2,b:Vec2)=>Math.atan2(b.x-a.x,b.z-a.z),turn=(a:number,b:number)=>Math.atan2(Math.sin(b-a),Math.cos(b-a));
export function compileBecketPartnerPair(raw:Figure,rawIds:readonly[number,number],rawStart:readonly Pose[],roster:readonly Dancer[],exitRoleGap:number):MotionPlan{
 const f=structuredClone(raw),ids=[...rawIds] as [number,number],start=structuredClone(rawStart),dancers=structuredClone(roster),[a,b]=ids[0]%2===0?ids:[ids[1],ids[0]],A=start[a],B=start[b];
 if(!['balance','swing'].includes(f.kind)||f.who!=='partner'||f.beats!==(f.kind==='balance'?4:12)||Object.keys(f).some(k=>!['id','kind','beats','label','who','notes','confidence'].includes(k)&&f[k as keyof Figure]!==undefined)||f.confidence==='unsupported'||a===b||!A||!B||dancers[a]?.role!=='lark'||dancers[b]?.role!=='robin'||dancers[a].couple!==dancers[b].couple||!Number.isFinite(exitRoleGap)||exitRoleGap<1.1||exitRoleGap>1.8)throw new Error('A Becket partner pair needs two persistent partners, four-count balance or twelve-count swing, and an explicit sideline role gap.');
 const center=mix(A.position,B.position,.5),side=Math.sign(center.x),gap=Math.hypot(A.position.x-B.position.x,A.position.z-B.position.z);
 if(Math.abs(Math.abs(center.x)-.9)>1e-6||Math.abs(A.position.x-B.position.x)>1e-6||Math.abs(gap-(f.kind==='balance'?1.18:.62))>1e-6||Math.sign(A.position.z-B.position.z)!==side)throw new Error('Partner balance/swing must enter its physically prepared conventional Becket stance.');
 const swingProgress=(time:number)=>{const t=clamp(time),lead=.15/12,release=2.5/12,n=1-(lead+release)/2;if(t<lead){const u=t/lead;return lead*(u*u*u-.5*u*u*u*u)/n;}if(t>1-release){const u=(1-t)/release;return 1-release*(u*u*u-.5*u*u*u*u)/n;}return(t-lead/2)/n;};
 const position=(id:number,t:number)=>{if(!ids.includes(id)||!Number.isFinite(t))throw new Error('Partner phrase sampling requires a bound actor and finite time.');t=clamp(t);const p=start[id].position;
  if(f.kind==='balance'){const target=t<=.5?1.18+(.92-1.18)*smooth(t/.5):t<=.75?.92+(1.18-.92)*smooth((t-.5)/.25):1.18-.56*smooth((t-.8125)/.1875);return mix(p,center,1-target/gap);}
  const theta=Math.atan2(p.z-center.z,p.x-center.x),angle=theta+2*TAU*swingProgress(t),radius=.31+(exitRoleGap/2-.31)*smooth((t-.82)/.18);return{x:center.x+Math.cos(angle)*radius,z:center.z+Math.sin(angle)*radius};
 };
 const facing=(id:number,t:number)=>{if(!ids.includes(id)||!Number.isFinite(t))throw new Error('Partner phrase facing requires a bound actor and finite time.');t=clamp(t);if(f.kind==='balance')return heading(position(id,t),position(id===a?b:a,t))+Math.PI/3*smooth((t-.8125)/.1875);const p=start[id].position,theta=Math.atan2(p.z-center.z,p.x-center.x),body=-theta-2*TAU*swingProgress(t)-Math.PI/2+Math.PI/3,endBody=-theta-2*TAU-Math.PI/2+Math.PI/3,exit=endBody+turn(endBody,-side*Math.PI/2);return t>.84?body+(exit-body)*smooth((t-.84)/.16):body;};
 const contacts=(t:number,poses:Pose[]):HandContact[]=>{
  const strength=f.kind==='balance'?smooth(t/.12):smooth((.93-t)/.14);if(strength<.01)return[];
  const pa=poses[a],pb=poses[b],mid=mix(pa.position,pb.position,.5);
  if(f.kind==='balance'&&t<.8125)return(['right','left']as const).map(hand=>{const sign=hand==='left'?1:-1;return{a,b,handA:hand,handB:hand==='left'?'right':'left',kind:'joined',point:{x:mid.x+sign*.22*Math.cos(pa.yaw),y:1.24,z:mid.z-sign*.22*Math.sin(pa.yaw)},strength};});
  const v={x:pb.position.x-pa.position.x,z:pb.position.z-pa.position.z},joined={x:mid.x+v.z*.25,z:mid.z-v.x*.25},back={x:pb.position.x-Math.sin(pb.yaw)*.13+Math.cos(pb.yaw)*.13,y:1.28,z:pb.position.z-Math.cos(pb.yaw)*.13-Math.sin(pb.yaw)*.13},shoulder={x:pa.position.x-Math.cos(pa.yaw)*.23,y:1.33,z:pa.position.z+Math.sin(pa.yaw)*.23},held=(sign:number)=>({x:center.x+sign*.22*Math.cos(A.yaw),y:1.24,z:center.z-sign*.22*Math.sin(A.yaw)}),handoff=f.kind==='balance'?smooth((t-.8125)/.1875):1;
  const transition=(from:{x:number;y:number;z:number},to:{x:number;y:number;z:number},owner?:Pose,hand?:'left'|'right')=>{const point={...mix(from,to,handoff),y:from.y+(to.y-from.y)*handoff};if(owner&&hand){const sign=hand==='left'?1:-1,offer={x:owner.position.x+sign*.235*Math.cos(owner.yaw),y:1.355,z:owner.position.z-sign*.235*Math.sin(owner.yaw)},bow=.48*Math.sin(Math.PI*handoff)**1.2;return{...mix(point,offer,bow),y:point.y+(offer.y-point.y)*bow};}return point;};
  return[{a,b,handA:'left',handB:'right',point:transition(held(1),{...joined,y:1.31}),strength,kind:'swing-frame',target:'hands'},{a,b,handA:'right',handB:'left',point:transition(held(-1),back,pa,'right'),strength,kind:'swing-frame',target:'back',bodyPoint:{x:.13,y:1.28,z:-.13},bodyBlend:handoff*(1-.48*Math.sin(Math.PI*handoff)**1.2)},{a:b,b:a,handA:'left',handB:'right',point:transition(held(-1),shoulder,pb,'left'),strength,kind:'swing-frame',target:'upper-arm'}];
 };
 return Object.freeze({position,facing,contacts,balance:f.kind==='balance'?(id:number,t:number)=>makeBalanceCue(f,id,ids,dancers,t):undefined});
}
