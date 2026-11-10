import type { StateInput } from '../src/index.ts';

/**
 * A complete, neutral profile for golden tests. Every text field is set here, so a change to
 * `DEFAULT_STATE` text never changes a golden snapshot. Design and option defaults still come
 * from `DEFAULT_STATE`, so changing those is visible in the snapshots, as it should be.
 */
export const FIXTURE_PROFILE = {
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
  signoff: 'Best,',
  signoffName: 'Sam',
} as const satisfies StateInput;

// The golden matrix: every design in 1, 2 and 3 columns, new and reply, with options spread across cases.
const DESIGNS = [
  'aurora',
  'tiles',
  'leader',
  'github',
  'foundry',
  'azure',
  'split',
  'script',
  'classic',
  'executive',
  'builder',
  'minimal',
  'monogram',
  'editorial',
  'ticket',
  'impact',
  'quote',
  'bold',
  'passport',
  'badge',
  'postcard',
  'terminal',
  'editor',
  'agent',
  'ledger',
  'adviser',
  'counsel',
  'care',
  'faculty',
  'blueprint',
  'folio',
  'studio-card',
  'concierge',
  'community',
  'systems',
  'circuit',
];
const THEMES = [
  'aurora',
  'msblue',
  'executive',
  'copilot',
  'foundry',
  'azure',
  'github',
  'teal',
  'sage',
  'sunrise',
  'navy',
  'sunset',
  'prism',
  'forest',
  'ocean',
  'graphite',
];
const ICONS = [
  'auto',
  'fluent',
  'labels',
  'glyph',
  'tile',
  'circle',
  'rounded',
  'outline',
  'soft',
  'ring',
  'square',
  'brand',
];
const SHAPES = [
  'auto',
  'circle',
  'rounded',
  'squircle',
  'square',
  'arch',
  'leaf',
  'slice',
  'slices',
  'layers',
  'hexagon',
  'octagon',
  'blob',
  'polaroid',
  'stamp',
];
const ANIMS = ['auto', 'none', 'spin', 'sweep', 'orbit', 'pulse', 'comet', 'dash', 'sparkle', 'shine', 'draw'];
const LOOKS = ['natural', 'mono', 'duotone', 'sepia'];
const SIZES = ['S', 'M', 'L', 'XL'];
const REPLIES = ['line', 'two', 'bar', 'card', 'name', 'design'];
const HANDS = ['allure', 'swiss', 'society', 'brush', 'decorous', 'neato'];
const PENS = ['fountain', 'brush', 'fine'];
const BGS = ['tint', '#0B1F3A', '#F5F7FA', '#1F2328'];

export interface Case {
  name: string;
  state: Record<string, unknown>;
  opts?: Record<string, unknown>;
  optimize?: boolean[];
}

