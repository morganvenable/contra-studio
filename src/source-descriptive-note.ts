import type {ContraDbRecord} from './contradb-source.ts';
/** Bounded evaluative prose; no movement, timing, setup or end instruction is inferred. */
export function descriptiveSourceNote(record:Pick<ContraDbRecord,'notes'>):string|undefined {
 const note=record.notes;
 if(!/^One of the great glossary dances\. Simple figures and gentle timing, but not so comprehensive that it leaves you with no options to make the second dance feel distinctive\. Definitely a favorite of mine\.$/.test(note))return;
 return 'Retain the source author’s evaluation of simplicity, gentle timing and program variety as descriptive context. It supplies no counts, movement or end-effect instruction; the complete printed table remains authoritative for this interpretation.';
}
