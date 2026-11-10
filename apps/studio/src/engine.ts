/*
 * The Studio's view of the engine: typed lists and lookups derived from its exports, `toState()` and `pickStyle()`,
 * and the background build queue. Engine functions the Studio calls as they are are re-exported unchanged.
 */
import {
  ANIM_OPTIONS,
  BG_PRESETS,
  CARD_COLORS,
  DEFAULT_STATE,
  DESIGN_CATEGORY_OPTIONS,
  EXTRA_OPTIONS,
  HW_PENS,
  ICON_COLOR_OPTIONS,
  ICON_FAMILY_OPTIONS,
  ICON_STYLE_OPTIONS,
  ICON_WEIGHT_OPTIONS,
  LOOK_OPTIONS,
  PALETTE_GROUP_OPTIONS,
  PHOTO_SIZE_OPTIONS,
  REPLY_STYLE_OPTIONS,
  SHAPE_OPTIONS,
  TEMPLATES,
  THEMES,
  handStyles,
  normalize,
} from '@signature-studio/engine';
import type {
  DesignCategory,
  ExtraKind,
  HandPen,
  IconColor,
  IconFamily,
  IconStyle,
  IconWeight,
  PaletteGroup,
  PhotoAnim,
  PhotoLook,
  PhotoShape,
  PhotoSize,
  ReplyStyle,
  ShowFlags,
  SignatureState,
  ThemePreset,
} from '@signature-studio/engine';

export {
  bgInfo,
  bgTint,
  build,
  canHandwrite,
  copyRich,
  copyText,
  download,
  downloadHtml,
  EMAIL_PROFILE_OPTIONS,
  FONT_OPTIONS,
  handCredit,
  handLicense,
  imagesPackage,
  isOptimized,
  MAX_COLORS,
  logoColors,
  outlookPackage,
  paletteFrom,
  previewHand,
  previewIcon,
  previewPhoto,
  resolveTheme as activeTheme,
  setOptimize,
  themeSettings,
  TEXT_SIZE_OPTIONS,
  weight,
} from '@signature-studio/engine';

export type {
  BackgroundMode,
  BuildOptions,
  BuildResult,
  ColumnsSetting,
  DesignCategory,
  ExtraKind,
  HandPen,
  HostingMode,
  HostingSettings,
  IconColor,
  IconFamily,
  IconPreviewOptions,
  IconStyle,
  IconWeight,
  Motion,
  NameStyle,
  PhotoAnim,
  PhotoLook,
  PhotoPosition,
  PhotoSettings,
  PhotoShape,
  PhotoSize,
  Placement,
  RenderedImage,
  ReplyStyle,
  ShowFlags,
  SignatureState,
  Version,
} from '@signature-studio/engine';

export {
  checkSignatureHealth,
  CLIENT_PROFILES,
  COMPATIBILITY_REVIEWED,
  COMPATIBILITY_SOURCES,
  SIGNATURE_REQUIREMENTS,
} from '@signature-studio/engine/check';
export type { CheckStatus, SignatureHealthReport } from '@signature-studio/engine/check';

/** A choice in a picker. */
export interface Choice<Id extends string = string> {
  readonly id: Id;
  readonly label: string;
  readonly note?: string;
}

export interface DesignInfo {
  readonly id: string;
  readonly name: string;
  /** Suggested palette. */
  readonly theme: string;
  readonly anim: PhotoAnim;
  /** Columns when the user picks Auto. */
  readonly cols: 1 | 2;
  readonly icons: IconStyle;
  readonly cats: readonly DesignCategory[];
  readonly badge: string;
  readonly tag: string;
  readonly blurb: string;
  /** The design always writes the name by hand. */
  readonly handAlways: boolean;
}

export type ThemeInfo = Readonly<ThemePreset & { id: string }>;

/** The keys a saved style or preset carries: the look, never the person's details. */
export const STYLE_KEY_LIST = [
  'template',
  'colors',
  'gradient',
  'cols',
  'photoPos',
  'photoSize',
  'replyStyle',
  'iconStyle',
  'iconFamily',
  'iconWeight',
  'iconColor',
  'photoShape',
  'photoLook',
  'photoAnim',
  'nameStyle',
  'font',
  'textSize',
  'handStyle',
  'handPen',
  'bgMode',
  'bgColor',
] as const satisfies readonly (keyof SignatureState)[];
export type StyleKey = (typeof STYLE_KEY_LIST)[number];

