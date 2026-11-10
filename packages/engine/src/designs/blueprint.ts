import { f, MONO, tbl, td, tr } from '../html.ts';
import { defineDesign } from './kit.ts';
import { directoryAssets, directoryLayout, directoryParts } from './shared.ts';

export const blueprintDesign = defineDesign({
  id: 'blueprint',
  name: 'Blueprint',
  theme: 'slate',
  anim: 'none',
  cols: 2,
  icons: 'labels',
  cats: ['property'],
  badge: 'New',
  tag: 'An architectural title block',
  blurb: 'A measured title block, ruled frame and technical typography for property, architecture and construction.',
  assets: directoryAssets,
  html(s, A, th, P, v, D) {
    const p = directoryParts(s, A, D, th, P, v, `font-family:${MONO};`);
    const body = directoryLayout(p.identity + p.organisation, p.contacts, s, P, p.photo);
    if (v === 'reply') return body;
    return tbl(
      tr(
        td(
          'CONTACT / DETAILS',
          `${f(11, 16, p.accent, true, `font-family:${MONO};`)}padding:5px 6px;border-bottom:1px solid ${p.accent};`,
        ),
      ) + tr(td(body, 'padding:10px 6px;')),
      `border:1px solid ${p.accent};border-left-width:4px;`,
    );
  },
});
