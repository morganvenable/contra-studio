import {motionCompilationFailure,type CategorizedMotionDiagnostic} from './motion-compilation-result.ts';
import {REGISTERED_MOTION_CAPABILITIES} from './capabilities.ts';
import {withBalanceStance} from './stance.ts';
import { figureContinuity, compileDance, HALF_WIDTH, ROW_GAP } from './engine.ts';
import { compileBecketDance,compileChoreography } from './choreography.ts';
import { parseHeyNotation } from './hey.ts';
import type { Dance, Figure, Pose, CompiledDance, MotionCapabilities } from './types';

export interface ValidationDiagnostic extends CategorizedMotionDiagnostic {
  code: string;
  severity: 'error' | 'warning';
  message: string;
  figureIndex?: number;
  beat?: number;
  dancerIds?: number[];
}
export interface ValidationReport {
  playable: boolean;
  repeatable: boolean;
  diagnostics: ValidationDiagnostic[];
  checked: string[];
  samples: number;
  velocitySamples?: number;
}
const distance = (a: Pose, b: Pose) => Math.hypot(a.position.x - b.position.x, a.position.z - b.position.z);
const close = (a: number, b: number, tolerance = .06) => Math.abs(a - b) < tolerance;

/** A compositional gate, not a dance-name allowlist or a claim of full physical realism. */
export function validateDance(dance: Dance, capabilities:MotionCapabilities=REGISTERED_MOTION_CAPABILITIES): ValidationReport {
  if(dance.madRobinPolicy!==undefined||dance.figures.some(f=>['mad-robin','star-promenade','butterfly-whirl'].includes(f.kind))||dance.ringTwirlPolicy!==undefined||dance.progressionEvents!==undefined||dance.ovalPolicy!==undefined||dance.sixTwoPassPolicy!==undefined||dance.diagonalHeyPolicy!==undefined)return validateEventInterpretation(dance,capabilities);
  if (dance.formation === 'becket') return validateBecketInterpretation(dance);
  const diagnostics: ValidationDiagnostic[] = [];
  let samples = 0;
  const add = (d: ValidationDiagnostic) => {
    if (!diagnostics.some(x => x.code === d.code && x.figureIndex === d.figureIndex)) diagnostics.push(d);
  };
  const error = (code: string, message: string, figureIndex?: number) => add({ code, severity: 'error', message, figureIndex });
  if (dance.formation !== 'duple-improper') error('formation', 'This motion model requires duple-improper formation.');
  if (dance.figures.reduce((n, f) => n + f.beats, 0) !== 64) error('timing', 'This adapter requires exactly 64 beats; no timing was rescaled.');
  for (const [i, f] of dance.figures.entries()) {
    if (f.kind==='balance'&&f.beats!==4) error('balance-counts', `${f.label}: the current balance adapter requires four counts: two steps in and two steps out.`, i);
    if (!Number.isFinite(f.beats) || f.beats < .25 || f.beats > 64) error('figure-timing', `${f.label}: this adapter requires a duration of at least 0.25 beat and at most 64 beats.`, i);
    if (['balance','swing','allemande','do-si-do'].includes(f.kind) && !f.who) error('participants', `${f.label}: participants must be explicit.`, i);
    if (['circle','star','allemande'].includes(f.kind) && !f.direction) error('hand-direction', `${f.label}: hand or direction must be explicit.`, i);
    if (['circle','star','allemande'].includes(f.kind) && (f.amount === undefined || !Number.isFinite(f.amount) || f.amount <= 0 || f.amount > 2)) error('turn-amount', `${f.label}: a finite explicit turn amount between zero and two is required.`, i);
    if ((f.kind === 'swing' && !['partner','neighbor'].includes(f.who || '')) || (f.kind === 'balance' && f.who === 'all')) error('participant-variant', `${f.label}: this role/contact variant is not modeled.`, i);
    if (['robins-chain','ladies-chain'].includes(f.kind) && !['partner','neighbor'].includes(f.who || '')) error('chain-recipient', `${f.label}: the receiving partner or neighbor must be explicit.`, i);
  }
  if(diagnostics.some(d=>d.severity==='error'))return{playable:false,repeatable:false,diagnostics,checked:['explicit input semantics and bounded timing'],samples};
  let compiled: ReturnType<typeof compileDance>;
  try { compiled = compileDance(dance, 6, capabilities); }
  catch (e) {
    add(motionCompilationFailure('compile', e instanceof Error ? e.message : 'The motion compiler rejected this sequence.'));
    return { playable: false, repeatable: false, diagnostics, checked: ['input constraints', 'motion adapter availability'], samples };
  }
  const groups = [[0,1,2,3],[4,5,6,7],[8,9,10,11]];
  const motion=withBalanceStance(compiled);const velocityCheck=checkNormalizedSpeeds(motion,dance);for(const d of velocityCheck.diagnostics)add(d);
  for (const [i, f] of dance.figures.entries()) {
    const frame = compiled.sample(compiled.starts[i]);
    const poses = frame.poses;
    for (const ids of groups) {
      const centerX = ids.reduce((n,id) => n + poses[id].position.x, 0) / 4;
      const centerZ = ids.reduce((n,id) => n + poses[id].position.z, 0) / 4;
      if (f.kind === 'circle' || f.kind === 'star') {
        const radii = ids.map(id => Math.hypot(poses[id].position.x-centerX,poses[id].position.z-centerZ));
        if (Math.max(...radii)-Math.min(...radii) > .18 || Math.min(...radii) < .5) error('ring-precondition', `${f.label}: its incoming dancers do not form a usable four-person ring.`, i);
      }
      if (f.kind === 'long-lines') {
        if (ids.some(id => !close(Math.abs(poses[id].position.x),HALF_WIDTH))) error('line-precondition', `${f.label}: dancers have not arrived on the two long lines.`, i);
      }
      if (f.kind === 'robins-chain' || f.kind === 'ladies-chain') {
        const robins = ids.filter(id => id % 2 === 1), larks = ids.filter(id => id % 2 === 0);
        if (ids.some(id => !close(Math.abs(poses[id].position.x-centerX),HALF_WIDTH))) error('chain-formation', `${f.label}: the chain requires two facing couples on the sidelines.`, i);
        for (const robin of robins) {
          const destination = poses[robins.find(id => id !== robin)!].position;
          const receiver = f.who === 'partner' ? robin-1 : larks.find(id => Math.floor(id/2) !== Math.floor(robin/2))!;
          if (!close(poses[receiver].position.x, destination.x)) error('chain-relationship', `${f.label}: the named receiving ${f.who} is not on the arrival side. Check the preceding figure or chain recipient.`, i);
        }
        for (const lark of larks) {
          const p=poses[lark].position, side=Math.sign(p.x-centerX);
          if ((p.z-centerZ)*side < .1) error('chain-role-order', `${f.label}: the side-by-side role order is not the conventional courtesy-turn setup.`, i);
        }
      }
      const pairs = selectedPairs(f, ids);
      for (const [a,b] of pairs) {
        if (distance(poses[a],poses[b]) > 3) error('pair-precondition', `${f.label}: its named participants are too far apart for this adapter.`, i);
        const declaredFrame=f.kind==='swing'&&figureContinuity(dance.figures,i).canonicalSwingLayout&&Math.abs(distance(poses[a],poses[b])-.62)<1e-5&&close(Math.abs((poses[a].position.x+poses[b].position.x)/2-centerX),HALF_WIDTH)&&close((poses[a].position.z+poses[b].position.z)/2,centerZ)&&frame.contacts.filter(c=>c.kind==='swing-frame'&&c.strength>1-1e-6&&[a,b].includes(c.a)&&[a,b].includes(c.b)).length===3;
        if (f.kind === 'swing' && !declaredFrame && (!close(poses[a].position.x,poses[b].position.x) || !close(Math.abs(poses[a].position.x-centerX),HALF_WIDTH))) error('swing-entry', `${f.label}: this swing adapter requires the named pair on the same sideline or in its explicitly prepared closed frame; its incoming formation needs a different transition adapter.`, i);
      }
    }
  }
  const final = compiled.sample(compiled.totalBeats-.000001).poses;
  // A single progression exchanges adjacent couple rows; exact dancer identity and role side matter.
  for (const dancer of compiled.dancers) {
    const c=dancer.couple, targetRow=c%2===0?c+1:c-1, p=final[dancer.id].position;
    const expectedX=HALF_WIDTH*(dancer.role==='lark'?dancer.direction:-dancer.direction);
    const expectedZ=(targetRow-2.5)*ROW_GAP;
    if (!close(p.x,expectedX) || !close(p.z,expectedZ)) {
      error('progression-endpoint', 'The complete sequence does not end in the required single-progression slots with the original dancer identities and role sides. Correct its figure amounts or transitions before playback.');
      break;
    }
  }
  for (const boundary of compiled.starts.slice(1)) {
    const before=motion.sample(boundary-.00001).poses, after=motion.sample(boundary).poses;
    if (before.some((p,id)=>distance(p,after[id])>.01)) error('discontinuity','A figure boundary teleports a dancer rather than connecting continuously.');
  }
  // Sample two repeats when valid to include real out-couple and new-neighbor handling.
  const span=compiled.repeatable?128:64;
  for (let beat=0;beat<span;beat+=.25) {
    const frame=motion.sample(beat); samples++;
    const unique=new Set(frame.poses.map(p=>p.id));
    if (unique.size!==12 || frame.poses.some(p=>![p.position.x,p.position.z,p.yaw].every(Number.isFinite))) error('identity-numeric','The sampled motion lost a dancer identity or contains non-finite coordinates.');
    for (let a=0;a<frame.poses.length;a++) for(let b=a+1;b<frame.poses.length;b++) {
      const d=distance(frame.poses[a],frame.poses[b]);
      if (d<.38) add({code:'torso-overlap',severity:'error',message:`Dancers ${a+1} and ${b+1} violate the conservative 0.38-model-unit torso clearance near beat ${beat.toFixed(2)}.`,figureIndex:frame.figureIndex,beat,dancerIds:[a,b]});
      else if (d<.5) add({code:'close-passage',severity:'warning',message:`A modeled passage gets closer than 0.50 model units near beat ${beat.toFixed(2)}. Detailed limb spacing still needs review.`,figureIndex:frame.figureIndex,beat,dancerIds:[a,b]});
    }
    const occupied = new Set<string>();
    for (const contact of frame.contacts) {
      const hands: Array<readonly [number, 'left' | 'right']> = [[contact.a,contact.handA]];
      if (!contact.target || contact.target === 'hands') hands.push([contact.b,contact.handB]);
      for(const [id,hand] of hands) {
        const key=`${id}:${hand}`;
        if(occupied.has(key)) add({code:'hand-conflict',severity:'error',message:`A hand has incompatible simultaneous contacts near beat ${beat.toFixed(2)}.`,figureIndex:frame.figureIndex,beat,dancerIds:[id]});
        occupied.add(key);
        const p=frame.poses[id].position;
        if(contact.strength > .5 && Math.hypot(p.x-contact.point.x,p.z-contact.point.z)>1.15) add({code:'hand-reach',severity:'warning',message:`A hand target extends beyond the current reach budget near beat ${beat.toFixed(2)}; the hold needs refinement.`,figureIndex:frame.figureIndex,beat,dancerIds:[id]});
      }
    }
  }
  const playable=!diagnostics.some(d=>d.severity==='error');
  return {playable,repeatable:playable&&compiled.repeatable,diagnostics,checked:['explicit participants, hands and turn amounts','duration-normalized root-speed budget','figure formation preconditions','chain recipient identity and role order','first-repeat exact single-progression slots','position continuity','dancer identity and finite coordinates','two-repeat sampled torso spacing and hand conflicts'],samples,velocitySamples:velocityCheck.samples};
}

