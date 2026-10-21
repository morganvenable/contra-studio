/** Applicability chooses a compiler; compilation decides semantic validity.
 * Never catch a selected route's rejection and fall through to a legacy route. */
import type {Dance} from './types.ts';
export type SequenceRouteApplicability='applicable'|'not-applicable';
export function stateSequenceApplicability(dance:Dance):SequenceRouteApplicability {
 if(dance.formation!=='duple-improper'||[dance.endPolicy,dance.madRobinPolicy,dance.ringTwirlPolicy,dance.diagonalHeyPolicy,dance.sixTwoPassPolicy,dance.ovalPolicy].some(p=>p!==undefined))return'not-applicable';
 const last=dance.figures.at(-1),events=dance.progressionEvents;
 // These declared formation/initial-binding domains still have their own
 // compilers. They are not ordinary sideline steps in the shared registry.
 if(['swing','ring-balance','half-poussette','form-short-wave'].includes(dance.figures[0]?.kind??'')||dance.figures.some(f=>f.entry==='long-waves'||f.exit==='long-waves'||f.kind==='pass-to-wave'||f.kind==='pass-to-wave-balance')||Array.isArray(events)&&events.some(e=>e?.initialBinding!==undefined))return'not-applicable';
 // An explicit terminal event selects the common route without requiring a
 // special figure. Retain malformed terminal intent so its guard rejects it.
 if(events!==undefined&&(last?.progression===true||Array.isArray(events)&&events.length===1&&events[0]?.afterFigureId===last?.id))return'applicable';
 // Existing explicitly carried entry declarations still require their event;
 // deleting it cannot turn them into undeclared legacy figures.
 if(dance.figures.some(f=>f.kind==='pass-through'&&['larks','robins'].includes(f.who??'')||f.kind==='long-lines-rollaway'&&f.rollRelation==='neighbor'||f.kind==='do-si-do'&&f.exit!==undefined||f.kind==='rollaway'||f.kind==='couples-do-si-do'||f.who==='ones'||f.kind==='hey'&&f.exit==='same-slots-facing-across'||f.kind==='do-si-do'&&['larks','robins'].includes(f.who??'')&&f.amount===1.5||f.entry==='circle-exit'||f.kind==='mad-robin'||f.kind==='circle'&&f.exit==='progressed-neighbors'||f.kind==='box-the-gnat'&&(f.entry!==undefined||f.exit!==undefined)||f.kind==='square-through'&&f.exit!=='progressed-neighbors'||['robins-chain','ladies-chain'].includes(f.kind)&&f.exit==='partners-facing-across'))return'applicable';
 return'not-applicable';
}
