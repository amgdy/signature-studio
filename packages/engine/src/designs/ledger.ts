import { f, SERIF, tbl, td, tr } from '../html.ts';
import { defineDesign } from './kit.ts';
import { directoryAssets, directoryLayout, directoryParts } from './shared.ts';

export const ledgerDesign = defineDesign({
  id: 'ledger',
  name: 'Ledger',
  theme: 'navy',
  anim: 'none',
  cols: 2,
  icons: 'labels',
  cats: ['finance', 'classic'],
  badge: 'New',
  tag: 'A precise, ruled financial brief',
  blurb: 'A serif identity, ruled ledger sections and a clear contact column for finance and advisory work.',
  assets: directoryAssets,
  html(s, A, th, P, v, D) {
    const p = directoryParts(s, A, D, th, P, v, `font-family:${SERIF};`);
    const body = directoryLayout(p.identity + p.organisation, p.contacts, s, P, p.photo);
    if (v === 'reply') return body;
    return tbl(
      tr(
        td(
          'CONTACT',
          `${f(11, 16, p.accent, true)}letter-spacing:1px;border-bottom:2px solid ${p.accent};padding-bottom:5px;`,
        ),
      ) + tr(td(body, `padding:12px 0;border-bottom:1px solid ${P.line};`)),
    );
  },
});
