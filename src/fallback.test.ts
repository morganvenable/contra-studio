import test from 'node:test';
import assert from 'node:assert/strict';
import {fitOverheadBounds,sampleOverheadBounds} from './floor-fit.ts';
import {compileChoreography} from './choreography.ts';
import {DANCES,BUTTER_CANDIDATE} from './catalog.ts';

test('overhead fallback fits long and odd sets with room for labels and the GPU notice',()=>{
  for(const dance of [DANCES[0],BUTTER_CANDIDATE])for(const couples of [2,3,12]){
    const compiled=compileChoreography(dance,couples),bounds=sampleOverheadBounds(compiled);
    for(const [width,height] of [[360,400],[1000,500],[500,800]]){
      const fit=fitOverheadBounds(bounds,width,height);
      for(let beat=0;beat<128;beat+=.5)for(const pose of compiled.sample(beat).poses){
        const x=fit.offsetX+pose.position.x*fit.scale,y=fit.offsetY+pose.position.z*fit.scale;
        assert.ok(x>16&&x<width-16,`${dance.title}, ${couples} couples: horizontal clipping`);
        assert.ok(y>32&&y<height-70,`${dance.title}, ${couples} couples: vertical clipping`);
      }
    }
  }
});
