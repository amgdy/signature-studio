/*
 * Plain helpers for the settings panes: the text fields, the notes under each setting, the accessibility read-out,
 * number and size formats, and reading image files. All plain functions, so they are easy to test.
 */
import {
  DEFAULTS,
  FONT_OPTIONS,
  ICON_COLORS,
  ICON_STYLES,
  ICON_WEIGHTS,
  PHOTO_SIZES,
  STYLE_KEY_LIST,
  bgInfo,
  bgTint,
  canHandwrite,
  designById,
  download,
  paletteFrom,
  themeById,
  weight,
} from './engine.ts';
import type { BuildResult, DesignInfo, HostingMode, Motion, ShowFlags, SignatureState, StyleKey } from './engine.ts';

/* ---------- Text fields ---------- */

/** The state keys that hold text. */
export type TextKey = {
  [K in keyof SignatureState]: SignatureState[K] extends string ? K : never;
}[keyof SignatureState];

/** The text the user types about themselves: every text key except the style settings. */
export type DetailKey = Exclude<TextKey, StyleKey | 'motion' | 'emailProfile'>;

const NOT_DETAILS = new Set<string>([...STYLE_KEY_LIST, 'motion', 'cols', 'emailProfile']);
function isDetailKey(k: string): k is DetailKey {
  return !NOT_DETAILS.has(k) && typeof Reflect.get(DEFAULTS, k) === 'string';
}
/** Every detail key, in the engine's order. */
export const DETAIL_KEYS: readonly DetailKey[] = Object.keys(DEFAULTS).filter(isDetailKey);

export interface FieldSpec {
  key: DetailKey;
  label: string;
  /** The switch beside the field that shows or hides it in the signature. */
  show?: keyof ShowFlags;
  /** A short note after the label, such as which design uses the field. */
  note?: string;
  placeholder?: string;
  type?: 'text' | 'tel' | 'email' | 'url';
  autoComplete?: string;
  multiline?: boolean;
  dir?: 'auto';
}

export const DETAIL_FIELDS: readonly FieldSpec[] = [
  { key: 'fullName', label: 'Full name', autoComplete: 'name' },
  { key: 'initials', label: 'Initials', note: 'Monogram Card', placeholder: 'From your name' },
  {
    key: 'altName',
    label: 'Name in Arabic',
    show: 'altName',
    note: 'or any language',
    placeholder: 'e.g. سام تايلور',
    dir: 'auto',
  },
  { key: 'pronouns', label: 'Pronouns', show: 'pronouns', placeholder: 'e.g. he/him' },
  { key: 'title', label: 'Job title', show: 'title', autoComplete: 'organization-title' },
  { key: 'team', label: 'Team', show: 'team' },
  { key: 'company', label: 'Company', show: 'company', autoComplete: 'organization' },
  { key: 'region', label: 'Region', show: 'region' },
  { key: 'location', label: 'Location', show: 'location' },
];

export const CONTACT_FIELDS: readonly FieldSpec[] = [
  { key: 'phone', label: 'Mobile', show: 'phone', type: 'tel', autoComplete: 'tel' },
  { key: 'office', label: 'Office phone', show: 'office', type: 'tel', placeholder: 'Optional' },
  { key: 'email', label: 'Email', show: 'email', type: 'email', autoComplete: 'email' },
  { key: 'website', label: 'Website', show: 'website', type: 'url', autoComplete: 'url' },
  { key: 'booking', label: 'Booking link', show: 'booking', type: 'url', placeholder: 'Bookings or calendar link' },
  { key: 'hours', label: 'Working hours', show: 'hours', placeholder: 'e.g. Sun to Thu, 8:00 to 17:00 (AST)' },
  { key: 'languages', label: 'Languages', show: 'languages', placeholder: 'e.g. English, Arabic' },
];

export const LINK_FIELDS: readonly FieldSpec[] = [
  { key: 'linkedin', label: 'LinkedIn', show: 'linkedin', type: 'url' },
  { key: 'github', label: 'GitHub', show: 'github', type: 'url' },
  {
    key: 'handle',
    label: 'Handle',
    show: 'handle',
    note: 'Profile Cards',
    placeholder: 'From your GitHub link, e.g. samtaylor',
  },
  { key: 'x', label: 'X', show: 'x', type: 'url' },
  { key: 'youtube', label: 'YouTube', show: 'youtube', type: 'url', placeholder: 'youtube.com/@yourchannel' },
  {
    key: 'learn',
    label: 'Microsoft Learn',
    show: 'learn',
    type: 'url',
    placeholder: 'Learn profile or transcript link',
  },
  { key: 'blog', label: 'Blog', show: 'blog', type: 'url', placeholder: 'Your blog or newsletter' },
];

