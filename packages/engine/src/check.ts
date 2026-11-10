import { dataUrlBytes, weight } from './build.ts';
import { contrast } from './color.ts';
import { keepAsOutlook } from './compatibility.ts';
import { canHand } from './name.ts';
import { FONT_OPTIONS, TEXT_SIZE_OPTIONS } from './options.ts';
import type { BuildResult, Motion, ShowFlags, Version } from './types.ts';

export {
  CLIENT_PROFILES,
  COMPATIBILITY_REVIEWED,
  COMPATIBILITY_SOURCES,
  SIGNATURE_REQUIREMENTS,
} from './compatibility.ts';

export type CheckId =
  | 'language'
  | 'images'
  | 'links'
  | 'reading-order'
  | 'text-size'
  | 'contrast'
  | 'motion'
  | 'size'
  | 'identity'
  | 'integrity'
  | 'destinations'
  | 'font-fallback'
  | 'pixel-size'
  | 'phone'
  | 'paste'
  | 'delivery'
  | 'handwriting'
  | 'features'
  | 'native';
export type CheckStatus = 'pass' | 'warning' | 'manual' | 'na';

/** One line of the accessibility report. */
export interface CheckItem {
  id: CheckId;
  /** False when an automated check found something to review. See status for manual/not-applicable rows. */
  ok: boolean;
  status: CheckStatus;
  title: string;
  text: string;
}

export interface AccessibilityReport {
  items: CheckItem[];
  /** How many checks need a look. */
  issues: number;
  /** "All checks pass" or "2 to review". */
  summary: string;
  /** What was checked: "Aurora · new message · 2 columns". */
  subject: string;
}

export interface CheckOptions {
  /** The motion setting, so looping animation is reported. */
  motion: Motion;
}

/** Signatures above this size (images embedded) get a warning. */
const HEAVY_BYTES = 400000;
/** Studio's minimum detail text size, not an Outlook or WCAG requirement. */
const MIN_TEXT_PX = 11;

type Rgba = [number, number, number, number];

interface TextReport {
  /** Pieces of text checked. */
  count: number;
  /** Smallest font size in px. */
  smallest: number;
  /** Pieces below the contrast they need. */
  fails: number;
  /** The piece closest to failing, or failing worst. */
  worst: { ratio: number; need: number; text: string } | null;
}

/* A page of text the way Outlook shows it: light page, or dark mode. */
const MODES = {
  light: { background: '#FFFFFF', color: '#242424' },
  dark: { background: '#1F1F1F', color: '#E0E0E0' },
} as const;

/** Text that is only separators ("|", "·", "→") is decoration. */
const SEPARATORS = /^[|/\u00b7\u2022\u2192\s]+$/;

function parseRgb(css: string): Rgba {
  const m = css.match(/[\d.]+/g) ?? [];
  const n = (i: number, d: number): number => (m[i] === undefined ? d : Number(m[i]));
  return [n(0, 0), n(1, 0), n(2, 0), m.length > 3 ? n(3, 1) : 1];
}

function hexOf(c: Rgba): string {
  return `#${c
    .slice(0, 3)
    .map((v) =>
      Math.round(Math.min(255, Math.max(0, v)))
        .toString(16)
        .padStart(2, '0'),
    )
    .join('')}`;
}

function composite(front: Rgba, back: Rgba): Rgba {
  const a = front[3];
  return [front[0] * a + back[0] * (1 - a), front[1] * a + back[1] * (1 - a), front[2] * a + back[2] * (1 - a), 1];
}

function checkText(box: HTMLElement, base: string): TextReport {
  const report: TextReport = { count: 0, smallest: Number.POSITIVE_INFINITY, fails: 0, worst: null };
  const walker = box.ownerDocument.createTreeWalker(box, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const text = (node.nodeValue ?? '').replace(/\u00a0/g, ' ').trim();
    const el = node.parentElement;
    if (!text || SEPARATORS.test(text) || !el) continue;
    const cs = getComputedStyle(el);
    let bg: Rgba = [
      Number.parseInt(base.slice(1, 3), 16),
      Number.parseInt(base.slice(3, 5), 16),
      Number.parseInt(base.slice(5, 7), 16),
      1,
    ];
    const backgrounds: Rgba[] = [];
    for (let e: HTMLElement | null = el; e && e !== box; e = e.parentElement) {
      backgrounds.push(parseRgb(getComputedStyle(e).backgroundColor));
    }
    for (const layer of backgrounds.toReversed()) bg = composite(layer, bg);
    const size = Number.parseFloat(cs.fontSize);
    const large = size >= 24 || (Number.parseInt(cs.fontWeight, 10) >= 700 && size >= 18.66);
    const need = large ? 3 : 4.5;
    const ratio = contrast(hexOf(composite(parseRgb(cs.color), bg)), hexOf(bg));
    report.count++;
    report.smallest = Math.min(report.smallest, size);
    if (ratio < need) report.fails++;
    if (!report.worst || ratio / need < report.worst.ratio / report.worst.need) {
      report.worst = { ratio, need, text: text.slice(0, 28) };
    }
  }
  return report;
}

