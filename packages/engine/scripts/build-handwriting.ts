/**
 * Builds `src/data/hwfonts.json`: single-line (stroke) script fonts for handwritten names.
 *
 * Source: the EMS single-line SVG fonts in `assets-src/fonts` by Sheldon B. Michaels and
 * Windell H. Oskay (Evil Mad Scientist Laboratories), SIL Open Font License 1.1.
 * Glyph outlines are flattened to polylines, simplified, and stored as VLQ-encoded integer deltas.
 *
 * Run: pnpm --filter @signature-studio/engine data:handwriting [--check]
 * With --check it only compares the result with the committed file and fails if they differ.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

type Point = readonly [number, number];

interface FontSource {
  readonly id: string;
  readonly label: string;
  readonly file: string;
  readonly from: string;
  readonly designer: string;
}

interface FontOut {
  label: string;
  from: string;
  designer: string;
  upm: number;
  asc: number;
  desc: number;
  /** Glyphs in source order: char -> [advance, comma-separated VLQ strokes]. */
  g: Map<string, [number, string]>;
  k: number;
}

const FONTS: readonly FontSource[] = [
  { id: 'allure', label: 'Signature', file: 'EMSAllure', from: 'Allura', designer: 'Rob Leuschke, TypeSETit' },
  { id: 'swiss', label: 'Flowing', file: 'EMSSwiss', from: 'Italianno', designer: 'Rob Leuschke, TypeSETit' },
  {
    id: 'society',
    label: 'Autograph',
    file: 'EMSSociety',
    from: 'Mrs Saint Delafield',
    designer: 'Alejandro Paul, Sudtipos',
  },
  { id: 'brush', label: 'Brush script', file: 'EMSBrush', from: 'Alex Brush', designer: 'Rob Leuschke, TypeSETit' },
  {
    id: 'decorous',
    label: 'Classic cursive',
    file: 'EMSDecorousScript',
    from: 'Petit Formal Script',
    designer: 'Impallari Type',
  },
  { id: 'neato', label: 'Casual', file: 'EMSNeato', from: 'Bad Script', designer: 'Roman Shchyukin, Gaslight' },
  { id: 'bird', label: 'Calligraphic', file: 'EMSBird', from: 'Bilbo', designer: 'Rob Leuschke, TypeSETit' },
  {
    id: 'capitol',
    label: 'Looped',
    file: 'EMSCapitol',
    from: 'Sacramento',
    designer: 'Brian J. Bonislawsky, Astigmatic',
  },
  {
    id: 'casualhand',
    label: 'Loose print',
    file: 'EMSCasualHand',
    from: 'Covered By Your Grace',
    designer: 'Kimberly Geswein',
  },
  {
    id: 'readability',
    label: 'Neat print',
    file: 'EMSReadability',
    from: 'Source Sans Pro-Light',
    designer: 'Paul D. Hunt, Adobe',
  },
];

const CREDIT =
  'Single-line adaptations by Sheldon B. Michaels and Windell H. Oskay (Evil Mad Scientist), under SIL Open Font License 1.1. Original font designers are credited in the included notices.';

const FONT_DIR = new URL('../assets-src/fonts/', import.meta.url);
const OUT_FILE = fileURLToPath(new URL('../src/data/hwfonts.json', import.meta.url));
const licenseFile = readFileSync(new URL('OFL.txt', FONT_DIR), 'utf8').replace(/\r\n/g, '\n');
const licenseStart = licenseFile.indexOf('This Font Software is licensed');
if (licenseStart < 0) throw new Error('The OFL licence text is missing');
const LICENSE =
  FONTS.map((font) => {
    const source = readFileSync(new URL(`${font.file}.svg`, FONT_DIR), 'utf8');
    const metadata = source.match(/<metadata>([\s\S]*?)<\/metadata>/i)?.[1]?.trim();
    if (!metadata) throw new Error(`Missing attribution in ${font.file}.svg`);
    return metadata;
  }).join('\n\n') +
  '\n\n' +
  licenseFile.slice(licenseStart);

