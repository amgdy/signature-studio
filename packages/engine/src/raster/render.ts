import { colorsOfPixels } from '../color.ts';
import { CANVAS_FONT, SCALE } from '../html.ts';
import {
  addStops,
  barSvg,
  canvas,
  chipSvg,
  ctx,
  finish,
  glyphSvg,
  loadImg,
  OPT,
  stripSvg,
  svgImage,
  svgRaster,
} from './canvas.ts';
import { renderContrib, renderMesh, renderScript, renderShimmer, renderSparkle } from './effects.ts';
import { renderHand } from './hand.ts';
import { renderPhoto } from './photo.ts';
import {
  renderCursor,
  renderDots,
  renderMark,
  renderMonogram,
  renderMrz,
  renderPostmark,
  renderQuote,
  renderSpinner,
} from './shapes.ts';
import type { ButtonSpec, ImageSpec, LogoSpec, PhotoSettings, RenderedImage } from '../types.ts';
import type { PhotoSource } from './photo.ts';

/** Draws an uploaded logo centred in a square, scaled to fit without cropping or stretching. */
async function renderLogo(sp: LogoSpec): Promise<string> {
  const S = sp.size * SCALE;
  const im = await loadImg(sp.src);
  const w = im.naturalWidth || S;
  const h = im.naturalHeight || S;
  const k = Math.min(S / w, S / h);
  const dw = Math.max(1, Math.round(w * k));
  const dh = Math.max(1, Math.round(h * k));
  const c = canvas(S, S);
  const g = ctx(c);
  g.imageSmoothingEnabled = true;
  g.imageSmoothingQuality = 'high';
  g.drawImage(im, Math.round((S - dw) / 2), Math.round((S - dh) / 2), dw, dh);
  return finish(c);
}

/** Palette suggestions from a logo's main colours (see `colorsOfPixels()`). Empty for a grey or unreadable logo. */
export async function logoColors(src: string): Promise<string[][]> {
  const im = await loadImg(src);
  const c = canvas(64, 64);
  const g = ctx(c, { willReadFrequently: true });
  g.drawImage(im, 0, 0, 64, 64);
  return colorsOfPixels(g.getImageData(0, 0, 64, 64).data);
}

/** Draws a pill-shaped button with an optional icon, filled or outlined. */
function renderButton(sp: ButtonSpec): Promise<RenderedImage> {
  const h = sp.h * SCALE;
  const fs = 12 * SCALE;
  const font = `600 ${fs}px ${CANVAS_FONT}`;
  const m = ctx(canvas(8, 8));
  m.font = font;
  const tw = Math.ceil(m.measureText(sp.text).width);
  const isz = sp.icon ? 14 * SCALE : 0;
  const pad = 13 * SCALE;
  const gi = sp.icon ? 6 * SCALE : 0;
  let W = pad * 2 + isz + gi + tw;
  W += W % 2;
  const iconP = sp.icon ? svgImage(glyphSvg(sp.icon, isz, sp.fg)) : Promise.resolve(null);
  return iconP.then((icon) => {
    const c = canvas(W, h);
    const g = ctx(c);
    const r = h / 2;
    const lw = sp.outline ? 1.5 * SCALE : 0;
    function pill(inset: number) {
      const x0 = inset;
      const y0 = inset;
      const x1 = W - inset;
      const y1 = h - inset;
      const rr = r - inset;
      g.beginPath();
      g.moveTo(x0 + rr, y0);
      g.lineTo(x1 - rr, y0);
      g.arc(x1 - rr, y0 + rr, rr, -Math.PI / 2, Math.PI / 2);
      g.lineTo(x0 + rr, y1);
      g.arc(x0 + rr, y0 + rr, rr, Math.PI / 2, Math.PI * 1.5);
      g.closePath();
    }
    pill(lw / 2);
    if (sp.fill) {
      g.fillStyle = Array.isArray(sp.fill) ? addStops(g.createLinearGradient(0, 0, W, h), sp.fill) : sp.fill;
      g.fill();
    } else {
      g.fillStyle = '#FFFFFF';
      g.fill();
      /* a missing outline leaves the default stroke colour, as setting null or '' would */
      if (sp.outline) g.strokeStyle = sp.outline;
      g.lineWidth = lw;
      g.stroke();
    }
    if (icon) g.drawImage(icon, pad, (h - isz) / 2, isz, isz);
    g.font = font;
    g.fillStyle = sp.fg;
    g.textBaseline = 'middle';
    g.fillText(sp.text, pad + isz + gi, h / 2 + SCALE * 0.5);
    return finish(c).then((u) => ({
      url: u,
      w: W / SCALE,
      h: sp.h,
    }));
  });
}