export const MESSAGE_FIELDS: readonly FieldSpec[] = [
  { key: 'tagline', label: 'Tagline', show: 'tagline' },
  {
    key: 'banner',
    label: 'Banner',
    show: 'banner',
    note: 'new messages',
    placeholder: 'e.g. Join me at our developer day in Lisbon',
  },
  { key: 'bannerUrl', label: 'Banner link', type: 'url', placeholder: 'Where the banner goes' },
  { key: 'signoff', label: 'Sign-off', show: 'signoff', placeholder: 'Regards,' },
  { key: 'signoffName', label: 'Signed as', placeholder: 'Sam' },
  {
    key: 'disclaimer',
    label: 'Disclaimer',
    show: 'disclaimer',
    multiline: true,
    placeholder: 'A legal or confidentiality notice, in small print',
  },
];

export const FOCUS_FIELDS: readonly FieldSpec[] = [
  { key: 'focusLabel', label: 'Label', placeholder: 'e.g. Leading, Specialties, Services' },
  { key: 'focus', label: 'Areas', show: 'focus', placeholder: 'e.g. Technical strategy, Field execution' },
];

export const FEATURED_HEADING: FieldSpec = {
  key: 'featLabel',
  label: 'Heading',
  placeholder: 'e.g. Featured, Pinned, Recent work, Publications',
};

export const ITEMS = [1, 2, 3] as const;

export function featuredItemFields(n: 1 | 2 | 3): readonly FieldSpec[] {
  return [
    {
      key: `feat${n}`,
      label: 'Title',
      placeholder: 'e.g. a project, repository, talk or product',
      ...(n === 1 ? { show: 'featured' as const } : {}),
    },
    { key: `feat${n}desc`, label: 'Description', placeholder: 'One short line' },
    { key: `feat${n}url`, label: 'Link', type: 'url', placeholder: 'Optional, e.g. github.com/you/project' },
    { key: `feat${n}tag`, label: 'Tag', placeholder: 'Optional, e.g. Open source, 2026, Talk' },
  ];
}

const STAT_EXAMPLES = [
  ['10+', 'years at Microsoft'],
  ['1st', 'KSA Hackathon 2026'],
  ['2', 'open-source Copilot tools'],
] as const;

export function statFields(n: 1 | 2 | 3): readonly FieldSpec[] {
  const [value, label] = STAT_EXAMPLES[n - 1] ?? ['', ''];
  return [
    {
      key: `stat${n}`,
      label: `Highlight ${n}`,
      placeholder: `e.g. ${value}`,
      ...(n === 1 ? { show: 'stats' as const } : {}),
    },
    { key: `stat${n}label`, label: 'Its label', placeholder: `e.g. ${label}` },
  ];
}

export const QUOTE_FIELDS: readonly FieldSpec[] = [
  { key: 'quote', label: 'Quote or motto', show: 'quote' },
  { key: 'quoteBy', label: 'Said by', placeholder: 'Optional, e.g. Satya Nadella' },
];

export const DEV_FIELDS: readonly FieldSpec[] = [
  { key: 'devPrompt', label: 'Agent question', placeholder: 'e.g. who can help us ship AI apps on Azure?' },
  { key: 'devGhost', label: 'Editor suggestion', placeholder: "e.g. let's build something great together" },
];

const keysOf = (fields: readonly FieldSpec[]): DetailKey[] => fields.map((f) => f.key);

/**
 * The detail keys grouped as the Studio sections show them: Details, Contact and Extras. A key that no section
 * lists goes under details, so nothing is lost.
 */
export const DETAIL_GROUPS: Readonly<Record<'details' | 'contact' | 'extras', readonly DetailKey[]>> = (() => {
  const contact = keysOf([...CONTACT_FIELDS, ...LINK_FIELDS]);
  const extras = keysOf([
    ...MESSAGE_FIELDS,
    ...FOCUS_FIELDS,
    FEATURED_HEADING,
    ...ITEMS.flatMap(featuredItemFields),
    ...ITEMS.flatMap(statFields),
    ...QUOTE_FIELDS,
    ...DEV_FIELDS,
  ]);
  const listed = new Set([...contact, ...extras]);
  const details = keysOf(DETAIL_FIELDS);
  for (const k of DETAIL_KEYS) if (!listed.has(k) && !details.includes(k)) details.push(k);
  return { details, contact, extras };
})();

