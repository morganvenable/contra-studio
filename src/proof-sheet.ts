/**
 * Figure gallery (figures.html): every figure in the next engine's registry (and each
 * variant of it) looping on its own in a small overhead view. Cases come
 * from src/next/proof-cases.json (scripts/proof-cases.mjs); each compiles
 * here when its card scrolls into view. Clicking a card opens that figure
 * looping in the studio's 3D view (?figure=<move>&params=<json>).
 */
import './proof-sheet.css';
import type { Frame } from './types.ts';
import CASES from './next/proof-cases.json';
import { compileProof, FAMILIES, type CompiledProof, type ProofCase } from './next/proof.ts';

const cases = CASES as unknown as ProofCase[];
const BEATS_PER_SECOND = 112 / 60;
const root = document.querySelector<HTMLDivElement>('#proof-app')!;

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
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
  <header><a class="brand" href="./">Contra <span>Studio</span></a><nav><a href="./">Studio</a><a href="./figures.html" aria-current="page">Figures</a><a href="./timing-lab.html">Timing lab</a></nav></header>
  <main>
    <h1>Figure gallery</h1>
    <p class="intro">${figures} figures in ${cases.length} cards, each looping from a small starting set: the formation's start, plus the few calls before it when it can't start there. Larks are teal, robins rust; held hands are lines, a raised ring marks an arch. The band is at the top right.</p>
    <p class="intro"><strong>To comment on a figure</strong>, click its card: it opens looping in 3D, and the Feedback button there sends your note with that exact figure attached.${failing.length ? ` ${failing.length} cards can't start yet and say why; feedback on those helps too.` : ''}</p>
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
    : `<canvas width="240" height="200" aria-label="${esc(c.move)} seen from above"></canvas>`;
  return `<a class="card${c.error ? ' failed' : ''}" href="${esc(studioLink(c))}" data-case="${i}" data-text="${esc(text)}">
    ${body}
    <div class="caption"><strong>${esc(c.move)}${c.ending ? ` <em>${esc(c.ending)}</em>` : ''}</strong>
    ${variant ? `<span class="variant">${esc(variant)}</span>` : ''}
    <span class="params">${esc(paramText(c.params))} · ${c.beats} beats</span>
    <span class="where">${esc(c.formation)}, ${c.couples} couples${c.lead.length ? ` · after ${esc(leadText(c))}` : ''}</span>
    ${c.isolation && !c.error ? `<span class="alone" title="${esc(c.isolation)}">Alone: ${esc(c.isolation)}</span>` : ''}</div></a>`;
}

interface Live {
  readonly el: HTMLAnchorElement;
  readonly canvas: HTMLCanvasElement;
  readonly c: ProofCase;
  proof?: CompiledProof;
  bounds?: { minX: number; maxX: number; minZ: number; maxZ: number };
  visible: boolean;
}
const live: Live[] = [];
for (const el of root.querySelectorAll<HTMLAnchorElement>('.card')) {
  const canvas = el.querySelector('canvas');
  if (canvas) live.push({ el, canvas, c: cases[Number(el.dataset.case)], visible: false });
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

function draw(card: Live, seconds: number) {
  if (!card.proof || !card.bounds) return;
  const { dance, start, end } = card.proof;
  const beats = end - start;
  const beat = start + Math.min(beats - 1e-3, (seconds * BEATS_PER_SECOND) % (beats + 1));
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
    }
  },
  { rootMargin: '200px' },
);
for (const card of live) seen.observe(card.el);

const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
function tick(now: number) {
  for (const card of live) if (card.visible) draw(card, reduced ? 0 : now / 1000);
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
onlyFailing.addEventListener('change', filter);

// Read-only hook for the e2e flow.
Object.defineProperty(window, '__proof', {
  value: { cases: cases.length, figures, failing: failing.length },
  writable: false,
});
