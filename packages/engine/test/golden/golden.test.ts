// Golden tests: the markup, plain text and metadata of every case in the matrix are kept in one
// readable snapshot file, __snapshots__/golden.test.ts.snap. A change to any design shows up as a
// reviewable diff. Update it on purpose with: pnpm --filter @signature-studio/engine test:golden -u
import { afterAll, beforeAll, expect, test } from 'vitest';
import { build, setOptimize, type BuildResult } from '../../src/index.ts';
import { buildMatrix, FIXTURE_PROFILE, testLogo, testPhoto } from '../fixtures.ts';

// Image sizes for text buttons come from measureText(), which depends on the fonts installed
// on the machine. A fixed width per character keeps the markup the same on every OS.
// Only `width` is measured; the other metrics are left out.
function measureText(this: CanvasRenderingContext2D, text: string): Pick<TextMetrics, 'width'> {
  const px = Number(/(\d+(?:\.\d+)?)px/.exec(this.font)?.[1] ?? 10);
  return { width: Array.from(text).length * px * 0.56 };
}

const canvas = CanvasRenderingContext2D.prototype;
const realMeasure = Object.getOwnPropertyDescriptor(canvas, 'measureText');

beforeAll(() => {
  Object.defineProperty(canvas, 'measureText', { value: measureText, configurable: true, writable: true });
});

afterAll(() => {
  if (realMeasure) Object.defineProperty(canvas, 'measureText', realMeasure);
});

/** Puts each tag on its own line so diffs point at the changed element. */
const lines = (html: string): string => html.replace(/></g, '>\n<');

/** Image bytes differ between platforms, so data URLs keep only their type. */
const stripData = (html: string): string => html.replace(/data:([a-z/+.-]+);base64,[A-Za-z0-9+/=]+/g, 'data:$1');

function render(name: string, r: BuildResult): string {
  const images = Object.values(r.images).map((i) => [i.name, i.kind, i.file, i.mime, i.animated]);
  return [
    `case: ${name}`,
    `meta: ${JSON.stringify({ cols: r.cols, replyStyle: r.replyStyle, surface: r.surface, darkSurface: r.darkSurface, onDark: r.onDark })}`,
    `images: ${JSON.stringify(images)}`,
    '',
    '== html (hosted) ==',
    lines(r.html('hosted', 'https://example.com/sig/')),
    '',
    '== html (dark preview) ==',
    lines(stripData(r.darkHtml())),
    '',
    '== text ==',
    r.text,
    '',
  ].join('\n');
}

test.for(buildMatrix())('$name', async (c) => {
  const [photo, logo] = await Promise.all([testPhoto(), testLogo()]);
  const caseState = structuredClone(c.state);
  const casePhoto = caseState['photo'];
  const state = {
    ...FIXTURE_PROFILE,
    ...caseState,
    photo: { src: photo, ...(typeof casePhoto === 'object' ? casePhoto : undefined) },
    logo: { src: logo },
  };
  const outs: string[] = [];
  try {
    for (const optimize of c.optimize ?? [true]) {
      setOptimize(optimize);
      // oxlint-disable-next-line no-await-in-loop -- the optimize switch is global, so each build must finish before the next
      outs.push(render(c.name, await build(structuredClone(state), c.opts)));
    }
  } finally {
    setOptimize(true);
  }
  // Every optimise mode must give the same markup, so all builds share one snapshot.
  for (const out of outs.slice(1)) expect(out).toBe(outs[0]);
  expect(outs[0]).toMatchSnapshot();
});
