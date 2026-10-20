import {readFile} from 'node:fs/promises';
import path from 'node:path';

// A public checkout can package a Worker without an owner's hosting identity.
// Only a missing file is optional; unreadable or invalid configuration still fails.
export async function readWorkerHostingManifest(root) {
 let raw;
 try { raw=await readFile(path.join(root,'.openai/hosting.json'),'utf8'); }
 catch(error) { if(error.code==='ENOENT')return undefined;throw error; }
 const manifest=JSON.parse(raw);
 if(manifest.static)throw new Error('Remove static from source manifest for Worker migration.');
 return manifest;
}
