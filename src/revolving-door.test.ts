import test from 'node:test';
import assert from 'node:assert/strict';
import {compileRevolvingDoor, type RevolvingDoorOptions, type RevolvingDoorRelation} from './revolving-door.ts';
import {compileRevolvingDoorFigure, type RevolvingDoorFigure} from './revolving-door-adapter.ts';
import type {FigureContext, MotionPlan} from './extended-figures.ts';
import type {TurnConstraint} from './ring-twirl-contract.ts';
import type {Dancer, HandContact, Pose, Vec2, Vec3} from './types.ts';

// Independent named oracle for this isolated, source-explicit contract. These
// tests do not register a figure, interpret titles, or certify human biomechanics.
const TAU = 2 * Math.PI;
const angularDifference = (a:number, b:number) => Math.atan2(Math.sin(a-b), Math.cos(a-b));
const close = (actual:number, expected:number, tolerance=1e-8, message='') =>
  assert.ok(Math.abs(actual-expected) < tolerance, `${message}: ${actual} != ${expected}`);
const pointClose = (actual:Vec2, expected:Vec2, tolerance=1e-8) =>
  assert.ok(Math.hypot(actual.x-expected.x, actual.z-expected.z) < tolerance, `${JSON.stringify(actual)} != ${JSON.stringify(expected)}`);
const angleClose = (actual:number, expected:number, tolerance=1e-8) => close(angularDifference(actual, expected), 0, tolerance);
const reciprocal = (pairs:readonly (readonly [number,number])[]) =>
  new Map(pairs.flatMap(([a,b]) => [[a,b],[b,a]] as [number,number][]));
