import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Vector3} from 'three';
import {Avatar} from './scene.ts';
import type {Dance,Dancer,Frame,StudioState} from './types.ts';
import {compilePartialHey,type PartialHeyOptions,type PartialHeyConstraint,type PartialHeyPose} from './partial-hey.ts';
import {compileBasicPassEvents,compileHeyTrajectory,parseHeyNotation,type Actor,type Point} from './hey.ts';

const actors:Actor[]=[{id:'L1',role:'lark',couple:'1'},{id:'R1',role:'robin',couple:'1'},{id:'L2',role:'lark',couple:'2'},{id:'R2',role:'robin',couple:'2'}];
const pairMap=(pairs:string[][])=>new Map(pairs.flatMap(([a,b])=>[[a,b],[b,a]]));
const pose=(x:number,z:number,yaw:number):PartialHeyConstraint=>({position:{x,z},velocity:{x:0,z:0},yaw});
const dist=(a:Point,b:Point={x:0,z:0})=>Math.hypot(a.x-b.x,a.z-b.z);
const angle=(a:number,b:number)=>Math.abs(Math.atan2(Math.sin(a-b),Math.cos(a-b)));
const get=(poses:readonly PartialHeyPose[],id:string)=>poses.find(p=>p.id===id)!;

function fixture():PartialHeyOptions {
  const plan=compileBasicPassEvents(parseHeyNotation('(8) Hey 1/2 (ML;PR;WL;NR)'),actors,['R1','L2','L1','R2']);
  return{actors:structuredClone(actors),events:plan.events,
    // [NW,NE,SE,SW] after the source's current-neighbor box the gnat.
    entry:new Map([['L2',pose(-.9,-.9,0)],['R2',pose(.9,-.9,0)],['L1',pose(.9,.9,Math.PI)],['R1',pose(-.9,.9,Math.PI)]]),
    // Opposite sidelines; the same neighbors face each other for A2 balance.
    exit:new Map([['L1',pose(-.9,-.9,0)],['R1',pose(.9,-.9,0)],['L2',pose(.9,.9,Math.PI)],['R2',pose(-.9,.9,Math.PI)]]),
    relationships:{partner:pairMap([['L1','R1'],['L2','R2']]),neighbor:pairMap([['L1','R2'],['L2','R1']])},
    frame:{origin:{x:0,z:0},axis:{x:1,z:0}},beats:8,entryBeats:1.5,exitBeats:1.5,maximumSpeed:1.8,maximumYawRate:4,
    source:'https://contradb.com/dances/1502: gentlespoons start a half hey - lefts in center, rights on ends'};
}

/** The source's logical corner identities stay fixed. Actual bodies finish the
 * right-hand box-the-gnat hold at 1.10 separation, then reach the next two-hand
 * balance at 1.18 separation. These are explicit adjacent-primitive contracts. */
function heldFixture():PartialHeyOptions {
  const options=fixture();
  for(const p of options.entry.values())p.position.z*=.55/.9;
  for(const p of options.exit.values())p.position.z*=.59/.9;
  return{...options,boundaryMode:'within-passes',entryBeats:0,exitBeats:0,gateBeats:[2,3.75,5.5,7.25],slotSpacing:1.05,passClearance:.66,maximumSpeed:1.2};
}

test('retained ContraDB1502 source and literal four-layer half hey preserve all three counterpart passes',()=>{
  const source=JSON.parse(readFileSync(new URL('../test-data/contradb/1502.json',import.meta.url),'utf8'));
  assert.equal(source.sourceUrl,'https://contradb.com/dances/1502');
  assert.match(source.html,/neighbors right hand balance &amp;  box the gnat/);
  assert.match(source.html,/gentlespoons start a half hey - lefts in center, rights on ends/);
  assert.match(source.html,/neighbors balance &amp; swing/);
  const options=fixture(),path=compilePartialHey(options);
  assert.equal(path.beats,8);
  assert.deepEqual(path.endOrder,['R2','L1','L2','R1']);
  assert.deepEqual(path.events.map(e=>[e.token.raw,e.pairs]),[
    ['ML',[['L2','L1']]],['PR',[['R1','L1'],['L2','R2']]],
    ['WL',[['R1','R2']]],['NR',[['L1','R2'],['R1','L2']]]
  ]);
  assert.deepEqual(path.gates.map(g=>g.beat),[2.125,3.375,4.625,5.875]);
  for(const id of actors.map(a=>a.id)){
    assert.equal(path.events.flatMap(e=>e.pairs).filter(pair=>pair.includes(id)).length,3);
    for(const [t,map]of[[0,options.entry],[8,options.exit]] as const){const actual=get(path.sample(t).poses,id),expected=map.get(id)!;assert.deepEqual(actual.position,expected.position);assert.deepEqual(actual.velocity,expected.velocity);assert.equal(actual.yaw,expected.yaw);}
  }
});

