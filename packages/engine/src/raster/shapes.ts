import { CANVAS_FONT, FONT, MONO, SCALE, SERIF } from '../html.ts';
import { apng } from '../png.ts';
import { addStops, canvas, ctx, finish, fullFrame } from './canvas.ts';
import type { ApngFrame } from '../png.ts';
import type {
  CursorSpec,
  DotsSpec,
  MarkSpec,
  MonogramSpec,
  MrzSpec,
  PostmarkSpec,
  QuoteMarkSpec,
  PhotoShape,
  SpinnerSpec,
} from '../types.ts';

/** A point as [x, y]. */
export type Point = [number, number];

/** Walks round a shape's ring at an even speed. */
export interface RingTrack {
  /** Length of the ring in pixels. */
  L: number;
  /** The point a fraction t (0..1, wrapping) of the way round. */
  at(t: number): { x: number; y: number };
}

/** A straight piece of a ring: its ends, where it starts along the ring, and its length. */
interface Segment {
  a: Point;
  b: Point;
  s: number;
  l: number;
}

/* photo shapes as outlines (lists of points, one list per piece), starting at the top and running clockwise */
function outline(shape: PhotoShape, x: number, y: number, w: number, h: number): Point[][] {
  const cx = x + w / 2;
  const cy = y + h / 2;
  const R = Math.min(w, h) / 2;
  let out: Point[][] = [];
  let i: number;
  let n: number;
  let a: number;
  function arcPts(pts: Point[], ax: number, ay: number, r: number, a0: number, a1: number, k: number) {
    for (let j = 0; j <= k; j++) {
      const t = a0 + ((a1 - a0) * j) / k;
      pts.push([ax + r * Math.cos(t), ay + r * Math.sin(t)]);
    }
  }
  function rr(r: number[]): Point[] {
    const p: Point[] = [[x + w / 2, y]];
    arcPts(p, x + w - r[1], y + r[1], r[1], -Math.PI / 2, 0, 12);
    arcPts(p, x + w - r[2], y + h - r[2], r[2], 0, Math.PI / 2, 12);
    arcPts(p, x + r[3], y + h - r[3], r[3], Math.PI / 2, Math.PI, 12);
    arcPts(p, x + r[0], y + r[0], r[0], Math.PI, Math.PI * 1.5, 12);
    return p;
  }
  switch (shape) {
    case 'circle':
      n = 144;
      out = [[]];
      for (i = 0; i < n; i++) {
        a = -Math.PI / 2 + (2 * Math.PI * i) / n;
        out[0].push([cx + R * Math.cos(a), cy + R * Math.sin(a)]);
      }
      return out;
    case 'squircle':
      n = 160;
      out = [[]];
      for (i = 0; i < n; i++) {
        a = -Math.PI / 2 + (2 * Math.PI * i) / n;
        const c = Math.cos(a);
        const sn = Math.sin(a);
        out[0].push([cx + R * Math.sign(c) * Math.abs(c) ** 0.5, cy + R * Math.sign(sn) * Math.abs(sn) ** 0.5]);
      }
      return out;
    case 'blob':
      n = 160;
      out = [[]];
      const m = 1.16;
      for (i = 0; i < n; i++) {
        a = -Math.PI / 2 + (2 * Math.PI * i) / n;
        const k2 = (1 + 0.07 * Math.sin(3 * a + 0.6) + 0.05 * Math.cos(5 * a + 1.3) + 0.04 * Math.sin(2 * a + 2.2)) / m;
        out[0].push([cx + R * k2 * Math.cos(a), cy + R * k2 * Math.sin(a)]);
      }
      return out;
    case 'rounded':
      const r0 = Math.min(w, h) * 0.2;
      return [rr([r0, r0, r0, r0])];
    case 'leaf':
      return [rr([w * 0.46, w * 0.1, w * 0.46, w * 0.1])];
    case 'arch': {
      const p2: Point[] = [[cx, y]];
      const rb = w * 0.08;
      arcPts(p2, cx, y + w / 2, w / 2, -Math.PI / 2, 0, 18);
      arcPts(p2, x + w - rb, y + h - rb, rb, 0, Math.PI / 2, 6);
      arcPts(p2, x + rb, y + h - rb, rb, Math.PI / 2, Math.PI, 6);
      arcPts(p2, cx, y + w / 2, w / 2, Math.PI, Math.PI * 1.5, 18);
      return [p2];
    }
    case 'hexagon':
      out = [[]];
      for (i = 0; i < 6; i++) {
        a = -Math.PI / 2 + (Math.PI / 3) * i;
        out[0].push([cx + R * Math.cos(a), cy + R * Math.sin(a)]);
      }
      return out;
    case 'octagon':
      out = [[[cx, y]]];
      for (i = 0; i < 8; i++) {
        a = -Math.PI / 2 + Math.PI / 8 + (Math.PI / 4) * i;
        out[0].push([cx + (R / Math.cos(Math.PI / 8)) * Math.cos(a), cy + (R / Math.cos(Math.PI / 8)) * Math.sin(a)]);
      }
      return out;
    case 'slice':
      return [
        [
          [x + 0.6 * w, y],
          [x + w, y],
          [x + 0.8 * w, y + h],
          [x, y + h],
          [x + 0.2 * w, y],
        ],
      ];
    case 'slices': {
      const sk = 0.16 * w;
      const gp = 0.035 * w;
      const sw = (w - sk - 2 * gp) / 3;
      for (i = 0; i < 3; i++) {
        const x0 = x + i * (sw + gp);
        out.push([
          [x0 + sk, y],
          [x0 + sk + sw, y],
          [x0 + sw, y + h],
          [x0, y + h],
        ]);
      }
      return out;
    }
    default:
      return [
        [
          [cx, y],
          [x + w, y],
          [x + w, y + h],
          [x, y + h],
          [x, y],
        ],
      ];
  }
}

