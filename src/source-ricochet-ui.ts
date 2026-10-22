import type {ContraDbRecord} from './contradb-source.ts';
import type {ContraDbInterpretation} from './contradb-import.ts';
type RicochetChoice=NonNullable<NonNullable<ContraDbInterpretation['rows']>[string]['ricochetHey']>;
/** Reconstruct the offered half-hey choice from retained clauses after removal.
 * This offers a review; the importer still validates roles, timing and motion. */
export function halfRicochetChoice(record:ContraDbRecord,rowId:string):RicochetChoice|undefined {
 const index=record.rows.findIndex(row=>row.id===rowId),row=record.rows[index];
 if(!row||row.beats!==8||row.progression)return;
 const hey=row.text.match(/^(gentlespoons?|gents|men|larks|ladles|ladies|women|robins|ravens) start a half hey - (lefts|rights) in center, (rights|lefts) on ends - (gentlespoons?|gents|men|larks|ladles|ladies|women|robins|ravens) ricochet$/i);
 const previous=record.rows[index-1]?.text.match(/^(partners?|neighbors?) right hand balance (?:&|and) box the gnat$/i),next=record.rows[index+1]?.text.match(/^(partners?|neighbors?) swing$/i);
 if(!hey||!previous||!next||hey[2].toLowerCase()===hey[3].toLowerCase())return;
 return {sidePair:previous[1].toLowerCase().startsWith('partner')?'partner':'neighbor',exitPair:next[1].toLowerCase().startsWith('partner')?'partner':'neighbor',amount:.5,bounceDirection:hey[2].toLowerCase()==='lefts'?'back-right':'back-left',bounceFacing:'across',bounceHands:'both'};
}
