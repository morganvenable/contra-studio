import type {Figure} from './types.ts';
const metadata=new Set(['id','kind','beats','label','notes','confidence','progression']);
const consumed:Record<string,readonly string[]>={
 rollaway:['who','rollRole','sashayRole','rollRelation','rollDirection','rollHalfSashay'],
 'couples-do-si-do':['who','unitRelation','unitHold','passingShoulder','facing','amount'],
 'becket-slice':['who','direction','phaseBeats','entry','exit','sliceReturn'],
 'star-promenade':['who','centerRole','hands','direction','amount','approachHold','entry','exit'],
 'butterfly-whirl':['who','centerRole','direction','amount','approachHold','entry','exit'],
 'mad-robin':['who','orbitRelation','facingRelation','frontRole','orbitDirection','amount','entry','exit'],
 'square-through':['who','amount','hands','entry','exit','phaseBeats'],
 'pull-by':['who','hands','exit'],
 'revolving-door':['who','centerRole','hands','direction','amount','dropOffAfter','approachHold','entry','exit','phaseBeats'],
 'cross-trails':['who','entry','exit','passages','phaseBeats'],
 'form-short-wave':['entry','exit','centerRole','sideRelation','centerHand','sideHand'],
 'balance-rory-slide':['who','entry','exit','direction','stationShift','balanceFirst','spin','spinAmount','spinDirection','phaseBeats'],
 'half-poussette':['who','amount','hands','pullRole','pullDirection','facing','phaseBeats','entry','exit'],
 'give-and-take':['who','takeRole','phaseBeats','entry','exit','hands','approachHold'],
 'pass-through':['who','passingShoulder','entry','exit'],
 'ricochet-hey':['amount','who','heyStartRole','centerShoulder','endShoulder','entry','exit','ricochetExitRelation','ricochets'],
 gyre:['who','passingShoulder','amount'],
 petronella:['who','direction','amount','spinDirection','spinAmount','entry','exit','clap','phaseBeats'],
 'ring-balance':['who','hands','exit'],'california-twirl':['who','hands','underRole','direction','amount','entry','exit','phaseBeats'],
 'long-lines-rollaway':['who','rollRole','sashayRole','rollRelation','rollDirection','rollPhase','rollHalfSashay','phaseBeats'],
 'pass-to-wave':['centerRole','sideRelation','passingShoulder','centerHand','sideHand','entry'],
 'pass-to-wave-balance':['centerRole','sideRelation','passingShoulder','centerHand','sideHand','entry','phaseBeats','balanceStyle'],
 'wave-balance':['balanceStyle'],'box-circulate':['crossRole','loopRole','loopDirection'],'balance-box-circulate':['phaseBeats','balanceStyle','crossRole','loopRole','loopDirection','entry','exit'],
 balance:['who','hands'],swing:['who','entry','exit','preparation'],circle:['who','direction','amount','phaseBeats','turnToward','exit'],star:['who','direction','amount','starGrip'],allemande:['who','direction','amount','entry','exit','inwardRole','outwardRole','phaseBeats'],
 'do-si-do':['who','direction','amount','exit','preparation'],'long-lines':['who'],'robins-chain':['who','direction','hands','exit'],'ladies-chain':['who','direction','hands','exit'],
 hey:['heyAxis','who','notation','entry','exit','amount','heyStartPair','heyStartRole','centerShoulder','endShoulder'],'box-the-gnat':['who','hands','underRole','entry','exit'],
 'right-left-through':['who','direction','courtesyLeader','crossingRelation'],'becket-shift':['direction'],
 'hall-travel':['entry','hallTurn','hallPairRelation','hallPhaseBeats'],
 promenade:['who','entry','amount','promenadeRoute','passingShoulder','direction','promenadeHold','courtesyLeader','hands']
};
/** New schema fields cannot silently become accepted by unrelated adapters.
 * Value/variant validation stays with the adapter that consumes each argument. */
export function assertFigureArgumentsConsumed(figure:Figure):void {
 if(figure.kind==='do-si-do'&&(figure.exit!==undefined||figure.preparation!==undefined)&&!(figure.who==='neighbor'&&figure.direction==='right'&&figure.amount===1.5&&figure.beats===8&&figure.progression===true&&figure.exit==='progressed-neighbors'))throw new Error('This do-si-do does not consume the declared exit or preparation modifier.');
 if(figure.preparation!==undefined&&(figure.preparation!=='next-neighbor-balance'||!(figure.kind==='swing'&&figure.who==='ones'||figure.kind==='do-si-do'&&figure.who==='neighbor'&&figure.amount===1.5&&figure.exit==='progressed-neighbors')))throw new Error('This figure does not consume a declared next-neighbor balance preparation.');
 if(figure.progression!==undefined&&typeof figure.progression!=='boolean')throw new Error('A progression marker must be an explicit boolean.');
 if(figure.kind==='hey'&&figure.notation!==undefined&&[figure.heyStartPair,figure.heyStartRole,figure.centerShoulder,figure.endShoulder,figure.amount].some(v=>v!==undefined))throw new Error('A hey must use either exact pass notation or the explicit role/shoulder contract, not mixed declarations.');
 if(figure.kind==='hey'&&figure.heyStartPair!==undefined&&figure.heyStartRole!==undefined)throw new Error('A hey must declare either its first pair or its first role, not both.');
 const keys=consumed[figure.kind];if(!keys)throw new Error(`Unsupported figure ${figure.kind}.`);
 for(const key of Object.keys(figure))if(!metadata.has(key)&&!keys.includes(key)&&figure[key as keyof Figure]!==undefined)throw new Error(`${figure.kind} does not consume the “${key}” modifier.`);
}

/** A marker declares when relationships change; it is not a decorative label.
 * Missing markers may still use the compiler's validated endpoint inference,
 * but a supplied marker must agree with this adapter's actual event boundary. */
export function assertProgressionMarkers(figures:readonly Figure[],allowedIndex:number):void {
 const declared:number[]=[];
 for(const [i,figure] of figures.entries()){
  if(figure.progression!==undefined&&typeof figure.progression!=='boolean')throw new Error('A progression marker must be an explicit boolean.');
  if(figure.progression===true)declared.push(i);
 }
 if(declared.length>1)throw new Error('Multiple progression markers require separately declared source-bound events.');
 if(declared.length&&declared[0]!==allowedIndex)throw new Error('The progression marker does not match this adapter’s declared relationship-change boundary.');
}
