import {assertRenderedFrame} from './smoke-render-check.mjs';
// Reusable release smoke: verify actual card load before scrubbing and a reached repeat.
// node scripts/smoke-ready-batch.mjs --base=http://127.0.0.1:4195/ --ids=823,3478 --output=research/contradb/smoke-144
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import assert from 'node:assert/strict';
import {chromium,expect} from '@playwright/test';
import {READY_LIBRARY} from '../src/ready-library.ts';
const args=Object.fromEntries(process.argv.slice(2).map(arg=>{const m=/^--(base|ids|output)=(.+)$/.exec(arg);if(!m)throw Error('Expected --base=URL --ids=ID,ID --output=DIR');return [m[1],m[2]];}));
if(!args.base||!args.ids||!args.output)throw Error('Expected --base=URL --ids=ID,ID --output=DIR');
const base=new URL(args.base);assert.ok(['http:','https:'].includes(base.protocol));
const ids=args.ids.split(',');assert.ok(ids.every(id=>/^[1-9]\d*$/.test(id)));assert.equal(new Set(ids).size,ids.length);
const entries=ids.map(id=>{const entry=READY_LIBRARY.find(e=>e.id===id);assert.ok(entry,`Not Ready: ${id}`);return entry;});
const output=resolve(args.output);await mkdir(output,{recursive:true});
const browser=await chromium.launch({headless:true,args:['--use-angle=swiftshader','--enable-webgl']}),results=[];
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(/context lost|WebGL.*error/i.test(m.text()))errors.push(m.text());});
 await page.goto(base.href,{waitUntil:'networkidle'});
 for(const entry of entries){
  await page.getByRole('button',{name:/Dance library/}).click();
  await page.locator(`[data-open-reviewed="${entry.id}"]`).click();
  await expect(page.getByRole('heading',{name:entry.title,exact:true})).toBeVisible({timeout:60000});
  await expect(page.locator('#round-label')).toHaveText('ROUND 01');
  for(const beat of ['0','8','24','38','44','54','63.5']){await page.locator('#beat-slider').fill(beat);await assertRenderedFrame(page,`${entry.id} / ${beat}`);}
  await page.locator('[data-action="play"]').click();
  await expect(page.locator('#round-label')).toHaveText('ROUND 02',{timeout:15000});
  await page.locator('[data-action="play"]').click();
  await assertRenderedFrame(page,`${entry.id} repeat`);
  await page.screenshot({path:join(output,`${entry.id}-repeat.png`),fullPage:true});
  assert.deepEqual(errors,[]);
  const result={id:entry.id,title:entry.title,loaded:true,scrubbed:true,reachedRound:2,pageErrors:[]};results.push(result);console.log(JSON.stringify(result));
 }
 await writeFile(join(output,'results.json'),JSON.stringify({base:base.href,renderer:'Chromium software WebGL',scope:'card load, selected counts and reached second repeat; no anatomical or audible validation',results},null,2)+'\n');
}finally{await browser.close();}
