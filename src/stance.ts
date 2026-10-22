import {ACTIVE_SWING_PREPARATION_BEATS,assertActiveSwingPreparationSequence} from './active-swing-preparation.ts';
import {squareThroughPreparationBeats} from './square-through-adapter.ts';
import type {CompiledDance,Frame,HandContact,Pose,Vec2} from './types.ts';
const smooth=(x:number)=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x);};
const closeSpacing=1.18;
interface PairStance {a:number;b:number;deltaA:Vec2;deltaB:Vec2;hands?:'right';}
/** Composes a reachable standing handhold with the formation trajectory. Source
 * identity/slot trajectories remain inspectable through formationSample; actual
 * roots gather during the previous figure, not on count 1 of the balance. */
export function withBalanceStance<T extends CompiledDance>(compiled:T):T {
 const activePreparation=assertActiveSwingPreparationSequence(compiled.dance.figures);
 if(compiled.formationSample)return compiled;
 const figures=compiled.dance.figures,eligible=(i:number)=>figures[i]?.kind==='balance'&&['partner','neighbor'].includes(figures[i].who??'')&&((figures[i+1]?.kind==='swing'&&figures[i].hands===undefined)||(figures[i+1]?.kind==='box-the-gnat'&&figures[i].hands==='right'))&&figures[i+1].who===figures[i].who;
 if(!figures.some((_,i)=>eligible(i)))return compiled;
 const targets=new Map<number,PairStance[]>();
 function target(beat:number):PairStance[]{
  if(targets.has(beat))return targets.get(beat)!;
  const frame=compiled.sample(beat),pairs:PairStance[]=[],right=figures[frame.figureIndex].hands==='right',spacing=right?1.10:closeSpacing;
  for(const p of frame.poses){const other=p.balance?.otherId;if(other===undefined||p.id>other)continue;const q=frame.poses[other];if(q.balance?.otherId!==p.id)throw new Error('Balance stance requires explicit reciprocal actor bindings.');
   const length=Math.hypot(p.position.x-q.position.x,p.position.z-q.position.z);if(length<.9-.001)throw new Error('Balance stance entry is too close for this adapter.');
   const amount=(1-spacing/length)/2,deltaA={x:(q.position.x-p.position.x)*amount,z:(q.position.z-p.position.z)*amount};pairs.push({a:p.id,b:other,deltaA,deltaB:{x:-deltaA.x,z:-deltaA.z},...(right?{hands:'right' as const}:{})});
  }
  if(targets.size>=64)targets.delete(targets.keys().next().value!);targets.set(beat,pairs);return pairs;
 }
 function balanceHands(pairs:PairStance[],poses:Pose[],strength:number):HandContact[]{
  return pairs.flatMap(pair=>{
   const a=compiled.dancers[pair.a].role==='lark'?pair.a:pair.b,b=a===pair.a?pair.b:pair.a,A=poses[a],B=poses[b],mid={x:(A.position.x+B.position.x)/2,z:(A.position.z+B.position.z)/2};
   if(pair.hands==='right')return[{a,b,handA:'right',handB:'right',point:{...mid,y:1.24},strength,kind:'joined'}];
   return (['left','right'] as const).map(hand=>{const sign=hand==='left'?1:-1;return{a,b,handA:hand,handB:hand==='left'?'right' as const:'left' as const,point:{x:mid.x+sign*.22*Math.cos(A.yaw),y:1.24,z:mid.z-sign*.22*Math.sin(A.yaw)},strength,kind:'joined' as const};});
  });
 }
 const balancePreparations=activePreparation?Object.freeze([Object.freeze({figureId:figures.at(-1)!.id,targetFigureId:figures[0].id,sourceStart:compiled.totalBeats-ACTIVE_SWING_PREPARATION_BEATS,sourceEnd:compiled.totalBeats,duration:ACTIVE_SWING_PREPARATION_BEATS,targetBinding:'next-cycle-actual-neighbors' as const,formationSample:'before-balance-preparation' as const})]):compiled.balancePreparations;
 return {...compiled,...(balancePreparations?{balancePreparations}:{}),formationSample:compiled.sample,sample(beat:number):Frame {
  const frame=compiled.sample(beat),fi=frame.figureIndex,figure=figures[fi],inBalance=eligible(fi);
  let pairs:PairStance[]=[],weight=0,preparing=false;
  if(inBalance){pairs=target(frame.repeat*compiled.totalBeats+compiled.starts[fi]);weight=1-smooth(frame.figureProgress*2);}
  else{const next=(fi+1)%figures.length,wrap=fi===figures.length-1;if(eligible(next)&&(!wrap||compiled.repeatable)){
   const declared=balancePreparations?.find(p=>p.figureId===figure.id);if(figure.preparation!==undefined&&!declared)throw new Error('A declared exit preparation has no compiled adapter window.');const duration=declared?.duration??squareThroughPreparationBeats(figure)??((figure.kind==='hey'&&figure.heyStartRole!==undefined)||figure.kind==='ricochet-hey'?1:figure.kind==='hey'&&['opposite-neighbor-balance','opposite-paired-balance','progressed-neighbors'].includes(figure.exit??'')?.5:Math.min(2,figure.beats*.25)),remaining=figure.beats*(1-frame.figureProgress);if(remaining<duration){pairs=target((frame.repeat+Number(wrap))*compiled.totalBeats+compiled.starts[next]);weight=smooth(1-remaining/duration);preparing=true;}
  }}
  // The closed-frame handoff is already planned in root space. Reapplying
  // reach attenuation here would square its strength and create a wrist jump.
  if(!pairs.length||inBalance&&figure.hands!=='right'&&frame.figureProgress>=.8125)return frame;
  const offsets=new Map<number,Vec2>();for(const p of pairs){offsets.set(p.a,{x:p.deltaA.x*weight,z:p.deltaA.z*weight});offsets.set(p.b,{x:p.deltaB.x*weight,z:p.deltaB.z*weight});}
  const poses=frame.poses.map(p=>{const d=offsets.get(p.id);return d?{...p,...(preparing&&p.activity==='waiting'&&Math.hypot(d.x,d.z)>1e-10?{stride:1}:{}),position:{x:p.position.x+d.x,z:p.position.z+d.z}}:p;});
  const changingFromArch=inBalance&&figures[fi-1]?.kind==='box-the-gnat'&&figures[fi-1].who!==figure.who;
  if(changingFromArch||preparing&&figure.kind==='box-the-gnat'&&figures[fi+1]?.who!==figure.who){const turnWeight=inBalance?1:smooth((frame.figureProgress-.875)/.125);for(const pair of pairs)for(const[id,other]of[[pair.a,pair.b],[pair.b,pair.a]]){const p=poses[id],q=poses[other],wanted=Math.atan2(q.position.x-p.position.x,q.position.z-p.position.z);p.yaw+=Math.atan2(Math.sin(wanted-p.yaw),Math.cos(wanted-p.yaw))*turnWeight;}}
  let contacts:HandContact[];
  if(inBalance)contacts=figure.hands==='right'||frame.figureProgress<.8125?balanceHands(pairs,poses,1):frame.contacts;
  else{
   contacts=frame.contacts.map(c=>{const a=offsets.get(c.a)??{x:0,z:0},b=offsets.get(c.b)??{x:0,z:0},d=c.target&&c.target!=='hands'||['robins-chain','ladies-chain','larks-chain'].includes(figure.kind)&&c.kind==='courtesy'&&c.handA===(poses[c.b].chainCourtesyPreparation?.waistHand??'right')&&c.handB===c.handA?b:{x:(a.x+b.x)/2,z:(a.z+b.z)/2};return{...c,point:{...c.point,x:c.point.x+d.x,z:c.point.z+d.z}};});
   if(preparing&&weight>.65){const occupied=new Set<string>();for(const c of contacts){occupied.add(`${c.a}:${c.handA}`);if(!c.target||c.target==='hands')occupied.add(`${c.b}:${c.handB}`);}
    for(const c of balanceHands(pairs,poses,smooth((weight-.65)/.35)))if(!occupied.has(`${c.a}:${c.handA}`)&&!occupied.has(`${c.b}:${c.handB}`))contacts.push(c);
   }
  }
  contacts=contacts.map(c=>{const reach=(id:number,hand:'left'|'right')=>{const p=poses[id],side=hand==='left'?1:-1;return Math.hypot(c.point.x-p.position.x-side*.235*Math.cos(p.yaw),c.point.y-1.355,c.point.z-p.position.z+side*.235*Math.sin(p.yaw));},distance=Math.max(reach(c.a,c.handA),c.target&&c.target!=='hands'?0:reach(c.b,c.handB));return{...c,strength:c.strength*smooth((.68-distance)/(c.kind==='swing-frame'?.035:.06))};}).filter(c=>c.strength>(['robins-chain','ladies-chain','larks-chain'].includes(figure.kind)?0:.01));
  return {...frame,poses,contacts};
 }};
}