const TOKEN = /[MmLlHhVvCcSsQqTtZz]|[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?/g;
const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

/** Python's round(): halves go to the even neighbour. Keeps the output identical to the original generator. */
function roundHalfEven(x: number): number {
  const r = Math.round(x);
  return Math.abs(x % 1) === 0.5 && r % 2 !== 0 ? r - 1 : r;
}

/** Python's repr() for floats, as written by json.dump. */
function pyFloat(x: number): string {
  return Number.isInteger(x) ? `${x}.0` : String(x);
}

const mid = (a: Point, b: Point): Point => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];

/** Adaptive flattening: split until the control points are close to the chord. */
function cubic(p0: Point, p1: Point, p2: Point, p3: Point, out: Point[], tol = 0.6, depth = 0): void {
  const dx = p3[0] - p0[0];
  const dy = p3[1] - p0[1];
  const d1 = Math.abs((p1[0] - p3[0]) * dy - (p1[1] - p3[1]) * dx);
  const d2 = Math.abs((p2[0] - p3[0]) * dy - (p2[1] - p3[1]) * dx);
  const len = Math.hypot(dx, dy) || 1e-9;
  if (depth > 10 || (d1 + d2) / len < tol) {
    out.push(p3);
    return;
  }
  const p01 = mid(p0, p1);
  const p12 = mid(p1, p2);
  const p23 = mid(p2, p3);
  const p012 = mid(p01, p12);
  const p123 = mid(p12, p23);
  const c = mid(p012, p123);
  cubic(p0, p01, p012, c, out, tol, depth + 1);
  cubic(c, p123, p23, p3, out, tol, depth + 1);
}

/** Parses an SVG path into polylines (one per sub-path). */
function parsePath(d: string): Point[][] {
  const t = d.match(TOKEN) ?? [];
  let i = 0;
  const subs: Point[][] = [];
  let cur: Point[] | null = null;
  let cx = 0;
  let cy = 0;
  let sx = 0;
  let sy = 0;
  let cmd = '';
  let lastC2: Point | null = null;
  const num = (): number => Number(t[i++]);

  while (i < t.length) {
    if (/[A-Za-z]/.test(t[i] ?? '')) cmd = t[i++] ?? '';
    const rel = cmd === cmd.toLowerCase();
    const C = cmd.toUpperCase();
    if (C === 'Z') {
      cur?.push([sx, sy]);
      cx = sx;
      cy = sy;
      cur = null;
      lastC2 = null;
      continue;
    }
    if (C === 'M') {
      let x = num();
      let y = num();
      if (rel) {
        x += cx;
        y += cy;
      }
      cur = [[x, y]];
      subs.push(cur);
      cx = sx = x;
      cy = sy = y;
      cmd = rel ? 'l' : 'L';
      lastC2 = null;
      continue;
    }
    if (cur === null) {
      cur = [[cx, cy]];
      subs.push(cur);
    }
    if (C === 'L') {
      let x = num();
      let y = num();
      if (rel) {
        x += cx;
        y += cy;
      }
      cur.push([x, y]);
      cx = x;
      cy = y;
      lastC2 = null;
    } else if (C === 'H') {
      const v = num();
      const x = rel ? v + cx : v;
      cur.push([x, cy]);
      cx = x;
      lastC2 = null;
    } else if (C === 'V') {
      const v = num();
      const y = rel ? v + cy : v;
      cur.push([cx, y]);
      cy = y;
      lastC2 = null;
    } else if (C === 'C' || C === 'S') {
      let x1: number;
      let y1: number;
      if (C === 'C') {
        x1 = num();
        y1 = num();
        if (rel) {
          x1 += cx;
          y1 += cy;
        }
      } else if (lastC2) {
        x1 = 2 * cx - lastC2[0];
        y1 = 2 * cy - lastC2[1];
      } else {
        x1 = cx;
        y1 = cy;
      }
      let x2 = num();
      let y2 = num();
      let x = num();
      let y = num();
      if (rel) {
        x2 += cx;
        y2 += cy;
        x += cx;
        y += cy;
      }
      cubic([cx, cy], [x1, y1], [x2, y2], [x, y], cur);
      lastC2 = [x2, y2];
      cx = x;
      cy = y;
    } else if (C === 'Q' || C === 'T') {
      let qx = cx;
      let qy = cy;
      if (C === 'Q') {
        qx = num();
        qy = num();
        if (rel) {
          qx += cx;
          qy += cy;
        }
      }
      let x = num();
      let y = num();
      if (rel) {
        x += cx;
        y += cy;
      }
      cubic(
        [cx, cy],
        [cx + (2 / 3) * (qx - cx), cy + (2 / 3) * (qy - cy)],
        [x + (2 / 3) * (qx - x), y + (2 / 3) * (qy - y)],
        [x, y],
        cur,
      );
      cx = x;
      cy = y;
      lastC2 = null;
    } else {
      throw new Error(`Unsupported path command: ${cmd}`);
    }
  }
  return subs.filter((s) => s.length >= 1);
}

