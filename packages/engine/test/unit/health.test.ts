import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { checkSignatureHealth, CLIENT_PROFILES, COMPATIBILITY_REVIEWED } from '../../src/check.ts';
import { build, handLicense, handStyles, TEMPLATES } from '../../src/index.ts';
import type { BuildResult, StateInput } from '../../src/index.ts';
import { FIXTURE_PROFILE, motionOf, movingMs } from '../fixtures.ts';

let stage: HTMLDivElement;
beforeEach(() => {
  stage = document.createElement('div');
  stage.style.cssText = 'position:absolute;left:-10000px;top:0;width:680px;visibility:hidden';
  document.body.append(stage);
});
afterEach(() => stage.remove());

async function pair(state: StateInput = {}): Promise<BuildResult[]> {
  const input = { ...FIXTURE_PROFILE, ...state };
  const first = await build(input);
  const reply = await build(input, { version: 'reply' });
  return [first, reply];
}

describe('signature health', () => {
  test('checks both versions, cleans its stage and keeps real-client testing manual', async () => {
    const report = await checkSignatureHealth(await pair(), stage);
    expect(report.versions.map((v) => v.version)).toEqual(['new', 'reply']);
    expect(report.versions.map((v) => v.items.length)).toEqual([19, 19]);
    expect(report.versions.flatMap((v) => v.items.filter((i) => i.status === 'warning'))).toEqual([]);
    expect(report.summary).toBe('All automated checks pass');
    for (const version of report.versions) expect(version.items.find((i) => i.id === 'native')?.status).toBe('manual');
    expect(stage.shadowRoot?.childElementCount).toBe(0);
    expect(CLIENT_PROFILES).toHaveLength(4);
    expect(COMPATIBILITY_REVIEWED).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  test('requires matching new and reply builds', async () => {
    const results = await pair();
    await expect(checkSignatureHealth(results.slice(0, 1), stage)).rejects.toThrow('both');
    const other = await build({ ...FIXTURE_PROFILE, font: 'georgia' }, { version: 'reply' });
    await expect(checkSignatureHealth([results[0], other], stage)).rejects.toThrow('same signature');
  });

  test('reports blank identity and malformed contact links without flagging empty optional fields', async () => {
    const report = await checkSignatureHealth(
      await pair({ fullName: '', email: 'not-an-email', location: '', website: '' }),
      stage,
    );
    for (const version of report.versions) {
      expect(version.items.find((i) => i.id === 'identity')?.status).toBe('warning');
      expect(version.items.find((i) => i.id === 'destinations')?.status).toBe('warning');
      expect(version.features.find((f) => f.id === 'website')?.status).toBe('na');
    }
  });

  test('detects bad contrast, small text, missing fallbacks and actual phone overflow', async () => {
    const results = await pair();
    const first = results[0];
    const extra = '<div style="width:800px;font:9px Arial;color:rgba(0,0,0,.1);background:white">Unreadable text</div>';
    results[0] = { ...first, html: () => first.html('embed') + extra };
    const report = await checkSignatureHealth(results, stage);
    for (const id of ['text-size', 'contrast', 'font-fallback', 'phone', 'paste']) {
      expect(report.versions[0].items.find((i) => i.id === id)).toMatchObject({ id, status: 'warning' });
    }
  });

  test('detects missing alt text, malformed rasters and unresolved image tokens', async () => {
    const results = await pair();
    const first = results[0];
    results[0] = {
      ...first,
      html: () => first.html('embed') + '<img src="data:image/png;base64,AAAA" width="30" height="30">{{img:missing}}',
    };
    const report = await checkSignatureHealth(results, stage);
    for (const id of ['images', 'pixel-size', 'integrity'])
      expect(report.versions[0].items.find((i) => i.id === id)).toMatchObject({ id, status: 'warning' });
  });

  test('checks actual animation bytes rather than the selected motion label', async () => {
    const results = await pair({ motion: 'loop', photoAnim: 'spin' });
    for (const result of results) result.state.motion = 'brief';
    const report = await checkSignatureHealth(results, stage);
    expect(report.versions[0].items.find((i) => i.id === 'motion')?.status).toBe('warning');
    expect(report.versions[0].items.find((i) => i.id === 'motion')?.text).toContain('loops without stopping');
  });

  test('warns for unsupported handwriting and invalid hosted-image configuration', async () => {
    const report = await checkSignatureHealth(
      await pair({
        fullName: 'Sam 日本',
        nameStyle: 'hand',
        hosting: { mode: 'hosted', base: 'http://example.com' },
      }),
      stage,
    );
    expect(report.versions[0].items.find((i) => i.id === 'handwriting')?.status).toBe('warning');
    expect(report.versions[0].items.find((i) => i.id === 'delivery')?.status).toBe('warning');
  });

  test('measures the actual embedded HTML against the 400000-byte budget', async () => {
    const results = await pair({ show: { animate: false } });
    const first = results[0];
    const html = first.html('embed');
    const bytes = new TextEncoder().encode(html).byteLength;
    for (const limit of [400000, 400001]) {
      results[0] = { ...first, html: () => html + ' '.repeat(limit - bytes) };
      // oxlint-disable-next-line no-await-in-loop -- both measurements use the same stage
      const report = await checkSignatureHealth(results, stage);
      expect(report.versions[0].items.find((i) => i.id === 'size')?.status).toBe(limit === 400000 ? 'pass' : 'warning');
    }
  });

  test('cancellation never leaves a measurement stage populated', async () => {
    const results = await pair();
    const controller = new AbortController();
    controller.abort();
    await expect(checkSignatureHealth(results, stage, controller.signal)).rejects.toMatchObject({ name: 'AbortError' });
    expect(stage.shadowRoot?.childElementCount ?? 0).toBe(0);
  });

  test.for(TEMPLATES)(
    '$id passes output, image, typography and layout checks for its default settings',
    async (design) => {
      const report = await checkSignatureHealth(await pair({ template: design.id, show: { animate: false } }), stage);
      const required = new Set([
        'integrity',
        'images',
        'pixel-size',
        'font-fallback',
        'phone',
        'paste',
        'contrast',
        'motion',
      ]);
      const warnings = report.versions.flatMap((v) =>
        v.items
          .filter((i) => required.has(i.id) && i.status === 'warning')
          .map((i) => `${v.version} ${i.id}: ${i.text}`),
      );
      expect(warnings).toEqual([]);
    },
  );
});

describe('licensed handwriting styles', () => {
  test('ships the full OFL terms and all source-font attributions offline', () => {
    expect(handLicense).toContain('SIL OPEN FONT LICENSE Version 1.1');
    expect(handLicense).toContain('DISCLAIMER');
    for (const style of handStyles()) expect(handLicense).toContain(style.from);
  });
  test.for(handStyles().flatMap((style) => [false, true].map((animate) => ({ id: style.id, animate }))))(
    '$id animate=$animate renders a decodable name with a useful alt and bounded motion',
    async (style) => {
      const result = await build({
        ...FIXTURE_PROFILE,
        template: 'classic',
        nameStyle: 'hand',
        handStyle: style.id,
        show: { animate: style.animate },
      });
      const name = Object.values(result.images).find((im) => im.kind === 'hand');
      expect(name).toBeDefined();
      if (!name) throw new Error(`Missing handwriting: ${style.id}`);
      const image = new Image();
      image.src = name.dataURL;
      await image.decode();
      expect(image.naturalWidth).toBeGreaterThan(20);
      expect(result.html('embed')).toContain('alt="Sam Taylor"');
      expect(name.animated).toBe(style.animate);
      const motion = motionOf(name.dataURL);
      expect(motion.frames > 1).toBe(style.animate);
      expect(movingMs(motion)).toBeLessThanOrEqual(5000);
      expect(motion.plays).toBe(1);
      expect(motion.revertsToPrevious).toBe(false);
    },
  );
});
