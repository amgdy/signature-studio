import {
  altRow,
  animOn,
  companyLine,
  contactsOf,
  focusOf,
  handleOf,
  photoImg,
  photoSpec,
  pron,
  replyContacts,
  socialsOf,
} from '../content.ts';
import { esc, flowLine, img, IMGTD, link, shortText, tbl, td, tr } from '../html.ts';
import { twoCol } from '../layout.ts';
import { nameAsset } from '../name.ts';
import { defineDesign } from './kit.ts';
import { DEV, devId, devLinks, devReply, devVal, devWin, DP, mark, mono } from './dev.ts';
import type { SpecMap } from '../types.ts';

export const agentDesign = defineDesign({
  id: 'agent',
  name: 'Agent',
  theme: 'copilot',
  anim: 'none',
  cols: 1,
  icons: 'glyph',
  extras: ['focus'],
  cats: ['developer', 'creative'],
  badge: 'New',
  darkCol3: true,
  tag: 'An AI agent session that finds you',
  blurb:
    'Your signature as an AI coding agent at work in a terminal: a question, a spinner that settles on a tick, you as the answer, your contacts as the result of a lookup, your focus areas as a finished plan and a reply box that opens an email to you.',
  assets(s, th, v, o) {
    const a: SpecMap = {};
    const small = v === 'reply';
    const acc = th.accentDark;
    nameAsset(a, s, th, v, o, { n: 20, r: 16, maxN: 170, maxR: 140, colorN: DEV.text, colorR: DEV.text });
    a.dot = { kind: 'mark', shape: 'bullet', size: 12, color: acc };
    if (small) return a;
    a.pr = { kind: 'mark', shape: 'prompt', size: 12, color: acc };
    a.tree = { kind: 'mark', shape: 'tree', size: 12, color: DEV.muted };
    a.tick = { kind: 'mark', shape: 'tick', size: 12, color: DEV.green };
    a.spin = { kind: 'spinner', size: 12, color: acc, ok: DEV.green, animated: animOn(s, o), motion: s.motion };
    if (s.show.photo) a.photo = photoSpec(s, th, 40, 'rounded', null, 'png', this.anim, o);
    return a;
  },
  html(s, A, th, _P, v, D) {
    const acc = th.accentDark;
    const small = v === 'reply';
    const two = s.colsEff === 2;
    if (small) {
      const nm = A.hname
        ? img(A.hname, D.hname.w, D.hname.h, s.fullName, { inline: true, css: 'vertical-align:middle;' })
        : `<span style="color:${DEV.text};font-weight:700;">${esc(s.fullName)}</span>`;
      return devReply(
        s,
        A,
        D,
        mark(A, 'dot') +
          flowLine(
            [nm, s.title ? `<span style="color:${acc};">${esc(s.title)}</span>` : ''].concat(
              replyContacts(s).map((c) => devVal(c, DEV.cyan)),
            ),
            DP,
          ),
      );
    }
    function row(m: string, h: string, st: string, pad?: number) {
      const gap = s.font !== 'auto' || s.textSize !== 'standard' ? 2 : 6;
      return tr(
        td(
          mark(A, m, 12, gap === 2 ? 0 : 6),
          `${IMGTD}width:12px;padding:${pad || 3}px ${gap}px 0 0;vertical-align:top;`,
          `valign="top" width="${12 + gap}"`,
        ) + td(h, `${st || mono(12, 18, DEV.text)}padding-top:${(pad || 3) - 3}px;vertical-align:top;`, 'valign="top"'),
      );
    }
    /* header: a box with your photo, name, title and team */
    const hn = A.hname
      ? img(A.hname, D.hname.w, D.hname.h, s.fullName)
      : `<span style="${mono(14, 20, DEV.text, true)}">${esc(s.fullName)}</span>${pron(s, DP)}`;
    const htxt = tbl(
      tr(td(hn, A.hname ? IMGTD : '')) +
        (s.title ? tr(td(esc(s.title), mono(12, 18, acc, true))) : '') +
        altRow(s, DP, 13, 19) +
        ([s.team, companyLine(s)].filter(Boolean).length
          ? tr(td([s.team, companyLine(s)].filter(Boolean).map(esc).join(' &middot; '), mono(11, 16, DEV.muted)))
          : ''),
    );
    let head = tbl(
      tr(
        (s.show.photo && A.photo
          ? td(photoImg(A, 40, s), `${IMGTD}padding-right:10px;vertical-align:middle;`, 'valign="middle"')
          : '') + td(htxt, 'vertical-align:middle;', 'valign="middle"'),
      ),
    );
    head = tbl(tr(td(head, `border:1px solid ${acc};border-radius:8px;padding:8px 10px;`)), 'width:100%;');
    const ask = tbl(
      tr(
        td(mark(A, 'pr'), `${IMGTD}width:12px;padding:3px 6px 0 0;vertical-align:top;`, 'valign="top" width="18"') +
          td(
            esc(s.devPrompt || 'who can help us ship AI apps on Azure?'),
            `${mono(13, 19, DEV.text)}vertical-align:top;`,
            'valign="top"',
          ),
      ),
    );
    /* the answer: who you are, then a contact lookup; three columns share a phone's width, so the text is smaller there */
    const fs = s.cols3 ? 11 : 12;
    const lh = s.cols3 ? 17 : 18;
    const found =
      row('spin', 'Looked up the right person', mono(fs, lh, DEV.muted)) +
      row(
        'dot',
        `<span style="font-weight:700;">${esc(s.fullName)}</span>${s.title ? `<span style="color:${DEV.muted};"> &middot; </span>${esc(s.title)}` : ''}`,
        mono(fs, lh, DEV.text),
        6,
      );
    const fo = focusOf(s);

    const plan = fo.length
      ? row('dot', esc(s.focusLabel || 'Focus'), mono(fs, lh, DEV.text, true), 6) +
        fo.map((x) => row('tick', esc(x), mono(fs, lh, DEV.text))).join('')
      : '';

    const cs = contactsOf(s);
    const so = socialsOf(s);
    const look =
      cs.length || so.length
        ? row(
            'dot',
            `<span style="color:${DEV.cyan};">lookup</span><span style="color:${DEV.text};">(</span><span style="color:${DEV.orange};">&quot;${esc(handleOf(s) || devId(s))}&quot;</span><span style="color:${DEV.text};">)</span>`,
            `${mono(fs, lh, DEV.text)}white-space:nowrap;`,
            6,
          ) +
          cs
            .map((c) =>
              row(
                'tree',
                devVal(c, DEV.cyan),
                mono(fs, lh, DEV.text) + (shortText(c.text) ? 'white-space:nowrap;' : ''),
              ),
            )
            .join('') +
          (so.length
            ? row(
                'tree',
                devLinks(s, DEV.cyan).join(`<span style="color:${DP.faint};"> &middot; </span>`),
                mono(fs, lh, DEV.text),
              )
            : '')
        : '';
    const mail = (s.linkEmail || s.email || '').trim();

    const input = mail
      ? tbl(
          tr(
            td(
              mark(A, 'pr') + link(`mailto:${mail}`, 'Reply to start a session', DEV.muted, '', `Email ${s.fullName}`),
              `${mono(12, 18, DEV.muted)}border:1px solid ${DEV.line};border-radius:6px;padding:5px 10px;`,
            ),
          ),
          'width:100%;',
        )
      : '';

    const mid =
      two && look
        ? twoCol(tbl(found + plan), tbl(look), DP, { gap: s.cols3 ? 8 : 12, noHead: true, rule: DEV.line })
        : tbl(found + plan + look);
    const pad = s.font !== 'auto' || s.textSize !== 'standard' ? 3 : two ? (s.cols3 ? 6 : 10) : 12;
    return devWin(
      tr(
        td(
          tbl(
            tr(td(head)) +
              tr(td(ask, 'padding-top:10px;')) +
              tr(td(mid, 'padding-top:4px;')) +
              (input ? tr(td(input, 'padding-top:10px;')) : ''),
          ),
          `padding:${pad}px;`,
        ),
      ),
      DEV.bg,
      DEV.line,
      10,
    );
  },
});