const constraint = ([x,z,yaw]:readonly number[]):TurnConstraint => ({position:{x,z},yaw,velocity:{x:0,z:0},yawRate:0});
const ENTRY = {
  partner: [[-.9,-.34,Math.PI/2],[-.9,.34,Math.PI/2],[.9,.34,-Math.PI/2],[.9,-.34,-Math.PI/2]],
  neighbor: [[.9,.34,-Math.PI/2],[-.9,.34,Math.PI/2],[-.9,-.34,Math.PI/2],[.9,-.34,-Math.PI/2]],
} as const;
const EXIT = {
  partner: [[.9,.31,4*Math.PI/3],[-.9,.31,4*Math.PI/3],[-.9,-.31,Math.PI/3],[.9,-.31,Math.PI/3]],
  neighbor: [[-.9,-.31,Math.PI/3],[-.9,.31,4*Math.PI/3],[.9,.31,4*Math.PI/3],[.9,-.31,Math.PI/3]],
} as const;
const CARRIAGE = {partner:[[1,0],[3,2]],neighbor:[[1,2],[3,0]]} as const;
const OUTGOING = {partner:[[0,3],[2,1]],neighbor:[[0,1],[2,3]]} as const;
function options(relation:RevolvingDoorRelation='partner', ids:readonly number[]=[0,1,2,3]):RevolvingDoorOptions {
  const actors:Dancer[] = ids.map((id, index) => ({id,name:`Actor ${index}`,role:index%2?'robin':'lark',couple:index<2?5:19,direction:1,color:'#438b86'}));
  return {
    actors, relations:{epoch:7,partner:reciprocal([[ids[0],ids[1]],[ids[2],ids[3]]]),neighbor:reciprocal([[ids[0],ids[3]],[ids[2],ids[1]]])},bindingEpoch:7,
    entry:new Map(ids.map((id,index) => [id,constraint(ENTRY[relation][index])])),
    exit:new Map(ids.map((id,index) => [id,constraint(EXIT[relation][index])])),
    pairs:CARRIAGE[relation].map(([carrier,carried]) => ({carrierId:ids[carrier],carriedId:ids[carried],relationship:relation})),
    centerRole:'robin',hand:'right',direction:'right',amount:1,dropOffAfter:.5,approachHold:'half-shoulder-waist',beats:8,phaseBeats:[1.25,4.5,1.25,1],
    frame:{origin:{x:0,z:0},across:{x:1,z:0}},source:'Explicit revolving-door contract fixture',
  };
}
function figure(relation:RevolvingDoorRelation='partner'):RevolvingDoorFigure {
  return {id:'explicit-revolving-door',kind:'revolving-door',beats:8,label:'Explicit reviewed carriage',who:relation,
    centerRole:'robin',hands:'right',direction:'right',amount:1,dropOffAfter:.5,approachHold:'half-shoulder-waist',
    entry:'side-couples',exit:'opposite-paired-swing',phaseBeats:[1.25,4.5,1.25,1],notes:'Explicit contract, with source counts retained.'};
}
function context(relation:RevolvingDoorRelation='partner', ids:readonly number[]=[0,1,2,3]):FigureContext {
  const o=options(relation,ids), start:Pose[]=[], dancers:Dancer[]=[];
  for (const actor of o.actors) {
    dancers[actor.id]={...actor};
    start[actor.id]={id:actor.id,position:{...o.entry.get(actor.id)!.position},yaw:o.entry.get(actor.id)!.yaw,stride:0,lean:0,bounce:0,turn:0,activity:'waiting'};
  }
  return {ids:[...ids],start,dancers,relations:o.relations,bindingEpoch:7,next:{id:'opposite-swing',kind:'swing',beats:8,who:relation==='partner'?'neighbor':'partner',label:'Opposite bound relation swing'}};
}
const contactKey = (c:HandContact) => `${c.a}:${c.b}:${c.handA}:${c.handB}:${c.kind}:${c.target}`;
const contactKeys = (contacts:readonly HandContact[]) => contacts.map(contactKey).sort();
function supportOracle(relation:RevolvingDoorRelation, ids:readonly number[]=[0,1,2,3]) {
  return CARRIAGE[relation].flatMap(([r,l]) => [
    `${ids[l]}:${ids[r]}:right:left:courtesy:waist`,
    `${ids[r]}:${ids[l]}:left:right:courtesy:upper-arm`,
  ]).sort();
}
function swingOracle(relation:RevolvingDoorRelation, ids:readonly number[]=[0,1,2,3]) {
  return OUTGOING[relation].flatMap(([l,r]) => [
    `${ids[l]}:${ids[r]}:left:right:swing-frame:hands`,
    `${ids[l]}:${ids[r]}:right:left:swing-frame:back`,
    `${ids[r]}:${ids[l]}:left:right:swing-frame:upper-arm`,
  ]).sort();
}
function sampledAdapter(plan:MotionPlan, ctx:FigureContext, t:number):Pose[] {
  return ctx.ids.map(id => ({...ctx.start[id],position:plan.position(id,t),yaw:plan.facing(id,t,[])}));
}
function bodyPoint(p:Pick<Pose,'position'|'yaw'>, q:Vec3):Vec3 {
  return {x:p.position.x+q.x*Math.cos(p.yaw)+q.z*Math.sin(p.yaw),y:q.y,z:p.position.z-q.x*Math.sin(p.yaw)+q.z*Math.cos(p.yaw)};
}

