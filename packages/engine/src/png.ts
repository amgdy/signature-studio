/* ---------- PNG-8 and animated PNG encoders ---------- */

/** A rectangle of RGBA pixels, ready to become an image frame. */
export interface FrameData {
  x: number;
  y: number;
  w: number;
  h: number;
  data: Uint8ClampedArray;
}

/** One frame of an animated PNG. */
export interface ApngFrame extends FrameData {
  /** Time on screen in milliseconds (at least 20 ms is written). */
  delay: number;
  /** APNG dispose op. Never 2 ("revert to previous"): iPhone Outlook flickers. */
  dispose: number;
  /** APNG blend op: 0 replaces the area, 1 draws over it. */
  blend: number;
  /** Spread colour errors to hide banding. Used for full pictures. */
  dither?: boolean;
  /** Reuse the first frame's colours wherever this frame repeats its pixels. */
  reuse?: boolean;
}

/** Options for `apng()`. */
export interface ApngOptions {
  /** How many times the animation plays. 0 loops forever. */
  plays?: number;
  /** Still picture shown by clients without APNG support. It is not part of the animation. */
  defaultImage?: FrameData;
}

/** A frame or still picture to encode. */
type EncodeImage = FrameData & { dither?: boolean; reuse?: boolean };

/** A colour box in median-cut quantising: pixel indexes, the channel to split and its priority. */
interface ColorBox {
  list: number[];
  ch: number;
  score: number;
}

/** Palette colours as [r, g, b, a]. Entry 0 is fully transparent. */
type Palette = number[][];

/** Finds the palette index nearest to a colour. */
type Nearest = (r: number, g: number, b: number, a: number) => number;

const CRC = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

