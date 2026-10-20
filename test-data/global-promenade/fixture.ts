/** Durable gates use the retained actual source and its public reviewed importer. */
import {readFileSync} from 'node:fs';
import {prepareContraDbReview} from '../../src/source-review.ts';
import {REGISTERED_MOTION_CAPABILITIES} from '../../src/capabilities.ts';
import type {OvalSourceDance} from '../../src/global-promenade-source.ts';
let reviewed:OvalSourceDance|undefined;
export function reviewedOvalSource():OvalSourceDance {
 if(!reviewed){
  const raw=readFileSync(new URL('../contradb/2373.json',import.meta.url),'utf8');
  const result=prepareContraDbReview(raw,[],{...REGISTERED_MOTION_CAPABILITIES,wholeSetOvalPromenades:true}).result;
  if(!result.dance?.ovalPolicy)throw new Error(`Actual source 2373 did not compile: ${JSON.stringify(result.errors)}`);
  reviewed=result.dance as OvalSourceDance;
 }
 return structuredClone(reviewed);
}