/** Ramer-Douglas-Peucker line simplification. */
function rdp(pts: readonly Point[], eps: number): Point[] {
  if (pts.length < 3) return [...pts];
  const a = pts[0];
  const b = pts[pts.length - 1];
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len = Math.hypot(dx, dy);
  let best = -1;
  let bi = 0;
  for (let k = 1; k < pts.length - 1; k++) {
    const p = pts[k];
    const dd =
      len > 1e-9 ? Math.abs((p[0] - a[0]) * dy - (p[1] - a[1]) * dx) / len : Math.hypot(p[0] - a[0], p[1] - a[1]);
    if (dd > best) {
      best = dd;
      bi = k;
    }
  }
  if (best <= eps) return [a, b];
  return [...rdp(pts.slice(0, bi + 1), eps).slice(0, -1), ...rdp(pts.slice(bi), eps)];
}

function vlq(n: number): string {
  let v = n < 0 ? (-n << 1) | 1 : n << 1;
  let s = '';
  for (;;) {
    let digit = v & 31;
    v >>= 5;
    if (v) digit |= 32;
    s += B64[digit];
    if (!v) return s;
  }
}

function unvlq(s: string): number[] {
  const out: number[] = [];
  let v = 0;
  let shift = 0;
  for (const ch of s) {
    const d = B64.indexOf(ch);
    v += (d & 31) << shift;
    if (d & 32) shift += 5;
    else {
      out.push(v & 1 ? -(v >> 1) : v >> 1);
      v = 0;
      shift = 0;
    }
  }
  return out;
}

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };

function unescapeXml(s: string): string {
  return s.replace(/&(#x[\da-f]+|#\d+|[a-z]+);/gi, (m, e: string) => {
    if (e.startsWith('#')) {
      const hex = e[1] === 'x' || e[1] === 'X';
      return String.fromCodePoint(hex ? Number.parseInt(e.slice(2), 16) : Number(e.slice(1)));
    }
    return ENTITIES[e] ?? m;
  });
}

function attr(src: string, re: RegExp, what: string): number {
  const m = re.exec(src);
  if (!m?.[1]) throw new Error(`Missing ${what}`);
  return Number(m[1]);
}