for (const relation of ['partner','neighbor'] as const) {
  test(`${relation} revolving door has the exact named entry, crossed lark, returned robin and opposite-swing endpoints`, () => {
    const p=compileRevolvingDoor(options(relation));
    assert.equal(p.epoch,7); assert.equal(p.beats,8);
    assert.deepEqual(p.phaseBeats,[1.25,4.5,1.25,1]);
    assert.deepEqual(p.pairs,CARRIAGE[relation].map(([carrierId,carriedId])=>({carrierId,carriedId,relationship:relation})));
    for (const [beat,oracle] of [[0,ENTRY[relation]],[8,EXIT[relation]]] as const) {
      const f=p.sample(beat);
      assert.deepEqual(f.poses.map(p=>p.id).sort(),[0,1,2,3]);
      for (let id=0;id<4;id++) {
        const pose=f.poses.find(p=>p.id===id)!, expected=constraint(oracle[id]);
        pointClose(pose.position,expected.position); angleClose(pose.yaw,expected.yaw);
        pointClose(pose.velocity,{x:0,z:0},1e-6); close(pose.yawRate,0,1e-6);
        pointClose(p.position(id,beat/8),expected.position); angleClose(p.facing(id,beat/8),expected.yaw);
      }
    }
    for (const [l,r] of OUTGOING[relation]) {
      close(p.position(l,1).x,p.position(r,1).x);
      close(Math.abs(p.position(l,1).z-p.position(r,1).z),.62);
    }
    assert.ok(p.minimumObservedClearance>=.559999);
    assert.ok(p.maximumObservedSpeed<=1.3); assert.ok(p.maximumObservedYawRate<=3.5);
  });

  test(`${relation} carriage uses two directed shoulder/waist supports and only the central robins join right hands`, () => {
    const p=compileRevolvingDoor(options(relation));
    assert.deepEqual(contactKeys(p.sample(0).contacts),supportOracle(relation));
    const joined='1:3:right:right:joined:hands';
    for (const beat of [1.25,2.5,4.5,5.35]) {
      const f=p.sample(beat);
      assert.deepEqual(contactKeys(f.contacts),[...supportOracle(relation),joined].sort());
      for (const c of f.contacts) {
        close(c.strength,1);
        if(c.kind==='courtesy') {
          assert.deepEqual(c.bodyPoint,c.target==='waist'?{x:.13,y:1.18,z:-.13}:{x:-.23,y:1.33,z:0});
          const expected=bodyPoint(f.poses.find(p=>p.id===c.b)!,c.bodyPoint!);
          pointClose(c.point,expected); close(c.point.y,expected.y);
        } else {
          assert.equal(c.target,'hands'); assert.equal(c.bodyPoint,undefined);
          pointClose(c.point,{x:0,z:0}); close(c.point.y,1.2);
        }
      }
    }
    for (const c of p.sample(5.55).contacts.filter(c=>c.kind==='courtesy')) close(c.strength,.5);
    for (const beat of [5.75,6,6.65]) assert.deepEqual(contactKeys(p.sample(beat).contacts),[joined]);
    for (const beat of [7,7.5,8]) assert.deepEqual(p.sample(beat).contacts,[]);
  });

  test(`${relation} adapter preserves the explicit contract and acquires the exact opposite-relation swing`, () => {
    const ctx=context(relation),plan=compileRevolvingDoorFigure(figure(relation),ctx);
    for (let id=0;id<4;id++) {
      pointClose(plan.position(id,0),constraint(ENTRY[relation][id]).position);
      pointClose(plan.position(id,1),constraint(EXIT[relation][id]).position);
      angleClose(plan.facing(id,1,[]),EXIT[relation][id][2]);
      assert.equal(plan.swingPreparation!(id,7/8),undefined);
      close(plan.swingPreparation!(id,7.5/8)!.strength,.5);
      close(plan.swingPreparation!(id,1)!.strength,1);
      assert.deepEqual(contactKeys(plan.swingPreparation!(id,1)!.contacts),swingOracle(relation));
    }
    assert.deepEqual(contactKeys(plan.contacts(2/8,sampledAdapter(plan,ctx,2/8))),[...supportOracle(relation),'1:3:right:right:joined:hands'].sort());
    assert.throws(()=>plan.swingPreparation!(999,1),/outside/);
  });
}

test('central robins wind once right while carried larks wind only half a turn before release', () => {
  const p=compileRevolvingDoor(options());
  function winding(id:number,end:number) {
    let previous=Math.atan2(p.sample(1.25).poses.find(p=>p.id===id)!.position.z,p.sample(1.25).poses.find(p=>p.id===id)!.position.x), sum=0;
    for(let i=1;i<=800;i++) {
      const pose=p.sample(1.25+(end-1.25)*i/800).poses.find(p=>p.id===id)!;
      const angle=Math.atan2(pose.position.z,pose.position.x),delta=angularDifference(angle,previous);
      assert.ok(delta>=-1e-10,'No reversal during the explicit right-hand turn');
      sum+=delta;previous=angle;
    }
    return sum;
  }
  for(const id of [1,3]) {close(winding(id,5.75),Math.PI);close(winding(id,7),TAU);close(p.facing(id,7/8)-p.facing(id,1.25/8),-TAU);}
  for(const id of [0,2]) {close(winding(id,5.75),Math.PI);close(p.facing(id,5.75/8)-p.facing(id,1.25/8),-Math.PI);}
  for(const beat of [1.25,2,4,5.75]) {
    const f=p.sample(beat);
    for(const [r,l] of CARRIAGE.partner) {
      const R=f.poses.find(p=>p.id===r)!.position,L=f.poses.find(p=>p.id===l)!.position;
      close(R.x*L.z-R.z*L.x,0);assert.ok(R.x*L.x+R.z*L.z>0);
      assert.ok(Math.hypot(L.x,L.z)>Math.hypot(R.x,R.z));
    }
  }
});

