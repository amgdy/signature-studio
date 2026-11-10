import { SAMPLE_PHOTO } from '../data/sample-photo.ts';
import { SCALE } from '../html.ts';
import { apng } from '../png.ts';
import { addStops, canvas, ctx, finish, fullFrame, loadImg } from './canvas.ts';
import { patchFrames, playsFor } from './effects.ts';
import { conic, ringTrack, shapePath, sparklePath } from './shapes.ts';
import type { ApngFrame, ApngOptions } from '../png.ts';
import type { PhotoRing, PhotoSettings, PhotoSpec } from '../types.ts';

/** Where the photo comes from: the signature's photo settings, if any. Empty uses the sample photo. */
export interface PhotoSource {
  photo?: PhotoSettings;
}

/** A canvas fill or stroke style. */
type Paint = string | CanvasGradient;
/** Makes a paint for a given context. */
type PaintFn = (g: CanvasRenderingContext2D) => Paint;
/** Draws on a context: an effect, or a clip path. */
type DrawFn = (g: CanvasRenderingContext2D) => void;

function rgb255(hex: string): number[] {
  const h = hex.replace('#', '');
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
}

/* photo looks: natural, black and white, sepia, or a duotone in the theme's colours */
function applyLook(c: HTMLCanvasElement, sp: PhotoSpec): void {
  if (!sp.look || sp.look === 'natural') return;
  const g = ctx(c);
  const id = g.getImageData(0, 0, c.width, c.height);
  const d = id.data;
  const duo = sp.duo ? sp.duo.map(rgb255) : null;
  for (let i = 0; i < d.length; i += 4) {
    if (!d[i + 3]) continue;
    const r = d[i];
    const gg = d[i + 1];
    const b = d[i + 2];
    const L = 0.299 * r + 0.587 * gg + 0.114 * b;
    if (sp.look === 'mono') {
      const v = Math.min(255, Math.max(0, (L - 128) * 1.1 + 128));
      d[i] = d[i + 1] = d[i + 2] = v;
    } else if (sp.look === 'sepia') {
      d[i] = Math.min(255, r * 0.393 + gg * 0.769 + b * 0.189);
      d[i + 1] = Math.min(255, r * 0.349 + gg * 0.686 + b * 0.168);
      d[i + 2] = Math.min(255, r * 0.272 + gg * 0.534 + b * 0.131);
    } else if (duo) {
      const t = (L / 255) ** 0.85;
      for (let k = 0; k < 3; k++) d[i + k] = duo[0][k] + (duo[1][k] - duo[0][k]) * t;
    }
  }
  g.putImageData(id, 0, 0);
}

