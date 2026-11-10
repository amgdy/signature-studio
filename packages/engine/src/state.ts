import { HW, THEMES } from './data.ts';
import { byId } from './designs/index.ts';
import { textOf } from './html.ts';
import { HW_PENS } from './name.ts';
import { cleanColors, themeSettings } from './color.ts';
import {
  ANIMS,
  EMAIL_PROFILE_OPTIONS,
  FONT_OPTIONS,
  ICON_COLORS,
  ICON_FAMILY_OPTIONS,
  ICON_STYLES,
  ICON_WEIGHTS,
  LOOKS,
  PHOTO_SIZES,
  REPLY_STYLES,
  SHAPES,
  TEXT_SIZE_OPTIONS,
} from './options.ts';
import type { HostingMode, Placement, SignatureState } from './types.ts';

/**
 * The starting state: every field and switch with its default value.
 * The details are a made-up sample person. Keep your own in a signature file: save it from the Studio's Files section.
 */
export const DEFAULT_STATE: SignatureState = {
  emailProfile: 'outlook',
  template: 'aurora',
  ...themeSettings('aurora'),
  photoAnim: 'auto',
  nameStyle: 'typed',
  font: 'auto',
  textSize: 'standard',
  handStyle: 'allure',
  handPen: 'brush',
  bgMode: 'transparent',
  bgColor: 'tint',
  cols: 'auto',
  photoPos: 'column',
  photoSize: 'M',
  replyStyle: 'line',
  iconStyle: 'auto',
  iconFamily: 'standard',
  iconWeight: 'auto',
  iconColor: 'auto',
  photoShape: 'auto',
  photoLook: 'natural',
  motion: 'brief',
  fullName: 'Sam Taylor',
  pronouns: '',
  altName: '',
  title: 'Principal Engineer, Cloud & AI',
  team: 'Platform Engineering',
  company: 'Contoso',
  region: 'Europe',
  location: 'Lisbon, Portugal',
  phone: '+1 425 555 0142',
  office: '',
  email: 'sam.taylor@contoso.com',
  website: 'contoso.com',
  booking: '',
  hours: '',
  languages: '',
  linkedin: 'linkedin.com/in/sample',
  github: 'github.com/sample',
  x: 'x.com/sample',
  youtube: '',
  learn: '',
  blog: '',
  banner: '',
  bannerUrl: '',
  disclaimer: '',
  tagline: 'Building things people love to use',
  initials: '',
  quote: 'Make it simple, then make it fast.',
  stat1: '12+',
  stat1label: 'years in cloud',
  stat2: '40',
  stat2label: 'teams supported',
  stat3: '3',
  stat3label: 'open-source tools',
  focusLabel: 'Leading',
  focus: 'Architecture, Developer experience, Community, Skilling',
  featLabel: 'Featured',
  handle: '',
  quoteBy: '',
  devPrompt: 'who can help us ship AI apps?',
  devGhost: 'let\u2019s build something great together',
  feat1: 'cloud-cost-toolkit',
  feat1desc: 'Cloud cost toolkit',
  feat1url: 'github.com/sample/cloud-cost-toolkit',
  feat1tag: 'Open source',
  feat2: 'usage-insights',
  feat2desc: 'Usage insights dashboard',
  feat2url: 'github.com/sample/usage-insights',
  feat2tag: 'Open source',
  feat3: '',
  feat3desc: '',
  feat3url: '',
  feat3tag: '',
  place: { focus: 'auto', featured: 'auto', stats: 'auto', quote: 'auto' },
  signoff: 'Best,',
  signoffName: 'Sam',
  show: {
    photo: true,
    logo: false,
    animate: true,
    location: true,
    website: true,
    booking: false,
    linkedin: true,
    github: true,
    x: false,
    teams: true,
    tagline: false,
    signoff: false,
    stack: false,
    focus: true,
    featured: true,
    featDesc: true,
    featTag: true,
    activity: true,
    handle: true,
    flourish: true,
    pronouns: true,
    altName: true,
    title: true,
    team: true,
    company: true,
    region: true,
    phone: true,
    office: true,
    email: true,
    hours: true,
    languages: true,
    youtube: true,
    learn: true,
    blog: true,
    banner: false,
    disclaimer: false,
    stats: true,
    quote: true,
  },
  photo: { src: '', zoom: 1, dx: 0, dy: 0 },
  logo: { src: '' },
  hosting: { mode: 'embed', base: '' },
};

type Fields = Readonly<Record<string, unknown>>;

function isRecord(v: unknown): v is Fields {
  return typeof v === 'object' && v !== null;
}

/** "__proto__" from a config file is skipped: setting it would change an object's prototype. */
const UNSAFE_KEY = '__proto__';

/** Palettes merged into a close neighbour: files that used them open with the neighbour. */
const MERGED: Readonly<Partial<Record<string, string>>> = { plum: 'grape', crimson: 'ember', mint: 'sage' };

const IMAGE_SRC = /^data:image\/(?:png|jpeg|gif|webp);base64,[A-Za-z0-9+/=]+$/;
const HOSTING_MODES: ReadonlySet<HostingMode> = new Set(['embed', 'hosted', 'folder']);

/** Own keys only, so names every object has, such as "constructor", never count as a design or option. */
const has = (table: object, key: unknown): boolean => typeof key === 'string' && Object.hasOwn(table, key);

