/** Browser-safe port inputs only. No application import, pose mutation, or capability registration.
 * Geometry is frozen1309cde7. A browser port must separately pass the regression suite.
 */
export const RECIPROCAL_MODEL_REVISION = '1309cde7' as const;
export const RECIPROCAL_ALGORITHM_SHA256 = '1309cde755d668e5ad28eae6569df85951a3b069e94196edb31ac71413bd78af';
export const RECIPROCAL_FRAME_SETTINGS = {
  "torsoGap": 0.4,
  "hipGap": 0.36,
  "chestYaw": [
    35,
    15
  ],
  "bladeX": 0.16,
  "bladeY": 1.28,
  "palmHalfLength": 0.068,
  "wristOffset": 0.065,
  "lean": 0.0475831032769834,
  "hipY": 0.855,
  "innerFootRadius": 0.15,
  "outerFootRadius": 0.325,
  "lift": [
    0.014,
    0.024
  ],
  "maxExtraPelvisLowering": 0.1
} as const;
/** Selected geometry only, replacing the Node prototype's search-file lookup. */
export const RECIPROCAL_FRAME_CONFIGURATION = {
  "poles": [
    [
      0.05348168325827041,
      -0.254825744734933,
      -0.965506887275357
    ],
    [
      0.6681095835647455,
      0.1281881694289589,
      0.7329374990866514
    ],
    [
      -0.36723809601408564,
      0.12933152223967734,
      0.9210914928448297
    ],
    [
      0.0014336635949522558,
      0.25463102290596834,
      -0.9670372209912899
    ]
  ],
  "hands": [
    [
      -0.3567701115597943,
      1.28,
      -0.19608045740997804
    ],
    [
      0.16542539094930603,
      1.31,
      0.3547558957187861
    ],
    [
      0.16542539094930603,
      1.31,
      0.3547558957187861
    ],
    [
      0.1505635404766712,
      1.28,
      -0.24613096133232573
    ]
  ]
} as const;
export const RECIPROCAL_REVIEWED_BINDINGS = [
  {
    "danceId": "butter",
    "title": "Butter",
    "sourceUrl": "https://www.ibiblio.org/contradance/thecallersbox/dance.php?id=10320",
    "canonicalDanceSha256": "ae16c8b0364cb9a680ec90f29f6bd04a0792943669e4f1357c6b3eae86ee2250",
    "couples": 6,
    "absoluteBeatWindows": [
      [
        6,
        17
      ],
      [
        50,
        65
      ]
    ],
    "repeatScope": "These absolute windows only; do not modulo into unreviewed repeats."
  },
  {
    "danceId": "contradb-57-872070b1126c3bfd",
    "title": "Monday",
    "sourceUrl": "https://contradb.com/dances/57",
    "canonicalDanceSha256": "48a9ded01b832b9fcb229d0e5e9b58e6f8c9f295ba18bb177619da39457df973",
    "couples": 6,
    "absoluteBeatWindows": [
      [
        18,
        33
      ]
    ],
    "repeatScope": "These absolute windows only; do not modulo into unreviewed repeats."
  },
  {
    "danceId": "contradb-2418-6fbbb0673031bc44",
    "title": "Emma's Emergency",
    "sourceUrl": "https://contradb.com/dances/2418",
    "canonicalDanceSha256": "824b004842b8cc923cd1caa713fb5c53265c642676f45cf31f1c6bcc3519bdec",
    "couples": 6,
    "absoluteBeatWindows": [
      [
        38,
        49
      ]
    ],
    "repeatScope": "These absolute windows only; do not modulo into unreviewed repeats."
  },
  {
    "danceId": "contradb-2604-c1dfb3f9cf04499f",
    "title": "Another Safe Production",
    "sourceUrl": "https://contradb.com/dances/2604",
    "canonicalDanceSha256": "0f018133489b8f18c6ffa797e3e00815da00bd9d5f22caa1c13829c8d0efcfe6",
    "couples": 6,
    "absoluteBeatWindows": [
      [
        22,
        33
      ]
    ],
    "repeatScope": "These absolute windows only; do not modulo into unreviewed repeats."
  }
] as const;

export type PreviewScopeResult =
  | { applied: 'reciprocal-blade-preview'; binding: typeof RECIPROCAL_REVIEWED_BINDINGS[number] }
  | { applied: 'source'; inactiveReason: 'unsupported-renderer' | 'unreviewed-source' | 'unreviewed-window' | 'unreviewed-couple-count' };
/** The caller hashes the complete canonical Dance, caches by immutable content,
 * and proves its runtime/build against the frozen reference before setting runtimeReviewed.
 * A name, source URL, or catalog ID alone is never a valid binding.
 * Missing runtime approval fails closed. Beats are absolute, never modulo64.
 * The caller renders inactiveReason visibly while retaining the source presentation.
 */
export function evaluateReciprocalPreviewScope(input: {
  revision: string;
  canonicalDanceSha256: string;
  couples: number;
  absoluteBeat: number;
  runtimeReviewed?: boolean;
}): PreviewScopeResult {
  if (input.revision !== RECIPROCAL_MODEL_REVISION || input.runtimeReviewed !== true)
    return { applied: 'source', inactiveReason: 'unsupported-renderer' };
  const binding = RECIPROCAL_REVIEWED_BINDINGS.find(item => item.canonicalDanceSha256 === input.canonicalDanceSha256);
  if (!binding) return { applied: 'source', inactiveReason: 'unreviewed-source' };
  if (input.couples !== binding.couples) return { applied: 'source', inactiveReason: 'unreviewed-couple-count' };
  if (!Number.isFinite(input.absoluteBeat) || !binding.absoluteBeatWindows.some(([start,end]) => input.absoluteBeat >= start && input.absoluteBeat <= end))
    return { applied: 'source', inactiveReason: 'unreviewed-window' };
  return { applied: 'reciprocal-blade-preview', binding };
}

// Own the reviewed inputs at runtime as well as in TypeScript. Nested arrays must
// not become a mutable override channel for geometry or reviewed window bounds.
function freezeReviewed<T>(value:T):T {
  if(value&&typeof value==='object'&&!Object.isFrozen(value)){
    for(const child of Object.values(value))freezeReviewed(child);
    Object.freeze(value);
  }
  return value;
}
freezeReviewed(RECIPROCAL_FRAME_SETTINGS);
freezeReviewed(RECIPROCAL_FRAME_CONFIGURATION);
freezeReviewed(RECIPROCAL_REVIEWED_BINDINGS);
