// One-line items: on a desktop-wide message, as RoosterJS keeps it (no-wrap stays only on table
// cells), every short contact or link meant for one line stays on one line. Images keep their size
// and shape, and the signature does not grow too wide.
import { expect, test } from 'vitest';
import type { IconStyle } from '../../src/index.ts';
import {
  AUDIT_DESIGNS,
  buildAudit,
  imageProblems,
  inOrder,
  keepAsOutlook,
  lineCount,
  NAME_STYLES,
  signatureWidth,
  withStage,
} from './helpers.ts';

const WIDTH = 900;
const ICONS: readonly IconStyle[] = ['auto', 'glyph', 'fluent', 'labels'];
/** Longer text than this may wrap on purpose. */
const SHORT = 24;

let layouts = 0;
let items = 0;

test.for(AUDIT_DESIGNS.map((d) => ({ id: d.id, theme: d.theme })))('$id', async ({ id, theme }) => {
  const problems: string[] = [];
  let mine = 0;
  const settings = ([1, 2, 3] as const).flatMap((cols) =>
    NAME_STYLES.flatMap((nameStyle) => ICONS.map((iconStyle) => ({ cols, nameStyle, iconStyle }))),
  );
  await inOrder(settings, async ({ cols, nameStyle, iconStyle }) => {
    const r = await buildAudit({
      template: id,
      theme,
      cols,
      nameStyle,
      iconStyle,
      hours: 'Sun to Thu, 9am to 5pm',
      show: { animate: false },
    });
    const kept = keepAsOutlook(r.html('embed'), 'roost', { editorWidth: WIDTH, markNoWrap: true });
    await withStage(kept, WIDTH, ({ box, broken }) => {
      const bad = broken.map((b) => `image "${b}" does not decode`);
      bad.push(...imageProblems(box));
      const w = signatureWidth(box);
      if (w > (cols >= 2 ? 820 : 760)) bad.push(`wide ${w}px`);
      for (const el of Array.from(box.querySelectorAll('[data-nw]'))) {
        const text = (el.textContent ?? '').replace(/\u00a0/g, ' ').trim();
        if (!text || text.length > SHORT || el.querySelector('div, table')) continue;
        items++;
        const lines = lineCount(el);
        if (lines > 1) bad.push(`wrapped "${text}" over ${lines} lines`);
      }
      mine++;
      if (bad.length) {
        problems.push(`${id} cols${cols} new ${nameStyle} icons:${iconStyle} roost ${WIDTH}px: ${bad.join(' | ')}`);
      }
    });
  });
  layouts += mine;
  expect(mine, 'layouts checked').toBeGreaterThan(0);
  expect(problems).toEqual([]);
});

test('checked at least one layout and one-line item', async ({ annotate }) => {
  await annotate(`oneline: ${layouts} layouts, ${items} one-line items checked`);
  expect(layouts).toBeGreaterThan(0);
  expect(items).toBeGreaterThan(0);
});
