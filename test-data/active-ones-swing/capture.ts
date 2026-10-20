import {writeFileSync} from 'node:fs';
import {actualSourceEntry,measureActiveOnesSwing} from './evidence.ts';
const evidence=[1036,2141].map(id=>{
 const {sourceId,snapshotId,sourceUrl,sourceCounts,sourceFinalText,figure,incoming,plan}=actualSourceEntry(id as 1036|2141);
 return{sourceId,snapshotId,sourceUrl,sourceCounts,sourceFinalText,scope:'One first-cycle minor set extracted from the unchanged complete source; no additional period/body sweep.',figure,currentRank:plan.currentRank,entry:incoming,exit:plan.exitState,activePair:plan.activePair,inactivePair:plan.inactivePair,phaseBeats:plan.phaseBeats,frameSchedule:plan.frameSchedule,orbit:plan.orbit,inactiveConvention:plan.inactiveConvention,exitContract:plan.exitContract,bounds:{minimumRootClearance:plan.minimumClearanceBound,maximumRootSpeed:plan.maximumSpeedBound,maximumYawRate:plan.maximumYawRateBound},observed:measureActiveOnesSwing(plan),gates:[0,1,1.25,2.5625,3.875,5.1875,6.25,6.5,8].map(beat=>({sourceBeat:56+beat,poses:incoming.actors.map(a=>({id:a.id,position:plan.position(a.id,beat/8),yaw:plan.facing(a.id,beat/8,[])})),contacts:plan.contacts(beat/8,[])}))};
});
writeFileSync(new URL('./local-evidence.json',import.meta.url),`${JSON.stringify({schema:'contra-studio/active-ones-swing-local-evidence',version:1,evidence},null,2)}\n`);
console.log(JSON.stringify(evidence.map(({sourceId,observed,bounds})=>({sourceId,observed,bounds}))));
