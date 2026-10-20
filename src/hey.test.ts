import test from 'node:test';
import assert from 'node:assert/strict';
import {parseHeyNotation,compileBasicPassEvents,compileHeyTrajectory,solveExplicitHeyExit,type Actor,type HeyTrajectory,type HeyPose} from './hey.ts';
const actors:Actor[]=[{id:'L1',role:'lark',couple:'1'},{id:'R1',role:'robin',couple:'1'},{id:'L2',role:'lark',couple:'2'},{id:'R2',role:'robin',couple:'2'}];
const specs=[
  {source:'(16) Hey (WR;NL;MR;PL;WR;NL;MR)',order:['L2','R2','R1','L1']},
  {source:'(16) Hey (PR;WL;NR;ML;PR;WL;NR;ML)',order:['R1','L1','L2','R2']},
  {source:'(8) Hey 1/2 (WR;NL;MR)',order:['L2','R2','R1','L1']},
  {source:'(8) Hey 1/2 (WR;PL;MR;NL~)',order:['L1','R2','R1','L2']},
];
const make=(i:number)=>compileHeyTrajectory(compileBasicPassEvents(parseHeyNotation(specs[i].source),actors,specs[i].order));
const hypot=(a:{x:number;z:number},b={x:0,z:0})=>Math.hypot(a.x-b.x,a.z-b.z);
const pose=(ps:HeyPose[],id:string)=>ps.find(p=>p.id===id)!;
const deltaAngle=(a:number,b:number)=>Math.abs(Math.atan2(Math.sin(a-b),Math.cos(a-b)));

test('actual source full and half heys preserve exact named events and omit hands',()=>{
  for(let k=0;k<specs.length;k++){
    const t=make(k);
    assert.equal(t.plan.syntax.source,specs[k].source);
    assert.equal(t.gates.length,t.plan.syntax.tokens.length);
    for(const gate of t.gates){
      const frame=t.sample(gate.beat),occupied=new Set<string>();
      assert.deepEqual(frame.contacts,[]);
      for(const [a,b] of gate.pairs){
        assert.ok(!occupied.has(a)&&!occupied.has(b));occupied.add(a);occupied.add(b);
        const A=pose(frame.poses,a),B=pose(frame.poses,b);
        assert.ok(Math.abs(A.position.x-B.position.x)<1e-10,'same longitudinal passing gate');
        assert.ok(Math.abs(hypot(A.position,B.position)-.66)<1e-10,'requested clearance');
        for(const [self,other]of[[A,B],[B,A]]){
          const v=self.velocity,offset={x:other.position.x-self.position.x,z:other.position.z-self.position.z};
          const rightDot=(-v.z*offset.x+v.x*offset.z)/hypot(v);
          assert.ok(gate.shoulder==='right'?rightDot>.659:rightDot<-.659,`${t.plan.syntax.source} ${a}/${b}: wrong shoulder`);
        }
      }
    }
    assert.equal(t.requiresEntryAdapter,true);
    assert.equal(t.requiresPartialExit,k===3);
    if(k===3)assert.equal(t.endOrder,undefined);
    else assert.deepEqual([...t.exit].sort((a,b)=>a.position.x-b.position.x).map(p=>p.id),t.endOrder);
  }
});

