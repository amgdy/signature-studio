import { SCALE } from '../html.ts';
import { hwFont, hwLayout } from '../name.ts';
import { apng } from '../png.ts';
import { canvas, ctx, finish, fullFrame } from './canvas.ts';
import { renderScript } from './effects.ts';
import type { ApngFrame } from '../png.ts';
import type { HandPen, HandSpec, RenderedImage } from '../types.ts';
import type { Point } from './shapes.ts';

/** Pen size: the sample spacing and the base nib width, in pixels. */
interface PenUnit {
  step: number;
  w: number;
}

/** One ink stamp (an ellipse) and, when animated, the time it is drawn. */
interface Stamp {
  x: number;
  y: number;
  rx: number;
  ry: number;
  a: number;
  t?: number;
  s?: WorkStroke;
}

/** One pen stroke in pixels. The flourish is the swash under the name. */
interface HandStroke {
  word: number;
  pts: Point[];
  flourish?: boolean;
}

/** A pen stroke with its smoothed samples and ink stamps. */
interface WorkStroke extends HandStroke {
  samples: Point[];
  stamps: Stamp[];
}

/* the point at `u` (0 to 1) between p1 and p2 on a centripetal Catmull-Rom curve */
function crp(p0: Point, p1: Point, p2: Point, p3: Point, u: number): Point {
  const t1 = Math.sqrt(Math.hypot(p1[0] - p0[0], p1[1] - p0[1])) || 1e-3;
  const t2 = t1 + (Math.sqrt(Math.hypot(p2[0] - p1[0], p2[1] - p1[1])) || 1e-3);
  const t3 = t2 + (Math.sqrt(Math.hypot(p3[0] - p2[0], p3[1] - p2[1])) || 1e-3);
  const t = t1 + (t2 - t1) * u;
  function L(a: Point, b: Point, ta: number, tb: number): Point {
    const w = (t - ta) / (tb - ta);
    return [a[0] + (b[0] - a[0]) * w, a[1] + (b[1] - a[1]) * w];
  }
  const A1 = L(p0, p1, 0, t1);
  const A2 = L(p1, p2, t1, t2);
  const A3 = L(p2, p3, t2, t3);
  return L(L(A1, A2, 0, t2), L(A2, A3, t1, t3), t1, t2);
}

/* centripetal Catmull-Rom through the font's points, split at sharp turns, resampled every `step` px */
function hwSmooth(pts: Point[], step: number): Point[] {
  const n = pts.length;
  const dense: Point[] = [pts[0]];
  if (n === 1) return [pts[0]];
  function sharp(i: number): boolean {
    if (i <= 0 || i >= n - 1) return true;
    const a = pts[i - 1];
    const b = pts[i];
    const c = pts[i + 1];
    const ux = b[0] - a[0];
    const uy = b[1] - a[1];
    const vx = c[0] - b[0];
    const vy = c[1] - b[1];
    const lu = Math.hypot(ux, uy);
    const lv = Math.hypot(vx, vy);
    return !lu || !lv || (ux * vx + uy * vy) / (lu * lv) < 0.26;
  }
  for (let i = 0; i < n - 1; i++) {
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const len = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]);
    if (!len) continue;
    const p0: Point = sharp(i) ? [2 * p1[0] - p2[0], 2 * p1[1] - p2[1]] : pts[i - 1];
    const p3: Point = sharp(i + 1) ? [2 * p2[0] - p1[0], 2 * p2[1] - p1[1]] : pts[i + 2];
    const m = Math.max(1, Math.ceil(len / (step * 0.5)));
    for (let k = 1; k <= m; k++) dense.push(k === m ? p2 : crp(p0, p1, p2, p3, k / m));
  }
  const out: Point[] = [dense[0]];
  let acc = 0;
  for (let i = 1; i < dense.length; i++) {
    let a = dense[i - 1];
    const b = dense[i];
    let d = Math.hypot(b[0] - a[0], b[1] - a[1]);
    while (acc + d >= step) {
      const w = (step - acc) / d;
      a = [a[0] + (b[0] - a[0]) * w, a[1] + (b[1] - a[1]) * w];
      out.push(a);
      d = Math.hypot(b[0] - a[0], b[1] - a[1]);
      acc = 0;
    }
    acc += d;
  }
  const last = dense[dense.length - 1];
  const tail = out[out.length - 1];
  if (Math.hypot(last[0] - tail[0], last[1] - tail[1]) > step * 0.2) out.push(last);
  return out;
}

