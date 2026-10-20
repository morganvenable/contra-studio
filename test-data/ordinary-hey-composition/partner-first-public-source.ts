/** Durable tests use the retained fixture and the actual public review route. */
import {readFileSync} from 'node:fs';
import {prepareContraDbReview} from '../../src/source-review.ts';
import {REGISTERED_MOTION_CAPABILITIES} from '../../src/capabilities.ts';
export const PARTNER_FIRST_CAPABILITIES=REGISTERED_MOTION_CAPABILITIES;
export function partnerFirstSource(id:number){
 const source=readFileSync(new URL(`../contradb/${id}.json`,import.meta.url),'utf8'),review=prepareContraDbReview(source,[],PARTNER_FIRST_CAPABILITIES);
 if(!review.result.dance)throw new Error(review.result.errors.join('; '));
 return{dance:review.result.dance,source,choices:review.interpretation,review};
}
