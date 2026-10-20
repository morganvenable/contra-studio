/** Literal source envelope and removable choices for the bounded star/whirl
 * family. This module has no motion-engine, importer or UI dependency. A source
 * match does not resolve source hooks, notes or other required review choices. */
import {readContraDbSource,type ContraDbRecord} from './contradb-source.ts';
import {capturePlainData} from './owned-program-cache.ts';

export interface StarPromenadeChoice {
 readonly centerRole:'lark';readonly centerHand:'left';readonly pairRelation:'partner';readonly carriedSide:'right';
 readonly hold:'half-shoulder-waist';readonly amount:.5;readonly pickupPreparationBeats:2.5;
}
export interface ButterflyWhirlChoice {
 readonly pairRelation:'partner';readonly direction:'left';readonly amount:1.375;readonly backingRole:'lark';
 readonly exit:'paired-sidelines';readonly releaseBeats:.5;
}
export const CONVENTIONAL_STAR_PROMENADE:Readonly<StarPromenadeChoice>=Object.freeze({centerRole:'lark',centerHand:'left',pairRelation:'partner',carriedSide:'right',hold:'half-shoulder-waist',amount:.5,pickupPreparationBeats:2.5});
export const CONVENTIONAL_BUTTERFLY_WHIRL:Readonly<ButterflyWhirlChoice>=Object.freeze({pairRelation:'partner',direction:'left',amount:1.375,backingRole:'lark',exit:'paired-sidelines',releaseBeats:.5});
export const STAR_PROMENADE_CHOICE_DESCRIPTION='Review larks retaining left hands centrally and carrying their persistent partners on the right with half-shoulder/waist support. The source explicitly gives a four-count left half-star after a complete eight-count left one-and-a-half allemande. Partner pickup prepares within the final two-and-a-half allemande counts; support acquires during the final half-count. The carrier role, held partner/side and support preparation are reviewed interpretations; no source turn or count is shortened.';
export const BUTTERFLY_WHIRL_CHOICE_DESCRIPTION='The source gives four counts for butterfly whirl but no fraction. For the selected diagonal pickup/half-star geometry and inward-facing paired-sideline exit, review a left one-and-three-eighths coupled turn, with each lark backing and robin advancing. Three-eighths is the heading remainder for this geometry; one-and-three-eighths is the smallest compatible amount containing a complete paired revolution. This is conditional on the chosen entry and exit, not universal or author-stated. Central left hands release during the first half-count and partner support during the last half-count. The following robin gyre retains its full eight counts. This choice remains separately removable.';

function exactChoice(value:unknown,canonical:object):boolean {
 try{const owned=capturePlainData(value);if(!owned||typeof owned!=='object'||Array.isArray(owned))return false;const keys=Object.keys(owned);return keys.length===Object.keys(canonical).length&&Object.entries(canonical).every(([k,v])=>Object.hasOwn(owned,k)&&(owned as Record<string,unknown>)[k]===v);}catch{return false;}
}
export function isStarPromenadeChoice(value:unknown):value is StarPromenadeChoice{return exactChoice(value,CONVENTIONAL_STAR_PROMENADE);}
export function isButterflyWhirlChoice(value:unknown):value is ButterflyWhirlChoice{return exactChoice(value,CONVENTIONAL_BUTTERFLY_WHIRL);}

const recordFields=['format','sourceId','sourceUrl','title','author','authorUrl','formation','hook','preamble','notes','publication','rows','original','metadata','retrievedAt','revision','variantIdentity','snapshotId','provenance']as const;
/** Comparison reads captured plain data only; no source getter is invoked. */
function sameData(a:unknown,b:unknown):boolean {
 if(a===null||b===null||typeof a!=='object'||typeof b!=='object')return a===b;
 if(Array.isArray(a)!==Array.isArray(b))return false;const keys=Object.keys(a),other=Object.keys(b);
 return keys.length===other.length&&keys.every(k=>Object.hasOwn(b,k)&&sameData((a as Record<string,unknown>)[k],(b as Record<string,unknown>)[k]));
}
const clean=(s:string)=>s.replace(/\s+/g,' ').trim();
/** Require all ten actual rows, original counts/phrases and the sole final
 * glyph. Bind every retained record field (including hook/preamble/notes and
 * exact row HTML/spans) to a fresh read of original; a forged row projection
 * cannot borrow a genuine snapshot identity. Titles and record IDs are free. */
export function hasStarWhirlSource(input:ContraDbRecord):boolean {
 try{
  const record=capturePlainData(input);if(!record||typeof record!=='object'||Array.isArray(record)||Object.keys(record).some(k=>!recordFields.includes(k as typeof recordFields[number])))return false;
  const parsed=readContraDbSource(record.original,{sourceUrl:record.sourceUrl,metadata:record.metadata,retrievedAt:record.retrievedAt});
  if(!parsed.structurallyValid||!parsed.record||recordFields.some(k=>!sameData(record[k],parsed.record![k])))return false;
  const shapes:readonly(readonly[number,string,RegExp])[]=[
   [4,'A1',/^circle left 2 places$/i],[12,'A1',/^neighbors swing$/i],
   [8,'A2',/^(?:gentlespoons|larks) allemande left 1½$/i],[4,'A2',/^star promenade left ½$/i],[4,'A2',/^butterfly whirl$/i],
   [8,'B1',/^(?:ladles|robins) gyre once$/i],[8,'B1',/^partners swing$/i],
   [8,'B2',/^balance (?:&|and) petronella$/i],[4,'B2',/^balance the ring$/i],[4,'B2',/^partners California twirl ⁋$/i]
  ];
  return /^improper$/i.test(record.formation)&&record.rows.length===shapes.length&&record.rows.every((row,i)=>row.index===i&&row.beats===shapes[i][0]&&row.phrase===shapes[i][1]&&shapes[i][2].test(clean(row.text))&&row.progression===(i===shapes.length-1))&&record.rows.reduce((sum,row)=>sum+row.beats!,0)===64;
 }catch{return false;}
}