/** The Becket compiler supplies actual topology epochs and enforces exact cycle closure. */
function validateBecketInterpretation(dance: Dance): ValidationReport {
  const diagnostics:ValidationDiagnostic[]=[];let samples=0;
  const error=(code:string,message:string,figureIndex?:number)=>{if(!diagnostics.some(d=>d.code===code&&d.figureIndex===figureIndex))diagnostics.push({code,severity:'error',message,figureIndex});};
  if(dance.circulation!=='cw')error('circulation','Explicit clockwise Becket circulation is required.');
  if(dance.figures.reduce((n,f)=>n+f.beats,0)!==64)error('timing','Exactly 64 source beats are required; no phrase was stretched.');
  for(const[i,f]of dance.figures.entries()){
    if(f.kind==='balance'&&f.beats!==4)error('balance-counts',`${f.label}: the current balance adapter requires four counts: two steps in and two steps out.`,i);
    if(!Number.isFinite(f.beats)||f.beats<.25||f.beats>16)error('figure-timing',`${f.label}: require a finite duration between 0.25 and 16 beats.`,i);
    if(['circle','star','allemande'].includes(f.kind)&&(!['left','right'].includes(f.direction||'')||!Number.isFinite(f.amount)||!(f.amount!>0&&f.amount!<=2)))error('turn-amount',`${f.label}: explicit hand/direction and turn amount are required.`,i);
    if(['balance','swing'].includes(f.kind)&&!['partner','neighbor'].includes(f.who||''))error('participants',`${f.label}: this participant variant is not modeled.`,i);
    if(['allemande','do-si-do'].includes(f.kind)&&!['partner','neighbor','larks','robins'].includes(f.who||''))error('participants',`${f.label}: participants must be explicit.`,i);
    if(f.kind==='do-si-do'&&(f.amount!==1||f.direction!=='right'))error('dosido-variant',`${f.label}: only a whole right-shoulder do-si-do is supported.`,i);
    if(['circle','star','long-lines'].includes(f.kind)&&f.who!=='all')error('participants',`${f.label}: the four-person group must be explicit.`,i);
    if(['robins-chain','ladies-chain'].includes(f.kind)&&!['partner','neighbor'].includes(f.who||''))error('chain-recipient',`${f.label}: the bound receiver must be explicit.`,i);
    if(f.kind==='becket-shift'&&(i!==0||f.direction!=='left'||f.who!==undefined||f.amount!==undefined))error('shift-topology','The only current Becket progression adapter is one explicit opening left shift.',i);
    if(f.kind==='hey'){
      try{const hey=parseHeyNotation(f.notation||'');if(hey.fraction!==1||hey.beats!==16||f.beats!==16||hey.tokens.some(t=>t.completion!=='complete'))error('hey-exit','Partial or differently timed hey exits require another adapter.',i);}catch{error('hey-notation','The whole explicit hey pass clause is required.',i);}
      if(f.entry!=='side-couples'||f.exit!=='same-slots-partner-balance'||dance.figures[i+1]?.kind!=='balance'||dance.figures[i+1]?.who!=='partner')error('hey-exit','This hey adapter requires explicit side-couple entry and a following partner balance.',i);
    }
  }
  if(diagnostics.length)return{playable:false,repeatable:false,diagnostics,samples,checked:['formation and explicit figure semantics']};
  let compiled:ReturnType<typeof compileBecketDance>;
  try{compiled=compileBecketDance(dance,6);}catch(e){diagnostics.push(motionCompilationFailure('compile',e instanceof Error?e.message:'Becket compilation failed.'));return{playable:false,repeatable:false,diagnostics,samples,checked:['explicit semantics','relationship epoch and trajectory compilation']};}
  const motion=withBalanceStance(compiled);const velocityCheck=checkNormalizedSpeeds(motion,dance);for(const d of velocityCheck.diagnostics)diagnostics.push(d);
  for(const[fi,f]of dance.figures.entries()){
    if(f.kind==='becket-shift')continue;
    const beat=compiled.starts[fi],ps=compiled.sample(beat).poses,topology=compiled.topology(beat),seen=new Set<string>();
    for(const[a,b]of topology.neighbors){
      const couples=[Math.floor(a/2),Math.floor(b/2)].sort((x,y)=>x-y),key=couples.join(':');if(seen.has(key))continue;seen.add(key);
      const ids=couples.flatMap(c=>[2*c,2*c+1]),centerZ=ids.reduce((n,id)=>n+ps[id].position.z,0)/4;
      if(['circle','star'].includes(f.kind)){const r=ids.map(id=>Math.hypot(ps[id].position.x,ps[id].position.z-centerZ));if(Math.max(...r)-Math.min(...r)>.18||Math.min(...r)<.5)error('ring-precondition',`${f.label}: incoming actors do not form a usable ring.`,fi);}
      if(f.kind==='long-lines'&&ids.some(id=>Math.abs(Math.abs(ps[id].position.x)-HALF_WIDTH)>.06))error('line-precondition',`${f.label}: actors are not on the long lines.`,fi);
      for(const[x,y]of selectedPairs(f,ids))if(f.kind==='swing'&&(Math.abs(ps[x].position.x-ps[y].position.x)>.06||Math.abs(Math.abs(ps[x].position.x)-HALF_WIDTH)>.06))error('swing-entry',`${f.label}: the named pair is not in this swing adapter’s same-sideline entry.`,fi);
    }
  }
  for(let beat=0;beat<128;beat+=.25){
    const frame=motion.sample(beat);samples++;
    if(frame.poses.length!==12||new Set(frame.poses.map(p=>p.id)).size!==12||frame.poses.some(p=>![p.position.x,p.position.z,p.yaw].every(Number.isFinite)))error('identity-numeric','A sampled frame lost an identity or finite root state.');
    for(let a=0;a<12;a++)for(let b=a+1;b<12;b++)if(distance(frame.poses[a],frame.poses[b])<.38)error('torso-overlap',`Actors ${a+1} and ${b+1} violate conservative torso clearance near beat ${beat}.`,frame.figureIndex);
    const occupied=new Set<string>();for(const c of frame.contacts){const hands:Array<[number,string]>=[[c.a,c.handA]];if(!c.target||c.target==='hands')hands.push([c.b,c.handB]);for(const[id,hand]of hands){const key=`${id}:${hand}`;if(occupied.has(key))error('hand-conflict',`A hand has incompatible simultaneous contacts near beat ${beat}.`,frame.figureIndex);occupied.add(key);}}
  }
  for(const b of[...compiled.starts.slice(1),64,128]){const before=motion.sample(b-1e-6).poses,after=motion.sample(b).poses;if(before.some((p,i)=>distance(p,after[i])>.01))error('discontinuity','A source figure or progression boundary requires a position jump.');}
  const playable=!diagnostics.some(d=>d.severity==='error');
  return{playable,repeatable:playable,diagnostics,samples,velocitySamples:velocityCheck.samples,checked:['explicit CW formation and complete 64-beat structure','duration-normalized root-speed budget','timed neighbor rebinding and receiver identity','actual incoming ring, line and swing preconditions','explicit full-hey pass order and constrained entry/exit','exact progressed endpoint identities and facing','two-repeat root continuity, torso overlap and hand occupancy']};
}

