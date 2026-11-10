import { SCALE, SCRIPT_FONT } from '../html.ts';
import { apng } from '../png.ts';
import { addStops, canvas, cropFrame, ctx, finish, fullFrame } from './canvas.ts';
import { shapePath } from './shapes.ts';
import type { ApngFrame } from '../png.ts';
import type { AccentSpec, ContribSpec, MeshSpec, Motion, RenderedImage, ScriptSpec } from '../types.ts';

/** A rectangle in pixels. */
interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * Says how many times an animation plays. Accessible motion: animations play for at most
 * 5 seconds, then rest on the finished picture. "Keep looping" (`'loop'`) gives 0, which loops forever.
 */
export function playsFor(frames: readonly { delay: number }[], motion: Motion | undefined): number {
  if (motion === 'loop') return 0;
  const ms = frames.reduce((a, fr) => a + Math.max(20, Math.round(fr.delay)), 0);
  return Math.max(1, Math.floor(5000 / Math.max(1, ms)));
}

/* Frames are built so every decoder shows them the same way. iPhone Outlook (Apple's image decoder) mishandles the
   "revert to previous frame" disposal, which made photos vanish between frames, so no frame uses it:
   - band frames repaint the ring itself (1 px inside its edges, so soft edges never build up) over the last frame;
   - patch frames replace just the rectangle that changed (the last effect and the new one) with the full picture;
   every animation ends on a frame that puts back the finished picture. */
function boxOf(c: HTMLCanvasElement): Box | null {
  const f = cropFrame(c);
  return f.w === 1 && f.h === 1 && !f.data[3] ? null : { x: f.x, y: f.y, w: f.w, h: f.h };
}

function unionBox(a: Box | null, b: Box | null): Box | null {
  if (!a) return b;
  if (!b) return a;
  const x0 = Math.min(a.x, b.x);
  const y0 = Math.min(a.y, b.y);
  return { x: x0, y: y0, w: Math.max(a.x + a.w, b.x + b.w) - x0, h: Math.max(a.y + a.h, b.y + b.h) - y0 };
}

/**
 * Turns a finished picture and a list of effect layers into APNG frames. The first frame is the full
 * picture; each later frame patches only the area that changed (null adds a pause of `delay`), and a
 * last frame puts back the finished picture.
 */
export function patchFrames(
  base: HTMLCanvasElement,
  effects: readonly (HTMLCanvasElement | null)[],
  delay: number,
  firstDelay: number,
  endDelay?: number,
): ApngFrame[] {
  const W = base.width;
  const H = base.height;
  const BD = ctx(base).getImageData(0, 0, W, H).data;
  let prev: Box | null = null;
  const frames: ApngFrame[] = [
    { x: 0, y: 0, w: W, h: H, data: BD, delay: firstDelay, dispose: 0, blend: 0, dither: true },
  ];
  /* the picture with the effect laid over it, worked out pixel by pixel so untouched pixels stay exactly as in the first frame */
  function patch(u: Box, fx: HTMLCanvasElement | null): Uint8ClampedArray {
    const out = new Uint8ClampedArray(u.w * u.h * 4);
    const ed = fx ? ctx(fx).getImageData(u.x, u.y, u.w, u.h).data : null;
    for (let y = 0; y < u.h; y++)
      for (let x = 0; x < u.w; x++) {
        const i = (y * u.w + x) * 4;
        const j = ((u.y + y) * W + u.x + x) * 4;
        const ea = ed ? ed[i + 3] / 255 : 0;
        /* ea is 0 whenever ed is null */
        if (!ea || !ed) {
          out[i] = BD[j];
          out[i + 1] = BD[j + 1];
          out[i + 2] = BD[j + 2];
          out[i + 3] = BD[j + 3];
          continue;
        }
        const ba = (BD[j + 3] / 255) * (1 - ea);
        const ao = ea + ba;
        for (let k = 0; k < 3; k++) out[i + k] = Math.round((ed[i + k] * ea + BD[j + k] * ba) / ao);
        out[i + 3] = Math.round(ao * 255);
      }
    return out;
  }
  for (const fx of effects) {
    const box = fx ? boxOf(fx) : null;
    const u = unionBox(prev, box);
    if (!u) {
      frames[frames.length - 1].delay += delay;
      continue;
    }
    frames.push({
      x: u.x,
      y: u.y,
      w: u.w,
      h: u.h,
      data: patch(u, box ? fx : null),
      delay,
      dispose: 0,
      blend: 0,
      reuse: true,
    });
    prev = box;
  }
  if (prev)
    frames.push({
      x: prev.x,
      y: prev.y,
      w: prev.w,
      h: prev.h,
      data: patch(prev, null),
      delay: endDelay || 120,
      dispose: 0,
      blend: 0,
      reuse: true,
    });
  return frames;
}

