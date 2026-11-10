// Data, state and helper checks: palettes, designs, presets, handwriting, normalize() and the small
// HTML and colour helpers.
import { describe, expect, test } from 'vitest';
import {
  colorsOfPixels,
  contrast,
  deep,
  deepen,
  fit,
  LIGHT,
  lighten,
  mix,
  matchingTheme,
  oklch,
  paletteFrom,
  resolveTheme,
  themeSettings,
  tintOf,
} from '../../src/color.ts';
import { HW, ICONS } from '../../src/data.ts';
import { iconFor, restyle } from '../../src/icons.ts';
import { ICON_WEIGHTS } from '../../src/options.ts';
import { canvas, ctx, loadImg } from '../../src/raster/canvas.ts';
import { esc, nb, pretty, telOf, url } from '../../src/html.ts';
import {
  DEFAULT_STATE,
  DESIGN_CATEGORY_OPTIONS,
  ICON_STYLE_OPTIONS,
  ICON_FAMILY_OPTIONS,
  normalize,
  PALETTE_GROUP_OPTIONS,
  previewIcon,
  TEMPLATES,
  THEMES,
} from '../../src/index.ts';
import type { SpecMap, Theme } from '../../src/index.ts';

describe('palettes', () => {
  const themes = Object.entries(THEMES);

  test('there are 33 palettes', () => {
    expect(themes).toHaveLength(33);
  });

  test.for([
    { id: 'emerald', name: 'Emerald & Gold', group: 'rich' },
    { id: 'midnight', name: 'Midnight', group: 'calm' },
    { id: 'indigo', name: 'Indigo', group: 'calm' },
    { id: 'terracotta', name: 'Terracotta', group: 'warm' },
    { id: 'olive', name: 'Olive', group: 'nature' },
    { id: 'rose', name: 'Rose', group: 'rich' },
    { id: 'noir', name: 'Noir', group: 'calm' },
  ])('$name is available as a preset and through legacy theme input', ({ id, name, group }) => {
    expect(THEMES[id]).toMatchObject({ name, group });
    expect(matchingTheme(normalize({ theme: id }))).toBe(id);
  });

  test.for(PALETTE_GROUP_OPTIONS.map((g) => g.id))('the %s group has palettes', (id) => {
    expect(themes.filter(([, th]) => th.group === id).length).toBeGreaterThan(2);
  });

  test.for(themes)('%s meets the palette contrast rules through the shared resolver', ([id, preset]) => {
    const th = resolveTheme(preset);
    expect(preset.colors.length).toBeGreaterThanOrEqual(1);
    expect(preset.colors.length).toBeLessThanOrEqual(4);
    expect(typeof preset.gradient).toBe('boolean');
    expect(matchingTheme(normalize(themeSettings(id)))).toBe(id);
    for (const color of preset.colors) expect(color).toMatch(/^#[0-9A-F]{6}$/);
    expect(contrast(th.accent, '#FFFFFF'), 'accent on white').toBeGreaterThanOrEqual(4.6);
    expect(contrast(th.accentDark, '#1F1F1F'), 'accentDark on #1F1F1F').toBeGreaterThanOrEqual(4.6);
    // White text and icons sit on stops only after deep(), so that is the contract to check.
    expect(th.stops.length).toBeGreaterThan(0);
    for (const stop of th.stops) {
      expect(stop).toMatch(/^#[0-9A-F]{6}$/i);
      expect(contrast(deep(stop), '#FFFFFF'), `white on deep(${stop})`).toBeGreaterThanOrEqual(4.5);
    }
    expect(PALETTE_GROUP_OPTIONS.map((g) => g.id)).toContain(th.group);
  });
});

describe('designs', () => {
  test('there are 36 designs with unique ids', () => {
    expect(TEMPLATES).toHaveLength(36);
    expect(new Set(TEMPLATES.map((d) => d.id)).size).toBe(36);
  });

  test.for(TEMPLATES.map((d) => [d.id, d] as const))('%s has a known default palette and a description', ([, d]) => {
    expect(THEMES[d.theme], `palette ${d.theme}`).toBeDefined();
    expect(d.name.length).toBeGreaterThan(0);
    expect(d.blurb.length).toBeGreaterThan(0);
    expect(d.cats.length).toBeGreaterThan(0);
  });

  test.for(DESIGN_CATEGORY_OPTIONS.map((c) => c.id))('category %s has at least one design', (id) => {
    expect(TEMPLATES.some((d) => d.cats.includes(id))).toBe(true);
  });
});

describe('handwriting', () => {
  test('ten styles, each with every printable ASCII character', () => {
    expect(HW.order).toHaveLength(10);
    for (const id of HW.order) {
      const glyphs = HW.fonts[id]?.g ?? {};
      for (let c = 32; c <= 126; c++) expect(glyphs[String.fromCharCode(c)], `${id} ${c}`).toBeDefined();
    }
  });
});

describe('normalize', () => {
  test('typography defaults safely and keeps supported selections', () => {
    expect(normalize({ font: 'uploaded-font', textSize: -100 })).toMatchObject({ font: 'auto', textSize: 'standard' });
    expect(normalize({ font: 'georgia', textSize: 'comfortable' })).toMatchObject({
      font: 'georgia',
      textSize: 'comfortable',
    });
  });

  test('gives the defaults for no input', () => {
    expect(normalize()).toEqual(DEFAULT_STATE);
    expect(normalize(null)).toEqual(DEFAULT_STATE);
    expect(normalize('nope')).toEqual(DEFAULT_STATE);
  });

  test('rejects inherited keys, remote photos and malformed hosting', () => {
    const s = normalize({
      template: 'constructor',
      photoSize: 'toString',
      photo: { src: 'https://example.com/pixel.png' },
      hosting: { mode: 'ftp', base: null },
    });
    expect(s).toMatchObject({ template: 'aurora', photoSize: 'M', photo: { src: '' } });
    expect(s.hosting).toMatchObject({ mode: 'embed', base: '' });
    expect(normalize({ photo: { src: 'data:image/png;base64,AAAA' } }).photo.src).toBe('data:image/png;base64,AAAA');
  });

  test('never changes its input or the defaults', () => {
    const input = { template: 'tiles', show: { photo: false } };
    const before = structuredClone(input);
    const defaults = structuredClone(DEFAULT_STATE);
    const s = normalize(input);
    s.show.logo = false;
    expect(input).toEqual(before);
    expect(DEFAULT_STATE).toEqual(defaults);
  });

  test('keeps valid values', () => {
    const s = normalize({
      template: 'passport',
      colors: THEMES.navy.colors,
      cols: 3,
      photoSize: 'XL',
      bgMode: 'solid',
      bgColor: '#0b1f3a',
    });
    expect(s).toMatchObject({
      template: 'passport',
      colors: THEMES.navy.colors,
      cols: 3,
      photoSize: 'XL',
      bgMode: 'solid',
      bgColor: '#0B1F3A',
    });
  });

  test('replaces unknown values with defaults', () => {
    const s = normalize({
      template: 'nope',
      theme: 'nope',
      cols: 7,
      photoAnim: 'x',
      replyStyle: 'x',
      iconStyle: 'x',
      photoShape: 'x',
      photoLook: 'x',
      photoSize: 'XXL',
      handStyle: 'x',
      handPen: 'x',
      nameStyle: 'x',
      bgMode: 'x',
      bgColor: 'red',
      photoPos: 'x',
      motion: 'x',
    });
    expect(s).toMatchObject({
      template: 'aurora',
      colors: DEFAULT_STATE.colors,
      cols: 'auto',
      photoAnim: 'auto',
      replyStyle: 'line',
      iconStyle: 'auto',
      photoShape: 'auto',
      photoLook: 'natural',
      photoSize: 'M',
      handStyle: 'allure',
      handPen: 'brush',
      nameStyle: 'typed',
      bgMode: 'transparent',
      bgColor: 'tint',
      photoPos: 'column',
      motion: 'brief',
    });
  });

  test('merges partial switches with the defaults', () => {
    const s = normalize({ show: { photo: false } });
    expect(s.show.photo).toBe(false);
    expect(s.show.logo).toBe(DEFAULT_STATE.show.logo);
  });

  test('turns values from a config file into text, switches and numbers', () => {
    const s = normalize({
      phone: 42,
      title: { text: 'x' },
      email: ['a@example.com'],
      show: { title: 0, photo: 1, logo: null },
      photo: { zoom: '1.5', dx: 'x', dy: null },
    });
    expect(s.phone).toBe('42');
    expect(s.title).toBe('');
    expect(s.email).toBe('');
    expect(s.show).toMatchObject({ title: false, photo: true, logo: DEFAULT_STATE.show.logo });
    expect(s.photo).toMatchObject({ zoom: 1.5, dx: 0, dy: 0 });
  });

  test('opens palettes that were merged as their neighbour', () => {
    expect(matchingTheme(normalize({ theme: 'plum' }))).toBe('grape');
    expect(matchingTheme(normalize({ theme: 'crimson' }))).toBe('ember');
    expect(matchingTheme(normalize({ theme: 'mint' }))).toBe('sage');
  });

  test('migrates old custom palettes and removes the old state fields', () => {
    const s = normalize({ theme: 'custom', customColors: ['#0b1f3a', 'red', '#ff00aa', '#00AA44', '#123456'] });
    expect(s.colors).toEqual(['#0B1F3A', '#FF00AA', '#00AA44', '#123456']);
    expect(matchingTheme(s)).toBe('custom');
    expect(s).not.toHaveProperty('theme');
    expect(s).not.toHaveProperty('customColors');
    expect(normalize({ theme: 'custom' }).colors).toEqual(DEFAULT_STATE.colors);
    expect(normalize({ customColors: 'nope' }).colors).toEqual(DEFAULT_STATE.colors);
  });

  test('validates colour settings, with explicit colours taking precedence over legacy ids', () => {
    expect(normalize({ theme: 'navy', colors: ['#ffb900'], gradient: true })).toMatchObject({
      colors: ['#FFB900'],
      gradient: false,
    });
    expect(normalize({ colors: [], gradient: 'nope' })).toMatchObject(themeSettings('aurora'));
    const colors = ['#111111', '#222222', '#333333', '#444444', '#555555'];
    expect(normalize({ colors, gradient: false })).toMatchObject({ colors: colors.slice(0, 4), gradient: false });
  });

  test('checks the icon weight and colour', () => {
    expect(normalize({ iconWeight: 'bold', iconColor: 'brand' })).toMatchObject({
      iconWeight: 'bold',
      iconColor: 'brand',
    });
    expect(normalize({ iconWeight: 'x', iconColor: 'x' })).toMatchObject({ iconWeight: 'auto', iconColor: 'auto' });
  });

  test('ignores keys that would change object prototypes', () => {
    const s = normalize(JSON.parse('{"__proto__":{"polluted":true},"show":{"__proto__":{"polluted":true}}}'));
    expect(Object.getPrototypeOf(s)).toBe(Object.prototype);
    expect(Object.getPrototypeOf(s.show)).toBe(Object.prototype);
    expect(({} as Record<string, unknown>)['polluted']).toBeUndefined();
  });

  test('keeps only an embedded image as the logo', () => {
    const png = 'data:image/png;base64,iVBORw0KGgo=';
    expect(normalize({}).logo.src).toBe('');
    expect(normalize({ logo: { src: png } }).logo.src).toBe(png);
    for (const src of ['https://example.com/logo.png', 'data:image/svg+xml;base64,PHN2Zz4=', 'javascript:alert(1)', 42])
      expect(normalize({ logo: { src } }).logo.src).toBe('');
  });
});

describe('esc', () => {
  test('escapes the characters that matter in HTML text and double-quoted attributes', () => {
    expect(esc('<a href="x">Tom & Jerry</a>')).toBe('&lt;a href=&quot;x&quot;&gt;Tom &amp; Jerry&lt;/a&gt;');
  });

  test('turns null and undefined into an empty string', () => {
    expect(esc(null)).toBe('');
    expect(esc(undefined)).toBe('');
  });

  test('nb keeps short text on one line', () => {
    expect(nb('+1 425 555 0100')).toBe('+1&nbsp;425&nbsp;555&nbsp;0100');
  });
});

describe('url', () => {
  test('adds https:// to a bare web address', () => {
    expect(url('example.com/me')).toBe('https://example.com/me');
    expect(url('//example.com')).toBe('https://example.com');
  });

  test('keeps links that already have a safe scheme', () => {
    expect(url('http://example.com')).toBe('http://example.com');
    expect(url('mailto:sam@example.com')).toBe('mailto:sam@example.com');
    expect(url('tel:+14255550100')).toBe('tel:+14255550100');
  });

  test('never produces a javascript: link', () => {
    expect(url('javascript:alert(1)')).toBe('https://javascript:alert(1)');
  });

  test('returns an empty string for empty input', () => {
    expect(url('  ')).toBe('');
    expect(url(undefined)).toBe('');
  });

  test('pretty shows an address as people read it', () => {
    expect(pretty('https://www.example.com/')).toBe('example.com');
  });

  test('telOf keeps only digits and the plus sign', () => {
    expect(telOf({ phone: '+1 (425) 555-0100' })).toBe('tel:+14255550100');
  });
});

/** `n` pixels of one colour, as RGBA bytes. */
const px = (hex: string, n: number): number[] =>
  Array.from({ length: n }, () => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)).concat(255)).flat();