/** Sample each figure in its own normalized time, so a short move cannot hide between global frames. */
function checkNormalizedSpeeds(compiled:CompiledDance,dance:Dance):{diagnostics:ValidationDiagnostic[];samples:number}{
  const diagnostics:ValidationDiagnostic[]=[];let samples=0;
  for(const[i,f]of dance.figures.entries()){
    let maximum=0,worstBeat=0,worstId=0;
    for(let k=0;k<80;k++){
      const u=(k+.5)/80,dt=f.beats*.0001,beat=compiled.starts[i]+f.beats*u;
      const a=compiled.sample(beat-dt).poses,b=compiled.sample(beat+dt).poses;samples+=2;
      for(let id=0;id<a.length;id++){const speed=distance(a[id],b[id])/(2*dt);if(!Number.isFinite(speed)||speed>maximum){maximum=speed;worstBeat=beat;worstId=id;}}
    }
    if(!Number.isFinite(maximum)||maximum>2)diagnostics.push({code:'motion-speed',severity:'error',message:`${f.label} exceeds the current 2-model-unit-per-beat root-speed budget (${maximum.toFixed(2)}). Increase its duration or use another path adapter.`,figureIndex:i,beat:worstBeat,dancerIds:[worstId]});
  }
  return{diagnostics,samples};
}
function selectedPairs(f: Figure, ids: number[]): number[][] {
  if (!['balance','swing','allemande','do-si-do'].includes(f.kind)) return [];
  const larks=ids.filter(id=>id%2===0),robins=ids.filter(id=>id%2===1);
  if(f.who==='partner') return larks.map(id=>[id,id+1]);
  if(f.who==='neighbor') return larks.map(id=>[id,robins.find(r=>Math.floor(r/2)!==Math.floor(id/2))!]);
  if(f.who==='larks') return [larks];
  if(f.who==='robins') return [robins];
  return [];
}


