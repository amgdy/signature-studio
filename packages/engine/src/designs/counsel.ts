import { SERIF, tbl, td, tr } from '../html.ts';
import { defineDesign } from './kit.ts';
import { directoryAssets, directoryLayout, directoryParts } from './shared.ts';

export const counselDesign = defineDesign({
  id: 'counsel',
  name: 'Counsel',
  theme: 'noir',
  anim: 'none',
  cols: 1,
  icons: 'labels',
  cats: ['legal', 'classic'],
  badge: 'New',
  tag: 'Formal correspondence, without clutter',
  blurb: 'An open letterhead with a serif name, double rules and a firm line above the contact details.',
  assets: directoryAssets,
  html(s, A, th, P, v, D) {
    const p = directoryParts(s, A, D, th, P, v, `font-family:${SERIF};font-weight:400;`);
    const body = directoryLayout(p.identity + p.organisation, p.contacts, s, P, p.photo);
    return v === 'reply'
      ? body
      : tbl(tr(td(body, `border-top:3px double ${p.accent};border-bottom:3px double ${p.accent};padding:12px 0;`)));
  },
});
