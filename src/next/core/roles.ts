/**
 * Canonical dancer names and the one alias table. Larks/robins and 1s/2s are
 * what we store and display. Gendered and other source names are input
 * aliases only: the parser maps them here and never stores them.
 */
import type { Role } from '../../types.ts';

/** Canonical plural group names, stored and displayed. */
export const ROLE_GROUP: Readonly<Record<Role, string>> = { lark: 'larks', robin: 'robins' };

/** Source words -> canonical names. Keys are lowercase. */
export const ALIASES: Readonly<Record<string, string>> = {
  larks: 'larks',
  lark: 'larks',
  gentlespoons: 'larks',
  gentlespoon: 'larks',
  gent: 'larks',
  gents: 'larks',
  men: 'larks',
  robins: 'robins',
  robin: 'robins',
  ladles: 'robins',
  ladle: 'robins',
  lady: 'robins',
  ravenclaws: 'robins',
  ravens: 'robins',
  ladies: 'robins',
  women: 'robins',
  partners: 'partner',
  partner: 'partner',
  neighbors: 'neighbor',
  neighbor: 'neighbor',
  ones: '1s',
  '1s': '1s',
  twos: '2s',
  '2s': '2s',
  shadows: 'shadow',
  shadow: 'shadow',
  prev_neighbors: 'previous-neighbor',
  prev_neighbor: 'previous-neighbor',
  same_roles: 'same-role',
  same_role: 'same-role',
};

/** Canonical name for a source word, or undefined. */
export const canonical = (word: string) => ALIASES[word.toLowerCase()];

/** Role a canonical plural names ("larks" -> "lark"). */
export function roleOfGroup(name: string): Role | undefined {
  return name === 'larks' ? 'lark' : name === 'robins' ? 'robin' : undefined;
}

/** Rewrite role aliases in display text to larks/robins. */
export function canonicalText(text: string): string {
  return text.replace(/\b[A-Za-z]+\b/g, (word) => {
    const c = canonical(word);
    return c === 'larks' || c === 'robins' ? c : word;
  });
}
