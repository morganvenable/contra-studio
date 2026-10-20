import type {Avatar} from './scene.ts';
import type {CompiledDance, Frame, StudioState} from './types.ts';
import {ReciprocalPoseAdapter, type StudyDependencies, type StudyDiagnostics} from './swing-study-pose.mjs';
import {canonicalDanceText,sha256} from './swing-study-hash.ts';
import {RECIPROCAL_ALGORITHM_SHA256,RECIPROCAL_MODEL_REVISION,RECIPROCAL_FRAME_CONFIGURATION,RECIPROCAL_FRAME_SETTINGS,evaluateReciprocalPreviewScope} from './swing-study-inputs.ts';
import {SWING_STUDY_WARNINGS} from './swing-presentation-contract.ts';
import type {SwingPresentation, SwingPresentationResult, PosedSwingContact, SwingFrameAcquisition, HandOwner,Vec3} from './swing-presentation-contract.ts';
export type {SwingPresentation,PosedSwingContact,SwingFrameAcquisition,HandOwner} from './swing-presentation-contract.ts';

type Contact=Frame['contacts'][number];
export type PresentationResult=SwingPresentationResult<Frame,Contact>;
export type SwingPresentationStatus=Pick<PresentationResult,'applied'|'inactiveReason'|'warnings'>;
/** Only independent reference-vs-port regression can qualify this compiled binding.
 * This is deliberately not a state flag, URL parameter, import option, or user setting.
 */
const REVIEWED_RUNTIME_BINDING=true;
export {SWING_STUDY_WARNINGS} from './swing-presentation-contract.ts';

const SOURCE:SwingPresentation=Object.freeze({kind:'source'});
/** Own the request at public JS/action boundaries; imported data cannot smuggle flags. */
export function ownSwingPresentation(value:unknown):SwingPresentation|undefined {
  if(!value||typeof value!=='object'||Array.isArray(value))return;
  if(Object.getPrototypeOf(value)!==Object.prototype&&Object.getPrototypeOf(value)!==null)return;
  if(Object.values(Object.getOwnPropertyDescriptors(value)).some(d=>!('value' in d)))return;
  const v=value as Record<string,unknown>,keys=Object.keys(v).sort().join(',');
  if(v.kind==='source'&&keys==='kind')return SOURCE;
  if(v.kind==='reciprocal-blade-preview'&&keys==='footwork,kind,revision'&&v.revision===RECIPROCAL_MODEL_REVISION&&(v.footwork==='walk'||v.footwork==='buzz'))return Object.freeze({kind:'reciprocal-blade-preview',revision:RECIPROCAL_MODEL_REVISION,footwork:v.footwork});
}
const SETTINGS_HASH=sha256(canonicalDanceText({settings:RECIPROCAL_FRAME_SETTINGS,configuration:RECIPROCAL_FRAME_CONFIGURATION}));
const point=(v:readonly number[]):Vec3=>({x:v[0],y:v[1],z:v[2]});
const key=(h:HandOwner)=>`${h.dancerId}:${h.hand}`;
const owner=(dancerId:number,hand:'left'|'right'):HandOwner=>({dancerId,hand});
/** Body-target contacts own only the giving hand; hand joins own both endpoints. */
export function retainUnownedContacts(contacts:readonly Contact[],hands:readonly HandOwner[]):Contact[]{
  const overridden=new Set(hands.map(key));
  return contacts.filter(c=>!overridden.has(key(owner(c.a,c.handA)))&&((c.target&&c.target!=='hands')||!overridden.has(key(owner(c.b,c.handB)))));
}
/** Attachment is geometric and exact at full acquisition, never an arm-route force. */
export function actualStudyContacts(d:StudyDiagnostics):{posedSwingContacts:PosedSwingContact[];overriddenHands:HandOwner[];acquisitions:SwingFrameAcquisition[]}{
  const posedSwingContacts:PosedSwingContact[]=[],overriddenHands:HandOwner[]=[],acquisitions:SwingFrameAcquisition[]=[];
  for(const pair of d.pairs){
    const {a,b}=pair,route=pair.armGate??0,fullyAcquired=route===1;
    const supportA=owner(a,'right'),supportB=owner(b,'left'),leadA=owner(a,'left'),leadB=owner(b,'right');
    if(pair.gate>0)overriddenHands.push(supportA,supportB,leadA,leadB);
    const edges:SwingFrameAcquisition['edges'][number][]=[];
    for(const hand of[supportA,supportB]){
      const c=d.posedContacts.find(x=>x.a===hand.dancerId&&x.hand===hand.hand&&x.kind==='blade-palm'),p=d.palmTargets.find(x=>x.id===hand.dancerId&&x.hand===hand.hand);
      const attached=fullyAcquired&&!!c&&!!p&&p.error<=1e-7;
      if(attached)posedSwingContacts.push({kind:'blade-palm',giver:hand,recipientId:c!.b,surface:point(c!.surface),palmCenter:point(c!.palmCenter),wrist:point(c!.wrist),surfaceNormal:point(p!.normal),attachment:'attached',strength:1});
      edges.push({kind:'blade-palm',owners:[hand],state:attached?'attached':pair.gate>0?'traveling':'released',routeProgress:route});
    }
    const l=d.posedContacts.find(x=>x.a===a&&x.kind==='leading-hand'),r=d.posedContacts.find(x=>x.a===b&&x.kind==='leading-hand');
    const joined=fullyAcquired&&!!l&&!!r&&Math.hypot(...l.wrist.map((v,i)=>v-r.wrist[i]))<=1e-7;
    if(joined)posedSwingContacts.push({kind:'leading-hand',a:leadA,b:leadB,point:point(l!.surface),wrists:[point(l!.wrist),point(r!.wrist)],attachment:'attached',strength:1});
    edges.push({kind:'leading-hand',owners:[leadA,leadB],state:joined?'attached':pair.gate>0?'traveling':'released',routeProgress:route});
    if(pair.start===undefined||pair.end===undefined)continue;
    const start=pair.start,end=pair.end;
    acquisitions.push({pair:[a,b],bodyProgress:pair.gate,armRouteProgress:route,phase:edges.every(edge=>edge.state==='attached')?'held':d.beat>end-.9?'releasing':'acquiring',startBeat:start,fullBeat:start+.9,releaseStartBeat:end-.9,releaseEndBeat:end,edges});
  }
  return{posedSwingContacts,overriddenHands,acquisitions};
}
interface Extras{avatar:Avatar;head:Avatar['head']['quaternion'];handScales:Avatar['arms'][number]['hand']['scale'][];candidateHip:unknown;hadCandidateHip:boolean}

