import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Vector3} from 'three';
import {readContraDbImport,CONVENTIONAL_CALIFORNIA_TWIRL} from './contradb-import.ts';
import {compileChoreography} from './choreography.ts';
import {compileOrdinaryHalfHeyFigure} from './ordinary-half-hey.ts';
import {REGISTERED_MOTION_CAPABILITIES} from './capabilities.ts';
import {Avatar,applyBodyContactAnchors} from './scene.ts';
import type {FigureContext} from './extended-figures.ts';
import type {StudioState,Pose} from './types.ts';
const raw=()=>readFileSync(new URL('../test-data/contradb/2418.json',import.meta.url),'utf8');
const caps={...REGISTERED_MOTION_CAPABILITIES,ordinaryHeySwingExits:true};
const choices={rows:{'contradb:2418:row:0':{balanceBeats:4},'contradb:2418:row:2':{balanceBeats:4},'contradb:2418:row:3':{ordinaryHey:{sidePair:'partner',exit:'opposite-paired-swing'}},'contradb:2418:row:7':{californiaTwirl:CONVENTIONAL_CALIFORNIA_TWIRL}}} as const;
const source=()=>{const r=readContraDbImport(raw(),{capabilities:caps,interpretation:choices});assert.ok(r.dance,r.errors.join('; '));return r;};
const gap=(a:Pose,b:Pose)=>Math.hypot(a.position.x-b.position.x,a.position.z-b.position.z);
const angle=(a:number,b:number)=>Math.abs(Math.atan2(Math.sin(a-b),Math.cos(a-b)));
const corners=(poses:Pose[])=>[[-1,-1],[1,-1],[1,1],[-1,1]].map(([x,z])=>poses.find(p=>Math.sign(p.position.x)===x&&Math.sign(p.position.z)===z)!.id);
function context():FigureContext{const d=source().dance!,c=compileChoreography(d,2,caps);return{ids:[0,1,2,3],start:structuredClone(c.formationSample!(32).poses),dancers:structuredClone(c.dancers),relations:{epoch:0,partner:new Map([[0,1],[1,0],[2,3],[3,2]]),neighbor:new Map([[0,3],[3,0],[1,2],[2,1]])},bindingEpoch:0,next:structuredClone(d.figures[6])};}

test('Emma’s Emergency retains all source counts, partner arch/hey/swing identity and exact archived choice',()=>{
 const r=source(),d=r.dance!;assert.equal(d.title,"Emma's Emergency");assert.equal(d.author,'Maia McCormick');assert.equal(r.record!.rows.length,8);assert.deepEqual(d.figures.map(f=>[f.kind,f.beats]),[['balance',4],['swing',12],['circle',8],['balance',4],['box-the-gnat',4],['hey',8],['swing',8],['circle',8],['ring-balance',4],['california-twirl',4]]);
 assert.deepEqual([d.figures[5].who,d.figures[5].heyStartRole,d.figures[5].centerShoulder,d.figures[5].endShoulder,d.figures[5].exit],['partner','lark','left','right','opposite-paired-swing']);
 const replay=readContraDbImport(d.sourceText,{capabilities:caps});assert.deepEqual(replay.dance?.figures,d.figures);assert.equal(replay.record?.original,r.record!.original);assert.deepEqual(replay.interpretation,choices);
 assert.equal(readContraDbImport(d.sourceText,{capabilities:{...caps,ordinaryHeySwingExits:false}}).dance,undefined);
 const changed=structuredClone(d);changed.figures[6].who='neighbor';assert.throws(()=>compileChoreography(changed,2,caps),/same-pair/);
});

test('the complete four pass layers remain free and the same partners are rotating in full hold on swing count one',()=>{
 const d=source().dance!,c=compileChoreography(d,2,caps),logical=c.formationSample!;
 for(const[beat,want]of[[0,[1,0,3,2]],[16,[2,3,0,1]],[24,[3,0,1,2]],[32,[2,1,0,3]],[40,[0,3,2,1]],[48,[0,3,2,1]],[56,[3,2,1,0]],[60,[3,2,1,0]],[63.999999,[2,3,0,1]]] as const)assert.deepEqual(corners(logical(beat).poses),want,`corners at ${beat}`);
 for(const beat of[34,35.75,37.5,39.25])assert.equal(c.sample(beat).contacts.length,0,`free pass at ${beat}`);
 const frame=c.sample(40),after=c.sample(40.25);assert.equal(frame.contacts.length,6);assert.ok(frame.contacts.every(h=>h.strength===1));
 for(const [a,b]of[[0,1],[2,3]]){assert.ok(Math.abs(gap(frame.poses[a],frame.poses[b])-.62)<1e-8);const center={x:(frame.poses[a].position.x+frame.poses[b].position.x)/2,z:(frame.poses[a].position.z+frame.poses[b].position.z)/2},heading=(p:Pose)=>Math.atan2(p.position.z-center.z,p.position.x-center.x);assert.ok(angle(heading(after.poses[a]),heading(frame.poses[a]))>.15);}
 const previous=c.sample(40-1e-7);for(const h of frame.contacts){const q=previous.contacts.find(q=>q.a===h.a&&q.b===h.b&&q.handA===h.handA&&q.handB===h.handB)!;assert.ok(q);assert.ok(Math.hypot(h.point.x-q.point.x,h.point.y-q.point.y,h.point.z-q.point.z)<1e-6);assert.ok(Math.abs(h.strength-q.strength)<1e-6);}
});

