// Contrast: every piece of text meets WCAG AA (4.5:1, or 3:1 when large) on the background it
// really sits on, and is at least 11 px, in light and dark mode and on solid backgrounds.
// Each design is checked in its own palette, four others and one set of your own colours, on the
// tint, Midnight and one more card colour; VITE_AUDIT_ALL=1 checks every palette, set and card.
import { expect, test } from 'vitest';
import { CARD_COLORS, TEMPLATES, THEMES, type IconStyle, type StateInput, type Version } from '../../src/index.ts';
import { AUDIT_ALL, AUDIT_DESIGNS, buildAudit, inOrder, readText, withStage, type PageLook } from './helpers.ts';

const MIN_PX = 11;
const WIDTH = 900;
const VERSIONS: readonly Version[] = ['new', 'reply'];
const ICONS: readonly IconStyle[] = ['auto', 'labels'];

/* Outlook's reading pane, with its default text colours (as in src/check.ts). */
const FONT = "14px/1.4 'Segoe UI', Arial, sans-serif";
const LIGHT_PAGE: PageLook = { font: FONT, color: '#242424', background: '#FFFFFF' };
const DARK_PAGE: PageLook = { font: FONT, color: '#E0E0E0', background: '#1F1F1F' };

interface Surface {
  name: string;
  /** True to check the dark-mode HTML on a dark page. */
  dark: boolean;
  state: StateInput;
}

/** The modes: light and dark pages, and the soft tint. */
const SURFACES: readonly Surface[] = [
  { name: 'light', dark: false, state: {} },
  { name: 'dark', dark: true, state: {} },
  { name: 'tint', dark: false, state: { bgMode: 'solid', bgColor: 'tint' } },
];

const CARDS = CARD_COLORS.flatMap((g) => g.colors);

/** Solid cards in light and dark mode: Midnight and one more for each design, or every card. */
function cardsFor(i: number): Surface[] {
  const picked = AUDIT_ALL ? CARDS : [CARDS.find((c) => c.label === 'Midnight'), CARDS[i % CARDS.length]];
  return [...new Set(picked)].flatMap((c) =>
    c
      ? [false, true].map((dark) => ({
          name: `${c.label.toLowerCase()}${dark ? '-dark' : ''}`,
          dark,
          state: { bgMode: 'solid', bgColor: c.id } as const,
        }))
      : [],
  );
}

/** Optional lines filled so their colours are checked too. The name is handwritten. */
const EXTRA = {
  office: '+1 425 555 0100',
  hours: 'Mon to Fri',
  languages: 'English, Portuguese',
  altName: '\u0633\u0627\u0645 \u062a\u0627\u064a\u0644\u0648\u0631',
  banner: 'Join us at the summit',
  bannerUrl: 'example.com/summit',
  disclaimer: 'Confidential.',
  tagline: 'Helping good ideas travel further',
  nameStyle: 'hand',
} as const satisfies StateInput;

const SHOW = { banner: true, disclaimer: true, tagline: true, signoff: true, animate: false } as const;

const PALETTES = Object.keys(THEMES);

/** Light and dark extremes, four-colour gradients and solid mode with retained colours. */
const CUSTOM: Record<string, StateInput> = {
  'your yellow': { colors: ['#FFD400'], gradient: false },
  'your ink': { colors: ['#101820', '#E8E8E8'], gradient: true },
  'your four colours': { colors: ['#FF6A00', '#7A3CFF', '#00A878', '#FFD400'], gradient: true },
  'your solid': { colors: ['#F5F5F5', '#7A3CFF', '#00A878', '#FFD400'], gradient: false },
};
const CUSTOM_SETS = Object.keys(CUSTOM);

/**
 * A design's own palette and four others. The others come from the design's place in the full gallery,
 * so filtering designs does not change which palettes each gets, and a full run covers every palette.
 */
function palettesFor(id: string, own: string): string[] {
  if (AUDIT_ALL) return [...PALETTES, ...CUSTOM_SETS];
  const i = TEMPLATES.findIndex((d) => d.id === id);
  const others = [0, 1, 2, 3].map((k) => PALETTES[(i * 4 + k) % PALETTES.length] ?? own);
  const mine = CUSTOM_SETS[i % CUSTOM_SETS.length] ?? own;
  return [own, ...others.filter((t) => t !== own), mine].filter((t, n, all) => all.indexOf(t) === n);
}

const pairs = AUDIT_DESIGNS.flatMap((d) => palettesFor(d.id, d.theme).map((theme) => ({ id: d.id, theme })));

let layouts = 0;
let pieces = 0;

interface Failure {
  ratio: number;
  need: number;
  text: string;
  size: number;
  count: number;
}

test.for(pairs)('$id in $theme', async ({ id, theme }) => {
  const fails = new Map<string, Failure>();
  const note = (key: string, f: Omit<Failure, 'count'>): void => {
    const seen = fails.get(key);
    if (seen) seen.count++;
    else fails.set(key, { ...f, count: 1 });
  };
  let mine = 0;
  const cards = cardsFor(TEMPLATES.findIndex((d) => d.id === id));
  const settings = [...SURFACES, ...cards].flatMap((surface) =>
    VERSIONS.flatMap((version) => ICONS.map((iconStyle) => ({ surface, version, iconStyle }))),
  );
  await inOrder(settings, async ({ surface, version, iconStyle }) => {
    const r = await buildAudit(
      { ...EXTRA, ...surface.state, template: id, ...(CUSTOM[theme] ?? { theme }), iconStyle, show: { ...SHOW } },
      version,
    );
    const html = surface.dark ? r.darkHtml() : r.html('embed');
    const where = `${id} ${theme} ${surface.name} ${version} icons:${iconStyle}`;
    await withStage(
      html,
      WIDTH,
      ({ box }) => {
        const read = readText(box);
        mine++;
        pieces += read.length;
        for (const t of read) {
          const sample = t.text.slice(0, 30);
          if (t.ratio < t.need) note(`${where}: ${t.color} on ${t.background}`, { ...t, text: sample });
          if (t.size < MIN_PX) note(`${where}: text ${t.size}px`, { ...t, text: sample });
        }
      },
      surface.dark ? DARK_PAGE : LIGHT_PAGE,
    );
  });
  layouts += mine;
  const problems = [...fails].map(
    ([key, f]) =>
      `${key} ${f.ratio.toFixed(2)}:1 (needs ${f.need}:1), ${f.size}px "${f.text}"${f.count > 1 ? ` and ${f.count - 1} more` : ''}`,
  );
  expect(mine, 'layouts checked').toBeGreaterThan(0);
  expect(problems).toEqual([]);
});

test('checked at least one layout and one piece of text', async ({ annotate }) => {
  await annotate(
    `contrast: ${pairs.length} design/palette pairs, ${layouts} layouts, ${pieces} pieces of text checked`,
  );
  expect(layouts).toBeGreaterThan(0);
  expect(pieces).toBeGreaterThan(0);
});
