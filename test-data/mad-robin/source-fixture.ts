/** Retained source and explicit removable candidate choices. This is deliberately
 * outside the public import/Ready workflow until independent source review. */
import {readFileSync} from 'node:fs';
import {prepareContraDbReview} from '../../src/source-review.ts';
import {REGISTERED_MOTION_CAPABILITIES} from '../../src/capabilities.ts';
import {assertMadRobinSourceChoices,type MadRobinSourceChoices} from '../../src/source-mad-robin.ts';
import type {MadRobinFigure} from '../../src/mad-robin.ts';
import type {MadRobinDance} from '../../src/mad-robin-sequence.ts';
export function isolatedMadRobinSource(){
 const raw=readFileSync(new URL('./2693.json',import.meta.url),'utf8'),review=prepareContraDbReview(raw,[],{...REGISTERED_MOTION_CAPABILITIES,madRobins:false}),record=review.result.record!;
 if(record.snapshotId!=='contradb:2693:f1849a36caef32b8')throw new Error('The candidate choices require their retained source snapshot.');
 const choices:MadRobinSourceChoices={sourceSnapshotId:record.snapshotId,rows:Object.fromEntries([0,6].map(i=>[record.rows[i].id,{orbitRelation:'neighbor',facingRelation:'partner',frontRole:'robin',direction:i===0?'clockwise':'counterclockwise',amount:1}])),hook:{meaning:'old-neighbor-full-return-then-next-neighbor',sourceText:record.hook}};assertMadRobinSourceChoices(record,choices);
 const figures=review.result.rows.flatMap((row,i)=>{if(i!==0&&i!==6)return row.figures;const f:MadRobinFigure={id:row.source.id,label:row.source.text,beats:8,kind:'mad-robin',who:'all',orbitRelation:'neighbor',facingRelation:'partner',frontRole:'robin',orbitDirection:i===0?'clockwise':'counterclockwise',amount:1,entry:'paired-sidelines-facing-across',exit:'same-slots-facing-across',confidence:'approximate',...(i===6?{progression:true}:{})};return[f];});
 const source={sourceId:record.snapshotId,url:record.sourceUrl},dance:MadRobinDance={id:'isolated-mad-robin-source',title:record.title,author:record.author,formation:'duple-improper',sourceUrl:record.sourceUrl,description:'Isolated old-neighbor mad-robin full return and source-marked next-neighbor rebind proof.',figures,
  progressionEvents:[{afterFigureId:figures.at(-1)!.id,count:1,waitingRoleArrangement:'lark-left',source:{...source,clause:record.rows.at(-1)!.text,basis:'source-explicit'}}],
  endPolicy:{waitingRoleArrangement:'lark-left',sameEndTurnBeats:8,sameEndTurnOffsetBeats:0,reentryPreparationBeats:0,source:{...source,clause:'Out couples exchange at the same physical end over the first eight counts, then wait facing their persistent partner for the next source terminal event.',basis:'reviewed-interpretation'}},
  madRobinPolicy:{terminal:'full-return-around-old-neighbor',repeatEntry:'clockwise-around-next-neighbor',facing:'persistent-partner-across',endFacing:'persistent-partner',allemandeEntryFacingBeats:1,allemandeExitFacingBeats:1,circleEntryFacingBeats:.75,source:{...source,clause:'Interpret the hook “mad ladle to mad ladle progression” as a full counterclockwise orbit around the old neighbor, then a source-endpoint rebind to the next clockwise neighbor orbit. The earlier middle already exchanges couple ranks. Robin allemande facing prepares in its first/last count; circle facing prepares in its first three-quarter count.',basis:'reviewed-interpretation'}}};
 return{raw,review,record,choices,dance};
}