/** Mixes of design, palette, shape, animation and background that are worth a snapshot of their own. */
const MIXES: readonly (readonly [name: string, state: StateInput])[] = [
  ['type-serif-large', { template: 'ledger', font: 'georgia', textSize: 'large', cols: 3 }],
  ['type-mono-comfortable', { template: 'systems', font: 'courier', textSize: 'comfortable' }],
  ['hand-calligraphic', { template: 'counsel', nameStyle: 'hand', handStyle: 'bird' }],
  ['hand-looped', { template: 'concierge', nameStyle: 'hand', handStyle: 'capitol' }],
  ['hand-loose-print', { template: 'folio', nameStyle: 'hand', handStyle: 'casualhand' }],
  ['hand-neat-print', { template: 'community', nameStyle: 'hand', handStyle: 'readability' }],
  ['photo-xl-postcard', { template: 'postcard', cols: 3, photoSize: 'XL' }],
  ['photo-xl-editor', { template: 'editor', cols: 3, photoSize: 'XL', photoShape: 'polaroid' }],
  [
    'photo-xl-beside-name',
    { template: 'foundry', cols: 3, photoSize: 'XL', photoShape: 'polaroid', photoPos: 'name', nameStyle: 'hand' },
  ],
  ['photo-xl-tiles', { template: 'tiles', cols: 1, photoSize: 'XL', photoShape: 'polaroid' }],
  ['photo-xl-split', { template: 'split', cols: 3, photoSize: 'XL', photoShape: 'polaroid' }],
  ['photo-xl-ticket', { template: 'ticket', cols: 3, photoSize: 'XL', photoShape: 'polaroid' }],
  ['photo-xl-monogram', { template: 'monogram', cols: 3, photoSize: 'XL' }],
  [
    'layers',
    {
      template: 'executive',
      theme: 'copilot',
      cols: 2,
      photoShape: 'layers',
      photoAnim: 'shine',
      photoSize: 'L',
      iconStyle: 'soft',
      nameStyle: 'hand',
    },
  ],
  ['sage-masthead', { template: 'editorial', theme: 'sage', bgMode: 'solid', bgColor: 'tint', photoShape: 'circle' }],
  ['sunrise-ticket', { template: 'ticket', theme: 'sunrise', photoShape: 'squircle' }],
  [
    'midnight-exec',
    {
      template: 'executive',
      theme: 'executive',
      cols: 2,
      iconStyle: 'glyph',
      bgMode: 'solid',
      bgColor: '#0B1F3A',
      photoShape: 'circle',
      photoAnim: 'none',
    },
  ],
  [
    'slice-aurora',
    { template: 'aurora', theme: 'aurora', photoShape: 'slice', photoAnim: 'comet', iconStyle: 'fluent' },
  ],
  [
    'duotone-foundry',
    {
      template: 'foundry',
      theme: 'foundry',
      photoShape: 'hexagon',
      photoLook: 'duotone',
      photoAnim: 'pulse',
      iconStyle: 'rounded',
    },
  ],
  [
    'dark-github',
    { template: 'github', theme: 'github', cols: 2, iconStyle: 'outline', bgMode: 'solid', bgColor: '#1F2328' },
  ],
  ['leader-arch', { template: 'leader', theme: 'executive', photoShape: 'arch', photoAnim: 'draw', nameStyle: 'hand' }],
  [
    'polaroid',
    {
      template: 'classic',
      theme: 'msblue',
      photoShape: 'polaroid',
      photoAnim: 'shine',
      photoSize: 'L',
      iconStyle: 'circle',
    },
  ],
  ['passport-hand', { template: 'passport', theme: 'navy', cols: 3, nameStyle: 'hand', iconStyle: 'ring' }],
  ['postcard-sunset', { template: 'postcard', theme: 'sunset', nameStyle: 'hand', iconStyle: 'soft' }],
  ['badge-prism', { template: 'badge', theme: 'prism', cols: 2, iconStyle: 'brand' }],
  ['terminal', { template: 'terminal', theme: 'forest' }],
  ['editor-3', { template: 'editor', theme: 'msblue', cols: 3, iconStyle: 'outline' }],
  ['agent', { template: 'agent', theme: 'copilot', cols: 2, nameStyle: 'hand' }],
  ['exec-3col', { template: 'executive', theme: 'ocean', cols: 3, iconStyle: 'circle', nameStyle: 'hand' }],
  [
    'squircle-tiles',
    { template: 'tiles', theme: 'azure', photoShape: 'squircle', iconStyle: 'tile', bgMode: 'solid', bgColor: 'tint' },
  ],
  [
    'mono-minimal',
    {
      template: 'executive',
      theme: 'graphite',
      photoLook: 'mono',
      photoShape: 'rounded',
      iconStyle: 'labels',
      bgMode: 'solid',
      bgColor: '#F5F7FA',
      cols: 2,
    },
  ],
  // The newer icon styles, each with a different weight or colour, on the newer palettes.
  ['gradient-noir', { template: 'executive', theme: 'noir', cols: 3, iconStyle: 'gradient', iconWeight: 'bold' }],
  [
    'glass-indigo-dark',
    { template: 'aurora', theme: 'indigo', cols: 2, iconStyle: 'glass', bgMode: 'solid', bgColor: '#0B1F3A' },
  ],
  ['squircle-colourful', { template: 'classic', theme: 'espresso', iconStyle: 'squircle', iconColor: 'colourful' }],
  ['sticker-brand-links', { template: 'leader', theme: 'citrus', cols: 3, iconStyle: 'sticker', iconColor: 'brand' }],
  [
    'depth-two-tone',
    { template: 'minimal', theme: 'berry', cols: 2, iconStyle: 'depth', iconColor: 'two', iconWeight: 'solid' },
  ],
  [
    'line-grey-outline',
    { template: 'editorial', theme: 'slate', iconStyle: 'outline', iconWeight: 'line', iconColor: 'neutral' },
  ],
  ['own-icons-duotone', { template: 'aurora', theme: 'dusk', iconWeight: 'duotone', iconColor: 'theme' }],
  // Your own colours: two colours, and one light colour that text has to deepen.
  [
    'your-colours',
    { template: 'executive', colors: ['#FF6A00', '#7A3CFF'], gradient: true, cols: 3, iconStyle: 'circle' },
  ],
  ['your-colour-yellow', { template: 'badge', colors: ['#FFD400'], gradient: false, iconColor: 'colourful' }],
  [
    'four-colour-gradient',
    {
      template: 'executive',
      colors: ['#FF6A00', '#7A3CFF', '#00A878', '#FFD400'],
      gradient: true,
      cols: 3,
      iconColor: 'two',
    },
  ],
  [
    'four-colour-solid',
    {
      template: 'executive',
      colors: ['#FF6A00', '#7A3CFF', '#00A878', '#FFD400'],
      gradient: false,
      cols: 3,
      iconColor: 'two',
    },
  ],
];

