import type {StudioState} from './types.ts';
import {ownSwingPresentation} from './swing-presentation.ts';
/** An explicit presentation switch pauses transport; it never seeks or recompiles. */
export function changeSwingPresentation(state:StudioState,value:unknown,pause:()=>void):void {
 const requested=ownSwingPresentation(value);
 if(!requested)throw new Error('Choose a supported swing presentation study and footwork mode.');
 pause();
 state.swingPresentation=requested;
 state.swingPresentationStatus=undefined;
}
