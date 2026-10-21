import {readContraDbSource,makeContraDbSnapshot,type ContraDbRecord,type ContraDbSnapshot} from './contradb-source.ts';
import type {Figure,Role,ProgressionEvent} from './types.ts';
import type {BecketWaveProgram,BecketWaveOperation} from './becket-wave-sequence.ts';
export interface BecketWaveChoice {convention:'compact-becket-left-wave-v1';sourceSnapshotId:string;}
export interface BecketWavePolicy extends BecketWaveChoice {snapshot:ContraDbSnapshot;}
export const BECKET_WAVE_DESCRIPTION='Reviewed compact Becket convention: clockwise circle/pass progression; right-shoulder pass; next-neighbor swing; partner chain receiver; half hey takes left partner hands in the literal long wave. Circulates balance 4 and travel 4 counts, preserving the named crossing and left-loop roles. The final circulate prepares the following partner balance during its last 2 counts; partner balance/swing uses 4+12. End couples reenter over the opening 8 counts and turn over the following 8. All preparations stay within source counts.';
const role=(word:string):Role=>word==='ladles'?'robin':'lark';
/** A local clause lowering. No title, source ID, row count or sequence signature selects motion. */
export function lowerBecketWaveSource(record:ContraDbRecord,choice:BecketWaveChoice){
 if(!choice||Object.keys(choice).some(k=>!['convention','sourceSnapshotId'].includes(k))||choice.convention!=='compact-becket-left-wave-v1'||choice.sourceSnapshotId!==record.snapshotId)throw Error('The Becket wave convention must name this exact source snapshot.');
 if(!/^Becket(?: CW)?$/i.test(record.formation)||record.preamble.trim()||record.notes.trim())throw Error('Becket wave lowering cannot consume this formation, preamble or notes.');
 const operations:BecketWaveOperation[]=[],byRow=new Map<string,Figure[]>();let waveInward:Role|undefined,assertionDue=false;
 const requireAssertion=()=>{if(assertionDue)throw Error('A long-wave endpoint requires its literal zero-count facing assertion.');};
 for(let i=0;i<record.rows.length;i++){
  const r=record.rows[i],text=r.text.trim(),row={id:r.id,label:r.text,beats:r.beats!};let op:BecketWaveOperation|undefined;
  const assertion=text.match(/^form long waves - (ladles|gentlespoons) face in, (ladles|gentlespoons) face out$/i);
  if(assertion){if(r.beats!==0||r.progression||!assertionDue||role(assertion[1].toLowerCase())!==waveInward||assertion[1].toLowerCase()===assertion[2].toLowerCase())throw Error('Zero-count wave assertion disagrees with the reached endpoint.');byRow.set(r.id,[]);assertionDue=false;continue;}
  requireAssertion();
  if(/^circle left 3 places$/i.test(text)){
   const next=record.rows[++i];if(r.beats!==6||r.progression||!next||next.beats!==2||!next.progression||!/^pass through\s*\u204b$/i.test(next.text.trim()))throw Error('Circle/pass requires literal unmarked six-count circle and marked two-count pass.');
   const source={sourceId:record.snapshotId,url:record.sourceUrl,clause:next.text,basis:'source-explicit' as const};
   op={mode:'circle-pass',circle:{...row,kind:'circle',who:'all',direction:'left',amount:.75},pass:{id:next.id,label:next.text,beats:2,kind:'pass-through',who:'neighbor',passingShoulder:'right',entry:'circle-exit',exit:'progressed-neighbors',progression:true},options:{preparation:{halfWidth:.64,outwardPreparation:.10,passBow:.20,passTravel:1.10,handReleaseBeats:.75,handAcquisitionStart:.75,handAcquisitionBeats:.25},progressionSource:source,endSource:{...source,basis:'reviewed-interpretation',clause:BECKET_WAVE_DESCRIPTION},reentryBeats:8,endTurnBeats:8}};byRow.set(r.id,[op.circle]);byRow.set(next.id,[op.pass]);
  }else{
   if(r.progression)throw Error('Unconsumed progression marker in Becket wave source.');
   if(/^next neighbors swing$/i.test(text)&&r.beats===8&&operations.at(-1)?.mode==='circle-pass')op={mode:'released-swing',figure:{...row,kind:'swing',who:'neighbor'},closeBeats:1.25,acquireBeats:.5,releaseBeats:1};
   else if(/^ladles chain$/i.test(text)&&r.beats===8)op={mode:'chain',figure:{...row,kind:'robins-chain',who:'partner'},receiverYield:.3};
   else if(/^ladles start a half hey - rights in center, lefts on ends - and partners take left hands$/i.test(text)&&r.beats===8){op={mode:'hey-wave',figure:{...row,kind:'hey',amount:.5,heyStartRole:'robin',who:'partner',centerShoulder:'right',endShoulder:'left'},halfDepth:.64,spec:{beats:8,firstRole:'robin',sidePair:'partner',centerShoulder:'right',endShoulder:'left',inwardRole:'robin',localHand:'left',handRelation:'partner',acquisitionBeats:.25}};waveInward='robin';assertionDue=true;}
   else {const circulate=text.match(/^balance & box circulate - (ladles|gentlespoons) cross while (ladles|gentlespoons) loop left( - and neighbors take left hands)?$/i);
    if(circulate&&r.beats===8){const crossRole=role(circulate[1].toLowerCase()),loopRole=role(circulate[2].toLowerCase());if(crossRole===loopRole||waveInward!==crossRole)throw Error('Crossing roles must face into the actual carried wave.');const next=record.rows[i+1],paired=next?.beats===16&&/^partners balance & swing$/i.test(next.text);if(circulate[3]&&paired)throw Error('Named neighbor wave cannot be replaced by a partner balance.');op={mode:'circulate',figure:{...row,kind:'balance-box-circulate',crossRole,loopRole,loopDirection:'left',phaseBeats:[4,4],balanceStyle:'right-left'},spec:{kind:'balance-box-circulate',beats:8,crossRole,loopRole,loopDirection:'left',phaseBeats:[4,4],balanceStyle:'right-left',...(paired?{exit:{kind:'partner-balance' as const,preparationBeats:2,pairSpacing:1.18,handAcquisitionBeats:.25}}:{})}};waveInward=paired?undefined:loopRole;assertionDue=!paired;
    }else if(/^partners balance & swing$/i.test(text)&&r.beats===16)op={mode:'paired-finish',balance:{id:r.id+':balance',label:'Partner balance',kind:'balance',who:'partner',beats:4},swing:{id:r.id+':swing',label:'Partner swing',kind:'swing',who:'partner',beats:12},spec:{beats:16,phaseBeats:[4,12],who:'partner',frameReleaseBeats:1}};
   }
   if(!op)throw Error(`Unconsumed Becket wave clause: ${text}`);
   byRow.set(r.id,op.mode==='paired-finish'?[op.balance,op.swing]:op.mode==='circle-pass'?[op.circle,op.pass]:[op.figure]);
  }
  operations.push(op);
 }
 requireAssertion();
 if(record.hook.trim()&&!(/^easy box circulates from a half hey to a wave$/i.test(record.hook.trim())&&operations.some(o=>o.mode==='hey-wave')&&operations.some(o=>o.mode==='circulate')))throw Error('Unconsumed source hook in Becket wave interpretation.');
 const events=operations.filter(o=>o.mode==='circle-pass');if(events.length!==1||!operations.some(o=>o.mode==='hey-wave'))throw Error('One source-marked progression and an actual hey-to-wave producer are required.');
 const figures=record.rows.flatMap(r=>byRow.get(r.id)??[]);if(figures.reduce((n,f)=>n+f.beats,0)!==64)throw Error('Source-counted Becket wave program must total 64.');
 const event=events[0],progressionEvents:ProgressionEvent[]=[{afterFigureId:event.pass.id,count:1,waitingRoleArrangement:'lark-left',source:event.options.progressionSource}];
 const endpointClaims:Array<{beat:number;inwardRole?:Role;handRelation?:'partner'|'neighbor'}>=[];let count=0;
 for(const row of record.rows){count+=row.beats!;const facing=row.text.match(/^form long waves - (ladles|gentlespoons) face in,/i),hand=row.text.match(/and (partners|neighbors) take left hands$/i);if(facing||hand)endpointClaims.push({beat:count,...(facing?{inwardRole:role(facing[1].toLowerCase())}:{}),...(hand?{handRelation:hand[1].toLowerCase()==='partners'?'partner' as const:'neighbor' as const}:{})});}
 const program:BecketWaveProgram={id:record.sourceId,title:record.title,sourceId:record.snapshotId,sourceUrl:record.sourceUrl,operations};
 return{program,figures,byRow,progressionEvents,endpointClaims,policy:{...choice,snapshot:makeContraDbSnapshot(record)} satisfies BecketWavePolicy};
}
export function becketWaveChoiceForSource(record:ContraDbRecord):BecketWaveChoice|undefined{const choice:BecketWaveChoice={convention:'compact-becket-left-wave-v1',sourceSnapshotId:record.snapshotId};try{lowerBecketWaveSource(record,choice);return choice;}catch{return;}}
export function lowerBecketWavePolicy(policy:BecketWavePolicy){if(!policy||Object.keys(policy).some(k=>!['convention','sourceSnapshotId','snapshot'].includes(k)))throw Error('Unconsumed Becket wave policy field.');const source=readContraDbSource(JSON.stringify(policy.snapshot));if(!source.record||!source.structurallyValid)throw Error('Becket wave policy requires its retained source snapshot.');return lowerBecketWaveSource(source.record,{convention:policy.convention,sourceSnapshotId:policy.sourceSnapshotId});}
