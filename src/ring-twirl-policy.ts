import type {ProgressionEvidence} from './progression-topology.ts';
/** Source-omitted internal allocations are retained separately from the actual
 * four-count partner balance, four-count twirl and terminal progression mark. */
export interface RingTwirlPolicy {
 gyrePhaseBeats:readonly[7,1];balance:'partner-facing-two-hand';balancePhaseBeats:readonly[3,1];
 twirlPhaseBeats:readonly[3,1];return:'next-inward-ring';source:ProgressionEvidence;
}
export type RingTwirlChoice=Omit<RingTwirlPolicy,'source'>;
export const CONVENTIONAL_RING_TWIRL:RingTwirlChoice=Object.freeze({gyrePhaseBeats:Object.freeze([7,1]as const),balance:'partner-facing-two-hand',balancePhaseBeats:Object.freeze([3,1]as const),twirlPhaseBeats:Object.freeze([3,1]as const),return:'next-inward-ring'});
export function isRingTwirlChoice(value:unknown):value is RingTwirlChoice {
 const v=value as Partial<RingTwirlChoice>|undefined;
 return !!v&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).length===5&&Array.isArray(v.gyrePhaseBeats)&&v.gyrePhaseBeats.length===2&&v.gyrePhaseBeats[0]===7&&v.gyrePhaseBeats[1]===1&&v.balance==='partner-facing-two-hand'&&v.return==='next-inward-ring'&&Array.isArray(v.balancePhaseBeats)&&v.balancePhaseBeats.length===2&&v.balancePhaseBeats[0]===3&&v.balancePhaseBeats[1]===1&&Array.isArray(v.twirlPhaseBeats)&&v.twirlPhaseBeats.length===2&&v.twirlPhaseBeats[0]===3&&v.twirlPhaseBeats[1]===1;
}
export function ownRingTwirlPolicy(value:RingTwirlPolicy):Readonly<RingTwirlPolicy>{
 if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).length!==6||!isRingTwirlChoice(Object.fromEntries(Object.entries(value).filter(([k])=>k!=='source')))||!value.source||Object.keys(value.source).length!==4||Object.keys(value.source).some(k=>!['sourceId','url','clause','basis'].includes(k))||(['sourceId','url','clause']as const).some(k=>typeof value.source[k]!=='string'||!value.source[k].trim())||value.source.basis!=='reviewed-interpretation')throw new Error('The ring/twirl return requires its exact source-bound reviewed seven-plus-one gyre, partner-facing balance and three-plus-one twirl convention.');
 return Object.freeze({...CONVENTIONAL_RING_TWIRL,source:Object.freeze({...value.source})});
}
export const RING_TWIRL_CHOICE_DESCRIPTION='Review the source-omitted handoffs: complete the robin gyre in seven of its eight counts and prepare the partner swing in its final count. For the partner-balance/twirl return, use a partner-facing two-hand balance for the first three of its four counts, then release and prepare the side-by-side lark-right/robin-left handhold in its last count. Complete the California half-twirl in three of its four counts, then use its last count to reach the exact next inward ring or waiting end. The last-count 0.35 m outward row opening for active couples is a spacing transition, not another station move or an early neighbor change; waiting couples instead widen from 0.55 m to 0.90 m half-width at the same end. Both source figures retain four counts, and neighbors change only after the terminal twirl. These internal allocations and return stance are modeling conventions.';
