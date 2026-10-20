import test from 'node:test';
import assert from 'node:assert/strict';
import {sampleStudy,FLUENT_TIMING_PROFILE,DEFAULT_TIMING_PROFILE} from './execution-timing-study.ts';
import {sampleSwingTorsoStudy} from './swing-torso-study.ts';
const d=(a:{x:number;z:number;y?:number},b:{x:number;z:number;y?:number})=>Math.hypot(a.x-b.x,a.z-b.z,(a.y??0)-(b.y??0));
test('closed swing connects exact posterior shoulder targets with fixed arm lengths and attached pelvis',()=>{
 for(const profile of [FLUENT_TIMING_PROFILE,DEFAULT_TIMING_PROFILE])for(let beat=7;beat<11;beat+=1/32)for(const twist of [-70,-50,-35,0,35]){
  const sample=sampleStudy(beat,profile),before=structuredClone(sample.poses);
  const result=sampleSwingTorsoStudy(sample.poses,{torsoTwistDegrees:twist,inwardLean:.04});
  assert.deepEqual(sample.poses,before);
  for(let i=0;i<2;i++){
   const torso=result.torsos[i],arm=result.arms[i],partner=result.torsos[1-i];
   assert.deepEqual(torso.pelvisCenter,sample.poses[i].position);
   assert.ok(d(torso.center,torso.pelvisCenter)<=.040000000001);
   assert.ok(Math.abs(torso.torsoYaw-torso.pelvisYaw-twist*Math.PI/180)<1e-12);
   assert.ok(arm.reachable);assert.equal(arm.contactStrength,1);assert.deepEqual(arm.hand,{...(i===0?partner.leftBackShoulder:partner.rightBackShoulder),y:i===0?1.30:1.40});
   const posterior=(arm.target.x-partner.center.x)*Math.sin(partner.torsoYaw)+(arm.target.z-partner.center.z)*Math.cos(partner.torsoYaw);
   assert.ok(posterior<-.07);
   assert.ok(Math.abs(d(arm.shoulder,arm.elbow)-.325)<1e-12);assert.ok(Math.abs(d(arm.elbow,arm.wrist)-.27)<1e-12);
  }
  assert.deepEqual(result,sampleSwingTorsoStudy(sample.poses,{torsoTwistDegrees:twist,inwardLean:.04}));
 }
});
test('unreachable acquisition reports the target and releases contact without stretching the arm',()=>{
 const poses=sampleStudy(0,FLUENT_TIMING_PROFILE).poses.map(p=>({...p,position:{x:p.position.x*2,z:p.position.z*2}})) as ReturnType<typeof sampleStudy>['poses'];
 const result=sampleSwingTorsoStudy(poses,{torsoTwistDegrees:0});
 for(const arm of result.arms.filter(a=>a.kind==='shoulder')){assert.equal(arm.reachable,false);assert.equal(arm.contactStrength,0);assert.ok(d(arm.hand,arm.target)>.1);assert.ok(Math.abs(d(arm.shoulder,arm.elbow)-.325)<1e-12);assert.ok(Math.abs(d(arm.elbow,arm.wrist)-.27)<1e-12);}
});
test('bounded dissociation and contact inputs reject invalid values',()=>{
 const poses=sampleStudy(8,FLUENT_TIMING_PROFILE).poses;
 for(const torsoTwistDegrees of [-71,36,NaN,Infinity])assert.throws(()=>sampleSwingTorsoStudy(poses,{torsoTwistDegrees}));
 for(const inwardLean of [-.1,.09,NaN])assert.throws(()=>sampleSwingTorsoStudy(poses,{torsoTwistDegrees:0,inwardLean}));
 for(const ballroomWeight of [-1,2,NaN])assert.throws(()=>sampleSwingTorsoStudy(poses,{torsoTwistDegrees:0,ballroomWeight}));
 for(const contactStrength of [-1,2,NaN])assert.throws(()=>sampleSwingTorsoStudy(poses,{torsoTwistDegrees:0,contactStrength}));
 assert.equal(sampleSwingTorsoStudy(poses,{torsoTwistDegrees:0,contactStrength:.2}).arms[0].contactStrength,.2);
});
test('inward torso over outward pelvis keeps exact posterior contact with a bounded raised elbow over the torso top',()=>{
 for(const inwardLean of [.04,.06])for(let beat=7;beat<11;beat+=1/32){
  const poses=sampleStudy(beat,FLUENT_TIMING_PROFILE).poses;
  const result=sampleSwingTorsoStudy(poses,{torsoTwistDegrees:-50,inwardLean});
  for(let i=0;i<2;i++){
   const arm=result.arms[i],torso=result.torsos[i];
   assert.equal(arm.reachable,true);assert.equal(arm.comfortable,arm.reachDistance<=.9*(arm.upperLength+arm.lowerLength));assert.ok(arm.bendDegrees>30);
   assert.equal(arm.routeClear,true);assert.ok((arm.elbow.y??0)>=1.05);assert.ok((arm.elbow.y??0)<=1.65);
   const radial={x:poses[i].position.x/.31,z:poses[i].position.z/.31};
   assert.ok(Math.sin(torso.pelvisYaw)*radial.x+Math.cos(torso.pelvisYaw)*radial.z>0);
   assert.ok(Math.sin(torso.torsoYaw)*radial.x+Math.cos(torso.torsoYaw)*radial.z<0);
   assert.deepEqual(arm.hand,{...(i===0?result.torsos[1-i].leftBackShoulder:result.torsos[1-i].rightBackShoulder),y:i===0?1.30:1.40});
  }
 }
});

