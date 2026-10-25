/** Dancer identities: same ids, names and colors as src/engine.ts createDancers. */
import type { Dancer } from '../../types.ts';

export function createDancers(couples: number): Dancer[] {
  return Array.from({ length: couples * 2 }, (_, id) => {
    const couple = Math.floor(id / 2);
    const robin = id % 2 === 1;
    return {
      id,
      name: `${robin ? 'Robin' : 'Lark'} ${couple + 1}`,
      role: robin ? 'robin' : 'lark',
      couple,
      direction: couple % 2 ? -1 : 1,
      color: robin ? '#cb815a' : '#438b86',
    } satisfies Dancer;
  });
}
