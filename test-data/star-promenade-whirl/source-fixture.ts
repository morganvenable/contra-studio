/** Preserved public source plus explicit isolated review choices. Nothing in
 * this fixture changes public import admission or identifies motion by dance ID. */
import {readFileSync} from 'node:fs';
import {prepareContraDbReview} from '../../src/source-review.ts';
import {REGISTERED_MOTION_CAPABILITIES} from '../../src/capabilities.ts';
import type {StarPromenadeFigure,ButterflyWhirlFigure} from '../../src/star-promenade-whirl.ts';
export const STAR_PROMENADE_REVIEW={centerRole:'lark',centerHand:'left',pairRelation:'partner',carriedSide:'right',hold:'half-shoulder-waist',amount:.5,pickupPreparationBeats:2.5} as const;
export const BUTTERFLY_REVIEW={pairRelation:'partner',direction:'left',amount:1.375,backingRole:'lark',exit:'paired-sidelines',releaseBeats:.5} as const;
export function starWhirlSource(){
 const raw=readFileSync(new URL('./2531.json',import.meta.url),'utf8'),review=prepareContraDbReview(raw,[],{...REGISTERED_MOTION_CAPABILITIES,starPromenadeWhirls:false}),rows=review.result.rows;
 const star:StarPromenadeFigure={id:rows[3].source.id,kind:'star-promenade',label:rows[3].source.text,beats:4,confidence:'approximate',who:'partner',centerRole:'lark',hands:'left',direction:'left',amount:.5,approachHold:'half-shoulder-waist',entry:'radial-partner-pairs',exit:'radial-partner-pairs'};
 const whirl:ButterflyWhirlFigure={id:rows[4].source.id,kind:'butterfly-whirl',label:rows[4].source.text,beats:4,confidence:'approximate',who:'partner',centerRole:'lark',direction:'left',amount:1.375,approachHold:'half-shoulder-waist',entry:'radial-partner-pairs',exit:'paired-sidelines'};
 return{raw,review,record:review.result.record!,figures:rows.flatMap((row,i)=>i===3?[star]:i===4?[whirl]:row.figures)};
}
export function isolatedStarWhirlDance(){
 const source=starWhirlSource(),{record,figures}=source,base={sourceId:record.snapshotId,url:record.sourceUrl};
 return{...source,dance:{id:'isolated-star-whirl-source',title:record.title,author:record.author,sourceUrl:record.sourceUrl,formation:'duple-improper' as const,description:'Isolated source-backed whole-motion proof.',figures,progressionEvents:[{afterFigureId:figures.at(-1)!.id,count:1,waitingRoleArrangement:'lark-left' as const,source:{...base,clause:record.rows.at(-1)!.text,basis:'source-explicit' as const}}],endPolicy:{waitingRoleArrangement:'lark-left' as const,sameEndTurnBeats:8,sameEndTurnOffsetBeats:4 as const,reentryPreparationBeats:0 as const,source:{...base,clause:'Out couples wait four counts, exchange at the same end over eight counts, then wait for the final progression.',basis:'reviewed-interpretation' as const}}}};
}