test('every actual gate has its declared shoulder, opposing travel, explicit identity pair, and no hands',()=>{
  const path=compilePartialHey(fixture());
  for(const gate of path.gates){
    const frame=path.sample(gate.beat);assert.deepEqual(frame.contacts,[]);
    for(const [a,b]of gate.pairs){
      const A=get(frame.poses,a),B=get(frame.poses,b);
      assert.ok(Math.abs(A.position.x-B.position.x)<1e-9);
      assert.ok(Math.abs(dist(A.position,B.position)-.66)<1e-9);
      assert.ok(A.velocity.x*B.velocity.x<0);
      for(const [self,other]of[[A,B],[B,A]]){
        const v=self.velocity,dx=other.position.x-self.position.x,dz=other.position.z-self.position.z,right=(-v.z*dx+v.x*dz)/dist(v);
        assert.ok(gate.shoulder==='right'?right>.659:right<-.659);
      }
    }
  }
});

test('entrance, all pass and loop joints, and exit are C2 with continuous facing and yaw rate',()=>{
  const path=compilePartialHey(fixture());
  for(const t of path.phaseBoundaries.filter(t=>t>0&&t<8)){
    const before=path.sample(t-1e-7),after=path.sample(t+1e-7);
    for(const id of actors.map(a=>a.id)){
      const a=get(before.poses,id),b=get(after.poses,id);
      assert.ok(dist(a.position,b.position)<1e-6,`position at ${t}`);
      assert.ok(dist(a.velocity,b.velocity)<2e-6,`velocity at ${t}`);
      assert.ok(dist(a.acceleration,b.acceleration)<2e-5,`acceleration at ${t}`);
      assert.ok(angle(a.yaw,b.yaw)<1e-6,`facing at ${t}`);
      assert.ok(Math.abs(a.yawRate-b.yawRate)<1e-5,`angular rate at ${t}`);
    }
  }
  for(const t of [0,8]){
    const exact=path.sample(t),near=path.sample(t===0?1e-7:8-1e-7);
    for(const id of actors.map(a=>a.id)){
      const a=get(exact.poses,id),b=get(near.poses,id);
      assert.ok(dist(a.position,b.position)<1e-6);assert.ok(dist(a.velocity,b.velocity)<1e-6);assert.ok(dist(a.acceleration,b.acceleration)<1e-5);assert.ok(angle(a.yaw,b.yaw)<1e-6);
    }
  }
});

test('dense independent sampling respects continuous clearance and speed certificates',()=>{
  const path=compilePartialHey(fixture());let minimum=Infinity,maximum=0,maxYaw=0;
  for(let i=0;i<=8000;i++){
    const poses=path.sample(i/1000).poses;
    assert.deepEqual(poses.map(p=>p.id),actors.map(a=>a.id),'output order is stable, not dynamically spatially sorted');
    for(const p of poses){maximum=Math.max(maximum,dist(p.velocity));maxYaw=Math.max(maxYaw,Math.abs(p.yawRate));}
    for(let a=0;a<4;a++)for(let b=a+1;b<4;b++)minimum=Math.min(minimum,dist(poses[a].position,poses[b].position));
  }
  assert.ok(path.minimumCertifiedClearance>=.5);assert.ok(minimum>=path.minimumCertifiedClearance-1e-8);
  assert.ok(Math.abs(minimum-.66)<1e-6);assert.ok(maximum<=path.maximumCertifiedSpeed+1e-8);assert.ok(path.maximumCertifiedSpeed<=1.8);
  assert.ok(maxYaw<=path.maximumCertifiedYawRate+1e-8);assert.ok(path.maximumCertifiedYawRate<=4);
});

