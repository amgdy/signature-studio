import { deep, deepen, fromOklch, lighten, oklch } from './color.ts';
import { ICONS } from './data.ts';
import type {
  ChipSpec,
  GlyphSpec,
  IconColor,
  IconFamily,
  IconStyle,
  IconWeight,
  SignatureState,
  SpecMap,
  Theme,
} from './types.ts';

/** Kinds of contact a signature can show. */
export type ContactKind = 'phone' | 'office' | 'mail' | 'web' | 'location' | 'hours' | 'languages' | 'calendar';
/** Kinds of profile link a signature can show. */
export type SocialKind = 'linkedin' | 'github' | 'x' | 'youtube' | 'learn' | 'blog' | 'teams';
/** Every kind of item that has an icon. `org` is the company line in the GitHub details. */
export type IconKind = ContactKind | SocialKind | 'org';

/** Icon names in `icons.json` for each kind of item: solid glyphs. */
export const GLYPH: Readonly<Record<IconKind, string>> = {
  phone: 'mobile',
  office: 'phone',
  mail: 'mail',
  web: 'globeSimple',
  location: 'pin',
  calendar: 'calendar',
  hours: 'clock',
  languages: 'translate',
  org: 'buildings',
  linkedin: 'linkedin',
  github: 'github',
  x: 'x',
  youtube: 'youtube',
  learn: 'learn',
  blog: 'blog',
  teams: 'teams',
};

/** Icon names in `icons.json` for each kind of item: thin outline icons. */
export const OCT: Readonly<Record<IconKind, string>> = {
  phone: 'octMobile',
  office: 'octPhone',
  mail: 'octMail',
  web: 'octLink',
  location: 'octLocation',
  calendar: 'octCalendar',
  hours: 'octClock',
  languages: 'octTranslate',
  linkedin: 'linkedin',
  github: 'github',
  x: 'x',
  youtube: 'octVideo',
  learn: 'octLearn',
  blog: 'octPencil',
  teams: 'teams',
  org: 'octOrg',
};

/** Icon styles that draw an icon (every style except the design's own and text labels). */
export type DrawnIconStyle = Exclude<IconStyle, 'auto' | 'labels'>;
/** The image spec for one icon. */
export type IconSpec = GlyphSpec | ChipSpec;
/** Options for `iconFor()`. */
export interface IconOptions {
  family?: IconFamily;
  /** True when the icon sits on a dark background. */
  onDark?: boolean;
  /** Line, bold, solid or duotone glyphs. `auto` keeps the style's own. */
  weight?: IconWeight;
  /** Where the colours come from. `auto` keeps the style's own. */
  color?: IconColor;
}

type ColourMap = Readonly<Partial<Record<string, string>>>;

/* clear colours for the Colour icon style: a hue per kind of contact, brand colours for links */
const HUE: ColourMap = {
  phone: '#107C10',
  office: '#0B6A0B',
  mail: '#0F6CBD',
  web: '#5C2E91',
  location: '#C50F1F',
  calendar: '#B3480C',
  hours: '#00726A',
  languages: '#4F52B2',
  org: '#424242',
};

const BRAND: ColourMap = {
  linkedin: '#0A66C2',
  github: '#24292F',
  x: '#000000',
  youtube: '#D10000',
  learn: '#0067B8',
  blog: '#5C2E91',
  teams: '#4B53BC',
};

/* the icon maps, looked up by any name (restyle() passes the name part of an image key) */
const GLYPH_BY_NAME: ColourMap = GLYPH;
const OCT_BY_NAME: ColourMap = OCT;
const WHITE = '#FFFFFF';

/** The icon options from the state: the chosen weight and colour, plus whether the background is dark. */
export function iconOpts(
  s: Pick<SignatureState, 'iconWeight' | 'iconColor'> & Partial<Pick<SignatureState, 'iconFamily'>>,
  o?: Pick<IconOptions, 'onDark'> | null,
): IconOptions {
  return { onDark: !!o?.onDark, weight: s.iconWeight, color: s.iconColor, family: s.iconFamily };
}

/** The glyph for a kind of item in a weight, or the style's own glyph when the weight is `auto` or missing. */
function glyphOf(k: string, weight: IconWeight | undefined, own: string, family?: IconFamily): string {
  if (family && family !== 'standard') {
    const name = `${k}-${family}-${!weight || weight === 'auto' ? 'line' : weight}`;
    if (ICONS.glyph[name]) return name;
  }
  const name = `${k}-${weight}`;
  return weight && weight !== 'auto' && ICONS.glyph[name] ? name : own;
}

/** The colour a colour mode gives one kind of item, or null when the mode is `auto` (the style decides). */
function colourOf(mode: IconColor | undefined, k: string, social: boolean, th: Theme, dark: boolean): string | null {
  const own = dark ? th.accentDark : icn(th);
  const lit = (c: string): string => (dark ? lighten(c) : c);
  switch (mode) {
    case 'theme':
      return own;
    case 'colourful': {
      const c = (social ? BRAND[k] : HUE[k]) || th.accent;
      return lit(c);
    }
    case 'brand': {
      const c = social ? BRAND[k] : undefined;
      return c ? lit(c) : own;
    }
    case 'two': {
      const last = th.stops.at(-1) || th.accent;
      return social ? (dark ? lighten(last) : deepen(last)) : own;
    }
    case 'neutral':
      return dark ? '#ADADAD' : '#616161';
    default:
      return null;
  }
}