/** Puts signature HTML in an isolated box inside the stage, so page styles cannot change what is measured. */
function mount(stage: HTMLElement, html: string, mode: keyof typeof MODES): HTMLElement {
  const root = stage.shadowRoot ?? stage.attachShadow({ mode: 'open' });
  const { background, color } = MODES[mode];
  const template = document.createElement('template');
  template.innerHTML = `<div style="all:initial;display:block;width:680px;font:14px/1.4 'Segoe UI',Arial,sans-serif;color:${color};background:${background}">${html}</div>`;
  for (const im of template.content.querySelectorAll('img')) {
    if (!/^data:image\/(?:png|jpeg|gif);base64,/i.test(im.getAttribute('src') ?? '')) {
      im.setAttribute('data-check-src', im.getAttribute('src') ?? '');
      im.removeAttribute('src');
    }
    im.removeAttribute('srcset');
  }
  root.replaceChildren(template.content);
  const box = root.firstElementChild;
  if (!(box instanceof HTMLElement)) throw new Error('The check stage could not be prepared');
  return box;
}

const unique = (list: string[]): string[] => list.filter((v, i) => list.indexOf(v) === i);
const plural = (n: number, one: string, many = `${one}s`): string => `${n} ${n === 1 ? one : many}`;

/**
 * Checks a built signature the way a reader meets it, in light and dark mode: language tags, alt text, link names,
 * layout tables, text size, contrast (WCAG AA), motion and weight.
 *
 * `stage` must be attached to a document (computed styles need it); keep it off screen. Its shadow root is
 * used for the check and emptied afterwards.
 */