/** Works out the CRC-32 checksum of some bytes, as PNG and ZIP use it. */
export function crc32(u: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < u.length; i++) c = CRC[(c ^ u[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function quantize(px: Uint8ClampedArray, n: number, maxColors: number): Palette {
  const solid: number[] = [];
  const soft: number[] = [];
  let i;
  let k;
  for (i = 0; i < n; i++) {
    const al = px[i * 4 + 3];
    if (al === 255) solid.push(i);
    else if (al > 0) soft.push(i);
  }
  /* solid and see-through pixels never share a colour, so solid areas stay fully solid */
  /* ch and score start at 0 and are set by stats() before they are read */
  const boxes: ColorBox[] = [
    { list: solid, ch: 0, score: 0 },
    { list: soft, ch: 0, score: 0 },
  ].filter((b) => b.list.length);
  function stats(b: ColorBox) {
    const mn = [255, 255, 255, 255];
    const mx = [0, 0, 0, 0];
    const l = b.list;
    for (let a = 0; a < l.length; a++) {
      const o = l[a] * 4;
      for (let c = 0; c < 4; c++) {
        const vv = px[o + c];
        if (vv < mn[c]) mn[c] = vv;
        if (vv > mx[c]) mx[c] = vv;
      }
    }
    let best = 0;
    let range = -1;
    for (let c2 = 0; c2 < 4; c2++) {
      const r = (mx[c2] - mn[c2]) * (c2 === 3 ? 1.5 : 1);
      if (r > range) {
        range = r;
        best = c2;
      }
    }
    b.ch = best;
    b.score = range * Math.sqrt(l.length);
  }
  boxes.forEach(stats);
  while (boxes.length < maxColors - 1) {
    let bi = -1;
    let bs = 0;
    for (k = 0; k < boxes.length; k++)
      if (boxes[k].list.length > 1 && boxes[k].score > bs) {
        bs = boxes[k].score;
        bi = k;
      }
    if (bi < 0) break;
    const b = boxes[bi];
    const ch = b.ch;
    b.list.sort((p, q) => px[p * 4 + ch] - px[q * 4 + ch]);
    const mid = b.list.length >> 1;
    const nb: ColorBox = { list: b.list.slice(mid), ch: 0, score: 0 };
    b.list = b.list.slice(0, mid);
    stats(b);
    stats(nb);
    boxes.push(nb);
  }
  const pal: Palette = [[0, 0, 0, 0]];
  boxes.forEach((bx) => {
    if (!bx.list.length) return;
    const sm = [0, 0, 0, 0];
    bx.list.forEach((p) => {
      for (let c = 0; c < 4; c++) sm[c] += px[p * 4 + c];
    });
    pal.push(sm.map((vv) => Math.round(vv / bx.list.length)));
  });
  return pal;
}

function nearestFactory(pal: Palette): Nearest {
  const memo = new Map<number, number>();
  return (r, g, b, a) => {
    const key = ((r >> 2) << 18) | ((g >> 2) << 12) | ((b >> 2) << 6) | (a >> 2);
    const hit = memo.get(key);
    if (hit !== undefined) return hit;
    let best = 0;
    let bd = Infinity;
    for (let i = 1; i < pal.length; i++) {
      const p = pal[i];
      const dr = r - p[0];
      const dg = g - p[1];
      const db = b - p[2];
      const da = a - p[3];
      const d = dr * dr * 0.3 + dg * dg * 0.59 + db * db * 0.11 + da * da * 1.2;
      if (d < bd) {
        bd = d;
        best = i;
      }
    }
    memo.set(key, best);
    return best;
  };
}

function mapIdx(
  data: Uint8ClampedArray,
  w: number,
  h: number,
  pal: Palette,
  near: Nearest,
  dither: boolean,
): Uint8Array {
  const idx = new Uint8Array(w * h);
  /* px is set exactly when dithering, so checking px is the same as checking dither */
  const px = dither ? Float32Array.from(data) : null;
  const spread = [
    [1, 0, 7 / 16],
    [-1, 1, 3 / 16],
    [0, 1, 5 / 16],
    [1, 1, 1 / 16],
  ];
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const o = (y * w + x) * 4;
      const a = data[o + 3];
      if (!a) {
        idx[y * w + x] = 0;
        continue;
      }
      const r = px ? Math.max(0, Math.min(255, px[o])) : data[o];
      const g = px ? Math.max(0, Math.min(255, px[o + 1])) : data[o + 1];
      const b = px ? Math.max(0, Math.min(255, px[o + 2])) : data[o + 2];
      const p = near(r | 0, g | 0, b | 0, a);
      idx[y * w + x] = p;
      if (px && a === 255) {
        const er = r - pal[p][0];
        const eg = g - pal[p][1];
        const eb = b - pal[p][2];
        for (let sI = 0; sI < 4; sI++) {
          const nx = x + spread[sI][0];
          const ny = y + spread[sI][1];
          if (nx < 0 || nx >= w || ny >= h) continue;
          const q = (ny * w + nx) * 4;
          if (data[q + 3] !== 255) continue;
          px[q] += er * spread[sI][2] * 0.75;
          px[q + 1] += eg * spread[sI][2] * 0.75;
          px[q + 2] += eb * spread[sI][2] * 0.75;
        }
      }
    }
  return idx;
}

function rawRows(idx: Uint8Array, w: number, h: number): Uint8Array<ArrayBuffer> {
  const raw = new Uint8Array((w + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (w + 1)] = 0;
    raw.set(idx.subarray(y * w, (y + 1) * w), y * (w + 1) + 1);
  }
  return raw;
}

function b64(u8: Uint8Array): string {
  let s = '';
  const C = 0x8000;
  for (let i = 0; i < u8.length; i += C) s += String.fromCharCode(...u8.subarray(i, i + C));
  return btoa(s);
}

function deflate(u8: Uint8Array<ArrayBuffer>): Promise<Uint8Array<ArrayBuffer>> {
  const cs = new CompressionStream('deflate');
  return new Response(new Blob([u8]).stream().pipeThrough(cs)).arrayBuffer().then((ab) => new Uint8Array(ab));
}

function cat(parts: Uint8Array[]): Uint8Array<ArrayBuffer> {
  const len = parts.reduce((t, u) => t + u.length, 0);
  const all = new Uint8Array(len);
  let off = 0;
  parts.forEach((u) => {
    all.set(u, off);
    off += u.length;
  });
  return all;
}

function be32(n: number): number[] {
  return [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255];
}

function be16(n: number): number[] {
  return [(n >>> 8) & 255, n & 255];
}

function pngChunk(type: string, data: Uint8Array): Uint8Array {
  const out = new Uint8Array(12 + data.length);
  const dv = new DataView(out.buffer);
  dv.setUint32(0, data.length);
  for (let i = 0; i < 4; i++) out[4 + i] = type.charCodeAt(i);
  out.set(data, 8);
  dv.setUint32(8 + data.length, crc32(out.subarray(4, 8 + data.length)));
  return out;
}

function headerChunks(W: number, H: number, pal: Palette) {
  const ihdr = new Uint8Array(13);
  const dv = new DataView(ihdr.buffer);
  dv.setUint32(0, W);
  dv.setUint32(4, H);
  ihdr[8] = 8;
  ihdr[9] = 3;
  const plte = new Uint8Array(pal.length * 3);
  const trns = new Uint8Array(pal.length);
  pal.forEach((p, j) => {
    plte[j * 3] = p[0];
    plte[j * 3 + 1] = p[1];
    plte[j * 3 + 2] = p[2];
    trns[j] = p[3];
  });
  return { ihdr: pngChunk('IHDR', ihdr), plte: pngChunk('PLTE', plte), trns: pngChunk('tRNS', trns) };
}

const SIG = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);

/** Encodes a canvas as an 8-bit palette PNG data URL, or a plain PNG when that is smaller. */
export function png8(c: HTMLCanvasElement): Promise<string> {
  if (typeof CompressionStream === 'undefined') return Promise.resolve(c.toDataURL('image/png'));
  const w = c.width;
  const h = c.height;
  const g = c.getContext('2d');
  if (!g) throw new Error('Canvas 2D context is not available');
  const src = g.getImageData(0, 0, w, h).data;
  const pal = quantize(src, w * h, 256);
  const idx = mapIdx(src, w, h, pal, nearestFactory(pal), true);
  const hc = headerChunks(w, h, pal);
  return deflate(rawRows(idx, w, h)).then(
    (z) => {
      const opt = `data:image/png;base64,${b64(cat([SIG, hc.ihdr, hc.plte, hc.trns, pngChunk('IDAT', z), pngChunk('IEND', new Uint8Array(0))]))}`;

      const plain = c.toDataURL('image/png');
      return opt.length < plain.length ? opt : plain;
    },
    () => c.toDataURL('image/png'),
  );
}

/**
 * Encodes frames as an animated PNG data URL. Frame 0 must be the full canvas.
 * `o.defaultImage` is a still picture for clients without APNG support; it is kept out of the animation.
 * Resolves to null when the browser cannot compress.
 */
export function apng(W: number, H: number, frames: ApngFrame[], o: ApngOptions = {}): Promise<string | null> {
  if (typeof CompressionStream === 'undefined') return Promise.resolve(null);
  const imgs: EncodeImage[] = (o.defaultImage ? [o.defaultImage] : []).concat(frames);
  let total = 0;
  imgs.forEach((fr) => {
    for (let i = 3; i < fr.data.length; i += 4) if (fr.data[i]) total++;
  });
  const stride = Math.max(1, Math.ceil(total / 150000));
  const sample = new Uint8ClampedArray((Math.ceil(total / stride) + 1) * 4);
  let n = 0;
  let k = 0;
  imgs.forEach((fr) => {
    const d = fr.data;
    for (let i = 0; i < d.length; i += 4)
      if (d[i + 3]) {
        if (k++ % stride === 0) {
          sample[n * 4] = d[i];
          sample[n * 4 + 1] = d[i + 1];
          sample[n * 4 + 2] = d[i + 2];
          sample[n * 4 + 3] = d[i + 3];
          n++;
        }
      }
  });
  const pal = quantize(sample, n, 256);
  const near = nearestFactory(pal);
  const hc = headerChunks(W, H, pal);

  /* patch frames reuse the first frame's colour choices wherever they repeat its pixels, so unchanged areas never shimmer */
  const f0 = frames[0];

  let idx0: Uint8Array | null = null;
  function idxOf(fr: EncodeImage): Uint8Array {
    if (fr.reuse && idx0 && f0.w === W && f0.h === H) {
      const out = new Uint8Array(fr.w * fr.h);
      const d = fr.data;
      const b = f0.data;
      for (let y = 0; y < fr.h; y++)
        for (let x = 0; x < fr.w; x++) {
          const i = y * fr.w + x;
          const j = (fr.y + y) * W + fr.x + x;
          const p = i * 4;
          const q = j * 4;
          out[i] =
            d[p] === b[q] && d[p + 1] === b[q + 1] && d[p + 2] === b[q + 2] && d[p + 3] === b[q + 3]
              ? idx0[j]
              : d[p + 3]
                ? near(d[p], d[p + 1], d[p + 2], d[p + 3])
                : 0;
        }
      return out;
    }
    const m = mapIdx(fr.data, fr.w, fr.h, pal, near, !!fr.dither);
    if (fr === f0) idx0 = m;
    return m;
  }
  return Promise.all(imgs.map((fr) => deflate(rawRows(idxOf(fr), fr.w, fr.h)))).then(
    (zs) => {
      const parts = [
        SIG,
        hc.ihdr,
        pngChunk('acTL', new Uint8Array(be32(frames.length).concat(be32(o.plays || 0)))),
        hc.plte,
        hc.trns,
      ];

      let seq = 0;
      let zi = 0;
      function fctl(fr: ApngFrame) {
        return pngChunk(
          'fcTL',
          new Uint8Array([
            ...be32(seq++),
            ...be32(fr.w),
            ...be32(fr.h),
            ...be32(fr.x),
            ...be32(fr.y),
            ...be16(Math.max(20, Math.round(fr.delay))),
            ...be16(1000),
            fr.dispose || 0,
            fr.blend || 0,
          ]),
        );
      }
      function fdat(z: Uint8Array) {
        const s0 = be32(seq++);
        return pngChunk('fdAT', cat([new Uint8Array(s0), z]));
      }
      if (o.defaultImage) {
        parts.push(pngChunk('IDAT', zs[zi++]));
        frames.forEach((fr) => {
          parts.push(fctl(fr));
          parts.push(fdat(zs[zi++]));
        });
      } else {
        parts.push(fctl(frames[0]));
        parts.push(pngChunk('IDAT', zs[zi++]));
        for (let fI = 1; fI < frames.length; fI++) {
          parts.push(fctl(frames[fI]));
          parts.push(fdat(zs[zi++]));
        }
      }
      parts.push(pngChunk('IEND', new Uint8Array(0)));
      return `data:image/png;base64,${b64(cat(parts))}`;
    },
    () => null,
  );
}
