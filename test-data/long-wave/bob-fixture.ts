import type {LongWaveSourceDance} from '../../src/long-wave-source-sequence.ts';
export const BOB_THE_SURFER:LongWaveSourceDance={id:'contradb-1591-long-wave-candidate',title:'Bob the Surfer',author:'Dugan Murphy',formation:'duple-improper',sourceUrl:'https://contradb.com/dances/1591',description:'Complete retained-source full-set wave candidate, pending public registration.',figures:[
 {id:'neighbor-balance',kind:'balance',beats:4,label:'Neighbors balance',who:'neighbor'},
 {id:'neighbor-swing',kind:'swing',beats:12,label:'Neighbors swing',who:'neighbor'},
 {id:'lark-turn',kind:'allemande',beats:8,label:'Larks allemande left one and a half',who:'larks',direction:'left',amount:1.5},
 {id:'partner-swing',kind:'swing',beats:8,label:'Partners swing',who:'partner'},
 {id:'circle',kind:'circle',beats:8,label:'Circle left three places',who:'all',direction:'left',amount:.75},
 {id:'neighbor-turn',kind:'allemande',beats:8,label:'Neighbors allemande right one and a half to long waves',who:'neighbor',direction:'right',amount:1.5,exit:'long-waves',inwardRole:'lark',outwardRole:'robin'},
 {id:'lark-circulate',kind:'balance-box-circulate',beats:8,label:'Balance; larks cross while robins loop right',phaseBeats:[4,4],balanceStyle:'right-left',crossRole:'lark',loopRole:'robin',loopDirection:'right',entry:'long-waves',exit:'long-waves'},
 {id:'robin-circulate',kind:'balance-box-circulate',beats:8,label:'Balance; robins cross while larks loop right; look to next neighbors',phaseBeats:[4,4],balanceStyle:'right-left',crossRole:'robin',loopRole:'lark',loopDirection:'right',entry:'long-waves',exit:'progressed-neighbors',progression:true}
],notes:['The source zero-count setup is the preceding allemande exit, with no added movement.','Reviewed phase interpretation: each eight-count balance/circulate row is 4+4; opening balance/swing is 4+12.'],progressionEvents:[{afterFigureId:'robin-circulate',count:1,waitingRoleArrangement:'lark-left',source:{sourceId:'1591',url:'https://contradb.com/dances/1591',clause:'ladles cross while gentlespoons loop right, look to next neighbors ⁋',basis:'source-explicit'}}]};
