import { tint } from '../color.ts';
import { f, tbl, td, tr } from '../html.ts';
import { defineDesign } from './kit.ts';
import { directoryAssets, directoryLayout, directoryParts } from './shared.ts';

export const circuitDesign = defineDesign({
  id: 'circuit',
  name: 'Circuit',
  theme: 'ocean',
  anim: 'none',
  cols: 2,
  icons: 'glyph',
  cats: ['technology', 'developer'],
  badge: 'New',
  tag: 'A connected contact diagram',
  blurb:
    'A connected identity and directory with dotted rules and a softly shaded organisation node, for technical teams.',
  assets: directoryAssets,
  html(s, A, th, P, v, D) {
    const p = directoryParts(s, A, D, th, P, v);
    const body = directoryLayout(p.identity, p.contacts, s, P, p.photo);
    if (v === 'reply') return body;
    return tbl(
      tr(td('PROFILE', `${f(11, 16, p.accent, true)}padding-bottom:5px;`)) +
        tr(td(body, `padding:8px 6px;border-left:2px dotted ${p.accent};border-bottom:2px dotted ${p.accent};`)) +
        tr(td(tbl(p.organisation), `padding:8px 6px;background-color:${tint(th, P)};`)),
    );
  },
});