test('ballroom hold uses asymmetric shoulder arms and opposite joined hands, with fixed segments throughout rotation',()=>{
 for(let beat=7;beat<11;beat+=1/32){
  const result=sampleSwingTorsoStudy(sampleStudy(beat,FLUENT_TIMING_PROFILE).poses,{torsoTwistDegrees:-50,inwardLean:.06});
  assert.deepEqual(result.arms.map(a=>[a.actorId,a.side,a.kind]),[[0,'right','shoulder'],[1,'left','shoulder'],[0,'left','joined'],[1,'right','joined']]);
  assert.deepEqual(result.arms[2].hand,result.arms[3].hand);
  for(const arm of result.arms){
   assert.equal(arm.reachable,true);assert.equal(arm.comfortable,true);assert.equal(arm.routeClear,true);
   assert.ok(arm.bendDegrees>40);
   assert.ok(Math.abs(d(arm.shoulder,arm.elbow)-.325)<1e-12);
   assert.ok(Math.abs(d(arm.elbow,arm.wrist)-.27)<1e-12);
  }
 }
});
test('ballroom frame rotates rigidly with the dancers',()=>{
 const poses=sampleStudy(8,FLUENT_TIMING_PROFILE).poses,angle=.73;
 const rotate=(p:{x:number;z:number;y?:number})=>({...p,x:p.x*Math.cos(angle)+p.z*Math.sin(angle),z:-p.x*Math.sin(angle)+p.z*Math.cos(angle)});
 const original=sampleSwingTorsoStudy(poses,{torsoTwistDegrees:-50,inwardLean:.06});
 const rotated=sampleSwingTorsoStudy(poses.map(p=>({...p,position:rotate(p.position),pelvisYaw:p.pelvisYaw+angle})) as typeof poses,{torsoTwistDegrees:-50,inwardLean:.06});
 for(let i=0;i<4;i++)for(const point of ['shoulder','elbow','wrist','hand','target'] as const)assert.ok(d(rotate(original.arms[i][point]),rotated.arms[i][point])<1e-10);
});


