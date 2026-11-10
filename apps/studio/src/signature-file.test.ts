import { describe, expect, test } from 'vitest';
import { parse } from 'yaml';
import { DEFAULTS, STYLE_KEY_LIST, themeSettings, toState } from './engine.ts';
import type { SignatureState } from './engine.ts';
import { DETAIL_GROUPS, DETAIL_KEYS } from './fields.ts';
import { CULTURES, blankState, emptyDetails, randomSample, sampleState } from './sample.ts';
import {
  NEWER_SIGNATURE_FILE,
  NOT_A_SIGNATURE_FILE,
  readSignatureFile,
  saveSignature,
  signatureFileName,
  signatureYaml,
  wrapBase64,
} from './signature-file.ts';

const PHOTO = `data:image/jpeg;base64,/9j/${'A'.repeat(200)}`;
const LOGO = 'data:image/png;base64,iVBORw0KGgo=';
const base = toState({ ...DEFAULTS, fullName: 'Sam: Lee?', photo: { src: PHOTO, zoom: 1.4, dx: 10, dy: -5 } });
const now = new Date('2026-01-02T03:04:05Z');

function seeded(seed: number): () => number {
  let x = seed;
  return () => {
    x = (x * 1103515245 + 12345) % 2147483648;
    return x / 2147483648;
  };
}

function cur(state: SignatureState, optimize = true, activeStyleId: string | null = null) {
  return { state, optimize, activeStyleId };
}

