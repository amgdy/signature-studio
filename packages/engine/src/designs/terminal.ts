import { altSpan, animOn, companyLine, contactsOf, photoImg, photoSpec, replyContacts } from '../content.ts';
import { esc, flowLine, img, IMGTD, shortText, tbl, td, tr } from '../html.ts';
import { twoCol, withPhoto } from '../layout.ts';
import { nameAsset, nameRow } from '../name.ts';
import { defineDesign } from './kit.ts';
import { DEV, devId, DEVKEY, devLinks, devReply, devVal, devWin, DP, mark, mono } from './dev.ts';
import type { SignatureState, SpecMap, Theme } from '../types.ts';

/** The prompt's `user@company`. */
function devHost(s: Pick<SignatureState, 'signoffName' | 'fullName' | 'company'>): string {
  return `${devId(s)}@${(s.company || 'work').toLowerCase().replace(/[^a-z0-9]+/g, '') || 'work'}`;
}

/** A row of up to seven colour blocks: the theme's stops, then the window colours. */
function devBlocks(th: Pick<Theme, 'stops'>): string {
  const cols = [...th.stops, DEV.green, DEV.cyan, DEV.orange, DEV.purple].slice(0, 7);
  return tbl(
    tr(
      cols
        .map((c) =>
          td(
            '&nbsp;',
            `width:14px;height:10px;font-size:1px;line-height:1px;background-color:${c};`,
            `width="14" height="10" bgcolor="${c}"`,
          ),
        )
        .join(''),
    ),
  );
}

