import type {Avatar} from './scene.ts';
import type {CompiledDance, Dancer, Frame} from './types.ts';
export interface StudyDependencies {
  createAvatar(dancer:Dancer):Avatar;
  applyBodyContactAnchors(avatars:Avatar[], frame:Frame):Frame;
}
export interface StudyPair {a:number;b:number;gate:number;center:number[];theta:number;armGate?:number;start?:number;end?:number}
export interface StudyDiagnostics {
  beat:number;pairs:StudyPair[];footwork:'walk'|'buzz';
  posedContacts:{a:number;b:number;hand:'right'|'left';kind:'blade-palm'|'leading-hand';surface:number[];palmCenter:number[];wrist:number[];strength:1}[];
  palmTargets:{id:number;other:number;hand:'right'|'left';surface:number[];normal:number[];center:number[];target:number[];error:number}[];
  maxArmBoneError:number;maxLegBoneError:number;reachClamps:number;
}
export class ReciprocalPoseAdapter {
  constructor(compiled:CompiledDance, avatars:Avatar[], dependencies:StudyDependencies, options?:{footwork?:'walk'|'buzz'});
  readonly reference:Avatar[];
  readonly frames:Map<number,Frame>;
  readonly basePlants:Map<string,unknown>;
  readonly armAnchors:unknown[];
  apply(frame:Frame):{avatars:Avatar[];frame:Frame;diagnostics:StudyDiagnostics};
  dispose():void;
}
