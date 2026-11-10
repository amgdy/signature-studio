import { describe, expect, test, vi } from 'vitest';
import { DEFAULTS, DESIGNS, activeTheme, themeSettings, toState } from './engine.ts';
import {
  BUILT_IN_STYLES,
  applyStyle,
  countText,
  entryState,
  exportStyles,
  filterEntries,
  galleryEntries,
  importStyles,
  isActiveEntry,
  newStyle,
  pickedEntries,
  presetState,
  readStylesFile,
  sanitizeSaved,
  shuffleState,
  styleOf,
} from './styles.ts';

const base = toState(DEFAULTS);

function seeded(seed: number): () => number {
  let x = seed;
  return () => {
    x = (x * 1103515245 + 12345) % 2147483648;
    return x / 2147483648;
  };
}

describe('styles', () => {
  test('saved styles keep edited colours and gradient settings through export and import', () => {
    const state = toState({
      ...base,
      colors: ['#123456', '#FFB900'],
      gradient: false,
      font: 'georgia',
      textSize: 'large',
      iconFamily: 'geometric',
    });
    const saved = newStyle(state, 'Edited colours', 0);
    const imported = importStyles(exportStyles([saved]), []);
    if (!imported.ok) throw new Error(imported.message);
    const style = imported.styles[0];
    if (!style) throw new Error('Missing imported style');
    expect(applyStyle(base, style.s)).toEqual(state);
    expect(style.s).not.toHaveProperty('theme');
    expect(style.s).not.toHaveProperty('emailProfile');
  });

  test('styleOf carries the look and three switches, never details', () => {
    const s = styleOf({ ...base, template: 'executive', cols: 3 });
    expect(s.template).toBe('executive');
    expect(s.cols).toBe(3);
    expect(Object.keys(s.show ?? {}).toSorted()).toEqual(['animate', 'flourish', 'logo']);
    expect('fullName' in s).toBe(false);
  });

  test('applyStyle changes the look and keeps details', () => {
    const next = applyStyle({ ...base, fullName: 'Sam' }, { template: 'executive', cols: 3, show: { logo: false } });
    expect(next.template).toBe('executive');
    expect(next.cols).toBe(3);
    expect(next.show.logo).toBe(false);
    expect(next.fullName).toBe('Sam');
  });

  test('styles never carry the photo or logo, and applying one keeps them', () => {
    const logo = 'data:image/png;base64,iVBORw0KGgo=';
    const mine = toState({ ...base, logo: { src: logo }, photo: { ...base.photo, src: 'data:image/jpeg;base64,AAA' } });
    const s = styleOf(mine);
    expect('logo' in s).toBe(false);
    expect('photo' in s).toBe(false);
    expect(JSON.stringify(s)).not.toContain('base64');
    const next = applyStyle(mine, { ...s, template: 'aurora' });
    expect(next.logo.src).toBe(logo);
    expect(next.photo.src).toBe(mine.photo.src);
    const sanitized = sanitizeSaved([{ id: 'my-1', name: 'x', s: { template: 'aurora', logo: { src: logo } } }]);
    expect(JSON.stringify(sanitized)).not.toContain('base64');
  });

  test('built-in styles have unique ids and use known designs and palettes', () => {
    expect(BUILT_IN_STYLES.length).toBeGreaterThan(10);
    expect(new Set(BUILT_IN_STYLES.map((p) => p.id)).size).toBe(BUILT_IN_STYLES.length);
    const wrong = BUILT_IN_STYLES.filter(
      (p) =>
        !/^p-[a-z0-9-]+$/.test(p.id) ||
        !p.tag ||
        !DESIGNS.some((d) => d.id === p.s.template) ||
        activeTheme(toState(p.s)).id === 'custom',
    );
    expect(wrong.map((p) => p.id || p.name)).toEqual([]);
  });

  test('presetState resets what a preset does not name', () => {
    const p = BUILT_IN_STYLES[0];
    if (!p) throw new Error('no presets');
    expect(presetState(p).template).toBe(p.s.template);
    expect(presetState({ s: { template: 'aurora' } })).toMatchObject({
      cols: 'auto',
      iconStyle: 'auto',
      photoShape: 'auto',
      photoLook: 'natural',
      photoAnim: 'auto',
      photoSize: 'M',
      bgMode: 'transparent',
      template: 'aurora',
    });
  });

  test('gallery entries and filters', () => {
    const saved = [{ id: 'my-1', name: 'Mine', s: { template: 'aurora' } }];
    const all = galleryEntries(saved);
    expect(filterEntries(all, 'all')).toHaveLength(DESIGNS.length);
    expect(filterEntries(all, 'presets')).toHaveLength(BUILT_IN_STYLES.length);
    const mine = filterEntries(all, 'mine');
    expect(mine).toHaveLength(1);
    expect(mine[0]).toMatchObject({ badge: 'Mine', blurb: 'Your saved style' });
    expect(mine[0]?.tag).toMatch(/ · your style$/);
    expect(filterEntries(all, 'github').every((e) => e.cats.includes('github'))).toBe(true);
    expect(countText(3, 'all')).toBe('3 of 36 designs');
    expect(countText(3, 'presets')).toBe('3 styles');
    expect(countText(3, 'mine')).toBe('3 saved');
  });

  test('picked entries span designs, built-in styles and my styles, in gallery order', () => {
    const saved = [{ id: 'my-1', name: 'Mine', s: { template: 'aurora' } }];
    const all = galleryEntries(saved);
    const preset = BUILT_IN_STYLES[1]?.id ?? '';
    const picked = pickedEntries(all, ['my-1', 'executive', preset, 'gone']);
    expect(picked.map((e) => e.kind).toSorted()).toEqual(['mine', 'preset', 'tpl']);
    expect(picked.map((e) => all.indexOf(e))).toEqual(picked.map((e) => all.indexOf(e)).toSorted((a, b) => a - b));
    expect(pickedEntries(all, [])).toEqual([]);
  });

  test('active entry and thumbnail state', () => {
    const all = galleryEntries([]);
    const tpl = all.find((e) => e.kind === 'tpl' && e.id === base.template);
    if (!tpl) throw new Error('missing');
    expect(isActiveEntry(tpl, base, null)).toBe(true);
    expect(isActiveEntry(tpl, base, 'preset-x')).toBe(false);
    expect(activeTheme(entryState(tpl, { ...base, ...themeSettings('ocean') }, null)).id).toBe('ocean');
    const other = all.find((e) => e.kind === 'tpl' && e.id !== base.template);
    if (!other || other.kind !== 'tpl') throw new Error('missing');
    expect(activeTheme(entryState(other, base, null)).id).toBe(other.design.theme);
  });

  test('newStyle names and ids', () => {
    const now = new Date(1_700_000_000_000);
    const s = newStyle(base, '  ', 2, now);
    expect(s.id).toBe(`my-${now.getTime().toString(36)}`);
    expect(s.name).toMatch(/ style 3$/);
    expect(newStyle(base, 'x'.repeat(60), 0, now).name).toHaveLength(40);
  });

  test('export and import round trip, skipping duplicates and unknown designs', () => {
    const saved = [{ id: 'my-1', name: 'One', s: styleOf(base) }];
    const text = exportStyles(saved);
    expect(text).toMatch(/^# Signature Studio styles file\./);
    expect(text).toContain('signature-styles: 2\nstyles:\n  - name: One\n    template: ');
    expect(readStylesFile(text)).toEqual([{ id: '', name: 'One', tag: '', s: styleOf(base) }]);
    expect(importStyles(text, saved)).toMatchObject({ ok: true, added: 0, message: 'No new styles in that file.' });
    const fresh = importStyles(
      [
        'signature-styles: 1',
        'styles:',
        '  - name: Two',
        '    template: executive',
        '    bgColor: "#0B1F3A"',
        '    show: { logo: false }',
        '  - name: Bad',
        '    template: nope',
        '  - template: aurora',
      ].join('\n'),
      saved,
    );
    expect(fresh).toMatchObject({ ok: true, added: 1, message: 'Imported 1 style.' });
    expect(fresh.ok && fresh.styles[1]?.s).toEqual({
      template: 'executive',
      bgColor: '#0B1F3A',
      show: { logo: false },
    });
  });

  test('import rejects anything that is not a styles file', () => {
    const saved = [{ id: 'my-1', name: 'One', s: styleOf(base) }];
    const notStyles = { ok: false, message: 'That file is not a Signature Studio styles file.' };
    expect(importStyles('x: 1', saved)).toEqual(notStyles);
    expect(importStyles('signature-styles: 3\nstyles: []', saved)).toEqual(notStyles);
    expect(importStyles('{"app":"Signature Studio","version":1,"styles":[]}', saved)).toEqual(notStyles);
    expect(importStyles('[unclosed', saved)).toEqual(notStyles);
  });

  test('sanitizeSaved keeps only real styles', () => {
    expect(sanitizeSaved([{ id: 'a', name: 'A', s: { template: 'aurora', fullName: 'x' } }, { id: 'b' }, 3])).toEqual([
      { id: 'a', name: 'A', s: { template: 'aurora' } },
    ]);
    expect(sanitizeSaved('nope')).toEqual([]);
  });
});

describe('shuffle', () => {
  test('gives a valid state and keeps details', () => {
    const start = toState({ ...DEFAULTS, fullName: 'Sam' });
    for (let i = 0; i < 50; i++) {
      const { state, design } = shuffleState(start, seeded(i + 1));
      expect(state.fullName).toBe('Sam');
      expect(state.template).toBe(design.id);
      expect(state.photoAnim).not.toBe('none');
      expect(toState(state)).toEqual(state);
    }
  });

  test('uses the injected random source', () => {
    const { state } = shuffleState(toState(DEFAULTS), () => 0);
    expect(state.template).toBe(DESIGNS[0]?.id);
    expect(state.cols).toBe('auto');
    expect(state.nameStyle).toBe('hand');
    expect(state.bgMode).toBe('transparent');
  });
});

describe('compare picks in the view store', () => {
  test('toggle, prune, clear and keep only clean picks', async () => {
    const data = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => data.get(k) ?? null,
      setItem: (k: string, v: string) => void data.set(k, v),
      removeItem: (k: string) => void data.delete(k),
    });
    const { MAX_PICKS, UI_KEY, useUiStore } = await import('./store.ts');
    const ui = useUiStore.getState();
    ui.togglePick('executive');
    ui.togglePick('my-1');
    ui.togglePick('executive');
    ui.togglePick('aurora');
    expect(useUiStore.getState().picks).toEqual(['my-1', 'aurora']);
    expect(JSON.parse(data.get(UI_KEY) ?? '{}').state.picks).toEqual(['my-1', 'aurora']);
    ui.unpick('my-1');
    expect(useUiStore.getState().picks).toEqual(['aurora']);
    ui.setCompareShowAll(true);
    ui.clearPicks();
    expect(useUiStore.getState()).toMatchObject({ picks: [], compareShowAll: false });
    for (let i = 0; i < MAX_PICKS + 5; i++) ui.togglePick(`x${i}`);
    expect(useUiStore.getState().picks).toHaveLength(MAX_PICKS);

    data.set(UI_KEY, JSON.stringify({ state: { picks: ['a', 'a', 3, '', 'b'] }, version: 0 }));
    await useUiStore.persist.rehydrate();
    expect(useUiStore.getState().picks).toEqual(['a', 'b']);
    expect(useUiStore.getState()).toMatchObject({ appTheme: 'auto' });
    ui.setAppTheme('dark');
    expect(JSON.parse(data.get(UI_KEY) ?? '{}').state).toMatchObject({ appTheme: 'dark' });
    await useUiStore.persist.rehydrate();
    expect(useUiStore.getState()).toMatchObject({ appTheme: 'dark' });
    // Older versions also saved an app theme. It is ignored and never saved again.
    data.set(
      UI_KEY,
      JSON.stringify({ state: { pane: 'name', appTheme: 'invalid', uiTheme: 'maia', dark: true }, version: 0 }),
    );
    await useUiStore.persist.rehydrate();
    expect(useUiStore.getState()).toMatchObject({ pane: 'name', appTheme: 'auto', dark: true });
    expect(useUiStore.getState()).not.toHaveProperty('uiTheme');
    ui.setAppTheme('light');
    expect(JSON.parse(data.get(UI_KEY) ?? '{}').state).not.toHaveProperty('uiTheme');
    vi.unstubAllGlobals();
  });
});
