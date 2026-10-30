/**
 * Shoulder-limit audit over every figure gallery case: poses every dancer at
 * every sampled frame (whole case, lead-in included) and records the worst
 * upper-arm angle behind the shoulder and the worst held-hand gap.
 *
 *   node --experimental-strip-types qa/arm-limit-audit.ts [out.json] [perBeat]   (evidence: docs/evidence/arm-limit)
 */
import {readFileSync,writeFileSync} from 'node:fs';
import {Vector3} from 'three';
import {Avatar,applyBodyContactAnchors,armLimitFor} from '../src/scene.ts';
import {compileProof,type ProofCase} from '../src/next/proof.ts';
import {upperArmBehind} from '../src/arm-limit.ts';
import type {StudioState} from '../src/types.ts';

export interface CaseResult {id:string;move:string;family:string;worst:number;at:number;dancer:number;hand:string;holdGap:number;holdAt:number;frames:number;over:number;moved:number;elbowStep:number;elbowStepAt:number;held:number}

export function mockCanvas(){(globalThis as any).document??={createElement:()=>({getContext:()=>new Proxy({},{get:()=>()=>{},set:()=>true})})};}

export function auditCase(c:ProofCase,perBeat=8):CaseResult{
  mockCanvas();
  const proof=compileProof(c),dance=proof.dance as any,end=proof.end;
  const cache=new Map<number,any>(),sample=(b:number)=>{let f=cache.get(b);if(!f){f=dance.sample(b);cache.set(b,f);}return f;};
  const avatars=dance.dancers.map((d:any)=>{const a=new Avatar(d);a.armLimit=armLimitFor(dance);return a;}),state={dance:dance.dance,showLabels:false,selectedDancer:-1} as unknown as StudioState;
  const r:CaseResult={id:c.id,move:c.move,family:c.family,worst:0,at:0,dancer:-1,hand:'',holdGap:0,holdAt:0,frames:0,over:0,moved:0,elbowStep:0,elbowStepAt:0,held:0};
  const lastElbow=new Map<string,Vector3>();
  const n=Math.round(end*perBeat);
  for(let i=0;i<=n;i++){
    const beat=Math.min(end-1e-6,i/perBeat),frame=sample(beat);
    for(const a of avatars)a.update(frame.poses[a.dancer.id],frame,state,sample);
    const anchored=applyBodyContactAnchors(avatars,frame);avatars.forEach((a:any)=>a.root.updateMatrixWorld(true));
    r.frames++;let over=false;
    for(const a of avatars)for(const arm of a.arms){const deg=upperArmBehind(arm.side,arm.elbow.position);if(deg>10+1e-6)over=true;if(deg>r.worst){r.worst=deg;r.at=beat;r.dancer=a.dancer.id;r.hand=arm.side>0?'left':'right';}}
    if(over)r.over++;
    for(const a of avatars){const l=a.root.userData.armLimit;if(l)r.moved=Math.max(r.moved,l.moved);}
    for(const a of avatars)for(const arm of a.arms){const key=a.dancer.id+':'+arm.side,e=arm.elbow.position.clone(),hd=arm.hand.position.clone(),p=lastElbow.get(key),ph=lastElbow.get(key+'h');if(p&&ph){const pop=p.distanceTo(e)-ph.distanceTo(hd);if(pop>r.elbowStep){r.elbowStep=pop;r.elbowStepAt=beat;}}lastElbow.set(key,e);lastElbow.set(key+'h',hd);}
    for(const contact of anchored.contacts)if(contact.strength>=.99)r.held+=1/perBeat;
    for(const contact of anchored.contacts){if(contact.strength<1-1e-9)continue;
      for(const [id,hand] of (contact.target&&contact.target!=='hands'?[[contact.a,contact.handA]]:[[contact.a,contact.handA],[contact.b,contact.handB]]) as [number,string][]){const av=avatars.find((x:any)=>x.dancer.id===id);if(!av)continue;const arm=av.arms.find((x:any)=>x.side===(hand==='left'?1:-1))!;const gap=arm.hand.getWorldPosition(new Vector3()).distanceTo(new Vector3(contact.point.x,contact.point.y,contact.point.z));if(gap>r.holdGap){r.holdGap=gap;r.holdAt=beat;}}}
  }
  avatars.forEach((a:any)=>a.dispose());
  return r;
}

if(process.argv[1]?.endsWith("arm-limit-audit.ts")){
  const cases:ProofCase[]=JSON.parse(readFileSync(new URL('../src/next/proof-cases.json',import.meta.url),'utf8'));
  const out:CaseResult[]=[],perBeat=Number(process.argv[3]??8);
  for(const c of cases){if(c.error)continue;try{out.push(auditCase(c,perBeat));}catch(e){console.error('FAIL',c.id,(e as Error).message);}}
  out.sort((a,b)=>b.worst-a.worst);
  if(process.argv[2])writeFileSync(process.argv[2],JSON.stringify(out,null,1));
  const over=out.filter(r=>r.worst>10+1e-6);
  console.log(`cases ${out.length}, over 10 deg: ${over.length}`);
  if(process.argv[4]==='step')out.sort((a,b)=>b.elbowStep-a.elbowStep);
  for(const r of out.slice(0,60))console.log(r.worst.toFixed(1).padStart(6),r.holdGap.toFixed(3),r.moved.toFixed(3),r.elbowStep.toFixed(3),r.family.padEnd(22),r.id,`beat ${r.at.toFixed(2)} d${r.dancer} ${r.hand}`);
}
