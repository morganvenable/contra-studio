import type {ShortWaveSourceDance} from '../../src/wave-source-sequence.ts';
export const UNDERCURRENT:ShortWaveSourceDance={id:'contradb-1992-short-wave-candidate',title:'Undercurrent',author:'Jacqui Grennan',formation:'duple-improper',sourceUrl:'https://contradb.com/dances/1992',description:'Complete retained-source wave candidate, not public registration.',figures:[
 {id:'lines',kind:'long-lines',beats:8,label:'Long lines forward and back',who:'all'},
 {id:'wave',kind:'pass-to-wave-balance',beats:8,label:'Pass through to an ocean wave and balance',centerRole:'lark',sideRelation:'neighbor',passingShoulder:'right',centerHand:'left',sideHand:'right',entry:'facing-couples-across',phaseBeats:[4,4],balanceStyle:'right-left'},
 {id:'neighbor-half',kind:'allemande',beats:2,label:'Neighbors allemande right halfway',who:'neighbor',direction:'right',amount:.5,entry:'short-wave',exit:'short-wave'},
 {id:'robin-half',kind:'allemande',beats:2,label:'Robins allemande left halfway',who:'robins',direction:'left',amount:.5,entry:'short-wave',exit:'partner-swing'},
 {id:'partner-swing',kind:'swing',beats:12,label:'Partners swing',who:'partner',entry:'short-wave-partners'},
 {id:'through',kind:'right-left-through',beats:8,label:'Right and left through',who:'partner',direction:'right',courtesyLeader:'lark',crossingRelation:'neighbor'},
 {id:'robin-turn',kind:'allemande',beats:8,label:'Robins allemande right one and a half',who:'robins',direction:'right',amount:1.5},
 {id:'neighbor-balance',kind:'balance',beats:4,label:'Neighbors balance',who:'neighbor'},
 {id:'neighbor-swing',kind:'swing',beats:12,label:'Neighbors swing and progress',who:'neighbor',progression:true}
],progressionEvents:[{afterFigureId:'neighbor-swing',count:1,waitingRoleArrangement:'lark-left',source:{sourceId:'1992',url:'https://contradb.com/dances/1992',clause:'neighbors balance & swing ⁋; explicit 4+12 timing, progression after the swing',basis:'reviewed-interpretation'}}]};