/** A deeper shade of a colour, for the bottom of the Depth style's gradient. */
function shade(c: string): string {
  const [L, C, h] = oklch(c);
  return fromOklch(Math.max(0.2, L - 0.1), C, h);
}

/** The icon spec for one kind of item in an icon style. `social` is true for profile links; `onPanel` for icons on a coloured panel. */
export function iconFor(
  st: DrawnIconStyle,
  k: string,
  size: number,
  th: Theme,
  o?: IconOptions | null,
  social?: boolean,
  onPanel?: boolean,
): IconSpec;
export function iconFor(
  st: IconStyle,
  k: string,
  size: number,
  th: Theme,
  o?: IconOptions | null,
  social?: boolean,
  onPanel?: boolean,
): IconSpec | null;
export function iconFor(
  st: IconStyle,
  k: string,
  size: number,
  th: Theme,
  o?: IconOptions | null,
  social?: boolean,
  onPanel?: boolean,
): IconSpec | null {
  const dark = !!o?.onDark;
  const glyph = glyphOf(k, o?.weight, GLYPH_BY_NAME[k] || 'globe', o?.family);
  /* the chosen colour mode, or null to keep the style's own colours; icons on a panel stay white */
  const pick = onPanel ? null : colourOf(o?.color, k, !!social, th, dark);
  const inset = size >= 20 ? 0.14 : 0;
  /* the theme colour deep enough to show on white, or the accent for dark backgrounds */
  const themed = dark ? th.accentDark : deepen(th.accent);
  switch (st) {
    /* Soft circles: each kind of contact in its own clear colour on a soft tint, links in their brand colours */
    case 'fluent': {
      const cc = pick || colourOf('colourful', k, !!social, th, dark) || themed;
      return {
        kind: 'chip',
        icon: glyph,
        size,
        shape: 'circle',
        fill: cc,
        fillOpacity: dark ? 0.26 : 0.13,
        fg: cc,
        pad: 0.18,
      };
    }
    case 'glyph':
      return {
        kind: 'glyph',
        icon: glyph,
        size,
        color: onPanel ? WHITE : pick || (dark ? th.accentDark : icn(th)),
        inset,
      };
    /* Gradient: the glyph itself filled with the palette, lightened on dark backgrounds */
    case 'gradient':
      return {
        kind: 'glyph',
        icon: glyph,
        size,
        color: onPanel ? WHITE : pick || (dark ? th.stops.map(lighten) : th.stops),
        inset,
      };
    case 'tile':
      return {
        kind: 'chip',
        icon: glyph,
        size,
        shape: 'square',
        fill: onPanel ? [WHITE, WHITE] : pick ? deep(pick) : th.accent,
        fg: onPanel ? th.accent : WHITE,
        pad: 0.2,
      };
    /* Circles: a solid, deep theme colour so the white glyph stays crisp at small sizes */
    case 'circle':
      return {
        kind: 'chip',
        icon: glyph,
        size,
        shape: 'circle',
        fill: onPanel ? WHITE : deep(pick || deepen(th.accent)),
        fg: onPanel ? th.accent : WHITE,
        pad: 0.2,
      };
    case 'squircle':
      return {
        kind: 'chip',
        icon: glyph,
        size,
        shape: 'squircle',
        fill: onPanel ? WHITE : deep(pick || deepen(th.accent)),
        fg: onPanel ? th.accent : WHITE,
        pad: 0.22,
      };
    case 'soft': {
      const sc = pick || themed;
      return {
        kind: 'chip',
        icon: glyph,
        size,
        shape: 'rounded',
        fill: onPanel ? WHITE : sc,
        fillOpacity: onPanel ? 1 : dark ? 0.24 : 0.12,
        fg: onPanel ? th.accent : sc,
        pad: 0.18,
      };
    }
    /* Glass: a see-through tinted square with a light top edge */
    case 'glass': {
      const gc = onPanel ? WHITE : pick || themed;
      return {
        kind: 'chip',
        icon: glyph,
        size,
        shape: 'rounded',
        fill: gc,
        fillOpacity: dark ? 0.22 : 0.12,
        stroke: gc,
        strokeW: 1,
        strokeOpacity: 0.45,
        gloss: true,
        fg: onPanel ? WHITE : gc,
        pad: 0.2,
      };
    }
    case 'ring': {
      const rc = onPanel ? WHITE : pick || themed;
      return { kind: 'chip', icon: glyph, size, shape: 'circle', stroke: rc, strokeW: 1.2, fg: rc, pad: 0.24 };
    }
    case 'square': {
      const qc = onPanel ? WHITE : pick || themed;
      return { kind: 'chip', icon: glyph, size, shape: 'rounded', stroke: qc, strokeW: 1.2, fg: qc, pad: 0.22 };
    }
    /* Sticker: a solid circle with a white edge and a soft shadow */
    case 'sticker':
      return {
        kind: 'chip',
        icon: glyph,
        size,
        shape: 'circle',
        fill: onPanel ? WHITE : deep(pick || deepen(th.accent)),
        stroke: WHITE,
        strokeW: 1.5,
        shadow: true,
        fg: onPanel ? th.accent : WHITE,
        pad: 0.26,
      };
    /* Depth: a raised square, lighter at the top, with a soft shadow */
    case 'depth': {
      const dc = onPanel ? WHITE : deep(pick || deepen(th.accent));
      return {
        kind: 'chip',
        icon: glyph,
        size,
        shape: 'rounded',
        fill: onPanel ? [WHITE, WHITE] : [dc, shade(dc)],
        vertical: true,
        shadow: true,
        fg: onPanel ? th.accent : WHITE,
        pad: 0.22,
      };
    }
    case 'brand': {
      const brand = BRAND[k];
      if (social && brand && !pick)
        return { kind: 'chip', icon: glyph, size, shape: 'rounded', fill: brand, fg: WHITE, pad: 0.18 };
      if (social && pick)
        return { kind: 'chip', icon: glyph, size, shape: 'rounded', fill: deep(pick), fg: WHITE, pad: 0.18 };
      const bc = onPanel ? WHITE : pick || themed;
      return { kind: 'glyph', icon: glyph, size, color: bc, inset };
    }
    case 'rounded':
      return {
        kind: 'chip',
        icon: glyph,
        size,
        shape: 'rounded',
        fill: onPanel ? [WHITE, WHITE] : pick ? deep(pick) : th.stops,
        fg: onPanel ? th.accent : WHITE,
        pad: 0.22,
      };
    /* Outline: thin line icons, grey unless a colour is chosen */
    case 'outline':
      return {
        kind: 'glyph',
        icon: glyphOf(k, o?.weight && o.weight !== 'auto' ? o.weight : 'line', OCT_BY_NAME[k] || 'octLink', o?.family),
        size,
        color: onPanel ? WHITE : pick || (dark ? '#9198A1' : '#59636E'),
        inset,
      };
  }
  return null;
}

