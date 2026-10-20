// Read-only cold/warm loading benchmark. Run in a fresh Node process for each
// build; absolute timings reflect the host CPU and are not device/GPU claims.
// node --experimental-strip-types scripts/benchmark-ready-latency.mjs [appRoot]
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const root = resolve(process.argv[2] ?? new URL('..', import.meta.url).pathname);
const moduleAt = relative => import(pathToFileURL(resolve(root, relative)).href);
const {READY_LIBRARY} = await moduleAt('src/ready-library.ts');
const {readContraDbImport} = await moduleAt('src/contradb-import.ts');
const {compileChoreography} = await moduleAt('src/choreography.ts');
const {choreographyBounds} = await moduleAt('src/camera-fit.ts');
for (const id of ['3004', '2226', '1461']) {
  const entry = READY_LIBRARY.find(item => item.id === id);
  for (const phase of ['cold', 'warm']) {
    const start = performance.now(), result = readContraDbImport(entry.archive), imported = performance.now();
    if (!result.dance) throw Error(`${id}: ${result.errors.join('; ')}`);
    const program = compileChoreography(result.dance, 6), compiled = performance.now();
    choreographyBounds(program); const bounded = performance.now();
    const frameStart = performance.now();
    for (let i = 0; i < 1000; i++) program.sample((i * .379) % 384);
    const sampled = performance.now();
    console.log(JSON.stringify({id, phase, importValidationMs: imported - start, compileMs: compiled - imported, boundsMs: bounded - compiled, readyMs: bounded - start, sample1000Ms: sampled - frameStart}));
  }
}
