import{lowerBecketPassShortWaveSource,BECKET_PASS_SHORT_WAVE_DESCRIPTION}from'./source-becket-pass-short-wave.ts';
import{makeContraDbSnapshot,readContraDbSource,type ContraDbRecord,type ContraDbSnapshot}from'./contradb-source.ts';
import type{Figure,ProgressionEvent,FiniteEndPolicy}from'./types.ts';
export interface BecketShortWaveChoice{convention:'across-partner-short-wave-v1'|'pass-neighbor-short-wave-v1';sourceSnapshotId:string;}
export interface BecketShortWavePolicy extends BecketShortWaveChoice{snapshot:ContraDbSnapshot;}
export const BECKET_SHORT_WAVE_DESCRIPTION='Review clockwise Becket, a four-count diagonal-left slice and four-count straight retreat, with neighbor rebinding only at its reached endpoint. Pass across by right shoulders in four counts, preparing actual partners for the counted right-hand three-quarter turn into a short wave with Larks in the middle. Each Rory uses four counts balancing first in its travel direction and four sliding without a spin. The two-count Lark left-hand half turn uses one count for the actual half orbit and one for catching the actual neighbor; retain the fourteen-count neighbor swing. Keep contacts within 0.64 m arm reach and release changed ordinary frames over the first quarter count and acquire their replacement over the next quarter count. Finite end couples turn over eight counts after the slice and wait for the next slice. These internal timing and formation choices remain within the source counts.';
export const becketShortWaveDescription=(choice:BecketShortWaveChoice)=>choice.convention==='pass-neighbor-short-wave-v1'?BECKET_PASS_SHORT_WAVE_DESCRIPTION:BECKET_SHORT_WAVE_DESCRIPTION;
export function lowerBecketShortWaveSource(record:ContraDbRecord,choice:BecketShortWaveChoice){
 if(choice?.convention==='pass-neighbor-short-wave-v1')return lowerBecketPassShortWaveSource(record,choice);
 if(!choice||Object.keys(choice).some(k=>!['convention','sourceSnapshotId'].includes(k))||choice.convention!=='across-partner-short-wave-v1'||choice.sourceSnapshotId!==record.snapshotId)throw Error('Short-wave choice requires this exact snapshot.');
 if(!/^Becket(?: CW)?$/i.test(record.formation)||record.preamble.trim()||record.notes.trim()||record.hook.trim())throw Error('Short-wave convention cannot ignore formation or source prose.');
 const figures:Figure[]=[],byRow=new Map<string,Figure[]>();let event:ProgressionEvent|undefined;
 for(const row of record.rows){const text=row.text.replace(/⁋/g,'').trim(),base={id:row.id,label:row.text,beats:row.beats!};let f:Figure;
  if(/^slice left and straight back$/i.test(text)&&row.beats===8&&row.progression){f={...base,kind:'becket-slice',who:'all',direction:'left',phaseBeats:[4,4],entry:'side-couples',exit:'progressed-neighbors',sliceReturn:'straight-back',progression:true};if(event)throw Error('Only one slice event is consumed.');event={afterFigureId:row.id,count:1,waitingRoleArrangement:'lark-left',source:{sourceId:record.snapshotId,url:record.sourceUrl,clause:row.text,basis:'source-explicit'}};}
  else {if(row.progression)throw Error('Unconsumed progression marker.');
   if(/^pass through across the set$/i.test(text)&&row.beats===4)f={...base,kind:'pass-through',who:'neighbor',passingShoulder:'right',entry:'paired-sidelines',exit:'paired-sidelines'};
   else if(/^partners allemande right ¾ to short waves with gentlespoons in the middle$/i.test(text)&&row.beats===4)f={...base,kind:'allemande',who:'partner',direction:'right',amount:.75,entry:'paired-sidelines',exit:'short-wave'};
   else if(/^balance & Rory O'More (right|left)$/i.test(text)&&row.beats===8){const direction=/right$/i.test(text)?'right':'left';f={...base,kind:'balance-rory-slide',who:'all',direction,balanceFirst:direction,stationShift:1,spin:'full',spinAmount:1,spinDirection:direction,phaseBeats:[4,4],entry:'short-wave',exit:'short-wave'};}
   else if(/^gentlespoons allemande left ½$/i.test(text)&&row.beats===2)f={...base,kind:'allemande',who:'larks',direction:'left',amount:.5,entry:'short-wave',exit:'neighbor-swing'};
   else if(/^neighbors swing$/i.test(text)&&row.beats===14)f={...base,kind:'swing',who:'neighbor'};
   else if(/^circle left 3 places$/i.test(text)&&row.beats===8)f={...base,kind:'circle',who:'all',direction:'left',amount:.75};
   else if(/^partners swing$/i.test(text)&&row.beats===8)f={...base,kind:'swing',who:'partner'};
   else throw Error('Unconsumed short-wave clause: '+text);
  }figures.push(f);byRow.set(row.id,[f]);
 }
 if(!figures.some(f=>f.kind==='balance-rory-slide')||!event||figures.reduce((n,f)=>n+f.beats,0)!==64)throw Error('Short-wave source requires complete counts and its explicit slice event.');
 const endPolicy:FiniteEndPolicy={waitingRoleArrangement:'lark-left',sameEndTurnBeats:8,reentryPreparationBeats:0,source:{sourceId:record.snapshotId,url:record.sourceUrl,basis:'reviewed-interpretation',clause:BECKET_SHORT_WAVE_DESCRIPTION}};
 return{figures,byRow,progressionEvents:[event],endPolicy,policy:{...choice,snapshot:makeContraDbSnapshot(record)}satisfies BecketShortWavePolicy};
}
export function becketShortWaveChoiceForSource(record:ContraDbRecord):BecketShortWaveChoice|undefined{const choice:BecketShortWaveChoice={convention:'across-partner-short-wave-v1',sourceSnapshotId:record.snapshotId};try{lowerBecketShortWaveSource(record,choice);return choice;}catch{const alternate:BecketShortWaveChoice={...choice,convention:'pass-neighbor-short-wave-v1'};try{lowerBecketPassShortWaveSource(record,alternate);return alternate;}catch{return;}}}
export function lowerBecketShortWavePolicy(policy:BecketShortWavePolicy){if(!policy||Object.keys(policy).some(k=>!['convention','sourceSnapshotId','snapshot'].includes(k)))throw Error('Unconsumed short-wave policy.');const source=readContraDbSource(JSON.stringify(policy.snapshot));if(!source.structurallyValid||!source.record)throw Error('Retained short-wave snapshot required.');return lowerBecketShortWaveSource(source.record,{convention:policy.convention,sourceSnapshotId:policy.sourceSnapshotId});}
