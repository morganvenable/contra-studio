import {makeContraDbSnapshot,readContraDbSource,type ContraDbRecord,type ContraDbSnapshot} from './contradb-source.ts';
import type {Figure,ProgressionEvent} from './types.ts';
import type {HallLineProgram} from './hall-line-sequence.ts';
export interface HallLineChoice {convention:'compact-partner-line-hall-v1';sourceSnapshotId:string;}
export interface HallLinePolicy extends HallLineChoice {snapshot:ContraDbSnapshot;}
export const HALL_LINE_DESCRIPTION='Review the literal starting four-person line beside partners, facing down; adjacent hands are joined. Compact convention: 0.90 m line spacing, 0.60 m hall travel, 1.28 m ring and four 4-count phases within the source 8+8. Turn couples together. Carry ring hands into circle six, release before right-shoulder pass two, and change neighbors only at its reached endpoint. Finite end couples yield 0.90 m outward during hall travel, return before the circle, reenter over circle/pass and turn over the next eight counts. Complete the neighbor do-si-do in seven counts and approach a 1.18 m held balance in its last count. Use a 0.43 m role-allemande radius. The final partner swing opens into the actual starting line over its final two counts and acquires adjacent line hands in its final half count. These geometry and preparation choices remain within source counts.';
const PREAMBLE='Start in short lines four with dancers next to their partner, as though following a partner swing, and ending to face down the hall.';
export function lowerHallLineSource(record:ContraDbRecord,choice:HallLineChoice){
 if(!choice||Object.keys(choice).some(k=>!['convention','sourceSnapshotId'].includes(k))||choice.convention!=='compact-partner-line-hall-v1'||choice.sourceSnapshotId!==record.snapshotId)throw Error('Hall-line choice must bind this exact retained snapshot.');
 if(!/^becket$/i.test(record.formation)||record.preamble.trim()!==PREAMBLE||record.notes.trim()||record.hook.trim())throw Error('Hall-line lowering requires the literal four-person partner-line preamble and no unconsumed prose.');
 const figures:Figure[]=[],byRow=new Map<string,Figure[]>(),compounds=new Map<string,{figureId:string;sourceRowIds:string[]}>();let eventOptions:HallLineProgram['eventOptions']|undefined;
 for(let i=0;i<record.rows.length;i++){
  const row=record.rows[i],text=row.text.trim(),base={id:row.id,label:row.text,beats:row.beats!};let lowered:Figure[];
  if(/^down the hall and turn as a couple$/i.test(text)){
   const up=record.rows[++i];if(row.beats!==8||row.progression||!up||up.beats!==8||up.progression||up.phrase!==row.phrase||!/^up the hall and bend into a ring$/i.test(up.text.trim())||figures.length)throw Error('Opening hall must retain its literal adjacent eight-plus-eight couples-turn rows.');
   lowered=[{...base,kind:'hall-travel',beats:16,hallTurn:'couples',hallPairRelation:'partner',hallPhaseBeats:[4,4,4,4]}];byRow.set(up.id,[]);for(const id of[row.id,up.id])compounds.set(id,{figureId:row.id,sourceRowIds:[row.id,up.id]});
  }else if(/^circle left 3 places$/i.test(text)){
   const pass=record.rows[++i];if(eventOptions||row.beats!==6||row.progression||!pass||pass.beats!==2||!pass.progression||!/^pass through \u204b$/i.test(pass.text.trim()))throw Error('Circle/pass must retain six counts then the marked two-count pass.');
   const source={sourceId:record.snapshotId,url:record.sourceUrl,clause:pass.text,basis:'source-explicit' as const};eventOptions={preparation:{halfWidth:.64,outwardPreparation:.10,passBow:.20,passTravel:1.10,handReleaseBeats:.75,handAcquisitionStart:.75,handAcquisitionBeats:.25},progressionSource:source,endSource:{...source,basis:'reviewed-interpretation',clause:HALL_LINE_DESCRIPTION},reentryBeats:8,endTurnBeats:8};
   lowered=[{...base,kind:'circle',who:'all',direction:'left',amount:.75}];const p:Figure={id:pass.id,label:pass.text,beats:2,kind:'pass-through',who:'neighbor',passingShoulder:'right',entry:'circle-exit',exit:'progressed-neighbors',progression:true};byRow.set(row.id,lowered);byRow.set(pass.id,[p]);figures.push(...lowered,p);continue;
  }else{
   if(row.progression)throw Error('Unconsumed hall-line progression.');
   if(/^next neighbors do si do once$/i.test(text)&&row.beats===8&&figures.at(-1)?.kind==='pass-through')lowered=[{...base,kind:'do-si-do',who:'neighbor',direction:'right',amount:1}];
   else if(/^neighbors balance & swing$/i.test(text)&&row.beats===16)lowered=[{...base,id:row.id+':balance',kind:'balance',who:'neighbor',beats:4},{...base,id:row.id+':swing',kind:'swing',who:'neighbor',beats:12}];
   else if(/^ladles allemande right 1½$/i.test(text)&&row.beats===8)lowered=[{...base,kind:'allemande',who:'robins',direction:'right',amount:1.5}];
   else if(/^partners swing$/i.test(text)&&row.beats===8)lowered=[{...base,kind:'swing',who:'partner'}];
   else throw Error('Unconsumed hall-line clause: '+text);
  }
  byRow.set(row.id,lowered);figures.push(...lowered);
 }
 if(!eventOptions||figures.reduce((n,f)=>n+f.beats,0)!==64||figures.at(-1)?.kind!=='swing'||figures.at(-1)?.who!=='partner')throw Error('Hall line source needs one reached event and a complete counted return.');
 const pass=figures.find(f=>f.kind==='pass-through')!,progressionEvents:ProgressionEvent[]=[{afterFigureId:pass.id,count:1,waitingRoleArrangement:'lark-left',source:eventOptions.progressionSource}];
 return{figures,byRow,compounds,progressionEvents,program:{figures,eventOptions} satisfies HallLineProgram,policy:{...choice,snapshot:makeContraDbSnapshot(record)} satisfies HallLinePolicy};
}
export function hallLineChoiceForSource(record:ContraDbRecord):HallLineChoice|undefined {const choice:HallLineChoice={convention:'compact-partner-line-hall-v1',sourceSnapshotId:record.snapshotId};try{lowerHallLineSource(record,choice);return choice;}catch{return;}}
export function lowerHallLinePolicy(policy:HallLinePolicy){if(!policy||Object.keys(policy).some(k=>!['convention','sourceSnapshotId','snapshot'].includes(k)))throw Error('Unconsumed hall-line policy.');const source=readContraDbSource(JSON.stringify(policy.snapshot));if(!source.record||!source.structurallyValid)throw Error('Hall-line policy requires its exact retained snapshot.');return lowerHallLineSource(source.record,{convention:policy.convention,sourceSnapshotId:policy.sourceSnapshotId});}
