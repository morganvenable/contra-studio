/** Retained literal sources; importer/review owns every interpretation. */
import {readFileSync} from 'node:fs';
import {prepareContraDbReview} from '../../src/source-review.ts';
import {REGISTERED_MOTION_CAPABILITIES} from '../../src/capabilities.ts';
export const NEUTRAL_FULL_HEY_CAPABILITIES=REGISTERED_MOTION_CAPABILITIES;
export function reviewedNeutralFullHey(id:975|1983|3214){
 const raw=readFileSync(new URL(`../contradb/${id}.json`,import.meta.url),'utf8'),review=prepareContraDbReview(raw,[],NEUTRAL_FULL_HEY_CAPABILITIES);
 if(!review.result.dance)throw new Error(`Actual neutral full-hey source ${id} did not compile: ${review.result.errors.join('; ')}`);
 return{raw,review,dance:review.result.dance};
}