/** Adds a photo shape's outline to the context's path. */
export function shapePath(
  g: CanvasRenderingContext2D,
  shape: PhotoShape,
  x: number,
  y: number,
  w: number,
  h: number,
): void {
  g.beginPath();
  if (shape === 'circle') g.arc(x + w / 2, y + h / 2, Math.min(w, h) / 2, 0, Math.PI * 2);
  else if (shape === 'rounded') {
    const r = Math.min(w, h) * 0.2;
    g.moveTo(x + r, y);
    g.arcTo(x + w, y, x + w, y + h, r);
    g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r);
    g.arcTo(x, y, x + w, y, r);
    g.closePath();
  } else if (shape === 'square' || !shape) g.rect(x, y, w, h);
  else
    outline(shape, x, y, w, h).forEach((pts) => {
      g.moveTo(pts[0][0], pts[0][1]);
      for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]);
      g.closePath();
    });
}

/** Tracks points a fraction t (0..1) of the way round a shape's ring, measured along its length. */
export function ringTrack(shape: PhotoShape, S: number, rw: number): RingTrack {
  const segs: Segment[] = [];
  let L = 0;
  outline(shape, rw / 2, rw / 2, S - rw, S - rw).forEach((pts) => {
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i];
      const b = pts[(i + 1) % pts.length];
      const l = Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (l > 0) {
        segs.push({ a, b, s: L, l });
        L += l;
      }
    }
  });
  return {
    L,
    at(t) {
      const d = (((t % 1) + 1) % 1) * L;
      let lo = 0;
      let hi = segs.length - 1;
      while (lo < hi) {
        const mid = (lo + hi + 1) >> 1;
        if (segs[mid].s <= d) lo = mid;
        else hi = mid - 1;
      }
      const q = segs[lo];
      const u = Math.min(1, (d - q.s) / q.l);
      return { x: q.a[0] + (q.b[0] - q.a[0]) * u, y: q.a[1] + (q.b[1] - q.a[1]) * u };
    },
  };
}

/**
 * Makes a conic gradient that repeats the stops `rep` times round the centre.
 * Browsers without conic gradients get a linear one across the same angle.
 */
