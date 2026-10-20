/** Actual retained public page and explicit source-review choices, not a second
 * hand-written dance card. */
import {readFileSync} from 'node:fs';
import {prepareContraDbReview} from '../../src/source-review.ts';
import {REGISTERED_MOTION_CAPABILITIES} from '../../src/capabilities.ts';
export const FULL_HEY_CAPABILITIES={...REGISTERED_MOTION_CAPABILITIES,ordinaryFullHeys:true};
export function reviewedFullHey(){
 const raw=readFileSync(new URL('../contradb/1697.json',import.meta.url),'utf8');
 const review=prepareContraDbReview(raw,[],FULL_HEY_CAPABILITIES);
 if(!review.result.dance)throw new Error(`Actual full-hey source did not compile: ${JSON.stringify(review.result.diagnostics)}`);
 return {raw,review,dance:review.result.dance};
}
