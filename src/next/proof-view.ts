/**
 * The studio's single-figure view: `?figure=<move>&params=<json>&case=<id>`
 * (linked from each figure gallery card) compiles that figure from its small
 * starting set, so it can be watched in 3D and commented on with Feedback.
 * Loaded on demand; the cases are only in this chunk and the gallery's.
 */
import CASES from './proof-cases.json';
import { compileProof, findProofCase, type CompiledProof, type ProofCase } from './proof.ts';

const cases = CASES as unknown as ProofCase[];

export function proofFromUrl(search: string): CompiledProof {
  const q = new URLSearchParams(search);
  const move = q.get('figure') ?? '';
  let params: Record<string, unknown> | undefined;
  const raw = q.get('params');
  if (raw) {
    try {
      params = JSON.parse(raw);
    } catch {
      throw new Error('The figure link has unreadable params.');
    }
    if (!params || typeof params !== 'object' || Array.isArray(params))
      throw new Error('The figure link has unreadable params.');
  }
  const found = findProofCase(cases, move, params, q.get('case'));
  if (!found) throw new Error(`No gallery figure named "${move}".`);
  if (found.error) throw new Error(found.error);
  return compileProof(found);
}
