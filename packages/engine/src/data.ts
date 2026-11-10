import hwfonts from './data/hwfonts.json' with { type: 'json' };
import icons from './data/icons.json' with { type: 'json' };
import themes from './data/themes.json' with { type: 'json' };
import { FAMILY_GLYPHS } from './data/icon-families.ts';
import { PALETTE_GROUP_OPTIONS } from './options.ts';
import type { ThemePreset } from './types.ts';

/** A vector glyph: an SVG view box and the markup inside it. */
export interface GlyphIcon {
  vb: string;
  inner: string;
}

/** One handwriting font: glyphs as `[advance, encoded strokes]`, with metrics in font units. */
export interface HandFont {
  label: string;
  from: string;
  designer: string;
  upm: number;
  asc: number;
  desc: number;
  g: Record<string, [number, string]>;
  k: number;
}

export interface HandFonts {
  credit: string;
  license: string;
  order: string[];
  fonts: Record<string, HandFont>;
}

/* the JSON files as TypeScript reads them: a group is any string, and a glyph is an array */
type ThemeData = Omit<ThemePreset, 'group'> & { group: string };
type HandFontData = Omit<HandFont, 'g'> & { g: Readonly<Record<string, readonly (number | string)[]>> };
interface HandFontsData {
  credit: string;
  license: string;
  order: string[];
  fonts: Readonly<Record<string, HandFontData>>;
}

function knownGroups(m: Readonly<Record<string, ThemeData>>): m is Record<string, ThemePreset> {
  return Object.values(m).every((t) => PALETTE_GROUP_OPTIONS.some((o) => o.id === t.group));
}

function glyphPairs(d: HandFontsData): d is HandFonts {
  return Object.values(d.fonts).every((F) =>
    Object.values(F.g).every((e) => e.length === 2 && typeof e[0] === 'number' && typeof e[1] === 'string'),
  );
}

function themesOf(m: Readonly<Record<string, ThemeData>>): Record<string, ThemePreset> {
  if (!knownGroups(m)) throw new Error('A palette in themes.json has an unknown group');
  return m;
}

function handFontsOf(d: HandFontsData): HandFonts {
  if (!glyphPairs(d)) throw new Error('A glyph in hwfonts.json is not [advance, strokes]');
  return d;
}

/** Single-colour vector glyphs, keyed by name. */
export const ICONS: { glyph: Record<string, GlyphIcon> } = { glyph: { ...icons.glyph, ...FAMILY_GLYPHS } };
/** The palettes, keyed by id. */
export const THEMES: Record<string, ThemePreset> = themesOf(themes);
export const HW: HandFonts = handFontsOf(hwfonts);
