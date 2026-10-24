import{capturePlainData}from'./owned-program-cache.ts';
/** Encounter topology for an ordinary four-person role-first half/full hey.
 * This proves named people and station permutation, not entry geometry, paths,
 * facing, contacts, progression, or the suitability of a following figure.
 */
import {ownSequenceBoundary,type SequenceBoundary} from './sequence-boundary.ts';
import type {HeyEventPlan,PassEvent,PassToken,Role} from './hey.ts';

export interface RoleHeyEncounterOptions {
 readonly entryOrder:readonly number[];
 readonly firstRole:Role;
 readonly centerShoulder:'left'|'right';
 readonly endShoulder:'left'|'right';
 readonly amount:.5|1;
 readonly beats:number;
}

export function compileRoleHeyEncounters(incoming:SequenceBoundary,raw:RoleHeyEncounterOptions):HeyEventPlan {
 const options=capturePlainData(raw);if(Object.keys(options).some(k=>!['entryOrder','firstRole','centerShoulder','endShoulder','amount','beats'].includes(k)))throw Error('Role-first hey cannot consume a first-pair discriminator.');return compileOrdinaryEncounters(incoming,options);
}
export interface PairHeyEncounterOptions extends Omit<RoleHeyEncounterOptions,'firstRole'>{readonly firstPair:'partner'|'neighbor';}
export function compilePairHeyEncounters(incoming:SequenceBoundary,raw:PairHeyEncounterOptions):HeyEventPlan{
 const options=capturePlainData(raw);if(Object.keys(options).some(k=>!['entryOrder','firstPair','centerShoulder','endShoulder','amount','beats'].includes(k))||!['partner','neighbor'].includes(options.firstPair))throw Error('Pair-first hey needs an explicit named first relation.');return compileOrdinaryEncounters(incoming,options);
}
function compileOrdinaryEncounters(incoming:SequenceBoundary,options:RoleHeyEncounterOptions|PairHeyEncounterOptions):HeyEventPlan{
 const boundary=ownSequenceBoundary(incoming);
 const {entryOrder,centerShoulder,endShoulder,amount,beats}=options,firstPair='firstPair'in options?options.firstPair:undefined,firstRole='firstRole'in options?options.firstRole:undefined;
 if(!firstPair&&!['lark','robin'].includes(firstRole??'')||!['left','right'].includes(centerShoulder)||!['left','right'].includes(endShoulder)||centerShoulder===endShoulder)throw Error('An ordinary role-first hey requires a named first role and opposite center/end shoulders.');
 if(![.5,1].includes(amount)||!Number.isFinite(beats)||beats<=0||beats>64)throw Error('An ordinary role-first hey requires half/full amount and explicit positive timing up to 64 counts.');
 const actors=new Map(boundary.actors.map(a=>[a.id,a]));
 if(!Array.isArray(entryOrder)||entryOrder.length!==4||new Set(entryOrder).size!==4||entryOrder.some(id=>!actors.has(id)))throw Error('Hey entry order must contain each carried actor exactly once.');
 if(firstRole&&entryOrder.some((id,slot)=>(actors.get(id)!.role===firstRole)!==(slot===1||slot===2)))throw Error('Hey entry order must place the named first role in the center and the other role at the ends.');
 const partner=new Map(boundary.partner),neighbor=new Map(boundary.neighbor);
 if(firstPair){const relation=new Map(boundary[firstPair]);for(const[a,b]of[[entryOrder[0],entryOrder[1]],[entryOrder[2],entryOrder[3]]])if(relation.get(a)!==b||relation.get(b)!==a)throw Error('First side passages must be the actual named pairs.');}
 let order=[...entryOrder];const events:PassEvent[]=[],tokens:PassToken[]=[];
 for(let layer=0;layer<amount*8;layer++){
  const center=layer%2===(firstPair?1:0);
  const pairs:[number,number][]=center?[[order[1],order[2]]]:[[order[0],order[1]],[order[2],order[3]]];
  const selectors=pairs.map(([a,b]):PassToken['selector']=>{
   const A=actors.get(a)!,B=actors.get(b)!;
   if(center){if(A.role!==B.role)throw Error('A center passage must join the same role.');return A.role==='lark'?'larks':'robins';}
   // Maps, rather than matching/differing couple numbers, establish encounters.
   if(partner.get(a)===b&&partner.get(b)===a)return 'partner';
   if(neighbor.get(a)===b&&neighbor.get(b)===a)return 'neighbor';
   throw Error('A side passage has no reciprocal carried partner or current-neighbor binding.');
  });
  if(selectors.some(s=>s!==selectors[0]))throw Error('Simultaneous side encounters must share their explicit relationship.');
  const selector=selectors[0],shoulder=center?centerShoulder:endShoulder;
  const raw=({larks:'M',robins:'W',partner:'P',neighbor:'N'}[selector])+(shoulder==='right'?'R':'L');
  const token:PassToken={raw,selector,...(selector==='neighbor'?{neighborOrdinal:1}:{}),shoulder,completion:'complete'};
  const before=[...order];
  if(center)[order[1],order[2]]=[order[2],order[1]];
  else{[order[0],order[1]]=[order[1],order[0]];[order[2],order[3]]=[order[3],order[2]];}
  tokens.push(token);events.push({token,phase:center?'center':'sides',pairs:pairs.map(([a,b])=>[String(a),String(b)]),loopers:center?[String(before[0]),String(before[3])]:[],incomingOrder:before.map(String),outgoingOrder:order.map(String)});
 }
 const expected=amount===1?entryOrder:[...entryOrder].reverse();
 if(order.some((id,slot)=>id!==expected[slot]))throw Error('Ordinary hey encounter permutation failed.');
 const source=`(${beats}) Hey${amount===.5?' 1/2':''} (${tokens.map(t=>t.raw).join(';')})`;
 return{syntax:{source,beats,fraction:amount,axis:'across',tokens},events,endOrder:order.map(String),needsPartialExit:false};
}