test('balance stays joined with bent arms and carries a joined hand pair through each figure boundary',()=>{
 for(const profile of [FLUENT_TIMING_PROFILE,DEFAULT_TIMING_PROFILE])for(let beat=0;beat<32;beat+=1/32){
  const sample=sampleStudy(beat,profile),weight=sample.phase==='swing'?sample.readiness:sample.phase==='preparation'?1-sample.readiness:0;
  const frame=sampleSwingTorsoStudy(sample.poses,{torsoTwistDegrees:-50*weight,inwardLean:.06*weight,ballroomWeight:weight});
  assert.deepEqual(frame.arms[2].hand,frame.arms[3].hand,`joined hands at ${beat}`);
  if(weight===0)assert.deepEqual(frame.arms[0].hand,frame.arms[1].hand,`balance hands at ${beat}`);
  for(const arm of frame.arms){
   assert.equal(arm.reachable,true,`reach at ${beat}`);assert.equal(arm.comfortable,true,`bend at ${beat}`);
   assert.equal(arm.routeClear,true,`route at ${beat}`);assert.equal(arm.contactStrength,1);assert.ok(Math.abs(d(arm.wrist,arm.hand)-.115)<1e-12);
   assert.ok(arm.bendDegrees>45);assert.ok(Math.abs(d(arm.shoulder,arm.elbow)-.325)<1e-12);assert.ok(Math.abs(d(arm.elbow,arm.wrist)-.27)<1e-12);
  }
 }
});
test('hand targets are continuous across balance, swing, preparation, and cycle boundaries',()=>{
 for(const profile of [FLUENT_TIMING_PROFILE,DEFAULT_TIMING_PROFILE])for(const beat of [4,12,16,20,28,32]){
  const frames=[beat-1e-6,beat+1e-6].map(b=>{const s=sampleStudy(b,profile),w=s.phase==='swing'?s.readiness:s.phase==='preparation'?1-s.readiness:0;return sampleSwingTorsoStudy(s.poses,{torsoTwistDegrees:-50*w,inwardLean:.06*w,ballroomWeight:w});});
  for(let i=0;i<4;i++)assert.ok(d(frames[0].arms[i].hand,frames[1].arms[i].hand)<.00001);
 }
});

test('joined hands angle down and elbows stay under or forward of shoulders',()=>{
 for(const profile of [FLUENT_TIMING_PROFILE,DEFAULT_TIMING_PROFILE])for(let beat=0;beat<16;beat+=1/64){
  const s=sampleStudy(beat,profile),w=s.phase==='swing'?s.readiness:s.phase==='preparation'?1-s.readiness:0;
  const f=sampleSwingTorsoStudy(s.poses,{torsoTwistDegrees:-50*w,inwardLean:.06*w,ballroomWeight:w});
  for(const arm of f.arms.filter(a=>a.kind==='joined'||w===0)){
   const torso=f.torsos.find(t=>t.id===arm.actorId)!;
   assert.equal(arm.hand.y,1.10);assert.ok((arm.elbow.y??0)<1.35);
   const forward=(arm.elbow.x-arm.shoulder.x)*Math.sin(torso.torsoYaw)+(arm.elbow.z-arm.shoulder.z)*Math.cos(torso.torsoYaw);
   assert.ok(forward>=-.015,'elbow must not bend behind the shoulder');
  }
 }
});
test('solid shoulder arms clear each other in the default closed hold',()=>{
 const lerp=(a:any,b:any,t:number)=>({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,z:a.z+(b.z-a.z)*t});
 for(const beat of [7,8,9,10]){
  const f=sampleSwingTorsoStudy(sampleStudy(beat,FLUENT_TIMING_PROFILE).poses,{torsoTwistDegrees:-50,inwardLean:.06}),a=f.arms[0],b=f.arms[1],r=[.043,.034];
  const aa=[[a.shoulder,a.elbow],[a.elbow,a.wrist]],bb=[[b.shoulder,b.elbow],[b.elbow,b.wrist]];
  for(let i=0;i<2;i++)for(let j=0;j<2;j++)for(let x=0;x<=40;x++)for(let y=0;y<=40;y++)assert.ok(d(lerp(aa[i][0],aa[i][1],x/40),lerp(bb[j][0],bb[j][1],y/40))>=r[i]+r[j]);
 }
});

test('supporting and returning elbows share the enclosing side of the ballroom frame',()=>{
 for(const beat of [7,8,9,10]){
  const f=sampleSwingTorsoStudy(sampleStudy(beat,FLUENT_TIMING_PROFILE).poses,{torsoTwistDegrees:-50,inwardLean:.06});
  const center={x:(f.torsos[0].center.x+f.torsos[1].center.x)/2,z:(f.torsos[0].center.z+f.torsos[1].center.z)/2};
  const joined=f.arms[2].hand, length=Math.hypot(joined.x-center.x,joined.z-center.z);
  for(const arm of f.arms.slice(0,2))assert.ok(((arm.elbow.x-center.x)*(center.x-joined.x)+(arm.elbow.z-center.z)*(center.z-joined.z))/length>.06);
  assert.ok(f.arms[0].elbow.y!<f.arms[1].elbow.y!);
 }
});
