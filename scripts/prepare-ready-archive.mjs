import {prepareContraDbReview} from '../src/source-review.ts';
import {readContraDbImport} from '../src/contradb-import.ts';
import {makeContraDbSnapshot} from '../src/contradb-source.ts';

/** Reuse reviewed choices, never a cached admission or motion certificate. */
export function prepareReadyArchive(raw,original,priorEntry){
 if(priorEntry){
  let saved;try{saved=JSON.parse(priorEntry.archive);}catch{throw Error('Unreadable prior Ready archive '+original.sourceId);}
  // snapshotId fingerprints retained HTML only. Metadata, retrieval time and
  // every other retained field must also match the current canonical snapshot.
  if(JSON.stringify(saved?.snapshot)===JSON.stringify(makeContraDbSnapshot(original))){
   const result=readContraDbImport(priorEntry.archive);
   if(!result.dance||!result.coverage.executable)throw Error('Prior Ready archive failed current admission '+original.sourceId+': '+result.errors.join('; '));
   if(JSON.stringify(result.dance.contraDbInterpretation)!==JSON.stringify(saved.interpretation))throw Error('Prior Ready archive changes reviewed choices '+original.sourceId);
   return {result,archive:priorEntry.archive,replayed:true};
  }
 }
 const result=original.sourceId==='94'?readContraDbImport(raw,{interpretation:{circulation:'cw',rows:{'contradb:94:row:4':{chainReceiver:'partner'},'contradb:94:row:6':{balanceBeats:4}}}}):prepareContraDbReview(raw).result;
 return {result,archive:result.dance?.sourceText,replayed:false};
}
