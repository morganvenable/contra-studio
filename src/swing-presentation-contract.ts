/** Source intent and actual geometric contact remain separate in this optional study. */
export type SwingPresentation =
  | { kind: 'source' }
  | { kind: 'reciprocal-blade-preview'; revision: '1309cde7'; footwork: 'walk' | 'buzz' };

export type Vec3 = Readonly<{ x: number; y: number; z: number }>;
export type Hand = 'left' | 'right';
export interface HandOwner { readonly dancerId: number; readonly hand: Hand; }

/** A geometric attachment; strength is not a force or a route-progress value. */
export type PosedSwingContact =
  | { readonly kind: 'blade-palm'; readonly giver: HandOwner; readonly recipientId: number;
      readonly surface: Vec3; readonly palmCenter: Vec3; readonly wrist: Vec3;
      readonly surfaceNormal: Vec3; readonly attachment: 'attached'; readonly strength: 1 }
  | { readonly kind: 'leading-hand'; readonly a: HandOwner; readonly b: HandOwner;
      readonly point: Vec3; readonly wrists: readonly [Vec3, Vec3];
      readonly attachment: 'attached'; readonly strength: 1 };

export interface SwingFrameAcquisition {
  /** Canonical intended pair, lark first, independent of which palms have arrived. */
  readonly pair: readonly [number, number];
  readonly bodyProgress: number;
  readonly armRouteProgress: number;
  readonly phase: 'acquiring' | 'held' | 'releasing';
  readonly startBeat: number;
  readonly fullBeat: number;
  readonly releaseStartBeat: number;
  readonly releaseEndBeat: number;
  /** Explicit per-edge state permits a future separately timed leading hold. */
  readonly edges: readonly {
    readonly kind: 'blade-palm' | 'leading-hand';
    readonly owners: readonly HandOwner[];
    readonly state: 'traveling' | 'attached' | 'released';
    readonly routeProgress: number;
  }[];
}

export interface SwingPresentationResult<SourceFrame, LegacyRenderedContact> {
  /** Original object identity; never rewrite semantic/source contacts or poses. */
  readonly sourceFrame: SourceFrame;
  readonly requested: SwingPresentation;
  readonly applied: 'source' | 'reciprocal-blade-preview';
  readonly inactiveReason?: 'unreviewed-source' | 'unreviewed-window' | 'unreviewed-couple-count' | 'unsupported-renderer';
  /** Contacts belonging to hands not overridden by the preview. */
  readonly retainedRenderedContacts: readonly LegacyRenderedContact[];
  /** Actual attached preview edges only, no intent-only dots. */
  readonly posedSwingContacts: readonly PosedSwingContact[];
  /** Includes overridden hands still traveling, so old source dots are suppressed. */
  readonly overriddenHands: readonly HandOwner[];
  readonly acquisitions: readonly SwingFrameAcquisition[];
  readonly provenance: {
    readonly modelRevision: '1309cde7';
    readonly candidateSha256: string;
    readonly sourceBinding: string;
    readonly settingsHash: string;
  };
  readonly warnings: readonly string[];
}

/** Shared visible qualifications for the narrowly scoped optional study. */
export const SWING_STUDY_WARNINGS=Object.freeze([
  'Experimental, six-couple study in reviewed first-repeat windows only; other sources, edits and counts use standard rendering.',
  'Known 42.82 mm same-couple hey hand/forearm overlap; acquisition reaches 4.20 m/count; inherited fractional pose jumps remain.',
  'Kinematic weight-sharing cue, not a force simulation or collision-free guarantee. Visual direction and actual browser/GPU review are pending.',
]);