const pick = <T>(list: readonly T[], i: number): T => list[i % list.length];

const EXTRAS_ALL = { place: { focus: 'all', featured: 'all', stats: 'all', quote: 'all' } };
const RICH = {
  pronouns: 'she/her',
  altName: 'سام تايلور',
  office: '+1 425 555 0100',
  booking: 'outlook.office.com/bookwithme/user/abc',
  hours: 'Sun to Thu, 9:00 to 17:00',
  languages: 'English, Arabic',
  youtube: 'youtube.com/@sample',
  learn: 'learn.microsoft.com/users/sample',
  blog: 'sample.dev/blog',
  banner: 'Join us at Build',
  bannerUrl: 'build.microsoft.com',
  disclaimer: 'This message may contain confidential information.',
  quoteBy: 'A. Sample',
  handle: '@sample',
  feat3: 'third-item',
  feat3desc: 'A third featured item',
  feat3url: 'example.com/third',
  feat3tag: 'Talk',
};
const SHOW_ALL = {
  show: {
    booking: true,
    x: true,
    tagline: true,
    signoff: true,
    stack: true,
    banner: true,
    disclaimer: true,
    youtube: true,
    learn: true,
    blog: true,
  },
};

export function buildMatrix(): Case[] {
  const cases: Case[] = [];
  DESIGNS.forEach((id, i) => {
    const base = { template: id, theme: pick(THEMES, i) };
    cases.push({
      name: `${id} 1 col`,
      state: {
        ...base,
        cols: 1,
        iconStyle: pick(ICONS, i),
        photoShape: pick(SHAPES, i),
        photoAnim: pick(ANIMS, i),
        photoLook: pick(LOOKS, i),
      },
    });
    cases.push({
      name: `${id} 2 col hand`,
      state: {
        ...base,
        cols: 2,
        nameStyle: 'hand',
        handStyle: pick(HANDS, i),
        handPen: pick(PENS, i),
        photoSize: pick(SIZES, i),
        photoPos: i % 3 === 0 ? 'name' : 'column',
        iconStyle: pick(ICONS, i + 3),
        photoShape: pick(SHAPES, i + 5),
        photoAnim: pick(ANIMS, i + 4),
        ...(i % 2 ? EXTRAS_ALL : {}),
      },
    });
    cases.push({
      name: `${id} 3 col rich`,
      state: {
        ...base,
        ...RICH,
        ...SHOW_ALL,
        cols: 3,
        iconStyle: pick(ICONS, i + 6),
        photoShape: pick(SHAPES, i + 9),
        photoAnim: 'none',
        photoSize: pick(SIZES, i + 2),
        bgMode: i % 2 ? 'solid' : 'transparent',
        bgColor: pick(BGS, i),
        motion: i % 4 === 0 ? 'loop' : 'brief',
      },
    });
    cases.push({
      name: `${id} auto cols, no animation`,
      state: {
        ...base,
        show: { animate: false, photo: i % 5 !== 0, logo: i % 2 === 0 },
        photoLook: pick(LOOKS, i + 1),
      },
    });
    cases.push({
      name: `${id} reply ${pick(REPLIES, i)}`,
      state: { ...base, replyStyle: pick(REPLIES, i), iconStyle: pick(ICONS, i + 1) },
      opts: { version: 'reply' },
    });
    cases.push({
      name: `${id} reply design hand`,
      state: { ...base, replyStyle: 'design', nameStyle: 'hand', bgMode: 'solid', bgColor: pick(BGS, i + 1) },
      opts: { version: 'reply' },
    });
  });
  REPLIES.forEach((r, i) => {
    cases.push({
      name: `executive reply ${r} 3 col`,
      state: { template: 'executive', cols: 3, replyStyle: r, nameStyle: i % 2 ? 'hand' : 'typed', ...RICH },
      opts: { version: 'reply' },
    });
  });
  cases.push({
    name: 'invalid values',
    state: {
      template: 'nope',
      theme: 'nope',
      cols: 7,
      photoAnim: 'x',
      replyStyle: 'x',
      iconStyle: 'x',
      photoLook: 'x',
      bgColor: 'red',
      photoSize: 'XXL',
    },
  });
  cases.push({
    name: 'build options override',
    state: { template: 'aurora' },
    opts: { template: 'tiles', theme: 'github', over: { cols: 2 } },
  });
  cases.push({
    name: 'unoptimised images',
    state: { template: 'foundry', photoAnim: 'spin', nameStyle: 'hand' },
    optimize: [false, true],
  });
  cases.push({
    name: 'photo zoom and move',
    state: { template: 'classic', photo: { zoom: 1.6, dx: 12, dy: -8 }, photoShape: 'blob', photoLook: 'duotone' },
  });
  for (const [name, state] of MIXES) cases.push({ name: `mix ${name}`, state });
  return cases;
}

