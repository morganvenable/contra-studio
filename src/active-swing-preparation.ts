import type {Figure} from './types.ts';

/** The local swing releases its old frame after 6.5 of eight counts. Only the
 * following, explicitly reviewed composition may move roots after that point.
 * The ordinary formation plan remains inspectable before this public stance. */
export const ACTIVE_SWING_PREPARATION_BEATS=1.5;

export function assertActiveSwingPreparationSequence(figures:readonly Figure[]):boolean {
 const first=figures[0],second=figures[1],last=figures.at(-1);
 const openingStance=first?.kind==='balance'&&['partner','neighbor'].includes(first.who??'')&&second?.who===first.who&&(second.kind==='swing'&&first.hands===undefined||second.kind==='box-the-gnat'&&first.hands==='right');
 for(const [index,f]of figures.entries()){
  if(f.preparation!==undefined&&(f.preparation!=='next-neighbor-balance'||f.exit!=='progressed-neighbors'||f.progression!==true||index!==figures.length-1))throw new Error('Next-neighbor balance preparation requires an explicit terminal progressing exit.');
  if(f.preparation!==undefined&&!(first?.kind==='balance'&&first.who==='neighbor'&&first.beats===4&&first.hands===undefined&&second?.kind==='swing'&&second.who==='neighbor'))throw new Error('Next-neighbor preparation needs the actual next-cycle neighbor balance4 and same-neighbor swing.');
 }
 if(last?.kind!=='swing'||last.who!=='ones')return false;
 if(openingStance&&last.preparation===undefined)throw new Error('A fixed-root active swing cannot prepare the next balance; select the explicit released next-neighbor-balance preparation.');
 if(last.preparation!==undefined&&!(first?.kind==='balance'&&first.who==='neighbor'&&first.beats===4&&first.hands===undefined&&second?.kind==='swing'&&second.who==='neighbor'))throw new Error('The active-swing preparation needs the actual next-cycle neighbor balance4 and same-neighbor swing.');
 return last.preparation==='next-neighbor-balance';
}
