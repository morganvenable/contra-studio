/** Retained source plus removable review choices, through the public parser. */
import {readFileSync}from'node:fs';
import {prepareContraDbReview}from'../../src/source-review.ts';
import {REGISTERED_MOTION_CAPABILITIES}from'../../src/capabilities.ts';
export const CROSS_TRAILS_CAPABILITIES=REGISTERED_MOTION_CAPABILITIES;
export function reviewedCrossTrails(){
 const raw=readFileSync(new URL('../contradb/2964.json',import.meta.url),'utf8'),review=prepareContraDbReview(raw,[]);
 if(!review.result.dance)throw new Error(`Actual2964 source did not compile: ${JSON.stringify(review.result.diagnostics)}`);
 return{raw,review,dance:review.result.dance};
}