function transform(options:PartialHeyOptions,theta:number,origin:Point):PartialHeyOptions {
  const rotate=(v:Point)=>({x:v.x*Math.cos(theta)-v.z*Math.sin(theta),z:v.x*Math.sin(theta)+v.z*Math.cos(theta)});
  const map=(input:ReadonlyMap<string,PartialHeyConstraint>)=>new Map([...input].map(([id,p])=>{const v=rotate(p.position);return[id,{...p,position:{x:v.x+origin.x,z:v.z+origin.z},velocity:rotate(p.velocity),acceleration:p.acceleration?rotate(p.acceleration):undefined,yaw:p.yaw-theta}] as const;}));
  return{...options,frame:{origin,axis:rotate({x:1,z:0})},entry:map(options.entry),exit:map(options.exit)};
}
test('arbitrary diagonal orientation and translation preserve the exact world-space path and shoulder chirality',()=>{
  const base=fixture(),original=compilePartialHey(base);
  for(const theta of [.63,Math.PI/2,-1.21]){
    const origin={x:3.7,z:-2.4},rotated=compilePartialHey(transform(base,theta,origin));
    for(let i=0;i<=64;i++)for(const a of original.sample(i/8).poses){
      const b=get(rotated.sample(i/8).poses,a.id),expected={x:origin.x+a.position.x*Math.cos(theta)-a.position.z*Math.sin(theta),z:origin.z+a.position.x*Math.sin(theta)+a.position.z*Math.cos(theta)};
      assert.ok(dist(b.position,expected)<2e-8);assert.ok(angle(b.yaw,a.yaw-theta)<2e-8);assert.ok(Math.abs(a.yawRate-b.yawRate)<2e-8);
    }
  }
});

test('entry and exit may be deformed and have independently constrained side-step facing and nonzero derivatives',()=>{
  const options=fixture();
  for(const map of[options.entry,options.exit])for(const[id,p]of map){
    p.position.x+=((map===options.entry?['R1','L1']:['R2','L1']).includes(id)?-.06:.06);
    p.position.z*=1.03;p.velocity={x:.015,z:-.02};p.acceleration={x:.01,z:.015};p.yaw+=.13;p.yawRate=.03;
  }
  const path=compilePartialHey({...options,maximumSpeed:2});
  for(const [beat,map]of[[0,options.entry],[8,options.exit]] as const)for(const[id,p]of map){
    const q=get(path.sample(beat).poses,id);assert.deepEqual(q.position,p.position);assert.deepEqual(q.velocity,p.velocity);assert.deepEqual(q.acceleration,p.acceleration);assert.equal(q.yaw,p.yaw);assert.equal(q.yawRate,p.yawRate);
  }
});

test('opposite shoulder handedness is explicit and supports a different stable actor naming scheme',()=>{
  const original=fixture(),base=compilePartialHey(original),renamed=new Map(actors.map((a,i)=>[a.id,`set-47/actor-${i+19}`]));
  const actorId=(id:string)=>renamed.get(id)!;
  const mirrored=(map:ReadonlyMap<string,PartialHeyConstraint>)=>new Map([...map].map(([id,p])=>[actorId(id),{...p,position:{x:p.position.x,z:-p.position.z},velocity:{x:p.velocity.x,z:-p.velocity.z},yaw:Math.PI-p.yaw}]));
  const opposite:PartialHeyOptions={...original,actors:original.actors.map(a=>({...a,id:actorId(a.id)})),
    events:original.events.map(e=>({...e,token:{...e.token,raw:e.token.raw.replace(/[RL]$/,c=>c==='R'?'L':'R'),shoulder:e.token.shoulder==='left'?'right':'left'},pairs:e.pairs.map(([a,b])=>[actorId(a),actorId(b)]),incomingOrder:e.incomingOrder.map(actorId),outgoingOrder:e.outgoingOrder?.map(actorId),loopers:e.loopers.map(actorId)})),
    entry:mirrored(original.entry),exit:mirrored(original.exit),
    relationships:Object.fromEntries(Object.entries(original.relationships!).map(([name,map])=>[name,new Map([...map!].map(([a,b])=>[actorId(a),actorId(b)]))]))};
  const path=compilePartialHey(opposite);
  for(let i=0;i<=32;i++)for(const p of base.sample(i/4).poses){const q=get(path.sample(i/4).poses,actorId(p.id));assert.ok(dist(q.position,{x:p.position.x,z:-p.position.z})<1e-8);assert.ok(angle(q.yaw,Math.PI-p.yaw)<1e-8);}
});