/** A point in a mesh. */
interface MeshNode {
  x: number;
  y: number;
}

/** Draws a mesh of joined dots in the theme gradient. When animated, a light runs along it. */
export function renderMesh(sp: MeshSpec): Promise<string> {
  const W = sp.w * SCALE;
  const H = sp.h * SCALE;
  const N = 8;
  const nodes: MeshNode[] = [];
  let i: number;
  for (i = 0; i < N; i++)
    nodes.push({
      x: 10 * SCALE + ((W - 20 * SCALE) * i) / (N - 1),
      y: H * (i % 2 ? 0.3 : 0.7) + (i % 3 === 0 ? -H * 0.08 : H * 0.06),
    });
  const edges: [number, number][] = [];
  for (i = 0; i < N - 1; i++) edges.push([i, i + 1]);
  for (i = 0; i < N - 2; i += 2) edges.push([i, i + 2]);
  const grad = (g: CanvasRenderingContext2D) => addStops(g.createLinearGradient(0, 0, W, 0), sp.stops);
  const base = canvas(W, H);
  const g = ctx(base);
  g.lineCap = 'round';
  edges.forEach((e, k) => {
    g.globalAlpha = k < N - 1 ? 0.75 : 0.35;
    g.strokeStyle = grad(g);
    g.lineWidth = 1.5 * SCALE;
    g.beginPath();
    g.moveTo(nodes[e[0]].x, nodes[e[0]].y);
    g.lineTo(nodes[e[1]].x, nodes[e[1]].y);
    g.stroke();
  });
  g.globalAlpha = 1;
  nodes.forEach((n) => {
    g.fillStyle = grad(g);
    g.beginPath();
    g.arc(n.x, n.y, 4 * SCALE, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#FFFFFF';
    g.beginPath();
    g.arc(n.x, n.y, 1.6 * SCALE, 0, Math.PI * 2);
    g.fill();
  });
  if (!sp.animated) return finish(base);
  const segs: { a: MeshNode; b: MeshNode; l: number; s: number }[] = [];
  let L = 0;
  for (i = 0; i < N - 1; i++) {
    const dx = nodes[i + 1].x - nodes[i].x;
    const dy = nodes[i + 1].y - nodes[i].y;
    const l = Math.sqrt(dx * dx + dy * dy);
    segs.push({ a: nodes[i], b: nodes[i + 1], l, s: L });
    L += l;
  }
  const F = 18;
  const fx: HTMLCanvasElement[] = [];
  for (let fI = 0; fI < F; fI++) {
    const t = (L * (fI + 0.5)) / F;

    const seg = segs.find((q) => t >= q.s && t <= q.s + q.l) || segs[segs.length - 1];

    const u = (t - seg.s) / seg.l;
    const px = seg.a.x + (seg.b.x - seg.a.x) * u;
    const py = seg.a.y + (seg.b.y - seg.a.y) * u;
    const c = canvas(W, H);
    const gg = ctx(c);
    gg.shadowColor = sp.accent;
    gg.shadowBlur = 4 * SCALE;
    gg.fillStyle = '#FFFFFF';
    gg.beginPath();
    gg.arc(px, py, 2.6 * SCALE, 0, Math.PI * 2);
    gg.fill();
    const near = nodes.find((n) => Math.abs(n.x - px) < 7 * SCALE && Math.abs(n.y - py) < 7 * SCALE);
    if (near) {
      gg.shadowBlur = 6 * SCALE;
      gg.fillStyle = 'rgba(255,255,255,0.9)';
      gg.beginPath();
      gg.arc(near.x, near.y, 3 * SCALE, 0, Math.PI * 2);
      gg.fill();
    }
    fx.push(c);
  }
  const frames = patchFrames(base, fx, 75, 900);
  return apng(W, H, frames, { plays: playsFor(frames, sp.motion) }).then((u) => u || finish(base));
}

/** Draws a contribution-graph grid. When animated, a wave of brighter squares crosses it. */
export function renderContrib(sp: ContribSpec): Promise<string> {
  const cell = sp.cell * SCALE;
  const gap = sp.gap * SCALE;
  const W = sp.cols * (cell + gap) - gap;
  const H = sp.rows * (cell + gap) - gap;
  const COL = ['rgba(140,149,159,0.24)', '#9BE9A8', '#40C463', '#30A14E', '#216E39'];
  const lv: number[][] = [];
  let x: number;
  let y: number;
  let seed = 7;
  function rnd() {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  }
  for (x = 0; x < sp.cols; x++) {
    lv[x] = [];
    for (y = 0; y < sp.rows; y++) {
      const base0 = 0.35 + 0.5 * (x / sp.cols) + 0.2 * Math.sin(x * 0.9 + y);
      lv[x][y] = Math.max(0, Math.min(4, Math.floor(rnd() * 2.2 + base0 * 2.2) - 1));
    }
  }
  function draw(g: CanvasRenderingContext2D, X: number, Y: number, level: number) {
    g.fillStyle = COL[level];
    shapePath(g, 'rounded', X * (cell + gap), Y * (cell + gap), cell, cell);
    g.fill();
  }
  const base = canvas(W, H);
  const bgc = ctx(base);
  for (x = 0; x < sp.cols; x++) for (y = 0; y < sp.rows; y++) draw(bgc, x, y, lv[x][y]);
  if (!sp.animated) return finish(base);
  const F = 22;
  const fx: (HTMLCanvasElement | null)[] = [];
  for (let fI = 0; fI < F; fI++) {
    const p = -3 + ((sp.cols + 6) * fI) / (F - 1);
    const c = canvas(W, H);
    const g = ctx(c);
    let any = false;
    for (x = 0; x < sp.cols; x++)
      for (y = 0; y < sp.rows; y++) {
        const d = Math.abs(x + y * 0.5 - p);
        if (d < 2.2) {
          const boost = d < 0.8 ? 3 : d < 1.6 ? 2 : 1;
          const L2 = Math.min(4, Math.max(lv[x][y], 1) + boost);
          if (L2 !== lv[x][y]) {
            draw(g, x, y, L2);
            any = true;
          }
        }
      }
    fx.push(any ? c : null);
  }
  const frames = patchFrames(base, fx, 60, 1600);
  return apng(W, H, frames, { plays: playsFor(frames, sp.motion) }).then((u) => u || finish(base));
}

/** Sets a name in the script font. When animated, it is revealed from left to right. */
export function renderScript(sp: ScriptSpec): Promise<RenderedImage> {
  const fs = sp.size * SCALE;
  const font = `400 ${fs}px ${SCRIPT_FONT}`;
  const m = ctx(canvas(8, 8));
  m.font = font;
  const tw = Math.ceil(m.measureText(sp.text).width);
  const padX = Math.round(fs * 0.3);
  let W = tw + padX * 2;
  let H = Math.round(fs * 1.5);
  W += W % 2;
  H += H % 2;
  const full = canvas(W, H);
  const g = ctx(full);
  g.font = font;
  g.fillStyle = sp.color;
  g.textBaseline = 'middle';
  g.fillText(sp.text, padX, H * 0.54);
  const dims = { w: W / SCALE, h: H / SCALE, base: Math.min(H, H * 0.54 + fs * 0.3) / SCALE };
  if (!sp.animated)
    return finish(full).then((u) => ({
      url: u,
      w: dims.w,
      h: dims.h,
      base: dims.base,
    }));
  const frames: ApngFrame[] = [
    { x: 0, y: 0, w: W, h: H, data: new Uint8ClampedArray(W * H * 4), delay: 300, dispose: 0, blend: 0 },
  ];
  const N = 26;
  let prev = 0;
  for (let i = 1; i <= N; i++) {
    const xe = Math.round((W * i) / N);
    const sw = xe - prev;
    if (sw <= 0) continue;
    frames.push({
      x: prev,
      y: 0,
      w: sw,
      h: H,
      data: g.getImageData(prev, 0, sw, H).data,
      delay: i === N ? 4000 : 40,
      dispose: 0,
      blend: 1,
    });
    prev = xe;
  }
  return apng(W, H, frames, { plays: 1, defaultImage: fullFrame(full) }).then((u) =>
    u
      ? { url: u, w: dims.w, h: dims.h }
      : finish(full).then((v) => ({
          url: v,
          w: dims.w,
          h: dims.h,
        })),
  );
}

/** Draws the theme gradient as a thin line. When animated, a soft shine passes along it once. */
export function renderShimmer(sp: AccentSpec): Promise<string> {
  const W = 200 * SCALE;
  const H = 6 * SCALE;
  const base = canvas(W, H);
  const g = ctx(base);
  g.fillStyle = addStops(g.createLinearGradient(0, 0, W, 0), sp.colors);
  g.fillRect(0, 0, W, H);
  if (!sp.animated) return finish(base);
  const F = 16;
  const sigma = 0.075 * W;
  const fx: HTMLCanvasElement[] = [];
  for (let i = 0; i < F; i++) {
    const cx = -0.3 * W + (1.6 * W * (i + 0.5)) / F;
    const c = canvas(W, H);
    const gg = ctx(c);
    const gr = gg.createLinearGradient(cx - 3 * sigma, 0, cx + 3 * sigma, 0);
    /* a bell curve that reaches exactly zero at both ends, so no faint pixels are left beside the shine */
    const tail = Math.exp(-4.5);
    for (let k = 0; k <= 12; k++) {
      const d = (k / 12) * 6 - 3;
      gr.addColorStop(
        k / 12,
        `rgba(255,255,255,${((0.62 * (Math.exp(-(d * d) / 2) - tail)) / (1 - tail)).toFixed(3)})`,
      );
    }
    gg.fillStyle = gr;
    gg.fillRect(cx - 3 * sigma, 0, 6 * sigma, H);
    fx.push(c);
  }
  const frames = patchFrames(base, fx, 60, 2600);
  return apng(W, H, frames, { plays: playsFor(frames, sp.motion) }).then((u) => u || finish(base));
}

/* a four-point star: each side curves in toward the centre */
function star(g: CanvasRenderingContext2D, x: number, y: number, r: number, rot: number): void {
  const tip = (k: number): [number, number] => {
    const a = rot + (k * Math.PI) / 2 - Math.PI / 2;
    return [Math.cos(a) * r, Math.sin(a) * r];
  };
  g.beginPath();
  const [x0, y0] = tip(0);
  g.moveTo(x + x0, y + y0);
  for (let k = 0; k < 4; k++) {
    const [ax, ay] = tip(k);
    const [bx, by] = tip(k + 1);
    g.bezierCurveTo(x + ax * 0.3, y + ay * 0.3, x + bx * 0.3, y + by * 0.3, x + bx, y + by);
  }
  g.closePath();
  g.fill();
}

/** Draws a white sparkle on a square in the theme colour. When animated, it twinkles once and settles. */
export function renderSparkle(sp: AccentSpec): Promise<string> {
  const S = 18 * SCALE;
  const draw = (ph: number): HTMLCanvasElement => {
    const c = canvas(S, S);
    const g = ctx(c);
    g.fillStyle = sp.colors[0] || '#0F6CBD';
    g.fillRect(0, 0, S, S);
    g.fillStyle = '#FFFFFF';
    const k = 0.88 + 0.12 * Math.cos(2 * Math.PI * ph);
    const small = 0.7 + 0.3 * Math.cos(2 * Math.PI * (ph - 0.25));
    star(g, 0.43 * S, 0.57 * S, 0.36 * S * k, ((14 * Math.PI) / 180) * Math.sin(2 * Math.PI * ph));
    star(g, 0.76 * S, 0.25 * S, 0.17 * S * small, 0);
    return c;
  };
  const base = draw(0);
  if (!sp.animated) return finish(base);
  const F = 13;
  const fx: HTMLCanvasElement[] = [];
  for (let i = 1; i <= F; i++) fx.push(draw(i / (F + 1)));
  const frames = patchFrames(base, fx, 60, 2000);
  return apng(S, S, frames, { plays: playsFor(frames, sp.motion) }).then((u) => u || finish(base));
}
