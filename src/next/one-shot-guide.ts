/**
 * The guide beside Write a dance: how to write a line, the figures it reads
 * (each phrase checked by test/one-shot.test.ts), and example dances that
 * dance cleanly (status ok).
 */

export interface GuideGroup {
  readonly title: string;
  readonly note?: string;
  readonly phrases: readonly string[];
}

export const WRITE_FORMAT: readonly [string, string][] = [
  ['One figure per line', 'neighbors balance & swing'],
  ['Part and beats first, if you like', 'A1 16 neighbors balance & swing'],
  ['Or beats at the end', 'circle left 3 places (8)'],
  ['No beats: the usual length (shown with ?)', 'robins chain'],
  ['Name the dance', 'Title: My first dance'],
  ['Or the formation (the menu wins)', 'Formation: Becket'],
];

export const WRITE_WHO =
  'Who: neighbors, partners, shadows, larks and robins (or gents and ladies, gentlespoons and ladles), ones and twos. Left out, a figure is danced with neighbors (an allemande with partners).';

export const WRITE_FIGURES: readonly GuideGroup[] = [
  {
    title: 'Swings and balances',
    phrases: ['neighbors balance & swing', 'partners swing', 'neighbors meltdown swing', 'partners balance', 'balance the ring'],
  },
  {
    title: 'Turns by the hand',
    note: 'Amounts: once, 1½, ¾, ½. Hands: right or left.',
    phrases: ['neighbors allemande left 1½', 'allemande right once', 'neighbors do si do', 'partners gyre 1½', 'box the gnat', 'swat the flea', 'California twirl'],
  },
  {
    title: 'Circles and stars',
    phrases: ['circle left 3 places', 'circle left 3 places and pass through', 'star right 4 places', 'star left'],
  },
  {
    title: 'Chains and heys',
    phrases: ['robins chain', 'larks chain', 'robins start a half hey', 'full hey', 'balance & petronella'],
  },
  {
    title: 'Lines and waves',
    phrases: [
      'long lines forward & back',
      'form an ocean wave & balance - larks by right hands and neighbors by left hands',
      'balance the wave',
      "balance & Rory O'More right",
      'box circulate',
      'mad robins, larks in front',
      'larks roll away partners',
    ],
  },
  {
    title: 'Passing and progressing',
    note: 'A contra moves on to new neighbors once each time through: often a pass through or a slide at the end.',
    phrases: [
      'pass through to next neighbors',
      'neighbors pull by right',
      'right left through',
      'partners promenade across',
      'slide left along set',
      'slice left',
      'down the hall and back',
      'give and take',
      'ones contra corners',
      'twos arch, ones dive',
    ],
  },
];

export const WRITE_EXAMPLES: readonly { readonly name: string; readonly text: string }[] = [
  {
    name: 'Easy improper',
    text: `Title: Easy improper
A1 16 neighbors balance & swing
A2  8 long lines forward & back
    8 robins chain
B1 16 partners balance & swing
B2  6 circle left 3 places
    2 pass through to next neighbors
    8 neighbors do si do`,
  },
  {
    name: 'Allemandes and a hey',
    text: `Title: Allemandes and a hey
A1  8 neighbors allemande left 1½
    8 robins start a half hey - rights in center, lefts on ends
A2 16 neighbors balance & swing
B1  8 larks allemande left 1½
    8 partners swing
B2  8 circle left 3 places
    8 neighbors allemande right 1½`,
  },
  {
    name: 'Becket',
    text: `Title: Becket sampler
Formation: Becket
A1  8 circle left 3 places
    8 neighbors swing
A2  8 robins chain
    8 star left 4 places
B1 16 partners balance & swing
B2  8 long lines forward & back
    8 slide left along set`,
  },
];
