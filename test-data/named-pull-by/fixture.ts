/** Actual retained sources through the public review/import/archive path. The
 * registered capability follows independent source and whole-motion review. */
import {readFileSync}from'node:fs';
import {prepareContraDbReview}from'../../src/source-review.ts';
import {REGISTERED_MOTION_CAPABILITIES}from'../../src/capabilities.ts';
export const NAMED_PULL_BY_CAPABILITIES=REGISTERED_MOTION_CAPABILITIES;
export function reviewedNamedPullBy(id:1495|2457){
 const raw=readFileSync(new URL(`../contradb/${id}.json`,import.meta.url),'utf8'),review=prepareContraDbReview(raw,[]),parsed=review.result;
 if(!parsed.dance)throw new Error(`Actual retained ${id} did not compile: ${parsed.errors.join('; ')}`);
 const pull=id===1495?2:5,expected=id===1495?'gentlespoons pull by left':'partners pull by left',row=parsed.rows[pull];
 if(row.source.text!==expected||row.source.beats!==(id===1495?4:2)||row.source.progression)throw new Error('Actual retained named pull-by source changed.');
 if(parsed.dance.figures.reduce((n,f)=>n+f.beats,0)!==64)throw new Error('Named pull-by source lost counts.');
 return{raw,review,interpretation:review.interpretation,parsed,dance:parsed.dance};
}
