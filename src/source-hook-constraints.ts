import type {ContraDbRecord} from './contradb-source.ts';
/** A hook can supply source semantics omitted by a table cell. This bounded
 * rule binds an exact cyclic transition; it is not descriptive-hook triage. */
export function fullHeyRepeatGyreShoulder(record:ContraDbRecord):'right'|'left'|undefined {
 const hook=record.hook.match(/^full hey into new neighbor (right|left) gyre$/i),first=record.rows[0],second=record.rows[1],last=record.rows.at(-1);
 if(!hook||!/^improper$/i.test(record.formation)||!first||!second||!last||first.phrase!=='A1'||first.beats!==8||!/^neighbors gyre(?: (?:left|right) shoulders?)? once$/i.test(first.text)||first.progression||second.phrase!=='A1'||second.beats!==8||!/^neighbors swing$/i.test(second.text)||second.progression||last.phrase!=='B2'||last.beats!==16||!last.progression||record.rows.filter(row=>row.progression).length!==1||record.rows.reduce((n,row)=>n+(row.beats??NaN),0)!==64)return;
 const hey=last.text.match(/^(ladles|ladies|women|robins|ravens|gentlespoons|gents|men|larks) start a full hey - (rights|lefts) in center, (rights|lefts) on ends ⁋$/i);
 if(!hey||hey[2].toLowerCase()===hey[3].toLowerCase())return;
 return hook[1].toLowerCase() as 'right'|'left';
}
