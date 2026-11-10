import { SERIF, tbl, td, tr } from '../html.ts';
import { defineDesign } from './kit.ts';
import { directoryAssets, directoryLayout, directoryParts } from './shared.ts';

export const conciergeDesign = defineDesign({
  id: 'concierge',
  name: 'Concierge',
  theme: 'brass',
  anim: 'none',
  cols: 1,
  icons: 'labels',
  cats: ['hospitality'],
  badge: 'New',
  tag: 'A personal invitation',
  blurb:
    'A lightly framed invitation with an italic serif identity, portrait and direct booking contact for hospitality and travel.',
  assets: directoryAssets,
  html(s, A, th, P, v, D) {
    const p = directoryParts(s, A, D, th, P, v, `font-family:${SERIF};font-style:italic;font-weight:400;`);
    const body = directoryLayout(p.identity + p.organisation, p.contacts, s, P, p.photo);
    return v === 'reply'
      ? body
      : tbl(
          tr(
            td(
              tbl(tr(td(body, `padding:10px 6px;border:1px solid ${P.line};`))),
              `padding:4px;border:1px solid ${p.accent};`,
            ),
          ),
        );
  },
});
