import type {SixTwoPassPolicy} from './types.ts';
import type {ContraDbRecord} from './contradb-source.ts';
export type SixTwoPassChoice=Omit<SixTwoPassPolicy,'source'>;
export const CONVENTIONAL_SIX_TWO_PASS:SixTwoPassChoice={geometry:{halfWidth:.72,rowGap:1.44},circleBeats:6,circlePhaseBeats:[5.25,.75],passBeats:2,circleGather:.22,longLinesAdvance:.36,passEntry:{forward:.24,lane:.30,outward:.04}};
const equal=(a:unknown,b:unknown):boolean=>a===b||!!a&&!!b&&typeof a==='object'&&typeof b==='object'&&Array.isArray(a)===Array.isArray(b)&&Object.keys(a).length===Object.keys(b).length&&Object.entries(b).every(([k,v])=>Object.hasOwn(a,k)&&equal((a as Record<string,unknown>)[k],v));
export const isSixTwoPassChoice=(choice:unknown,record?:ContraDbRecord):choice is SixTwoPassChoice=>equal(choice,record?sixTwoPassChoiceForSource(record):CONVENTIONAL_SIX_TWO_PASS);
const clean=(s:string)=>s.replace(/[–—]/g,'-').replace(/\s+/g,' ').trim();
export function hasSixTwoPassSource(record:ContraDbRecord):boolean {
 const openingGyreSwing=record.rows[0]?.beats===16&&/^neighbors meltdown swing$/i.test(clean(record.rows[0].text));
 const tail=record.rows.slice(-2),openingBalance=record.rows[0]?.beats===16&&/^neighbors balance & swing$/i.test(clean(record.rows[0].text)),openingDoSiDo=record.rows[0]?.beats===8&&/^neighbors do[ -]si[ -]do once$/i.test(clean(record.rows[0].text))&&record.rows[1]?.beats===8&&/^neighbors swing$/i.test(clean(record.rows[1].text));
 return /^improper$/i.test(record.formation)&&(openingBalance||openingDoSiDo||openingGyreSwing)&&tail.length===2&&tail[0].beats===6&&/^circle left 3 places$/i.test(clean(tail[0].text))&&tail[1].beats===2&&/^pass through ⁋$/i.test(clean(tail[1].text))&&record.rows.filter(r=>r.progression).length===1;
}
export const SIX_TWO_CHOICE_DESCRIPTION='Review the compact whole-dance geometry: half-width 0.72 m and row spacing 1.44 m, 22% radius gather during the circle and long-lines advance 0.36 m. The complete three-quarter circle uses 5.25 of its six counts, then 0.75 count prepares the released passage lane; the pass retains its separate two counts. Passage preparation uses forward 0.24 m, lane 0.30 m and outward 0.04 m offsets. These dimensions and internal subdivisions are simulation conventions, not source-supplied details.';

/** The extra compact travel contract is retained only for the exact turn-alone
 * hall plus partner-promenade source context. Existing archive choices stay exact. */
export function sixTwoPassChoiceForSource(record:ContraDbRecord):SixTwoPassChoice {
 const hall=record.rows.some(r=>r.beats===8&&/^down the hall and turn alone$/i.test(clean(r.text))),promenade=record.rows.some(r=>r.beats===8&&/^partners promenade$/i.test(clean(r.text)));
 return hall&&promenade?{...structuredClone(CONVENTIONAL_SIX_TWO_PASS),prefix:{kind:'hall-promenade',hallLineSpacing:.72,hallTravelDistance:.6,hallRingWidth:1.35,hallRingDepth:1.35,promenadeHalfRowGap:.72}}:structuredClone(CONVENTIONAL_SIX_TWO_PASS);
}
export function sixTwoPassDescription(record:ContraDbRecord):string {return SIX_TWO_CHOICE_DESCRIPTION+(sixTwoPassChoiceForSource(record).prefix?' The hall keeps its sixteen source counts, using 0.72 m line spacing, 0.60 m travel and a 1.35 m ring. The partner promenade returns to the same compact 0.72 m half-row spacing. These are additional reviewed simulation conventions; footwork is schematic.':'');}
