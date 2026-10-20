/** Row-local balanced square-through semantics. Incoming formation, named
 * relationships and continuation belong to the shared sequencer, not a source
 * title or complete-program signature. */
import type {ContraDbRecord,ContraDbRow} from './contradb-source.ts';
import {assertSquareThroughTiming} from './square-through.ts';
export interface SquareThroughChoice {phaseBeats:readonly [4,2,2];}
export const CONVENTIONAL_SQUARE_THROUGH:Readonly<SquareThroughChoice>=Object.freeze({phaseBeats:Object.freeze([4,2,2] as const)});
export const SQUARE_THROUGH_CHOICE_DESCRIPTION='Review four counts for the partner right-hand balance, then two for the partner right pull-by and two for the current-neighbor left pull-by. The source states eight total counts and this named passage order, but omits the internal split. The terminal progression happens only after both complete passages; compact hand spacing, sideline opening and preparing the next neighbor balance during the final three-quarter count after the left-hand gate are modeling interpretations. No counts are added.';
const normalize=(s:string)=>s.replace(/[–—]/g,'-').replace(/\s+/g,' ').trim();
export function isBalancedSquareThroughTwoClause(text:string):boolean {
 return /^square through two - partners balance (?:&|and) pull by right, then neighbors pull by left$/i.test(normalize(text));
}
export function isBalancedSquareThroughTwoSource(row:ContraDbRow):boolean {
 const text=normalize(row.text);
 return row.beats===8&&row.progression===true&&(text.match(/⁋/g)||[]).length===1&&text.endsWith('⁋')&&isBalancedSquareThroughTwoClause(text.replace(/ ⁋$/,''));
}
export function balancedSquareThroughSource(row:ContraDbRow):{units:1|2;progression:boolean}|undefined {
 const text=normalize(row.text),markers=(text.match(/⁋/g)||[]).length;
 if(markers>1||markers===1&&!text.endsWith(' ⁋')||row.progression!==(markers===1))return;
 const clause=text.replace(/ ⁋$/,'');
 if(row.beats===8&&isBalancedSquareThroughTwoClause(clause))return{units:1,progression:row.progression};
 if(row.beats===16&&/^square through four - partners balance (?:&|and) pull by right, then neighbors pull by left, then repeat$/i.test(clause))return{units:2,progression:row.progression};
}
export function squareThroughDescription(row:ContraDbRow):string {
 const shape=balancedSquareThroughSource(row);
 if(shape?.units===2)return 'Review four counts for the partner right-hand balance, two for the partner right pull-by and two for the current-neighbor left pull-by in each repeated unit. The literal “then repeat” repeats that complete balanced unit inside the original sixteen-count row. Only a retained final progression marker changes neighbors after the second unit; the first returns facing the current partner across. Compact hand spacing and the final in-budget preparation are modeling interpretations. No counts are added.';
 if(shape&&!shape.progression)return 'Review four counts for the partner right-hand balance, two for the partner right pull-by and two for the current-neighbor left pull-by. The source states eight total counts and the named passage order, but omits this internal split. This unmarked unit returns facing the current partner across, retaining the current neighbor identities. Compact hand spacing and the in-budget preparation for the next balance are modeling interpretations. No counts are added.';
 return SQUARE_THROUGH_CHOICE_DESCRIPTION;
}
export function isSquareThroughChoice(value:unknown):value is SquareThroughChoice {
 if(!value||typeof value!=='object'||![Object.prototype,null].includes(Object.getPrototypeOf(value)))return false;
 const keys=Reflect.ownKeys(value);if(keys.length!==1||keys[0]!=='phaseBeats')return false;
 const property=Object.getOwnPropertyDescriptor(value,'phaseBeats');if(!property?.enumerable||!('value'in property))return false;
 try{assertSquareThroughTiming(property.value);return true;}catch{return false;}
}
/** A suggestion only resolves this row's omitted internal count split. It does
 * not authorize incoming relationships, a transition or a progression event. */
export function squareThroughChoiceForSource(record:ContraDbRecord,rowId=record.rows.at(-1)?.id):{rowId:string;choice:SquareThroughChoice;description:string}|undefined {
 const row=record.rows.find(r=>r.id===rowId);
 if(record.formation.toLowerCase()!=='improper'||!row||!balancedSquareThroughSource(row))return;
 return{rowId:row.id,choice:{phaseBeats:[4,2,2]},description:squareThroughDescription(row)};
}
