/** Exact archived892, interpreted through the same removable review path as UI. */
import{readFileSync}from'node:fs';
import{prepareContraDbReview}from'../../src/source-review.ts';
import{REGISTERED_MOTION_CAPABILITIES}from'../../src/capabilities.ts';
import{compileSixTwoImproper,type SixTwoSourceDance}from'../../src/six-two-source-sequence.ts';
import{compileChoreography}from'../../src/choreography.ts';
export const publicCaps={...REGISTERED_MOTION_CAPABILITIES,sixTwoPasses:true};
let retained:SixTwoSourceDance|undefined;
export function fixture():SixTwoSourceDance{
 if(!retained){const review=prepareContraDbReview(readFileSync(new URL('../contradb/892.json',import.meta.url),'utf8'),[],publicCaps);if(!review.result.dance)throw new Error(JSON.stringify(review.result.diagnostics));retained=review.result.dance as SixTwoSourceDance;}
 return structuredClone(retained);
}
export const compiled=(n=2)=>compileChoreography(fixture(),n,publicCaps)as ReturnType<typeof compileSixTwoImproper>;