test('dense samples have nonzero forward walking, clearance and only scheduled pair crossings',()=>{
  for(let k=0;k<specs.length;k++){
    const t=make(k),ids=actors.map(a=>a.id),previous=new Map<string,number>();let min=Infinity,maxSpeed=0;
    const crossings:Array<{beat:number;pair:string[]}>=[];
    for(let i=0;i<=3200;i++){
      const beat=t.beats*i/3200,ps=t.sample(beat).poses;
      assert.equal(new Set(ps.map(p=>p.id)).size,4);
      for(const p of ps){const speed=hypot(p.velocity);assert.ok(speed>.1);maxSpeed=Math.max(maxSpeed,speed);}
      for(let a=0;a<4;a++)for(let b=a+1;b<4;b++){
        const A=pose(ps,ids[a]),B=pose(ps,ids[b]);min=Math.min(min,hypot(A.position,B.position));
        const dx=A.position.x-B.position.x,key=[ids[a],ids[b]].join('/');
        if(Math.abs(dx)>1e-8){const sign=Math.sign(dx),last=previous.get(key);if(last!==undefined&&last!==sign)crossings.push({beat,pair:[ids[a],ids[b]]});previous.set(key,sign);}
      }
    }
    assert.ok(min>=.65999,`${specs[k].source}: ${min}`);assert.ok(maxSpeed<.8);
    const expected=t.gates.filter(g=>g.completion==='complete').flatMap(g=>g.pairs.map(pair=>({beat:g.beat,pair})));
    assert.equal(crossings.length,expected.length);
    for(const crossing of crossings)assert.ok(expected.some(g=>Math.abs(g.beat-crossing.beat)<t.beats/3200+.00001&&g.pair.every(id=>crossing.pair.includes(id))),'extra or mistimed pair exchange');
  }
});

test('pass-to-pass and outside-loop joints are position, velocity, acceleration and facing continuous',()=>{
  for(let k=0;k<specs.length;k++){
    const t=make(k),nominal=t.gates[0].beat*2;
    for(let b=nominal;b<t.beats;b+=nominal){
      const before=t.sample(b-1e-7).poses,after=t.sample(b+1e-7).poses;
      for(const id of actors.map(a=>a.id)){
        const A=pose(before,id),B=pose(after,id);
        assert.ok(hypot(A.position,B.position)<1e-6);
        assert.ok(hypot(A.velocity,B.velocity)<1e-6);
        assert.ok(hypot(A.acceleration,B.acceleration)<2e-6);
        assert.ok(deltaAngle(A.yaw,B.yaw)<1e-6);
      }
    }
    for(let i=0;i<t.plan.events.length;i++){
      const event=t.plan.events[i];if(event.phase!=='center')continue;
      const start=i*nominal,mid=t.sample(start+nominal*.5).poses;
      for(const id of event.loopers){const p=pose(mid,id);assert.ok(Math.abs(p.position.x)>1.35+.28);assert.ok(Math.abs(p.velocity.x)<1e-8);assert.ok(Math.abs(p.velocity.z)>.1);}
    }
  }
});

test('an eight-event full hey restores positions and tangents rather than adding an implicit exit',()=>{
  const t=make(1);
  for(const start of t.entry){const end=pose(t.exit,start.id);assert.ok(hypot(start.position,end.position)<1e-10);assert.ok(hypot(start.velocity,end.velocity)<1e-10);assert.ok(deltaAngle(start.yaw,end.yaw)<1e-10);}
});

test('rotation, translation, mirror shoulders, tempo and scrubbing preserve semantic identities',()=>{
  const base=make(0),angle=.7,axis={x:Math.cos(angle),z:Math.sin(angle)},origin={x:11,z:-7};
  const rotated=compileHeyTrajectory(base.plan,{axis,origin});
  const mirroredSource=specs[0].source.replace(/R|L/g,s=>s==='R'?'L':'R');
  const mirrored=compileHeyTrajectory(compileBasicPassEvents(parseHeyNotation(mirroredSource),actors,specs[0].order));
  const slower=compileHeyTrajectory(compileBasicPassEvents(parseHeyNotation(specs[0].source.replace('(16)','(24)')),actors,specs[0].order));
  for(const beat of [15.9,0,8.3,3.1,16,1.2,8.3]){
    const ordinary=base.sample(beat),turned=rotated.sample(beat),mirror=mirrored.sample(beat),slow=slower.sample(beat*1.5);
    assert.deepEqual(base.sample(beat),ordinary);
    for(const p of ordinary.poses){
      const q=pose(turned.poses,p.id),m=pose(mirror.poses,p.id),s=pose(slow.poses,p.id);
      assert.ok(hypot(q.position,{x:origin.x+axis.x*p.position.x-axis.z*p.position.z,z:origin.z+axis.z*p.position.x+axis.x*p.position.z})<1e-10);
      assert.ok(hypot(m.position,{x:p.position.x,z:-p.position.z})<1e-10);
      assert.ok(hypot(s.position,p.position)<1e-10);
      assert.ok(hypot(s.velocity,{x:p.velocity.x/1.5,z:p.velocity.z/1.5})<1e-10);
    }
  }
});

