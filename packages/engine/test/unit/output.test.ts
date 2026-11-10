// Static checks of the Outlook rules in docs/DEVELOPMENT.md, on every design in 1, 2 and 3 columns,
// new message and reply. The slower audits (phone fit, paste survival, contrast) are in test/audit.
import { beforeAll, describe, expect, test } from 'vitest';
import { byId } from '../../src/designs/index.ts';
import { card, defineDesign } from '../../src/designs/kit.ts';
import { build, FONT_OPTIONS, TEMPLATES, type BuildResult, type StateInput, type Version } from '../../src/index.ts';
import { withTypography } from '../../src/html.ts';
import { FIXTURE_PROFILE, motionOf, movingMs, testLogo, testPhoto } from '../fixtures.ts';

/* A design made with the kit's card and settings other than Classic's, so the rules cover new kit designs too. */
const KIT_SAMPLE = defineDesign({
  ...byId.classic,
  id: 'kit-sample',
  ...card({ photo: 88, shape: 'squircle', ring: true, nameSize: 18, gap: 18 }),
});
byId[KIT_SAMPLE.id] = KIT_SAMPLE;

describe('typography', () => {
  test('changes styles, never user text or image dimensions', () => {
    const html =
      '<div><span style="font-family:Arial;font-size:11px;line-height:16px;">font-family:keep me;</span><img alt="" width="40" height="40" style="width:40px;height:auto;"></div>';
    expect(withTypography(html, { font: 'auto', textSize: 'standard' })).toBe(html);
    const result = withTypography(html, { font: 'georgia', textSize: 'large' });
    expect(result).toContain('font-family:keep me;');
    expect(result).toContain('font-size: 13px');
    expect(result).toContain('line-height: 18px');
    expect(result).toContain('width="40" height="40"');
  });

  test.for(TEMPLATES)('$id applies every font to new messages and design replies', async (design) => {
    const versions: Version[] = ['new', 'reply'];
    const cases = FONT_OPTIONS.filter((f) => f.id !== 'auto').flatMap((font) =>
      versions.map((version) => ({ font, version })),
    );
    for (const { font, version } of cases) {
      // oxlint-disable-next-line no-await-in-loop -- builds share the render context
      const result = await build(
        {
          ...FIXTURE_PROFILE,
          template: design.id,
          font: font.id,
          textSize: 'large',
          replyStyle: 'design',
          show: { photo: false, animate: false },
        },
        { version },
      );
      for (const html of [result.html('embed'), result.darkHtml()]) {
        const template = document.createElement('template');
        template.innerHTML = html;
        const styles = [...template.content.querySelectorAll('[style]')]
          .filter((el): el is HTMLElement => el instanceof HTMLElement)
          .map((el) => el.style);
        const fonts = styles.filter((s) => s.fontFamily);
        expect(fonts.length, `${font.id} ${version}`).toBeGreaterThan(0);
        const expected = document.createElement('span');
        expected.style.fontFamily = font.stack;
        for (const style of fonts) expect(style.fontFamily).toBe(expected.style.fontFamily);
        for (const style of styles.filter((s) => Number.parseFloat(s.fontSize) >= 11))
          expect(Number.parseFloat(style.fontSize)).toBeGreaterThanOrEqual(13);
      }
    }
  });
});

const RICH = {
  pronouns: 'they/them',
  altName: 'سام تايلور',
  booking: 'outlook.office.com/bookwithme/user/sample',
  hours: 'Mon to Fri, 9:00 to 17:00',
  languages: 'English, Portuguese',
  banner: 'Meet us at the summit',
  bannerUrl: 'example.com/summit',
  disclaimer: 'This message may contain confidential information.',
  show: { booking: true, x: true, tagline: true, signoff: true, banner: true, disclaimer: true, logo: true },
};

const cases = [...TEMPLATES, KIT_SAMPLE].flatMap((d) =>
  ([1, 2, 3] as const).flatMap((cols) =>
    (['new', 'reply'] as const).map((version) => ({ name: `${d.id} ${cols} col ${version}`, id: d.id, cols, version })),
  ),
);

/** Every opening tag with its name and attributes. */
function tags(html: string): { name: string; attrs: string }[] {
  return [...html.matchAll(/<([a-z][a-z0-9]*)\b([^>]*)>/gi)].map((m) => ({
    name: (m[1] ?? '').toLowerCase(),
    attrs: m[2] ?? '',
  }));
}

let photo = '';
let logo = '';
beforeAll(async () => {
  [photo, logo] = await Promise.all([testPhoto(), testLogo()]);
});

