import { ICONS } from '../data.ts';
import { SCALE } from '../html.ts';
import { png8 } from '../png.ts';
import type { FrameData } from '../png.ts';
import type { BarSpec, ChipSpec, StripSpec } from '../types.ts';

/** Whether finished canvases are shrunk to 8-bit palette PNGs. Set through `setOptimize()`. */
export const OPT: { on: boolean } = { on: true };

/** Makes a canvas of the given size in pixels. */
export function canvas(w: number, h: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

/** Gets the 2D context of a canvas. Throws if the browser cannot give one. */
export function ctx(c: HTMLCanvasElement, opts?: CanvasRenderingContext2DSettings): CanvasRenderingContext2D {
  const g = c.getContext('2d', opts);
  if (!g) throw new Error('Canvas 2D context is not available');
  return g;
}

/** Loads an image from a URL. */
export function loadImg(src: string): Promise<HTMLImageElement> {
  return new Promise((res, rej) => {
    const im = new Image();
    im.addEventListener('load', () => {
      res(im);
    });
    im.addEventListener('error', () => {
      rej(new Error('Image could not be loaded'));
    });
    im.src = src;
  });
}

/** Takes every pixel of a canvas as one frame. */
export function fullFrame(c: HTMLCanvasElement): FrameData {
  return { x: 0, y: 0, w: c.width, h: c.height, data: ctx(c).getImageData(0, 0, c.width, c.height).data };
}

/** Takes the smallest frame that holds every visible pixel of a canvas. */
export function cropFrame(c: HTMLCanvasElement): FrameData {
  const W = c.width;
  const H = c.height;
  const d = ctx(c).getImageData(0, 0, W, H).data;
  let x0 = W;
  let y0 = H;
  let x1 = -1;
  let y1 = -1;
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++)
      if (d[(y * W + x) * 4 + 3]) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
  if (x1 < 0) return { x: 0, y: 0, w: 1, h: 1, data: new Uint8ClampedArray(4) };
  return {
    x: x0,
    y: y0,
    w: x1 - x0 + 1,
    h: y1 - y0 + 1,
    data: ctx(c).getImageData(x0, y0, x1 - x0 + 1, y1 - y0 + 1).data,
  };
}

/** Encodes a canvas as a PNG data URL, as a palette PNG when optimising is on. */
export function finish(c: HTMLCanvasElement): Promise<string> {
  return OPT.on ? png8(c) : Promise.resolve(c.toDataURL('image/png'));
}

/** Draws SVG markup on a canvas of the given size and encodes it as a PNG data URL. */
export function svgRaster(svg: string, w: number, h: number): Promise<string> {
  const blobUrl = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
  return loadImg(blobUrl).then(
    (im) => {
      const c = canvas(w, h);
      ctx(c).drawImage(im, 0, 0, w, h);
      URL.revokeObjectURL(blobUrl);
      return finish(c);
    },
    (e) => {
      URL.revokeObjectURL(blobUrl);
      throw e;
    },
  );
}

/** Loads SVG markup as an image, ready to draw on a canvas. */
export function svgImage(svg: string): Promise<HTMLImageElement> {
  const blobUrl = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
  return loadImg(blobUrl).then((im) => {
    setTimeout(() => {
      URL.revokeObjectURL(blobUrl);
    }, 0);
    return im;
  });
}

/** Gives the gradient definition (if any) and the fill value for one colour or gradient stops. */
function paintDef(fill: string | string[], id: string, vertical?: boolean, box?: string): [def: string, paint: string] {
  if (Array.isArray(fill)) {
    const n = fill.length;
    const st = fill.map((c, i) => `<stop offset="${n === 1 ? 0 : i / (n - 1)}" stop-color="${c}"/>`).join('');
    /* box: "x y w h" in user space, so a gradient spans the whole glyph rather than each of its paths */
    const [x, y, w, h] = (box || '0 0 1 1').split(' ').map(Number);
    const units = box ? ' gradientUnits="userSpaceOnUse"' : '';
    const end = vertical ? `x2="${x}" y2="${y + h}"` : `x2="${x + w}" y2="${y + h}"`;
    return [`<linearGradient id="${id}"${units} x1="${x}" y1="${y}" ${end}>${st}</linearGradient>`, `url(#${id})`];
  }
  return ['', fill];
}

const SVGNS = 'xmlns="http://www.w3.org/2000/svg"';

/** A superellipse path filling a square of side `S`, inset by `o` on every side. */
function squirclePath(S: number, o: number): string {
  const r = S / 2 - o;
  const c = S / 2;
  const pts: string[] = [];
  for (let i = 0; i < 64; i++) {
    const a = (2 * Math.PI * i) / 64;
    const x = Math.cos(a);
    const y = Math.sin(a);
    pts.push(
      `${(c + r * Math.sign(x) * Math.abs(x) ** 0.5).toFixed(2)} ${(c + r * Math.sign(y) * Math.abs(y) ** 0.5).toFixed(2)}`,
    );
  }
  return `M${pts.join('L')}Z`;
}

