// Side-by-side endpoints of the old engine and the figure-library engine.
// node --experimental-strip-types scripts/compare-engines.mjs [couples] [rounds]
import { READY_LIBRARY } from '../src/ready-library.ts';
import { readContraDbImport } from '../src/contradb-import.ts';
import { compileChoreography } from '../src/choreography.ts';
import { NEXT_DANCES, compileNext } from '../src/next/dance.ts';

const couples = Number(process.argv[2] ?? 4);
const rounds = Number(process.argv[3] ?? 2);
const stored = NEXT_DANCES[0];
const id = stored.source.url.split('/').pop();
const archive = READY_LIBRARY.find((e) => e.id === id).archive;
const old = compileChoreography(readContraDbImport(archive).dance, couples);
const next = compileNext(stored, couples);

const deg = (a) => (a * 180) / Math.PI;
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
const facing = (yaw) => {
  const names = ['+z', '+x', '-z', '-x'];
  const i = Math.round((((-wrap(yaw) * -1) / (Math.PI / 2)) % 4 + 4) % 4) % 4;
  return Math.abs(wrap(yaw) - wrap(i * Math.PI / 2)) < 0.2 ? names[i] : `${deg(wrap(yaw)).toFixed(0)}deg`;
};
const at = (p) => `(${p.position.x.toFixed(2)}, ${p.position.z.toFixed(2)}) ${facing(p.yaw)}`;

console.log(`Debra's Dance (${id}), ${couples} couples, ${rounds} rounds. Endpoints just before each old-engine figure ends.`);
let worst = 0;
for (let r = 0; r < rounds; r++) {
  for (const [i, f] of old.dance.figures.entries()) {
    const end = r * old.totalBeats + old.starts[i] + f.beats - 1e-4;
    const a = old.sample(end);
    const b = next.sample(end);
    const diffs = a.poses.map((p) => {
      const q = b.poses[p.id];
      const d = Math.hypot(p.position.x - q.position.x, p.position.z - q.position.z);
      const y = Math.abs(deg(wrap(p.yaw - q.yaw)));
      return { id: p.id, d, y, old: at(p), next: at(q) };
    });
    const maxD = Math.max(...diffs.map((x) => x.d));
    const maxY = Math.max(...diffs.map((x) => x.y));
    worst = Math.max(worst, maxD);
    const label = `${f.label}`.slice(0, 60);
    console.log(`round ${r + 1} beat ${(end + 1e-4).toFixed(0).padStart(3)} ${label.padEnd(60)} max ${maxD.toFixed(2)} m, ${maxY.toFixed(0)} deg`);
    for (const x of diffs.filter((x) => x.d > 0.15 || x.y > 20)) {
      console.log(`    dancer ${x.id}: old ${x.old} | next ${x.next}`);
    }
  }
}
console.log(`Largest endpoint difference: ${worst.toFixed(2)} m`);
