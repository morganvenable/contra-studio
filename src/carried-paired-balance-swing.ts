/** Counted balance/swing from actual two-hand pairs after a full-wave exit. */
import {capturePlainData} from './owned-program-cache.ts';
import {compileHeldPairBalanceStep} from './held-pair-balance-step.ts';
import {compilePrimitiveFigure,makeBalanceCue} from './engine.ts';
import {captureSequenceBoundary,sampleSequenceBoundary,assertSequenceHandoff,advanceSequenceBeat} from './sequence-boundary.ts';
import type {CarriedPairedBalanceState} from './carried-wave-circulate.ts';
import type {Dancer,Pose,HandContact} from './types.ts';
export interface CarriedPairedBalanceSwingSpec {beats:16;phaseBeats:readonly[4,12];who:'partner'|'neighbor';frameReleaseBeats:1;}
const smooth=(x:number)=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x);};
const freeze=<T>(value:T):T=>{if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};
const copy=(p:Pose):Pose=>({...p,position:{...p.position}});
const wrap=(x:number)=>Math.atan2(Math.sin(x),Math.cos(x));
export function compileCarriedPairedBalanceSwing(raw:CarriedPairedBalanceSwingSpec,input:CarriedPairedBalanceState){
 const spec=capturePlainData(raw),entry=capturePlainData(input);
 if(Object.keys(spec).some(k=>!['beats','phaseBeats','who','frameReleaseBeats'].includes(k))||spec.beats!==16||spec.phaseBeats?.join(',')!=='4,12'||!['partner','neighbor'].includes(spec.who)||spec.frameReleaseBeats!==1||entry.exit.kind!==`${spec.who}-balance`||entry.exit.pairSpacing!==1.18)throw Error('Paired balance/swing needs actual named balance entry, explicit4+12 counts and one-count frame release.');
 if(Object.keys(entry).some(k=>!['sourceBeat','bindingEpoch','actors','poses','partner','neighbor','boxPartitions','heldContacts','waitingIds','exit'].includes(k)))throw Error('Unconsumed paired balance/swing boundary field.');
 if(Object.keys(entry.exit).some(k=>!['kind','pairSpacing'].includes(k))||!Number.isSafeInteger(entry.bindingEpoch)||entry.bindingEpoch<0||entry.actors.some(a=>!Number.isSafeInteger(a.id)||a.id<0||!Number.isSafeInteger(a.couple)||a.couple<0||!['lark','robin'].includes(a.role))||entry.poses.some(p=>![p.position.x,p.position.z,p.yaw].every(Number.isFinite)))throw Error('Paired boundary must preserve finite clocks, actors and poses.');
 const endBeat=advanceSequenceBeat(entry.sourceBeat,16);
 const publicIds=entry.actors.map(a=>a.id),index=new Map(publicIds.map((id,i)=>[id,i])),dense=(id:number)=>{const i=index.get(id);if(i===undefined)throw Error('Unknown carried actor.');return i;};
 const dancers:Dancer[]=entry.actors.map((a,id)=>({...a,id,name:String(a.id),direction:1,color:''}));
 const start=publicIds.map((id,i)=>{const p=entry.poses.find(p=>p.id===id);if(!p)throw Error('Missing actual pose.');return{...copy(p),id:i};});
 const partner=new Map(entry.partner.map(([a,b])=>[dense(a),dense(b)])),neighbor=new Map(entry.neighbor.map(([a,b])=>[dense(a),dense(b)]));
 const active=entry.boxPartitions.flat(),waiting=entry.waitingIds??[];
 if(new Set(publicIds).size!==publicIds.length||new Set([...active,...waiting]).size!==publicIds.length||active.length+waiting.length!==publicIds.length||[...active,...waiting].some(id=>!index.has(id))||entry.poses.length!==publicIds.length)throw Error('Pairs and waiting actors must partition the carried set.');
 const plans=entry.boxPartitions.map(box=>{
  const ids=box.map(dense),held=entry.heldContacts.filter(h=>box.includes(h.a)||box.includes(h.b));
  if(held.some(h=>!box.includes(h.a)||!box.includes(h.b)))throw Error('Paired balance cannot discard a between-box wave hand.');
  const contacts=held.map(h=>({...h,a:dense(h.a),b:dense(h.b)}));
  const swingFigure={id:'counted-swing',label:'Named swing',kind:'swing' as const,who:spec.who,beats:12};
  const context={ids,dancers,start,bindingEpoch:entry.bindingEpoch,relations:{epoch:entry.bindingEpoch,partner,neighbor},next:swingFigure};
  const boundary=captureSequenceBoundary(context,entry.sourceBeat,contacts),balance=compileHeldPairBalanceStep({id:'counted-balance',label:'Named balance',kind:'balance',who:spec.who,beats:4},context,boundary);
  const swingStart=start.map(p=>ids.includes(p.id)?{...p,position:balance.position(p.id,1),yaw:balance.facing(p.id,1,start)}:copy(p));
  const swing=compilePrimitiveFigure(swingFigure,ids,swingStart,dancers,[],{swingEntry:'two-hand-balance',canonicalSwingLayout:true,geometry:{halfWidth:.64,rowGap:1.28}});
  assertSequenceHandoff(balance.exitState,sampleSequenceBoundary({...context,start:swingStart,next:undefined},swing,entry.sourceBeat+4,0));
  return{ids,balance,swing};
 });
 if(entry.heldContacts.some(h=>!active.includes(h.a)||!active.includes(h.b)))throw Error('Waiting actors cannot have unconsumed paired hands.');
 const sample=(count:number)=>{
  if(!Number.isFinite(count))throw Error('Paired swing count must be finite.');const beat=Math.max(0,Math.min(16,count)),poses=start.map(copy),contacts:HandContact[]=[];
  for(const {ids,balance,swing}of plans){const plan=beat<=4?balance:swing,t=beat<=4?beat/4:(beat-4)/12;for(const id of ids){poses[id].position=plan.position(id,t);poses[id].yaw=plan.facing(id,t,poses);poses[id].balance=plan.balance?.(id,t)??(beat<=4?makeBalanceCue({id:'balance',label:'Balance',kind:'balance',who:spec.who,beats:4},id,ids,dancers,t):undefined);poses[id].swingPreparation=plan.swingPreparation?.(id,t);poses[id].chainCourtesyPreparation=undefined;}const release=beat<=4?1:1-smooth((beat-4-(12*.82-spec.frameReleaseBeats))/spec.frameReleaseBeats);contacts.push(...plan.contacts(t,poses).map(h=>({...h,strength:h.strength*release})).filter(h=>h.strength>1e-9));}
  return{poses:poses.map((p,id)=>({...p,id:publicIds[id],...(p.balance?{balance:{...p.balance,otherId:publicIds[p.balance.otherId]}}:{})})),contacts:contacts.map(h=>({...h,a:publicIds[h.a],b:publicIds[h.b]}))};
 };
 let maximumObservedSpeed=0,maximumObservedYawRate=0,minimumObservedClearance=Infinity,maximumObservedReach=0,previous=sample(0);
 const receivers=new Map(entry[spec.who]);
 for(let tick=1;tick<=16*64;tick++){const frame=sample(tick/64),poses=new Map(frame.poses.map(p=>[p.id,p]));for(const p of frame.poses){const q=previous.poses.find(q=>q.id===p.id)!;maximumObservedSpeed=Math.max(maximumObservedSpeed,Math.hypot(p.position.x-q.position.x,p.position.z-q.position.z)*64);maximumObservedYawRate=Math.max(maximumObservedYawRate,Math.abs(wrap(p.yaw-q.yaw))*64);}for(let a=0;a<frame.poses.length;a++)for(let b=a+1;b<frame.poses.length;b++)minimumObservedClearance=Math.min(minimumObservedClearance,Math.hypot(frame.poses[a].position.x-frame.poses[b].position.x,frame.poses[a].position.z-frame.poses[b].position.z));const hands=new Set<string>();for(const h of frame.contacts){if(receivers.get(h.a)!==h.b)throw Error('Balance/swing contact changed its carried receiver.');for(const[id,hand]of[[h.a,h.handA],...(!h.target||h.target==='hands'?[[h.b,h.handB]]:[])]as[number,string][]){const key=`${id}:${hand}`;if(hands.has(key))throw Error('Paired swing assigns two targets to a hand.');hands.add(key);const p=poses.get(id)!,sign=hand==='left'?1:-1;maximumObservedReach=Math.max(maximumObservedReach,Math.hypot(h.point.x-p.position.x-sign*.235*Math.cos(p.yaw),h.point.y-1.355,h.point.z-p.position.z+sign*.235*Math.sin(p.yaw)));}}previous=frame;}
 if(maximumObservedSpeed>1.8+1e-5||maximumObservedYawRate>3.2+1e-5||minimumObservedClearance<.45-1e-6||maximumObservedReach>.64+1e-7)throw Error('Paired balance/swing exceeds existing full-set motion or hand envelope.');
 const final=sample(16),exitState=freeze({...entry,sourceBeat:endBeat,poses:final.poses,heldContacts:final.contacts,exit:{kind:'released-paired-swing' as const,who:spec.who}});
 return Object.freeze({beats:16,sample,exitState,maximumObservedSpeed,maximumObservedYawRate,minimumObservedClearance,maximumObservedReach});
}

