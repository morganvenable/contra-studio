import test from 'node:test';
import assert from 'node:assert/strict';
import {candidate} from '../test-data/initial-wave/programs.ts';
import {compileInitialWavePolicyDance,validateInitialWavePolicy,type InitialWavePolicy} from './initial-wave-policy.ts';
function dance(){
 const p=candidate(),d=p.dance;
 d.figures[0].entry='long-waves';d.figures[0].exit='long-waves';
 d.figures[1].entry='long-waves';d.figures[1].exit='paired-neighbor-balance';
 d.figures.at(-1)!.exit='next-long-waves';
 d.initialWavePolicy={inwardRole:'robin',neighborHand:'right',halfWidth:.64,rowGap:1.28,waiting:{turnBeats:8,preparationBeats:8},preparations:{second:{kind:'neighbor-balance',preparationBeats:2,pairSpacing:1.18,handAcquisitionBeats:.25},chain:{kind:'receiver-yield',receiverYield:.3}},terminal:{figureId:'hey',exit:'next-long-wave'}};
 return d;
}
test('explicit local policy compiles independently of title and arbitrary figure names',()=>{
 const d=dance(),p=compileInitialWavePolicyDance(d,3);assert.equal(p.totalBeats,64);
 const rename=(id:string)=>`renamed-${id}`,changed=structuredClone(d);changed.title='Independent title';changed.id='unrelated';
 changed.figures.forEach(f=>f.id=rename(f.id));changed.progressionEvents![0].afterFigureId=rename('hey');
 changed.initialWavePolicy!.terminal.figureId=rename('hey');changed.initialWavePolicy!.preparations=Object.fromEntries(Object.entries(changed.initialWavePolicy!.preparations).map(([id,x])=>[rename(id),x]));
 const q=compileInitialWavePolicyDance(changed,3);
 for(const count of[0,8,16,32,48,56,64,127.875]){assert.deepEqual(q.sample(count).poses,p.sample(count).poses);assert.deepEqual(q.sample(count).contacts,p.sample(count).contacts);}
});
test('unused choices and contradictory physical exits reject before execution',()=>{
 const mutations=[(d:any)=>d.initialWavePolicy.preparations.missing={kind:'receiver-yield',receiverYield:.3},(d:any)=>d.figures[1].exit='long-waves',(d:any)=>d.initialWavePolicy.preparations.balance={kind:'receiver-yield',receiverYield:.3},(d:any)=>d.initialWavePolicy.terminal.figureId='chain',(d:any)=>d.figures[2].who='partner'];
 for(const change of mutations){const d=dance();change(d);assert.throws(()=>compileInitialWavePolicyDance(d,2));}
 const p=dance().initialWavePolicy!;for(const change of[(p:any)=>p.extra=true,(p:any)=>p.waiting.extra=true,(p:any)=>p.inwardRole='lark',(p:any)=>p.preparations.chain.receiverYield=.5]){const q=structuredClone(p);change(q);assert.throws(()=>validateInitialWavePolicy(q));}
 const owned=validateInitialWavePolicy(p);(p as InitialWavePolicy).waiting.turnBeats=4 as 8;assert.equal(owned.waiting.turnBeats,8);
});
