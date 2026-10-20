import type { Dance } from './types';
import type { SourceRecord } from './parser';
import { BUTTER_SOURCE_TEXT } from './butter-source.ts';

export const DEMO_TEXT = `The Baby Rose
by David Kaynor
Formation: Duple Minor - Improper
Progression: Single
Source: https://www.ibiblio.org/contradance/thecallersbox/dance.php?id=10273
A1
(4) Neighbor balance
(12) Neighbor swing
A2
(8) Circle left 3/4
(8) Partner do-si-do
B1
(4) Partner balance
(12) Partner swing
B2
(8) Robins chain to neighbor
(8) Star left 1`;

/** Source-checked Becket example; complete schematic embodied review passed 2026-10-18. */
export const BUTTER_CANDIDATE: Dance & { sourceText:string;sourceRecord:SourceRecord } = {
  id: 'butter', title: 'Butter', author: 'Gene Hubert', formation: 'becket', circulation: 'cw',
  sourceUrl: 'https://www.ibiblio.org/contradance/thecallersbox/dance.php?id=10320',
  sourceText: BUTTER_SOURCE_TEXT,
  sourceRecord: { format:'callers-box-json', original:BUTTER_SOURCE_TEXT, fields:JSON.parse(BUTTER_SOURCE_TEXT), title:'Butter', author:'Gene Hubert', formation:'Duple Minor - Becket', progression:'Single', permission:'full', status:'', sourceUrl:'https://www.ibiblio.org/contradance/thecallersbox/dance.php?id=10320', phraseStructure:'4*8*2' },
  description: 'Clockwise Becket progression with an explicitly ordered full hey.', verified: true,
  notes: ['Choreography checked against Caller’s Box #10320. Original role words are retained in the source.', 'The opening shift establishes new neighbors at beat2. End couples cross the same end to reenter the other stream.', 'The seven source hey events are retained. Its entrance, pass timing, exit paths, and compact passing posture are modeled interpretations.'],
  figures: [
    { id: 'but-a1-sh', kind: 'becket-shift', beats: 2, label: 'Shift left', direction: 'left' },
    { id: 'but-a1-c', kind: 'circle', beats: 6, label: 'Circle left ¾', who: 'all', direction: 'left', amount: .75 },
    { id: 'but-a1-s', kind: 'swing', beats: 8, label: 'Neighbors swing', who: 'neighbor' },
    { id: 'but-a2-l', kind: 'long-lines', beats: 8, label: 'Long lines, forward and back', who: 'all' },
    { id: 'but-a2-c', kind: 'robins-chain', beats: 8, label: 'Robins chain to partner', who: 'partner' },
    { id: 'but-b1-h', kind: 'hey', beats: 16, label: 'Full hey: WR;NL;MR;PL;WR;NL;MR', who: 'all', notation: '(16) Hey (WR;NL;MR;PL;WR;NL;MR)', entry: 'side-couples', exit: 'same-slots-partner-balance' },
    { id: 'but-b2-b', kind: 'balance', beats: 4, label: 'Partners balance', who: 'partner' },
    { id: 'but-b2-s', kind: 'swing', beats: 12, label: 'Partners swing', who: 'partner' },
  ],
};

/** Published choreography transcribed as movement data. Names, authors, and sources retained. */
export const DANCES: Dance[] = [
  {
    id: 'baby-rose', title: 'The Baby Rose', author: 'David Kaynor', formation: 'duple-improper',
    sourceUrl: 'https://www.ibiblio.org/contradance/thecallersbox/dance.php?id=10273',
    description: 'A welcoming 64-beat contra: two swings, a flowing circle, and a star into new neighbors.',
    verified: true,
    notes: ['Choreography checked against Caller’s Box #10273 and the CDSS Calling Contras guide, page 5.', 'Lark and robin are dance roles. This source uses men, women, and ladies; the geometry is unchanged.', 'Exact swing revolutions, balance direction, star grip, and styling are illustrative choices.', 'Progression comes from the actual endpoint permutation. At the ends, couples wait and change direction.'],
    figures: [
      { id: 'br-a1-b', kind: 'balance', beats: 4, label: 'Neighbors balance', who: 'neighbor', confidence: 'verified' },
      { id: 'br-a1-s', kind: 'swing', beats: 12, label: 'Neighbors swing', who: 'neighbor', confidence: 'verified' },
      { id: 'br-a2-c', kind: 'circle', beats: 8, label: 'Circle left ¾', who: 'all', direction: 'left', amount: .75, confidence: 'verified' },
      { id: 'br-a2-d', kind: 'do-si-do', beats: 8, label: 'Partners do-si-do', who: 'partner', direction: 'right', amount: 1, confidence: 'verified' },
      { id: 'br-b1-b', kind: 'balance', beats: 4, label: 'Partners balance', who: 'partner', confidence: 'verified' },
      { id: 'br-b1-s', kind: 'swing', beats: 12, label: 'Partners swing', who: 'partner', confidence: 'verified' },
      { id: 'br-b2-c', kind: 'robins-chain', beats: 8, label: 'Robins chain to neighbor', who: 'neighbor', confidence: 'verified', notes: 'Right-hand pull-by followed by a courtesy turn.' },
      { id: 'br-b2-s', kind: 'star', beats: 8, label: 'Left-hand star, once', who: 'all', direction: 'left', amount: 1, progression: true, confidence: 'verified', notes: 'Finish facing new neighbors. The star does not add an extra row of travel.' },
    ],
  },
  {
    id: 'simplicity-star', title: 'Simplicity Star', author: 'Tom Lehmann', formation: 'duple-improper',
    sourceUrl: 'https://www.ibiblio.org/contradance/thecallersbox/dance.php?id=939',
    description: 'Long lines and two stars, with a 6-beat circle flowing into a 10-beat partner swing.',
    verified: true,
    notes: ['Choreography checked against Caller’s Box #939. Based on Simplicity Swing by Becky Hill.', 'Source counts are retained: the circle takes 6 beats and partner swing 10.', 'Animation style, holds, and intermediate paths are modeled choices.'],
    figures: [
      { id: 'ss-a1-b', kind: 'balance', beats: 4, label: 'Neighbors balance', who: 'neighbor', confidence: 'verified' },
      { id: 'ss-a1-s', kind: 'swing', beats: 12, label: 'Neighbors swing', who: 'neighbor', confidence: 'verified' },
      { id: 'ss-a2-c', kind: 'circle', beats: 6, label: 'Circle left ¾', who: 'all', direction: 'left', amount: .75, confidence: 'verified' },
      { id: 'ss-a2-s', kind: 'swing', beats: 10, label: 'Partners swing', who: 'partner', confidence: 'verified' },
      { id: 'ss-b1-l', kind: 'long-lines', beats: 8, label: 'Long lines, forward and back', who: 'all', confidence: 'verified' },
      { id: 'ss-b1-c', kind: 'robins-chain', beats: 8, label: 'Robins chain to neighbor', who: 'neighbor', confidence: 'verified' },
      { id: 'ss-b2-l', kind: 'star', beats: 8, label: 'Left-hand star, once', who: 'all', direction: 'left', amount: 1, confidence: 'verified' },
      { id: 'ss-b2-r', kind: 'star', beats: 8, label: 'Right-hand star, once', who: 'all', direction: 'right', amount: 1, progression: true, confidence: 'verified' },
    ],
  },
  BUTTER_CANDIDATE,
];
