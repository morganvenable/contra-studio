/** Optional release dependency audit. Preload via node --import and set
 * CONTRA_TEST_INPUT_TRACE to an external JSONL path. Only repository fixture and
 * public-asset reads are recorded; test behavior and file contents are untouched. */
import fs from 'node:fs';
import {syncBuiltinESMExports} from 'node:module';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const output=process.env.CONTRA_TEST_INPUT_TRACE;
if(output){
 const root=path.resolve(fileURLToPath(new URL('..',import.meta.url))),append=fs.appendFileSync,seen=new Set();
 const record=input=>{try{const file=path.resolve(input instanceof URL?fileURLToPath(input):Buffer.isBuffer(input)?input.toString():typeof input==='string'?input:'');const relative=path.relative(root,file);if(!/^(test-data|public)\//.test(relative)||seen.has(relative))return;seen.add(relative);append(output,JSON.stringify({pid:process.pid,path:relative})+'\n');}catch{/* Tracing must not change the result of the real read. */}};
 const readFileSync=fs.readFileSync;fs.readFileSync=function(input,...args){const result=Reflect.apply(readFileSync,this,[input,...args]);record(input);return result;};
 const readFile=fs.readFile;fs.readFile=function(input,...args){const callback=args.pop();return Reflect.apply(readFile,this,[input,...args,function(error,...values){if(!error)record(input);return Reflect.apply(callback,this,[error,...values]);}]);};
 const readPromise=fs.promises.readFile;fs.promises.readFile=async function(input,...args){const result=await Reflect.apply(readPromise,this,[input,...args]);record(input);return result;};
 syncBuiltinESMExports();
}
