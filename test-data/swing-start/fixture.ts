import {readFileSync} from 'node:fs';
import {prepareContraDbReview} from '../../src/source-review.ts';
import {REGISTERED_MOTION_CAPABILITIES} from '../../src/capabilities.ts';
import type {Dance} from '../../src/types.ts';
export const swingStartCapabilities={...REGISTERED_MOTION_CAPABILITIES,swingStartSequences:true};
/** Actual retained source and removable initial/return/end interpretations. */
export function openingSwingFixture():Dance{
 const reviewed=prepareContraDbReview(readFileSync(new URL('../contradb/881.json',import.meta.url),'utf8'),[],swingStartCapabilities);
 if(!reviewed.result.dance)throw new Error(JSON.stringify(reviewed.result.diagnostics));
 return reviewed.result.dance;
}
