import { esc, f, SERIF, tbl, td, tr } from '../html.ts';
import { defineDesign } from './kit.ts';
import { directoryAssets, directoryLayout, directoryParts } from './shared.ts';

export const facultyDesign = defineDesign({
  id: 'faculty',
  name: 'Faculty',
  theme: 'berry',
  anim: 'none',
  cols: 2,
  icons: 'labels',
  cats: ['education'],
  badge: 'New',
  tag: 'An academic letterhead',
  blurb: 'A departmental heading over a serif identity, portrait and contact directory for education and research.',
  assets: directoryAssets,
  html(s, A, th, P, v, D) {
    const p = directoryParts({ ...s, team: '' }, A, D, th, P, v, `font-family:${SERIF};`);
    if (v === 'reply') return directoryLayout(p.identity, p.contacts, s, P);
    const heading = s.team
      ? tr(td(esc(s.team), `${f(12, 18, p.accent, true)}border-bottom:1px solid ${P.line};padding-bottom:6px;`))
      : '';
    const body = directoryLayout(p.identity + p.organisation, p.contacts, s, P, p.photo);
    return tbl(heading + tr(td(body, 'padding-top:10px;')));
  },
});
