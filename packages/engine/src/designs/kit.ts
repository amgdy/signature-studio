/* The design kit: what a new design needs.
   - defineDesign() declares a design with type checking.
   - card() is a ready-made signature card (photo, name, title, contacts and links) that a few settings restyle.
   Classic Refresh is card() with its defaults. To make a design, copy classic.ts, change the gallery details and the
   card settings, and add it to index.ts. For a layout of your own, write assets() and html() yourself: every other
   file in this folder is an example. The card follows the Outlook rules in docs/DEVELOPMENT.md, fits a 343 px phone
   in 1, 2 and 3 columns, and has its own reply version. */
import {
  altRow,
  contactsOf,
  item,
  photoImg,
  photoSpec,
  pron,
  replyContacts,
  socialsOf,
  taglineRow,
} from '../content.ts';
import { cgrid, esc, f, flowLine, lineRows, tbl, td, tr } from '../html.ts';
import { GLYPH, icn } from '../icons.ts';
import { twoCol, withPhoto } from '../layout.ts';
import { handInline, nameAsset } from '../name.ts';
import type { PhotoShape } from '../options.ts';
import type { Design, SpecMap } from '../types.ts';

/** Declares a design. It only adds type checking: the object is returned as is. */
export function defineDesign(design: Design): Design {
  return design;
}

/** Settings that restyle a `card()`. Each one is optional. */
export interface CardLook {
  /** Photo size in px, before the user's photo size is applied. Default 72. */
  photo?: number;
  /** Photo shape while the user leaves the shape on Auto. Default `'circle'`. */
  shape?: PhotoShape;
  /** Draws a ring in the palette's colours round the photo. Default false. */
  ring?: boolean;
  /** Typed name size in px. A reply uses 2 px less. Default 16. */
  nameSize?: number;
  /** Space between the photo and the text in px. Default 14. */
  gap?: number;
}

/**
 * A signature card: photo beside the name, the company on the name line, the title in the accent colour, then
 * contacts and profile links. In 2 columns the contacts get a column of their own; the reply is the name, title and
 * one line of contacts. Spread it into `defineDesign({ ... })`.
 */
export function card(look: CardLook = {}): Pick<Design, 'assets' | 'html'> {
  const photo = look.photo ?? 72;
  const shape = look.shape ?? 'circle';
  const nameSize = look.nameSize ?? 16;
  const gap = look.gap ?? 14;
  return {
    assets(s, th, v, o) {
      const a: SpecMap = {};
      const small = v === 'reply';
      nameAsset(a, s, th, v, o, { n: nameSize + 7, r: nameSize + 3 });
      if (s.show.photo && !small) {
        const ring = look.ring ? { w: 2, gap: 2, stops: th.stops } : null;
        a.photo = photoSpec(s, th, photo, shape, ring, 'png', this.anim, o);
      }
      (small ? replyContacts(s) : contactsOf(s).filter((c) => c.k !== 'location')).forEach((c) => {
        a[`ic_${c.k}`] = { kind: 'glyph', icon: GLYPH[c.k], size: small ? 12 : 14, color: icn(th) };
      });
      if (!small)
        socialsOf(s).forEach((x) => {
          a[`so_${x.k}`] = { kind: 'glyph', icon: GLYPH[x.k], size: 14, color: icn(th) };
        });
      return a;
    },
    html(s, A, th, P, v, D) {
      const acc = P.dark ? th.accentDark : th.accent;
      const small = v === 'reply';
      const two = s.colsEff === 2;
      const ns = small ? nameSize - 2 : nameSize;
      const nlh = Math.round(ns * 1.375);
      let rows = '';
      if (A.hname)
        rows += tr(
          td(
            handInline(
              A,
              D,
              s,
              (s.company ? esc(s.company) : '') + (s.company ? pron(s, P) : pron(s, P).replace(/^ /, '')),
              f(ns, nlh, P.muted),
              ns,
              nlh,
              8,
              s.company ? '&middot;&nbsp;' : '',
            ),
          ),
        );
      else {
        const company = s.company ? `<span style="${f(ns, nlh, P.muted)}"> &middot; ${esc(s.company)}</span>` : '';
        rows += tr(td(esc(s.fullName) + company + pron(s, P), f(ns, nlh, P.ink, true)));
      }
      if (!small) rows += altRow(s, P, 14, 20);
      if (s.title) rows += tr(td(esc(s.title), f(small ? 12 : 13, small ? 17 : 19, acc, true)));
      if (small) {
        const it = replyContacts(s).map((c) => item(c, A, P, { size: 12, gap: 5 }));
        if (two && it.length) return twoCol(tbl(rows), cgrid(it, { one: true, row: 3 }), P, { gap: 14 });
        if (it.length) rows += tr(td(flowLine(it, P), `${f(12, 18, P.body)}padding-top:3px;`));
        return tbl(rows);
      }
      const org = [s.team, s.region, s.location && s.show.location ? s.location : '']
        .filter(Boolean)
        .map(esc)
        .join(' &middot; ');
      if (org) rows += tr(td(org, f(12, 18, P.muted)));
      const cts = contactsOf(s)
        .filter((c) => c.k !== 'location')
        .map((c) => item(c, A, P, { size: 14, gap: 5 }));
      const sos = socialsOf(s).map((x) =>
        item({ k: x.k, href: x.href, text: x.label, label: '' }, A, P, { pre: 'so_', size: 14, gap: 5 }),
      );
      let body;
      if (two) {
        rows += taglineRow(s, P, 'padding-top:6px;');
        body = twoCol(tbl(rows), cgrid(cts.concat(sos), { one: true, row: 3 }), P, { gap: 16 });
      } else {
        if (cts.length) rows += lineRows(cts, P, undefined, 460, f(12, 18, P.body), 'padding-top:7px;');
        if (sos.length) rows += lineRows(sos, P, undefined, 460, f(12, 18, P.body), 'padding-top:3px;');
        rows += taglineRow(s, P, 'padding-top:6px;');
        body = tbl(rows);
      }
      return withPhoto(s.show.photo ? photoImg(A, photo, s) : '', body, gap);
    },
  };
}
