#!/usr/bin/env node
// Deliberately narrow: a new or compound declaration needs an explicit review.
// 'MIT OR Apache-2.0' was reviewed for the feedback Worker's wrangler tooling.
import {existsSync,readFileSync} from 'node:fs';
const lockfiles=['../package-lock.json','../worker/feedback/package-lock.json'].map(path=>new URL(path,import.meta.url)).filter(url=>existsSync(url));
const allowed=new Set(['MIT','Apache-2.0','BSD-2-Clause','BSD-3-Clause','ISC','0BSD','CC0-1.0','Unlicense','MIT OR Apache-2.0']);
const counts={},rejected=[];
for(const url of lockfiles){
 const lock=JSON.parse(readFileSync(url,'utf8'));
 for(const [name,pkg] of Object.entries(lock.packages)){
  // A link's target has its own entry, which is checked instead.
  if(!name||pkg.link)continue;
  const license=pkg.license??'UNDECLARED';
  counts[license]=(counts[license]??0)+1;
  if(!allowed.has(license))rejected.push({lockfile:url.pathname.split('/').slice(-3).join('/'),package:name,license});
 }
}
console.log(JSON.stringify({scope:'lockfile declarations; installed notices are separate',lockfiles:lockfiles.length,licenses:counts,rejected},null,2));
if(rejected.length)process.exitCode=1;