test('all phase and contact limits are continuous with finite derivatives and stationary endpoints', () => {
  const p=compileRevolvingDoor(options()),epsilon=1e-6;
  for(const beat of p.phaseBoundaries) {
    const before=p.sample(beat-epsilon),at=p.sample(beat),after=p.sample(beat+epsilon);
    for(const pose of at.poses) {
      for(const f of [before,after]) {
        const nearby=f.poses.find(q=>q.id===pose.id)!;
        pointClose(nearby.position,pose.position,4e-6);angleClose(nearby.yaw,pose.yaw,4e-6);
        pointClose(nearby.velocity,pose.velocity,1e-4);close(nearby.yawRate,pose.yawRate,1e-4);
      }
      assert.ok([pose.position.x,pose.position.z,pose.yaw,pose.velocity.x,pose.velocity.z,pose.yawRate].every(Number.isFinite));
    }
    const keySet=new Set([...before.contacts,...at.contacts,...after.contacts].map(contactKey));
    for(const key of keySet) {
      const strength=(contacts:HandContact[])=>contacts.find(c=>contactKey(c)===key)?.strength??0;
      close(strength(before.contacts),strength(at.contacts),1e-4);
      close(strength(after.contacts),strength(at.contacts),1e-4);
    }
  }
  assert.deepEqual(p.sample(-10),p.sample(0));assert.deepEqual(p.sample(18),p.sample(8));
  for(const bad of [NaN,Infinity,-Infinity]) {
    assert.throws(()=>p.sample(bad),/finite/);assert.throws(()=>p.position(0,bad),/finite/);
    assert.throws(()=>p.facing(0,bad),/finite/);assert.throws(()=>p.contacts(bad),/finite/);
  }
  assert.throws(()=>p.position(999,.5),/outside/);assert.throws(()=>p.facing(999,.5),/outside/);
  assert.throws(()=>p.contacts(.5,[]),/unique finite/);
  const poses=p.sample(4).poses as Pose[];
  assert.throws(()=>p.contacts(.5,[poses[0],poses[0],poses[2],poses[3]]),/unique finite/);
  assert.throws(()=>p.contacts(.5,poses.map((q,i)=>i? q:{...q,yaw:NaN})),/unique finite/);
});

test('arbitrary stable IDs and actor, endpoint, pair and relation iteration order preserve the named motion', () => {
  const ids=[17,80,4,29],order=[2,0,3,1];
  for(const relation of ['partner','neighbor'] as const) {
    const original=compileRevolvingDoor(options(relation)),o=options(relation,ids);
    o.actors=order.map(i=>o.actors[i]);o.pairs=[...o.pairs].reverse();
    o.entry=new Map([...o.entry].reverse());o.exit=new Map([...o.exit].reverse());
    o.relations={...o.relations,partner:new Map([...o.relations.partner].reverse()),neighbor:new Map([...o.relations.neighbor].reverse())};
    const p=compileRevolvingDoor(o);
    for(let beat=0;beat<=8;beat+=.25) for(let index=0;index<4;index++) {
      pointClose(p.position(ids[index],beat/8),original.position(index,beat/8));
      angleClose(p.facing(ids[index],beat/8),original.facing(index,beat/8));
    }
    assert.deepEqual(contactKeys(p.sample(3).contacts.filter(c=>c.kind==='courtesy')),supportOracle(relation,ids));
    const joined=p.sample(3).contacts.find(c=>c.kind==='joined')!;
    assert.deepEqual([joined.a,joined.b].sort((a,b)=>a-b),[ids[1],ids[3]].sort((a,b)=>a-b));
    assert.equal(joined.handA,'right');assert.equal(joined.handB,'right');
    const ctx=context(relation,ids);ctx.ids=order.map(i=>ids[i]);
    const adapted=compileRevolvingDoorFigure(figure(relation),ctx);
    for(let i=0;i<4;i++) {pointClose(adapted.position(ids[i],1),constraint(EXIT[relation][i]).position);assert.deepEqual(contactKeys(adapted.swingPreparation!(ids[i],1)!.contacts),swingOracle(relation,ids));}
  }
});