describe('colour', () => {
  test('contrast follows WCAG 2', () => {
    expect(contrast('#000000', '#FFFFFF')).toBeCloseTo(21, 5);
    expect(contrast('#777777', '#FFFFFF')).toBeCloseTo(4.48, 2);
    expect(contrast('#123456', '#ABCDEF')).toBe(contrast('#ABCDEF', '#123456'));
  });

  test('mix blends two colours', () => {
    expect(mix('#000000', '#FFFFFF', 0.5).toUpperCase()).toBe('#808080');
  });

  test.for(['#FFB900', '#7FBA00', '#00A4EF', '#C239B3', '#F2C811'])('deep(%s) is dark enough for white text', (c) => {
    expect(contrast(deep(c), '#FFFFFF')).toBeGreaterThanOrEqual(4.5);
  });

  test.for(['#FFB900', '#00A4EF', '#9FB7E0'])('deepen(%s) reaches 4.6:1 on white', (c) => {
    expect(contrast(deepen(c), '#FFFFFF')).toBeGreaterThanOrEqual(4.6);
  });

  test.for(['#0F6CBD', '#1E3F75', '#5B4FE0'])('lighten(%s) reaches 4.6:1 on #1F1F1F', (c) => {
    expect(contrast(lighten(c), '#1F1F1F')).toBeGreaterThanOrEqual(4.6);
  });

  test.for(['#FFB900', '#00A4EF', '#C239B3'])('fit(%s) keeps the hue and reaches the ratio', (c) => {
    const f = fit(c, '#FFFFFF', 4.6);
    expect(contrast(f, '#FFFFFF')).toBeGreaterThanOrEqual(4.6);
    expect(Math.abs((oklch(f)[2] ?? 0) - (oklch(c)[2] ?? 0))).toBeLessThan(6);
    expect(fit('#0F6CBD', '#FFFFFF', 4.5)).toBe('#0F6CBD');
  });

  test('paletteFrom makes a readable palette from one to four colours without inventing extra colours', () => {
    const one = paletteFrom(['#ffb900']);
    expect(one.stops).toHaveLength(2);
    expect(one.stops[0]).toBe('#FFB900');
    expect(one.stops[1]).toBe('#FFB900');
    expect(contrast(one.accent, '#FFFFFF')).toBeGreaterThanOrEqual(4.6);
    expect(contrast(one.accentDark, '#1F1F1F')).toBeGreaterThanOrEqual(4.6);
    expect(paletteFrom(['#0F6CBD', '#C239B3', '#FFB900']).stops).toEqual(['#0F6CBD', '#C239B3', '#FFB900']);
    const colors = ['#0F6CBD', '#C239B3', '#FFB900', '#123456'];
    expect(paletteFrom(colors).stops).toEqual(colors);
    expect(paletteFrom(colors, false).stops).toEqual(['#0F6CBD', '#0F6CBD']);
  });

  test('preset names follow the settings rather than controlling the renderer', () => {
    const preset = themeSettings('copilot');
    expect(preset.colors).toHaveLength(4);
    expect(matchingTheme(preset)).toBe('copilot');
    expect(matchingTheme({ ...preset, gradient: false })).toBe('custom');
    expect(matchingTheme({ ...preset, colors: ['#123456', ...preset.colors.slice(1)] })).toBe('custom');
    expect(resolveTheme(preset)).toMatchObject({
      ...paletteFrom(preset.colors, preset.gradient),
      name: 'Copilot Spectrum',
    });
    preset.colors[0] = '#123456';
    expect(themeSettings('copilot').colors[0]).not.toBe('#123456');
    expect(themeSettings('unknown')).toEqual(themeSettings('aurora'));
    expect(themeSettings('constructor')).toEqual(themeSettings('aurora'));
  });

  test.for([
    ...Object.values(THEMES).map(resolveTheme),
    paletteFrom(['#FFD400']),
    paletteFrom(['#101820']),
    paletteFrom(['#00FF66']),
  ])('the soft tint keeps the theme colour and links readable in $name', (th) => {
    const bg = tintOf(th);
    expect(contrast(th.accent, bg)).toBeGreaterThanOrEqual(4.6);
    expect(contrast(LIGHT.link, bg)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(LIGHT.muted, bg)).toBeGreaterThanOrEqual(4.5);
  });

  test('colorsOfPixels finds the main colours and skips white, black and grey', () => {
    const img = [
      ...px('#0F6CBD', 60),
      ...px('#FFB900', 30),
      ...px('#FFFFFF', 200),
      ...px('#000000', 100),
      ...px('#808080', 90),
    ];
    const out = colorsOfPixels(img);
    expect(out).toHaveLength(2);
    expect(out[0]).toHaveLength(1);
    expect(out[1]).toHaveLength(2);
    expect(oklch(out[0]?.[0] ?? '')[2]).toBeCloseTo(oklch('#0F6CBD')[2] ?? 0, 0);
    expect(colorsOfPixels(px('#808080', 50))).toEqual([]);
  });
});

