import {capturePlainData} from './owned-program-cache.ts';
import type {ContraDbRecord,ContraDbRow} from './contradb-source.ts';
import type {Figure} from './types.ts';

export interface NeighborDosidoChoice {passingShoulder:'right';facing:'next-neighbors';preparation?:'next-neighbor-balance';}
export const CONVENTIONAL_NEIGHBOR_DOSIDO:Readonly<NeighborDosidoChoice>=Object.freeze({passingShoulder:'right',facing:'next-neighbors'});
/** Amount, duration and glyph are literal; this helper supplies no middle-table signature. */
export function terminalNeighborDosidoSource(row:ContraDbRow):boolean {return row.text==='neighbors do si do 1½ ⁋'&&row.beats===8&&row.progression;}
export function isNeighborDosidoChoice(value:unknown):value is NeighborDosidoChoice {
 try{const v=capturePlainData(value) as NeighborDosidoChoice;if(!v||typeof v!=='object'||Array.isArray(v))return false;const keys=Object.keys(v);return v.passingShoulder==='right'&&v.facing==='next-neighbors'&&keys.every(key=>['passingShoulder','facing','preparation'].includes(key))&&(keys.length===2&&!Object.hasOwn(v,'preparation')||keys.length===3&&v.preparation==='next-neighbor-balance');}catch{return false;}
}
export function neighborDosidoDescription(choice?:NeighborDosidoChoice):string {
 const base='Review conventional right-shoulder passage and release facing the actual next neighbors for the literal eight-count neighbor do-si-do one-and-a-half. The source states the named current neighbors, one full return followed by a half exchange, eight counts and the terminal progression marker; it omits the shoulder and final facing. The complete path remains around the old bound neighbor until the source event at count sixty-four. These removable shoulder and facing conventions add no turn figure, count or earlier neighbor rebind.';
 return choice?.preparation==='next-neighbor-balance'?base+' This separate selected variant also prepares the next neighbor balance after the last do-si-do shoulder passage, within the same eight authored counts. Dancers with an actual next neighbor, including newly available end waiters, may gather and acquire the next balance hold during that final preparation; this is a modeled next-figure handoff and can move roots. It is not an uninterrupted hand-free orbit through the endpoint, and the source does not state that preparation. In the reviewed model the full return occurs at about 5.047 counts and the final old-neighbor right-shoulder passage at about 6.093; only the remaining 1.907-count released tail may gather into next-neighbor balance positions and hands. Nominal exchanged stations and that prepared endpoint are distinct. These timings are animation conventions, not authored subdivisions.':base+' This variant carries no selected next-balance gathering or hand acquisition.';
}
export function neighborDosidoBalanceOpening(figures:readonly Figure[]):boolean {
 const [balance,swing]=figures;return balance?.kind==='balance'&&balance.who==='neighbor'&&balance.beats===4&&balance.hands===undefined&&balance.entry===undefined&&balance.exit===undefined&&!balance.progression&&swing?.kind==='swing'&&swing.who==='neighbor'&&swing.beats>=4&&swing.entry===undefined&&swing.exit===undefined&&!swing.progression;
}
export const NEIGHBOR_DOSIDO_GYRE_NOTE='arr. Mattie Rynkiewicz new neighbor right gyre is more forgiving because the previous move is dosido 3/2';
export const NEIGHBOR_DOSIDO_GYRE_NOTE_DESCRIPTION='Review the retained repeat-edge note against the current table: after the complete terminal neighbor do-si-do one-and-a-half and its source-marked progression, the next cycle begins a right-shoulder gyre with those new neighbors. The selected four-count full gyre and twelve-count swing remain a separate removable interpretation of the opening meltdown row; the note does not supply that split or gyre amount. The arrangement attribution to Mattie Rynkiewicz and the claim “more forgiving” remain attributed, unverified commentary. No gyre begins early and no extra progression is added.';
export function neighborDosidoGyreNote(record:Pick<ContraDbRecord,'notes'|'rows'>):boolean {
 const first=record.rows[0],last=record.rows.at(-1);return record.notes===NEIGHBOR_DOSIDO_GYRE_NOTE&&first?.text==='neighbors meltdown swing'&&first.beats===16&&!first.progression&&!!last&&terminalNeighborDosidoSource(last);
}