function checkAccessibility(res: BuildResult, stage: HTMLElement, opts: CheckOptions): AccessibilityReport {
  const items: CheckItem[] = [];
  const add = (id: CheckId, ok: boolean, title: string, text: string): void => {
    items.push({ id, ok, status: ok ? 'pass' : 'warning', title, text });
  };

  const box = mount(stage, res.html('embed'), 'light');
  const root = box.firstElementChild;
  const imgs = Array.from(box.querySelectorAll('img'));
  const altLang = !!box.querySelector('[lang="ar"]');
  add(
    'language',
    !!root && root.getAttribute('lang') === 'en' && root.getAttribute('dir') === 'ltr',
    'Language and direction',
    `${root?.getAttribute('lang') === 'en' && root.getAttribute('dir') === 'ltr' ? 'Tagged as English, left to right' : 'Missing the expected English language or left-to-right direction'}${
      altLang ? '; your Arabic name is tagged Arabic, right to left.' : '.'
    }`,
  );

  const missing = imgs.filter((i) => !i.hasAttribute('alt'));
  const decorative = imgs.filter((i) => i.getAttribute('alt') === '');
  const unmarked = decorative.filter((i) => i.getAttribute('role') !== 'presentation');
  const described = imgs.filter((i) => i.getAttribute('alt'));
  const names = unique(described.map((i) => i.getAttribute('alt') ?? ''));
  add(
    'images',
    !missing.length && !unmarked.length,
    'Images',
    `${plural(imgs.length, 'image')}: ${described.length} described (${names.slice(0, 8).join(', ')}${
      names.length > 8 ? '…' : ''
    }) and ${decorative.length} decorative, with empty alt text so screen readers skip them.${
      missing.length ? ` ${missing.length} have no alt text.` : ''
    }${unmarked.length ? ` ${unmarked.length} decorative images need role="presentation".` : ''}`,
  );

  const links = Array.from(box.querySelectorAll('a'));
  const unnamed = links.filter(
    (a) => !((a.textContent ?? '').trim() || a.querySelector('img[alt]:not([alt=""])') || a.getAttribute('title')),
  );
  add(
    'links',
    !unnamed.length,
    'Links',
    `${plural(links.length, 'link')} checked for an accessible name (text, image alt text or title).${
      unnamed.length ? ` ${unnamed.length} have no name.` : ''
    }`,
  );

  const tables = Array.from(box.querySelectorAll('table'));
  const layout = tables.filter((t) => t.getAttribute('role') === 'presentation');
  add(
    'reading-order',
    layout.length === tables.length,
    'Layout tables',
    `${layout.length} of ${plural(tables.length, 'layout table')} marked as presentation. This checks table semantics, not the complete screen-reader reading order.`,
  );

  const light = checkText(box, MODES.light.background);
  const dark = checkText(mount(stage, res.darkHtml(), 'dark'), MODES.dark.background);
  if (stage.shadowRoot) stage.shadowRoot.innerHTML = '';

  add(
    'text-size',
    light.count === 0 || light.smallest >= MIN_TEXT_PX,
    'Text size',
    light.count
      ? `${plural(light.count, 'piece')} of text, the smallest ${Math.round(light.smallest * 10) / 10} px. Studio's minimum is 11 px; it is not a WCAG or Outlook requirement.`
      : 'No text to check.',
  );

  const fails = light.fails + dark.fails;
  add(
    'contrast',
    !fails,
    'Contrast (WCAG AA)',
    `${fails ? `${plural(fails, 'piece')} of editable text ${fails === 1 ? 'is' : 'are'} below the required contrast. ` : 'Editable text meets 4.5:1 (3:1 for large text). '}Lowest: ${
      light.worst ? `${light.worst.ratio.toFixed(1)}:1 in light mode (“${light.worst.text}”)` : 'n/a'
    }, ${dark.worst ? `${dark.worst.ratio.toFixed(1)}:1 in dark mode.` : 'n/a.'} Text inside images and native dark-mode changes need visual review.`,
  );

  const w = weight(res, 'embed');
  const looping = opts.motion === 'loop';
  add(
    'motion',
    !w.animated || !looping,
    'Motion',
    !w.animated
      ? 'No animation.'
      : `${plural(w.animated, 'animated image')}${
          looping
            ? ' set to loop. WCAG asks for motion longer than 5 s to be pausable, so the default plays once and stops.'
            : ', with brief motion selected. The full health check inspects the encoded animation timing.'
        }`,
  );

  const bytes = w.imageBytes + w.htmlBytes;
  add(
    'size',
    bytes < HEAVY_BYTES,
    'Size',
    `About ${Math.round(bytes / 1024)} KB with images embedded${
      bytes < HEAVY_BYTES ? '.' : '; consider hosted images or fewer animations.'
    }`,
  );

  const issues = items.filter((i) => !i.ok).length;
  return {
    items,
    issues,
    summary: issues ? `${issues} to review` : 'All checks pass',
    subject: `${res.template.name} · ${res.version === 'reply' ? 'reply version' : 'new message'} · ${plural(
      res.cols || 1,
      'column',
    )}`,
  };
}

export interface FeatureItem {
  id: string;
  title: string;
  status: CheckStatus;
  text: string;
}

export interface VersionHealth {
  version: Version;
  subject: string;
  items: CheckItem[];
  features: FeatureItem[];
}

export interface SignatureHealthReport {
  versions: VersionHealth[];
  issues: number;
  summary: string;
}

const FEATURE_NAMES: Record<keyof ShowFlags, string> = {
  photo: 'Photo',
  logo: 'Company logo',
  animate: 'Animation',
  location: 'Location',
  website: 'Website',
  booking: 'Booking link',
  linkedin: 'LinkedIn',
  github: 'GitHub',
  x: 'X',
  teams: 'Teams',
  tagline: 'Tagline',
  signoff: 'Sign-off',
  stack: 'Stacked contacts',
  focus: 'Focus areas',
  featured: 'Featured items',
  featDesc: 'Featured descriptions',
  featTag: 'Featured tags',
  activity: 'Activity grid',
  handle: 'Handle',
  flourish: 'Handwriting flourish',
  pronouns: 'Pronouns',
  altName: 'Second-script name',
  title: 'Job title',
  team: 'Team',
  company: 'Company',
  region: 'Region',
  phone: 'Mobile number',
  office: 'Office number',
  email: 'Email',
  hours: 'Working hours',
  languages: 'Languages',
  youtube: 'YouTube',
  learn: 'Microsoft Learn',
  blog: 'Blog',
  banner: 'Banner',
  disclaimer: 'Disclaimer',
  stats: 'Highlights',
  quote: 'Quote',
  quoteBy: 'Quote attribution',
};

