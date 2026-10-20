/** Public conventional-chain contact/arm repair. Fresh articulated rigs, no GPU.
 * Root/clock hashes were captured before the repair; contacts are reviewed separately. */
import assert from 'node:assert/strict';
import test from 'node:test';
import {Vector3} from 'three';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {prepareContraDbReview} from './source-review.ts';
import {readContraDbImport} from './contradb-import.ts';
import {compileChoreography} from './choreography.ts';
const ROOT_HASHES:Record<string,string>={"24": "f215a0e0d7d0f46e948827b205fbf39352d8f5c45183059e1a6b791fb2e56f25", "94": "20a1ae309ae2568f8f4bb1ddae871145ba943b09e69ba2d1571c8681bb517a26", "175": "ebd39f67c4f1e9c895daa4e5170ca5054260394881a421d4c1b40b9ea7eded4f", "180": "c69e897612c7a1da25031ec07d1014433ad154413e1f0827c7cef8408b6a2b65", "671": "e73ca7df9063e225dbf015fdf386677e4de93049ed5754412c809ac47837d873", "810": "cdb54dd28beaaa0936eb472089ce51bd60e5d58707ec229bd2bb6cb02480d95a", "1697": "536f096c23c652b1c5a9cc4c859d61efa5d338b9985bafe61577d2e38229cb5e", "2259": "b2bd9a2094099959482104781c57422c3f821fa5490f30899fd2aff90594a4c4", "2373": "5982ecd595f4cda0c790aba8c67b78a89685408da2929c3bef66a1b973fe9818", "3004": "ce30fc4429ab684f688506190d84338850eb04eb86c07c2d730aa7d5484fe03e"};
function compileSource(source:string):CompiledDance{const raw=readFileSync(new URL(`../test-data/contradb/${source}.json`,import.meta.url),'utf8'),result=source==='94'?readContraDbImport(raw,{interpretation:{circulation:'cw',rows:{'contradb:94:row:4':{chainReceiver:'partner'},'contradb:94:row:6':{balanceBeats:4}}}}):prepareContraDbReview(raw).result;assert.ok(result.dance,JSON.stringify(result.errors));const before=structuredClone(result.dance),compiled=compileChoreography(result.dance,3);assert.deepEqual(result.dance,before);assert.equal(compiled.totalBeats,64);assert.deepEqual(compiled.starts,compiled.dance.figures.map((_,i)=>compiled.dance.figures.slice(0,i).reduce((n,f)=>n+f.beats,0)));return compiled;}
import {Avatar,applyBodyContactAnchors} from './scene.ts';
import type {CompiledDance,StudioState} from './types.ts';
globalThis.document={createElement:()=>({getContext:()=>new Proxy({},{get:()=>()=>{},set:()=>true})})}as unknown as Document;
function snapshot(c:CompiledDance,beat:number){
 const frame=c.sample(beat),avatars=c.dancers.map(d=>new Avatar(d)),points:Vector3[]=[];
 for(const a of avatars)a.update(frame.poses[a.dancer.id],frame,{dance:c.dance,showLabels:false}as StudioState,c.sample);
 const posed=applyBodyContactAnchors(avatars,frame);let limbError=0,heldError=0;
 for(const a of avatars){a.root.updateMatrixWorld(true);for(const arm of a.arms){const hand=arm.side===1?'left':'right';points.push(arm.elbow.getWorldPosition(new Vector3()));const attr=arm.hand.geometry.attributes.position;for(let i=0;i<attr.count;i++)points.push(new Vector3().fromBufferAttribute(attr,i).applyMatrix4(arm.hand.matrixWorld));for(const limb of[arm.upper,arm.lower])limbError=Math.max(limbError,Math.abs(limb.scale.y*3-.325));const h=posed.contacts.find(h=>h.kind==='courtesy'&&h.strength>=1-1e-10&&((h.a===a.dancer.id&&h.handA===hand)||(h.b===a.dancer.id&&h.handB===hand)));if(h)heldError=Math.max(heldError,arm.hand.getWorldPosition(new Vector3()).distanceTo(new Vector3(h.point.x,h.point.y,h.point.z)));}for(const leg of a.legs)for(const limb of[leg.upper,leg.lower])limbError=Math.max(limbError,Math.abs(limb.scale.y*3-.43));}
 avatars.forEach(a=>a.dispose());assert.ok(limbError<1e-10,`fixed limb ${limbError}`);assert.ok(heldError<1e-9,`fully held courtesy ${heldError}`);return points;
}
const difference=(a:Vector3[],b:Vector3[])=>Math.max(...a.map((v,i)=>v.distanceTo(b[i])));
for(const source of['671','2259','24','1697','810','3004','180','175','2373','94'])test(`${source}: exact roots/counts and fresh whole-hand epsilon joins`,()=>{
 const candidate=compileSource(source),hash=createHash('sha256');
 for(const round of[0,1])for(const[index,figure]of candidate.dance.figures.entries())if(['robins-chain','ladies-chain'].includes(figure.kind)){
  const at=round*candidate.totalBeats+candidate.starts[index];
  for(const q of[0,.1,.11024487605323774,.3990450544252382,.4,.52,.55,.58,.64,.7,.82,.8951783683474774,.9,.92,.98,1]){
   const beat=at+figure.beats*q;if(beat===0)continue;const before=candidate.sample(beat);hash.update(JSON.stringify([before.beat,before.localBeat,before.figureIndex,before.figureProgress,before.repeat,before.poses.map(({chainCourtesyPreparation,...p})=>p)]));
   const fine=difference(snapshot(candidate,beat-1e-8),snapshot(candidate,beat+1e-8));assert.ok(fine<1e-6,`${source} ${beat}: whole-hand/elbow jump ${fine}`);
  }
 }
 assert.equal(hash.digest('hex'),ROOT_HASHES[source],`${source}: pre-repair roots, gait and clock`);
});
test('ring: former fractional pole flick and late-tail whole hands have bounded local speed',()=>{
 const c=compileSource('810');for(const center of[103.6100491,103.912,103.47]){let worst=0;for(let i=-10;i<=10;i++){const beat=center+i*.002,epsilon=1e-5;worst=Math.max(worst,difference(snapshot(c,beat-epsilon),snapshot(c,beat+epsilon))/(2*epsilon));}assert.ok(worst<6,`${center}: ${worst} m/count`);}
});

