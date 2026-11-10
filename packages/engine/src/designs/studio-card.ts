import { tint } from '../color.ts';
import { tbl, td, tr } from '../html.ts';
import { defineDesign } from './kit.ts';
import { directoryAssets, directoryLayout, directoryParts } from './shared.ts';

export const studioCardDesign = defineDesign({
  id: 'studio-card',
  name: 'Studio Card',
  theme: 'rose',
  anim: 'none',
  cols: 2,
  icons: 'glyph',
  cats: ['creative'],
  badge: 'New',
  tag: 'A compact editorial poster',
  blurb: 'A framed name panel over a tinted studio footer, for design teams, media and creative practices.',
  assets: directoryAssets,
  html(s, A, th, P, v, D) {
    const p = directoryParts(s, A, D, th, P, v, 'letter-spacing:0.4px;');
    const body = directoryLayout(p.identity, p.contacts, s, P, p.photo);
    if (v === 'reply') return body;
    return tbl(
      tr(td(body, 'padding:12px 6px;')) +
        tr(
          td(tbl(p.organisation), `padding:10px 6px;background-color:${tint(th, P)};border-top:1px solid ${p.accent};`),
        ),
      `border:1px solid ${p.accent};border-top-width:5px;`,
    );
  },
});
