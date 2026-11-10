import { tbl, td, tr } from '../html.ts';
import { tint } from '../color.ts';
import { defineDesign } from './kit.ts';
import { directoryAssets, directoryLayout, directoryParts } from './shared.ts';

export const adviserDesign = defineDesign({
  id: 'adviser',
  name: 'Adviser',
  theme: 'emerald',
  anim: 'none',
  cols: 2,
  icons: 'glyph',
  cats: ['finance', 'leadership'],
  badge: 'New',
  tag: 'A quiet advisory panel',
  blurb:
    'A portrait beside the identity, an accent rail and a softly shaded organisation panel for consultants and advisers.',
  assets: directoryAssets,
  html(s, A, th, P, v, D) {
    const p = directoryParts(s, A, D, th, P, v);
    const rows = p.identity + tr(td(tbl(p.organisation), `padding:8px 6px;background-color:${tint(th, P)};`));
    const body = directoryLayout(rows, p.contacts, s, P, p.photo);
    return v === 'reply' ? body : tbl(tr(td(body, `border-left:4px solid ${p.accent};padding:4px 8px;`)));
  },
});
