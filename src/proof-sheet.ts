/**
 * Figure gallery (figures.html): every figure in the next engine's registry (and each
 * variant of it) looping on its own, danced by the studio's own 3D people
 * (src/figure-cards-3d.ts; a flat overhead view where WebGL is missing).
 * Cases come from src/next/proof-cases.json (scripts/proof-cases.mjs); each
 * compiles here when its card scrolls into view. Clicking a card opens that
 * figure looping in the studio (?figure=<move>&params=<json>); each card's
 * Feedback button sends a note with that figure attached.
 */
import './proof-sheet.css';
import type { Frame } from './types.ts';
import CASES from './next/proof-cases.json';
import { compileProof, FAMILIES, proofTitle, type CompiledProof, type ProofCase } from './next/proof.ts';
import { FigureCardRenderer, type CardDancers } from './figure-cards-3d.ts';
import { mountGalleryFeedback } from './feedback/index.ts';
import type { FeedbackStateView } from './feedback/context.ts';

const cases = CASES as unknown as ProofCase[];
const BEATS_PER_SECOND = 112 / 60;
const root = document.querySelector<HTMLDivElement>('#proof-app')!;

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
const bubble =
  '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5h16v11H9l-5 4Z"/><path d="M8 9h8M8 12h5"/></svg>';
const value = (v: unknown) => (typeof v === 'object' ? JSON.stringify(v) : String(v));
const paramText = (p: Readonly<Record<string, unknown>>) =>
  Object.entries(p)
    .map(([k, v]) => `${k}: ${value(v)}`)
    .join(' · ') || 'no params';
const leadText = (c: ProofCase) => c.lead.map((l) => l.text ?? l.move).join(' → ');

export function studioLink(c: ProofCase): string {
  const q = new URLSearchParams({ figure: c.move, params: JSON.stringify(c.params), case: c.id });
  return `./?${q}`;
}

const figures = new Set(cases.map((c) => c.move)).size;
const failing = cases.filter((c) => c.error);
root.innerHTML = `
  <header><a class="brand" href="./">Contra <span>Studio</span></a><nav id="gallery-nav"><a href="./">Studio</a><a href="./figures.html" aria-current="page">Figures</a><a href="./timing-lab.html">Timing lab</a></nav></header>
  <main>
    <h1>Figure gallery</h1>
    <p class="intro">${figures} figures in ${cases.length} cards, each looping from a small starting set: the formation's start, plus the few calls before it when it can't start there. These are the studio's own dancers, bodies, arms and all; gold dots mark held hands, and the music is toward the top of each card. Each card shows the middle of its figure; point at a card to play it from the start.</p>
    <p class="intro"><strong>To say how a figure should look</strong>, press <em>Feedback</em> under its card: your note is sent with that exact figure and the beat it was on. Click the picture to watch it larger in the studio.${failing.length ? ` ${failing.length} cards can't start yet and say why; feedback on those helps too.` : ''}</p>
    <div class="tools"><label>Find <input id="find" type="search" placeholder="figure or param" aria-label="Find a figure"></label><label><input id="only-failing" type="checkbox"> Only cards that can't start</label></div>
    ${FAMILIES.map((family) => {
      const list = cases.filter((c) => c.family === family);
      if (!list.length) return '';
      return `<section class="family" data-family="${esc(family)}"><h2>${esc(family)} <small>${list.length}</small></h2><div class="grid">${list
        .map((c) => card(c))
        .join('')}</div></section>`;
    }).join('')}
  </main>`;

function card(c: ProofCase): string {
  const i = cases.indexOf(c);
  const text = `${c.move} ${paramText(c.params)} ${c.ending ?? ''}`.toLowerCase();
  const variant = Object.keys(c.variant).length ? paramText(c.variant) : '';
  const body = c.error
    ? `<div class="error" role="note"><strong>Can't start</strong>${esc(c.error)}</div>`
    : `<canvas width="240" height="200" aria-label="${esc(c.move)} danced"></canvas>`;
  return `<div class="card${c.error ? ' failed' : ''}" data-case="${i}" data-text="${esc(text)}"><a class="card-link" href="${esc(studioLink(c))}">
    ${body}
    <div class="caption"><strong>${esc(c.move)}${c.ending ? ` <em>${esc(c.ending)}</em>` : ''}</strong>
    ${variant ? `<span class="variant">${esc(variant)}</span>` : ''}
    <span class="params">${esc(paramText(c.params))} · ${c.beats} beats</span>
    <span class="where">${esc(c.formation)}, ${c.couples} couples${c.lead.length ? ` · after ${esc(leadText(c))}` : ''}</span>
    ${c.isolation && !c.error ? `<span class="alone" title="${esc(c.isolation)}">Alone: ${esc(c.isolation)}</span>` : ''}</div></a>
    <button type="button" class="card-feedback" hidden>${bubble}Feedback</button></div>`;
}

