import type {Dance,Figure} from '../../src/types.ts';
const figure=(id:string,kind:Figure['kind'],beats:number,who:Figure['who'],rest:Partial<Figure>={}):Figure=>({id,kind,beats,who,label:id,...rest});
const half:Partial<Figure>={amount:.5,heyStartRole:'robin',centerShoulder:'right',endShoulder:'left',entry:'paired-sidelines'};
/** A source-grounded motion fixture, distinct from the saved-page importer test.
 * Chart Guthrie, Hay in the Barn; CDSS Winter2022 p19 gives both chain recipients. */
export const HAY_IN_THE_BARN:Dance={id:'source-24-motion-fixture',title:'Hay in the Barn',author:'Chart Guthrie',formation:'duple-improper',sourceUrl:'https://contradb.com/dances/24',description:'Explicit conventional four-pass half-heys; original eight source beats are retained.',figures:[
 figure('a1-balance','balance',4,'neighbor'),figure('a1-swing','swing',12,'neighbor'),
 figure('a2-chain','robins-chain',8,'partner'),figure('a2-hey','hey',8,'partner',{...half,exit:'opposite-paired-balance'}),
 figure('b1-balance','balance',4,'partner'),figure('b1-swing','swing',12,'partner'),
 figure('b2-chain','robins-chain',8,'neighbor'),figure('b2-hey','hey',8,'neighbor',{...half,exit:'progressed-neighbors',progression:true})]};
