#!/usr/bin/env node
// Deliberately narrow: a new or compound declaration needs an explicit review.
import {readFileSync} from 'node:fs';
const lock=JSON.parse(readFileSync(new URL('../package-lock.json',import.meta.url),'utf8'));
const allowed=new Set(['MIT','Apache-2.0','BSD-2-Clause','BSD-3-Clause','ISC','0BSD','CC0-1.0','Unlicense']);
const counts={},rejected=[];
for(const [name,pkg] of Object.entries(lock.packages)){
 if(!name)continue;
 const license=pkg.license??'UNDECLARED';
 counts[license]=(counts[license]??0)+1;
 if(!allowed.has(license))rejected.push({package:name,license});
}
console.log(JSON.stringify({scope:'lockfile declarations; installed notices are separate',licenses:counts,rejected},null,2));
if(rejected.length)process.exitCode=1;
