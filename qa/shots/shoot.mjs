// node qa/shots/shoot.mjs <out-dir> <name>|<case>|<beat>|<focus>|<view> ...
import {mkdirSync} from 'node:fs';import {createServer} from 'vite';import {chromium} from '@playwright/test';
const [out,...shots]=process.argv.slice(2);mkdirSync(out,{recursive:true});
const server=await createServer({root:process.cwd(),server:{host:'127.0.0.1',port:0},logLevel:'error'});await server.listen();const base=server.resolvedUrls.local[0];
const browser=await chromium.launch({headless:true,args:['--use-angle=swiftshader','--enable-webgl']});
try{for(const s of shots){const [name,id,beat,focus,view]=s.split('|');const page=await browser.newPage({viewport:{width:640,height:520}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(`${base}qa/shots/index.html?case=${encodeURIComponent(id)}&beat=${beat}&focus=${focus??''}&view=${view??'front'}`);await page.waitForFunction(()=>window.done===true,null,{timeout:120000});
 await page.locator('canvas').screenshot({path:`${out}/${name}.png`});if(errors.length)throw new Error(errors.join(';'));console.log('saved',name);await page.close();}}
finally{await browser.close();await server.close();}
