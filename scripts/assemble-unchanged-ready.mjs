import {makeContraDbSnapshot} from '../src/contradb-source.ts';

/** Assembly reuse only. This deliberately issues no current admission certificate.
 * The unchanged mandatory Ready CI test must still replay every archive. */
export function assembleUnchangedReadyEntry(original, prior, reviewed, card) {
 if (!prior || !card) return undefined;
 if (card.id!==original.sourceId || card.title!==original.title || card.author!==original.author)
  throw Error('Library identity mismatch '+original.sourceId);
 if (prior.id!==original.sourceId || prior.title!==original.title || prior.author!==original.author || prior.formation!==card.formation) return undefined;
 if (reviewed && (reviewed.id!==original.sourceId || reviewed.archive!==prior.archive)) return undefined;
 let saved;try {saved=JSON.parse(prior.archive);} catch {return undefined;}
 if(saved?.schema!=='contra-studio/contradb-interpretation'||saved.version!==1||saved.sourceSnapshotId!==original.snapshotId||!saved.interpretation||typeof saved.interpretation!=='object'||Array.isArray(saved.interpretation))return undefined;
 if(JSON.stringify(saved.snapshot)!==JSON.stringify(makeContraDbSnapshot(original)))return undefined;
 return {...prior};
}