/** The show switches a style carries. */
export const STYLE_SHOW_LIST = ['flourish', 'logo', 'animate'] as const satisfies readonly (keyof ShowFlags)[];
type StyleShowKey = (typeof STYLE_SHOW_LIST)[number];

/** The look of a signature: a preset, a saved style or a shuffle. */
export type StyleValues = { [K in StyleKey]?: SignatureState[K] } & {
  show?: { [K in StyleShowKey]?: boolean };
};

export const DESIGNS: readonly DesignInfo[] = TEMPLATES.map((d) => ({
  id: d.id,
  name: d.name,
  theme: d.theme,
  anim: d.anim,
  cols: d.cols,
  icons: d.icons,
  cats: d.cats,
  badge: d.badge,
  tag: d.tag,
  blurb: d.blurb,
  handAlways: d.handAlways === true,
}));

const designMap = new Map(DESIGNS.map((d) => [d.id, d]));
export function designById(id: string): DesignInfo | undefined {
  return designMap.get(id);
}

export const THEME_LIST: readonly ThemeInfo[] = Object.entries(THEMES).map(([id, t]) => Object.assign({}, t, { id }));
const themeMap = new Map(THEME_LIST.map((t) => [t.id, t]));
export function themeById(id: string): ThemeInfo | undefined {
  return themeMap.get(id);
}

export const DESIGN_CATEGORIES: readonly Choice<DesignCategory>[] = DESIGN_CATEGORY_OPTIONS;
export const ICON_STYLES: readonly Choice<IconStyle>[] = ICON_STYLE_OPTIONS;
export const ICON_FAMILIES: readonly Choice<IconFamily>[] = ICON_FAMILY_OPTIONS;
export const ICON_WEIGHTS: readonly Choice<IconWeight>[] = ICON_WEIGHT_OPTIONS;
export const ICON_COLORS: readonly Choice<IconColor>[] = ICON_COLOR_OPTIONS;
export const SHAPES: readonly Choice<PhotoShape>[] = SHAPE_OPTIONS;
export const LOOKS: readonly Choice<PhotoLook>[] = LOOK_OPTIONS;
export const ANIMS: readonly Choice<PhotoAnim>[] = ANIM_OPTIONS;
export const PHOTO_SIZES: readonly Choice<PhotoSize>[] = PHOTO_SIZE_OPTIONS;
export const REPLY_STYLES: readonly Choice<ReplyStyle>[] = REPLY_STYLE_OPTIONS;
export const PALETTE_GROUPS: readonly Choice<PaletteGroup>[] = PALETTE_GROUP_OPTIONS;
export const EXTRAS: readonly (Choice<ExtraKind> & { readonly own: string })[] = EXTRA_OPTIONS;
export const BACKGROUNDS: readonly Choice[] = BG_PRESETS;
/** More card colours for the custom background picker, as light and dark groups. */
export const CARD_GROUPS: readonly { label: string; colors: readonly { name: string; hex: string }[] }[] =
  CARD_COLORS.map((g) => ({ label: g.label, colors: g.colors.map((c) => ({ name: c.label, hex: c.id })) }));
/** Pens in the order the Studio shows them. */
export const PENS: readonly Choice<HandPen>[] = (['brush', 'fountain', 'fine'] as const).map((id) => ({
  id,
  label: HW_PENS[id],
}));
export const HAND_STYLES: readonly { readonly id: string; readonly label: string; readonly from: string }[] =
  handStyles();

export const DEFAULTS: SignatureState = DEFAULT_STATE;

export function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/**
 * A complete, valid state from anything: storage, a file or a partial object. `normalize()` checks every value
 * but also keeps keys it does not know, so those are dropped here.
 */
export function toState(input: unknown): SignatureState {
  const n = normalize(isRecord(input) ? input : {});
  const defaults = new Map<string, unknown>(Object.entries(DEFAULT_STATE));
  for (const k of Object.keys(n)) {
    const d = defaults.get(k);
    const v: unknown = Reflect.get(n, k);
    if (!defaults.has(k)) Reflect.deleteProperty(n, k);
    // Text fields from a file may hold numbers or objects; inputs need strings.
    else if (typeof d === 'string' && typeof v !== 'string' && k !== 'cols') {
      Reflect.set(n, k, typeof v === 'number' || typeof v === 'boolean' ? String(v) : d);
    }
  }
  for (const k of Object.keys(n.show)) Reflect.set(n.show, k, !!Reflect.get(n.show, k));
  return n;
}

