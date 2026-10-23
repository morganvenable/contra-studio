import {assertRenderedFrame} from './smoke-render-check.mjs';
// Exercise an explicit reviewed archive in the exact built application's import UI.
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import assert from 'node:assert/strict';
import {chromium,expect} from '@playwright/test';
const args=Object.fromEntries(process.argv.slice(2).map(arg=>{const m=/^--(base|archive|output)=(.+)$/.exec(arg);if(!m)throw Error('Use --base=URL --archive=FILE --output=DIR');return[m[1],m[2]];}));
assert.ok(args.base&&args.archive&&args.output);
const raw=await readFile(resolve(args.archive),'utf8'),out=resolve(args.output);await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,args:['--use-angle=swiftshader','--enable-webgl']});
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[],checks=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(/context lost|WebGL.*error/i.test(m.text()))errors.push(m.text());});
 await page.goto(args.base,{waitUntil:'networkidle'});
 await page.getByRole('button',{name:/Import dance/i}).click();
 await page.locator('#import-text').fill(raw);await page.locator('[data-action="parse-import"]').click();
 await expect(page.locator('[data-action="confirm-import"]')).toBeEnabled({timeout:60000});await page.locator('[data-action="confirm-import"]').click();
 const title=await page.locator('h1').innerText();
 for(const couples of ['3','4']){
  await page.locator('#couples-select').selectOption(couples);
  for(const beat of ['8','16','24','32','40','44','48','54','60','63.5']){
   await page.locator('#beat-slider').fill(beat);await assertRenderedFrame(page,`${couples} couples / ${beat}`);
   if(['44','54','60'].includes(beat))await page.screenshot({path:join(out,`${couples}-couples-${beat}.png`),fullPage:true});
  }
  await page.locator('[data-action="play"]').click();await expect(page.locator('#round-label')).toHaveText('ROUND 02',{timeout:15000});await page.locator('[data-action="play"]').click();
  checks.push({couples:Number(couples),scrubbed:true,reachedRound:2});
 }
 assert.deepEqual(errors,[]);const result={title,archive:args.archive,base:args.base,renderer:'Chromium software WebGL',checks,pageErrors:errors,scope:'import, scrubbing and repeat playback; no hardware GPU, audible or anatomical certification'};
 await writeFile(join(out,'results.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
}finally{await browser.close();}
