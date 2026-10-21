/** Literal source envelope and removable choices for the bounded mad-robin
 * family. Matching a familiar name is not executable admission. Every projected
 * source field must agree with a fresh read of the retained original bytes. */
import {capturePlainData} from './owned-program-cache.ts';
import {readContraDbSource,type ContraDbRecord} from './contradb-source.ts';
import type {MadRobinDirection} from './mad-robin.ts';
export interface MadRobinRowChoice {
 readonly orbitRelation:'neighbor';readonly facingRelation:'partner';readonly frontRole:'lark'|'robin';
 readonly direction:MadRobinDirection;readonly amount:1;
}
export interface MadRobinPolicyChoice {
 readonly terminal:'full-return-around-old-neighbor';readonly repeatEntry:'clockwise-around-next-neighbor';
 readonly facing:'persistent-partner-across';readonly endFacing:'persistent-partner';
 readonly allemandeEntryFacingBeats:1;readonly allemandeExitFacingBeats:1;readonly circleEntryFacingBeats:.75;
}
export interface MadRobinSourceChoices {
 sourceSnapshotId:string;
 rows:Record<string,MadRobinRowChoice>;
 hook:{meaning:'old-neighbor-full-return-then-next-neighbor';sourceText:string};
}
export const CONVENTIONAL_MAD_ROBIN_CLOCKWISE:Readonly<MadRobinRowChoice>=Object.freeze({orbitRelation:'neighbor',facingRelation:'partner',frontRole:'robin',direction:'clockwise',amount:1});
export const CONVENTIONAL_MAD_ROBIN_COUNTERCLOCKWISE:Readonly<MadRobinRowChoice>=Object.freeze({...CONVENTIONAL_MAD_ROBIN_CLOCKWISE,direction:'counterclockwise'});
export const CONVENTIONAL_MAD_ROBIN_POLICY:Readonly<MadRobinPolicyChoice>=Object.freeze({terminal:'full-return-around-old-neighbor',repeatEntry:'clockwise-around-next-neighbor',facing:'persistent-partner-across',endFacing:'persistent-partner',allemandeEntryFacingBeats:1,allemandeExitFacingBeats:1,circleEntryFacingBeats:.75});
export const MAD_ROBIN_ROW_CHOICE_DESCRIPTION='Review one complete eight-count oval around the current neighbor while facing the persistent partner across, with robins initially passing in front. In this complete sequence, the actual opening role layout requires clockwise motion and the terminal layout requires counterclockwise motion. The source states the front role and eight counts; the named orbit/facing relationships, full fraction and world rotations are reviewed interpretations. Each row choice is separately removable.';
export const MAD_ROBIN_HOOK_CHOICE_DESCRIPTION='Review the retained mad-robin-to-mad-robin progression hook as a full terminal orbit around the old neighbor, followed by the marked endpoint binding the next neighbor for the next clockwise orbit. The earlier middle figures already exchange persistent-couple ranks. Dancers travel the complete terminal oval and return to those already-progressed roots, adding no net progression displacement during that orbit. The hook interpretation is separate from the row choices; no counts are added.';
export const MAD_ROBIN_POLICY_CHOICE_DESCRIPTION='Review persistent-partner facing across during both mad robins and persistent-partner facing during the separately timed finite-end exchange. The robin right allemande retains all one-and-a-half turns and all eight counts, using its first and last count for body-facing preparation. The six-count circle uses its first three-quarter count for inward-facing preparation. These within-count facing conventions and the full-return/next-neighbor handoff are modeling choices, not source-stated details; the finite-end timing remains a separate review choice.';
const rowKeys=['orbitRelation','facingRelation','frontRole','direction','amount']as const;
const sameKeys=(o:unknown,keys:readonly string[]):o is Record<string,unknown>=>!!o&&typeof o==='object'&&!Array.isArray(o)&&Object.keys(o).length===keys.length&&Object.keys(o).every(k=>keys.includes(k));
function rowChoice(value:unknown,direction?:MadRobinDirection,frontRole:'lark'|'robin'='robin'):value is MadRobinRowChoice {
 return ['lark','robin'].includes(frontRole)&&sameKeys(value,rowKeys)&&value.orbitRelation==='neighbor'&&value.facingRelation==='partner'&&value.frontRole===frontRole&&value.amount===1&&(value.direction==='clockwise'||value.direction==='counterclockwise')&&(direction===undefined||value.direction===direction);
}
/** Direct choice validators capture descriptors before inspecting any values. */
export function isMadRobinRowChoice(value:unknown,direction?:MadRobinDirection,frontRole:'lark'|'robin'='robin'):value is MadRobinRowChoice {
 try{return rowChoice(capturePlainData(value),direction,frontRole);}catch{return false;}
}
export function isMadRobinPolicyChoice(value:unknown):value is MadRobinPolicyChoice {
 try{const owned=capturePlainData(value);return sameKeys(owned,Object.keys(CONVENTIONAL_MAD_ROBIN_POLICY))&&Object.entries(CONVENTIONAL_MAD_ROBIN_POLICY).every(([key,v])=>owned[key]===v);}catch{return false;}
}
const recordFields=['format','sourceId','sourceUrl','title','author','authorUrl','formation','hook','preamble','notes','publication','rows','original','metadata','retrievedAt','revision','variantIdentity','snapshotId','provenance']as const;
/** Compare owned plain data without imposing object property insertion order. */
function sameData(a:unknown,b:unknown):boolean {
 if(a===null||b===null||typeof a!=='object'||typeof b!=='object')return a===b;
 if(Array.isArray(a)!==Array.isArray(b))return false;const keys=Object.keys(a),other=Object.keys(b);
 return keys.length===other.length&&keys.every(k=>Object.hasOwn(b,k)&&sameData((a as Record<string,unknown>)[k],(b as Record<string,unknown>)[k]));
}
const expectedRows=[['mad robin, ladles in front',8,'A1'],['ladles allemande right 1½',8,'A1'],['partners balance & swing',16,'A2'],['circle left 3 places',6,'B1'],['neighbors swing',10,'B1'],['long lines forward & back',8,'B2'],['mad robin, ladles in front ⁋',8,'B2']]as const;
/** Input is already captured by the public boundary. Metadata/retrieval context
 * is supplied to the reader exactly as retained; this authenticates projections
 * against the snapshot, not against a live website or a trusted network origin. */
