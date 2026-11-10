import { tbl, td, tr } from '../html.ts';
import { defineDesign } from './kit.ts';
import { directoryAssets, directoryLayout, directoryParts } from './shared.ts';

export const folioDesign = defineDesign({
  id: 'folio',
  name: 'Folio',
  theme: 'terracotta',
  anim: 'none',
  cols: 1,
  icons: 'glyph',
  cats: ['creative'],
  badge: 'New',
  tag: 'An open portfolio cover',
  blurb: 'A bold, open identity with an offset colour rule and an organisation footer for independent creative work.',
  assets: directoryAssets,
  html(s, A, th, P, v, D) {
    const p = directoryParts(s, A, D, th, P, v, 'font-weight:800;letter-spacing:-0.4px;');
    const body = directoryLayout(p.identity, p.contacts, s, P, p.photo);
    if (v === 'reply') return body;
    return tbl(
      tr(td(body, `padding:4px 0 12px;border-bottom:5px solid ${p.accent};`)) +
        tr(td(tbl(p.organisation), 'padding-top:10px;')),
    );
  },
});
