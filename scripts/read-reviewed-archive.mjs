import {readFileSync} from 'node:fs';
import {makeContraDbSnapshot} from '../src/contradb-source.ts';

/** Explicit reviews are source-bound inputs, never fallback suggestions. */
export function validateReviewedArchive(archive,original){
 let saved;try{saved=JSON.parse(archive);}catch{throw Error('Unreadable explicit reviewed archive '+original.sourceId);}
 if(saved?.schema!=='contra-studio/contradb-interpretation'||saved.version!==1||saved.sourceSnapshotId!==original.snapshotId)throw Error('Invalid explicit reviewed archive binding '+original.sourceId);
 if(JSON.stringify(saved.snapshot)!==JSON.stringify(makeContraDbSnapshot(original)))throw Error('Explicit reviewed archive snapshot mismatch '+original.sourceId);
 return {id:original.sourceId,archive};
}
export function readReviewedArchive(original,directory=new URL('../test-data/reviewed-interpretations/',import.meta.url)){
 if(!/^[1-9]\d*$/.test(original.sourceId))throw Error('Invalid reviewed source ID');
 let archive;try{archive=readFileSync(new URL(original.sourceId+'.json',directory),'utf8');}catch(error){if(error.code==='ENOENT')return undefined;throw error;}
 return validateReviewedArchive(archive,original);
}
