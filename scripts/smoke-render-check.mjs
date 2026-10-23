import assert from 'node:assert/strict';
/** Wait for the scene update and a submitted frame before judging a screenshot. */
export async function assertRenderedFrame(page,label){
 await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
 const state=await page.locator('canvas').first().evaluate(canvas=>{const gl=canvas.getContext('webgl2')??canvas.getContext('webgl');return {width:canvas.width,height:canvas.height,lost:gl?.isContextLost()??true};});
 assert.ok(state.width>0&&state.height>0&&!state.lost,'Live WebGL context required: '+label);
}