export function conic(
  g: CanvasRenderingContext2D,
  angle: number,
  cx: number,
  cy: number,
  stops: string[],
  rep: number,
): CanvasGradient {
  if (typeof g.createConicGradient !== 'function') {
    return addStops(
      g.createLinearGradient(
        cx + Math.cos(angle) * cx,
        cy + Math.sin(angle) * cy,
        cx - Math.cos(angle) * cx,
        cy - Math.sin(angle) * cy,
      ),
      stops,
    );
  }
  const cg = g.createConicGradient(angle, cx, cy);
  const seqC: string[] = [];
  for (let r = 0; r < rep; r++)
    stops.forEach((c) => {
      seqC.push(c);
    });
  seqC.push(stops[0]);
  seqC.forEach((c, i) => {
    cg.addColorStop(i / (seqC.length - 1), c);
  });
  return cg;
}

/** Adds a four-point sparkle of radius r, turned by rot radians, to the context's path. */
export function sparklePath(g: CanvasRenderingContext2D, x: number, y: number, r: number, rot: number): void {
  const q = 0.3;

  const tips: Point[] = [
    [0, -r],
    [r, 0],
    [0, r],
    [-r, 0],
  ];

  const cr = Math.cos(rot);
  const sr = Math.sin(rot);
  function P(px: number, py: number): Point {
    return [x + px * cr - py * sr, y + px * sr + py * cr];
  }
  g.beginPath();
  const s0 = P(tips[0][0], tips[0][1]);
  g.moveTo(s0[0], s0[1]);
  for (let k = 0; k < 4; k++) {
    const a = tips[k];
    const b = tips[(k + 1) % 4];
    const c1 = P(a[0] * q, a[1] * q);
    const c2 = P(b[0] * q, b[1] * q);
    const e = P(b[0], b[1]);
    g.bezierCurveTo(c1[0], c1[1], c2[0], c2[1], e[0], e[1]);
  }
  g.closePath();
}

/* ---------- the initials badge and the quote mark ---------- */

/** Draws initials in white on a gradient tile. */
export function renderMonogram(sp: MonogramSpec): Promise<string> {
  const S = sp.size * SCALE;
  const c = canvas(S, S);
  const g = ctx(c);
  const fs = S * (sp.text.length > 2 ? 0.34 : 0.42);
  g.save();
  shapePath(g, sp.shape || 'rounded', 0, 0, S, S);
  g.clip();
  g.fillStyle = addStops(
    g.createLinearGradient(0, 0, S, S),
    sp.stops && sp.stops.length ? sp.stops : ['#0F6CBD', '#2899F5'],
  );
  g.fillRect(0, 0, S, S);
  g.restore();
  g.fillStyle = '#FFFFFF';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.font = `600 ${fs}px ${CANVAS_FONT}`;
  g.fillText(sp.text, S / 2, S / 2 + fs * 0.04);
  return finish(c);
}

/** Draws a large opening quotation mark in a gradient. */
export function renderQuote(sp: QuoteMarkSpec): Promise<string> {
  const S = sp.size * SCALE;
  const c = canvas(S, S);
  const g = ctx(c);
  let fs = S * 1.8;
  const ch = '\u201C';
  function fit() {
    g.font = `bold ${fs}px ${SERIF}`;
    return g.measureText(ch);
  }
  let m = fit();
  let w = m.actualBoundingBoxLeft + m.actualBoundingBoxRight;
  let h = m.actualBoundingBoxAscent + m.actualBoundingBoxDescent;
  if (w > 0 && h > 0) {
    fs *= Math.min((S * 0.94) / w, (S * 0.94) / h);
    m = fit();
    w = m.actualBoundingBoxLeft + m.actualBoundingBoxRight;
    h = m.actualBoundingBoxAscent + m.actualBoundingBoxDescent;
  }
  g.fillStyle = addStops(
    g.createLinearGradient(0, 0, S, S),
    sp.stops && sp.stops.length ? sp.stops : ['#B83B5E', '#F08A5D'],
  );
  g.fillText(ch, (S - w) / 2 + m.actualBoundingBoxLeft, (S - h) / 2 + m.actualBoundingBoxAscent);
  return finish(c);
}

