import './style.css';
import {DANCES} from './catalog';
import {compileChoreography} from './choreography';
import {compileWithEngine,isNextCompiled} from './next/switch.ts';
import {DanceScene} from './scene';
import {OverheadScene} from './fallback';
import {StudioAudioTransport} from './audio';
import {musicUrl} from './hosting';
import {createUI} from './ui';
import type {Dance, StudioActions, StudioState} from './types';

let compiled=compileChoreography(DANCES[0]),loopFigure=false,playPending=false,playGeneration=0,controlError:string|undefined;
const audio=new StudioAudioTransport();
const state:StudioState={...audio.info(),swingPresentation:Object.freeze({kind:'source'}),dance:DANCES[0],dances:[...DANCES],dancers:compiled.dancers,playing:false,beat:0,bpm:112,speed:1,repeat:0,figureIndex:0,figureProgress:0,totalBeats:compiled.totalBeats,camera:'perspective',showTrails:false,showLabels:true,showConnections:true,selectedDancer:-1,loop:true,metronome:false,warnings:compiled.warnings};
// The live app always uses Standard. Study renderers remain available only to offline tools.
Object.defineProperty(state,'swingPresentation',{value:state.swingPresentation,writable:false,configurable:false,enumerable:true});
const root=document.querySelector<HTMLElement>('#app')!;let scene:DanceScene|OverheadScene;let fallback=false;let ui:ReturnType<typeof createUI>;
function syncClock(presentation=false){Object.assign(state,presentation?audio.presentationSnapshot():audio.snapshot(),audio.info());state.figureLoop=loopFigure;if(controlError){state.audioError=controlError;state.audioStatus='error';}}
function failed(error:unknown){if(!audio.clock.getLoop())loopFigure=false;controlError=error instanceof Error?error.message:'That playback setting could not be applied.';syncClock();}
function run(action:()=>void){try{controlError=undefined;action();syncClock();}catch(error){failed(error);}}
function configureBounds(){
 const current=audio.snapshot(),frame=compiled.sample(current.beat);
 if(loopFigure){const start=frame.repeat*compiled.totalBeats+compiled.starts[frame.figureIndex];audio.setLoop({start,end:start+state.dance.figures[frame.figureIndex].beats});}
 else audio.setLoop(null);
 audio.setStopBeat(!state.loop||!compiled.repeatable?(frame.repeat+1)*compiled.totalBeats:null);
}
async function startPlaying(){const generation=++playGeneration;playPending=true;controlError=undefined;try{configureBounds();await audio.play();}catch(error){failed(error);}finally{if(generation===playGeneration)playPending=false;syncClock();}}
function pause(){++playGeneration;playPending=false;audio.pause();syncClock();}
function seek(beat:number){audio.setLoop(null);audio.seek(Math.max(0,Number.isFinite(beat)?beat:0));configureBounds();syncClock();}
/** Couples the viewer chose; until then each dance shows its formation's own display size. */
let chosenCouples:number|undefined;
function loadDance(dance:Dance,couples=chosenCouples){showCompiled(compileWithEngine(dance,couples,compileChoreography),dance);}
function showCompiled(next:ReturnType<typeof compileWithEngine>,dance:Dance=next.dance){
 pause();loopFigure=false;compiled=next;
 state.swingPresentationStatus=undefined;state.dance=isNextCompiled(next)?next.dance:dance;state.totalBeats=next.totalBeats;state.dancers=next.dancers;if(state.selectedDancer>=next.dancers.length)state.selectedDancer=-1;
 audio.setLoop(null);audio.seek(0);configureBounds();state.repeat=0;state.figureIndex=0;state.figureProgress=0;state.warnings=next.warnings;
 if(!state.dances.some(d=>d.id===dance.id))state.dances.push(dance);scene?.setDance(next);syncClock();
}
const actions:StudioActions={
 setCouples(count){if(!Number.isInteger(count)||count<2||count>12)throw new Error('Choose 2–12 couples.');chosenCouples=count;loadDance(state.dance,count);},
 playPause(){if(audio.snapshot().playing||playPending)pause();else void startPlaying();},
 reset(){run(()=>{pause();loopFigure=false;audio.setLoop(null);audio.seek(0);configureBounds();});},
 seek(beat){run(()=>seek(beat));},setBpm(n){run(()=>audio.setTempo(Math.min(160,Math.max(60,n)),state.speed));},setSpeed(n){run(()=>audio.setTempo(state.bpm,Math.min(2,Math.max(.25,n))));},
 setAudioMode(mode){run(()=>audio.setMode(mode));if(audio.snapshot().playing&&mode!=='off')void startPlaying();},
 setVolume(value){run(()=>audio.setVolume(value));},
 toggleMute(){run(()=>audio.setMuted(!audio.info().muted));},
 async loadTrack(id){try{controlError=undefined;const meta=await (await fetch(`${musicUrl}${id}.json`)).json();const loaded=await audio.loadTrack({name:`${meta.title} (${meta.performers}, ${meta.recorded})`,url:`${musicUrl}${meta.audio}`,bpm:meta.bpm,firstDownbeat:meta.firstDownbeat,beats:meta.beats});if(loaded){loopFigure=false;configureBounds();}syncClock();return loaded;}catch(error){failed(error);throw error;}},
 async loadRecording(file){try{controlError=undefined;const loaded=await audio.loadRecording(file);if(loaded){loopFigure=false;configureBounds();}syncClock();return loaded;}catch(error){failed(error);throw error;}},
 setRecordingGrid(bpm,offsetSeconds){run(()=>audio.setRecordingGrid(bpm,offsetSeconds));},
 setCamera(mode){state.camera=fallback?'overhead':mode;scene?.setCamera(state.camera);},resetCamera(){state.camera=fallback?'overhead':'perspective';scene?.resetCamera();},
 toggleTrails(){state.showTrails=!state.showTrails;},toggleLabels(){state.showLabels=!state.showLabels;},toggleConnections(){state.showConnections=!state.showConnections;},
 toggleLoop(){run(()=>{state.loop=!state.loop;configureBounds();});},
 toggleMetronome(){run(()=>{state.metronome=!state.metronome;audio.setMetronome(state.metronome);});if(audio.snapshot().playing&&state.metronome)void startPlaying();},
 selectDancer(id){state.selectedDancer=id;},selectDance(id){const dance=state.dances.find(d=>d.id===id);if(dance)loadDance(dance);},loadDance,
 stepFigure(delta){run(()=>{pause();const f=compiled.sample(audio.snapshot().beat);let target=f.figureIndex+delta,repeat=f.repeat;if(target<0){target=compiled.starts.length-1;repeat=Math.max(0,repeat-1);}if(target>=compiled.starts.length){target=0;repeat++;}seek(repeat*compiled.totalBeats+compiled.starts[target]);});},
 setLoopFigure(enabled){run(()=>{const previous=loopFigure;try{loopFigure=enabled;configureBounds();}catch(error){loopFigure=previous;throw error;}});}
};
ui=createUI(root,actions,state);
try{scene=new DanceScene(ui.viewport,compiled,actions.selectDancer);}catch(error){fallback=true;state.camera='overhead';ui.viewport.replaceChildren();scene=new OverheadScene(ui.viewport,compiled,actions.selectDancer);console.warn('WebGL unavailable; switched to overhead view.',error);}
function animate(){syncClock(true);const frame=compiled.sample(state.beat);state.figureIndex=frame.figureIndex;state.figureProgress=frame.figureProgress;state.repeat=frame.repeat;state.warnings=frame.warnings;scene?.update(frame,state);state.swingPresentationStatus=scene?.presentationStatus;ui.update(state);requestAnimationFrame(animate);}
requestAnimationFrame(animate);
window.addEventListener('pagehide',()=>audio.pause());
// `?figure=<move>&params=<json>` (from the figure gallery) opens that one
// figure from its small starting set, looping, so arms and hands can be checked.
if(new URLSearchParams(location.search).get('figure'))void import('./next/proof-view.ts').then(({proofFromUrl})=>{
 try{const proof=proofFromUrl(location.search);showCompiled(proof.dance);seek(proof.start);loopFigure=true;configureBounds();void startPlaying();}
 catch(error){controlError=error instanceof Error?error.message:String(error);state.warnings=[`This figure can't start: ${controlError}`];syncClock();}
});
// Read-only inspection hook for deterministic QA and reproducible bug reports.
Object.defineProperty(window,'__contra',{value:{get state(){return {...state};},get scene(){return scene;},get audioTiming(){return audio.timingInfo();},sample:(beat:number)=>compiled.sample(beat),actions},writable:false});
