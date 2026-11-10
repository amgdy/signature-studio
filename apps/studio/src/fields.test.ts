import { describe, expect, test } from 'vitest';
import { DEFAULTS, DESIGNS, toState } from './engine.ts';
import {
  LOGO_MAX,
  PHOTO_MAX,
  PhotoError,
  animationNote,
  backgroundNote,
  columnsNote,
  fitWithin,
  hostingMode,
  kb,
  nameMode,
  nameNote,
  photoSizeNote,
  plural,
  readLogo,
  readPhoto,
  readoutParts,
  themeHint,
} from './fields.ts';

const base = toState(DEFAULTS);

describe('notes', () => {
  test('columns', () => {
    expect(columnsNote({ ...base, cols: 'auto' })).toMatch(
      /^Auto uses each template’s own layout \(.+: [12] columns?\)/,
    );
    expect(columnsNote({ ...base, cols: 1 })).toMatch(/^Everything in one column/);
  });

  test('photo size mentions polaroid', () => {
    const note = photoSizeNote({ ...base, photoSize: 'XL', photoShape: 'polaroid' });
    expect(note).toContain('40% larger');
    expect(note).toContain('Polaroid');
  });

  test('animation', () => {
    expect(animationNote({ ...base, show: { ...base.show, animate: false } })).toBe(
      'Animations are off, so photos stay still.',
    );
    expect(animationNote({ ...base, photoShape: 'polaroid', photoAnim: 'auto' })).toBe(
      'Polaroid photos use the Shine animation.',
    );
  });

  test('name modes', () => {
    const forced = DESIGNS.find((d) => d.handAlways)?.id ?? 'handwritten';
    expect(nameMode({ ...base, template: forced })).toBe('forced');
    expect(nameMode({ ...base, nameStyle: 'typed' })).toBe('typed');
    expect(nameMode({ ...base, template: 'aurora', nameStyle: 'hand', fullName: 'Sam' })).toBe('hand');
    expect(nameMode({ ...base, template: 'aurora', nameStyle: 'hand', fullName: '名前' })).toBe('unsupported');
    expect(nameNote({ ...base, template: 'aurora', nameStyle: 'typed' })).toMatch(/default font/);
    expect(nameNote({ ...base, template: 'aurora', nameStyle: 'typed', font: 'georgia' })).toMatch(/Georgia fallback/);
  });

  test('background', () => {
    expect(backgroundNote({ ...base, bgMode: 'transparent' }).warn).toBe(false);
    expect(backgroundNote({ ...base, bgMode: 'solid', bgColor: '#808080' })).toMatchObject({ warn: true });
    expect(backgroundNote({ ...base, bgMode: 'solid', bgColor: '#0B1F3A' }).text).toMatch(/switch to light colours/);
    expect(backgroundNote({ ...base, bgMode: 'solid', bgColor: '#FFFFFF' }).text).toMatch(/darkens it automatically/);
  });

  test('theme hint', () => {
    expect(themeHint({ ...base, template: 'aurora' })).toMatch(/^Suggested for Aurora: /);
  });
});

describe('format', () => {
  test('sizes and counts', () => {
    expect(kb(512)).toBe('512 B');
    expect(kb(2048)).toBe('2.0 KB');
    expect(kb(40960)).toBe('40 KB');
    expect(plural(1, 'image')).toBe('1 image');
    expect(plural(2, 'image')).toBe('2 images');
  });

  test('hosting mode needs a base URL', () => {
    expect(hostingMode({ hosting: { mode: 'hosted', base: ' ' } })).toBe('embed');
    expect(hostingMode({ hosting: { mode: 'hosted', base: 'https://x/' } })).toBe('hosted');
  });
});

describe('accessibility read-out', () => {
  const show = { altName: true } as const;

  test('counts described and decorative images', () => {
    const html = '<img src="a" alt="Photo of Sam"><img src="b" alt="" role="presentation"><img src="c" alt="LinkedIn">';
    expect(readoutParts({ html, animated: 0, cols: 1, state: { motion: 'brief', altName: '', show } })).toEqual([
      '3 images with alt text (2 described, 1 marked as decoration)',
      'no animation',
      'tagged as English',
      '1 column',
      'Open Check for measured contrast, phone fit and compatibility',
    ]);
  });

  test('motion, Arabic name and columns', () => {
    const one = { html: '<img src="a" alt="x">', cols: 3 as const };
    const brief = readoutParts({ ...one, animated: 2, state: { motion: 'brief', altName: 'سام', show } });
    expect(brief[0]).toBe('1 image with alt text (1 described, 0 marked as decoration)');
    expect(brief[1]).toBe('2 animated, brief motion selected');
    expect(brief[2]).toBe('tagged as English, Arabic name right-to-left');
    expect(brief[3]).toBe('3 columns');
    const loop = readoutParts({ ...one, animated: 1, state: { motion: 'loop', altName: '', show } });
    expect(loop[1]).toBe('1 animated, looping selected');
  });
});

describe('image files', () => {
  test('fitWithin scales down to the longest side and never up', () => {
    expect(fitWithin(512, 256, LOGO_MAX)).toEqual({ w: 128, h: 64 });
    expect(fitWithin(300, 900, LOGO_MAX)).toEqual({ w: 43, h: 128 });
    expect(fitWithin(64, 32, LOGO_MAX)).toEqual({ w: 64, h: 32 });
    expect(fitWithin(1800, 1200, PHOTO_MAX)).toEqual({ w: 900, h: 600 });
    expect(fitWithin(0, 0, LOGO_MAX)).toEqual({ w: 1, h: 1 });
  });

  test('rejects files that are not the right kind of image', async () => {
    const svg = new File(['<svg/>'], 'logo.svg', { type: 'image/svg+xml' });
    await expect(readLogo(svg)).rejects.toThrow('Please choose a PNG, JPEG, GIF or WebP image.');
    await expect(readLogo(svg)).rejects.toBeInstanceOf(PhotoError);
    const text = new File(['hi'], 'a.txt', { type: 'text/plain' });
    await expect(readPhoto(text)).rejects.toThrow('Please choose an image file.');
  });
});
