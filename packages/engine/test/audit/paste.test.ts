// Paste survival: pasted on a desktop-wide message in Outlook for Mac (max-width dropped, images
// allowed to shrink) and RoosterJS (see keepAsOutlook() in helpers.ts), no photo or icon shrinks or loses its
// shape, and the signature does not grow too wide.
import { expect, test } from 'vitest';
import type { IconStyle, Version } from '../../src/index.ts';
import { ICON_FAMILY_OPTIONS } from '../../src/index.ts';
import {
  AUDIT_DESIGNS,
  buildAudit,
  imageProblems,
  inOrder,
  keepAsOutlook,
  NAME_STYLES,
  signatureWidth,
  withStage,
  type EditorMode,
} from './helpers.ts';

const WIDTH = 900;
const MODES: readonly EditorMode[] = ['mac', 'roost'];
const VERSIONS: readonly Version[] = ['new', 'reply'];
const ICONS: readonly IconStyle[] = ['auto', 'outline'];
const PHOTOS = [
  { photoSize: 'M', photoShape: 'auto' },
  { photoSize: 'XL', photoShape: 'auto' },
  { photoSize: 'XL', photoShape: 'polaroid' },
] as const;

let layouts = 0;

test.for(AUDIT_DESIGNS.map((d) => ({ id: d.id, theme: d.theme })))('$id', async ({ id, theme }) => {
  const problems: string[] = [];
  let mine = 0;
  const settings = ([1, 2, 3] as const).flatMap((cols) =>
    VERSIONS.flatMap((version) =>
      NAME_STYLES.flatMap((nameStyle) =>
        ICONS.flatMap((iconStyle) =>
          (version === 'new' ? PHOTOS : [PHOTOS[0]]).map((photo) => ({ cols, version, nameStyle, iconStyle, photo })),
        ),
      ),
    ),
  );
  await inOrder(settings, async ({ cols, version, nameStyle, iconStyle, photo }) => {
    const r = await buildAudit(
      {
        template: id,
        theme,
        cols,
        nameStyle,
        iconStyle,
        ...photo,
        hours: 'Sun to Thu, 9am to 5pm',
        show: { animate: false },
      },
      version,
    );
    const html = r.html('embed');
    await inOrder(MODES, (mode) =>
      withStage(keepAsOutlook(html, mode, { editorWidth: WIDTH }), WIDTH, ({ box, broken }) => {
        const bad = broken.map((b) => `image "${b}" does not decode`);
        bad.push(...imageProblems(box));
        const w = signatureWidth(box);
        if (w > (cols >= 2 ? 820 : 760)) bad.push(`wide ${w}px`);
        mine++;
        if (bad.length) {
          problems.push(
            `${id} cols${cols} ${version} ${nameStyle} icons:${iconStyle} ${photo.photoSize} ${photo.photoShape} ${mode} ${WIDTH}px: ${bad.join(' | ')}`,
          );
        }
      }),
    );
  });
  layouts += mine;
  expect(mine, 'layouts checked').toBeGreaterThan(0);
  expect(problems).toEqual([]);
});

test('checked at least one layout', async ({ annotate }) => {
  await annotate(`paste: ${layouts} layouts checked`);
  expect(layouts).toBeGreaterThan(0);
});

test.for(ICON_FAMILY_OPTIONS.filter((f) => f.id !== 'standard'))(
  '$label icons survive phone and desktop pastes in every design',
  async ({ id }) => {
    let checked = 0;
    const settings = AUDIT_DESIGNS.flatMap((design) =>
      VERSIONS.flatMap((version) => ([1, 2, 3] as const).map((cols) => ({ design, version, cols }))),
    );
    await inOrder(settings, async ({ design, version, cols }) => {
      const result = await buildAudit(
        {
          template: design.id,
          theme: design.theme,
          cols,
          iconFamily: id,
          iconStyle: 'glyph',
          iconWeight: 'duotone',
          show: { animate: false },
        },
        version,
      );
      await inOrder(
        [343, 680].flatMap((width) => MODES.map((mode) => ({ width, mode }))),
        ({ width, mode }) =>
          withStage(keepAsOutlook(result.html('embed'), mode, { editorWidth: width }), width, ({ box, broken }) => {
            const label = `${design.id} ${id} ${cols} ${version} ${mode} ${width}`;
            expect({ label, broken, images: imageProblems(box), fits: signatureWidth(box) <= width + 1 }).toEqual({
              label,
              broken: [],
              images: [],
              fits: true,
            });
            checked++;
          }),
      );
    });
    expect(checked).toBe(AUDIT_DESIGNS.length * 2 * 3 * 2 * MODES.length);
  },
);