test('new same-pair swing exit owns all direct inputs and rejects unsupported or contradictory handoffs',()=>{
 const f=structuredClone(source().dance!.figures[5]),ctx=context(),p=compileOrdinaryHalfHeyFigure(f,ctx),expected=p.position(0,.6),yaw=p.facing(0,.6,[]),poses=structuredClone(ctx.start);for(const id of ctx.ids){poses[id].position=p.position(id,1);poses[id].yaw=p.facing(id,1,poses);}const contacts=p.contacts(1,poses);
 f.beats=3;ctx.ids[0]=99;ctx.dancers[0].role='robin';ctx.start[0].position.x=99;ctx.next!.who='neighbor';(ctx.relations.partner as Map<number,number>).set(0,3);assert.deepEqual(p.position(0,.6),expected);assert.equal(p.facing(0,.6,[]),yaw);assert.deepEqual(p.contacts(1,poses),contacts);
 for(const patch of[{confidence:'unsupported'},{progression:true},{hands:'right'},{notation:'(8) Hey 1/2 (ML;NR;WL;PR)'},{who:'neighbor'},{centerShoulder:'right'},{endShoulder:'left'}])assert.throws(()=>compileOrdinaryHalfHeyFigure({...source().dance!.figures[5],...patch} as any,context()));
 for(const next of[undefined,{...source().dance!.figures[6],beats:2},{...source().dance!.figures[6],who:'neighbor'}])assert.throws(()=>compileOrdinaryHalfHeyFigure(source().dance!.figures[5],{...context(),next} as any),/same-pair/);
});

test('all set sizes preserve the source’s single progression and continuous finite ends',()=>{
 const dance=source().dance!;
 for(let couples=2;couples<=12;couples++){const c=compileChoreography(dance,couples,caps);assert.equal(c.repeatable,true);assert.equal(c.totalBeats,64);
  for(let round=0;round<2*couples;round++)for(const local of[...c.starts,64]){const beat=round*64+local;if(!beat)continue;const a=c.sample(beat-1e-7),b=c.sample(beat);for(const p of b.poses){assert.equal(p.id,a.poses[p.id].id);assert.ok(gap(p,a.poses[p.id])<2e-5);assert.ok(angle(p.yaw,a.poses[p.id].yaw)<2e-5);}}
  const a=c.sample(35.5),b=c.sample(2*couples*64+35.5);for(const p of a.poses){assert.ok(gap(p,b.poses[p.id])<1e-8);assert.ok(angle(p.yaw,b.poses[p.id].yaw)<1e-8);}
 }
});

test('the complete actual Avatar sequence has beat-locked feet and no leg reach correction',()=>{
 globalThis.document={createElement:()=>({getContext:()=>new Proxy({},{get:()=>()=>{},set:()=>true})})} as unknown as Document;
 const dance=source().dance!,c=compileChoreography(dance,6,caps),avatars=c.dancers.map(d=>new Avatar(d));let strongWrist=0;
 for(let i=0;i<=2560;i++){const beat=i/40,frame=c.sample(beat);for(const a of avatars){a.update(frame.poses[a.dancer.id],frame,{dance,showLabels:false} as StudioState,c.sample);const g=a.root.userData.gait;assert.equal(g.phase,beat);assert.equal(g.maxRate,1);assert.equal(g.maxClampDistance,0,`${beat}/${a.dancer.id}`);for(const leg of a.legs){assert.ok(Math.abs(leg.upper.scale.y*3-.43)<1e-7);assert.ok(Math.abs(leg.lower.scale.y*3-.43)<1e-7);}}
  const posed=applyBodyContactAnchors(avatars,frame);avatars.forEach(a=>a.root.updateMatrixWorld(true));if(beat>=32&&beat<48)for(const h of posed.contacts)if(h.strength>=1-1e-10)for(const[id,hand]of[[h.a,h.handA],...(!h.target||h.target==='hands'?[[h.b,h.handB]]:[])] as Array<[number,'left'|'right']>){const arm=avatars[id].arms.find(a=>a.side===(hand==='left'?1:-1))!;strongWrist=Math.max(strongWrist,arm.hand.getWorldPosition(new Vector3()).distanceTo(new Vector3(h.point.x,h.point.y,h.point.z)));}
 }
 assert.ok(strongWrist<1e-7);avatars.forEach(a=>a.dispose());
});

test('same-pair swing preparation uses persistent partner IDs rather than numeric adjacency',()=>{
 const f=structuredClone(source().dance!.figures[5]),base=context(),mapped=new Map([[0,17],[1,4],[2,12],[3,1]]),ids=base.ids.map(id=>mapped.get(id)!),start:Pose[]=[],dancers=structuredClone(base.dancers).slice(0,0);
 for(const id of base.ids){const next=mapped.get(id)!;start[next]={...structuredClone(base.start[id]),id:next};dancers[next]={...base.dancers[id],id:next};}
 const remap=(pairs:ReadonlyMap<number,number>)=>new Map([...pairs].map(([a,b])=>[mapped.get(a)!,mapped.get(b)!]));
 const changed={...base,ids,start,dancers,relations:{epoch:0,partner:remap(base.relations.partner),neighbor:remap(base.relations.neighbor)}},original=compileOrdinaryHalfHeyFigure(f,base),opaque=compileOrdinaryHalfHeyFigure(f,changed);
 for(const t of[0,.25,.5,.75,1])for(const id of base.ids){assert.deepEqual(opaque.position(mapped.get(id)!,t),original.position(id,t));assert.equal(opaque.facing(mapped.get(id)!,t,[]),original.facing(id,t,[]));}
 const poses=structuredClone(start);for(const id of ids){poses[id].position=opaque.position(id,1);poses[id].yaw=opaque.facing(id,1,poses);}for(const contact of opaque.contacts(1,poses))assert.equal(dancers[contact.a].couple,dancers[contact.b].couple);
});
