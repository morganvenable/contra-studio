/** Actual retained source774 through review and the public registered API.
 * No row substitution, title dispatch, or private candidate compiler is used.
 */
import {readFileSync} from 'node:fs';
import {prepareContraDbReview} from '../../src/source-review.ts';
import {compileChoreography} from '../../src/choreography.ts';
import {REGISTERED_MOTION_CAPABILITIES} from '../../src/capabilities.ts';
export const raw=readFileSync(new URL('../contradb/774.json',import.meta.url),'utf8');
export const productionCapabilities=REGISTERED_MOTION_CAPABILITIES;
export const review=prepareContraDbReview(raw,[],productionCapabilities);
if(!review.result.coverage.executable||!review.result.dance)throw new Error(`Source774 failed the registered public review: ${JSON.stringify(review.result.diagnostics)}`);
export const dance=review.result.dance;
export const c=compileChoreography(dance,Number(process.env.DOOR_COUPLES??2),productionCapabilities);
