// Appearance belongs to the persistent dancer identity. Do not use role,
// couple, line position, beat, or Math.random here: seeks and reloads must agree.
export const BODY_SHAPES = ['straight', 'rounded', 'tapered'] as const;
export const HAIR_TYPES = ['short', 'bun', 'long'] as const;
export type BodyShape = typeof BODY_SHAPES[number];
export type HairType = typeof HAIR_TYPES[number];
export interface DancerAppearance {
  readonly seed: number;
  readonly bodyShape: BodyShape;
  readonly hairType: HairType;
}

function mix32(value: number): number {
  value = Math.imul(value ^ (value >>> 16), 0x7feb352d);
  value = Math.imul(value ^ (value >>> 15), 0x846ca68b);
  return (value ^ (value >>> 16)) >>> 0;
}

export function dancerAppearance(id: number): DancerAppearance {
  const seed = mix32(id ^ 0x9e3779b9);
  return Object.freeze({
    seed,
    bodyShape: BODY_SHAPES[mix32(seed ^ 0x9e3779b9) % BODY_SHAPES.length],
    hairType: HAIR_TYPES[mix32(seed ^ 0x243f6a89) % HAIR_TYPES.length],
  });
}

// Cosmetic contours stay within the original torso/hip envelope. Their heights,
// shoulder width, head position, limb lengths and all kinematic anchors stay put.
// From the existing waist grip at y=1.18 upward, the contact-bearing surface is
// exactly the original contour; only the lower waist/hips change shape.
export const BODY_PROFILES = {
  straight: {
    torso: [[.18, 0], [.17, .06], [.17, .2], [.1940625, .27], [.225, .36], [.245, .43], [.18, .49], [.11, .51]],
    depth: .70,
    hips: [.17, .15, .12],
  },
  rounded: {
    torso: [[.197, 0], [.195, .06], [.17, .2], [.1940625, .27], [.225, .36], [.245, .43], [.18, .49], [.11, .51]],
    depth: .70,
    hips: [.19, .15, .135],
  },
  tapered: {
    torso: [[.18, 0], [.16, .06], [.145, .2], [.1940625, .27], [.225, .36], [.245, .43], [.18, .49], [.11, .51]],
    depth: .70,
    hips: [.17, .15, .12],
  },
} as const;
