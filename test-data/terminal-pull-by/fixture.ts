/** Exact retained source through the real public importer. No typed diagnostic
 * figure substitution is used in this fixture. */
import {readFileSync}from'node:fs';
import {prepareContraDbReview}from'../../src/source-review.ts';
import {REGISTERED_MOTION_CAPABILITIES}from'../../src/capabilities.ts';
export const TERMINAL_PULL_BY_CAPABILITIES=REGISTERED_MOTION_CAPABILITIES;
export function reviewedTerminalPullBy(){
 const raw=readFileSync(new URL('../contradb/2355.json',import.meta.url),'utf8'),review=prepareContraDbReview(raw,[]);
 if(!review.result.dance)throw new Error(`Actual2355 is not executable: ${review.result.errors.join('; ')}`);
 return{raw,review,dance:review.result.dance};
}