interface Live {
  readonly el: HTMLElement;
  readonly canvas: HTMLCanvasElement;
  readonly c: ProofCase;
  proof?: CompiledProof;
  bounds?: { minX: number; maxX: number; minZ: number; maxZ: number };
  visible: boolean;
  dancers?: CardDancers;
  /** Beat last drawn, sent with feedback. */
  beat: number;
}
let people: FigureCardRenderer | undefined;
try {
  people = new FigureCardRenderer();
} catch (error) {
  console.warn('WebGL unavailable; the gallery shows flat overhead views.', error);
}
const live: Live[] = [];
for (const el of root.querySelectorAll<HTMLElement>('.card')) {
  const canvas = el.querySelector('canvas');
  if (canvas) live.push({ el, canvas, c: cases[Number(el.dataset.case)], visible: false, beat: 0 });
}

function prepare(card: Live) {
  if (card.proof || card.el.classList.contains('failed')) return;
  try {
    card.proof = compileProof(card.c);
  } catch (error) {
    // The case started when the sheet was built; show why it no longer does.
    card.el.classList.add('failed');
    const note = document.createElement('div');
    note.className = 'error';
    note.innerHTML = `<strong>Can't start</strong>${esc(error instanceof Error ? error.message : String(error))}`;
    card.canvas.replaceWith(note);
    return;
  }
  const { dance, start, end } = card.proof;
  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
  for (let i = 0; i <= 24; i++) {
    for (const p of dance.sample(start + ((end - start - 1e-3) * i) / 24).poses) {
      minX = Math.min(minX, p.position.x);
      maxX = Math.max(maxX, p.position.x);
      minZ = Math.min(minZ, p.position.z);
      maxZ = Math.max(maxZ, p.position.z);
    }
  }
  card.bounds = { minX: minX - 0.6, maxX: maxX + 0.6, minZ: minZ - 0.6, maxZ: maxZ + 0.6 };
}

/** The figure's beat at a moment of the loop, with a beat's rest before it repeats. */
function beatAt(proof: CompiledProof, seconds: number) {
  const beats = proof.end - proof.start;
  return proof.start + Math.min(beats - 1e-3, (seconds * BEATS_PER_SECOND) % (beats + 1));
}

function draw3d(card: Live, seconds: number, playing: boolean) {
  if (!people || !card.proof) return;
  // A card's first pose plans its steps over the whole figure (tens of ms):
  // past a few per frame, the rest wait for the next frame.
  if (card.dancers?.posedAt === undefined && performance.now() - frameStart > FIRST_POSE_BUDGET_MS) return;
  card.dancers ??= people.build(card.proof.dance, card.proof.start, card.proof.end, card.canvas.clientWidth / card.canvas.clientHeight || 1.2);
  // A card that isn't playing holds the middle of its figure.
  card.beat = playing ? beatAt(card.proof, seconds) : (card.proof.start + card.proof.end) / 2;
  try {
    people.draw(card.dancers, card.beat, card.canvas);
  } catch (error) {
    // A body that cannot be posed is itself a finding: say so on the card.
    console.warn(`Gallery card ${card.c.id} could not draw its dancers.`, error);
    people.release(card.dancers);
    card.dancers = undefined;
    card.proof = undefined;
    card.el.classList.add('failed');
    const note = document.createElement('div');
    note.className = 'error';
    note.innerHTML = `<strong>Dancers can't be drawn</strong>${esc(error instanceof Error ? error.message : String(error))}`;
    card.canvas.replaceWith(note);
  }
}