/** Draws a photo in its shape, ring, look and animation, as a PNG, APNG or JPEG data URL. */
export function renderPhoto(sp: PhotoSpec, s: PhotoSource): Promise<string> {
  const src = (s.photo && s.photo.src) || SAMPLE_PHOTO;
  return loadImg(src).then((im) => {
    const S = sp.size * SCALE;
    const shape = sp.shape || 'circle';

    const ring: PhotoRing | null = shape === 'polaroid' || shape === 'layers' || shape === 'stamp' ? null : sp.ring;

    const rw = ring ? ring.w * SCALE : 0;
    const gap = ring ? (ring.gap || 0) * SCALE : 0;
    const anim = sp.anim || 'none';
    const motion = sp.motion || 'brief';
    const inset = rw + gap;
    const inner = S - 2 * inset;
    /* the photo cropped, zoomed and in its look, bw pixels square */
    function photoCanvas(bw: number): HTMLCanvasElement {
      bw = Math.round(bw);
      const c = canvas(bw, bw);
      const g = ctx(c);
      const z = (s.photo && s.photo.zoom) || 1;
      const dx = (s.photo && s.photo.dx) || 0;
      const dy = (s.photo && s.photo.dy) || 0;
      const iw = im.naturalWidth;
      const ih = im.naturalHeight;
      const k = Math.max(bw / iw, bw / ih) * z;
      const dw = iw * k;
      const dh = ih * k;
      g.imageSmoothingEnabled = true;
      g.imageSmoothingQuality = 'high';
      g.drawImage(im, (bw - dw) / 2 + dx * bw, (bw - dh) / 2 + dy * bw, dw, dh);
      applyLook(c, sp);
      return c;
    }
    function ringPath(g: CanvasRenderingContext2D): void {
      shapePath(g, shape, rw / 2, rw / 2, S - rw, S - rw);
    }
    function strokeRing(g: CanvasRenderingContext2D, paint: Paint, width?: number): void {
      g.save();
      g.strokeStyle = paint;
      g.lineWidth = width || rw;
      g.lineJoin = 'round';
      ringPath(g);
      g.stroke();
      g.restore();
    }
    function linearPaint(g: CanvasRenderingContext2D): Paint {
      if (ring && ring.stops) return addStops(g.createLinearGradient(0, 0, S, S), ring.stops);
      if (ring && ring.color !== undefined) return ring.color;
      throw new Error('The photo ring has no colour');
    }
    function play(frames: ApngFrame[], fallback: HTMLCanvasElement, extra?: ApngOptions): Promise<string> {
      return apng(S, S, frames, Object.assign({ plays: playsFor(frames, motion) }, extra || {})).then(
        (u) => u || finish(fallback),
      );
    }

    /* band frames: the ring repainted with crisp edges 1 px inside its own edges, any effect kept inside it; band pixels the
       effect leaves alone are copied from the plain ring, so nothing builds up and the last frame matches the first */
    const bandW = Math.max(1, rw - 2);

    let ringPaint: PaintFn = linearPaint;
    let BR: Uint8ClampedArray | null = null;
    let plainBand: Uint8ClampedArray | null = null;
    function snapRing(): void {
      BR = bg.getImageData(0, 0, S, S).data;
      plainBand = null;
    }
    function bandPixels(paint: PaintFn, effect: DrawFn | null): Uint8ClampedArray {
      const c = canvas(S, S);
      const g = ctx(c);
      g.save();
      g.strokeStyle = paint(g);
      g.lineWidth = bandW;
      g.lineJoin = 'round';
      ringPath(g);
      g.stroke();
      g.restore();
      if (effect) {
        g.save();
        g.globalCompositeOperation = 'source-atop';
        effect(g);
        g.restore();
      }
      return g.getImageData(0, 0, S, S).data;
    }
    function bandFrame(paint: PaintFn | null, effect: DrawFn | null, delay: number): ApngFrame {
      if (!BR) throw new Error('snapRing() must run before bandFrame()');
      const d = bandPixels(paint || ringPaint, effect);
      const pl = paint ? null : plainBand || (plainBand = bandPixels(ringPaint, null));
      for (let q = 0; q < d.length; q += 4) {
        if (d[q + 3] < 128 || BR[q + 3] !== 255) {
          d[q] = d[q + 1] = d[q + 2] = d[q + 3] = 0;
          continue;
        }
        if (pl && d[q] === pl[q] && d[q + 1] === pl[q + 1] && d[q + 2] === pl[q + 2] && d[q + 3] === pl[q + 3]) {
          d[q] = BR[q];
          d[q + 1] = BR[q + 1];
          d[q + 2] = BR[q + 2];
        }
        d[q + 3] = 255;
      }
      return { x: 0, y: 0, w: S, h: S, data: d, delay, dispose: 0, blend: 1, reuse: true };
    }
    function first(delay: number): ApngFrame {
      return Object.assign(fullFrame(base), { delay, dispose: 0, blend: 0, dither: true });
    }
    /* a soft glare that crosses the photo, as patches */
    function shine(baseC: HTMLCanvasElement, clip: DrawFn): Promise<string> {
      const fx: HTMLCanvasElement[] = [];
      const N2 = 9;
      for (let j = 0; j < N2; j++) {
        const c = canvas(S, S);
        const g = ctx(c);
        const x0 = S * (-0.1 + (1.2 * j) / (N2 - 1));
        const bw = S * 0.11;
        g.save();
        clip(g);
        g.clip();
        const gr = g.createLinearGradient(x0 - bw, 0, x0 + bw, 0);
        gr.addColorStop(0, 'rgba(255,255,255,0)');
        gr.addColorStop(0.5, 'rgba(255,255,255,0.42)');
        gr.addColorStop(1, 'rgba(255,255,255,0)');
        g.fillStyle = gr;
        g.fillRect(x0 - bw, 0, 2 * bw, S);
        g.restore();
        fx.push(c);
      }
      return play(patchFrames(baseC, fx, 60, 1800), baseC);
    }
    const base = canvas(S, S);
    const bg = ctx(base);
    if (shape === 'stamp') {
      /* a postage stamp: the photo on white stamp paper with perforated edges and a soft shadow */
      const m3 = S * 0.05;

      const pw3 = S - 2 * m3;
      const n3 = 8;
      const st3 = pw3 / n3;
      const r3 = st3 * 0.27;
      const pc = canvas(S, S);
      const pg = ctx(pc);
      pg.fillStyle = '#FFFFFF';
      pg.fillRect(m3, m3, pw3, pw3);
      pg.globalCompositeOperation = 'destination-out';
      for (let q3 = 0; q3 <= n3; q3++) {
        const t3 = m3 + q3 * st3;
        [
          [t3, m3],
          [t3, m3 + pw3],
          [m3, t3],
          [m3 + pw3, t3],
        ].forEach((pt) => {
          pg.beginPath();
          pg.arc(pt[0], pt[1], r3, 0, Math.PI * 2);
          pg.fill();
        });
      }
      pg.globalCompositeOperation = 'source-over';
      bg.save();
      bg.shadowColor = 'rgba(0,0,0,0.25)';
      bg.shadowBlur = S * 0.03;
      bg.shadowOffsetY = S * 0.008;
      bg.drawImage(pc, 0, 0);
      bg.restore();
      const in3 = Math.round(m3 + pw3 * 0.1);
      const iw3 = S - 2 * in3;

      const sclip = (g: CanvasRenderingContext2D) => {
        g.beginPath();
        g.rect(in3, in3, iw3, iw3);
      };

      bg.drawImage(photoCanvas(iw3), in3, in3, iw3, iw3);
      bg.strokeStyle = 'rgba(0,0,0,0.14)';
      bg.lineWidth = Math.max(1, SCALE / 2);
      bg.strokeRect(in3, in3, iw3, iw3);
      if (anim !== 'none') return shine(base, sclip);
      return finish(base);
    }
    if (shape === 'layers') {
      /* Fluent layers: the photo on a rounded card with a soft shadow, a tilted card in the theme gradient behind it */
      const F = Math.round(S * 0.8);

      const bw2 = Math.max(2, Math.round(S * 0.022));
      const lst = sp.stops || [sp.accent, sp.accent];
      const tilt = 0.1;
      const half = (F / 2) * (Math.cos(tilt) + Math.sin(tilt));
      bg.save();
      bg.translate(S - half - 1, S - half - 1);
      bg.rotate(tilt);
      const lg = bg.createLinearGradient(-F / 2, -F / 2, F / 2, F / 2);
      addStops(lg, lst);
      bg.fillStyle = lg;
      shapePath(bg, 'rounded', -F / 2, -F / 2, F, F);
      bg.fill();
      bg.restore();
      bg.save();
      bg.shadowColor = 'rgba(0,0,0,0.24)';
      bg.shadowBlur = S * 0.035;
      bg.shadowOffsetY = S * 0.012;
      bg.fillStyle = '#FFFFFF';
      shapePath(bg, 'rounded', 0, 0, F, F);
      bg.fill();
      bg.restore();
      const lin = F - 2 * bw2;

      const lclip = (g: CanvasRenderingContext2D) => {
        shapePath(g, 'rounded', bw2, bw2, lin, lin);
      };

      bg.save();
      lclip(bg);
      bg.clip();
      bg.drawImage(photoCanvas(lin), bw2, bw2, lin, lin);
      bg.restore();
      if (anim !== 'none') return shine(base, lclip);
      return finish(base);
    }
    if (shape === 'polaroid') {
      const m = S * 0.06;
      const fw = S - 2 * m;
      const ang = -0.06;
      const w2 = fw * 0.88;
      const h2 = fw;
      const px = -w2 / 2;
      const py = -h2 / 2;
      const pad = w2 * 0.07;
      const pw = w2 - 2 * pad;
      bg.save();
      bg.translate(S / 2, S / 2);
      bg.rotate(ang);
      bg.shadowColor = 'rgba(0,0,0,0.28)';
      bg.shadowBlur = S * 0.045;
      bg.shadowOffsetY = S * 0.012;
      bg.fillStyle = '#FFFFFF';
      bg.fillRect(px, py, w2, h2);
      bg.shadowColor = 'rgba(0,0,0,0)';
      bg.strokeStyle = 'rgba(0,0,0,0.08)';
      bg.lineWidth = 1;
      bg.strokeRect(px, py, w2, h2);
      bg.drawImage(photoCanvas(pw), px + pad, py + pad, pw, pw);
      bg.restore();
      if (anim !== 'none')
        return shine(base, (g) => {
          g.translate(S / 2, S / 2);
          g.rotate(ang);
          g.beginPath();
          g.rect(px + pad, py + pad, pw, pw);
          g.setTransform(1, 0, 0, 1, 0, 0);
        });
      return finish(base);
    }
    if (sp.fmt === 'jpeg') {
      bg.fillStyle = '#FFFFFF';
      bg.fillRect(0, 0, S, S);
    }
    bg.save();
    shapePath(bg, shape, inset, inset, inner, inner);
    bg.clip();
    bg.drawImage(photoCanvas(inner), inset, inset, inner, inner);
    bg.restore();
    const photoClip = (g: CanvasRenderingContext2D) => {
      shapePath(g, shape, inset, inset, inner, inner);
    };
    if (!ring || anim === 'none' || anim === 'shine') {
      if (ring) strokeRing(bg, linearPaint(bg));
      if (anim === 'shine') return shine(base, photoClip);
      return sp.fmt === 'jpeg' ? base.toDataURL('image/jpeg', 0.9) : finish(base);
    }
    let frames: ApngFrame[] = [];
    const track = ringTrack(shape, S, rw);
    let N: number;
    let i: number;
    const fx2: (HTMLCanvasElement | null)[] = [];
    if (anim === 'draw') {
      /* the ring is drawn once round the photo and stays: each frame adds the next piece of ring */
      const full = canvas(S, S);

      const gf = ctx(full);
      gf.drawImage(base, 0, 0);
      strokeRing(gf, linearPaint(gf));
      frames.push(first(250));
      N = 18;
      for (i = 1; i <= N; i++) {
        const c8 = canvas(S, S);
        const g8 = ctx(c8);
        const t0 = (i - 1) / N;
        const t1 = i / N;
        const steps = 10;
        const p0 = track.at(t0);
        g8.strokeStyle = linearPaint(g8);
        g8.lineWidth = rw;
        g8.lineCap = 'round';
        g8.lineJoin = 'round';
        g8.beginPath();
        g8.moveTo(p0.x, p0.y);
        /* lift the pen where the ring jumps to the next piece (Slices), so no line crosses a gap */
        for (let k = 1, prv = p0, jump = (track.L / N / steps) * 4; k <= steps; k++) {
          const pp = track.at(t0 + ((t1 - t0) * k) / steps);
          if (Math.hypot(pp.x - prv.x, pp.y - prv.y) > jump) g8.moveTo(pp.x, pp.y);
          else g8.lineTo(pp.x, pp.y);
          prv = pp;
        }
        g8.stroke();
        frames.push(Object.assign(fullFrame(c8), { delay: i === N ? 600 : 45, dispose: 0, blend: 1 }));
      }
      return play(frames, full, { plays: 1, defaultImage: fullFrame(full) });
    }
    if (anim === 'spin') {
      const rep = 3;
      const period = (2 * Math.PI) / rep;
      N = 8;
      /* a ring has gradient stops or one colour */
      const spinStops = ring.stops || (ring.color === undefined ? [] : [ring.color, ring.color]);
      ringPaint = (g) => conic(g, -Math.PI / 2, S / 2, S / 2, spinStops, rep);
      strokeRing(bg, ringPaint(bg));
      snapRing();
      frames.push(first(110));
      for (i = 1; i <= N; i++)
        frames.push(
          bandFrame(
            i === N ? null : (g) => conic(g, -Math.PI / 2 + (period * i) / N, S / 2, S / 2, spinStops, rep),
            null,
            110,
          ),
        );
    } else if (anim === 'sweep') {
      strokeRing(bg, linearPaint(bg));
      snapRing();
      N = 12;
      frames.push(first(1500));
      for (i = 0; i <= N; i++)
        frames.push(
          bandFrame(
            null,
            i === N || typeof bg.createConicGradient !== 'function'
              ? null
              : (g) => {
                  const hg = g.createConicGradient(-Math.PI / 2 + (2 * Math.PI * i) / N, S / 2, S / 2);
                  hg.addColorStop(0, 'rgba(255,255,255,0)');
                  hg.addColorStop(0.09, 'rgba(255,255,255,0.45)');
                  hg.addColorStop(0.15, 'rgba(255,255,255,0.95)');
                  hg.addColorStop(0.16, 'rgba(255,255,255,0)');
                  hg.addColorStop(1, 'rgba(255,255,255,0)');
                  g.fillStyle = hg;
                  g.fillRect(0, 0, S, S);
                },
            75,
          ),
        );
    } else if (anim === 'pulse') {
      /* the ring brightens and fades back */
      strokeRing(bg, linearPaint(bg));
      snapRing();
      N = 12;
      frames.push(first(700));
      for (i = 1; i <= N; i++) {
        const a = Math.sin((Math.PI * i) / N);
        frames.push(
          bandFrame(
            null,
            a < 0.02
              ? null
              : (g) => {
                  g.fillStyle = `rgba(255,255,255,${(0.7 * a).toFixed(3)})`;
                  g.fillRect(0, 0, S, S);
                },
            60,
          ),
        );
      }
    } else if (anim === 'comet') {
      /* a bright head with a fading tail runs round inside the ring */
      strokeRing(bg, linearPaint(bg));
      snapRing();
      N = 20;
      frames.push(first(900));
      for (i = 1; i <= N; i++)
        frames.push(
          bandFrame(
            null,
            i === N
              ? null
              : (g) => {
                  const t0 = i / N;
                  const tail = 0.24;
                  const st = 18;
                  g.lineCap = 'round';
                  g.lineWidth = rw * 1.6;
                  for (let q = 0; q < st; q++) {
                    const pa = track.at(t0 - tail * (1 - q / st));
                    const pb = track.at(t0 - tail * (1 - (q + 1) / st));
                    g.strokeStyle = `rgba(255,255,255,${((0.95 * (q + 1)) / st).toFixed(3)})`;
                    g.beginPath();
                    g.moveTo(pa.x, pa.y);
                    g.lineTo(pb.x, pb.y);
                    g.stroke();
                  }
                  const hd = track.at(t0);
                  g.fillStyle = '#FFFFFF';
                  g.beginPath();
                  g.arc(hd.x, hd.y, rw, 0, Math.PI * 2);
                  g.fill();
                },
            50,
          ),
        );
    } else if (anim === 'dash') {
      /* white dashes march round the ring */
      const dl = track.L / 18;
      const dashes = (off: number) => (g: CanvasRenderingContext2D) => {
        g.setLineDash([dl * 0.55, dl * 1.45]);
        g.lineDashOffset = off;
        g.lineCap = 'butt';
        g.strokeStyle = 'rgba(255,255,255,0.85)';
        g.lineWidth = rw * 2;
        ringPath(g);
        g.stroke();
      };
      strokeRing(bg, linearPaint(bg));
      snapRing();
      const d0 = bandFrame(null, dashes(0), 0);
      const dc = canvas(S, S);
      ctx(dc).putImageData(new ImageData(new Uint8ClampedArray(d0.data), S, S), 0, 0);
      bg.drawImage(dc, 0, 0);
      N = 12;
      frames.push(first(85));
      for (i = 1; i <= N; i++) frames.push(bandFrame(null, dashes((-2 * dl * (i % N)) / N), 85));
    } else if (anim === 'sparkle') {
      /* small stars twinkle in turn on the ring (patches) */
      strokeRing(bg, linearPaint(bg));
      N = 24;
      const stars = [0.07, 0.32, 0.58, 0.84].map((t, j) => {
        const pt = track.at(t);
        return {
          x: pt.x + (S / 2 - pt.x) * 0.05,
          y: pt.y + (S / 2 - pt.y) * 0.05,
          r: Math.max(rw * 2.4, 5 * SCALE) * (j % 2 ? 0.72 : 1),
        };
      });
      for (i = 0; i < N; i++) {
        if (i && i % 6 === 0) fx2.push(null);
        const c7 = canvas(S, S);
        const g7 = ctx(c7);
        const st2 = stars[Math.floor(i / 6)];
        const ph = ((i % 6) + 1) / 7;
        const al = Math.sin(Math.PI * ph);
        g7.globalAlpha = al;
        g7.shadowColor = sp.accent;
        g7.shadowBlur = st2.r * 0.7;
        g7.fillStyle = '#FFFFFF';
        sparklePath(g7, st2.x, st2.y, st2.r * (0.45 + 0.55 * al), ph * 2);
        g7.fill();
        fx2.push(c7);
      }
      frames = patchFrames(base, fx2, 75, 300);
    } else {
      /* orbit: a sparkle travels round the ring (patches) */
      strokeRing(bg, linearPaint(bg));
      N = 16;
      for (i = 1; i < N; i++) {
        const c3 = canvas(S, S);
        const g3 = ctx(c3);
        const pt3 = track.at(i / N);
        const r3 = Math.max(rw * 2, 6 * SCALE);
        g3.shadowColor = sp.accent || '#0F6CBD';
        g3.shadowBlur = r3 * 0.5;
        g3.fillStyle = '#FFFFFF';
        sparklePath(g3, pt3.x, pt3.y, r3, (i / N) * Math.PI);
        g3.fill();
        g3.shadowBlur = 0;
        g3.fill();
        fx2.push(c3);
      }
      frames = patchFrames(base, fx2, 110, 400);
    }
    if (frames.length < 2) return finish(base);
    return play(frames, base);
  });
}
