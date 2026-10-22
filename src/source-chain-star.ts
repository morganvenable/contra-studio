import type{ContraDbRecord,ContraDbRow}from'./contradb-source.ts';
/** Source-description review only: never selects a motion route. */
export function reversedChainStarHook(record:Pick<ContraDbRecord,'hook'|'rows'>):string|undefined{
 if(record.hook!=='both roles star to chain')return;
 const rows=record.rows,at=rows.findIndex(r=>r.beats===8&&!r.progression&&/^gentlespoons chain to partners?$/.test(r.text));if(at<0)return;
 const next=rows.slice(at,at+4);if(next.length!==4||next.some(r=>r.beats!==8)||next[1].progression||next[2].progression||next[1].text!=='star right - hands across - 4 places'||!/^ladles chain to neighbors?$/.test(next[2].text)||!/^star left - hands across - 4 places(?:, gentlespoons look to next star for new neighbor gentlespoon with whom they'd allemande right)? ⁋$/.test(next[3].text)||!next[3].progression)return;
 return 'Retain the literal table despite its reversed hook summary: both source chains lead into stars. The hook says star to chain, while the author describes chain-to-star flow (https://www.billolsondance.com/pbj, retrieved 2026-10-22). This is an attributed discrepancy, not a verified movement instruction. No rows or counts are reordered; clear this review to leave the conflicting hook unresolved.';
}
export function terminalRoleStarLook(record:Pick<ContraDbRecord,'rows'>,row:ContraDbRow):boolean{
 if(row!==record.rows.at(-1)||row.beats!==8||!row.progression)return false;
 const m=row.text.match(/^star (left|right) - hands across - 4 places, (gentlespoons|ladles) look to next star for new neighbor (gentlespoon|ladle) with whom they'd allemande (left|right) ⁋$/);
 if(!m||m[2]!==m[3]+'s')return false;
 const first=record.rows[0];return first?.beats===8&&!first.progression&&first.text===`${m[2]} allemande ${m[4]} 1½`;
}
