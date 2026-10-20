import type {WholeSetOvalPolicy} from './types.ts';
import type {ContraDbRecord} from './contradb-source.ts';
export type WholeSetOvalChoice=Omit<WholeSetOvalPolicy,'source'|'progressionScope'>;
/** Explicit simulation conventions, never inferred author instructions. */
export const CONVENTIONAL_WHOLE_SET_OVAL:WholeSetOvalChoice={route:'whole-set-oval',hold:'inside-hand',distance:2.8,phaseBeats:[6,4,6],waitingParticipation:'with-persistent-partner',geometry:{trackRadius:1.2,pairRadius:.34,rowGap:1.8,partnerPreparationBow:.08},timing:{neighborSwingExitBeats:2.5,waitingTurnBeats:8,waitingTransferBeats:8,returnPreparationBeats:1,allemandePreparationBeats:2}};
const clean=(s:string)=>s.replace(/[–—]/g,'-').replace(/\s+/g,' ').trim();
export function hasWholeSetOvalSource(record:ContraDbRecord):boolean {
 const patterns=[/^neighbors do si do once$/i,/^neighbors swing end facing up or down with (?:ladles|robins) closer to center$/i,/^promenade along the line$/i,/^turn as a couple, (?:gentlespoons|larks) closer to center$/i,/^promenade back to partner$/i,/^(?:gentlespoons|larks) allemande left 1½$/i,/^partners swing$/i,/^right left through ⁋$/i,/^(?:ladles|robins) chain$/i];
 return /^improper$/i.test(record.formation)&&record.rows.length===9&&record.rows.every((row,i)=>row.beats===[8,8,6,4,6,8,8,8,8][i]&&row.phrase===['A1','A1','A2','A2','A2','B1','B1','B2','B2'][i]&&row.progression===(i===7)&&patterns[i].test(clean(row.text)));
}
const equal=(a:unknown,b:unknown):boolean=>a===b||!!a&&!!b&&typeof a==='object'&&typeof b==='object'&&Array.isArray(a)===Array.isArray(b)&&Object.keys(a).length===Object.keys(b).length&&Object.entries(b).every(([k,v])=>Object.hasOwn(a,k)&&equal((a as Record<string,unknown>)[k],v));
export const isWholeSetOvalChoice=(choice:unknown):choice is WholeSetOvalChoice=>equal(choice,CONVENTIONAL_WHOLE_SET_OVAL);
export const OVAL_CHOICE_DESCRIPTION='Review an inside-hand whole-set oval: six counts outbound, four for the couple turn, six returning; waiting dancers participate with persistent partners and return to the same end. Modeled distance is 2.8 m, track radius 1.2 m, pair radius 0.34 m, row spacing 1.8 m and partner-preparation bow 0.08 m. Within existing source counts, neighbor-swing exit uses 2.5 counts, waiting turn and transfer eight each, return preparation one, and the full lark allemande six plus two for partner-frame preparation.';