/** Event compilers certify their actual finite-state circulation and every
 * figure precondition; this gate additionally checks presented stance/contact
 * composition rather than applying the old fixed-group endpoint assumption. */
function validateEventInterpretation(dance:Dance,capabilities:MotionCapabilities):ValidationReport {
 const diagnostics:ValidationDiagnostic[]=[],checked=['explicit source-bound event and formation adapter','complete finite-state topology closure','actual figure entry and event endpoints','presented stance speed, continuity and contact occupancy'];let samples=0;
 const error=(code:string,message:string,figureIndex?:number)=>{if(!diagnostics.some(d=>d.code===code&&d.figureIndex===figureIndex))diagnostics.push({code,message,figureIndex,severity:'error'});};
 let compiled:CompiledDance;
 try{compiled=compileChoreography(dance,6,capabilities);}catch(e){diagnostics.push(motionCompilationFailure('event-compile',e instanceof Error?e.message:'The event compiler rejected this source.'));return{playable:false,repeatable:false,diagnostics,checked,samples};}
 const velocities=checkNormalizedSpeeds(compiled,dance);diagnostics.push(...velocities.diagnostics);
 for(let beat=0;beat<compiled.totalBeats*2;beat+=.25){
  const f=compiled.sample(beat);samples++;
  if(f.poses.length!==12||f.poses.some((p,id)=>p.id!==id||![p.position.x,p.position.z,p.yaw].every(Number.isFinite)))error('identity-numeric','An event sequence lost a stable identity or finite pose.',f.figureIndex);
  for(let a=0;a<f.poses.length;a++)for(let b=a+1;b<f.poses.length;b++)if(distance(f.poses[a],f.poses[b])<.38)error('torso-overlap',`The event composition violates torso clearance near beat ${beat}.`,f.figureIndex);
  const occupied=new Set<string>();for(const h of f.contacts){const hands=[`${h.a}:${h.handA}`];if(!h.target||h.target==='hands')hands.push(`${h.b}:${h.handB}`);for(const hand of hands){if(occupied.has(hand))error('hand-conflict',`The event composition assigns two targets to one hand near beat ${beat}.`,f.figureIndex);occupied.add(hand);}}
 }
 for(const beat of[...compiled.starts.slice(1),compiled.totalBeats]){const a=compiled.sample(beat-1e-6),b=compiled.sample(beat);if(a.poses.some((p,id)=>distance(p,b.poses[id])>.01))error('discontinuity','An event or figure boundary teleports a body.');}
 const playable=!diagnostics.some(d=>d.severity==='error');return{playable,repeatable:playable&&compiled.repeatable,diagnostics,checked,samples,velocitySamples:velocities.samples};
}