describe('icons', () => {
  const th: Theme = resolveTheme(THEMES.aurora);
  const drawn = ICON_STYLE_OPTIONS.map((o) => o.id).filter((id) => id !== 'auto' && id !== 'labels');

  test('there are 17 icon styles', () => {
    expect(ICON_STYLE_OPTIONS).toHaveLength(17);
  });

  test('old signatures keep classic icons and the default email profile', () => {
    expect(normalize({})).toMatchObject({ iconFamily: 'standard', emailProfile: 'outlook' });
    expect(normalize({ iconFamily: 'unknown', emailProfile: 'unknown' })).toMatchObject({
      iconFamily: 'standard',
      emailProfile: 'outlook',
    });
    expect(normalize({ iconFamily: 'handdrawn' }).iconFamily).toBe('handdrawn');
  });

  test.for(ICON_FAMILY_OPTIONS.filter((f) => f.id !== 'standard'))(
    '$label drawings decode at 2x in every weight',
    async ({ id }) => {
      await Promise.all(
        ['phone', 'office', 'mail', 'web', 'location', 'calendar', 'hours', 'languages', 'org', 'blog'].map(
          async (kind) => {
            const images = await Promise.all(
              (['line', 'bold', 'solid', 'duotone'] as const).map(async (weight) => {
                const image = await previewIcon('glyph', kind, { family: id, weight, size: 16 });
                if (!image) throw new Error(`Missing ${id} ${kind} ${weight}`);
                const decoded = await loadImg(image.url);
                expect([decoded.naturalWidth, decoded.naturalHeight]).toEqual([32, 32]);
                const target = canvas(32, 32);
                const context = ctx(target);
                context.drawImage(decoded, 0, 0);
                const pixels = context.getImageData(0, 0, 32, 32).data;
                const visible = pixels.filter((alpha, i) => i % 4 === 3 && alpha > 100).length;
                expect(visible).toBeGreaterThan(30);
                return image.url;
              }),
            );
            expect(new Set(images).size).toBe(4);
          },
        ),
      );
      const specs: SpecMap = { ic_mail: { kind: 'glyph', icon: 'mail', size: 16, color: th.accent } };
      restyle(specs, { iconStyle: 'auto', iconWeight: 'auto', iconColor: 'auto', iconFamily: id }, th);
      expect(specs.ic_mail).toMatchObject({ icon: `mail-${id}-line` });
      expect(iconFor('glyph', 'github', 16, th, { family: id }).icon).toBe('github');
      expect(await previewIcon('labels', 'mail', { family: id })).toBeNull();
    },
  );

  test('the four families have different drawings', async () => {
    await Promise.all(
      ['phone', 'mail', 'web'].map(async (kind) => {
        const images = await Promise.all(
          ICON_FAMILY_OPTIONS.map(async ({ id }) => {
            const image = await previewIcon('glyph', kind, { family: id });
            if (!image) throw new Error(`Missing ${id} ${kind}`);
            return image.url;
          }),
        );
        expect(new Set(images).size).toBe(4);
      }),
    );
  });

  test.for(drawn)('%s draws an icon for every kind', (st) => {
    for (const k of ['phone', 'mail', 'web', 'linkedin', 'github', 'teams'])
      expect(iconFor(st, k, 16, th)).not.toBeNull();
  });

  test.for(ICON_WEIGHTS.filter((w) => w !== 'auto'))('the %s weight has a glyph for every kind but GitHub', (w) => {
    for (const k of [
      'phone',
      'office',
      'mail',
      'web',
      'location',
      'calendar',
      'hours',
      'languages',
      'org',
      'linkedin',
      'x',
      'youtube',
      'learn',
      'blog',
      'teams',
    ])
      expect(ICONS.glyph[`${k}-${w}`], `${k}-${w}`).toBeDefined();
    expect(iconFor('glyph', 'phone', 16, th, { weight: w }).icon).toBe(`phone-${w}`);
    expect(iconFor('glyph', 'github', 16, th, { weight: w }).icon).toBe('github');
  });

  test('colour modes recolour icons', () => {
    expect(iconFor('glyph', 'mail', 16, th, { color: 'neutral' })).toMatchObject({ color: '#616161' });
    expect(iconFor('glyph', 'linkedin', 16, th, { color: 'brand' }, true)).toMatchObject({ color: '#0A66C2' });
    expect(iconFor('ring', 'mail', 16, th, { color: 'neutral', onDark: true })).toMatchObject({ stroke: '#ADADAD' });
    const solid = iconFor('circle', 'linkedin', 16, th, { color: 'brand' }, true);
    expect(
      solid.kind === 'chip' && typeof solid.fill === 'string' && contrast(solid.fill, '#FFFFFF'),
    ).toBeGreaterThanOrEqual(4.5);
  });

  test("the design's own icons take a chosen weight and colour", () => {
    const specs: SpecMap = {
      ic_mail: { kind: 'glyph', icon: 'mail', size: 14, color: th.accent },
      so_linkedin: { kind: 'chip', icon: 'linkedin', size: 16, shape: 'circle', fill: th.accent, fg: '#FFFFFF' },
      so_x: { kind: 'glyph', icon: 'x', size: 14, color: '#FFFFFF', onPanel: true },
    };
    restyle(specs, { iconStyle: 'auto', iconWeight: 'line', iconColor: 'neutral' }, th);
    expect(specs.ic_mail).toMatchObject({ icon: 'mail-line', color: '#616161' });
    expect(specs.so_linkedin).toMatchObject({ icon: 'linkedin-line', fill: '#616161', fg: '#FFFFFF' });
    expect(specs.so_x).toMatchObject({ icon: 'x-line', color: '#FFFFFF' });
  });
});
