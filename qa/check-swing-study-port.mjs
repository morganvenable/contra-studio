// External audit: requires the matching archived sibling frozen-source tree.
// The standalone app regression is src/swing-study.test.ts. See docs/shared-swing-study.md.
import fs from 'node:fs';import assert from 'node:assert/strict';import crypto from 'node:crypto';
import {Avatar,applyBodyContactAnchors} from '../src/scene.ts';
import {ReciprocalPoseAdapter} from '../src/swing-study-pose.mjs';
import {actualStudyContacts} from '../src/swing-presentation.ts';
import {compileChoreography} from '../src/choreography.ts';
import {BUTTER_CANDIDATE} from '../src/catalog.ts';
import {prepareContraDbReview} from '../src/source-review.ts';
import {REGISTERED_MOTION_CAPABILITIES as caps} from '../src/capabilities.ts';
import {canonicalDanceText,sha256} from '../src/swing-study-hash.ts';
import {RECIPROCAL_REVIEWED_BINDINGS,RECIPROCAL_ALGORITHM_SHA256} from '../src/swing-study-inputs.ts';
import {copyAvatarCosmetics} from './copy-avatar-cosmetics.mjs';
import {SwingCandidate as Reference} from '../../qa/body/shared-swing-v2/frozen-source/qa/body/shared-swing-v2/candidate-continuous-hand-route.mjs';
globalThis.document={createElement:()=>({getContext:()=>new Proxy({},{get:()=>()=>{},set:()=>true})})};
const imported=id=>prepareContraDbReview(fs.readFileSync(new URL(`../test-data/contradb/${id}.json`,import.meta.url),'utf8'),[],caps).result.dance;
const cases=[['circle',BUTTER_CANDIDATE,6,17],['balance',BUTTER_CANDIDATE,50,65],['gyre',imported(57),18,33],['hey',imported(2418),38,49],['quarter',imported(2604),22,33]];
const frozenFile=new URL('../../qa/body/shared-swing-v2/frozen-source/qa/body/shared-swing-v2/candidate-continuous-hand-route.mjs',import.meta.url);
assert.equal(crypto.createHash('sha256').update(fs.readFileSync(frozenFile)).digest('hex'),RECIPROCAL_ALGORITHM_SHA256);
const hashFile=file=>crypto.createHash('sha256').update(fs.readFileSync(new URL(file,import.meta.url))).digest('hex');
// The archived motion algorithm and Avatar update stay frozen. Give its rigs
// only the current identity-bound cosmetic meshes before comparing every matrix.
// No articulated object, anchor, pose, gait, or contact calculation is replaced.
function matchCurrentAppearance(reference){
 const current=new Avatar(reference.dancer);copyAvatarCosmetics(reference,current);
 current.dispose();
}
const out={candidateSha256:RECIPROCAL_ALGORITHM_SHA256,appearanceComparison:'Current identity-bound torso, hips and optional hair meshes on the unchanged archived motion rigs; exact full-matrix comparison retained.',portFiles:Object.fromEntries(['swing-study-pose.mjs','swing-study-kernel.mjs','swing-study-inputs.ts','swing-presentation.ts','scene.ts','dancer-appearance.ts'].map(f=>[f,hashFile(`../src/${f}`)])),browserGpuVerified:false,cases:[]};
const matrices=avatars=>avatars.flatMap(a=>{a.root.updateMatrixWorld(true);const m=[];a.root.traverse(o=>m.push(...o.matrixWorld.elements));return m;});
for(const[name,dance,start,end]of cases)for(const footwork of['buzz','walk']){
 assert(RECIPROCAL_REVIEWED_BINDINGS.some(b=>b.canonicalDanceSha256===sha256(canonicalDanceText(dance))),`${name} source hash`);
 const c=compileChoreography(dance,6,caps),ref=new Reference(c,{footwork}),avatars=c.dancers.map(d=>new Avatar(d)),port=new ReciprocalPoseAdapter(c,avatars,{createAvatar:d=>new Avatar(d),applyBodyContactAnchors},{footwork});
 for(const avatar of [...ref.avatars,...ref.reference])matchCurrentAppearance(avatar);
 const state={dance,showLabels:false,selectedDancer:-1};let maxMatrixDifference=0,contactFrames=0,acquisitionFrames=0;
 const times=Array.from({length:81},(_,i)=>start+(end-start)*i/80);if(name==='balance')times.push(51.766891941070206,51.766891941070305,51.55851897671791,62.5495281330322);
 for(const beat of times){
   const source=c.sample(beat),before=JSON.stringify(source);
   for(const avatar of avatars){avatar.head.rotation.set(0,0,0);avatar.update(source.poses[avatar.dancer.id],source,state,t=>c.sample(t));avatar.root.updateMatrixWorld(true);}
   applyBodyContactAnchors(avatars,source);
   const roots=avatars.map(a=>a.root.matrixWorld.elements.slice());
   const A=ref.pose(beat),B=port.apply(source),x=matrices(A.avatars),y=matrices(B.avatars);
   assert.equal(x.length,y.length,`${name}/${footwork}/${beat} complete appearance hierarchy`);
   const difference=Math.max(...x.map((v,i)=>Math.abs(v-y[i])));maxMatrixDifference=Math.max(maxMatrixDifference,difference);assert(difference<1e-12,`${name}/${footwork}/${beat} matrices ${difference}`);
   assert.equal(JSON.stringify(source),before);assert.equal(B.frame,source);
   for(const[i,a]of avatars.entries())assert.deepEqual(a.root.matrixWorld.elements,roots[i]);
   const contactState=actualStudyContacts(B.diagnostics);if(contactState.posedSwingContacts.length)contactFrames++;
   for(const acquisition of contactState.acquisitions){if(acquisition.armRouteProgress<1){acquisitionFrames++;assert(acquisition.edges.every(e=>e.state==='traveling'));assert(!contactState.posedSwingContacts.some(p=>p.kind==='blade-palm'?acquisition.pair.includes(p.giver.dancerId):acquisition.pair.includes(p.a.dancerId)));}}
 }
 out.cases.push({name,footwork,samples:times.length,maxMatrixDifference,contactFrames,acquisitionFrames});ref.dispose();port.dispose();avatars.forEach(a=>a.dispose());console.log(out.cases.at(-1));
}
fs.writeFileSync(new URL('./swing-study-port-results.json',import.meta.url),JSON.stringify(out,null,2)+'\n');console.log('PASS: 818 poses; frozen geometry matrices, immutable frames/roots, truthful contacts.');