function buildFont(f: FontSource): FontOut {
  const src = readFileSync(new URL(`${f.file}.svg`, FONT_DIR), 'utf8');
  const upm = attr(src, /units-per-em="([\d.]+)"/, 'units-per-em');
  const asc = attr(src, /ascent="([-\d.]+)"/, 'ascent');
  const desc = attr(src, /descent="([-\d.]+)"/, 'descent');
  const defaultAdvance = attr(src, /<font[^>]*horiz-adv-x="([-\d.]+)"/, 'font horiz-adv-x');
  const g = new Map<string, [number, string]>();

  for (const m of src.matchAll(/<glyph\b([^>]*?)\/?>/g)) {
    const a = m[1] ?? '';
    const um = /unicode="([^"]*)"/.exec(a);
    if (!um) continue;
    const ch = unescapeXml(um[1] ?? '');
    const code = ch.codePointAt(0) ?? 0;
    if (ch.length !== 1 || code < 32 || code > 126) continue;
    const am = /horiz-adv-x="([-\d.e]+)"/.exec(a);
    const adv = am ? Number(am[1]) : defaultAdvance;
    const dm = /\sd="([^"]*)"/.exec(a);
    const strokes: string[] = [];
    if (dm?.[1]?.trim()) {
      let px = 0;
      let py = 0;
      for (const sub of parsePath(dm[1])) {
        const pts = sub.map(([x, y]): Point => [roundHalfEven(x), roundHalfEven(y)]);
        const dedup = pts.filter((p, k) => k === 0 || p[0] !== pts[k - 1]?.[0] || p[1] !== pts[k - 1]?.[1]);
        const simple = dedup.length > 2 ? rdp(dedup, 0.9) : dedup;
        let enc = '';
        for (const [x, y] of simple) {
          enc += vlq(x - px) + vlq(y - py);
          px = x;
          py = y;
        }
        strokes.push(enc);
      }
    }
    g.set(ch, [roundHalfEven(adv), strokes.join(',')]);
  }
  return { label: f.label, from: f.from, designer: f.designer, upm, asc, desc, g, k: 1 };
}

/** The vertical span of a set of glyphs, in font units. */
function span(font: FontOut, chars: string): number {
  let lo = 1e9;
  let hi = -1e9;
  for (const ch of chars) {
    const strokes = font.g.get(ch)?.[1];
    if (!strokes) continue;
    let py = 0;
    for (const s of strokes.split(',')) {
      const n = unvlq(s);
      for (let k = 0; k + 1 < n.length; k += 2) {
        py += n[k + 1] ?? 0;
        lo = Math.min(lo, py);
        hi = Math.max(hi, py);
      }
    }
  }
  return hi - lo;
}

/** Python round(x, 3). */
function round3(x: number): number {
  return Number(x.toFixed(3));
}

function serialize(fonts: Map<string, FontOut>): string {
  const glyphs = (g: FontOut['g']): string =>
    `{${[...g].map(([ch, [adv, s]]) => `${JSON.stringify(ch)}:[${adv},${JSON.stringify(s)}]`).join(',')}}`;
  const body = [...fonts]
    .map(
      ([id, f]) =>
        `${JSON.stringify(id)}:{"label":${JSON.stringify(f.label)},"from":${JSON.stringify(f.from)},` +
        `"designer":${JSON.stringify(f.designer)},"upm":${pyFloat(f.upm)},"asc":${pyFloat(f.asc)},` +
        `"desc":${pyFloat(f.desc)},"g":${glyphs(f.g)},"k":${pyFloat(f.k)}}`,
    )
    .join(',');
  return `{"credit":${JSON.stringify(CREDIT)},"license":${JSON.stringify(LICENSE)},"order":${JSON.stringify([...fonts.keys()])},"fonts":{${body}}}`;
}

const fonts = new Map(FONTS.map((f) => [f.id, buildFont(f)]));
const base = fonts.get('allure');
if (!base) throw new Error('The base font is missing');
const baseX = span(base, 'aemn');
const baseFull = span(base, 'Ahdgy');
for (const f of fonts.values()) {
  f.k = round3(1 / Math.sqrt((span(f, 'aemn') / baseX) * (span(f, 'Ahdgy') / baseFull)));
}

const json = serialize(fonts);
if (process.argv.includes('--check')) {
  if (readFileSync(OUT_FILE, 'utf8') !== json) {
    console.error('hwfonts.json is out of date. Run: pnpm --filter @signature-studio/engine data:handwriting');
    process.exit(1);
  }
} else {
  writeFileSync(OUT_FILE, json);
}
for (const [id, f] of fonts) {
  process.stdout.write(`${id}: ${f.g.size} glyphs, k ${f.k}\n`);
}
process.stdout.write(`hwfonts.json: ${Math.round(json.length / 1024)} KB\n`);
