/** Canonical parser spelling only. The retained source row is never rewritten;
 * all accepted variants explicitly name the pair and facing down. */
export function normalizePairedHallExit(text:string):string {
 const m=text.match(/^((?:partners?|neighbors?) (?:balance & |long )?swing)(?:, | and | )(?:end|finish)(?: facing down(?: the hall)?| in a line of (?:four|4) facing down(?: the hall)?)$/i);
 return m?`${m[1]} end facing down the hall`:text;
}