test('ambiguous entry, unsupported shoulder changes, future relations and malformed actors are blocked',()=>{
  const t=make(0);
  assert.throws(()=>compileHeyTrajectory(t.plan,{entry:t.entry.map((p,i)=>({...p,position:{x:p.position.x+(i===0?.1:0),z:p.position.z}}))}),/entry adapter/);
  assert.equal(compileHeyTrajectory(t.plan,{entry:t.entry}).requiresEntryAdapter,false);
  assert.throws(()=>compileHeyTrajectory(t.plan,{entry:t.entry.map((p,i)=>({...p,position:{x:i===0?NaN:p.position.x,z:p.position.z}}))}),/entry adapter/);
  assert.throws(()=>compileHeyTrajectory(t.plan,{entry:t.entry.map((p,i)=>({...p,velocity:{x:i===0?NaN:p.velocity.x,z:p.velocity.z}}))}),/entry adapter/);
  assert.throws(()=>compileHeyTrajectory(t.plan,{entry:t.entry.map((p,i)=>({...p,yaw:i===0?p.yaw+.2:p.yaw}))}),/entry adapter/);
  assert.throws(()=>compileHeyTrajectory(t.plan,{axis:{x:2,z:0}}),/unit/);
  assert.throws(()=>compileHeyTrajectory(compileBasicPassEvents(parseHeyNotation('(8) Hey 1/2 (WR;NR;MR)'),actors,specs[0].order)),/opposite side shoulder/);
  assert.throws(()=>compileBasicPassEvents(parseHeyNotation('(8) Hey 1/2 (WR;N2L;MR)'),actors,specs[0].order),/epoch/);
  assert.throws(()=>compileBasicPassEvents(parseHeyNotation(specs[0].source),actors.map(a=>({...a,couple:'same'})),specs[0].order),/two distinct couples/);
  assert.throws(()=>parseHeyNotation('(0) Hey 1/2 (WR;NL;MR)'),/positive/);
});

test('explicit partial exit solver honors all named targets and rejects collisions or identity changes',()=>{
  const from=make(3).exit,beats=.5;
  // This test is a geometric tangent extension, not an invented Hay in the Barn progression.
  const targets=from.map(p=>({id:p.id,position:{x:p.position.x+p.velocity.x*beats,z:p.position.z+p.velocity.z*beats},velocity:p.velocity}));
  const exit=solveExplicitHeyExit(from,{beats,targets});
  for(const p of from){assert.ok(hypot(p.position,pose(exit.sample(0).poses,p.id).position)<1e-10);assert.ok(hypot(p.velocity,pose(exit.sample(0).poses,p.id).velocity)<1e-10);}
  for(const p of targets){const end=pose(exit.sample(beats).poses,p.id);assert.ok(hypot(end.position,p.position)<1e-10);assert.ok(hypot(end.velocity,p.velocity)<1e-10);}
  assert.throws(()=>solveExplicitHeyExit(from,{beats,targets:targets.map(p=>({...p,position:{x:0,z:0}}))}),/clearance|stationary/);
  assert.throws(()=>solveExplicitHeyExit(from,{beats,targets:targets.map((p,i)=>({...p,id:i===0?'unknown':p.id}))}),/identities/);
  assert.throws(()=>solveExplicitHeyExit(from,{beats:1e12,targets}),/64 beats/);
});