describe('signature file', () => {
  test('saves the email profile separately from style and accepts older files without it', () => {
    const state = toState({ ...base, iconFamily: 'handdrawn' });
    const text = signatureYaml(cur(state), false, now);
    const saved = parse(text);
    expect(saved).toMatchObject({ emailProfile: 'outlook', style: { iconFamily: 'handdrawn' } });
    expect(saved.style).not.toHaveProperty('emailProfile');
    expect(saved.details).not.toHaveProperty('emailProfile');
    const opened = readSignatureFile(text, base);
    if (!opened.ok) throw new Error(opened.message);
    expect(opened.state).toMatchObject({ emailProfile: 'outlook', iconFamily: 'handdrawn' });
    const older = readSignatureFile('signature: 2\n', base);
    if (!older.ok) throw new Error(older.message);
    expect(older.state.emailProfile).toBe('outlook');
    expect(readSignatureFile('signature: 2\nemailProfile: unknown\n', base)).toMatchObject({
      ok: false,
      message: 'This email profile is not supported by this version of Signature Studio.',
    });
  });

  test('version 1 palette ids and custom colours migrate, then save only colour settings', () => {
    for (const [style, expected] of [
      ['theme: copilot', themeSettings('copilot')],
      ['theme: custom, customColors: ["#ffb900"]', { colors: ['#FFB900'], gradient: false }],
    ] as const) {
      const opened = readSignatureFile(`signature: 1\nstyle: {${style}}\n`, base);
      if (!opened.ok) throw new Error(opened.message);
      expect(opened.state).toMatchObject(expected);
      const saved = parse(signatureYaml(cur(opened.state), false, now));
      expect(saved).toMatchObject({ signature: 2, style: expected });
      expect(saved.style).not.toHaveProperty('theme');
      expect(saved.style).not.toHaveProperty('customColors');
    }
  });

  test('edited colours and solid mode round trip without a preset id', () => {
    const state = toState({ ...base, colors: ['#123456', '#FFB900'], gradient: false });
    const opened = readSignatureFile(signatureYaml(cur(state), true, now), toState({}));
    if (!opened.ok) throw new Error(opened.message);
    expect(opened.state).toEqual(state);
  });

  test('round trip keeps details, switches, style, images and options', () => {
    const state = toState({
      ...base,
      ...randomSample(seeded(7)),
      template: 'executive',
      cols: 3,
      iconStyle: 'glyph',
      font: 'georgia',
      textSize: 'large',
      handStyle: 'capitol',
      logo: { src: LOGO },
      show: { ...base.show, quote: false, logo: true },
      place: { ...base.place, quote: 'reply' },
    });
    const saved = saveSignature(cur(state, false, 'my-x'), true, now);
    const r = readSignatureFile(saved.text, toState({}), saved.fileName);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.state).toEqual(state);
    expect(r.optimize).toBe(false);
    expect(r.activeStyleId).toBe('my-x');
    expect(r.message).toBe(`Opened ${saved.fileName}: Executive.`);
  });

  test('writes readable groups with every key and wrapped base64', () => {
    const text = signatureYaml(cur(toState({ ...base, logo: { src: LOGO } })), true, now);
    expect(text.startsWith('# Signature Studio signature file.\n')).toBe(true);
    expect(text).toContain('\nsignature: 2\n');
    expect(text).toContain('\nsaved: 2026-01-02T03:04:05.000Z\n');
    expect(text).toContain('# Who you are\ndetails:\n');
    expect(text).toContain('    data: |-\n');
    const data: unknown = parse(text);
    expect(data).toMatchObject({
      signature: 2,
      details: { fullName: 'Sam: Lee?' },
      show: { photo: true },
      style: { template: base.template, optimize: true, place: base.place, hosting: base.hosting },
      images: { photo: { type: 'image/jpeg', zoom: 1.4, x: 10, y: -5 }, logo: { type: 'image/png' } },
    });
    const all = [...DETAIL_GROUPS.details, ...DETAIL_GROUPS.contact, ...DETAIL_GROUPS.extras];
    expect(all.toSorted()).toEqual([...DETAIL_KEYS].toSorted());
    for (const k of STYLE_KEY_LIST) expect(text).toMatch(new RegExp(`\\n  ${k}:`));
    expect(text).toMatch(/\n {2}motion: /);
    expect(text).toContain('  quoteBy: ""\n');
    const lines = text.split('\n').filter((l) => /^ {6}[A-Za-z0-9+/=]+$/.test(l));
    expect(lines.length).toBeGreaterThan(2);
    for (const l of lines) expect(l.trim().length).toBeLessThanOrEqual(76);
  });

  test('wraps base64 at 76 characters', () => {
    const b64 = 'x'.repeat(200);
    const wrapped = wrapBase64(b64);
    expect(wrapped.split('\n').map((l) => l.length)).toEqual([76, 76, 48]);
    expect(wrapped.replace(/\n/g, '')).toBe(b64);
    expect(wrapBase64('')).toBe('');
  });

  test('file names come from the name', () => {
    expect(signatureFileName({ fullName: 'Sam Taylor' })).toBe('sam-taylor.signature.yaml');
    expect(signatureFileName({ fullName: 'Zoë  O’Brien-Núñez' })).toBe('zoe-o-brien-nunez.signature.yaml');
    expect(signatureFileName({ fullName: ' :: ' })).toBe('signature.yaml');
    expect(signatureFileName({ fullName: '' })).toBe('signature.yaml');
  });

  test('save messages and leaving the photo out', () => {
    expect(saveSignature(cur(base), true, now).message).toBe('Saved sam-lee.signature.yaml, with your photo.');
    const without = saveSignature(cur(base), false, now);
    expect(without.message).toBe('Saved sam-lee.signature.yaml, without your photo.');
    expect(parse(without.text)).not.toHaveProperty('images.photo');
    const noPhoto = toState({ ...base, photo: { src: '' } });
    expect(saveSignature(cur(noPhoto), true, now).message).toBe('Saved sam-lee.signature.yaml.');
    const opened = readSignatureFile(without.text, toState({ photo: { src: 'data:image/png;base64,QUJD' } }), 'f.yaml');
    expect(opened.ok && opened.state.photo.src).toBe('data:image/png;base64,QUJD');
    expect(opened.message).toBe('Opened f.yaml: Aurora, keeping your current photo.');
  });

  test('a photo web address is dropped, so a file never loads anything', () => {
    const text = signatureYaml(cur(toState({ ...base, photo: { src: 'https://example.com/me.png' } })), true, now);
    expect(parse(text)).not.toHaveProperty('images.photo');
    expect(parse(text)).toMatchObject({ images: { logo: { src: '' } } });
    const opened = readSignatureFile('signature: 2\nimages:\n  photo: { src: "https://example.com/me.png" }\n', base);
    expect(opened.ok && opened.state.photo.src).toBe('');
  });

  test('a minimal hand-written file opens with defaults for the rest', () => {
    const r = readSignatureFile('signature: 1\ndetails: {fullName: X}\n', base);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.state.fullName).toBe('X');
    expect(r.state.title).toBe('');
    expect(r.state.template).toBe(DEFAULTS.template);
    expect(r.state.show).toEqual(DEFAULTS.show);
    expect(r.state.photo.src).toBe(PHOTO);
    expect(r).toMatchObject({ optimize: true, activeStyleId: null });
  });

  test('hand-edited base64 with spaces and no type still opens', () => {
    const text = [
      'signature: 1',
      'images:',
      '  photo:',
      '    data: |',
      '      /9j/AAAA',
      '      BBBB  ',
      '  logo:',
      '    type: image/jpg',
      '    data: iVBORw0K',
    ].join('\n');
    const r = readSignatureFile(text, base);
    expect(r.ok && r.state.photo.src).toBe('data:image/jpeg;base64,/9j/AAAABBBB');
    expect(r.ok && r.state.logo.src).toBe('data:image/jpeg;base64,iVBORw0K');
  });

  test('rejects files that are not signature files, old JSON configs and newer files', () => {
    for (const bad of [
      'nope',
      '[]',
      'a: [',
      'signature: null',
      'signature: 0',
      'signature: -1',
      'signature: 1.5',
      'signature: "2"',
      '{"app":"Other","state":{"template":"aurora"}}',
      '{"kind":"signature-config","state":{"template":"x"}}',
      JSON.stringify({ app: 'Signature Studio', kind: 'signature-config', version: 5, state: base }),
    ])
      expect(readSignatureFile(bad, base)).toEqual({ ok: false, message: NOT_A_SIGNATURE_FILE });
    expect(readSignatureFile('signature: 3\n', base)).toEqual({ ok: false, message: NEWER_SIGNATURE_FILE });
  });
});

