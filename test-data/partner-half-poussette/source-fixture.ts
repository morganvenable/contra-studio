import {figure} from './fixture.ts';
import type {Dance} from '../../src/types.ts';
export const source={sourceId:'contradb:2226:row:7',url:'https://contradb.com/dances/2226',clause:'partners California twirl then join two hands ⁋',basis:'source-explicit' as const};
export const policy={waitingRoleArrangement:'lark-left' as const,sameEndTurnOffsetBeats:4 as const,sameEndTurnBeats:8 as const,waitingHands:'release-during-exchange' as const,reentryPreparationBeats:4 as const,source:{...source,basis:'reviewed-interpretation' as const,clause:'Reviewed compact partner hold and finite end policy: exchange at the same end during counts 4–12 with released hands, then prepare/rejoin within the final four counts.'}};
export const dance={id:'contradb:2226',title:"Yoyo's Ma",author:'Susan Petrick',formation:'duple-improper',sourceUrl:source.url,description:'Source-qualified partner half poussette composition',figures:[
 {...figure,id:'contradb:2226:row:0'},
 {id:'contradb:2226:row:1',kind:'swing',who:'neighbor',beats:8,label:'Neighbors swing'},
 {id:'contradb:2226:row:2',kind:'robins-chain',who:'partner',beats:8,label:'Robins chain to partner'},
 {id:'contradb:2226:row:3',kind:'hey',who:'partner',beats:8,label:'Robins start half hey',amount:.5,heyStartRole:'robin',centerShoulder:'right',endShoulder:'left',entry:'paired-sidelines',exit:'opposite-paired-balance'},
 {id:'contradb:2226:row:4:balance',kind:'balance',who:'partner',beats:4,label:'Partner balance'},
 {id:'contradb:2226:row:4:swing',kind:'swing',who:'partner',beats:12,label:'Partner swing'},
 {id:'contradb:2226:row:5',kind:'circle',who:'all',direction:'left',amount:.75,beats:8,label:'Circle left three places'},
 {id:'contradb:2226:row:6',kind:'ring-balance',who:'all',hands:'both',exit:'partner-california-twirl',beats:4,label:'Balance the ring'},
 {id:'contradb:2226:row:7',kind:'california-twirl',who:'partner',hands:'right-left',underRole:'robin',direction:'right',amount:.5,entry:'side-by-side-facing-same',exit:'partner-two-hand-hold',phaseBeats:[3,1],beats:4,label:'Partner California twirl, then join two hands',progression:true}
],endPolicy:policy,progressionEvents:[{afterFigureId:'contradb:2226:row:7',count:1,waitingRoleArrangement:'lark-left',source}]}as unknown as Dance;
