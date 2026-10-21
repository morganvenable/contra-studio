/** Row-local interpretations for a hand-free full mad robin and an ordered
 * circle completion. Composition and progression are checked by the sequencer. */
import type {ContraDbRecord,ContraDbRow} from './contradb-source.ts';
import {capturePlainData} from './owned-program-cache.ts';
export interface CircleCompletionChoice {readonly phaseBeats:readonly[7,1];readonly turnToward:'partner';readonly lookFor:'next-neighbor';}
export const CONVENTIONAL_CIRCLE_COMPLETION:Readonly<CircleCompletionChoice>=Object.freeze({phaseBeats:Object.freeze([7,1]as const),turnToward:'partner',lookFor:'next-neighbor'});
export const CIRCLE_COMPLETION_CHOICE_DESCRIPTION='The retained note requires completing the entire right circle before turning toward the persistent partner and looking for the next neighbors. Review seven counts for the full circle and one count for this facing-only completion at the same roots, within the source eight counts. The 7 + 1 allocation is a removable modeling choice; no extra travel or early neighbor change is added.';
export function madRobinRowSource(row:ContraDbRow):{frontRole:'lark'|'robin';direction?:'clockwise'}|undefined {
 if(row.beats!==8||row.progression)return;
 const m=row.text.match(/^mad robin, (ladles|gentlespoons) in front( \(CW\))?$/);
 return m?{frontRole:m[1]==='ladles'?'robin':'lark',...(m[2]?{direction:'clockwise' as const}:{})}:undefined;
}
export function madRobinRowDescription(row:ContraDbRow):string {
 return 'Review one complete eight-count oval around the current neighbor while facing the persistent partner across, with '+(madRobinRowSource(row)?.frontRole==='lark'?'larks':'robins')+' initially passing in front. '+(madRobinRowSource(row)?.direction==='clockwise'?'Clockwise motion is explicit in this source row; it cannot be replaced by a counterclockwise choice.':'The source does not name a world direction. The chosen clockwise or counterclockwise orbit must agree with the actual incoming role layout and source-named front role.')+' The named orbit/facing relationships and full fraction remain separately reviewable conventions. The figure returns to the same roots and neighbor binding.';
}
export function isCircleCompletionChoice(value:unknown):value is CircleCompletionChoice {
 try{const c=capturePlainData(value)as CircleCompletionChoice;return !!c&&typeof c==='object'&&!Array.isArray(c)&&Object.keys(c).length===3&&Object.keys(c).every(k=>['phaseBeats','turnToward','lookFor'].includes(k))&&c.turnToward==='partner'&&c.lookFor==='next-neighbor'&&Array.isArray(c.phaseBeats)&&c.phaseBeats.length===2&&c.phaseBeats[0]===7&&c.phaseBeats[1]===1;}catch{return false;}
}
export function orderedCircleCompletionRow(row:ContraDbRow):boolean {
 return row.beats===8&&row.progression&&row.text==='circle right 4 places (look for new neighbors) ⁋';
}
export function hasOrderedCircleCompletionNote(record:ContraDbRecord):boolean {
 const last=record.rows.at(-1),first=record.rows[0];
 return record.formation==='improper'&&!!last&&orderedCircleCompletionRow(last)&&first?.text==='circle left 4 places'&&first.beats===8&&!first.progression&&record.notes==='progression from circle right to [new] circle left works nicely if you completely finish the circle right then turn towards your partner as you look for new neighbors to circle left with.';
}