function draw(card: Live, seconds: number) {
  if (!card.proof || !card.bounds) return;
  const { dance, start, end } = card.proof;
  const beats = end - start;
  const beat = (card.beat = beatAt(card.proof, seconds));
  const frame: Frame = dance.sample(beat);
  const ctx = card.canvas.getContext('2d')!;
  const dpr = window.devicePixelRatio || 1;
  const w = card.canvas.clientWidth || 240;
  const h = card.canvas.clientHeight || 200;
  if (card.canvas.width !== Math.round(w * dpr)) {
    card.canvas.width = Math.round(w * dpr);
    card.canvas.height = Math.round(h * dpr);
  }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = '#f7f3e8';
  ctx.fillRect(0, 0, w, h);
  const b = card.bounds;
  const scale = Math.min((w - 16) / (b.maxX - b.minX), (h - 28) / (b.maxZ - b.minZ));
  const ox = w / 2 - ((b.minX + b.maxX) / 2) * scale;
  const oy = 12 + (h - 12) / 2 - ((b.minZ + b.maxZ) / 2) * scale;
  const px = (x: number) => ox + x * scale;
  const pz = (z: number) => oy + z * scale;
  // The band: at the top of the set, drawn top right.
  ctx.fillStyle = '#7c8878';
  ctx.font = '600 9px system-ui';
  ctx.textAlign = 'right';
  ctx.fillText('BAND ♪', w - 6, 11);
  // Progress along the figure.
  ctx.fillStyle = '#dce2d7';
  ctx.fillRect(0, h - 3, w, 3);
  ctx.fillStyle = '#285e4d';
  ctx.fillRect(0, h - 3, (w * (beat - start)) / beats, 3);
  const poses = new Map(frame.poses.map((p) => [p.id, p]));
  // Held hands: a line from each dancer to where the hands meet.
  for (const c of frame.contacts) {
    if (c.strength < 0.5) continue;
    const a = poses.get(c.a);
    const o = poses.get(c.b);
    if (!a || !o) continue;
    const raised = c.kind === 'arch' || c.point.y > 1.7;
    ctx.strokeStyle = c.kind === 'swing-frame' ? '#8a6d9e' : raised ? '#b0582f' : '#3e423d';
    ctx.lineWidth = raised ? 2 : 1.5;
    ctx.beginPath();
    ctx.moveTo(px(a.position.x), pz(a.position.z));
    ctx.lineTo(px(c.point.x), pz(c.point.z));
    if (!c.target || c.target === 'hands') ctx.lineTo(px(o.position.x), pz(o.position.z));
    ctx.stroke();
    if (raised) {
      ctx.beginPath();
      ctx.arc(px(c.point.x), pz(c.point.z), 4.5, 0, Math.PI * 2);
      ctx.fillStyle = '#fff6df';
      ctx.fill();
      ctx.stroke();
    }
  }
  const r = Math.max(4, Math.min(9, 0.22 * scale));
  for (const p of frame.poses) {
    const d = dance.dancers[p.id];
    const x = px(p.position.x);
    const y = pz(p.position.z);
    const fx = Math.sin(p.yaw);
    const fz = Math.cos(p.yaw);
    ctx.fillStyle = d.color;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    // Facing arrow.
    ctx.beginPath();
    ctx.moveTo(x + fx * r * 1.9, y + fz * r * 1.9);
    ctx.lineTo(x + fx * r * 0.9 - fz * r * 0.6, y + fz * r * 0.9 + fx * r * 0.6);
    ctx.lineTo(x + fx * r * 0.9 + fz * r * 0.6, y + fz * r * 0.9 - fx * r * 0.6);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = `700 ${Math.round(r * 1.05)}px system-ui`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${d.role === 'lark' ? 'L' : 'R'}${d.couple + 1}`, x, y + 0.5);
    ctx.textBaseline = 'alphabetic';
  }
}

const seen = new IntersectionObserver(
  (entries) => {
    for (const e of entries) {
      const card = live.find((c) => c.el === e.target);
      if (!card) continue;
      card.visible = e.isIntersecting;
      if (card.visible) prepare(card);
      else if (card.dancers && people) {
        // Free the bodies of cards scrolled away; they rebuild on return.
        people.release(card.dancers);
        card.dancers = undefined;
      }
    }
  },
  { rootMargin: '200px' },
);
for (const card of live) seen.observe(card.el);

const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const FIRST_POSE_BUDGET_MS = 12;
let frameStart = 0;
// Only the card under the pointer (or keyboard focus) plays, from the
// figure's start; every other card holds still.
let pointed: Live | undefined;
let pointedSince = 0;
const point = (card: Live | undefined) => {
  if (card === pointed) return;
  pointed = card;
  pointedSince = performance.now() / 1000;
};
for (const card of live) {
  card.el.addEventListener('pointerenter', () => point(card));
  card.el.addEventListener('focusin', () => point(card));
  card.el.addEventListener('pointerleave', () => pointed === card && point(undefined));
  card.el.addEventListener('focusout', () => pointed === card && point(undefined));
}
function tick(now: number) {
  const seconds = reduced ? 0 : now / 1000;
  if (!people) {
    for (const card of live) if (card.visible) draw(card, seconds);
  } else {
    people.begin();
    frameStart = performance.now();
    // The playing card goes first so it is never left waiting for its first pose.
    if (pointed?.visible) draw3d(pointed, reduced ? 0 : seconds - pointedSince, true);
    for (const card of live) if (card.visible && card !== pointed) draw3d(card, seconds, false);
  }
  requestAnimationFrame(tick);
}
requestAnimationFrame(tick);

const find = root.querySelector<HTMLInputElement>('#find')!;
const onlyFailing = root.querySelector<HTMLInputElement>('#only-failing')!;
function filter() {
  const q = find.value.trim().toLowerCase();
  for (const el of root.querySelectorAll<HTMLElement>('.card')) {
    const hit = (!q || el.dataset.text!.includes(q)) && (!onlyFailing.checked || el.classList.contains('failed'));
    el.hidden = !hit;
  }
  for (const s of root.querySelectorAll<HTMLElement>('.family'))
    s.hidden = !s.querySelector('.card:not([hidden])');
}
find.addEventListener('input', filter);

// Feedback: the header button sends a general note; a card's button sends
// one with that figure, its variant and the beat it was showing attached.
let noteCase: ProofCase | undefined;
let noteCard: Live | undefined;
function feedbackState(): FeedbackStateView {
  const c = noteCase;
  if (!c)
    return {
      dance: { id: 'figure-gallery', title: 'Figure gallery', figures: [] },
      beat: 0, totalBeats: 0, repeat: 0, figureIndex: 0, camera: 'gallery',
      selectedDancer: -1, dancers: [],
    };
  const proof = noteCard?.proof;
  const calls = [...c.lead.map((l) => ({ label: l.text ?? l.move, beats: l.beats })), { label: proofTitle(c), beats: c.beats }];
  return {
    dance: { id: `figure:${c.id}`, title: 'Figure gallery', figures: calls },
    beat: noteCard?.beat ?? proof?.start ?? 0,
    totalBeats: proof?.end ?? 0,
    repeat: 0,
    figureIndex: c.lead.length,
    camera: 'gallery card',
    selectedDancer: -1,
    dancers: proof?.dance.dancers ?? [],
  };
}
// A card's note names its studio link, so it opens straight to that figure.
const feedbackPage = () =>
  noteCase
    ? `${location.pathname.replace(/[^/]*$/, '')}${studioLink(noteCase).slice(2)}`
    : `${location.pathname}${location.search}`;
void mountGalleryFeedback(root.querySelector<HTMLElement>('#gallery-nav')!, feedbackState, feedbackPage).then((open) => {
  if (!open) return;
  root
    .querySelector('#gallery-nav .feedback-trigger')
    ?.addEventListener('click', () => (noteCase = noteCard = undefined), { capture: true });
  for (const el of root.querySelectorAll<HTMLElement>('.card')) {
    const button = el.querySelector<HTMLButtonElement>('.card-feedback')!;
    button.hidden = false;
    button.addEventListener('click', () => {
      noteCase = cases[Number(el.dataset.case)];
      noteCard = live.find((x) => x.el === el);
      open();
    });
  }
});
onlyFailing.addEventListener('change', filter);

// Read-only hook for the e2e flow.
Object.defineProperty(window, '__proof', {
  value: { cases: cases.length, figures, failing: failing.length, stats: people?.stats },
  writable: false,
});
