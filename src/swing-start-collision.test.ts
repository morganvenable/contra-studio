import test from 'node:test';
import assert from 'node:assert/strict';
import {probeSwingStartMesh} from '../test-data/swing-start/mesh-probe.ts';
import {probeSwingStartTemporal} from '../test-data/swing-start/temporal-probe.ts';

test('actual881 current-neighbor passage and next-neighbor acquisition keep unrelated meshes clear and bound the disclosed support-frame limits',t=>{
 const rows=probeSwingStartMesh();
 for(const row of rows){
  for(const key of['minLegMesh','minNoncontactArmMesh','minUnassociatedTorso','minArmHead','minExactArmHead'])assert.ok(row[key].value>0,JSON.stringify({count:row.n,phase:row.phase,key,result:row[key]}));
  assert.ok(row.minSelfForearmTorso.value>=-.020,JSON.stringify(row));
  assert.ok(row.minUpcomingSupportArmMesh.value>=-.022,JSON.stringify(row));
  if(row.phase==='pass')assert.ok(row.minArmTorso.value>0,JSON.stringify(row));
  else {const baseline=rows.find(r=>r.n===row.n&&r.phase==='swing')!;assert.ok(row.minArmTorso.value>=-.138,JSON.stringify(row));assert.ok(row.minArmTorso.value>=baseline.minArmTorso.value-.0131,JSON.stringify(row));}
 }
 t.diagnostic(JSON.stringify(rows));
});

test('the brisk final-count articulated acquisition converges under400,800 and1600samples per count without a numerical arm jump',t=>{
 const rows=probeSwingStartTemporal();
 for(const row of rows)assert.ok(row.maximum<4,JSON.stringify(row));
 for(const count of[3,6]){const samples=rows.filter(r=>r.count===count);assert.equal(samples.length,3);assert.ok(Math.max(...samples.map(r=>r.maximum))-Math.min(...samples.map(r=>r.maximum))<.01,JSON.stringify(samples));}
 t.diagnostic(JSON.stringify(rows));
});
