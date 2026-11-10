import { tbl, td, tr } from '../html.ts';
import { defineDesign } from './kit.ts';
import { directoryAssets, directoryLayout, directoryParts } from './shared.ts';

export const communityDesign = defineDesign({
  id: 'community',
  name: 'Community',
  theme: 'forest',
  anim: 'none',
  cols: 2,
  icons: 'glyph',
  cats: ['nonprofit'],
  badge: 'New',
  tag: 'A human-first community card',
  blurb:
    'An open portrait-led card with a coloured side ribbon and a separate organisation note for nonprofits and community teams.',
  assets: directoryAssets,
  html(s, A, th, P, v, D) {
    const p = directoryParts(s, A, D, th, P, v);
    const body = directoryLayout(p.identity, p.contacts, s, P, p.photo);
    if (v === 'reply') return body;
    return tbl(
      tr(td(body, `border-left:6px solid ${p.accent};padding:4px 8px;`)) +
        tr(td(tbl(p.organisation), `padding:10px 8px 0;border-top:1px dashed ${P.line};`)),
    );
  },
});
