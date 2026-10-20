import type {ImportResult} from './parser.ts';
/** Per-UI, per-build memoization of exact stored archive bytes. Storage is still
 * reread and reconciled on every write. Changed bytes always revalidate; a fresh
 * UI starts a fresh cache, so new motion registrations never inherit old checks.
 * Copies keep callers from mutating a previously validated cached result. */
export function createStoredInterpretationReader(parse:(raw:string)=>ImportResult,limit=100):(raw:string)=>ImportResult {
 if(!Number.isSafeInteger(limit)||limit<1||limit>1000)throw new Error('Stored interpretation cache requires a positive bounded size.');
 const cache=new Map<string,ImportResult>();
 return raw=>{
  const hit=cache.get(raw);
  if(hit){cache.delete(raw);cache.set(raw,hit);return structuredClone(hit);}
  const result=parse(raw);
  cache.set(raw,structuredClone(result));
  while(cache.size>limit)cache.delete(cache.keys().next().value!);
  return result;
 };
}