test('primitive paths, derivatives and directed contact targets are rigid-frame equivariant', () => {
  for(const relation of ['partner','neighbor'] as const) {
    const angle=.72,c=Math.cos(angle),s=Math.sin(angle),origin={x:3.2,z:-2.7};
    const vector=(p:Vec2)=>({x:p.x*c-p.z*s,z:p.x*s+p.z*c});
    const transform=(p:Vec2)=>{const v=vector(p);return{x:v.x+origin.x,z:v.z+origin.z};};
    const o=options(relation),base=compileRevolvingDoor(o);
    const transformMap=(m:ReadonlyMap<number,TurnConstraint>)=>new Map([...m].map(([id,p])=>[id,{position:transform(p.position),yaw:p.yaw-angle,velocity:vector(p.velocity),yawRate:p.yawRate}]));
    const moved=compileRevolvingDoor({...o,entry:transformMap(o.entry),exit:transformMap(o.exit),frame:{origin,across:vector({x:1,z:0})}});
    for(let beat=0;beat<=8;beat+=.125) {
      const a=base.sample(beat),b=moved.sample(beat);
      for(const pose of a.poses) {
        const actual=b.poses.find(p=>p.id===pose.id)!;
        pointClose(actual.position,transform(pose.position));angleClose(actual.yaw,pose.yaw-angle);
        pointClose(actual.velocity,vector(pose.velocity),1e-7);close(actual.yawRate,pose.yawRate,1e-7);
      }
      assert.deepEqual(contactKeys(a.contacts),contactKeys(b.contacts));
      for(const contact of a.contacts) {
        const actual=b.contacts.find(q=>contactKey(q)===contactKey(contact))!;
        pointClose(actual.point,transform(contact.point));close(actual.point.y,contact.point.y);
        close(actual.strength,contact.strength);assert.deepEqual(actual.bodyPoint,contact.bodyPoint);
      }
    }
    close(moved.minimumObservedClearance,base.minimumObservedClearance);
    close(moved.maximumObservedSpeed,base.maximumObservedSpeed,1e-7);
    close(moved.maximumObservedYawRate,base.maximumObservedYawRate,1e-7);
    // The application adapter intentionally uses the engine's across-set world-x
    // convention. Its supported frame invariance here is translation only.
    const ctx=context(relation),plan=compileRevolvingDoorFigure(figure(relation),ctx);
    for(const id of ctx.ids) {ctx.start[id].position.x+=origin.x;ctx.start[id].position.z+=origin.z;}
    const translated=compileRevolvingDoorFigure(figure(relation),ctx);
    for(let t=0;t<=1;t+=.125) for(const id of ctx.ids) {
      const p=plan.position(id,t);pointClose(translated.position(id,t),{x:p.x+origin.x,z:p.z+origin.z});angleClose(translated.facing(id,t,[]),plan.facing(id,t,[]));
    }
  }
});

test('compiled primitive owns frozen actor, relation, endpoint, phase, pair and frame snapshots', () => {
  const o=options(),p=compileRevolvingDoor(o),before=[p.sample(0),p.sample(3),p.sample(6),p.sample(8)];
  (o.actors[0] as Dancer).role='robin';(o.actors as Dancer[]).reverse();
  (o.relations.partner as Map<number,number>).clear();(o.relations.neighbor as Map<number,number>).clear();o.relations.epoch=900;o.bindingEpoch=900;
  o.entry.get(0)!.position.x=100;o.exit.get(1)!.yaw=NaN;(o.entry as Map<number,TurnConstraint>).clear();
  (o.pairs[0] as {carriedId:number}).carriedId=900;(o.pairs as unknown[]).reverse();
  (o.phaseBeats as unknown as number[])[0]=900;o.frame.origin.x=900;o.frame.across.z=900;o.source='Changed source';
  assert.deepEqual([p.sample(0),p.sample(3),p.sample(6),p.sample(8)],before);
  assert.equal(p.source,'Explicit revolving-door contract fixture');assert.equal(p.epoch,7);
  for(const value of [p,p.phaseBeats,p.phaseBoundaries,p.pairs,...p.pairs,p.entry,p.exit,...p.entry.values(),...p.exit.values()]) assert.ok(Object.isFrozen(value));
  for(const value of [...p.entry.values(),...p.exit.values()]) {assert.ok(Object.isFrozen(value.position));assert.ok(Object.isFrozen(value.velocity));}
  assert.equal(typeof (p.entry as any).set,'undefined');assert.equal(typeof (p.exit as any).clear,'undefined');
  assert.throws(()=>Object.defineProperty(p.entry,'get',{value:()=>undefined}));
  assert.throws(()=>((p.phaseBeats as unknown as number[])[0]=12));
  assert.throws(()=>((p.pairs[0] as any).carrierId=12));
  const frame=p.sample(3);frame.poses[0].position.x=900;frame.poses[0].velocity.x=900;frame.contacts[0].point.x=900;frame.contacts[0].bodyPoint!.x=900;frame.contacts.length=0;
  assert.deepEqual(p.sample(3),before[1]);
  const position=p.position(0,.5);position.x=900;assert.notEqual(p.position(0,.5).x,900);
});

