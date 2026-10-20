import type {InitialWaveProgram,InitialWaveStep} from '../../src/initial-wave-source-sequence.ts';
import type {Figure} from '../../src/types.ts';
export function candidate():InitialWaveProgram{
 const figures:Figure[]=[
  {id:'first',label:'Robins cross',kind:'balance-box-circulate',beats:8,crossRole:'robin',loopRole:'lark',loopDirection:'right',phaseBeats:[4,4],balanceStyle:'right-left'},
  {id:'second',label:'Larks cross',kind:'balance-box-circulate',beats:8,crossRole:'lark',loopRole:'robin',loopDirection:'right',phaseBeats:[4,4],balanceStyle:'right-left'},
  {id:'balance',label:'Neighbor balance',kind:'balance',beats:4,who:'neighbor'},
  {id:'neighbor-swing',label:'Neighbor swing',kind:'swing',beats:12,who:'neighbor'},
  {id:'circle',label:'Circle left three places',kind:'circle',beats:8,who:'all',direction:'left',amount:.75},
  {id:'partner-swing',label:'Partner swing',kind:'swing',beats:8,who:'partner'},
  {id:'chain',label:'Chain to neighbor',kind:'robins-chain',beats:8,who:'neighbor'},
  {id:'hey',label:'Robins half hey',kind:'hey',beats:8,who:'neighbor',heyStartRole:'robin',centerShoulder:'right',endShoulder:'left',amount:.5,entry:'paired-sidelines',exit:'progressed-neighbors',progression:true},
 ];
 const steps:InitialWaveStep[]=figures.map(figure=>({figure,mode:'local'}));
 steps[0]={figure:figures[0],mode:'circulate',spec:{kind:'balance-box-circulate',beats:8,crossRole:'robin',loopRole:'lark',loopDirection:'right',phaseBeats:[4,4],balanceStyle:'right-left'}};
 steps[1]={figure:figures[1],mode:'circulate',spec:{kind:'balance-box-circulate',beats:8,crossRole:'lark',loopRole:'robin',loopDirection:'right',phaseBeats:[4,4],balanceStyle:'right-left',exit:{kind:'neighbor-balance',preparationBeats:2,pairSpacing:1.18,handAcquisitionBeats:.25}}};
 steps[6]={figure:figures[6],mode:'local',preparation:{receiverYield:.3}};
 steps[7]={figure:figures[7],mode:'wave-return',firstRole:'robin',sidePair:'neighbor',centerShoulder:'right',endShoulder:'left'};
 return{dance:{id:'explicit-initial-wave-candidate',title:'Retained paired-balance interpretation',formation:'duple-improper',figures,progressionEvents:[{afterFigureId:'hey',count:1,waitingRoleArrangement:'lark-left',source:{sourceId:'contradb:187',url:'https://contradb.com/dances/187',clause:'Terminal half hey progression glyph; retain ContraDB eight-count chain and paired balance version.',basis:'source-explicit'}}]},steps,initial:{inwardRole:'robin',localHand:'right',halfWidth:.64,rowGap:1.28},waiting:{turnBeats:8,preparationBeats:8}};
}
export function syntheticWaveBalanceCandidate():InitialWaveProgram{
 const p=candidate();p.dance.id='synthetic-wave-balance-timing';p.dance.title='Synthetic wave-balance path with eight-count chain';
 delete (p.steps[1] as any).spec.exit;
 const balance:Figure={id:'balance',label:'Balance the complete wave',kind:'wave-balance',beats:4,balanceStyle:'right-left'};
 p.dance.figures[2]=balance;p.steps[2]={figure:balance,mode:'wave-balance',spec:{kind:'wave-balance',beats:4,style:'right-left'}};
 p.steps[3]={figure:p.dance.figures[3],mode:'wave-swing',spec:{kind:'swing',beats:12,who:'neighbor'}};
 // Deliberate test timing choice: author chain4 vs retained chain8 remains unresolved.
 p.dance.progressionEvents![0].source.clause='Synthetic timing test retaining eight-count chain; author wave-balance interpretation, not source admission.';
 return p;
}
