/** Explicit interpretation choices for initial waves and their finite return.
 * Preparation keys name local figure declarations, never source identities. */
import {capturePlainData} from './owned-program-cache.ts';
import {compileInitialWaveSequence,assertInitialWaveReturnModifiers,type InitialWaveStep} from './initial-wave-source-sequence.ts';
import type {Dance,Role} from './types.ts';
export type InitialWavePreparation=
 |{kind:'neighbor-balance';preparationBeats:2;pairSpacing:1.18;handAcquisitionBeats:.25}
 |{kind:'receiver-yield';receiverYield:.3};
export interface InitialWavePolicy {
 inwardRole:Role;neighborHand:'right';halfWidth:.64;rowGap:1.28;
 waiting:{turnBeats:8;preparationBeats:8};
 preparations:Record<string,InitialWavePreparation>;
 terminal:{figureId:string;exit:'next-long-wave'};
}
const freeze=<T>(x:T):T=>{if(x&&typeof x==='object'){Object.values(x).forEach(freeze);Object.freeze(x);}return x;};
function record(x:unknown,allowed:readonly string[]){
 if(!x||typeof x!=='object'||Array.isArray(x)||Object.keys(x).some(k=>!allowed.includes(k)))throw Error('Initial-wave policy contains missing or unconsumed fields.');
}
export function validateInitialWavePolicy(input:unknown):InitialWavePolicy{
 const p=capturePlainData(input) as InitialWavePolicy;
 record(p,['inwardRole','neighborHand','halfWidth','rowGap','waiting','preparations','terminal']);
 // The current finite initial layout has right-hand neighbors and robins in.
 // Role-swapped geometry needs its own initial positions, not a heading reset.
 if(p.inwardRole!=='robin'||p.neighborHand!=='right'||p.halfWidth!==.64||p.rowGap!==1.28)throw Error('Initial-wave policy requires the supported compact right-neighbor, robins-in formation.');
 record(p.waiting,['turnBeats','preparationBeats']);if(p.waiting.turnBeats!==8||p.waiting.preparationBeats!==8)throw Error('Initial-wave waiting motion requires explicit eight-count exchange and reentry preparation.');
 record(p.terminal,['figureId','exit']);if(typeof p.terminal.figureId!=='string'||!p.terminal.figureId.trim()||p.terminal.exit!=='next-long-wave')throw Error('Initial-wave return must name its terminal figure and next-wave endpoint.');
 if(!p.preparations||typeof p.preparations!=='object'||Array.isArray(p.preparations))throw Error('Initial-wave preparation choices must be an explicit figure-keyed record.');
 for(const[id,choice]of Object.entries(p.preparations)){
  if(!id.trim())throw Error('Preparation requires a figure identity.');
  if(choice?.kind==='neighbor-balance'){record(choice,['kind','preparationBeats','pairSpacing','handAcquisitionBeats']);if(choice.preparationBeats!==2||choice.pairSpacing!==1.18||choice.handAcquisitionBeats!==.25)throw Error('Circulate balance preparation must retain its supported timed endpoint.');}
  else if(choice?.kind==='receiver-yield'){record(choice,['kind','receiverYield']);if(choice.receiverYield!==.3)throw Error('Compact chain preparation requires its explicit receiver yield.');}
  else throw Error('Unknown initial-wave preparation.');
 }
 return freeze(p);
}
export function compileInitialWavePolicyDance(input:Dance,couples:number){
 const dance=freeze(capturePlainData(input)),policy=validateInitialWavePolicy(dance.initialWavePolicy);
 const ids=new Set(dance.figures.map(f=>f.id));
 if(ids.size!==dance.figures.length||Object.keys(policy.preparations).some(id=>!ids.has(id))||policy.terminal.figureId!==dance.figures.at(-1)?.id)throw Error('Initial-wave choices must name unique existing figures and the actual terminal figure.');
 const steps:InitialWaveStep[]=dance.figures.map((figure,index)=>{
  const prep=policy.preparations[figure.id];
  if(figure.id===policy.terminal.figureId){
   assertInitialWaveReturnModifiers(figure);
   if(prep||figure.kind!=='hey'||figure.amount!==.5||figure.beats!==8||figure.exit!=='next-long-waves'||!figure.progression||!['neighbor','partner'].includes(figure.who??'')||!figure.heyStartRole||!figure.centerShoulder||!figure.endShoulder)throw Error('Initial-wave return requires an explicit source-counted progressing role half hey.');
   return{figure,mode:'wave-return',firstRole:figure.heyStartRole,sidePair:figure.who as 'neighbor'|'partner',centerShoulder:figure.centerShoulder,endShoulder:figure.endShoulder};
  }
  if(figure.kind==='balance-box-circulate'||figure.kind==='box-circulate'){
   if(figure.entry!=='long-waves'||figure.progression||!figure.crossRole||!figure.loopRole||figure.loopDirection!=='right'||prep&&prep.kind!=='neighbor-balance'||figure.exit!==(prep?'paired-neighbor-balance':'long-waves'))throw Error('A circulation must retain its actual wave entry and explicitly selected exit.');
   if(prep&&(dance.figures[index+1]?.kind!=='balance'||dance.figures[index+1]?.who!=='neighbor'))throw Error('Neighbor-balance preparation must actually feed the named next balance.');
   const spec={kind:figure.kind,beats:figure.beats as 4|8,crossRole:figure.crossRole,loopRole:figure.loopRole,loopDirection:figure.loopDirection,...(figure.kind==='balance-box-circulate'?{phaseBeats:figure.phaseBeats as [4,4],balanceStyle:figure.balanceStyle}:{}),...(prep?{exit:prep}:{})};
   return{figure,mode:'circulate',spec};
  }
  if(prep){if(prep.kind!=='receiver-yield'||!['robins-chain','ladies-chain'].includes(figure.kind))throw Error('A compact receiver yield must be consumed by an actual chain.');return{figure,mode:'local',preparation:{receiverYield:prep.receiverYield}};}
  return{figure,mode:'local'};
 });
 const{initialWavePolicy:_policy,...execution}=dance;
 const compiled=compileInitialWaveSequence({dance:execution,steps,initial:{inwardRole:policy.inwardRole,localHand:policy.neighborHand,halfWidth:policy.halfWidth,rowGap:policy.rowGap},waiting:policy.waiting},couples);
 return Object.freeze({...compiled,dance});
}