/** Keeps only the style keys of `raw`, each checked and converted by `normalize()`. */
export function pickStyle(raw: unknown): StyleValues {
  const src = isRecord(raw) ? raw : {};
  const show = isRecord(src['show']) ? src['show'] : {};
  const n = toState({ ...src, show });
  const out: StyleValues = {};
  for (const k of STYLE_KEY_LIST) if (src[k] !== undefined && src[k] !== null) Object.assign(out, { [k]: n[k] });
  if (src['colors'] === undefined && typeof src['theme'] === 'string') {
    out.colors = n.colors;
    out.gradient = n.gradient;
  }
  const flags: { [K in StyleShowKey]?: boolean } = {};
  for (const k of STYLE_SHOW_LIST) if (show[k] !== undefined) flags[k] = !!show[k];
  if (Object.keys(flags).length) out.show = flags;
  return out;
}

/*
 * Background builds (gallery thumbnails, compare cards, reply previews) run one at a time, after the main preview,
 * so typing stays responsive. A job that is cancelled before it starts never runs.
 */

interface QueuedJob<T> {
  promise: Promise<T>;
  cancel: () => void;
}

export class CancelledError extends Error {
  constructor() {
    super('Cancelled');
    this.name = 'CancelledError';
  }
}

interface QueueEntry {
  start: () => Promise<void>;
  cancel: () => void;
  cancelled: boolean;
}

export interface BuildQueue {
  enqueue: <T>(task: () => Promise<T>, opts?: { first?: boolean }) => QueuedJob<T>;
  /** Jobs waiting to start. */
  size: () => number;
}

function idle(): Promise<void> {
  return new Promise((resolve) => {
    if (typeof requestIdleCallback === 'function') requestIdleCallback(() => resolve(), { timeout: 120 });
    else setTimeout(resolve, 0);
  });
}

/** `pause` lets the browser paint between jobs; tests pass an immediate one. */
export function createQueue(pause: () => Promise<void> = idle): BuildQueue {
  const waiting: QueueEntry[] = [];
  let running = false;

  async function next(): Promise<void> {
    const entry = waiting.shift();
    if (!entry) {
      running = false;
      return;
    }
    if (!entry.cancelled) {
      await pause();
      if (!entry.cancelled) await entry.start();
    }
    return next();
  }

  function enqueue<T>(task: () => Promise<T>, opts: { first?: boolean } = {}): QueuedJob<T> {
    const entry: QueueEntry = { cancelled: false, start: () => Promise.resolve(), cancel: () => undefined };
    const promise = new Promise<T>((resolve, reject) => {
      // Promise.resolve().then() turns an error thrown before the task returns into a rejection,
      // so the job always settles and the queue moves on.
      entry.start = () => Promise.resolve().then(task).then(resolve, reject);
      entry.cancel = () => {
        if (entry.cancelled) return;
        entry.cancelled = true;
        reject(new CancelledError());
      };
    });
    if (opts.first) waiting.unshift(entry);
    else waiting.push(entry);
    if (!running) {
      running = true;
      void next();
    }
    return { promise, cancel: entry.cancel };
  }

  return { enqueue, size: () => waiting.filter((e) => !e.cancelled).length };
}

/** The queue every background build shares. */
export const backgroundBuilds: BuildQueue = createQueue();

/** A small cache, so reopening the Design section does not rebuild every thumbnail. */
export class ResultCache<T> {
  readonly #max: number;
  readonly #map = new Map<string, T>();
  constructor(max: number) {
    this.#max = max;
  }
  get(key: string): T | undefined {
    const v = this.#map.get(key);
    if (v !== undefined) {
      this.#map.delete(key);
      this.#map.set(key, v);
    }
    return v;
  }
  set(key: string, value: T): void {
    this.#map.delete(key);
    this.#map.set(key, value);
    while (this.#map.size > this.#max) {
      const oldest = this.#map.keys().next();
      if (oldest.done) break;
      this.#map.delete(oldest.value);
    }
  }
}

/* Looking up the same string again is cheap (its hash is cached); hashing a long data URL each time is not. */
const hashes = new Map<string, string>();
/** A short fingerprint of a long string such as a photo data URL. */
export function fingerprint(s: string): string {
  if (s.length < 64) return s;
  const known = hashes.get(s);
  if (known) return known;
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  const out = `${s.length}:${(h >>> 0).toString(36)}`;
  if (hashes.size >= 8) hashes.clear();
  hashes.set(s, out);
  return out;
}