test('chain contacts retain tiny positive acquisition edges and own their preparation cue',()=>{const c=compileSource('671'),start=c.starts.find((_,i)=>c.dance.figures[i].kind==='robins-chain')!;let tiny=0,full=0;for(let i=0;i<=800;i++){const f=c.sample(start+i/100);for(const h of f.contacts){assert.ok(h.strength>0&&h.strength<=1);if(h.strength<.01)tiny++;if(h.kind==='courtesy'&&h.strength===1)full++;}const occupied=new Set<string>();for(const h of f.contacts)for(const key of[`${h.a}:${h.handA}`,`${h.b}:${h.handB}`]){assert.ok(!occupied.has(key),key);occupied.add(key);}for(const p of f.poses)if(p.chainCourtesyPreparation){const cue=p.chainCourtesyPreparation;assert.equal(cue.route,'conventional-chain-courtesy');assert.equal(c.dancers[cue.leaderId].role,'lark');assert.equal(c.dancers[cue.followerId].role,'robin');assert.ok([cue.leaderId,cue.followerId].includes(p.id));const saved=structuredClone(cue);cue.leaderId=999;assert.deepEqual(c.sample(start+i/100).poses[p.id].chainCourtesyPreparation,saved);}}assert.ok(tiny>0);assert.ok(full>0);assert.ok(c.sample(start+8).poses.every(p=>p.chainCourtesyPreparation===undefined));});
