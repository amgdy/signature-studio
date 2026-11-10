import { f, MONO, tbl, td, tr } from '../html.ts';
import { defineDesign } from './kit.ts';
import { directoryAssets, directoryLayout, directoryParts } from './shared.ts';

export const systemsDesign = defineDesign({
  id: 'systems',
  name: 'Systems',
  theme: 'indigo',
  anim: 'none',
  cols: 2,
  icons: 'labels',
  cats: ['technology', 'developer'],
  badge: 'New',
  tag: 'An engineering specification card',
  blurb: 'A light technical spec card with a numbered identity section, a monospaced heading and a contact directory.',
  assets: directoryAssets,
  html(s, A, th, P, v, D) {
    const p = directoryParts(s, A, D, th, P, v, `font-family:${MONO};`);
    const body = directoryLayout(p.identity + p.organisation, p.contacts, s, P, p.photo);
    if (v === 'reply') return body;
    return tbl(
      tr(
        td(
          '01 / PROFILE',
          `${f(11, 17, p.accent, true, `font-family:${MONO};`)}padding:4px 6px;border-bottom:1px solid ${P.line};`,
        ),
      ) + tr(td(body, 'padding:10px 6px;')),
      `border:1px solid ${P.line};`,
    );
  },
});