describe('sample people', () => {
  test('a seeded sample is the same every time and plainly made up', () => {
    const a = randomSample(seeded(3));
    expect(randomSample(seeded(3))).toEqual(a);
    expect(Object.keys(a).toSorted()).toEqual([...DETAIL_KEYS].toSorted());
    expect(a.fullName).toMatch(/^\S+ \S+$/);
    expect(a.phone).toMatch(/^\+1 425 555 01\d\d$/);
    expect(a.email).toMatch(/^[a-z]+\.[a-z]+@[a-z]+\.com$/);
    expect(a.email?.endsWith(`@${a.website}`)).toBe(true);
    expect(a.linkedin).toBe('linkedin.com/in/sample');
    const filled = [
      'title',
      'team',
      'company',
      'region',
      'location',
      'tagline',
      'quote',
      'focus',
      'signoff',
      'feat1',
      'feat2',
      'stat1',
      'stat2',
      'stat3',
    ] as const;
    expect(filled.filter((k) => !a[k])).toEqual([]);
    expect(a.feat3).toBe('');
    expect(a.signoffName).toBe(a.fullName?.split(' ')[0]);
  });

  test('different seeds give different people', () => {
    const names = new Set(Array.from({ length: 12 }, (_, i) => randomSample(seeded(i + 1)).fullName));
    expect(names.size).toBeGreaterThan(6);
  });

  test('a sample person never mixes cultures or scripts', () => {
    for (let i = 1; i <= 200; i++) {
      const p = randomSample(seeded(i));
      const [first = '', last = ''] = (p.fullName ?? '').split(' ');
      const culture = CULTURES.find((c) => c.first.includes(first));
      expect(culture?.last).toContain(last);
      expect(culture?.places.map(([region, location]) => `${region}|${location}`)).toContain(
        `${p.region}|${p.location}`,
      );
      expect(p.altName).toBe('');
    }
  });

  test('every culture has names without spaces or hyphens, so the email stays simple', () => {
    for (const c of CULTURES) {
      expect(c.places.length).toBeGreaterThan(0);
      for (const name of [...c.first, ...c.last]) expect(name).toMatch(/^[A-Z][a-z]+$/);
    }
  });

  test('a sample starts from the default settings with a made-up person', () => {
    const s = sampleState(seeded(5));
    expect(s.fullName).toBe(randomSample(seeded(5)).fullName);
    expect({ ...s, ...emptyDetails() }).toEqual(toState({ ...DEFAULTS, ...emptyDetails() }));
    expect(s.photo.src).toBe('');
    expect(s.show.photo).toBe(true);
    expect(toState(s)).toEqual(s);
  });

  test('a blank signature has the default settings, no details, no photo and no logo', () => {
    const s = blankState();
    expect(s).toMatchObject({
      ...emptyDetails(),
      template: DEFAULTS.template,
      cols: DEFAULTS.cols,
      colors: DEFAULTS.colors,
      gradient: DEFAULTS.gradient,
    });
    expect(s.photo.src).toBe('');
    expect(s.logo.src).toBe('');
    expect(s.show.photo).toBe(false);
    expect(s.show.logo).toBe(false);
    expect(s.show.email).toBe(DEFAULTS.show.email);
  });
});
