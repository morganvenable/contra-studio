import test from'node:test';import assert from'node:assert/strict';import{Vector3}from'three';
import{reviewedCrossTrails}from'../test-data/cross-trails/source-fixture.ts';import{compileChoreography}from'./choreography.ts';import{Avatar,applyBodyContactAnchors}from'./scene.ts';import{probeArmJoins}from'../test-data/ring-pass/free-arm-probe.ts';import{probeCrossTrailsTransitions}from'../test-data/cross-trails/mesh-probe.ts';import type{StudioState}from'./types.ts';
const dom=()=>{globalThis.document={createElement:()=>({getContext:()=>new Proxy({},{get:()=>()=>{},set:()=>true})})}as unknown as Document;};

test('actual2964 Avatar has fixed adult limbs, one musical landing per count, zero reach correction and reachable held wrists',t=>{
 dom();const{dance}=reviewedCrossTrails(),residuals:Record<string,number>={};let wrist=0,balanceWrist=0;
 for(const count of[3,6]){
  const c=compileChoreography(dance,count),avatars=c.dancers.map(d=>new Avatar(d)),state={dance,showLabels:false}as StudioState;
  const update=(beat:number)=>{const frame=c.sample(beat);for(const a of avatars){const p=frame.poses[a.dancer.id];a.update(p,frame,state,c.sample);const gait=a.root.userData.gait;assert.equal(gait.phase,beat);assert.equal(gait.steps,dance.figures[frame.figureIndex].beats);assert.equal(gait.maxRate,1);residuals[p.activity]=Math.max(residuals[p.activity]??0,gait.maxClampDistance);assert.equal(gait.maxClampDistance,0,`Actual reach ${count}/${beat}/${p.id}/${p.activity}`);for(const leg of a.legs){assert.ok(Math.abs(leg.upper.scale.y*3-.43)<1e-7);assert.ok(Math.abs(leg.lower.scale.y*3-.43)<1e-7);}for(const arm of a.arms){assert.ok(Math.abs(arm.upper.scale.y*3-.325)<1e-7);assert.ok(Math.abs(arm.lower.scale.y*3-.325)<1e-7);}}
   const posed=applyBodyContactAnchors(avatars,frame);avatars.forEach(a=>a.root.updateMatrixWorld(true));for(const h of posed.contacts)if(h.strength>1-1e-10)for(const[id,hand]of[[h.a,h.handA],...(!h.target||h.target==='hands'?[[h.b,h.handB]]:[])]as[number,'left'|'right'][]){const a=avatars[id],arm=a.arms.find(p=>(p.side===1?'left':'right')===hand)!,error=arm.hand.getWorldPosition(new Vector3()).distanceTo(new Vector3(h.point.x,h.point.y,h.point.z));if(frame.poses[id].activity==='balance')balanceWrist=Math.max(balanceWrist,error);else wrist=Math.max(wrist,error);}return frame;
  };
  for(let tick=0;tick<=128*40;tick++)update(tick/40);
  for(let repeat=0;repeat<count*2;repeat++)for(let local=56;local<=64;local++){const beat=repeat*64+local;update(beat-.5);const air=avatars.map(a=>a.legs.find(l=>l.side===(beat%2?1:-1))!.foot.position.y),frame=update(beat);for(const a of avatars){const id=a.dancer.id;if(frame.poses[id].activity==='waiting'&&frame.poses[id].stride===0)continue;assert.ok(air[id]>.055+1e-5,`airborne ${count}/${beat}/${id}`);assert.ok(Math.abs(a.legs.find(l=>l.side===(beat%2?1:-1))!.foot.position.y-.055)<1e-8,`landing ${count}/${beat}/${id}`);}if(local<64)assert.equal(frame.contacts.length,0,'Cross trails has no invented hand contacts');}
  avatars.forEach(a=>a.dispose());const joins=probeArmJoins(c,Array.from({length:count*2},(_,r)=>[r*64+56,r*64+60,r*64+64]).flat());assert.ok(joins.maximum<1e-5,JSON.stringify(joins));
 }
 assert.ok(wrist<1e-7);assert.ok(balanceWrist<.0042);t.diagnostic(JSON.stringify({residuals,wrist,balanceWrist}));
});

test('actual2964 cross trails and contact-free chain/circle/end boundaries clear other Avatar bodies with a2.1-unit broadphase',t=>{
 dom();const{dance}=reviewedCrossTrails();
 for(const count of[2,3,6]){const c=compileChoreography(dance,count),rounds=count===3?6:count===2?4:2,beats=Array.from({length:rounds},(_,r)=>r).flatMap(r=>Array.from({length:9.5*40+1},(_,i)=>r*64+55.5+i/40)),result=probeCrossTrailsTransitions(c,beats);t.diagnostic(JSON.stringify({count,rounds,...result}));assert.ok(result.minimum>=0,JSON.stringify({count,...result}));assert.ok(result.minimumSelfForearmTorso>=-.021,'Inherited free-hand/shirt residual is separately bounded');}
});

test('the incoming courtesy-chain arm/torso/head geometry is unchanged when the new following figure is omitted',t=>{
 dom();const{dance}=reviewedCrossTrails(),prefix=structuredClone(dance);prefix.figures.pop();
 const compiled=[compileChoreography(dance,2),compileChoreography(prefix,2)],avatars=compiled.map(c=>c.dancers.map(d=>new Avatar(d)));let armMatrixDifference=0,torsoMatrixDifference=0;
 for(let i=0;i<=80;i++){const beat=54.5+i/80,frames=compiled.map(c=>c.sample(beat));assert.deepEqual(frames[0].contacts,frames[1].contacts);
  for(let k=0;k<2;k++){const c=compiled[k],frame=frames[k];for(const a of avatars[k])a.update(frame.poses[a.dancer.id],frame,{dance:c.dance,showLabels:false}as StudioState,c.sample);applyBodyContactAnchors(avatars[k],frame);avatars[k].forEach(a=>a.root.updateMatrixWorld(true));}
  for(let id=0;id<4;id++){assert.deepEqual(frames[0].poses[id].position,frames[1].poses[id].position);assert.equal(frames[0].poses[id].yaw,frames[1].poses[id].yaw);const a=avatars[0][id],b=avatars[1][id],matrixDifference=(A:any,B:any)=>Math.max(...A.matrixWorld.elements.map((v:number,i:number)=>Math.abs(v-B.matrixWorld.elements[i])));torsoMatrixDifference=Math.max(torsoMatrixDifference,matrixDifference(a.body,b.body));for(let n=0;n<a.arms.length;n++)for(const key of['upper','lower','hand','elbow']as const)armMatrixDifference=Math.max(armMatrixDifference,matrixDifference(a.arms[n][key],b.arms[n][key]));}
 }
 avatars.flat().forEach(a=>a.dispose());assert.ok(armMatrixDifference<1e-7);assert.ok(torsoMatrixDifference<1e-7);t.diagnostic(JSON.stringify({armMatrixDifference,torsoMatrixDifference}));
 // Future-foot samples differ when the prefix is truncated at56. The separate
 // parity probe reports that expected leg lookahead difference explicitly; it
 // must not be misrepresented as an unchanged whole-body matrix certificate.
});