/** Fields that hold text. `cols` is left out: its default is a word, but its other values are numbers. */
const TEXT_KEYS: ReadonlySet<string> = new Set(
  Object.keys(DEFAULT_STATE).filter((k) => k !== 'cols' && typeof Reflect.get(DEFAULT_STATE, k) === 'string'),
);

/** Copies own fields like Object.assign, but never the "__proto__" key. */
function assignFields(target: object, src: unknown): void {
  if (src === undefined || src === null) return;
  const entries: [string, unknown][] = Object.entries(src);
  for (const [k, v] of entries) if (k !== UNSAFE_KEY) Reflect.set(target, k, v);
}

/**
 * Turns a saved or partial state into a full, valid one.
 * Missing or unknown values get their defaults.
 */
export function normalize(input?: unknown): SignatureState {
  const s = structuredClone(DEFAULT_STATE);
  const st: Fields = isRecord(input) ? input : {};
  /* text fields always become strings; other values are copied as they are, and the checks below fix them */
  for (const k of Object.keys(st)) {
    const v = st[k];
    if (k === UNSAFE_KEY || k === 'theme' || k === 'customColors') continue;
    if (k === 'show' || k === 'photo' || k === 'logo' || k === 'hosting' || k === 'place') assignFields(s[k], v || {});
    else if (v !== undefined && v !== null) Reflect.set(s, k, TEXT_KEYS.has(k) ? textOf(v) : v);
  }
  const legacy = typeof st['theme'] === 'string' ? st['theme'] : '';
  const themeId = has(MERGED, legacy) ? (MERGED[legacy] ?? legacy) : legacy;
  const preset =
    (st['colors'] === undefined || st['colors'] === null) && has(THEMES, themeId) ? THEMES[themeId] : undefined;
  const colors = cleanColors(st['colors'] ?? (legacy === 'custom' ? st['customColors'] : preset?.colors));
  s.colors = colors.length ? colors : [...DEFAULT_STATE.colors];
  s.gradient =
    s.colors.length > 1 &&
    (typeof st['gradient'] === 'boolean' ? st['gradient'] : (preset?.gradient ?? DEFAULT_STATE.gradient));
  if (!has(byId, s.template)) s.template = 'aurora';
  if (!ANIMS.includes(s.photoAnim)) s.photoAnim = 'auto';
  const cols = +s.cols;
  s.cols = cols === 1 || cols === 2 || cols === 3 ? cols : 'auto';
  if (!REPLY_STYLES.includes(s.replyStyle)) s.replyStyle = 'line';
  const place: Record<string, Placement> = s.place;
  for (const k of Object.keys(place)) if (place[k] !== 'all') place[k] = 'auto';
  /* switches become true or false (a missing one gets its default), and the photo zoom and offsets become numbers */
  for (const [k, def] of Object.entries(DEFAULT_STATE.show)) {
    const v: unknown = Reflect.get(s.show, k);
    if (typeof v !== 'boolean') Reflect.set(s.show, k, v === undefined || v === null ? def : Boolean(v));
  }
  for (const k of ['zoom', 'dx', 'dy'] as const) {
    const v: unknown = Reflect.get(s.photo, k);
    const n = Number(v);
    s.photo[k] = Number.isFinite(n) ? n : DEFAULT_STATE.photo[k];
  }
  if (!ICON_STYLES.includes(s.iconStyle)) s.iconStyle = 'auto';
  if (!ICON_FAMILY_OPTIONS.some((f) => f.id === s.iconFamily)) s.iconFamily = 'standard';
  if (!EMAIL_PROFILE_OPTIONS.some((p) => p.id === s.emailProfile)) s.emailProfile = 'outlook';
  if (!ICON_WEIGHTS.includes(s.iconWeight)) s.iconWeight = 'auto';
  if (!ICON_COLORS.includes(s.iconColor)) s.iconColor = 'auto';
  if (!SHAPES.includes(s.photoShape)) s.photoShape = 'auto';
  if (!LOOKS.includes(s.photoLook)) s.photoLook = 'natural';
  if (s.motion !== 'loop') s.motion = 'brief';
  if (HW && HW.fonts && !has(HW.fonts, s.handStyle)) s.handStyle = HW.order[0];
  if (!has(HW_PENS, s.handPen)) s.handPen = 'brush';
  if (s.nameStyle !== 'hand') s.nameStyle = 'typed';
  if (!FONT_OPTIONS.some((f) => f.id === s.font)) s.font = 'auto';
  if (!TEXT_SIZE_OPTIONS.some((t) => t.id === s.textSize)) s.textSize = 'standard';
  if (s.bgMode !== 'solid') s.bgMode = 'transparent';
  if (s.photoPos !== 'name') s.photoPos = 'column';
  if (!has(PHOTO_SIZES, s.photoSize)) s.photoSize = 'M';
  s.bgColor = /^#[0-9a-f]{6}$/i.test(s.bgColor) ? s.bgColor.toUpperCase() : 'tint';
  /* only embedded images: a web address would need the network, could track who opens a shared file,
     and could not be drawn to a canvas */
  if (typeof s.photo.src !== 'string' || !IMAGE_SRC.test(s.photo.src)) s.photo.src = '';
  if (typeof s.logo.src !== 'string' || !IMAGE_SRC.test(s.logo.src)) s.logo.src = '';
  if (!HOSTING_MODES.has(s.hosting.mode)) s.hosting.mode = 'embed';
  s.hosting.base = typeof s.hosting.base === 'string' ? s.hosting.base : '';
  return s;
}