/* ---------- the machine-readable strip and the postmark ---------- */
/** Draws passport-style machine-readable lines in an even monospace grid. */
export function renderMrz(sp: MrzSpec): Promise<string> {
  const W = sp.w * SCALE;
  const H = sp.h * SCALE;
  const c = canvas(W, H);
  const g = ctx(c);
  const n = sp.lines.length;
  const lh = H / n;
  let fs = lh * 0.86;
  const adv = W / 44;
  g.font = `600 ${fs}px ${MONO}`;
  const cw = g.measureText('M').width;
  if (cw > adv * 0.95) {
    fs *= (adv * 0.95) / cw;
    g.font = `600 ${fs}px ${MONO}`;
  }
  g.fillStyle = sp.color;
  g.textBaseline = 'middle';
  sp.lines.forEach((ln, i) => {
    for (let j = 0; j < ln.length; j++) {
      const ch = ln.charAt(j);
      g.fillText(ch, j * adv + (adv - g.measureText(ch).width) / 2, i * lh + lh / 2);
    }
  });
  return finish(c);
}

/** Draws a round postmark with the city, the year and two wavy lines. */
export function renderPostmark(sp: PostmarkSpec): Promise<string> {
  const S = sp.size * SCALE;
  const c = canvas(S, S);
  const g = ctx(c);
  const R = S / 2 - SCALE * 1.5;
  g.strokeStyle = sp.color;
  g.fillStyle = sp.color;
  g.globalAlpha = 0.85;
  g.lineWidth = SCALE * 1.2;
  g.beginPath();
  g.arc(S / 2, S / 2, R, 0, Math.PI * 2);
  g.stroke();
  g.beginPath();
  g.arc(S / 2, S / 2, R - SCALE * 3, 0, Math.PI * 2);
  g.stroke();
  g.textAlign = 'center';
  g.textBaseline = 'middle';

  const city = (sp.city || '').toUpperCase().slice(0, 12);

  let fs = S * 0.17;
  g.font = `700 ${fs}px ${FONT}`;
  while (fs > S * 0.09 && g.measureText(city).width > R * 1.5) {
    fs -= 1;
    g.font = `700 ${fs}px ${FONT}`;
  }
  g.fillText(city, S / 2, S / 2 - S * 0.09);
  g.font = `600 ${S * 0.14}px ${FONT}`;
  g.fillText(sp.year || '', S / 2, S / 2 + S * 0.12);
  /* two wavy cancellation lines across the lower half */
  g.lineWidth = SCALE * 1;
  g.globalAlpha = 0.55;
  [0.66, 0.76].forEach((yy) => {
    g.beginPath();
    for (let x = S * 0.06; x <= S * 0.94; x += 1) {
      const y = S * yy + Math.sin(x / (S * 0.07)) * S * 0.025;
      if (x === S * 0.06) g.moveTo(x, y);
      else g.lineTo(x, y);
    }
    g.stroke();
  });
  return finish(c);
}

/* ---------- the small drawings: window dots, prompt marks, a blinking cursor and the agent's spinner ---------- */

/** Draws the three window dots of a code editor: red, yellow and green. */
export function renderDots(sp: DotsSpec): Promise<string> {
  const W = sp.w * SCALE;
  const H = sp.h * SCALE;
  const c = canvas(W, H);
  const g = ctx(c);
  const r = H / 2 - SCALE * 0.5;
  const step = (W - 2 * r - SCALE) / 2;
  ['#FF5F57', '#FEBC2E', '#28C840'].forEach((col, i) => {
    g.fillStyle = col;
    g.beginPath();
    g.arc(r + SCALE * 0.5 + i * step, H / 2, r, 0, Math.PI * 2);
    g.fill();
  });
  return finish(c);
}

