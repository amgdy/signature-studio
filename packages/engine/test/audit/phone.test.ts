// Phone fit: as Outlook keeps it, nothing may spill past the right edge of a phone screen.
import { describe, expect, test } from 'vitest';
import { FONT_OPTIONS } from '../../src/index.ts';
import type {
  FontChoice,
  IconStyle,
  PhotoPosition,
  PhotoShape,
  PhotoSize,
  ReplyStyle,
  TextSize,
  Version,
} from '../../src/index.ts';
import {
  AUDIT_DESIGNS,
  buildAudit,
  FULL_FIELDS,
  FULL_SHOW,
  imageProblems,
  inOrder,
  keepAsOutlook,
  NAME_STYLES,
  overflowOf,
  withStage,
  type EditorMode,
} from './helpers.ts';

interface PhoneSuite {
  name: string;
  cols: readonly (1 | 2 | 3)[];
  version: Version;
  icons: readonly IconStyle[];
  widths: readonly number[];
  replyStyle?: ReplyStyle;
  photoSize?: PhotoSize;
  photoShape?: PhotoShape;
  photoPositions?: readonly PhotoPosition[];
  font?: FontChoice;
  textSize?: TextSize;
}

/** The preview as written, and what RoosterJS keeps (images at full size, so a wide image counts). */
const MODES: readonly EditorMode[] = ['css', 'outlook'];
const REPLIES: readonly ReplyStyle[] = ['line', 'two', 'bar', 'card', 'name', 'design'];

const SUITES: readonly PhoneSuite[] = [
  {
    name: 'phone',
    cols: [1, 2, 3],
    version: 'new',
    icons: ['auto', 'labels', 'glyph'],
    widths: [343, 358, 398, 564, 680],
  },
  ...REPLIES.map((replyStyle): PhoneSuite => ({
    name: `phone-reply ${replyStyle}`,
    cols: [1, 2],
    version: 'reply',
    icons: ['auto', 'labels'],
    widths: [343, 398],
    replyStyle,
  })),
  {
    name: 'phone-photo XL',
    cols: [1, 2, 3],
    version: 'new',
    icons: ['auto'],
    widths: [343, 398],
    photoSize: 'XL',
    photoPositions: ['column', 'name'],
  },
  {
    name: 'phone-photo L polaroid',
    cols: [1, 2, 3],
    version: 'new',
    icons: ['auto'],
    widths: [343],
    photoSize: 'L',
    photoShape: 'polaroid',
    photoPositions: ['column', 'name'],
  },
  {
    name: 'phone-photo XL polaroid',
    cols: [1, 2, 3],
    version: 'new',
    icons: ['auto'],
    widths: [343, 398],
    photoSize: 'XL',
    photoShape: 'polaroid',
    photoPositions: ['column', 'name'],
  },
  { name: 'phone-icons', cols: [2, 3], version: 'new', icons: ['fluent', 'circle', 'ring', 'brand'], widths: [343] },
  ...FONT_OPTIONS.map((font): PhoneSuite => ({
    name: `phone-font ${font.label}`,
    cols: [1, 2, 3],
    version: 'new',
    icons: ['auto'],
    widths: [343],
    font: font.id,
    textSize: 'large',
  })),
];

const designs = AUDIT_DESIGNS.map((d) => ({ id: d.id, theme: d.theme }));

describe.for(SUITES)('$name', (suite) => {
  let checked = 0;
  const extra = [
    suite.replyStyle && `reply:${suite.replyStyle}`,
    suite.photoSize && `photo:${suite.photoSize}`,
    suite.photoShape,
  ]
    .filter(Boolean)
    .join(' ');

  test.for(designs)('$id', async ({ id, theme }) => {
    const problems: string[] = [];
    let mine = 0;
    const settings = suite.cols.flatMap((cols) =>
      NAME_STYLES.flatMap((nameStyle) =>
        suite.icons.flatMap((iconStyle) =>
          (suite.photoPositions ?? ['column']).map((photoPos) => ({ cols, nameStyle, iconStyle, photoPos })),
        ),
      ),
    );
    await inOrder(settings, async ({ cols, nameStyle, iconStyle, photoPos }) => {
      const r = await buildAudit(
        {
          ...FULL_FIELDS,
          template: id,
          theme,
          cols,
          photoPos,
          nameStyle,
          iconStyle,
          replyStyle: suite.replyStyle ?? 'line',
          photoSize: suite.photoSize ?? 'M',
          photoShape: suite.photoShape ?? 'auto',
          font: suite.font ?? 'auto',
          textSize: suite.textSize ?? 'standard',
          show: { ...FULL_SHOW },
        },
        suite.version,
      );
      const html = r.html('embed');
      const label = `${id} cols${cols} ${suite.version} ${nameStyle} icons:${iconStyle} photo:${photoPos}${extra ? ` ${extra}` : ''}`;
      await inOrder(MODES, (mode) =>
        withStage(keepAsOutlook(html, mode), suite.widths[0] ?? 343, (stage) => {
          for (const b of stage.broken) problems.push(`${label} ${mode}: image "${b}" does not decode`);
          for (const w of suite.widths) {
            stage.setWidth(w);
            mine++;
            const o = overflowOf(stage.box);
            if (o) problems.push(`${label} ${mode} ${w}px: overflow ${o.px}px :: ${o.widest.join(' | ')}`);
            if (suite.photoSize)
              for (const problem of imageProblems(stage.box)) problems.push(`${label} ${mode} ${w}px: ${problem}`);
          }
        }),
      );
    });
    checked += mine;
    expect(mine, 'layouts checked').toBeGreaterThan(0);
    expect(problems).toEqual([]);
  });

  test('checked at least one layout', async ({ annotate }) => {
    await annotate(`${suite.name}: ${checked} layouts checked`);
    expect(checked).toBeGreaterThan(0);
  });
});
