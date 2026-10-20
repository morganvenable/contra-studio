/** Source 1067 rehearsal fixture. The complete raw snapshot is retained in
 * ../contradb/1067.json. Its ring-balance progression mark applies to the whole
 * following balance/twirl phrase only by an explicit reviewed choice. */
import type {Dance} from '../../src/types.ts';
import type {RicochetHeyFigure} from '../../src/ricochet-hey-adapter.ts';
export const HEY_1067:RicochetHeyFigure={id:'contradb:1067:row:1',kind:'ricochet-hey',beats:16,amount:1,label:'Robin-start full hey; larks ricochet second time',who:'neighbor',heyStartRole:'robin',centerShoulder:'right',endShoulder:'left',entry:'paired-sidelines',exit:'ricochet-paired-balance',ricochetExitRelation:'partner',ricochets:[{role:'lark',occurrence:2,direction:'back-left',facing:'across',hands:'both'}]};
export const RICOCHET_SOURCE_1067:Dance={id:'contradb:1067',title:'New Dance Dance tme',author:"Don Flaherty",formation:'duple-improper',description:'Explicit source1067 ricochet and phrase-level progression interpretation.',sourceUrl:'https://contradb.com/dances/1067',verified:false,figures:[
{id:'contradb:1067:row:0:balance',kind:'balance',who:'neighbor',beats:4,label:'Neighbors balance'},
{id:'contradb:1067:row:0:swing',kind:'swing',who:'neighbor',beats:12,label:'Neighbors swing'},
HEY_1067,
{id:'contradb:1067:row:2:balance',kind:'balance',who:'partner',beats:4,label:'Partners balance'},
{id:'contradb:1067:row:2:swing',kind:'swing',who:'partner',beats:12,label:'Partners swing'},
{id:'contradb:1067:row:3',kind:'circle',who:'all',direction:'left',amount:.75,beats:8,label:'Circle left three places'},
{id:'contradb:1067:row:4',kind:'ring-balance',who:'all',hands:'both',exit:'partner-california-twirl',beats:4,label:'Balance the ring'},
{id:'contradb:1067:row:5',kind:'california-twirl',who:'partner',hands:'right-left',underRole:'robin',direction:'right',amount:.5,entry:'side-by-side-facing-same',beats:4,label:'Partners California twirl to new neighbor',progression:true}
]};
