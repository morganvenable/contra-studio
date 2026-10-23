/** Rory O'More travel is one adjacent wave station, with unchanged final facing.
 * Swapping dancers pass face to face: each bows slightly backward so the
 * person they pass goes by in front of them. Most dancers also spin once in
 * the travel direction (clockwise sliding right); never a petronella quarter-ring.
 * Primary descriptions: Caller's Box Glossary#Slide_right_left and Colin Hume,
 * session7.htm. Both distinguish face-to-face travel from a half allemande.
 * Every station, passing actor, hand and graph is supplied explicitly.
 */
import type {HandContact,Pose,Vec2} from './types.ts';
import type {WaveConstraint,WaveGraph,WavePose,WaveSource} from './wave-figures.ts';
import {ownConstraints,immutableMap,distance,turn,sampleTime} from './ring-twirl-contract.ts';
export interface RorySlideOptions {
 actorIds:readonly number[];entry:ReadonlyMap<number,WaveConstraint>;exit:ReadonlyMap<number,WaveConstraint>;
 formation:'short-wave'|'long-waves';entryWave:WaveGraph;exitWave:WaveGraph;
 mapping:readonly {id:number;destinationId:number}[];
 beats:4|8;balanceFirst?:'right'|'left';direction:'right'|'left';stationShift:1;
 /** No spin and one full spin are separate saved choices. */
 spin:'none'|'full';spinDirection?:'right'|'left';spinAmount:0|1;
 /** Explicit measured compact long-wave geometry; ordinary defaults are unchanged. */
 geometry?:{stationSpacing:1.28;passingBow:.4;lineSpacing:1.28};
 source?:WaveSource;minimumClearance?:number;maximumSpeed?:number;maximumYawRate?:number;
}
const EPS=1e-7,clamp=(x:number)=>Math.max(0,Math.min(1,x));
const ease=(x:number)=>{const t=clamp(x);return t*t*t*(10+t*(-15+6*t));};
const ed=(x:number)=>x<=0||x>=1?0:30*x*x*(1-x)*(1-x);
const edd=(x:number)=>x<=0||x>=1?0:60*x*(1-x)*(1-2*x);
function clock(x:number,r=.18):[number,number,number]{const t=clamp(x),n=1-r;if(t>1-r){const[q,d,dd]=clock(1-t,r);return[1-q,d,-dd];}if(t<r){const u=t/r;return[r*(u*u*u-.5*u*u*u*u)/n,(3*u*u-2*u*u*u)/n,(6*u-6*u*u)/(r*n)];}return[(t-r/2)/n,1/n,0];}
function freeze<T>(v:T):T{if(v&&typeof v==='object'){Object.values(v).forEach(freeze);Object.freeze(v);}return v;}
const right=(yaw:number):Vec2=>({x:-Math.cos(yaw),z:Math.sin(yaw)});
/** Unlike local WaveGraph validation, a declared long wave owns every seam hand. */
export function validateRoryWave(raw:WaveGraph,poses:ReadonlyMap<number,WaveConstraint>,ids:readonly number[],formation:RorySlideOptions['formation'],geometry?:RorySlideOptions['geometry']):WaveGraph {
 if(geometry&&(formation!=='long-waves'||Object.keys(geometry).some(k=>!['stationSpacing','passingBow','lineSpacing'].includes(k))||geometry.stationSpacing!==1.28||geometry.passingBow!==.4||geometry.lineSpacing!==1.28))throw Error('Compact Rory geometry requires its exact measured long-wave spacing and passing bow.');
 const g=freeze(structuredClone(raw)),seen:number[]=[],edges=new Set<string>(),used=new Set<string>();
 if(!g||!Array.isArray(g.lines)||!Array.isArray(g.hands)||!['short-wave','long-waves'].includes(formation)||(formation==='short-wave'?(ids.length!==4||g.lines.length!==1||g.lines[0].order.length!==4):g.lines.length!==2))throw new Error('Rory formation must explicitly distinguish a four-person short wave from two full long waves.');
 for(const line of g.lines){if(!line.axis||![line.axis.x,line.axis.z].every(Number.isFinite)||Math.abs(Math.hypot(line.axis.x,line.axis.z)-1)>EPS||line.order.length<2||line.order.length%2)throw new Error('A Rory line needs a unit axis and a complete even ordered actor list.');
  for(let i=0;i<line.order.length;i++){const id=line.order[i],p=poses.get(id);if(!ids.includes(id)||!p)throw new Error('Rory wave names an unbound actor.');seen.push(id);if(Math.abs(Math.sin(p.yaw)*line.axis.x+Math.cos(p.yaw)*line.axis.z)>EPS)throw new Error('Rory actors must face perpendicular to the wave.');if(i){const a=line.order[i-1],q=poses.get(a)!,dx=p.position.x-q.position.x,dz=p.position.z-q.position.z,spacing=dx*line.axis.x+dz*line.axis.z;if((geometry?Math.abs(spacing-geometry.stationSpacing)>EPS:spacing<.8||spacing>1.1)||Math.abs(dx*line.axis.z-dz*line.axis.x)>EPS||Math.abs(Math.abs(turn(p.yaw,q.yaw))-Math.PI)>EPS)throw new Error('Rory wave stations must be ordered, collinear, reachable and alternating-facing.');edges.add(`${Math.min(a,id)}:${Math.max(a,id)}`);}}
 }
 if(geometry&&(g.lines.some(l=>l.axis.x!==0||l.axis.z!==1)||Math.abs(poses.get(g.lines[1].order[0])!.position.x-poses.get(g.lines[0].order[0])!.position.x-geometry.lineSpacing)>EPS))throw Error('Compact Rory long waves must retain the measured west/east line separation.');
 if(seen.length!==ids.length||new Set(seen).size!==ids.length||g.hands.length!==edges.size)throw new Error('Rory wave must name every actor and every adjacent hand, including long-wave seams.');
 for(const h of g.hands){if(!edges.delete(`${Math.min(h.a,h.b)}:${Math.max(h.a,h.b)}`)||h.handA!==h.handB||!['left','right'].includes(h.handA))throw new Error('Rory hands must name exactly adjacent reciprocal same-hand holds.');for(const[id,hand,other]of[[h.a,h.handA,h.b],[h.b,h.handB,h.a]] as const){const key=`${id}:${hand}`,p=poses.get(id)!,q=poses.get(other)!,r=right(p.yaw);if(used.has(key)||((q.position.x-p.position.x)*r.x+(q.position.z-p.position.z)*r.z)*(hand==='right'?1:-1)<=0)throw new Error('Rory hand ownership or handedness contradicts the ordered actors.');used.add(key);}}
 return g;
}
function waveContacts(g:WaveGraph,poses:readonly Pick<Pose,'id'|'position'|'yaw'>[],strength:number):HandContact[]{
 strength=Math.max(0,Math.min(1,strength));if(strength<=.001)return[];const by=new Map(poses.map(p=>[p.id,p]));if(by.size!==poses.length)throw new Error('Rory contacts need unique actor poses.');
 return g.hands.map(h=>{const a=by.get(h.a),b=by.get(h.b);if(!a||!b)throw new Error('Rory contacts need all named actors.');const point={x:(a.position.x+b.position.x)/2,y:1.28,z:(a.position.z+b.position.z)/2};for(const[p,hand]of[[a,h.handA],[b,h.handB]] as const){const side=hand==='left'?1:-1,shoulder={x:p.position.x+side*.235*Math.cos(p.yaw),z:p.position.z-side*.235*Math.sin(p.yaw)};if(Math.hypot(distance(shoulder,point),point.y-1.355)>.62+EPS)throw new Error('Rory contact exceeds fixed adult arm reach.');}return{...h,point,strength,kind:'joined' as const};});
}
export function compileRorySlide(raw:RorySlideOptions){
 for(const key of Object.keys(raw))if(!['actorIds','entry','exit','formation','entryWave','exitWave','mapping','beats','balanceFirst','direction','stationShift','spin','spinDirection','spinAmount','source','minimumClearance','maximumSpeed','maximumYawRate','geometry'].includes(key))throw new Error(`Rory does not consume “${key}”.`);
 const options={...raw,mapping:structuredClone(raw.mapping),geometry:raw.geometry?freeze(structuredClone(raw.geometry)):undefined},ids=Object.freeze([...raw.actorIds]),beats=options.beats,hasBalance=beats===8,offset=hasBalance?4:0,direction=options.direction,sign=direction==='right'?1:-1;
 if(ids.length<4||ids.length>48||ids.length%4||new Set(ids).size!==ids.length||ids.some(id=>!Number.isSafeInteger(id)||id<0))throw new Error('Rory requires explicit unique stable actors in complete wave groups.');
 if(![4,8].includes(beats)||!['right','left'].includes(direction)||options.stationShift!==1||(hasBalance?options.balanceFirst!==direction:options.balanceFirst!==undefined))throw new Error('Rory uses four travel beats or an explicit four-plus-four balance in the travel direction.');
 if(!['none','full'].includes(options.spin)||(options.spin==='none'?(options.spinAmount!==0||options.spinDirection!==undefined):(options.spinAmount!==1||options.spinDirection!==direction)))throw new Error('Rory optional styling is explicitly no turn or one full body turn in the travel direction.');
 const entry=ownConstraints(raw.entry,ids),exit=ownConstraints(raw.exit,ids),entryWave=validateRoryWave(options.entryWave,entry,ids,options.formation,options.geometry),exitWave=validateRoryWave(options.exitWave,exit,ids,options.formation,options.geometry),mapping=new Map(options.mapping.map(m=>[m.id,m.destinationId])),spin=options.spin==='full'?-sign*2*Math.PI:0;
 if(mapping.size!==ids.length||options.mapping.length!==ids.length||new Set(mapping.values()).size!==ids.length||ids.some(id=>!mapping.has(id)||!ids.includes(mapping.get(id)!)||mapping.get(mapping.get(id)!)!==id||mapping.get(id)===id))throw new Error('Rory needs a complete reciprocal named station permutation.');
 for(const id of ids){const a=entry.get(id)!,other=mapping.get(id)!,b=entry.get(other)!,e=exit.get(id)!,h=entryWave.hands.find(h=>h.handA===direction&&((h.a===id&&h.b===other)||(h.a===other&&h.b===id)));
  if(!h||distance(e.position,b.position)>EPS||Math.abs(e.yaw-a.yaw-spin)>EPS)throw new Error('Rory travel must pass the explicitly held person to that one station and retain original facing, including the exact signed body turn.');
 }
 const source=options.source?freeze(structuredClone(options.source)):undefined;if(source&&(!source.url||!source.snapshotId||!source.rowId||!source.text||source.beats!==beats))throw new Error('Rory source provenance must retain the exact row and beat count.');
 const root=(id:number,b:number):WavePose=>{const a=entry.get(id);if(!a)throw new Error('Actor is outside this bound Rory wave.');b=sampleTime(b,beats);
  if(hasBalance&&b<=4){const i=Math.min(3,Math.floor(b)),u=b-i,v=[0,1,0,-1,0],delta=v[i+1]-v[i],q=(v[i]+delta*ease(u))*.1*sign,dq=delta*ed(u)*.1*sign,ddq=delta*edd(u)*.1*sign,r=right(a.yaw);return{id,position:{x:a.position.x+r.x*q,z:a.position.z+r.z*q},yaw:a.yaw,velocity:{x:r.x*dq,z:r.z*dq},acceleration:{x:r.x*ddq,z:r.z*ddq},yawRate:0,yawAcceleration:0};}
  const[q,d,dd]=clock((b-offset)/4),dq=d/4,ddq=dd/16,target=exit.get(id)!.position,dx=target.x-a.position.x,dz=target.z-a.position.z,back={x:-Math.sin(a.yaw),z:-Math.cos(a.yaw)},clear=options.geometry?.passingBow??.44,arc=clear*Math.sin(Math.PI*q),ad=clear*Math.PI*Math.cos(Math.PI*q),add=-clear*Math.PI**2*Math.sin(Math.PI*q);
  return{id,position:{x:a.position.x+dx*q+back.x*arc,z:a.position.z+dz*q+back.z*arc},yaw:a.yaw+spin*q,velocity:{x:(dx+back.x*ad)*dq,z:(dz+back.z*ad)*dq},acceleration:{x:(dx+back.x*ad)*ddq+back.x*add*dq*dq,z:(dz+back.z*ad)*ddq+back.z*add*dq*dq},yawRate:spin*dq,yawAcceleration:spin*ddq};
 };
 const contacts=(b:number,poses:readonly Pick<Pose,'id'|'position'|'yaw'>[])=>b<=offset?waveContacts(entryWave,poses,1):b<offset+.18?waveContacts(entryWave,poses,1-ease((b-offset)/.18)):b>beats-.18?waveContacts(exitWave,poses,ease((b-(beats-.18))/.18)):[];
 const sample=(b:number)=>{b=sampleTime(b,beats);const poses=ids.map(id=>root(id,b));return{beat:b,phase:b<offset?'balance' as const:'slide' as const,poses,contacts:contacts(b,poses)};};
 let minimumObservedClearance=Infinity,maximumObservedSpeed=0,maximumObservedYawRate=0;
 for(let i=0;i<=beats*100;i++){const f=sample(i/100);for(const p of f.poses){maximumObservedSpeed=Math.max(maximumObservedSpeed,Math.hypot(p.velocity.x,p.velocity.z));maximumObservedYawRate=Math.max(maximumObservedYawRate,Math.abs(p.yawRate));}for(let a=0;a<ids.length;a++)for(let b=a+1;b<ids.length;b++)minimumObservedClearance=Math.min(minimumObservedClearance,distance(f.poses[a].position,f.poses[b].position));}
 const limits=[options.minimumClearance??.7,options.maximumSpeed??.7,options.maximumYawRate??2.1];if(!limits.every(n=>Number.isFinite(n)&&n>0)||minimumObservedClearance<limits[0]-EPS||maximumObservedSpeed>limits[1]+EPS||maximumObservedYawRate>limits[2]+EPS)throw new Error(`Rory physical budget exceeded: ${minimumObservedClearance}/${maximumObservedSpeed}/${maximumObservedYawRate}.`);
 return Object.freeze({beats,formation:options.formation,direction,spin:options.spin,entry:immutableMap(entry),exit:immutableMap(exit),entryWave,exitWave,mapping:freeze(options.mapping),source,minimumObservedClearance,maximumObservedSpeed,maximumObservedYawRate,sample,position:(id:number,t:number)=>root(id,sampleTime(t*beats,beats)).position,facing:(id:number,t:number)=>root(id,sampleTime(t*beats,beats)).yaw,contacts:(t:number,poses?:readonly Pose[])=>{const b=sampleTime(t*beats,beats);return contacts(b,poses??ids.map(id=>root(id,b)));}});
}
