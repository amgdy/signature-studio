import { tint } from '../color.ts';
import { tbl, td, tr } from '../html.ts';
import { defineDesign } from './kit.ts';
import { directoryAssets, directoryLayout, directoryParts } from './shared.ts';

export const careDesign = defineDesign({
  id: 'care',
  name: 'Care',
  theme: 'teal',
  anim: 'none',
  cols: 2,
  icons: 'glyph',
  cats: ['healthcare'],
  badge: 'New',
  tag: 'Clear, approachable clinical contact',
  blurb:
    'A calm name panel, generous line spacing and direct contacts for healthcare and wellness. No medical claims or protected emblems.',
  assets: directoryAssets,
  html(s, A, th, P, v, D) {
    const p = directoryParts(s, A, D, th, P, v);
    if (v === 'reply') return directoryLayout(p.identity, p.contacts, s, P);
    const rows = p.identity + tr(td(tbl(p.organisation), 'padding-top:8px;'));
    return tbl(
      tr(
        td(
          directoryLayout(rows, p.contacts, s, P, p.photo),
          `background-color:${tint(th, P)};border-top:4px solid ${p.accent};padding:12px 6px;border-radius:8px;`,
        ),
      ),
    );
  },
});
