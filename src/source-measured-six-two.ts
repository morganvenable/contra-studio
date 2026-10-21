import type {ContraDbRecord} from './contradb-source.ts';
/** Only the adjacent terminal source clauses are matched. Prefix composition
 * and actual incoming geometry belong to the shared sequencer. */
export function hasMeasuredSixTwoTail(record:ContraDbRecord):boolean {
 const [circle,pass]=record.rows.slice(-2);
 return record.formation==='improper'&&!!circle&&!!pass&&circle.beats===6&&circle.text==='circle left 3 places'&&!circle.progression&&pass.beats===2&&/^pass through(?: to (?:new|next) neighbors)? ⁋$/.test(pass.text)&&pass.progression&&record.rows.filter(r=>r.progression).length===1;
}
export const MEASURED_SIX_TWO_DESCRIPTION='The complete left three-place circle uses 5.25 of its six counts, then the final 0.75 count releases and prepares the right-shoulder passage. The separate pass remains two counts. These are schematic internal subdivisions; incoming geometry is measured from the preceding movement rather than replaced by a whole-dance spacing template.';
/** Adjacent source tail only; an omitted shoulder requires a removable choice. */
export function hasMirroredSixTwoTail(record:ContraDbRecord):boolean {
 const [circle,pass]=record.rows.slice(-2);
 return record.formation==='improper'&&!!circle&&!!pass&&circle.beats===6&&circle.text==='circle right 3 places'&&!circle.progression&&pass.beats===2&&/^pass through(?: left shoulders| by the left)? ⁋$/.test(pass.text)&&pass.progression&&record.rows.filter(r=>r.progression).length===1;
}
export const MIRRORED_SIX_TWO_DESCRIPTION='The complete source right three-place circle uses 5.25 of its six counts, then the final 0.75 count releases and prepares the explicitly reviewed left-shoulder passage. The pass keeps its separate two counts. Internal easing and preparation are schematic conventions; any source-omitted shoulder and current-neighbor crossing are removable interpretations, and the shared sequencer validates actual incoming geometry and progression.';
