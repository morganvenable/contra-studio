import {capturePlainData} from './owned-program-cache.ts';
import {sourceAnnotationLinks} from './source-alternatives.ts';
import type {ContraDbRecord,ContraDbRow} from './contradb-source.ts';
export interface RollawayChoice {direction:'left-to-right';}
export const ROLLAWAY_DESCRIPTION='The source names larks as the initiating half-sashayers and their current neighbor robins as the rolled dancers. Review the omitted lateral direction as the robin rolling left to right in front of the lark while the lark half-sashays behind, each reaching the other’s prior place within the literal four counts. The selected schematic contact route starts with released hands, acquires the nearest robin-right/lark-left hands when reachable, releases and changes to robin-left/lark-right, then releases again at the exit; it adds no raised underarm arch. Incoming diagonal headings settle into the inward across-facing pair frame during the first 1½ counts while movement and the full relative body roll are already underway. The robin’s one modeled full roll is relative to that acquiring frame, so its net room-facing turn also includes the initial orientation change. These hand, facing and roll details are animation conventions, not source-authored holds or subdivisions, and no stationary preparation beat is added. Named neighbors, actor roles and the progression epoch remain unchanged.';
export function rollawaySourceRoles(row:ContraDbRow):{rollRole:'lark'|'robin';sashayRole:'lark'|'robin'}|undefined {
 if(row.beats!==4||row.progression)return;
 if(row.text==='gentlespoons roll away neighbors with a half sashay')return{rollRole:'robin',sashayRole:'lark'};
 if(row.text==='ladles roll away neighbors with a half sashay')return{rollRole:'lark',sashayRole:'robin'};
}
export function rollawaySource(row:ContraDbRow):boolean{return rollawaySourceRoles(row)!==undefined;}
export function rollawayDescription(row:ContraDbRow):string {
 const roles=rollawaySourceRoles(row);if(!roles)throw new Error('A rollaway description requires an exact supported source clause.');
 return roles.rollRole==='robin'?ROLLAWAY_DESCRIPTION:ROLLAWAY_DESCRIPTION.replace(/\b(larks?|robins?)\b/g,word=>({lark:'robin',larks:'robins',robin:'lark',robins:'larks'} as Record<string,string>)[word]);
}
export function isRollawayChoice(value:unknown):value is RollawayChoice{try{const v=capturePlainData(value)as RollawayChoice;return !!v&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).length===1&&v.direction==='left-to-right';}catch{return false;}}
const releasedTeachingNote="3/2012, revised 7/12 (For my lovely wife, Kathy) Transition: Circle Right, with Next Circle Left: I really like this flow, but many dancers will need help doing it properly. I will sometimes have dancers take hands in a ring, but not go anyplace. Then drop hands, and turn to make a ring with their next neighbors. I might have them practice this a couple of times before doing it with the circles, and most come to understand that the easy (smooth) way to turn is to the inside toward your partner as you make the transition. I recently read of an even better teaching tip. After the circle right 1X, you are on the side of the set with your neighbor, and your partner is across the set from you. Now, you have one hand with your neighbor - take that hand and give it to your partner. Now, keep that hand as you turn to face your new neighbors, and make a ring with them. [Using this technique, dancers will be compelled to turn toward their partner as they make the transition.] See it danced here: http://www.youtube.com/watch?v=6mUKzJd6jpM&list=UUF_ExFYC6eUgoCdNsFQ0ADg";
export const RELEASED_CIRCLE_TRANSITION_DESCRIPTION='Review the released-hand method in the first teaching passage for the modeled transition from the complete right circle to the next left circle. After completing the full circle, release hands and turn inward toward the persistent partner and next neighbors at the produced roots. The later hand-transfer/retained-partner-hand teaching technique remains visible and unselected. The practice instructions, stationary teaching rings and repeated exercises are not inserted into the timed dance. Dates, dedication, perceived teaching outcomes and the video reference remain attributed, unverified context. The seven-plus-one model timing is independently removable.';
/** This binds the explicit teaching alternative to its two local repeat-edge
 * circle clauses. It does not recognize a complete dance or verify the video. */
export function releasedCircleTransitionNote(record:ContraDbRecord):string|undefined{
 const first=record.rows[0],last=record.rows.at(-1);
 if(record.notes!==releasedTeachingNote||record.formation!=='improper'||first?.text!=='circle left 2 places'||first.beats!==4||first.progression||last?.text!=='circle right 4 places ⁋'||last.beats!==8||!last.progression)return;
 const links=sourceAnnotationLinks(record,'notes'),url='http://www.youtube.com/watch?v=6mUKzJd6jpM&list=UUF_ExFYC6eUgoCdNsFQ0ADg';
 if(!links||links.length!==1||links[0].href!==url||links[0].text!==url.replace('&','&amp;'))return;
 return RELEASED_CIRCLE_TRANSITION_DESCRIPTION;
}
/** The source-named neighbor rollaway and following neighbor balance retain
 * the same side pair through the intervening literal four-pass half hey. */
export function rollawayNeighborHey(record:ContraDbRecord,row:ContraDbRow):boolean{const prior=record.rows[row.index-1],next=record.rows[row.index+1];return !!prior&&rollawaySourceRoles(prior)?.sashayRole==='lark'&&row.beats===8&&!row.progression&&row.text==='gentlespoons start a half hey - lefts in center, rights on ends'&&!!next&&!next.progression&&(next.text==='neighbors balance'&&next.beats===4||next.text==='neighbors balance & swing'&&next.beats===16);}