test('a final shoulder-to-shoulder clause requires explicit exit constraints and never invents an outgoing permutation',()=>{
  const options=fixture(),partialPlan=compileBasicPassEvents(parseHeyNotation('(8) Hey 1/2 (ML;PR;WL;NR~)'),actors,['R1','L2','L1','R2']);
  const fullPlan=compileBasicPassEvents(parseHeyNotation('(8) Hey 1/2 (ML;PR;WL;NR)'),actors,['R1','L2','L1','R2']);
  const core=compileHeyTrajectory(partialPlan,{durationBeats:7}),full=compileHeyTrajectory(fullPlan);
  const map=(ps:typeof core.entry)=>new Map(ps.map(p=>[p.id,{...p,yawRate:(p.velocity.z*p.acceleration.x-p.velocity.x*p.acceleration.z)/(p.velocity.x*p.velocity.x+p.velocity.z*p.velocity.z)}]));
  const path=compilePartialHey({...options,events:partialPlan.events,entry:map(core.entry),exit:map(full.exit),entryBeats:0,exitBeats:1});
  assert.equal(path.endOrder,undefined);assert.equal(path.events.at(-1)!.outgoingOrder,undefined);assert.equal(path.gates.at(-1)!.completion,'shoulder-to-shoulder');assert.equal(path.gates.at(-1)!.beat,7);
  for(const p of full.exit)assert.ok(dist(get(path.sample(8).poses,p.id).position,p.position)<1e-9);
  const finalGate=compileHeyTrajectory(partialPlan),atGate=compilePartialHey({...options,events:partialPlan.events,entry:map(finalGate.entry),exit:map(finalGate.exit),entryBeats:0,exitBeats:0});
  assert.equal(atGate.gates.at(-1)!.beat,8);assert.equal(atGate.endOrder,undefined);
});

test('pass-integrated boundaries preserve the actual held entry, ready-to-balance exit, all four passes, and C2 joins inside eight beats',()=>{
  const options=heldFixture(),path=compilePartialHey(options);
  assert.equal(path.beats,8);assert.deepEqual(path.gates.map(g=>g.beat),[2,3.75,5.5,7.25]);assert.deepEqual(path.endOrder,['R2','L1','L2','R1']);
  assert.ok(path.maximumCertifiedSpeed<=1.2);assert.ok(path.minimumCertifiedClearance>=.5);
  for(const[t,map]of[[0,options.entry],[8,options.exit]] as const)for(const[id,p]of map){const q=get(path.sample(t).poses,id);assert.deepEqual(q.position,p.position);assert.deepEqual(q.velocity,p.velocity);assert.equal(q.yaw,p.yaw);}
  for(const t of path.phaseBoundaries.filter(t=>t>0&&t<8))for(const id of actors.map(a=>a.id)){
    const a=get(path.sample(t-1e-7).poses,id),b=get(path.sample(t+1e-7).poses,id);
    assert.ok(dist(a.position,b.position)<1e-6);assert.ok(dist(a.velocity,b.velocity)<2e-6);assert.ok(dist(a.acceleration,b.acceleration)<2e-5);assert.ok(angle(a.yaw,b.yaw)<1e-6);assert.ok(Math.abs(a.yawRate-b.yawRate)<1e-5);
  }
  for(const changes of[{entryBeats:1},{gateBeats:[2,3,3,7]},{gateBeats:[2,4,6,8]},{gateBeats:[2,4,6]},{gateBeats:[2,4,6,NaN]}])assert.throws(()=>compilePartialHey({...options,...changes}),/Integrated|ordered/);
});

