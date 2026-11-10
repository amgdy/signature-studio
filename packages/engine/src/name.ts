import { animOn, pron } from './content.ts';
import { HW } from './data.ts';
import { esc, f, img, IMGTD, tbl, td, textW, tr } from './html.ts';
import type { AnimOptions, PhotoScale } from './content.ts';
import type { HandFont } from './data.ts';
import type { Point } from './raster/shapes.ts';
import type {
  AssetSizes,
  AssetTokens,
  HandPen,
  HandSpec,
  Palette,
  ScriptSpec,
  SignatureState,
  SpecMap,
  Theme,
  Version,
} from './types.ts';

/** One decoded handwriting glyph: its advance and its strokes, in font units. */
interface HwGlyph {
  adv: number;
  strokes: Point[][];
}

/** A handwriting font with its glyphs decoded. */
export interface LoadedHandFont extends HandFont {
  glyphs: Record<string, HwGlyph>;
}

/** One pen stroke of laid-out text, in font units. `word` counts the words before it. */
interface HwStroke {
  word: number;
  pts: Point[];
}

/** Text laid out in a handwriting font: its strokes and its width, in font units. */
export interface HwLayout {
  strokes: HwStroke[];
  width: number;
}

/* ---------- the name: typed in Segoe UI, or handwritten (an image written stroke by stroke) ---------- */

/** Gives the handwriting colour of a theme: its ink colour, or else its accent. */
function inkOf(th: Pick<Theme, 'ink' | 'accent'>): string {
  return th.ink || th.accent;
}

/** Pen names by pen id. */
export const HW_PENS: Record<HandPen, string> = { fountain: 'Fountain pen', brush: 'Brush pen', fine: 'Fine liner' };

const B64I = (() => {
  const m: Record<number, number> = {};
  const a = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  for (let i = 0; i < 64; i++) m[a.charCodeAt(i)] = i;
  return m;
})();

/* each font with its glyphs decoded, so a font is decoded once */
const loaded = new WeakMap<HandFont, LoadedHandFont>();

/** Gets a handwriting font by id (or the first font), decoding its glyphs on first use. Null when no fonts are loaded. */
export function hwFont(id: string): LoadedHandFont | null {
  if (!HW || !HW.fonts || !HW.order || !HW.order.length) return null;
  const F: HandFont | undefined = HW.fonts[id] || HW.fonts[HW.order[0]];
  if (!F) return null;
  let font = loaded.get(F);
  if (!font) {
    const glyphs: Record<string, HwGlyph> = {};
    font = { ...F, glyphs };
    loaded.set(F, font);
    Object.keys(F.g).forEach((ch) => {
      const e = F.g[ch];
      let px = 0;
      let py = 0;
      glyphs[ch] = {
        adv: e[0],
        strokes: e[1]
          ? e[1].split(',').map((str) => {
              const nums: number[] = [];
              let v = 0;
              let sh = 0;
              const pts: Point[] = [];
              for (let i = 0; i < str.length; i++) {
                const d = B64I[str.charCodeAt(i)];
                v += (d & 31) << sh;
                if (d & 32) sh += 5;
                else {
                  nums.push(v & 1 ? -(v >> 1) : v >> 1);
                  v = 0;
                  sh = 0;
                }
              }
              for (let k = 0; k + 1 < nums.length; k += 2) {
                px += nums[k];
                py += nums[k + 1];
                pts.push([px, py]);
              }
              return pts;
            })
          : [],
      };
    });
  }
  return font;
}

/** Lays out text in a handwriting font. Null when the text is empty or has a character the font lacks. */
export function hwLayout(F: LoadedHandFont, text: string): HwLayout | null {
  let x = 0;
  const strokes: HwStroke[] = [];
  let word = 0;
  const chars = Array.from((text || '').trim());
  const spc = F.glyphs[' '] ? F.glyphs[' '].adv : F.upm * 0.3;
  if (!chars.length) return null;
  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i];
    if (/\s/.test(ch)) {
      x += spc;
      word++;
      continue;
    }
    const g = F.glyphs[ch];
    if (!g) return null;
    for (let j = 0; j < g.strokes.length; j++)
      strokes.push({
        word,
        pts: g.strokes[j].map((p): Point => [p[0] + x, p[1]]),
      });
    x += g.adv;
  }
  return strokes.length ? { strokes, width: x } : null;
}

/**
 * Makes the image spec for a handwritten name. Falls back to the script font
 * when the handwriting cannot write the name.
 */
export function handSpec(
  s: Pick<SignatureState, 'handStyle' | 'handPen' | 'fullName'>,
  th: Pick<Theme, 'ink' | 'accent'>,
  size: number,
  animated: boolean,
  flourish: boolean,
  color?: string,
): HandSpec | ScriptSpec {
  const F = hwFont(s.handStyle);
  const ink = color || inkOf(th);
  if (F && hwLayout(F, s.fullName))
    return {
      kind: 'hand',
      text: s.fullName,
      size,
      color: ink,
      animated,
      style: s.handStyle,
      pen: s.handPen,
      flourish,
    };
  return { kind: 'script', text: s.fullName, size, color: ink, animated: false };
}

