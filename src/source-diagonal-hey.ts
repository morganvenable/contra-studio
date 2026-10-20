import type {ContraDbRecord} from './contradb-source.ts';
import type {DiagonalHeyPolicy} from './diagonal-hey-policy.ts';
export type DiagonalHeyChoice=Omit<DiagonalHeyPolicy,'source'>&{sidePair:'partner';progressionCount:2};
export const CONVENTIONAL_DIAGONAL_HEY:DiagonalHeyChoice=Object.freeze({missingDiagonal:'wait-for-across',missingAcross:'wait-for-diagonal',partnerPhrase:'persistent-partner',preparationBeats:2,sidePair:'partner',progressionCount:2});
export function isDiagonalHeyChoice(value:unknown):value is DiagonalHeyChoice {
 if(!value||typeof value!=='object'||Array.isArray(value)||![Object.prototype,null].includes(Object.getPrototypeOf(value)))return false;
 const keys=Reflect.ownKeys(value);if(keys.length!==Object.keys(CONVENTIONAL_DIAGONAL_HEY).length)return false;
 return Object.entries(CONVENTIONAL_DIAGONAL_HEY).every(([k,v])=>{const d=Object.getOwnPropertyDescriptor(value,k);return !!d&&Object.hasOwn(d,'value')&&d.value===v;});
}
const clean=(text:string)=>text.replace(/[–—]/g,'-').replace(/\bbalance and swing\b/gi,'balance & swing').replace(/\s+/g,' ').trim();
/** A bounded source composition, independent of record title, credit or ID. */
export function hasDiagonalHeySource(record:ContraDbRecord):boolean {
 const patterns=[/^(?:gentlespoons|larks) allemande left 1½$/i,/^neighbors swing$/i,/^right left through$/i,/^(?:ladles|robins) chain$/i,/^(?:ladles|robins) start a left diagonal half hey - rights in center, lefts on ends ⁋$/i,/^(?:ladles|robins) start a half hey - rights in center, lefts on ends$/i,/^partners balance & swing$/i];
 return /^Becket$/i.test(record.formation)&&record.rows.length===7&&record.rows.every((r,i)=>r.beats===(i===6?16:8)&&patterns[i].test(clean(r.text))&&r.progression===(i===4))&&record.rows.map(r=>r.phrase).join(',')==='A1,A1,A2,A2,B1,B1,B2';
}
export const DIAGONAL_HEY_CHOICE_DESCRIPTION='Review the partner side pairs for the left-diagonal half hey and following across half hey. Literal robin-first right-center/left-end passes establish a two-place progression, with the public neighbor binding changing only after the diagonal hey at count 40; the source gives one glyph but omits its numerical multiplicity. If a diagonal group is missing, wait in the same side-couple place for the across hey; if an across group is missing, wait there for the next diagonal. Everyone keeps their persistent partner for the final balance and swing, with two counts of in-budget preparation for an unmatched pair. With two couples there is no diagonal group, so that interval is waiting rather than an interior progression encounter. This is a separately reviewed finite-end convention, not a same-end turn or added travel. Footwork is schematic.';