test('actual adult Avatar can dance the held half hey with exactly one step per beat and zero leg reach clamps',()=>{
  globalThis.document={createElement:()=>({getContext:()=>new Proxy({},{get:()=>()=>{},set:()=>true})})} as unknown as Document;
  const dance={figures:[{kind:'long-lines',beats:8},{kind:'hey',beats:8},{kind:'long-lines',beats:8}]} as Dance;
  const dancers:Dancer[]=actors.map((a,id)=>({id,name:a.id,role:a.role,couple:Math.floor(id/2),direction:1,color:'#438b86'}));
  // Includes the production dance-root bounce; the reach test is not helped by
  // disabling normal visual styling. Holding outside this isolated primitive is
  // explicit. Actual boxgnat/balance foot lookahead remains an integration test.
  for(const options of[heldFixture(),transform(heldFixture(),.63,{x:2.3,z:-1.7})]){
    const path=compilePartialHey(options),avatars=dancers.map(d=>new Avatar(d));
    const sample=(beat:number):Frame=>{
      beat=Math.max(0,Math.min(24,beat));const t=Math.max(0,Math.min(8,beat-8)),fi=beat<8?0:beat<16?1:2;
      return{beat,localBeat:beat,figureIndex:fi,figureProgress:(beat-fi*8)/8,repeat:0,poses:path.sample(t).poses.map((p,id)=>({id,position:p.position,yaw:p.yaw,stride:1,lean:.03,bounce:fi===1?Math.sin(beat*Math.PI*2)*.018:0,turn:0,activity:fi===1?'hey':'waiting'})),contacts:[],warnings:[]};
    };
    let maxLowering=0;const planted=new Map<string,{phase:number;position:Vector3}>();
    for(let i=0;i<960;i++){
      const beat=8+i/120,frame=sample(beat);
      for(const avatar of avatars){
        avatar.update(frame.poses[avatar.dancer.id],frame,{dance,showLabels:false} as StudioState,sample);avatar.root.updateMatrixWorld(true);
        const gait=avatar.root.userData.gait;assert.equal(gait.phase,beat);assert.equal(gait.maxRate,1);assert.equal(gait.steps,8);assert.equal(gait.reachClamps,0,`actor ${avatar.dancer.id}, beat ${beat}`);assert.equal(gait.maxClampDistance,0);maxLowering=Math.max(maxLowering,gait.pelvisLowering);
        for(const [j,leg]of avatar.legs.entries()){
          assert.ok(Math.abs(leg.upper.scale.y*3-.43)<1e-7);assert.ok(Math.abs(leg.lower.scale.y*3-.43)<1e-7);
          const offset=leg.side>0?1:0,phase=Math.floor((beat-offset)/2)*2+offset,key=`${avatar.dancer.id}/${j}`,position=leg.foot.getWorldPosition(new Vector3()),previous=planted.get(key);
          if(beat-phase<1){if(previous?.phase===phase)assert.ok(position.distanceTo(previous.position)<1e-7,'planted feet must not slide to hide excess reach');planted.set(key,{phase,position});}
        }
      }
    }
    assert.ok(maxLowering<.065,'normal reach-derived pelvis envelope remains bounded');avatars.forEach(a=>a.dispose());
  }
});

test('compact elliptical end loops preserve clearance and source shoulders under arbitrary frame rotation',()=>{
  const options={...heldFixture(),slotSpacing:.8,passClearance:.6},base=compilePartialHey(options),rotated=compilePartialHey(transform(options,.84,{x:-1,z:4}));
  assert.ok(base.minimumCertifiedClearance>=.5);assert.ok(rotated.minimumCertifiedClearance>=.5);
  for(const gate of base.gates)for(const[a,b]of gate.pairs){const A=get(base.sample(gate.beat).poses,a),B=get(base.sample(gate.beat).poses,b);assert.ok(Math.abs(dist(A.position,B.position)-.6)<1e-8);}
});