/* ---------- Formats ---------- */

/** A byte count as people read it: "512 B", "8.4 KB", "43 KB". */
export function kb(n: number): string {
  return n < 1024 ? `${n} B` : `${(n / 1024).toFixed(n < 10240 ? 1 : 0)} KB`;
}

/** How images are referenced: hosted only when a base URL is set. */
export function hostingMode(state: Pick<SignatureState, 'hosting'>): Exclude<HostingMode, 'folder'> {
  return state.hosting.mode === 'hosted' && state.hosting.base.trim() ? 'hosted' : 'embed';
}

/** "9 images (2 animated) · 41 KB" for a built signature. */
export function weightText(res: BuildResult, mode: Exclude<HostingMode, 'folder'>): string {
  const w = weight(res, mode);
  return `${plural(w.images, 'image')}${w.animated ? ` (${w.animated} animated)` : ''} · ${kb(w.imageBytes + w.htmlBytes)}${
    mode === 'hosted' ? ' (hosted images)' : ''
  }`;
}

export function plural(n: number, one: string, many = `${one}s`): string {
  return `${n} ${n === 1 ? one : many}`;
}

export function errorText(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

/** Image kinds whose animation is worth replaying: handwriting, the photo and script text. */
const REPLAYABLE = new Set(['hand', 'photo', 'script']);

/** The label of the replay button, or null when nothing in the signature plays an animation worth replaying. */
export function replayLabel(res: BuildResult | null): string | null {
  if (!res) return null;
  const images = Object.values(res.images);
  if (!images.some((im) => im.animated && REPLAYABLE.has(im.kind))) return null;
  return res.images['hname']?.animated ? 'Replay writing' : 'Replay animation';
}

/* ---------- Notes under the settings ---------- */

function design(state: SignatureState): DesignInfo | undefined {
  return designById(state.template);
}

export function columnsNote(state: SignatureState): string {
  const d = design(state);
  if (state.cols === 3)
    return 'Who you are, how to reach you, and your links as a column of icons, with your name across all three. Sized to fit a phone screen in Outlook; with no links to show it stays in two columns.';
  if (state.cols === 2)
    return 'Who you are on the left and how to reach you on the right of a thin rule, with your name across both. Sized to fit a phone screen in Outlook.';
  if (state.cols === 1)
    return 'Everything in one column beside the photo, in every template. The easiest read on a phone.';
  return `Auto uses each template’s own layout (${d?.name ?? state.template}: ${
    d?.cols === 2 ? '2 columns' : '1 column'
  }). Every layout fits a phone screen, in every Outlook.`;
}

export function photoPositionNote(state: SignatureState): string {
  return state.photoPos === 'name'
    ? 'Your photo sits beside your name, with both columns under it. A large photo can move above your name on a phone.'
    : 'Your photo is its own column beside both columns on wide screens, and moves above them on narrow screens. If an email app ever shows it above on a wide screen too, choose Beside name.';
}

export function photoSizeNote(state: SignatureState): string {
  if (state.template === 'minimal') return 'Minimal has no photo. Choose another design to show one.';
  const z = PHOTO_SIZES.find((x) => x.id === state.photoSize);
  if (state.template === 'monogram')
    return `${z?.note ?? z?.label ?? ''}. Changes the initials badge. Replies keep their small badge.`;
  const big = state.photoSize === 'L' || state.photoSize === 'XL';
  return `${z ? `${z.note ?? z.label}. ` : ''}${
    big
      ? 'Layouts adjust on phones to keep your photo at this size. Replies keep their small photo.'
      : 'Replies keep their small photo.'
  }${state.photoShape === 'polaroid' ? ' Polaroid adds a little more so the photo inside its frame stays large.' : ''}`;
}

export function iconNote(state: SignatureState): string {
  const st = ICON_STYLES.find((x) => x.id === state.iconStyle);
  const own = state.iconStyle !== 'auto';
  return `${st?.note ?? ''}${own && state.template === 'minimal' ? ' Minimal stays text only.' : ''}${
    own && state.template === 'azure' ? ' The Essentials grid keeps its text labels.' : ''
  }`;
}

const NO_ICONS = 'Text labels have no icons, so this does not change them.';

/** The note under the icon weight: what the picked weight does. */
export function iconWeightNote(state: SignatureState): string {
  if (state.iconStyle === 'labels') return NO_ICONS;
  return ICON_WEIGHTS.find((x) => x.id === state.iconWeight)?.note ?? '';
}

/** The note under the icon colour: where the picked colours come from. */
export function iconColorNote(state: SignatureState): string {
  if (state.iconStyle === 'labels') return NO_ICONS;
  return ICON_COLORS.find((x) => x.id === state.iconColor)?.note ?? '';
}

/** How text shades keep the chosen colours readable on light and dark backgrounds. */
export function colorsNote(colors: readonly string[]): string {
  const first = colors[0]?.toUpperCase();
  if (!first) return 'Pick 1 to 4 colours. The first one colours your name, links and icons.';
  const p = paletteFrom(colors);
  const same = (c: string): boolean => c.toUpperCase() === first;
  const light = same(p.accent)
    ? `Text uses ${first} as it is on light backgrounds`
    : `Text uses ${p.accent}, a deeper shade of ${first}, on light backgrounds`;
  const dark = same(p.accentDark) ? `${first} in dark mode` : `${p.accentDark}, a lighter shade, in dark mode`;
  return `${light}, and ${dark}, so it stays easy to read.`;
}

const ANIM_NAMES: Readonly<Record<string, string>> = {
  none: 'no photo animation',
  spin: 'Spin',
  sweep: 'Sweep',
  orbit: 'Orbit',
};

export function animationNote(state: SignatureState): string {
  if (!state.show.animate) return 'Animations are off, so photos stay still.';
  if (state.photoShape === 'polaroid' && state.photoAnim !== 'none') return 'Polaroid photos use the Shine animation.';
  const d = design(state);
  const anim = d?.anim ?? 'none';
  return `Auto uses each template’s suggestion; ${d?.name ?? state.template} suggests ${
    ANIM_NAMES[anim] ?? anim
  }. Draw plays once, like the handwriting.`;
}

export function motionNote(state: SignatureState): string {
  return state.motion === 'loop'
    ? 'Animations loop for as long as the email is open. Some readers find endless motion distracting.'
    : 'Recommended: animations play for up to 5 seconds, then rest on the finished picture (WCAG 2.2.2).';
}

export type NameMode = 'typed' | 'hand' | 'forced' | 'unsupported';

/** How the name is written: the design can force handwriting, and some names have letters the styles lack. */
export function nameMode(state: SignatureState): NameMode {
  if (design(state)?.handAlways) return 'forced';
  if (state.nameStyle !== 'hand') return 'typed';
  return canHandwrite(state.fullName, state.handStyle) ? 'hand' : 'unsupported';
}

export function nameNote(state: SignatureState): string {
  switch (nameMode(state)) {
    case 'forced':
      return 'The Handwritten template always writes your name by hand. Choose any other template to use a typed name.';
    case 'typed':
      return state.font === 'auto'
        ? 'Your name uses the design’s default font. Choose a font above, or Handwritten for a stroke-drawn name.'
        : `Your name uses the ${FONT_OPTIONS.find((font) => font.id === state.font)?.label} fallback stack. Choose Handwritten for a stroke-drawn name.`;
    case 'unsupported':
      return 'Your name uses letters the handwriting styles don’t include, so it stays typed.';
    default:
      return 'Written stroke by stroke when animation is supported and enabled. Replies get a smaller still version; clients that do not animate show the finished name.';
  }
}

/** The solid background colour in use: the theme tint or a picked colour. */
export function backgroundHex(state: SignatureState): string {
  return state.bgColor === 'tint' ? bgTint(state) : state.bgColor;
}

export interface Note {
  text: string;
  warn: boolean;
}

export function backgroundNote(state: SignatureState): Note {
  if (state.bgMode !== 'solid')
    return {
      text: 'The signature has no background of its own, so the email’s background shows through and it blends in with light and dark mode.',
      warn: false,
    };
  const hex = backgroundHex(state);
  const info = bgInfo(hex);
  if (info.contrast < 4.5)
    return { text: 'This mid-tone colour makes text hard to read. Pick a lighter or darker shade.', warn: true };
  return info.dark
    ? {
        text: `A rounded ${hex} card. Text and icons switch to light colours on it, and Outlook keeps it dark in dark mode.`,
        warn: false,
      }
    : {
        text: `A rounded ${hex} card behind the signature (classic Outlook for Windows draws square corners). Outlook’s dark mode darkens it automatically.`,
        warn: false,
      };
}

export function themeHint(state: SignatureState): string {
  const d = design(state);
  const t = d ? themeById(d.theme) : undefined;
  return d && t ? `Suggested for ${d.name}: ${t.name}` : '';
}

/* ---------- Accessibility read-out ---------- */

export interface ReadoutInput {
  /** The signature HTML with embedded images. */
  html: string;
  /** How many images are animated. */
  animated: number;
  cols: 1 | 2 | 3;
  state: { motion: Motion; altName: string; show: { altName: boolean } };
}

/** The one-line accessibility summary under the preview. */
export function readoutParts({ html, animated, cols, state }: ReadoutInput): string[] {
  const imgs = html.match(/<img [^>]*>/g) ?? [];
  const deco = imgs.filter((x) => x.includes('alt=""')).length;
  const motion = animated
    ? `${animated} animated, ${state.motion === 'loop' ? 'looping selected' : 'brief motion selected'}`
    : 'no animation';
  const lang = `tagged as English${state.altName && state.show.altName ? ', Arabic name right-to-left' : ''}`;
  return [
    `${plural(imgs.length, 'image')} with alt text (${imgs.length - deco} described, ${deco} marked as decoration)`,
    motion,
    lang,
    plural(cols, 'column'),
    'Open Check for measured contrast, phone fit and compatibility',
  ];
}

/* ---------- Files ---------- */

/** The longest side of an uploaded photo. Larger photos only make the email heavier. */
export const PHOTO_MAX = 900;
/** A logo mark is drawn small, so it is kept within this square. */
export const LOGO_MAX = 128;
/** The image types a logo can be: the ones every Outlook shows. */
export const LOGO_TYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'] as const;

export type ImageErrorReason = 'not-image' | 'not-logo' | 'unreadable';

const IMAGE_ERRORS: Record<ImageErrorReason, string> = {
  'not-image': 'Please choose an image file.',
  'not-logo': 'Please choose a PNG, JPEG, GIF or WebP image.',
  unreadable: 'That image could not be read.',
};

export class PhotoError extends Error {
  readonly reason: ImageErrorReason;
  constructor(reason: ImageErrorReason) {
    super(IMAGE_ERRORS[reason]);
    this.reason = reason;
  }
}

/** The size of an image scaled down (never up) so its longest side is at most `max`. */
export function fitWithin(w: number, h: number, max: number): { w: number; h: number } {
  const k = Math.min(1, max / Math.max(w, h, 1));
  return { w: Math.max(1, Math.round(w * k)), h: Math.max(1, Math.round(h * k)) };
}

function readImage(file: File, max: number, type: 'image/jpeg' | 'image/png'): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const im = new Image();
    im.addEventListener('load', () => {
      URL.revokeObjectURL(url);
      const { w, h } = fitWithin(im.naturalWidth, im.naturalHeight, max);
      const c = document.createElement('canvas');
      c.width = w;
      c.height = h;
      const g = c.getContext('2d');
      if (!g) {
        reject(new PhotoError('unreadable'));
        return;
      }
      g.imageSmoothingQuality = 'high';
      g.drawImage(im, 0, 0, w, h);
      resolve(type === 'image/png' ? c.toDataURL(type) : c.toDataURL(type, 0.92));
    });
    im.addEventListener('error', () => {
      URL.revokeObjectURL(url);
      reject(new PhotoError('unreadable'));
    });
    im.src = url;
  });
}

/** Reads an image file and scales it down to a JPEG data URL, at most PHOTO_MAX pixels on its longest side. */
export function readPhoto(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) return Promise.reject(new PhotoError('not-image'));
  return readImage(file, PHOTO_MAX, 'image/jpeg');
}

/** Reads a logo and scales it down to fit LOGO_MAX × LOGO_MAX, as a PNG data URL so transparency is kept. */
export function readLogo(file: File): Promise<string> {
  if (!LOGO_TYPES.some((t) => t === file.type)) return Promise.reject(new PhotoError('not-logo'));
  return readImage(file, LOGO_MAX, 'image/png');
}

/** What the file picker accepts for signature and styles files. */
export const YAML_FILES = '.yaml,.yml,application/yaml,application/x-yaml,text/yaml,text/x-yaml';

/** Downloads text as a YAML file. */
export function saveYaml(text: string, fileName: string): void {
  download(new Blob([text], { type: 'application/yaml' }), fileName);
}

/** Opens the browser's file picker and resolves with the chosen file, or null when cancelled. */
export function pickFile(accept: string): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    input.addEventListener('change', () => resolve(input.files?.[0] ?? null), { once: true });
    input.addEventListener('cancel', () => resolve(null), { once: true });
    input.click();
  });
}