/** Builds the SVG for a glyph on a chip. */
export function chipSvg(sp: ChipSpec): string {
  const S = sp.size * SCALE;
  const g = ICONS.glyph[sp.icon] || ICONS.glyph.globe;
  const pd = paintDef(sp.fill || 'none', 'g', sp.vertical);
  /* a shadow needs room under the chip: the chip shrinks and moves up */
  const C = sp.shadow ? Math.round(S * 0.88) : S;
  const off = (S - C) / 2;
  const pad = Math.round(C * (sp.pad || 0.24));

  /* fillOpacity: a soft tint behind the glyph; stroke: an outlined shape (width in 1x pixels) */
  const sw = sp.stroke ? (sp.strokeW || 1.5) * SCALE : 0;
  const o2 = sw / 2;
  const paint = ` fill="${sp.stroke && !sp.fill ? 'none' : pd[1]}"${sp.fillOpacity ? ` fill-opacity="${sp.fillOpacity}"` : ''}${sw ? ` stroke="${sp.stroke}" stroke-width="${sw}"` : ''}${sp.strokeOpacity ? ` stroke-opacity="${sp.strokeOpacity}"` : ''}`;

  let path: string;
  if (sp.shape === 'circle') path = `<circle cx="${C / 2}" cy="${C / 2}" r="${C / 2 - o2}"`;
  else if (sp.shape === 'squircle') path = `<path d="${squirclePath(C, o2)}"`;
  else if (sp.shape === 'rounded')
    path = `<rect x="${o2}" y="${o2}" width="${C - sw}" height="${C - sw}" rx="${C * 0.26}"`;
  else path = `<rect x="${o2}" y="${o2}" width="${C - sw}" height="${C - sw}"`;

  let defs = pd[0];
  let under = '';
  let over = '';
  if (sp.shadow) {
    defs += `<filter id="s" x="-20%" y="-20%" width="140%" height="160%"><feGaussianBlur stdDeviation="${(S * 0.035).toFixed(2)}"/></filter>`;
    under = `<g transform="translate(0 ${(S * 0.06).toFixed(2)})" filter="url(#s)">${path} fill="#000000" fill-opacity="0.28"/></g>`;
  }
  if (sp.gloss) {
    defs += `<clipPath id="c">${path}/></clipPath><linearGradient id="l" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFFFFF" stop-opacity="0.7"/><stop offset="0.55" stop-color="#FFFFFF" stop-opacity="0"/></linearGradient>`;
    over = `<rect width="${C}" height="${C}" fill="url(#l)" clip-path="url(#c)"/>`;
  }
  const glyph = `<svg x="${pad}" y="${pad}" width="${C - 2 * pad}" height="${C - 2 * pad}" viewBox="${g.vb}" fill="${sp.fg}" color="${sp.fg}">${g.inner}</svg>`;
  return `<svg ${SVGNS} width="${S}" height="${S}" viewBox="0 0 ${S} ${S}"><defs>${defs}</defs>${off ? `<g transform="translate(${off} 0)">` : ''}${under}${path}${paint}/>${over}${glyph}${off ? '</g>' : ''}</svg>`;
}

/** Builds the SVG for a glyph icon `px` pixels square in one colour or a gradient, with optional inset as a share of the size. */
export function glyphSvg(icon: string, px: number, color: string | string[], inset?: number): string {
  const g = ICONS.glyph[icon] || ICONS.glyph.globe;
  const p = Math.round(px * (inset || 0));
  const [def, paint] = paintDef(color, 'f', false, g.vb);
  /* glyphs drawn with lines use currentColor, which cannot be a gradient: they take the first stop */
  const solid = Array.isArray(color) ? color[0] || '#000000' : color;
  const inner = `<svg x="${p}" y="${p}" width="${px - 2 * p}" height="${px - 2 * p}" viewBox="${g.vb}" fill="${paint}" color="${solid}">${def ? `<defs>${def}</defs>` : ''}${g.inner}</svg>`;
  return `<svg ${SVGNS} width="${px}" height="${px}" viewBox="0 0 ${px} ${px}">${inner}</svg>`;
}

/** Builds the SVG for a row of colour blocks. */
export function stripSvg(sp: StripSpec): string {
  const W = sp.w * SCALE;
  const H = sp.h * SCALE;
  const n = sp.colors.length;
  const seg = W / n;
  return `<svg ${SVGNS} width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${sp.colors
    .map((c, i) => `<rect x="${i * seg}" width="${seg + 0.5}" height="${H}" fill="${c}"/>`)
    .join('')}</svg>`;
}

/** Builds the SVG for a rounded gradient bar. */
export function barSvg(sp: BarSpec, vertical: boolean): string {
  const W = sp.w * SCALE;
  const H = sp.h * SCALE;
  const n = sp.stops.length;
  const st = sp.stops.map((c, i) => `<stop offset="${n === 1 ? 0 : i / (n - 1)}" stop-color="${c}"/>`).join('');
  return `<svg ${SVGNS} width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><defs><linearGradient id="v" x1="0" y1="0" x2="${vertical ? 0 : 1}" y2="${vertical ? 1 : 0}">${st}</linearGradient></defs><rect width="${W}" height="${H}" rx="${Math.min(W, H) / 2}" fill="url(#v)"/></svg>`;
}

/** Spreads colours evenly along a canvas gradient and returns it. */
export function addStops(gr: CanvasGradient, stops: readonly string[]): CanvasGradient {
  stops.forEach((c, i, arr) => {
    gr.addColorStop(arr.length === 1 ? 0 : i / (arr.length - 1), c);
  });
  return gr;
}