/* one ink stamp per sample: {x, y, rx, ry, a, t}. Pens: fountain = broad italic nib (thin up-strokes, full down-strokes),
   brush = pointed brush (pressure on down-strokes, tapered ends), fine = even fine liner. */
function hwStamps(samples: Point[], unit: PenUnit, pen: HandPen | 'swash'): Stamp[] {
  const n = samples.length;
  const L = (n - 1) * unit.step;
  const st: Stamp[] = [];
  if (n === 1 || L < unit.w * 0.6) {
    const c = samples[Math.floor(n / 2)];
    return [{ x: c[0], y: c[1], rx: unit.w * 0.85, ry: unit.w * 0.85, a: 0 }];
  }
  const dirY: number[] = [];
  const press: number[] = [];
  for (let i = 0; i < n; i++) {
    const a = samples[Math.max(0, i - 2)];
    const b = samples[Math.min(n - 1, i + 2)];
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const dl = Math.hypot(dx, dy) || 1;
    dirY.push(dy / dl);
  }
  for (let i = 0; i < n; i++) {
    let sum = 0;
    let cnt = 0;
    for (let k = Math.max(0, i - 5); k <= Math.min(n - 1, i + 5); k++) {
      sum += Math.max(0, dirY[k]);
      cnt++;
    }
    press.push(sum / cnt);
  }
  for (let i = 0; i < n; i++) {
    const p = samples[i];
    const l = i * unit.step;
    if (pen === 'swash') {
      const f = Math.sin(Math.PI * Math.min(1, Math.max(0, l / L))) ** 0.7;
      const r = unit.w * (0.2 + 0.42 * f);
      st.push({ x: p[0], y: p[1], rx: r, ry: r, a: 0 });
    } else if (pen === 'fountain') {
      const f = 0.55 + 0.45 * Math.min(1, l / (unit.w * 1.6), (L - l) / (unit.w * 1.2));
      st.push({ x: p[0], y: p[1], rx: unit.w * 1.18 * f, ry: unit.w * 0.36 * Math.max(f, 0.8), a: -0.7 });
    } else if (pen === 'fine') {
      const f = 0.7 + 0.3 * Math.min(1, l / (unit.w * 1.5), (L - l) / (unit.w * 1.5));
      const r = unit.w * 0.62 * f;
      st.push({ x: p[0], y: p[1], rx: r, ry: r, a: 0 });
    } else {
      const fin = Math.min(1, l / (unit.w * 3.2));
      const fout = Math.min(1, (L - l) / (unit.w * 4.5));
      const f = Math.sqrt(Math.min(fin, fout));
      const r = unit.w * (0.3 + 0.86 * press[i] ** 1.2) * (0.38 + 0.62 * f);
      st.push({ x: p[0], y: p[1], rx: r, ry: r, a: 0 });
    }
  }
  return st;
}

function hwAddStamp(path: Path2D, s: Stamp): void {
  if (s.rx === s.ry) {
    path.moveTo(s.x + s.rx, s.y);
    path.arc(s.x, s.y, s.rx, 0, Math.PI * 2);
  } else {
    path.moveTo(s.x + s.rx * Math.cos(s.a), s.y + s.rx * Math.sin(s.a));
    path.ellipse(s.x, s.y, s.rx, s.ry, s.a, 0, Math.PI * 2);
  }
}

/**
 * Renders a handwritten name. Animated names are written stroke by stroke as an
 * APNG that plays once. Falls back to the script font when the font cannot write the text.
 */