export const terminalDesign = defineDesign({
  id: 'terminal',
  name: 'Terminal',
  theme: 'forest',
  anim: 'none',
  cols: 1,
  icons: 'labels',
  cats: ['developer', 'creative'],
  badge: 'New',
  darkCol3: true,
  tag: 'A neofetch-style terminal window with a blinking cursor',
  blurb:
    'For builders: your signature as a terminal session. Your photo sits beside your details like a system logo, with short keys (role, team, mobile), colour blocks from your palette and a cursor that blinks a few times. Every word is real, clickable text.',
  assets(s, th, v, o) {
    const a: SpecMap = {};
    const small = v === 'reply';
    nameAsset(a, s, th, v, o, { n: 22, r: 16, maxN: 190, maxR: 150, colorN: DEV.text, colorR: DEV.text });
    a.pr = { kind: 'mark', shape: 'prompt', size: 12, color: th.accentDark };
    if (small) return a;
    a.dots = { kind: 'dots', w: 52, h: 12 };
    a.cur = { kind: 'cursor', w: 8, h: 16, color: DEV.text, animated: animOn(s, o), motion: s.motion };
    if (s.show.photo) a.photo = photoSpec(s, th, 72, 'rounded', null, 'png', this.anim, o);
    return a;
  },
  html(s, A, th, _P, v, D) {
    const acc = th.accentDark;
    const small = v === 'reply';
    const two = s.colsEff === 2;
    const cs = contactsOf(s);
    if (small) {
      const nm = A.hname
        ? img(A.hname, D.hname.w, D.hname.h, s.fullName, { inline: true, css: 'vertical-align:middle;' })
        : `<span style="color:${DEV.text};font-weight:700;">${esc(s.fullName)}</span>`;
      return devReply(
        s,
        A,
        D,
        mark(A, 'pr') +
          flowLine(
            [nm, s.title ? `<span style="color:${acc};">${esc(s.title)}</span>` : ''].concat(
              replyContacts(s).map((c) => devVal(c, DEV.cyan)),
            ),
            DP,
          ),
      );
    }
    function kv(k: string, h: string, stack?: boolean) {
      if (stack)
        return tr(
          td(
            `<span style="${mono(11, 16, acc, true)}">${esc(k)}</span><br>${h}`,
            `${mono(12, 18, DEV.text)}padding:0 0 4px 0;${shortText(h) && !s.cols3 && s.font === 'auto' && s.textSize === 'standard' ? 'white-space:nowrap;' : ''}`,
          ),
        );
      return tr(
        td(
          esc(k),
          `${mono(12, 18, acc, true)}padding:0 10px 2px 0;vertical-align:top;white-space:nowrap;`,
          'valign="top"',
        ) +
          td(
            h,
            `${mono(12, 18, DEV.text)}padding:0 0 2px 0;vertical-align:top;${shortText(h) ? 'white-space:nowrap;' : ''}`,
            'valign="top"',
          ),
      );
    }
    function prompt(cmd: string) {
      return tr(td(mark(A, 'pr') + cmd, `${mono(13, 20, DEV.text)}padding:2px 0;white-space:nowrap;`));
    }
    /* the name with a dashed rule under it, as neofetch draws under user@host */
    const name = nameRow(
      s,
      A,
      D,
      DP,
      mono(15, 22, DEV.text, true),
      `padding-bottom:4px;border-bottom:1px dashed ${DEV.line};`,
    );
    const who = [
      ['role', esc(s.title || '')],
      ['team', esc(s.team || '')],
      ['org', esc(companyLine(s))],
    ].filter((x) => x[1]);
    if (s.altName) who.push(['aka', altSpan(s)]);
    const links = devLinks(s, DEV.cyan);
    const sep = `<span style="color:${DP.faint};"> &middot; </span>`;
    let body;
    if (two) {
      /* two columns: photo, name and who you are | how to reach you; three columns add a column of link icons */
      /* the photo and name run across both columns; who you are | how to reach you under them */
      const head = withPhoto(s.show.photo && A.photo ? photoImg(A, 72, s) : '', tbl(name), 12);
      /* three columns share a phone's width: who you are may wrap, and the contacts are a little smaller */
      const cfs = s.cols3 ? 11 : 12;
      const clh = s.cols3 ? 17 : 18;
      const L = tr(td(tbl(who.map((x) => kv(x[0], x[1], true)).join(''))));
      const R =
        tr(td('# contact', mono(cfs, clh, DEV.muted))) +
        cs
          .map((c) =>
            tr(
              td(
                devVal(c, DEV.cyan),
                `${mono(cfs, clh, DEV.text)}padding-top:2px;${shortText(c.text) ? 'white-space:nowrap;' : ''}`,
              ),
            ),
          )
          .join('') +
        (links.length ? tr(td(links.join(sep), `${mono(cfs, clh, DEV.text)}padding-top:6px;`)) : '') +
        tr(td(devBlocks(th), 'padding-top:10px;'));
      body = tbl(
        prompt('neofetch') +
          tr(td(head, 'padding-top:6px;')) +
          tr(td(twoCol(tbl(L), tbl(R), DP, { gap: 12, noHead: true, rule: DEV.line }), 'padding-top:8px;')) +
          prompt(A.cur ? img(A.cur, 8, 16, '', { inline: true }) : ''),
      );
    } else {
      const info =
        name +
        tr(
          td(
            tbl(
              who.map((x) => kv(x[0], x[1])).join('') +
                cs.map((c) => kv(DEVKEY[c.k] || c.k, devVal(c, DEV.cyan))).join('') +
                (links.length ? kv('links', links.join(sep)) : ''),
            ),
            'padding-top:6px;',
          ),
        ) +
        tr(td(devBlocks(th), 'padding-top:10px;'));
      body = tbl(
        prompt('neofetch') +
          tr(td(withPhoto(s.show.photo && A.photo ? photoImg(A, 72, s) : '', tbl(info), 14), 'padding-top:6px;')) +
          prompt(A.cur ? img(A.cur, 8, 16, '', { inline: true }) : ''),
      );
    }
    const pad = two ? (s.cols3 ? 8 : 10) : 12;
    const bar = tbl(
      tr(
        td(
          A.dots ? img(A.dots, 52, 12, '') : '',
          `${IMGTD}width:52px;padding-right:10px;vertical-align:middle;`,
          'valign="middle"',
        ) + td(esc(devHost(s)), `${mono(11, 16, DEV.muted)}vertical-align:middle;`, 'valign="middle"'),
      ),
      'width:100%;',
    );
    return devWin(
      tr(
        td(
          bar,
          `background-color:${DEV.bar};padding:7px ${pad}px;border-bottom:1px solid ${DEV.line};border-radius:9px 9px 0 0;`,
          `bgcolor="${DEV.bar}"`,
        ),
      ) + tr(td(body, `padding:8px ${pad}px 10px ${pad}px;`)),
      DEV.bg,
      DEV.line,
      10,
    );
  },
});