/**
 * Rendered images by spec. The key is the optimise mode, the spec as JSON and, for photos, the photo source.
 * Failed renders are removed so they can be tried again.
 */
const cache = new Map<string, Promise<RenderedImage>>();

function photoKey(s: PhotoSource): string {
  const p: Partial<PhotoSettings> = s.photo || {};
  const src = p.src || 'default';
  return `|${src.length}:${src.slice(-48)}:${p.zoom || 1}:${p.dx || 0}:${p.dy || 0}`;
}

/** Draws an image spec and encodes it as a data URL. Results are cached, so the same spec is drawn once. */
export function renderSpec(sp: ImageSpec, s: PhotoSource): Promise<RenderedImage> {
  const key = (OPT.on ? 'o|' : 'p|') + JSON.stringify(sp) + (sp.kind === 'photo' ? photoKey(s) : '');
  const hit = cache.get(key);
  if (hit) return hit;
  const S = SCALE;
  /* kept for the error message: in the default branch the spec type is never */
  const kind: string = sp.kind;
  let p: Promise<string | RenderedImage>;
  switch (sp.kind) {
    case 'photo':
      p = renderPhoto(sp, s);
      break;
    case 'glyph':
      p = svgRaster(glyphSvg(sp.icon, sp.size * S, sp.color, sp.inset), sp.size * S, sp.size * S);
      break;
    case 'chip':
      p = svgRaster(chipSvg(sp), sp.size * S, sp.size * S);
      break;
    case 'logo':
      p = renderLogo(sp);
      break;
    case 'strip':
      p = svgRaster(stripSvg(sp), sp.w * S, sp.h * S);
      break;
    case 'vbar':
      p = svgRaster(barSvg(sp, true), sp.w * S, sp.h * S);
      break;
    case 'hbar':
      p = svgRaster(barSvg(sp, false), sp.w * S, sp.h * S);
      break;
    case 'mesh':
      p = renderMesh(sp);
      break;
    case 'contrib':
      p = renderContrib(sp);
      break;
    case 'script':
      p = renderScript(sp);
      break;
    case 'hand':
      p = renderHand(sp);
      break;
    case 'button':
      p = renderButton(sp);
      break;
    case 'monogram':
      p = renderMonogram(sp);
      break;
    case 'quote':
      p = renderQuote(sp);
      break;
    case 'mrz':
      p = renderMrz(sp);
      break;
    case 'dots':
      p = renderDots(sp);
      break;
    case 'mark':
      p = renderMark(sp);
      break;
    case 'cursor':
      p = renderCursor(sp);
      break;
    case 'spinner':
      p = renderSpinner(sp);
      break;
    case 'postmark':
      p = renderPostmark(sp);
      break;
    case 'anim':
      p = sp.which === 'bar' ? renderShimmer(sp) : renderSparkle(sp);
      break;
    default:
      p = Promise.reject(new Error(`Unknown asset ${kind}`));
  }
  const out = Promise.resolve(p)
    .then((r): RenderedImage => (typeof r === 'string' ? { url: r } : r))
    .catch((e: unknown) => {
      cache.delete(key);
      throw e;
    });
  cache.set(key, out);
  return out;
}