export function renderHand(sp: HandSpec): Promise<RenderedImage> {
  const F = hwFont(sp.style);
  const lay = F && hwLayout(F, sp.text);
  /* lay is empty whenever F is, so testing F too changes nothing */
  if (!F || !lay)
    return renderScript({ kind: 'script', text: sp.text, size: sp.size, color: sp.color, animated: false });
  const fs = sp.size * SCALE;
  const sc = (fs * 1.32 * (F.k || 1)) / F.upm;
  const step = 0.6;
  const unit: PenUnit = { step, w: Math.max(fs * 0.034, 2.1) };
  const strokes: HandStroke[] = lay.strokes.map((s) => ({
    word: s.word,
    pts: s.pts.map((p): Point => [p[0] * sc, -p[1] * sc]),
  }));
  if (sp.flourish) {
    let x0 = Infinity;
    let x1 = -Infinity;
    let yb = -Infinity;
    let yTop = Infinity;
    strokes.forEach((s) => {
      s.pts.forEach((p) => {
        if (p[0] < x0) x0 = p[0];
        if (p[0] > x1) x1 = p[0];
        if (p[1] > yb) yb = p[1];
        if (p[1] < yTop) yTop = p[1];
      });
    });
    const wd = x1 - x0;
    const y0 = yb + fs * 0.04;
    const fl: Point[] = [];
    const P: Point[] = [
      [x0 + wd * 0.1, y0 + fs * 0.01],
      [x0 + wd * 0.42, y0 + fs * 0.17],
      [x0 + wd * 0.86, y0 + fs * 0.07],
      [x1 + wd * 0.05, y0 - fs * 0.3],
    ];
    for (let q = 0; q <= 24; q++) {
      const u = q / 24;
      const v = 1 - u;
      fl.push([
        v * v * v * P[0][0] + 3 * v * v * u * P[1][0] + 3 * v * u * u * P[2][0] + u * u * u * P[3][0],
        v * v * v * P[0][1] + 3 * v * v * u * P[1][1] + 3 * v * u * u * P[2][1] + u * u * u * P[3][1],
      ]);
    }
    strokes.push({ word: -1, flourish: true, pts: fl });
  }
  const all: WorkStroke[] = [];
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  strokes.forEach((s) => {
    const smp = hwSmooth(s.pts, step);
    const sts = hwStamps(smp, unit, s.flourish ? 'swash' : sp.pen);
    sts.forEach((t) => {
      const e = Math.max(t.rx, t.ry);
      if (t.x - e < minX) minX = t.x - e;
      if (t.y - e < minY) minY = t.y - e;
      if (t.x + e > maxX) maxX = t.x + e;
      if (t.y + e > maxY) maxY = t.y + e;
    });
    all.push(Object.assign(s, { samples: smp, stamps: sts }));
  });
  const pad = 3;
  let W = Math.ceil(maxX - minX + pad * 2);
  let H = Math.ceil(maxY - minY + pad * 2);
  const ox = pad - minX;
  const oy = pad - minY;
  W += W % 2;
  H += H % 2;
  const stamps: Stamp[] = [];
  all.forEach((s) => {
    s.stamps.forEach((t) => {
      t.x += ox;
      t.y += oy;
      t.s = s;
      stamps.push(t);
    });
  });
  const dims = { w: W / SCALE, h: H / SCALE, base: oy / SCALE };
  const hx = (sp.color || '#0F6CBD').replace('#', '');
  const INK = [0, 2, 4].map((i) => parseInt(hx.slice(i, i + 2), 16) || 0);
  function rendered(u: string): RenderedImage {
    return { url: u, w: dims.w, h: dims.h, base: dims.base };
  }
  function solid(d: Uint8ClampedArray): Uint8ClampedArray {
    for (let i = 0; i < d.length; i += 4) {
      if (d[i + 3]) {
        d[i] = INK[0];
        d[i + 1] = INK[1];
        d[i + 2] = INK[2];
      } else {
        d[i] = d[i + 1] = d[i + 2] = 0;
      }
    }
    return d;
  }
  if (!sp.animated) {
    const full = canvas(W, H);
    const g = ctx(full, { willReadFrequently: true });
    const path = new Path2D();
    stamps.forEach((t) => {
      hwAddStamp(path, t);
    });
    g.fillStyle = sp.color;
    // oxlint-disable-next-line no-array-fill-with-reference-type -- a canvas fill with a Path2D, not Array#fill
    g.fill(path);
    const im = g.getImageData(0, 0, W, H);
    solid(im.data);
    g.putImageData(im, 0, 0);
    return finish(full).then(rendered);
  }

  /* timing: pen speed slows in tight turns, pauses on pen lifts and between words */
  let t = 0;

  let prev: WorkStroke | null = null;
  const fsN = fs;
  all.forEach((s) => {
    if (prev) {
      const a = prev.samples[prev.samples.length - 1];
      const b = s.samples[0];
      t +=
        0.05 +
        Math.min(0.16, Math.hypot(b[0] - a[0], b[1] - a[1]) / (fsN * 9)) +
        (s.word !== prev.word ? (s.flourish ? 0.12 : 0.16) : 0);
    }
    const smp = s.samples;
    const n = smp.length;
    const spd: number[] = [];
    for (let i = 0; i < n; i++) {
      const A = smp[Math.max(0, i - 3)];
      const B = smp[i];
      const C = smp[Math.min(n - 1, i + 3)];
      const a1 = Math.atan2(B[1] - A[1], B[0] - A[0]);
      const a2 = Math.atan2(C[1] - B[1], C[0] - B[0]);
      let da = Math.abs(a2 - a1);
      if (da > Math.PI) da = 2 * Math.PI - da;
      const arc = Math.max(step, Math.hypot(C[0] - A[0], C[1] - A[1]));
      const rad = da > 1e-4 ? arc / da : 1e9;
      spd.push(0.38 + 0.62 * Math.min(1, rad / (fsN * 0.45)));
    }
    const vmax = fsN * (s.flourish ? 13 : 7.2);
    for (let i = 0; i < n; i++) {
      let sm = 0;
      let c2 = 0;
      for (let k = Math.max(0, i - 6); k <= Math.min(n - 1, i + 6); k++) {
        sm += spd[k];
        c2++;
      }
      s.stamps[Math.min(i, s.stamps.length - 1)].t = t;
      if (i) t += step / ((vmax * sm) / c2);
    }
    s.stamps.forEach((st) => {
      if (st.t === undefined) st.t = t;
    });
    prev = s;
  });
  let ink = 0;
  all.forEach((s) => {
    if (!s.flourish) ink += (s.samples.length - 1) * step;
  });
  const target = Math.max(1.5, Math.min(2.8, ink / (fs * 24))) + (sp.flourish ? 0.45 : 0);
  const k2 = target / (t || 1);
  /* every stamp has a time by now: the loop above gives one to each */
  const times = stamps.map((st) => (st.t ?? 0) * k2);
  const total = t * k2;
  const dt = 0.04;
  const frames: ApngFrame[] = [
    { x: 0, y: 0, w: W, h: H, data: new Uint8ClampedArray(W * H * 4), delay: 350, dispose: 0, blend: 0 },
  ];
  const cv = canvas(W, H);
  const cg = ctx(cv, { willReadFrequently: true });
  let done0 = 0;
  cg.fillStyle = sp.color;
  for (let tt = dt; done0 < stamps.length; tt += dt) {
    let upto = done0;
    while (upto < stamps.length && times[upto] <= tt + 1e-9) upto++;
    if (tt >= total) upto = stamps.length;
    if (upto === done0) {
      frames[frames.length - 1].delay += dt * 1000;
      continue;
    }
    let rx0 = Infinity;
    let ry0 = Infinity;
    let rx1 = -Infinity;
    let ry1 = -Infinity;
    for (let j = done0; j < upto; j++) {
      const st2 = stamps[j];
      const e2 = Math.max(st2.rx, st2.ry) + 1;
      rx0 = Math.min(rx0, st2.x - e2);
      ry0 = Math.min(ry0, st2.y - e2);
      rx1 = Math.max(rx1, st2.x + e2);
      ry1 = Math.max(ry1, st2.y + e2);
    }
    rx0 = Math.max(0, Math.floor(rx0));
    ry0 = Math.max(0, Math.floor(ry0));
    rx1 = Math.min(W, Math.ceil(rx1));
    ry1 = Math.min(H, Math.ceil(ry1));
    const local = new Path2D();
    const rw = rx1 - rx0;
    const rh = ry1 - ry0;
    for (let j = 0; j < upto; j++) {
      const s3 = stamps[j];
      const e3 = Math.max(s3.rx, s3.ry) + 1.5;
      if (s3.x + e3 >= rx0 && s3.x - e3 <= rx1 && s3.y + e3 >= ry0 && s3.y - e3 <= ry1) hwAddStamp(local, s3);
    }
    const before = cg.getImageData(rx0, ry0, rw, rh).data;
    cg.save();
    cg.beginPath();
    cg.rect(rx0, ry0, rw, rh);
    cg.clip();
    cg.clearRect(rx0, ry0, rw, rh);
    // oxlint-disable-next-line no-array-fill-with-reference-type -- a canvas fill with a Path2D, not Array#fill
    cg.fill(local);
    cg.restore();

    /* each frame carries only the new ink, blended over what is already written: exact for a single ink colour */
    const after = cg.getImageData(rx0, ry0, rw, rh).data;

    const fr = new Uint8ClampedArray(after.length);
    let bx0 = rw;
    let by0 = rh;
    let bx1 = -1;
    let by1 = -1;
    for (let q = 0, px = 0; q < after.length; q += 4, px++) {
      let na = after[q + 3];
      const oa = before[q + 3];
      if (na < oa) {
        after[q + 3] = na = oa;
      }
      if (na) {
        after[q] = INK[0];
        after[q + 1] = INK[1];
        after[q + 2] = INK[2];
      }
      if (na > oa && oa < 255) {
        const fa = Math.round((255 * (na - oa)) / (255 - oa));
        if (fa > 0) {
          fr[q] = INK[0];
          fr[q + 1] = INK[1];
          fr[q + 2] = INK[2];
          fr[q + 3] = fa;
          const cx = px % rw;
          const cy = (px / rw) | 0;
          if (cx < bx0) bx0 = cx;
          if (cx > bx1) bx1 = cx;
          if (cy < by0) by0 = cy;
          if (cy > by1) by1 = cy;
        }
      }
    }
    done0 = upto;
    cg.putImageData(new ImageData(after, rw, rh), rx0, ry0);
    if (bx1 < 0) {
      frames[frames.length - 1].delay += dt * 1000;
      continue;
    }
    const cw2 = bx1 - bx0 + 1;
    const ch2 = by1 - by0 + 1;
    const crop = new Uint8ClampedArray(cw2 * ch2 * 4);
    for (let yy = 0; yy < ch2; yy++)
      crop.set(fr.subarray(((by0 + yy) * rw + bx0) * 4, ((by0 + yy) * rw + bx0 + cw2) * 4), yy * cw2 * 4);
    frames.push({ x: rx0 + bx0, y: ry0 + by0, w: cw2, h: ch2, data: crop, delay: dt * 1000, dispose: 0, blend: 1 });
  }
  frames[frames.length - 1].delay = 3000;
  const fin = cg.getImageData(0, 0, W, H);
  solid(fin.data);
  cg.putImageData(fin, 0, 0);
  return apng(W, H, frames, { plays: 1, defaultImage: fullFrame(cv) }).then((u) =>
    u ? rendered(u) : finish(cv).then(rendered),
  );
}
