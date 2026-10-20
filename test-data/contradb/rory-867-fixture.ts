import type {Dance} from '../../src/types.ts';
export const RORY_867:Dance={id:'source-867-rory',title:'Sugarbritches 2.0 allemande variation',author:'Dana Parkinson',formation:'duple-improper',sourceUrl:'https://contradb.com/dances/867',description:'Exact source-counted short wave and matched-allemande variation. Source-omitted Rory balance/spin and six-plus-two partner frame timing are explicitly reviewed.',figures:[
 {id:'r0',kind:'form-short-wave',beats:2,label:'Advance to short wave',entry:'facing-neighbor-sidelines',exit:'short-wave',centerRole:'robin',sideRelation:'neighbor',centerHand:'left',sideHand:'right'},
 {id:'r2',kind:'balance-rory-slide',beats:8,label:'Balance and Rory right',who:'all',entry:'short-wave',exit:'short-wave',direction:'right',stationShift:1,balanceFirst:'right',spin:'none',spinAmount:0,phaseBeats:[4,4]},
 {id:'r3',kind:'allemande',beats:6,label:'Neighbors allemande left one and a half',who:'neighbor',direction:'left',amount:1.5,entry:'short-wave',exit:'short-wave'},
 {id:'r4',kind:'allemande',beats:8,label:'Robins allemande right one and a half',who:'robins',direction:'right',amount:1.5,entry:'short-wave',exit:'partner-swing',phaseBeats:[6,2]},
 {id:'r5',kind:'swing',beats:8,label:'Partners swing',who:'partner'},
 {id:'r6',kind:'circle',beats:8,label:'Circle left three places',who:'all',direction:'left',amount:.75},
 {id:'r7',kind:'swing',beats:8,label:'Neighbors swing',who:'neighbor'},
 {id:'r8',kind:'long-lines',beats:8,label:'Long lines forward and back',who:'all'},
 {id:'r9',kind:'star',beats:8,label:'Star left once and progress',who:'all',direction:'left',amount:1,progression:true}
],progressionEvents:[{afterFigureId:'r9',count:1,waitingRoleArrangement:'lark-left',source:{sourceId:'contradb:867:e0fec02cebf7b8d1',url:'https://contradb.com/dances/867',clause:'star left 4 places ⁋',basis:'source-explicit'}}],endPolicy:{waitingRoleArrangement:'lark-left',sameEndTurnBeats:8,reentryPreparationBeats:0,source:{sourceId:'contradb:867:e0fec02cebf7b8d1',url:'https://contradb.com/dances/867',clause:'Reviewed finite-end convention: out couples exchange sides at the same end during the first eight counts, then wait until their next active round.',basis:'reviewed-interpretation'}}};