/** Scene-owned controller. Standard rendering does not instantiate private rigs. */
export class SwingPresentationController {
  private compiled:CompiledDance;
  private avatars:Avatar[];
  private dependencies:StudyDependencies;
  private rig?:ReciprocalPoseAdapter;
  private mode?:'walk'|'buzz';
  private content='';
  private sourceHash='';
  private extras:Extras[]=[];
  public status:SwingPresentationStatus={applied:'source',warnings:[]};
  public lastResult?:PresentationResult;
  constructor(compiled:CompiledDance,avatars:Avatar[],dependencies:StudyDependencies){this.compiled=compiled;this.avatars=avatars;this.dependencies=dependencies;}
  /** Run before the ordinary update. Restores only extras last changed by this study. */
  prepareBaseline():void{
    for(const e of this.extras){e.avatar.head.quaternion.copy(e.head);e.avatar.arms.forEach((a,i)=>a.hand.scale.copy(e.handScales[i]));if(e.hadCandidateHip)e.avatar.root.userData.candidateHip=e.candidateHip;else delete e.avatar.root.userData.candidateHip;}
    this.extras=[];
  }
  private clearRig():void{this.rig?.dispose();this.rig=undefined;this.mode=undefined;}
  apply(sourceFrame:Frame,renderedFrame:Frame,state:StudioState):PresentationResult{
    const owned=state.swingPresentation===undefined?SOURCE:ownSwingPresentation(state.swingPresentation),invalid=!owned,requested=owned??SOURCE;
    const source=(inactiveReason?:PresentationResult['inactiveReason']):PresentationResult=>{
      this.clearRig();
      const result:PresentationResult={sourceFrame,requested,applied:'source',...(inactiveReason?{inactiveReason}:{}),retainedRenderedContacts:renderedFrame.contacts,posedSwingContacts:[],overriddenHands:[],acquisitions:[],provenance:{modelRevision:RECIPROCAL_MODEL_REVISION,candidateSha256:RECIPROCAL_ALGORITHM_SHA256,sourceBinding:this.sourceHash,settingsHash:SETTINGS_HASH},warnings:requested.kind==='source'&&!invalid?[]:SWING_STUDY_WARNINGS};
      this.lastResult=result;this.status={applied:result.applied,inactiveReason:result.inactiveReason,warnings:result.warnings};return result;
    };
    if(invalid)return source('unsupported-renderer');
    if(requested.kind==='source')return source();
    let content:string;
    try{content=canonicalDanceText(this.compiled.dance);if(content!==canonicalDanceText(state.dance))return source('unreviewed-source');}catch{return source('unreviewed-source');}
    if(content!==this.content){this.clearRig();this.content=content;this.sourceHash=sha256(content);}
    const scope=evaluateReciprocalPreviewScope({revision:requested.revision,canonicalDanceSha256:this.sourceHash,couples:this.compiled.dancers.length/2,absoluteBeat:sourceFrame.beat,runtimeReviewed:REVIEWED_RUNTIME_BINDING});
    if(scope.applied==='source')return source(scope.inactiveReason);
    if(this.mode!==requested.footwork){this.clearRig();this.rig=new ReciprocalPoseAdapter(this.compiled,this.avatars,this.dependencies,{footwork:requested.footwork});this.mode=requested.footwork;}
    this.extras=this.avatars.map(avatar=>({avatar,head:avatar.head.quaternion.clone(),handScales:avatar.arms.map(a=>a.hand.scale.clone()),candidateHip:avatar.root.userData.candidateHip,hadCandidateHip:Object.hasOwn(avatar.root.userData,'candidateHip')}));
    const {diagnostics}=this.rig!.apply(sourceFrame),contactState=actualStudyContacts(diagnostics);
    const result:PresentationResult={sourceFrame,requested,applied:'reciprocal-blade-preview',...contactState,retainedRenderedContacts:retainUnownedContacts(renderedFrame.contacts,contactState.overriddenHands),provenance:{modelRevision:RECIPROCAL_MODEL_REVISION,candidateSha256:RECIPROCAL_ALGORITHM_SHA256,sourceBinding:this.sourceHash,settingsHash:SETTINGS_HASH},warnings:SWING_STUDY_WARNINGS};
    this.lastResult=result;this.status={applied:result.applied,warnings:result.warnings};return result;
  }
  /** Physical dots from retained standard contacts plus attached study edges only. */
  contactDots(result:PresentationResult):readonly {point:Vec3;strength:number}[]{
    if(result.applied==='source')return result.retainedRenderedContacts;
    return[...result.retainedRenderedContacts,...result.posedSwingContacts.map(c=>({point:c.kind==='blade-palm'?c.surface:c.point,strength:c.strength}))];
  }
  dispose():void{this.prepareBaseline();this.clearRig();this.content='';this.sourceHash='';this.lastResult=undefined;this.status={applied:'source',warnings:[]};}
}