const cleanText = (text: string): string =>
  text
    .replace(/[\s\u00a0]+/g, ' ')
    .trim()
    .toLowerCase();

function featureCoverage(res: BuildResult, box: HTMLElement): FeatureItem[] {
  const s = res.state;
  const text = cleanText(
    (box.textContent ?? '') + ' ' + [...box.querySelectorAll('img')].map((im) => im.alt).join(' '),
  );
  const hrefs = [...box.querySelectorAll('a')].map((a) => a.getAttribute('href') ?? '');
  const used = new Set([...box.querySelectorAll('img')].map((im) => im.getAttribute('src')));
  const hasKind = (kind: string): boolean =>
    Object.values(res.images).some((im) => im.kind === kind && used.has(im.dataURL));
  return Object.entries(FEATURE_NAMES).map(([id, title]) => {
    const enabled = id === 'quoteBy' ? s.show.quote && s.show.quoteBy !== false : Reflect.get(s.show, id) === true;
    const item = (status: CheckStatus, detail: string): FeatureItem => ({ id, title, status, text: detail });
    if (!enabled) return item('na', 'Off.');
    if (id === 'photo') {
      if (res.template.id === 'minimal') return item('na', 'Minimal is intentionally photo-free.');
      if (res.template.id === 'monogram') return item('na', 'This design uses an initials badge instead of a photo.');
      return item(
        hasKind('photo') ? 'pass' : res.version === 'reply' ? 'na' : 'warning',
        hasKind('photo')
          ? `Photo rendered; ${s.photoSize}, ${s.photoShape}, ${s.photoLook}. Dimensions are checked below.`
          : res.version === 'reply'
            ? 'This compact reply omits the photo.'
            : 'The photo is enabled but missing from the output.',
      );
    }
    if (id === 'logo')
      return item(
        !s.logo.src ? 'na' : hasKind('logo') ? 'pass' : res.version === 'reply' ? 'na' : 'warning',
        !s.logo.src
          ? 'No logo uploaded.'
          : hasKind('logo')
            ? 'Uploaded logo is in the output.'
            : 'The uploaded logo is not used by this design or reply.',
      );
    if (id === 'animate')
      return item('pass', 'Enabled. Encoded timing is checked separately; a static design may have no animation.');
    if (id === 'flourish')
      return item(
        s.nameStyle === 'hand' || res.template.handAlways ? 'manual' : 'na',
        s.nameStyle === 'hand' || res.template.handAlways
          ? 'Part of the handwritten name image when the design supports it. Review its appearance in the preview.'
          : 'The name is typed.',
      );
    if (id === 'stack')
      return item('manual', 'A layout preference, not extra content. Review contact placement in this design.');
    if (id === 'activity')
      return item(
        hasKind('contrib') ? 'pass' : 'na',
        hasKind('contrib') ? 'Activity grid rendered.' : 'Only Profile Cards uses the activity grid.',
      );
    if (id === 'handle' && !['github', 'builder', 'agent'].includes(res.template.id))
      return item('na', 'This design does not use a handle.');
    if (
      res.version === 'reply' &&
      !['title', 'company', 'phone', 'email', 'website', 'pronouns', 'signoff'].includes(id)
    )
      return item('na', 'Compact replies may omit this field.');
    if (id === 'focus' || id === 'featured' || id === 'stats' || id === 'quote') {
      if (s.place[id] !== 'all' && !res.template.extras?.includes(id))
        return item('na', 'Set this extra to every design to include it here.');
      const values = (
        id === 'featured'
          ? [s.feat1, s.feat2, s.feat3]
          : id === 'stats'
            ? [s.stat1, s.stat2, s.stat3]
            : id === 'focus'
              ? s.focus.split(',')
              : [s.quote]
      ).filter((v) => v.trim());
      const present = values.every((v) => text.includes(cleanText(v)));
      return item(
        !values.length ? 'na' : present ? 'pass' : 'warning',
        !values.length
          ? 'No content entered.'
          : present
            ? 'Content is in the output.'
            : 'Some enabled content is absent. Check its placement and values.',
      );
    }
    if (id === 'featDesc' || id === 'featTag') {
      if (!s.show.featured || (s.place.featured !== 'all' && !res.template.extras?.includes('featured')))
        return item('na', 'Featured items are not included here.');
      const values = id === 'featDesc' ? [s.feat1desc, s.feat2desc, s.feat3desc] : [s.feat1tag, s.feat2tag, s.feat3tag];
      const relevant = values.filter((v, i) => v.trim() && [s.feat1, s.feat2, s.feat3][i]);
      return item(
        !relevant.length ? 'na' : relevant.every((v) => text.includes(cleanText(v))) ? 'pass' : 'warning',
        !relevant.length
          ? 'No content entered.'
          : relevant.every((v) => text.includes(cleanText(v)))
            ? 'Content is in the output.'
            : 'Some enabled featured content is absent.',
      );
    }
    if (id === 'quoteBy' && s.place.quote !== 'all' && !res.template.extras?.includes('quote'))
      return item('na', 'The quote is not included here.');
    if (id === 'teams')
      return item(
        hrefs.some((h) => h.startsWith('https://teams.microsoft.com/')) ? 'pass' : 'na',
        'Teams needs an email address and a design or reply that includes profile links.',
      );
    const value: unknown = Reflect.get(s, id);
    if (typeof value !== 'string' || !value.trim()) return item('na', 'No value entered.');
    const normalized = cleanText(value);
    const inOutput =
      text.includes(normalized) ||
      hrefs.some((h) => {
        const comparable = cleanText(h)
          .replace(/^https?:\/\//, '')
          .replace(/\/$/, '');
        return comparable.includes(normalized.replace(/^https?:\/\//, '').replace(/\/$/, ''));
      });
    return item(
      inOutput ? 'pass' : res.version === 'reply' ? 'na' : 'warning',
      inOutput
        ? 'Included in the output.'
        : res.version === 'reply'
          ? 'Omitted by this compact reply.'
          : 'Enabled, but not included by this design. Choose a design that uses this field or switch it off.',
    );
  });
}

function validDestination(href: string): boolean {
  if (/^mailto:/i.test(href)) return /^[^@\s?]+@[^@\s?]+\.[^@\s?]+(?:\?.*)?$/.test(href.slice(7));
  if (/^tel:/i.test(href)) return /^\+?\d{3,}$/.test(href.slice(4));
  try {
    const url = new URL(href);
    return (url.protocol === 'https:' || url.protocol === 'http:') && !!url.hostname && !url.username && !url.password;
  } catch {
    return false;
  }
}

/** Reads APNG control chunks independently of the renderer's animated flag. */
function encodedMotion(dataURL: string): { frames: number; plays: number; ms: number; previous: boolean } {
  const bytes = dataUrlBytes(dataURL);
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let declared = 0;
  let frames = 0;
  let plays = 1;
  let ms = 0;
  let lastMs = 0;
  let previous = false;
  for (let p = 8; p + 12 <= bytes.length;) {
    const length = view.getUint32(p);
    if (p + 12 + length > bytes.length) throw new Error('Truncated PNG chunk');
    const type = String.fromCharCode(...bytes.subarray(p + 4, p + 8));
    if (type === 'acTL') {
      if (length !== 8) throw new Error('Invalid APNG control');
      declared = view.getUint32(p + 8);
      plays = view.getUint32(p + 12);
    }
    if (type === 'fcTL') {
      if (length !== 26) throw new Error('Invalid APNG frame');
      frames++;
      lastMs = Math.max(20, Math.round((view.getUint16(p + 28) / (view.getUint16(p + 30) || 100)) * 1000));
      ms += lastMs;
      previous ||= bytes[p + 32] === 2;
    }
    p += length + 12;
  }
  if (declared !== frames) throw new Error('APNG frame count does not match');
  return { frames, plays, ms: ms * plays - lastMs, previous };
}

async function decodeImages(box: HTMLElement): Promise<string[]> {
  const problems: string[] = [];
  await Promise.all(
    [...box.querySelectorAll('img')].map(async (im) => {
      if (!/^data:image\/(?:png|jpeg|gif);base64,/i.test(im.getAttribute('src') ?? '')) {
        problems.push(`${im.alt || 'Image'} is not an embedded supported raster.`);
        return;
      }
      try {
        await im.decode();
        const w = Number(im.getAttribute('width'));
        const h = Number(im.getAttribute('height'));
        if (!(w > 0 && h > 0)) problems.push(`${im.alt || 'Image'} has no positive dimensions.`);
        if (im.naturalWidth === 1 && im.naturalHeight === 1 && im.alt === '') return;
        if (im.naturalWidth < w * 2 - 1 || im.naturalHeight < h * 2 - 1)
          problems.push(`${im.alt || 'Image'} is below 2x resolution.`);
        if (w && h && Math.abs(im.naturalWidth / im.naturalHeight - w / h) > 0.06)
          problems.push(`${im.alt || 'Image'} has inconsistent width and height.`);
      } catch {
        problems.push(`${im.alt || 'Image'} could not be decoded.`);
      }
    }),
  );
  return problems;
}

function layoutProblems(box: HTMLElement): string[] {
  const edge = box.getBoundingClientRect().right;
  const bad: string[] = [];
  for (const el of box.querySelectorAll('*')) {
    const bounds = el.getBoundingClientRect();
    if (bounds.width && bounds.right > edge + 1) {
      bad.push(`Content exceeds the edge by ${Math.ceil(bounds.right - edge)} px.`);
      break;
    }
  }
  for (const im of box.querySelectorAll('img')) {
    const width = Number(im.getAttribute('width'));
    if (im.naturalWidth === 1 && im.naturalHeight === 1) continue;
    const bounds = im.getBoundingClientRect();
    if (bounds.width + 0.6 < width) bad.push(`${im.alt || 'Image'} shrank below its selected width.`);
    if (bounds.height && Math.abs(bounds.width / bounds.height - im.naturalWidth / im.naturalHeight) > 0.06)
      bad.push(`${im.alt || 'Image'} is stretched.`);
  }
  return bad;
}

function contentFingerprint(box: HTMLElement): string {
  return JSON.stringify({
    text: cleanText(box.textContent ?? ''),
    links: [...box.querySelectorAll('a')].map((a) => a.getAttribute('href')),
    images: [...box.querySelectorAll('img')].map((im) => [im.getAttribute('src'), im.alt]),
  });
}

async function checkVersion(res: BuildResult, stage: HTMLElement, signal?: AbortSignal): Promise<VersionHealth> {
  signal?.throwIfAborted();
  const base = checkAccessibility(res, stage, { motion: res.state.motion });
  const items = base.items;
  const add = (id: CheckId, status: CheckStatus, title: string, text: string): void => {
    const item = { id, status, ok: status !== 'warning', title, text };
    const index = items.findIndex((it) => it.id === id);
    if (index >= 0) items[index] = item;
    else items.push(item);
  };
  const box = mount(stage, res.html('embed'), 'light');
  const features = featureCoverage(res, box);
  add(
    'identity',
    res.state.fullName.trim() ? 'pass' : 'warning',
    'Identity',
    res.state.fullName.trim() ? 'A name is provided.' : 'Add your name before using this signature.',
  );
  const invalidElements = box.querySelectorAll('script,style,link,svg,iframe,form,[class]');
  const invalidLayout = [...box.querySelectorAll('[style]')].some(
    (el) =>
      el instanceof HTMLElement &&
      (/^(?:inline-)?(?:flex|grid)$/.test(el.style.display) ||
        !!el.style.position ||
        (el.tagName !== 'IMG' && !!el.style.cssFloat)),
  );
  const unresolved = /\{\{img:/.test(res.html('embed'));
  add(
    'integrity',
    invalidElements.length || invalidLayout || unresolved ? 'warning' : 'pass',
    'HTML integrity',
    invalidElements.length || invalidLayout || unresolved
      ? 'Unsupported markup, layout CSS or unresolved image tokens found. Do not copy until this is fixed.'
      : 'No scripts, external stylesheets, SVG, positioned layouts or unresolved image tokens.',
  );
  const badLinks = [...box.querySelectorAll('a')].filter((a) => !validDestination(a.getAttribute('href') ?? ''));
  add(
    'destinations',
    badLinks.length ? 'warning' : 'pass',
    'Link destinations',
    badLinks.length
      ? `${badLinks.length} malformed or unsupported destinations. Check Contact and Extras.`
      : 'Web, email and phone destinations have valid structure. Reachability and mailbox ownership are not tested.',
  );
  const font = FONT_OPTIONS.find((f) => f.id === res.state.font);
  const min = TEXT_SIZE_OPTIONS.find((t) => t.id === res.state.textSize)?.min ?? 11;
  const fonts = [...box.querySelectorAll('[style]')]
    .filter((el): el is HTMLElement => el instanceof HTMLElement)
    .map((el) => el.style.fontFamily)
    .filter(Boolean);
  const safeFonts =
    fonts.length > 0 && fonts.every((family) => /(?:sans-serif|serif|monospace|cursive)\s*$/.test(family));
  const expectedFont = document.createElement('span');
  expectedFont.style.fontFamily = font?.stack ?? '';
  const matchesFont =
    !expectedFont.style.fontFamily || fonts.every((family) => family === expectedFont.style.fontFamily);
  const actual = checkText(box, MODES.light.background);
  add(
    'font-fallback',
    safeFonts && matchesFont && (!actual.count || actual.smallest >= min) ? 'pass' : 'warning',
    'Typography',
    `${font?.label ?? res.state.font}; detail text minimum ${min} px. ${safeFonts ? 'Font declarations include generic fallbacks.' : 'A font declaration is missing a generic fallback.'} ${matchesFont ? '' : 'Some text does not use the selected font. '}${actual.count && actual.smallest < min ? 'Some text is smaller than the selected minimum. ' : ''}Recipient fonts and text metrics may differ.`,
  );
  const decode = await decodeImages(box);
  signal?.throwIfAborted();
  add(
    'pixel-size',
    decode.length ? 'warning' : 'pass',
    'Image files and dimensions',
    decode.length
      ? unique(decode).join(' ')
      : 'Every raster decodes, has explicit proportional dimensions and at least 2x pixels. One-pixel spacers are excluded.',
  );
  const motionProblems: string[] = [];
  let animated = 0;
  let unknownMotion = false;
  const used = new Set([...box.querySelectorAll('img')].map((im) => im.getAttribute('src')));
  for (const image of Object.values(res.images).filter((im) => used.has(im.dataURL))) {
    if (image.mime === 'image/gif') {
      unknownMotion = true;
      continue;
    }
    if (image.mime !== 'image/png') continue;
    try {
      const motion = encodedMotion(image.dataURL);
      if (motion.frames) {
        animated++;
        if (motion.previous) motionProblems.push(`${image.name} uses revert-to-previous frames.`);
        if (!motion.plays || motion.ms > 5000)
          motionProblems.push(
            `${image.name} ${motion.plays ? `moves for ${(motion.ms / 1000).toFixed(1)} seconds` : 'loops without stopping'}.`,
          );
        if (!res.state.show.animate) motionProblems.push(`${image.name} animates even though animation is off.`);
      }
      if (image.animated !== !!motion.frames) motionProblems.push(`${image.name} has inconsistent animation metadata.`);
    } catch (error) {
      motionProblems.push(`${image.name}: ${error instanceof Error ? error.message : 'unreadable animation data'}.`);
    }
  }
  add(
    'motion',
    motionProblems.length ? 'warning' : unknownMotion ? 'manual' : 'pass',
    'Encoded animation',
    motionProblems.length
      ? motionProblems.join(' ')
      : unknownMotion
        ? 'GIF timing needs a manual check.'
        : animated
          ? `${animated} APNG images stop within five seconds and avoid revert-to-previous frames. Review the finished static frame visually.`
          : 'No animation detected in the generated PNG/JPEG assets.',
  );
  const handRequested = res.state.nameStyle === 'hand' || res.template.handAlways;
  const handSupported = canHand(res.state);
  add(
    'handwriting',
    !handRequested ? 'na' : handSupported ? 'pass' : 'warning',
    'Handwriting coverage',
    !handRequested
      ? 'Typed name selected.'
      : handSupported
        ? 'This writing style includes every character in the name. The name is rendered as a raster with alt text.'
        : 'This writing style lacks a character in the name. A fallback is used; choose a supported style or typed text.',
  );
  const phoneProblems: string[] = [];
  const pasteProblems: string[] = [];
  for (const appearance of ['light', 'dark'] as const) {
    const html = appearance === 'light' ? res.html('embed') : res.darkHtml();
    const original = contentFingerprint(mount(stage, html, appearance));
    for (const mode of ['css', 'outlook', 'mac'] as const) {
      signal?.throwIfAborted();
      const stageBox = mount(stage, keepAsOutlook(html, mode), appearance);
      // oxlint-disable-next-line no-await-in-loop -- one attached stage measures one layout at a time
      const broken = await decodeImages(stageBox);
      if (broken.length) pasteProblems.push(`${mode}: ${broken.join(' ')}`);
      if (contentFingerprint(stageBox) !== original)
        pasteProblems.push(`${mode}: text, links or images changed after paste.`);
      for (const width of [343, 680]) {
        stageBox.style.width = `${width}px`;
        const problems = layoutProblems(stageBox);
        if (problems.length)
          (width === 343 ? phoneProblems : pasteProblems).push(
            `${appearance}, ${mode}, ${width} px: ${problems.join(' ')}`,
          );
      }
    }
  }
  add(
    'phone',
    phoneProblems.length ? 'warning' : 'pass',
    'Phone fit',
    phoneProblems.length
      ? unique(phoneProblems).slice(0, 4).join(' ') + ' Try fewer columns, smaller photos or Standard text.'
      : 'Fits 343 px in light/dark browser and observed Outlook paste models, without shrinking images.',
  );
  add(
    'paste',
    pasteProblems.length ? 'warning' : 'pass',
    'Paste-model integrity',
    pasteProblems.length
      ? unique(pasteProblems).slice(0, 4).join(' ')
      : 'Text, links and images survive the observed web/Mac paste transformations and fit 680 px. These are models, not native Outlook tests.',
  );
  const bytes = new TextEncoder().encode(res.html('embed')).byteLength;
  add(
    'size',
    bytes > HEAVY_BYTES ? 'warning' : 'pass',
    'Embedded HTML payload',
    `${Math.ceil(bytes / 1024)} KiB including base64 image data. ${bytes > HEAVY_BYTES ? 'Above the Studio 400 KB budget; reduce animation or use hosted images.' : 'Within the Studio 400 KB budget.'} This is not an Outlook size limit.`,
  );
  const hosted = res.state.hosting.mode === 'hosted';
  const validBase = /^https:\/\//i.test(res.state.hosting.base) && validDestination(res.state.hosting.base);
  add(
    'delivery',
    hosted && !validBase ? 'warning' : 'manual',
    'Image delivery',
    hosted
      ? validBase
        ? 'HTTPS hosting base is configured. Upload the image package and verify access without signing in; remote images may be blocked. No network request was made.'
        : 'Hosted images need a valid public HTTPS base URL in Files.'
      : 'Embedded images work in Studio. Paste, save and send a test to verify Outlook keeps them. For classic Outlook, use its image-file package.',
  );
  const absent = features.filter((f) => f.status === 'warning');
  add(
    'features',
    absent.length ? 'warning' : 'pass',
    'Enabled feature coverage',
    absent.length
      ? `${absent.map((f) => f.title).join(', ')}: enabled but not found. See Feature coverage for details.`
      : 'No missing enabled content detected. Design-specific omissions and visual-only settings are listed in Feature coverage.',
  );
  add(
    'native',
    'manual',
    'Real Outlook test',
    'Required even when automated checks pass: paste, save, send, receive, reply and forward. Check native dark mode, blocked images, the static frame and screen-reader order. Classic Word rendering is not simulated.',
  );
  return { version: res.version, subject: base.subject, items, features };
}

/** Checks both built versions, without fetching links, fonts or remote image resources. */
export async function checkSignatureHealth(
  results: readonly BuildResult[],
  stage: HTMLElement,
  signal?: AbortSignal,
): Promise<SignatureHealthReport> {
  if (results.length !== 2 || !results.some((r) => r.version === 'new') || !results.some((r) => r.version === 'reply'))
    throw new Error('Signature health needs both the new-message and reply builds.');
  if (new Set(results.map((r) => JSON.stringify(r.state))).size !== 1)
    throw new Error('Both versions must use the same signature settings.');
  const versions: VersionHealth[] = [];
  try {
    for (const result of results) {
      // oxlint-disable-next-line no-await-in-loop -- checks share one measurement stage
      versions.push(await checkVersion(result, stage, signal));
    }
    const issues = versions.reduce((n, v) => n + v.items.filter((it) => it.status === 'warning').length, 0);
    return { versions, issues, summary: issues ? `${issues} to review` : 'All automated checks pass' };
  } finally {
    if (stage.shadowRoot) stage.shadowRoot.innerHTML = '';
  }
}