function matchesOwnedSource(record:ContraDbRecord):boolean {
 if(!record||typeof record!=='object'||Array.isArray(record)||Object.keys(record).some(k=>!recordFields.includes(k as typeof recordFields[number])))return false;
 const parsed=readContraDbSource(record.original,{sourceUrl:record.sourceUrl,metadata:record.metadata,retrievedAt:record.retrievedAt});
 if(!parsed.structurallyValid||!parsed.record||recordFields.some(k=>!sameData(record[k],parsed.record![k])))return false;
 return record.formation==='improper'&&record.rows.length===expectedRows.length&&record.rows.every((r,i)=>r.index===i&&r.text===expectedRows[i][0]&&r.beats===expectedRows[i][1]&&r.phrase===expectedRows[i][2]&&r.progression===(i===6))&&record.rows.reduce((n,r)=>n+r.beats!,0)===64&&record.preamble===''&&record.notes===''&&record.hook==='mad ladle to mad ladle progression';
}
/** An exact complete retained source, including row HTML/spans and annotations,
 * is required. Titles, authors and record IDs do not themselves dispatch motion. */
export function hasMadRobinSource(input:ContraDbRecord):boolean {
 try{return matchesOwnedSource(capturePlainData(input));}catch{return false;}
}
export function assertMadRobinSourceChoices(input:ContraDbRecord,selection:MadRobinSourceChoices):void {
 const {record,choice}=capturePlainData({record:input,choice:selection});
 if(!matchesOwnedSource(record))throw new Error('The mad-robin interpretation requires the authenticated retained seven-row source, original counts/phrases, sole terminal marker and separately reviewed hook.');
 if(!sameKeys(choice,['sourceSnapshotId','rows','hook'])||choice.sourceSnapshotId!==record.snapshotId||!sameKeys(choice.rows,[record.rows[0].id,record.rows[6].id]))throw new Error('Both removable mad-robin choices must bind to this exact source snapshot and row identities.');
 for(const[i,direction]of[[0,'clockwise'],[6,'counterclockwise']]as const)if(!rowChoice(choice.rows[record.rows[i].id],direction))throw new Error('Each mad-robin source row needs its explicit reviewed orbit/facing relationship, robin-front rotation and full fraction.');
 if(!sameKeys(choice.hook,['meaning','sourceText'])||choice.hook.meaning!=='old-neighbor-full-return-then-next-neighbor'||choice.hook.sourceText!==record.hook)throw new Error('The retained source hook requires a separate explicit full-return/rebind interpretation.');
}
