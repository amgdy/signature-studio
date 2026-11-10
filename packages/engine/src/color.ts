import { THEMES } from './data.ts';
import type { Option } from './options.ts';
import type { ColorSettings, Palette, SignatureState, Theme, Version } from './types.ts';

type Rgb = [number, number, number];

function channels(h: string): Rgb {
  h = h.replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

/** Mixes `hex` toward `other` by `t` (0 to 1). */
export function mix(hex: string, other: string, t: number): string {
  const p = channels;
  const a = p(hex);
  const b = p(other);
  return `#${a
    .map((v, i) => `0${Math.round(v + (b[i] - v) * t).toString(16)}`.slice(-2))
    .join('')
    .toUpperCase()}`;
}

/** Red, green and blue from 0 to 1. */
function rgbOf(hex: string): Rgb {
  const [r, g, b] = channels(hex);
  return [r / 255, g / 255, b / 255];
}

function linear(v: number): number {
  return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
}

function lum(hex: string): number {
  const [r, g, b] = rgbOf(hex);
  return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
}

/** WCAG contrast ratio between two colours, from 1 to 21. */
export function contrast(a: string, b: string): number {
  const x = lum(a);
  const y = lum(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}

/* ---------- OKLCH (Björn Ottosson's Oklab): lightness, chroma and hue as the eye sees them ---------- */

function toLinear(v: number): number {
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
}

function fromLinear(v: number): number {
  return v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055;
}

/* linear sRGB from Oklab; a channel outside 0 to 1 means the colour is outside sRGB */
function linearOf(L: number, a: number, b: number): Rgb {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
}

function inGamut(c: Rgb): boolean {
  return c.every((v) => v >= -1e-4 && v <= 1 + 1e-4);
}

function hexOfLinear(c: Rgb): string {
  return `#${c
    .map((v) => `0${Math.round(fromLinear(Math.min(1, Math.max(0, v))) * 255).toString(16)}`.slice(-2))
    .join('')
    .toUpperCase()}`;
}

/** Oklab lightness (0 to 1), a and b of a colour. */
function oklab(hex: string): Rgb {
  const [r, g, b] = rgbOf(hex).map(toLinear);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}

/** Lightness (0 to 1), chroma (0 to about 0.37) and hue (degrees) of a colour. */
export function oklch(hex: string): Rgb {
  const [L, a, b] = oklab(hex);
  return [L, Math.hypot(a, b), ((Math.atan2(b, a) * 180) / Math.PI + 360) % 360];
}

/** The colour at this lightness, chroma and hue. Chroma is reduced until the colour fits in sRGB. */
export function fromOklch(L: number, C: number, h: number): string {
  const r = (h * Math.PI) / 180;
  const at = (c: number): Rgb => linearOf(L, c * Math.cos(r), c * Math.sin(r));
  if (inGamut(at(C))) return hexOfLinear(at(C));
  let lo = 0;
  let hi = C;
  for (let i = 0; i < 16; i++) {
    const mid = (lo + hi) / 2;
    if (inGamut(at(mid))) lo = mid;
    else hi = mid;
  }
  return hexOfLinear(at(lo));
}

/**
 * The colour nearest to `c` that reaches `ratio` on `bg`. Only the lightness changes, so the hue and
 * vividness stay. Returns `c` when it already passes.
 */
export function fit(c: string, bg: string, ratio: number): string {
  if (contrast(c, bg) >= ratio) return c;
  const [L, C, h] = oklch(c);
  const down = contrast('#000000', bg) >= contrast('#FFFFFF', bg);
  let best = down ? '#000000' : '#FFFFFF';
  /* the passing lightnesses run from black (or white) up to a boundary: find the boundary */
  let lo = down ? 0 : L;
  let hi = down ? L : 1;
  for (let i = 0; i < 20; i++) {
    const mid = (lo + hi) / 2;
    const x = fromOklch(mid, C, h);
    const ok = contrast(x, bg) >= ratio;
    if (ok) best = x;
    if (ok === down) lo = mid;
    else hi = mid;
  }
  return best;
}

/** Darkens a colour until it reaches 4.6:1 on white. */
export function deepen(c: string): string {
  return fit(c, '#FFFFFF', 4.6);
}

/** Lightens a colour until it reaches 4.6:1 on #1F1F1F. */
export function lighten(c: string): string {
  return fit(c, '#1F1F1F', 4.6);
}

/** A theme colour deep enough for white text on it (4.5:1). */
export function deep(c: string): string {
  return fit(c, '#FFFFFF', 4.5);
}

/** True for a six-digit hex colour such as `#0F6CBD`. */
function isHex(c: unknown): c is string {
  return typeof c === 'string' && /^#[0-9A-Fa-f]{6}$/.test(c);
}

export const MAX_COLORS = 4;

export function cleanColors(value: unknown): string[] {
  return Array.isArray(value)
    ? value
        .filter(isHex)
        .slice(0, MAX_COLORS)
        .map((c) => c.toUpperCase())
    : [];
}

/** Presets only prefill settings. The returned array can be edited without changing the preset. */
export function themeSettings(id: string): ColorSettings {
  const preset = Object.hasOwn(THEMES, id) ? THEMES[id] : THEMES.aurora;
  return { colors: [...preset.colors], gradient: preset.gradient };
}

/** A preset's id when all its colour settings match, otherwise `custom`. */
export function matchingTheme(s: ColorSettings): string {
  return (
    Object.keys(THEMES).find((id) => {
      const p = THEMES[id];
      return (
        p.gradient === s.gradient && p.colors.length === s.colors.length && p.colors.every((c, i) => c === s.colors[i])
      );
    }) ?? 'custom'
  );
}

/** One contrast-safe recipe for presets and edited colours. Solid decorations use the first colour. */
export function paletteFrom(colors: readonly string[], gradient = true): Omit<Theme, 'id'> {
  const cs = cleanColors(colors);
  const c0 = cs[0] || '#0F6CBD';
  const stops = gradient && cs.length > 1 ? cs : [c0, c0];
  /* a deeper accent makes a slightly deeper tint, so check again until both settle */
  let accent = deepen(c0);
  for (let i = 0; i < 4 && contrast(accent, softTint(accent)) < 4.6; i++) accent = fit(accent, softTint(accent), 4.6);
  return { name: 'Custom', accent, accentDark: lighten(c0), stops };
}

export function resolveTheme(s: ColorSettings): Theme {
  const id = matchingTheme(s);
  const preset = THEMES[id];
  return { ...paletteFrom(s.colors, s.gradient), id, name: preset?.name ?? 'Custom', group: preset?.group };
}

const hex2 = (v: number): string => v.toString(16).padStart(2, '0');

/**
 * The main colours in an image, most used first, as palette suggestions for `paletteFrom()`: the main colour
 * alone, then with the second and third. Pixels that are see-through, near white, near black or grey are skipped.
 * `px` holds RGBA bytes, as in `ImageData.data`.
 */
export function colorsOfPixels(px: ArrayLike<number>): string[][] {
  /* one bin per 15 degrees of hue, holding the summed Oklab values */
  const bins: { n: number; L: number; a: number; b: number }[] = [];
  for (let i = 0; i + 3 < px.length; i += 4) {
    if ((px[i + 3] ?? 0) < 200) continue;
    const [L, a, b] = oklab(`#${hex2(px[i] ?? 0)}${hex2(px[i + 1] ?? 0)}${hex2(px[i + 2] ?? 0)}`);
    if (L > 0.95 || L < 0.15 || Math.hypot(a, b) < 0.04) continue;
    const k = Math.floor((((Math.atan2(b, a) * 180) / Math.PI + 360) % 360) / 15);
    const bin = (bins[k] ||= { n: 0, L: 0, a: 0, b: 0 });
    bin.n++;
    bin.L += L;
    bin.a += a;
    bin.b += b;
  }
  /* the busiest hues, at least 30 degrees apart, each as its average colour */
  const picked: { h: number; c: string }[] = [];
  for (const bin of bins.filter(Boolean).toSorted((x, y) => y.n - x.n)) {
    const [L, a, b] = [bin.L / bin.n, bin.a / bin.n, bin.b / bin.n];
    const h = ((Math.atan2(b, a) * 180) / Math.PI + 360) % 360;
    if (picked.some((p) => Math.min(Math.abs(p.h - h), 360 - Math.abs(p.h - h)) < 30)) continue;
    picked.push({ h, c: fromOklch(L, Math.hypot(a, b), h) });
    if (picked.length === 3) break;
  }
  const cs = picked.map((p) => p.c);
  return cs.map((_, i) => cs.slice(0, i + 1));
}

/** A soft tint of the theme colour that body text and the accent stay readable on (4.6:1). */
export function tint(th: Pick<Theme, 'accent' | 'accentDark'>, P: Pick<Palette, 'dark' | 'body'>, t?: number): string {
  const dk = P.dark;
  const base = dk ? '#1F1F1F' : '#FFFFFF';
  const fg = dk ? th.accentDark : th.accent;
  let k = dk ? 0.8 : t || 0.91;
  let c = mix(th.accent, base, k);
  /* move toward the background until the theme colour and body text both stay at 4.6:1 or more on it */
  while (k < 0.98 && (contrast(fg, c) < 4.6 || contrast(P.body, c) < 4.6)) {
    k += 0.02;
    c = mix(th.accent, base, k);
  }
  return c;
}

/** A panel colour from the theme accent, dark enough for white text (at least 4.6:1). */
export function panelOf(th: Pick<Theme, 'accent'>): string {
  let c = th.accent;
  for (let i = 1; i < 8 && contrast(c, '#FFFFFF') < 4.6; i++) c = mix(th.accent, '#000000', i * 0.08);
  return c;
}

/** A light text colour that reads on a colour panel (at least 4.6:1), or white. */
export function softOn(panel: string): string {
  const c = [0.82, 0.88, 0.94, 1].map((t) => mix(panel, '#FFFFFF', t));
  for (const x of c) if (contrast(x, panel) >= 4.6) return x;
  return '#FFFFFF';
}

/** Text colours on a light page. */
export const LIGHT: Palette = {
  dark: false,
  ink: '#242424',
  body: '#424242',
  muted: '#616161',
  faint: '#9E9E9E',
  line: '#E0E0E0',
  chipBg: '#F6F8FA',
  chipBorder: '#D0D7DE',
  logoText: '#666666',
  link: '#0969DA',
};

/** Text colours in dark mode. */
export const DARK: Palette = {
  dark: true,
  ink: '#FFFFFF',
  body: '#E0E0E0',
  muted: '#ADADAD',
  faint: '#757575',
  line: '#3D3D3D',
  chipBg: '#2B2B2B',
  chipBorder: '#4A4A4A',
  logoText: '#D6D6D6',
  link: '#4493F8',
};

/* ---------- background: transparent (the email's own background shows through) or a solid colour card ---------- */

/** Background colours offered in the Studio. `tint` is a soft tint of the theme colour. */
export const BG_PRESETS = [
  { id: 'tint', label: 'Theme tint' },
  { id: '#FFFFFF', label: 'White' },
  { id: '#F5F7FA', label: 'Cloud' },
  { id: '#FAF6EF', label: 'Sand' },
  { id: '#0B1F3A', label: 'Midnight' },
  { id: '#1F2328', label: 'Graphite' },
] as const satisfies readonly Option[];

/** More card colours for the background picker, light and dark. Text keeps 4.5:1 on each, in light and dark mode. */
export const CARD_COLORS: readonly { label: string; colors: readonly Option[] }[] = [
  {
    label: 'Light cards',
    colors: [
      { id: '#FFFFFF', label: 'White' },
      { id: '#F5F7FA', label: 'Cloud' },
      { id: '#FAF6EF', label: 'Sand' },
      { id: '#EEF4FA', label: 'Mist' },
      { id: '#EEF8F3', label: 'Mint' },
      { id: '#FCF0F2', label: 'Blush' },
      { id: '#F4F1FB', label: 'Lilac' },
      { id: '#FDF9E7', label: 'Lemon' },
    ],
  },
  {
    label: 'Dark cards',
    colors: [
      { id: '#0B1F3A', label: 'Midnight' },
      { id: '#1F2328', label: 'Graphite' },
      { id: '#101820', label: 'Ink' },
      { id: '#14213D', label: 'Navy' },
      { id: '#0F2A1E', label: 'Forest' },
      { id: '#2A1533', label: 'Plum' },
      { id: '#2B1D16', label: 'Espresso' },
      { id: '#242424', label: 'Charcoal' },
    ],
  },
];

const softTint = (accent: string, k = 0.92): string => mix(accent, '#FFFFFF', k);

/** A soft tint of the theme colour, used as a card background. It keeps the theme colour and links readable. */
export function tintOf(th: Pick<Theme, 'accent'>): string {
  let k = 0.92;
  let c = softTint(th.accent, k);
  while (k < 0.99 && (contrast(th.accent, c) < 4.6 || contrast(LIGHT.link, c) < 4.5)) {
    k += 0.01;
    c = softTint(th.accent, k);
  }
  return c;
}

/** The card colour, or empty when the background is transparent. */
export function surfaceOf(s: Pick<SignatureState, 'bgMode' | 'bgColor'>, th: Pick<Theme, 'accent'>): string {
  return s.bgMode === 'solid' ? (s.bgColor === 'tint' ? tintOf(th) : s.bgColor) : '';
}

/** True when white text reads better than dark text on this colour. */
export function darkSurface(hex: string): boolean {
  return contrast(hex, '#FFFFFF') > contrast(hex, LIGHT.ink);
}

/** Text colours on a card: the light set on light cards, a set mixed from the card colour on dark ones. */
export function surfacePalette(hex: string): Palette {
  if (!darkSurface(hex)) return LIGHT;
  const w = (t: number): string => mix(hex, '#FFFFFF', t);
  return {
    ...DARK,
    body: w(0.86),
    muted: w(0.68),
    faint: w(0.42),
    line: w(0.22),
    chipBg: w(0.08),
    chipBorder: w(0.26),
    logoText: w(0.84),
  };
}

/* the first colour that reads on the card, else the stronger of white and ink */
function readable(cands: readonly string[], hex: string, need: number): string {
  for (const c of cands) if (c && contrast(c, hex) >= need) return c;
  return ['#FFFFFF', LIGHT.ink].toSorted((a, b) => contrast(b, hex) - contrast(a, hex))[0];
}

/**
 * Icons and handwriting are pictures, so they are drawn in colours that read on the card.
 * Light cards keep the theme's own colours unless they get faint; dark cards get the light accent.
 */
export function onSurface(th: Theme, hex: string): Theme {
  const dark = darkSurface(hex);
  const ic = th.icon || th.accent;
  const ink = th.ink || th.accent;
  const family = (c: string): string[] =>
    dark
      ? [c, th.accentDark, mix(th.accentDark, '#FFFFFF', 0.35), mix(th.accentDark, '#FFFFFF', 0.6)]
      : [c, th.accent, mix(th.accent, '#000000', 0.25), mix(th.accent, '#000000', 0.45)];
  return {
    ...th,
    icon: readable(family(ic), hex, dark ? 4.5 : 2.2),
    ink: readable(family(ink), hex, dark ? 4.5 : 3),
  };
}

/** What Outlook's dark mode makes of a light card: the same hue, dark and muted. Dark cards stay as they are. */
export function darkModeOf(hex: string): string {
  if (darkSurface(hex)) return hex;
  const c = rgbOf(hex);
  const mx = Math.max(...c);
  const mn = Math.min(...c);
  const l = (mx + mn) / 2;
  const d = mx - mn;
  let h = 0;
  let sat = 0;
  if (d) {
    sat = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
    h =
      (mx === c[0]
        ? (c[1] - c[2]) / d + (c[1] < c[2] ? 6 : 0)
        : mx === c[1]
          ? (c[2] - c[0]) / d + 2
          : (c[0] - c[1]) / d + 4) / 6;
  }
  const L = 0.115 + (1 - l) * 0.3;
  const S = Math.min(sat, 0.4);
  const q = L < 0.5 ? L * (1 + S) : L + S - L * S;
  const p = 2 * L - q;
  const ch = (h0: number): number => {
    const t = (h0 + 1) % 1;
    return t < 1 / 6 ? p + (q - p) * 6 * t : t < 0.5 ? q : t < 2 / 3 ? p + (q - p) * (2 / 3 - t) * 6 : p;
  };
  return `#${[ch(h + 1 / 3), ch(h), ch(h - 1 / 3)]
    .map((v) => `0${Math.round(v * 255).toString(16)}`.slice(-2))
    .join('')
    .toUpperCase()}`;
}

/**
 * Wraps the signature in a card. The colour is on the cell only, so rounded corners show where the client
 * supports them (classic Outlook draws square ones).
 */
export function boxed(html: string, color: string, v: Version): string {
  if (!color) return html;
  const pad = v === 'reply' ? '12px 16px' : '18px 22px';
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:separate;mso-table-lspace:0pt;mso-table-rspace:0pt;"><tr><td bgcolor="${color}" style="background-color:${color};padding:${pad};border-radius:12px;">${html}</td></tr></table>`;
}
