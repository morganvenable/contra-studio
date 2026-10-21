import test from 'node:test';import assert from 'node:assert/strict';
import {resolveBoxCirculateBinding,type BoxCirculateBindingInput} from './box-circulate-binding.ts';
import {compileBoxCirculate,type WaveConstraint} from './wave-figures.ts';
const pose=(x:number,z:number,yaw:number):WaveConstraint=>({position:{x,z},yaw,velocity:{x:0,z:0},yawRate:0});
function fixture():BoxCirculateBindingInput{return{entry:new Map([[0,pose(-.9,-.45,Math.PI/2)],[1,pose(-.9,.45,-Math.PI/2)],[2,pose(.9,.45,-Math.PI/2)],[3,pose(.9,-.45,Math.PI/2)]]),roles:new Map([[0,'lark'],[1,'robin'],[2,'lark'],[3,'robin']]),crossRole:'lark',loopRole:'robin',frame:{origin:{x:0,z:0},across:{x:1,z:0}},entryWave:{lines:[{order:[0,1],axis:{x:0,z:1}},{order:[3,2],axis:{x:0,z:1}}],hands:[{a:0,b:1,handA:'right',handB:'right'},{a:3,b:2,handA:'right',handB:'right'}]}};}
test('actual station permutation and owned hand graph feed unchanged certified circulate',()=>{
 const f=fixture(),b=resolveBoxCirculateBinding(f);assert.deepEqual(b.mapping,[{id:0,destinationId:3,mode:'cross'},{id:1,destinationId:0,mode:'loop-right'},{id:2,destinationId:1,mode:'cross'},{id:3,destinationId:2,mode:'loop-right'}]);assert.deepEqual(b.exitWave.lines.map(l=>l.order),[[1,2],[0,3]]);assert.deepEqual(b.exitWave.hands,[{a:1,b:2,handA:'right',handB:'right'},{a:0,b:3,handA:'right',handB:'right'}]);
 const p=compileBoxCirculate({actorIds:[...f.entry.keys()],entry:f.entry,entryWave:f.entryWave,...b,beats:4});for(const m of b.mapping){assert.deepEqual(p.position(m.id,1),f.entry.get(m.destinationId)!.position);assert.equal(p.exit.get(m.id)!.yaw,f.entry.get(m.id)!.yaw-(m.mode==='loop-right'?Math.PI:0));}assert.ok(p.minimumObservedClearance>=.6);assert.ok(p.maximumObservedSpeed<=1.25);
});
test('rotation translation actor renumbering line order and role relabeling preserve geometry-derived meaning',()=>{
 const f=fixture(),ids=new Map([[0,91],[1,8],[2,400],[3,25]]),id=(n:number)=>ids.get(n)!,phi=.61,c=Math.cos(phi),s=Math.sin(phi),vector=(p:{x:number;z:number})=>({x:c*p.x-s*p.z,z:s*p.x+c*p.z}),point=(p:{x:number;z:number})=>{const q=vector(p);return{x:q.x+3,z:q.z-7};};
 const transformed:BoxCirculateBindingInput={...f,crossRole:'robin',loopRole:'lark',roles:new Map([...f.roles].map(([k,r])=>[id(k),r==='lark'?'robin':'lark'])),entry:new Map([...f.entry].reverse().map(([k,p])=>[id(k),{...p,position:point(p.position),yaw:p.yaw-phi}])),frame:{origin:point(f.frame.origin),across:vector(f.frame.across)},entryWave:{lines:f.entryWave.lines.slice().reverse().map(l=>({order:l.order.map(id),axis:vector(l.axis)})),hands:f.entryWave.hands.map(h=>({...h,a:id(h.a),b:id(h.b)}))}};
 const b=resolveBoxCirculateBinding(transformed);assert.deepEqual(new Map(b.mapping.map(m=>[m.id,m.destinationId])),new Map([[91,25],[8,91],[400,8],[25,400]]));for(const m of b.mapping)assert.deepEqual(b.exit.get(m.id)!.position,transformed.entry.get(m.destinationId)!.position);compileBoxCirculate({actorIds:[...transformed.entry.keys()],entry:transformed.entry,entryWave:transformed.entryWave,...b,beats:4});
});
test('role and facing contradictions, unknown actors, malformed hands and unsupported stations reject',()=>{
 for(const mutate of[(f:BoxCirculateBindingInput)=>{f.crossRole='robin';f.loopRole='lark';},(f:BoxCirculateBindingInput)=>{(f.roles as Map<number,string>).delete(0);},(f:BoxCirculateBindingInput)=>{f.entry.get(0)!.yaw+=Math.PI;},(f:BoxCirculateBindingInput)=>{f.entry.get(0)!.position.x+=.1;},(f:BoxCirculateBindingInput)=>{f.entry.get(0)!.velocity.x=.1;},(f:BoxCirculateBindingInput)=>{f.entryWave.hands[0].handA='left';},(f:BoxCirculateBindingInput)=>{f.frame.across.x=2;}]){const f=fixture();mutate(f);assert.throws(()=>resolveBoxCirculateBinding(f));}
});