describe.each(cases)('$name', ({ id, cols, version }) => {
  let r: BuildResult;
  let html = '';

  beforeAll(async () => {
    const state: StateInput = {
      ...FIXTURE_PROFILE,
      ...RICH,
      template: id,
      cols,
      nameStyle: cols === 2 ? 'hand' : 'typed',
      photo: { src: photo },
      logo: { src: logo },
    };
    r = await build(state, { version, ...(version === 'reply' ? { over: { replyStyle: 'design' } } : {}) });
    html = r.html('embed');
  });

  test('is wrapped for language and direction', () => {
    expect(html.startsWith('<div lang="en" dir="ltr"')).toBe(true);
    expect(html).toContain('text-size-adjust:100%');
  });

  test('uses only markup that Outlook keeps', () => {
    expect(html).not.toMatch(/<svg|<style|<script|<link|<!--|\sclass=/i);
    expect(html).not.toMatch(/display:\s*(flex|grid)|position:\s*(absolute|relative|fixed)/i);
  });

  test('floats only images', () => {
    const all = tags(html);
    for (const t of all.filter((x) => /float:\s*(left|right)/i.test(x.attrs)))
      expect(t.name, `float on ${t.attrs}`).toBe('img');
    for (const t of all.filter((x) => x.name === 'table')) expect(t.attrs, 'align on a table').not.toMatch(/\salign=/i);
  });

  test('gives every image alt text and a fixed size', () => {
    const imgs = tags(html).filter((t) => t.name === 'img');
    /* a new message always has images; a reply may have none */
    expect(imgs.length).toBeGreaterThanOrEqual(version === 'new' ? 1 : 0);
    for (const t of imgs) {
      expect(t.attrs, 'alt').toMatch(/\salt="/);
      expect(t.attrs, 'width').toMatch(/\swidth="\d+"/);
      expect(t.attrs, 'raster').toMatch(/src="data:image\/(png|gif|jpeg);base64,/);
    }
    for (const t of imgs.filter((x) => /\salt=""/.test(x.attrs)))
      expect(t.attrs, 'decorative role').toMatch(/role="presentation"/);
  });

  test('keeps text at 11 px or larger', () => {
    // Spacer cells use a 1 px font to stay thin, so measure only elements that hold visible text.
    const host = document.createElement('div');
    host.innerHTML = html;
    document.body.append(host);
    try {
      const walker = document.createTreeWalker(host, NodeFilter.SHOW_TEXT);
      for (let n = walker.nextNode(); n; n = walker.nextNode()) {
        const text = n.textContent?.trim();
        if (!text || !n.parentElement) continue;
        const size = parseFloat(getComputedStyle(n.parentElement).fontSize);
        expect(size, `font size of "${text}"`).toBeGreaterThanOrEqual(11);
      }
    } finally {
      host.remove();
    }
  });

  test('links only to web, email and phone addresses', () => {
    for (const m of html.matchAll(/href="([^"]*)"/g)) expect(m[1]).toMatch(/^(https?:|mailto:|tel:)/);
  });

  test('has no leftover placeholders', () => {
    const bad = /undefined|NaN|\[object Object\]|\{\{/;
    const at = (s: string): string | null => {
      const m = bad.exec(s.replace(/data:[^"]+/g, 'data:'));
      return m ? m.input.slice(Math.max(0, m.index - 80), m.index + 40) : null;
    };
    expect(at(html)).toBeNull();
    expect(at(r.text)).toBeNull();
  });

  test('stops every animation within 5 seconds, without frames that flicker on iPhone', () => {
    for (const img of Object.values(r.images)) {
      if (!img.animated) continue;
      const m = motionOf(img.dataURL);
      expect(m.plays, `${img.name} loops forever`).toBeGreaterThan(0);
      expect(movingMs(m), `${img.name} moves for too long`).toBeLessThanOrEqual(5000);
      expect(m.revertsToPrevious, `${img.name} uses dispose op 2`).toBe(false);
    }
  });
});

async function avatarSize(result: BuildResult) {
  const asset = result.images.photo ?? result.images.mono;
  if (!asset) return null;
  const markup = document.createElement('template');
  markup.innerHTML = result.html('hosted', 'https://example.com/sig/');
  const image = markup.content.querySelector<HTMLImageElement>(`img[src$="/${asset.file}"]`);
  if (!image) throw new Error(`Missing avatar markup for ${asset.file}`);
  const raster = new Image();
  raster.src = asset.dataURL;
  await raster.decode();
  const width = Number(image.getAttribute('width'));
  expect(image.getAttribute('height')).toBe(String(width));
  expect(image.style.width).toBe(`${width}px`);
  expect(image.style.minWidth).toBe(`${width}px`);
  expect(raster.naturalWidth).toBe(width * 2);
  expect(raster.naturalHeight).toBe(width * 2);
  return width;
}

const photoCases = [...TEMPLATES, KIT_SAMPLE].flatMap((d) =>
  ([1, 2, 3] as const).flatMap((cols) =>
    (['column', 'name'] as const).map((photoPos) => ({ id: d.id, cols, photoPos })),
  ),
);
const photoSizes = [
  { photoSize: 'S', scale: 0.85 },
  { photoSize: 'M', scale: 1 },
  { photoSize: 'L', scale: 1.2 },
  { photoSize: 'XL', scale: 1.4 },
] as const;

test.for(photoCases)(
  '$id cols$cols photo:$photoPos applies every photo size to markup and 2x rasters',
  async ({ id, cols, photoPos }) => {
    const state: StateInput = { ...FIXTURE_PROFILE, template: id, cols, photoPos, photo: { src: photo } };
    const base = await avatarSize(await build({ ...state, photoSize: 'M' }, { static: true }));
    expect(base === null, 'only Minimal is avatar-free').toBe(id === 'minimal');
    if (base === null) return;
    expect(base).toBeGreaterThan(0);
    for (const photoShape of ['auto', 'polaroid'] as const) {
      for (const { photoSize, scale } of photoSizes) {
        // oxlint-disable-next-line no-await-in-loop -- builds share per-render state
        const actual = await avatarSize(await build({ ...state, photoSize, photoShape }, { static: true }));
        expect(actual, `${photoShape} ${photoSize}`).toBe(
          Math.round(base * (scale * (photoShape === 'polaroid' ? 1.15 : 1))),
        );
      }
    }
  },
);

test.for(TEMPLATES)('$id keeps its design reply compact at every selected photo size', async ({ id }) => {
  const state: StateInput = { ...FIXTURE_PROFILE, template: id, cols: 3, replyStyle: 'design', photo: { src: photo } };
  const small = await build({ ...state, photoSize: 'S' }, { version: 'reply', static: true });
  const large = await build({ ...state, photoSize: 'XL' }, { version: 'reply', static: true });
  expect(large.html('hosted')).toBe(small.html('hosted'));
});

test.for(TEMPLATES)('$id does not resize its text when there is no visible avatar', async ({ id }) => {
  const state: StateInput = {
    ...FIXTURE_PROFILE,
    fullName: 'Alexandria Morgan Taylor',
    template: id,
    cols: 3,
    nameStyle: 'hand',
    show: { photo: id === 'minimal' },
  };
  const small = await build({ ...state, photoSize: 'S' }, { static: true });
  const large = await build({ ...state, photoSize: 'XL', photoShape: 'polaroid' }, { static: true });
  expect(large.html('hosted')).toBe(small.html('hosted'));
});

async function logoHtml(state: Record<string, unknown>): Promise<{ html: string; hasLogo: boolean }> {
  const r = await build({ ...FIXTURE_PROFILE, show: { logo: true, photo: false }, ...state });
  return { html: r.html('embed'), hasLogo: 'logo' in r.images };
}

describe('uploaded logo', () => {
  test('is left out when there is no logo, even with the switch on', async () => {
    const results = await Promise.all(['leader', 'executive', 'minimal'].map((template) => logoHtml({ template })));
    for (const r of results) expect(r.hasLogo).toBe(false);
  });

  test('is decoration when the company name follows it', async () => {
    const src = await testLogo();
    const r = await logoHtml({ template: 'leader', logo: { src } });
    expect(r.hasLogo).toBe(true);
    expect(r.html).toContain('>Contoso</span>');
    expect(r.html).toMatch(/<img[^>]*alt=""[^>]*role="presentation"/);
  });

  test('gets a name when no company name follows it', async () => {
    const src = await testLogo();
    const r = await logoHtml({ template: 'leader', company: '', logo: { src } });
    expect(r.html).toContain('alt="Company logo"');
    const m = await logoHtml({ template: 'minimal', logo: { src } });
    expect(m.html).toContain('alt="Contoso logo"');
  });

  test('follows the switch', async () => {
    const src = await testLogo();
    const r = await build({
      ...FIXTURE_PROFILE,
      template: 'executive',
      show: { logo: false, photo: false },
      logo: { src },
    });
    expect('logo' in r.images).toBe(false);
  });
});

test('a photo has useful alt text when the name is blank', async () => {
  const src = await testPhoto();
  const r = await build({
    ...FIXTURE_PROFILE,
    fullName: '',
    photo: { src },
    show: { photo: true, logo: false },
  });
  expect(r.html('embed')).toContain('alt="Profile photo"');
});

describe('design kit card', () => {
  test('uses its settings', async () => {
    const state: StateInput = { ...FIXTURE_PROFILE, template: KIT_SAMPLE.id, cols: 1, photo: { src: photo } };
    const html = (await build(state)).html('embed');
    expect(html).toMatch(/<img[^>]*width="88"[^>]*alt="Photo of /);
    expect(html).toContain('font-size:18px;line-height:25px');
  });
});
