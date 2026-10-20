/** A reviewed finite-end convention. The source's diagonal arrow alone cannot
 * assert these waiting/partner choices, nor a geometric spacing convention. */
import type {ProgressionEvidence} from './progression-topology.ts';
export interface DiagonalHeyPolicy {
 missingDiagonal:'wait-for-across';
 missingAcross:'wait-for-diagonal';
 partnerPhrase:'persistent-partner';
 preparationBeats:2;
 source:ProgressionEvidence & {basis:'reviewed-interpretation'};
}
export function ownDiagonalHeyPolicy(input:unknown):Readonly<DiagonalHeyPolicy> {
 const object=(x:unknown):x is Record<string,unknown>=>!!x&&typeof x==='object'&&!Array.isArray(x);
 if(!object(input)||Reflect.ownKeys(input).some(k=>typeof k!=='string'||!['missingDiagonal','missingAcross','partnerPhrase','preparationBeats','source'].includes(k))||input.missingDiagonal!=='wait-for-across'||input.missingAcross!=='wait-for-diagonal'||input.partnerPhrase!=='persistent-partner'||input.preparationBeats!==2)throw new Error('A diagonal-hey end policy must explicitly retain missing groups and persistent partners within the two-count preparation.');
 const source=input.source;if(!object(source)||Reflect.ownKeys(source).some(k=>typeof k!=='string'||!['sourceId','url','clause','basis'].includes(k))||source.basis!=='reviewed-interpretation'||['sourceId','url','clause'].some(k=>typeof source[k]!=='string'||!(source[k] as string).trim()))throw new Error('The finite diagonal-hey convention needs separately reviewed interpretation evidence.');
 let url:URL;try{url=new URL(source.url as string);}catch{throw new Error('The diagonal-hey policy needs its retained source URL.');}if(!['http:','https:'].includes(url.protocol))throw new Error('The diagonal-hey policy needs its retained source URL.');
 return Object.freeze({missingDiagonal:'wait-for-across',missingAcross:'wait-for-diagonal',partnerPhrase:'persistent-partner',preparationBeats:2,source:Object.freeze({sourceId:source.sourceId as string,url:source.url as string,clause:source.clause as string,basis:'reviewed-interpretation'})});
}