test('left loops consume mirrored actual stations and hands with reflected paths at every count',()=>{
 const right=fixture(),left=fixture();left.loopDirection='left';
 left.entry=new Map([...right.entry].map(([id,p])=>[id,{...p,position:{x:p.position.x,z:-p.position.z},yaw:Math.PI-p.yaw}]));
 left.entryWave={lines:right.entryWave.lines.map(l=>({...l,order:[...l.order].reverse()})),hands:right.entryWave.hands.map(h=>({a:h.b,b:h.a,handA:'left',handB:'left'}))};
 const rb=resolveBoxCirculateBinding(right),lb=resolveBoxCirculateBinding(left);
 assert.deepEqual(lb.mapping.map(m=>[m.id,m.destinationId]),rb.mapping.map(m=>[m.id,m.destinationId]));
 assert.equal(lb.mapping.filter(m=>m.mode==='loop-left').length,2);
 const compile=(f:BoxCirculateBindingInput,b:ReturnType<typeof resolveBoxCirculateBinding>)=>compileBoxCirculate({actorIds:[...f.entry.keys()],entry:f.entry,entryWave:f.entryWave,...b,beats:4});
 const r=compile(right,rb),l=compile(left,lb);
 for(let beat=0;beat<=4;beat+=1/64){const a=r.sample(beat),b=l.sample(beat);for(const p of a.poses){const q=b.poses.find(q=>q.id===p.id)!;assert.ok(Math.abs(q.position.x-p.position.x)<1e-9);assert.ok(Math.abs(q.position.z+p.position.z)<1e-9);assert.ok(Math.abs(Math.atan2(Math.sin(q.yaw+p.yaw-Math.PI),Math.cos(q.yaw+p.yaw-Math.PI)))<1e-9);assert.ok(Math.abs(q.yawRate+p.yawRate)<1e-9);}assert.equal(a.contacts.length,b.contacts.length);}
 assert.ok(l.minimumObservedClearance>=.6);assert.ok(l.maximumObservedSpeed<=1.25);
 assert.throws(()=>resolveBoxCirculateBinding({...left,loopDirection:'right'}));
 assert.throws(()=>resolveBoxCirculateBinding({...right,loopDirection:'left'}));
 assert.throws(()=>resolveBoxCirculateBinding({...left,loopDirection:'clockwise' as 'left'}));
 const mixed=lb.mapping.map(m=>({...m}));mixed.find(m=>m.mode==='loop-left')!.mode='loop-right';
 assert.throws(()=>compileBoxCirculate({actorIds:[...left.entry.keys()],entry:left.entry,entryWave:left.entryWave,...lb,mapping:mixed,beats:4}));
});