test('adapter owns the incoming figure, sparse context, current relations and following swing', () => {
  const f=figure(),ctx=context('partner',[17,80,4,29]),p=compileRevolvingDoorFigure(f,ctx);
  const snapshot=()=>ctx.ids.map(id=>({id,position:p.position(id,.5),yaw:p.facing(id,.5,[]),preparation:p.swingPreparation!(id,1)}));
  const before=snapshot(),ids=[...ctx.ids];
  f.who='neighbor';f.hands='left' as any;(f.phaseBeats as unknown as number[])[0]=999;f.notes='Changed';
  for(const id of ids) {ctx.start[id].position.x=999;ctx.start[id].yaw=NaN;ctx.dancers[id].role='lark';}
  (ctx.relations.partner as Map<number,number>).clear();(ctx.relations.neighbor as Map<number,number>).clear();ctx.relations.epoch=9;ctx.bindingEpoch=9;ctx.next!.who='partner';ctx.next!.beats=4;
  assert.deepEqual(snapshot(),before);ctx.ids.reverse();assert.deepEqual(ids.map(id=>({id,position:p.position(id,.5),yaw:p.facing(id,.5,[]),preparation:p.swingPreparation!(id,1)})),before);
  const preparation=p.swingPreparation!(17,1)!;preparation.contacts[0].point.x=900;preparation.contacts.length=0;
  assert.deepEqual(p.swingPreparation!(17,1),before[0].preparation);assert.ok(Object.isFrozen(p));
});