let photo: Promise<string> | undefined;
/** A deterministic, synthetic portrait-sized test image. */
export function testPhoto(): Promise<string> {
  photo ??= Promise.resolve().then(() => {
    const c = document.createElement('canvas');
    c.width = 320;
    c.height = 320;
    const g = c.getContext('2d')!;
    const grad = g.createLinearGradient(0, 0, 320, 320);
    grad.addColorStop(0, '#2B6CB0');
    grad.addColorStop(1, '#F6AD55');
    g.fillStyle = grad;
    g.fillRect(0, 0, 320, 320);
    g.fillStyle = '#FDE3C8';
    g.beginPath();
    g.arc(160, 130, 64, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#1A365D';
    g.fillRect(70, 220, 180, 100);
    return c.toDataURL('image/png');
  });
  return photo;
}

let logo: Promise<string> | undefined;

/** A wide, made-up logo mark, so the square fit is tested too. Drawn once per run. */
export function testLogo(): Promise<string> {
  logo ??= Promise.resolve().then(() => {
    const c = document.createElement('canvas');
    c.width = 96;
    c.height = 64;
    const g = c.getContext('2d')!;
    g.fillStyle = '#0F6CBD';
    g.beginPath();
    g.arc(32, 32, 28, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#F7630C';
    g.fillRect(56, 8, 36, 48);
    return c.toDataURL('image/png');
  });
  return logo;
}

/** Timing facts read from an animated PNG data URL. */
export interface Motion {
  frames: number;
  /** How many times it plays. 0 means it loops forever. */
  plays: number;
  /** One play, in milliseconds. */
  cycleMs: number;
  /** How long the last frame shows. When the final play ends, the picture rests on it. */
  lastMs: number;
  /** Whether any APNG frame uses dispose op 2, which makes iPhone Outlook flicker. */
  revertsToPrevious: boolean;
}

function bytesOf(dataURL: string): Uint8Array {
  const bin = atob(dataURL.slice(dataURL.indexOf(',') + 1));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

function apngMotion(b: Uint8Array): Motion {
  const view = new DataView(b.buffer);
  const m: Motion = { frames: 1, plays: 1, cycleMs: 0, lastMs: 0, revertsToPrevious: false };
  for (let p = 8; p + 8 <= b.length;) {
    const len = view.getUint32(p);
    const type = String.fromCharCode(...b.subarray(p + 4, p + 8));
    const d = p + 8;
    if (type === 'acTL') {
      m.frames = view.getUint32(d);
      m.plays = view.getUint32(d + 4);
    } else if (type === 'fcTL') {
      const num = view.getUint16(d + 20);
      const den = view.getUint16(d + 22) || 100;
      m.lastMs = Math.max(20, Math.round((num / den) * 1000));
      m.cycleMs += m.lastMs;
      if (b[d + 24] === 2) m.revertsToPrevious = true;
    }
    p = d + len + 4;
  }
  return m;
}

/** How long an image moves before it rests on its last frame. Infinity when it loops forever. */
export function movingMs(m: Motion): number {
  return m.plays === 0 ? Infinity : m.plays * m.cycleMs - m.lastMs;
}

/** Reads the timing of an animated image. */
export function motionOf(dataURL: string): Motion {
  return apngMotion(bytesOf(dataURL));
}
