import type {ContraDbRecord} from './contradb-source.ts';
/** The complete source pattern supplies named actors/counts. Internal handoffs
 * and finite-end behavior remain separately removable reviewed conventions. */
export function hasRingTwirlSource(record:ContraDbRecord):boolean {
 const shape:readonly(readonly[number,RegExp])[]=[
  [8,/^balance & petronella$/],[8,/^balance & petronella$/],
  [4,/^balance the ring$/],[12,/^neighbors swing$/],
  [8,/^(?:ladles|robins) gyre(?: right shoulders?)? 1½$/],
  [8,/^partners swing$/],[8,/^circle left 3 places$/],
  [4,/^partners balance$/],[4,/^partners California twirl ⁋$/],
 ];
 return record.formation==='improper'&&record.rows.length===shape.length&&record.rows.every((row,i)=>row.beats===shape[i][0]&&shape[i][1].test(row.text.replace(/\s+/g,' ').trim())&&row.progression===(i===shape.length-1));
}