const rejectedOptions:(readonly [string,(o:RevolvingDoorOptions)=>void,RegExp])[] = [
  ['stale epoch',o=>{o.bindingEpoch=8;},/epoch/],
  ['invalid epoch',o=>{o.relations.epoch=-1;},/epoch/],
  ['nonreciprocal relation',o=>{(o.relations.neighbor as Map<number,number>).set(0,1);},/reciprocal/],
  ['partner/couple mismatch',o=>{o.relations.partner=reciprocal([[0,3],[1,2]]);},/couple/],
  ['same-role relation',o=>{o.relations.neighbor=reciprocal([[0,2],[1,3]]);},/opposite-role/],
  ['duplicate actors',o=>{(o.actors as Dancer[])[3]={...o.actors[0]};},/identit/],
  ['unknown actor',o=>{(o.pairs[0] as any).carrierId=999;},/pairs/],
  ['overlapping pairs',o=>{o.pairs=[o.pairs[0],o.pairs[0]];},/pairs/],
  ['wrong incoming relation',o=>{o.pairs=o.pairs.map(p=>({...p,relationship:'neighbor'}));},/relationship/],
  ['mixed incoming relations',o=>{o.pairs=[o.pairs[0],{carrierId:3,carriedId:0,relationship:'neighbor'}];},/pairs|relationship/],
  ['wrong center role',o=>{o.centerRole='lark' as any;},/explicit/],
  ['wrong central hand',o=>{o.hand='left' as any;},/explicit/],
  ['wrong turn direction',o=>{o.direction='left' as any;},/explicit/],
  ['half central turn',o=>{o.amount=.5 as any;},/explicit/],
  ['late lark drop',o=>{o.dropOffAfter=1 as any;},/explicit/],
  ['joined-hand carriage',o=>{o.approachHold='joined-inside' as any;},/explicit/],
  ['wrong total count',o=>{o.beats=6 as any;},/eight counts/],
  ['same-total unsupported phases',o=>{o.phaseBeats=[1,4,2,1] as any;},/eight counts/],
  ['missing phase',o=>{o.phaseBeats=[1.25,4.5,2.25] as any;},/eight counts/],
  ['nonfinite phase',o=>{o.phaseBeats=[1.25,4.5,NaN,1] as any;},/eight counts/],
  ['non-text source',o=>{o.source={} as any;},/text/],
  ['nonunit frame',o=>{o.frame.across.x=2;},/unit/],
  ['nonfinite frame',o=>{o.frame.origin.z=NaN;},/finite/],
  ['missing entry actor',o=>{(o.entry as Map<number,TurnConstraint>).delete(0);},/exactly/],
  ['missing exit actor',o=>{(o.exit as Map<number,TurnConstraint>).delete(0);},/exactly/],
  ['nonfinite endpoint',o=>{o.exit.get(0)!.position.z=Infinity;},/Finite/],
  ['moving entry',o=>{o.entry.get(0)!.velocity.x=.1;},/stationary/],
  ['turning exit',o=>{o.exit.get(0)!.yawRate=.1;},/stationary/],
  ['wrong entry facing',o=>{o.entry.get(0)!.yaw=0;},/face across/],
  ['wrong entry role order',o=>{for(const p of o.entry.values())p.position.z*=-1;},/lark on the left/],
  ['wrong named lark exit',o=>{const m=o.exit as Map<number,TurnConstraint>,a=m.get(0)!;m.set(0,m.get(2)!);m.set(2,a);},/named larks/],
  ['wrong named robin exit',o=>{const m=o.exit as Map<number,TurnConstraint>,a=m.get(1)!;m.set(1,m.get(3)!);m.set(3,a);},/named larks/],
  ['wrong swing facing',o=>{o.exit.get(0)!.yaw+=Math.PI/3;},/swing frame/],
  ['unreachable clearance budget',o=>{o.minimumClearance=.8;},/clearance/],
  ['unreachable speed budget',o=>{o.maximumSpeed=.1;},/speed/],
  ['unreachable yaw budget',o=>{o.maximumYawRate=.1;},/yaw rate/],
  ['nonpositive budget',o=>{o.maximumSpeed=0;},/positive/],
  ['nonfinite budget',o=>{o.maximumYawRate=Infinity;},/finite/],
];
for(const [name,change,error] of rejectedOptions) test(`revolving door rejects ${name}`,()=>{const o=options();change(o);assert.throws(()=>compileRevolvingDoor(o),error);});

test('adapter rejects missing, stale, contradictory or unconsumed semantics rather than inferring from labels', () => {
  for(const key of ['who','centerRole','hands','direction','amount','dropOffAfter','approachHold','entry','exit','phaseBeats'] as const) {
    const f=figure();delete (f as any)[key];f.label='Partner revolving door, robins right once, drop larks halfway, neighbor swing';
    f.notes='Eight counts, half-shoulder-waist. The title is not an executable contract.';
    assert.throws(()=>compileRevolvingDoorFigure(f,context()),/explicit|eight counts/);
  }
  const badFigures=[{kind:'star'},{beats:6},{who:'all'},{centerRole:'lark'},{hands:'left'},{direction:'left'},{amount:.5},{dropOffAfter:1},{approachHold:'joined-inside'},{entry:'ring'},{exit:'neighbor-swing'},{progression:true},{confidence:'unsupported'},{phaseBeats:[1,4,2,1]},{notation:'unconsumed'},{underRole:'robin'}];
  for(const patch of badFigures) assert.throws(()=>compileRevolvingDoorFigure({...figure(),...patch} as RevolvingDoorFigure,context()),/explicit|eight counts/);
  for(const next of [undefined,{id:'s',kind:'swing',who:'partner',beats:8,label:'Wrong relation'},{id:'b',kind:'balance',who:'neighbor',beats:4,label:'Wrong next action'}] as const) {
    const ctx=context();ctx.next=next as any;assert.throws(()=>compileRevolvingDoorFigure(figure(),ctx),/immediately swing/);
  }
  const stale=context();stale.bindingEpoch=8;assert.throws(()=>compileRevolvingDoorFigure(figure(),stale),/stale/);
  const wrongRelation=context();(wrongRelation.relations.neighbor as Map<number,number>).set(0,1);assert.throws(()=>compileRevolvingDoorFigure(figure(),wrongRelation),/reciprocal/);
  const unlabeled=figure();unlabeled.label='Unrelated title';unlabeled.notes=undefined;
  const a=compileRevolvingDoorFigure(unlabeled,context()),b=compileRevolvingDoorFigure(figure(),context());
  for(let t=0;t<=1;t+=.125) for(let id=0;id<4;id++) {pointClose(a.position(id,t),b.position(id,t));angleClose(a.facing(id,t,[]),b.facing(id,t,[]));}
});

