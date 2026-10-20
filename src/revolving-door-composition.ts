import type {Figure} from './types.ts';

/** The first whole-composition certificate covers this literal 8+8+8 seam.
 * The primitive's inverse relation remains an isolated mechanical contract. */
export function assertRevolvingDoorComposition(figures:readonly Figure[]):void {
  const ordinarySwing=(f:Figure|undefined,who:'partner'|'neighbor')=>{
    if(!f||f.kind!=='swing'||f.who!==who||f.beats!==8||f.progression!==undefined&&f.progression!==false)return false;
    const keys=['id','kind','beats','label','notes','confidence','progression','who'];
    return Reflect.ownKeys(f).every(k=>typeof k==='string'&&keys.includes(k))&&typeof f.id==='string'&&typeof f.label==='string'&&(f.notes===undefined||typeof f.notes==='string')&&(f.confidence===undefined||f.confidence==='verified'||f.confidence==='approximate');
  };
  for(const[i,f]of figures.entries())if(f.kind==='revolving-door'){
    const keys=['id','kind','beats','label','notes','confidence','progression','who','centerRole','hands','direction','amount','dropOffAfter','approachHold','entry','exit','phaseBeats'];
    if(Reflect.ownKeys(f).some(k=>typeof k!=='string'||!keys.includes(k))||f.beats!==8||f.centerRole!=='robin'||f.hands!=='right'||f.direction!=='right'||f.amount!==1||f.dropOffAfter!==.5||f.approachHold!=='half-shoulder-waist'||f.entry!=='side-couples'||f.exit!=='opposite-paired-swing'||f.progression!==undefined&&f.progression!==false||!Array.isArray(f.phaseBeats)||Reflect.ownKeys(f.phaseBeats).some(k=>typeof k!=='string'||!['0','1','2','3','length'].includes(k))||f.phaseBeats.length!==4||[1.25,4.5,1.25,1].some((n,i)=>!Object.hasOwn(f.phaseBeats!,i)||f.phaseBeats![i]!==n))throw new Error('The revolving-door composition requires the exact consumed full-turn, half-drop, support and four-phase contract.');
    if(f.who!=='partner'||!ordinarySwing(figures[i-1],'partner')||!ordinarySwing(figures[i+1],'neighbor'))throw new Error('The reviewed revolving-door composition requires an ordinary partner swing of eight counts, an eight-count partner carriage, then an ordinary current-neighbor swing of eight counts; extra swing modifiers or progression require another review.');
  }
}

export const REVOLVING_DOOR_WARNING='Schematic footwork. This revolving door retains partner shoulder/waist support, models pickup and drop-off within the eight source counts, and finishes with the current neighbors. Detailed arm poses are approximate.';