/** Draws a small mark: a prompt chevron, a bullet, a tree branch or a tick. */
export function renderMark(sp: MarkSpec): Promise<string> {
  const S = sp.size * SCALE;
  const c = canvas(S, S);
  const g = ctx(c);
  g.strokeStyle = g.fillStyle = sp.color;
  g.lineWidth = Math.max(2, S * 0.13);
  g.lineCap = 'round';
  g.lineJoin = 'round';
  g.beginPath();
  if (sp.shape === 'prompt') {
    g.moveTo(S * 0.3, S * 0.2);
    g.lineTo(S * 0.7, S * 0.5);
    g.lineTo(S * 0.3, S * 0.8);
    g.stroke();
  } else if (sp.shape === 'bullet') {
    g.arc(S / 2, S / 2, S * 0.24, 0, Math.PI * 2);
    g.fill();
  } else if (sp.shape === 'tree') {
    g.moveTo(S * 0.32, S * 0.02);
    g.lineTo(S * 0.32, S * 0.56);
    g.lineTo(S * 0.9, S * 0.56);
    g.stroke();
  } else {
    g.moveTo(S * 0.18, S * 0.52);
    g.lineTo(S * 0.42, S * 0.76);
    g.lineTo(S * 0.84, S * 0.26);
    g.stroke();
  }
  return finish(c);
}

/**
 * Draws a text cursor. It blinks four times and stays on: under 5 seconds, played once (or looping if chosen).
 * Outlook for Windows shows it on.
 */
export function renderCursor(sp: CursorSpec): Promise<string> {
  const W = sp.w * SCALE;
  const H = sp.h * SCALE;
  const on = canvas(W, H);
  const off = canvas(W, H);
  ctx(on).fillStyle = sp.color;
  ctx(on).fillRect(0, 0, W, H);
  if (!sp.animated) return finish(on);
  const frames: ApngFrame[] = [];
  for (let i = 0; i < 4; i++) {
    frames.push(Object.assign(fullFrame(on), { delay: 530, dispose: 0, blend: 0 }));
    frames.push(Object.assign(fullFrame(off), { delay: 530, dispose: 0, blend: 0 }));
  }
  frames.push(Object.assign(fullFrame(on), { delay: 500, dispose: 0, blend: 0 }));
  return apng(W, H, frames, { plays: sp.motion === 'loop' ? 0 : 1, defaultImage: fullFrame(on) }).then(
    (u) => u || finish(on),
  );
}

/** Draws a four-point star that turns for about two seconds, then settles on a green tick. The still image is the tick. */
export function renderSpinner(sp: SpinnerSpec): Promise<string> {
  const S = sp.size * SCALE;
  const frames: ApngFrame[] = [];
  const N = 20;
  function star(g: CanvasRenderingContext2D, a: number) {
    g.save();
    g.translate(S / 2, S / 2);
    g.rotate(a);
    g.fillStyle = sp.color;
    g.beginPath();
    for (let k = 0; k < 8; k++) {
      const r = k % 2 ? S * 0.15 : S * 0.47;
      const t = (k * Math.PI) / 4;
      g.lineTo(Math.cos(t) * r, Math.sin(t) * r);
    }
    g.closePath();
    g.fill();
    g.restore();
  }
  const still = canvas(S, S);
  const gd = ctx(still);
  gd.strokeStyle = sp.ok;
  gd.lineWidth = Math.max(2, S * 0.14);
  gd.lineCap = 'round';
  gd.lineJoin = 'round';
  gd.beginPath();
  gd.moveTo(S * 0.18, S * 0.52);
  gd.lineTo(S * 0.42, S * 0.76);
  gd.lineTo(S * 0.84, S * 0.26);
  gd.stroke();
  if (!sp.animated) return finish(still);
  for (let i = 0; i < N; i++) {
    const c = canvas(S, S);
    star(ctx(c), (i * Math.PI) / 10);
    frames.push(Object.assign(fullFrame(c), { delay: 100, dispose: 0, blend: 0 }));
  }
  frames.push(Object.assign(fullFrame(still), { delay: 1000, dispose: 0, blend: 0 }));
  return apng(S, S, frames, { plays: 1, defaultImage: fullFrame(still) }).then((u) => u || finish(still));
}