test('explicit per-hand body cue is bound, immutable and vanishes at entry and swing handoff',()=>{
 const plan=compileRevolvingDoorFigure(figure(),context());
 for(const id of[0,1,2,3])for(const t of[0,1])assert.deepEqual(plan.revolvingDoorPreparation(id,t),{route:'half-shoulder-waist-door',leftFree:0,rightFree:0,centralRight:0});
 const release=plan.revolvingDoorPreparation(0,6/8);assert.deepEqual({...release,rightWaistRelease:undefined},{route:'half-shoulder-waist-door',leftFree:0,rightFree:1,centralRight:0,rightWaistRelease:undefined});close(release.rightWaistRelease!.settle,(.25/.9)**2*(3-2*.25/.9));assert.ok(Object.isFrozen(release.rightWaistRelease));
 for(const beat of[0,5.35-1e-7,6.65+1e-7,8])assert.equal(plan.revolvingDoorPreparation(0,beat/8).rightWaistRelease,undefined);
 assert.equal(plan.revolvingDoorPreparation(0,5.35/8).rightWaistRelease!.settle,0);assert.equal(plan.revolvingDoorPreparation(0,5.75/8).rightWaistRelease!.settle,0);close(plan.revolvingDoorPreparation(0,6.65/8).rightWaistRelease!.settle,1);
 for(let i=0;i<=80;i++)assert.equal(plan.revolvingDoorPreparation(1,i/80).rightWaistRelease,undefined);
 assert.deepEqual(plan.revolvingDoorPreparation(1,6/8),{route:'half-shoulder-waist-door',leftFree:1,rightFree:0,centralRight:1});
 assert.ok(Object.isFrozen(plan.revolvingDoorPreparation(1,6/8)));
 assert.throws(()=>plan.revolvingDoorPreparation(999,.5),/outside/);
 for(const t of[-1,1.1,NaN])assert.throws(()=>plan.revolvingDoorPreparation(0,t),/outside/);
 for(const beat of[.9,1.25,5.15,5.45,6.45,6.65,7,8])for(const id of[0,1,2,3]){const a=plan.revolvingDoorPreparation(id,Math.max(0,beat-1e-7)/8),b=plan.revolvingDoorPreparation(id,Math.min(8,beat+1e-7)/8);for(const key of['leftFree','rightFree','centralRight']as const)close(a[key],b[key],1e-5);}
});
test('final half-count contact acquisition has the exact next swing graph and no multiply occupied hand',()=>{
 const ctx=context(),plan=compileRevolvingDoorFigure(figure(),ctx);
 assert.equal(plan.contacts(7.5/8,sampledAdapter(plan,ctx,7.5/8)).length,0);
 for(const beat of[7.500001,7.75,7.999999,8]){const contacts=plan.contacts(beat/8,sampledAdapter(plan,ctx,beat/8));assert.deepEqual(contactKeys(contacts),swingOracle('partner'));const occupied=new Set<string>();for(const c of contacts){for(const[id,hand]of(!c.target||c.target==='hands'?[[c.a,c.handA],[c.b,c.handB]]:[[c.a,c.handA]])){const key=`${id}/${hand}`;assert.ok(!occupied.has(key));occupied.add(key);}if(beat===8)close(c.strength,1);}}
});