/** Changes a design's own icon in place for the chosen weight and colour, keeping its shape and size. */
function tweak(sp: IconSpec, k: string, social: boolean, th: Theme, o: IconOptions): void {
  sp.icon = glyphOf(k, o.weight, sp.icon, o.family);
  const c = sp.onPanel ? null : colourOf(o.color, k, social, th, !!o.onDark);
  if (!c) return;
  if (sp.kind === 'glyph') {
    if (sp.color !== WHITE) sp.color = c;
  } else if (sp.stroke && !sp.fill) {
    sp.stroke = c;
    sp.fg = c;
  } else if (sp.fillOpacity && sp.fillOpacity < 1) {
    sp.fill = c;
    sp.fg = c;
  } else if (sp.fg === WHITE) {
    sp.fill = deep(c);
  }
}

/**
 * Swaps the design's icons (`ic_` contacts, `so_` links, `m_` GitHub details) for the chosen style. Text labels
 * removes them. With the design's own style, a chosen weight or colour still changes its icons.
 */
export function restyle(
  specs: SpecMap,
  s: Pick<SignatureState, 'iconStyle' | 'iconWeight' | 'iconColor'> & Partial<Pick<SignatureState, 'iconFamily'>>,
  th: Theme,
  o?: IconOptions | null,
): SpecMap {
  const st = s.iconStyle;
  const io = iconOpts(s, o);
  const own = !st || st === 'auto';
  if (
    own &&
    (!io.family || io.family === 'standard') &&
    (!io.weight || io.weight === 'auto') &&
    (!io.color || io.color === 'auto')
  )
    return specs;
  Object.keys(specs).forEach((n) => {
    const m = /^(ic|so|m)_(.+)$/.exec(n);
    if (!m) return;
    if (st === 'labels') {
      delete specs[n];
      return;
    }
    const sp = specs[n];
    if (sp.kind !== 'glyph' && sp.kind !== 'chip') return;
    if (own) {
      tweak(sp, m[2], m[1] === 'so', th, io);
      return;
    }
    specs[n] = iconFor(st, m[2], sp.size, th, io, m[1] === 'so', !!sp.onPanel);
  });
  return specs;
}

/** True when the user picked an icon style, so designs that show text labels by default add icons to restyle. */
export function wantIcons(s: Pick<SignatureState, 'iconStyle'>): boolean {
  return s.iconStyle && s.iconStyle !== 'auto' && s.iconStyle !== 'labels';
}

/** The icon colour for a theme: the colour picked for a solid background, else the accent. */
export function icn(th: Pick<Theme, 'icon' | 'accent'>): string {
  return th.icon || th.accent;
}