/** Sizes for the handwritten name in `nameAsset()`. */
export interface NameAssetConfig {
  /** Size in new messages. */
  n: number;
  /** Size in replies. */
  r: number;
  /** Widest allowed in new messages (220 when left out). */
  maxN?: number;
  /** Widest allowed in replies (190 when left out). */
  maxR?: number;
  /** Ink colour in new messages, instead of the theme's. */
  colorN?: string;
  /** Ink colour in replies, instead of the theme's. */
  colorR?: string;
  /** True when the name sits on its own row, so the flourish may go under it. */
  fl?: boolean;
}

/** True when the handwriting style can write the whole name. */
export function canHand(s: Pick<SignatureState, 'handStyle' | 'fullName'>): boolean {
  const F = hwFont(s.handStyle);
  return !!(F && hwLayout(F, s.fullName));
}

/** The largest size up to `size` whose handwriting fits in `maxW` px. `fl` leaves room for the flourish. */
export function handFit(
  s: Pick<SignatureState, 'handStyle' | 'fullName'>,
  size: number,
  maxW: number,
  fl?: boolean,
): number {
  const F = hwFont(s.handStyle);
  const lay = F && hwLayout(F, s.fullName);
  if (!F || !lay) return size;
  const w = ((lay.width * size * 1.32 * (F.k || 1)) / F.upm) * (fl ? 1.06 : 1) + 6;
  return w > maxW ? Math.max(14, Math.floor((size * maxW) / w)) : size;
}

/** Adds the handwritten name (`hname`) to the image specs when the name style is handwriting and the style can write it. */
export function nameAsset(
  a: SpecMap,
  s: SignatureState & PhotoScale,
  th: Theme,
  v: Version,
  o: AnimOptions | null | undefined,
  cfg: NameAssetConfig,
): void {
  if (s.nameStyle !== 'hand' || !canHand(s)) return;
  const small = v === 'reply';
  const fl = !small && !!cfg.fl && s.show.flourish;
  /* a larger photo leaves less room beside it, so the handwritten name gives up the same width */
  const size = handFit(s, small ? cfg.r : cfg.n, small ? cfg.maxR || 190 : (cfg.maxN || 220) - (s.pgrow || 0), fl);
  a.hname = handSpec(s, th, size, !small && animOn(s, o), fl, small ? cfg.colorR : cfg.colorN);
}

/* px between a Segoe UI line box's bottom and its text baseline, and the padding that puts text on the handwriting's baseline */
function textDrop(fs: number, lh: number): number {
  return (lh - fs * 1.33) / 2 + fs * 0.25;
}

/** Bottom padding that puts text of size `fs` and line height `lh` on the handwriting's baseline. */
export function handPb(D: AssetSizes, fs: number, lh: number): number {
  const d = D.hname;
  return Math.max(0, Math.round(d.h - (d.base || d.h * 0.74) - textDrop(fs, lh)));
}

const INLINE_MAX = 230;

/**
 * The handwriting with text on its baseline. `lead` is a separator shown only when they share a line.
 * When both would not fit on a phone screen, the text goes on the line under the name instead, so nothing is pushed off screen.
 */
export function handInline(
  A: AssetTokens,
  D: AssetSizes,
  s: Pick<SignatureState, 'fullName'>,
  rest: string,
  style: string,
  fs: number,
  lh: number,
  gap?: number | null,
  lead?: string,
): string {
  const d = D.hname;
  const g = gap ?? 8;
  const name = img(A.hname, d.w, d.h, s.fullName);
  if (!rest) return tbl(tr(td(name, IMGTD)));
  if (d.w + g + textW((lead || '') + rest, fs) > INLINE_MAX)
    return tbl(tr(td(name, IMGTD)) + tr(td(rest, `${style}padding-top:2px;`)));
  return tbl(
    tr(
      td(name, `${IMGTD}vertical-align:bottom;`, 'valign="bottom"') +
        td(
          (lead || '') + rest,
          `${style}padding:0 0 ${handPb(D, fs, lh)}px ${g}px;vertical-align:bottom;`,
          'valign="bottom"',
        ),
    ),
  );
}

/** The name on its own row: handwriting (pronouns on its baseline) or typed text in the `typed` style. */
export function nameRow(
  s: Pick<SignatureState, 'fullName' | 'pronouns'>,
  A: AssetTokens,
  D: AssetSizes,
  P: Palette,
  typed: string,
  pad?: string,
  attrs?: string,
  noPron?: boolean,
): string {
  const padding = pad || '';
  if (A.hname) {
    const inner =
      s.pronouns && !noPron
        ? handInline(A, D, s, `(${esc(s.pronouns)})`, f(12, 16, P.muted), 12, 16, 6)
        : img(A.hname, D.hname.w, D.hname.h, s.fullName);
    return tr(td(inner, IMGTD + padding, attrs));
  }
  return tr(td(esc(s.fullName) + (noPron ? '' : pron(s, P)), typed + padding, attrs));
}