test('the primitive snapshots inputs and exposes immutable metadata; sample mutation cannot alter playback',()=>{
  const options=fixture(),path=compilePartialHey(options),before=path.sample(2.5);
  options.entry.get('L1')!.position.x=999;options.events[0].pairs[0][0]='intruder';options.frame.origin.x=333;
  (options.relationships!.neighbor as Map<string,string>).clear();
  assert.deepEqual(path.sample(2.5),before);assert.equal(get(path.sample(0).poses,'L1').position.x,.9);
  assert.throws(()=>{path.entry[0].position.x=55;},TypeError);assert.throws(()=>{path.events[0].pairs[0][0]='intruder';},TypeError);
  before.poses[0].position.x=444;assert.notEqual(path.sample(2.5).poses[0].position.x,444);
});

test('zero entrance or exit allocations require the exact adjoining core state rather than a projected snap',()=>{
  const options=fixture(),plan=compileBasicPassEvents(parseHeyNotation('(8) Hey 1/2 (ML;PR;WL;NR)'),actors,['R1','L2','L1','R2']),core=compileHeyTrajectory(plan);
  const map=(ps:typeof core.entry)=>new Map(ps.map(p=>[p.id,{...p,yawRate:(p.velocity.z*p.acceleration.x-p.velocity.x*p.acceleration.z)/(p.velocity.x*p.velocity.x+p.velocity.z*p.velocity.z)}]));
  const zero={...options,entry:map(core.entry),exit:map(core.exit),entryBeats:0,exitBeats:0};
  const path=compilePartialHey(zero);assert.equal(path.beats,8);assert.equal(path.gates[0].beat,1);
  zero.entry.get('L1')!.position.x+=.01;assert.throws(()=>compilePartialHey(zero),/no snap/);
});

test('reject missing identities, unbound relations, corrupted pass pairs and permutations, and wrong role selectors',()=>{
  let o=fixture();(o.entry as Map<string,PartialHeyConstraint>).delete('L1');assert.throws(()=>compilePartialHey(o),/stable dancer identities/);
  o=fixture();o.actors=[...o.actors.slice(0,3),o.actors[0]];assert.throws(()=>compilePartialHey(o),/stable actor IDs/);
  o=fixture();o.relationships={};assert.throws(()=>compilePartialHey(o),/reciprocal identity binding/);
  o=fixture();o.events[0].pairs[0].reverse();assert.throws(()=>compilePartialHey(o),/adjacency/);
  o=fixture();o.events[0].outgoingOrder!.reverse();assert.throws(()=>compilePartialHey(o),/permutation/);
  o=fixture();o.events[0].token.selector='robins';assert.throws(()=>compilePartialHey(o),/Role-named/);
  o=fixture();o.events[3].token.neighborOrdinal=2;assert.throws(()=>compilePartialHey(o),/noncurrent neighbors/);
});

test('reject nonfinite beat/frame/derivative budgets, collisions, extra passes, and underspecified physical motion',()=>{
  for(const changes of[{beats:Infinity},{beats:0},{entryBeats:NaN},{entryBeats:5,exitBeats:4},{maximumSpeed:0},{minimumClearance:NaN},{maximumYawRate:0}])assert.throws(()=>compilePartialHey({...fixture(),...changes}),/budgets/);
  let o=fixture();o.frame.axis={x:2,z:0};assert.throws(()=>compilePartialHey(o),/unit frame/);
  o=fixture();o.entry.get('L1')!.velocity.x=NaN;assert.throws(()=>compilePartialHey(o),/Finite explicit/);
  o=fixture();o.entry.get('L1')!.yaw=1e30;assert.throws(()=>compilePartialHey(o),/numeric scale/);
  o=fixture();o.exit.get('L1')!.position={...o.exit.get('R2')!.position};assert.throws(()=>compilePartialHey(o),/clearance|undeclared/);
  o=fixture();[o.exit.get('L1')!.position,o.exit.get('R1')!.position]=[o.exit.get('R1')!.position,o.exit.get('L1')!.position];assert.throws(()=>compilePartialHey(o),/undeclared/);
  assert.throws(()=>compilePartialHey({...fixture(),maximumSpeed:.2}),/speed/);
  assert.throws(()=>compilePartialHey({...fixture(),entryBeats:0}),/no snap/);
  const path=compilePartialHey(fixture());assert.throws(()=>path.sample(NaN),/finite/);assert.deepEqual(path.sample(-2),path.sample(0));assert.deepEqual(path.sample(20),path.sample(8));
});
