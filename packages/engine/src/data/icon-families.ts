import type { GlyphIcon } from '../data.ts';
import type { ContactKind } from '../icons.ts';
import type { IconFamily } from '../options.ts';

type Family = Exclude<IconFamily, 'standard'>;
type Drawing = readonly [outline: string, detail: string];
type Drawings = Record<ContactKind | 'org' | 'blog', Drawing>;

/** Original 24 px drawings. Brand marks keep their established shapes. */
const PATHS: Record<Family, Drawings> = {
  rounded: {
    phone: ['M8 2h8a3 3 0 0 1 3 3v14a3 3 0 0 1-3 3H8a3 3 0 0 1-3-3V5a3 3 0 0 1 3-3Z', 'M10 5h4M11 19h2'],
    office: ['M5 3q-3 0-2 5 3 11 13 13 5 1 5-2v-3l-5-2-2 3q-6-3-7-7l3-2-2-5Z', 'M14 4q6 0 6 6M14 8q2 0 2 2'],
    mail: ['M6 4h12q4 0 4 4v8q0 4-4 4H6q-4 0-4-4V8q0-4 4-4Z', 'M3 7l7 6q2 2 4 0l7-6M3 18l5-5m13 5-5-5'],
    web: ['M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z', 'M2 12h20M12 2q-8 10 0 20 8-10 0-20Z'],
    location: ['M12 22S4 15 4 10a8 8 0 0 1 16 0c0 5-8 12-8 12Z', 'M15 10a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z'],
    calendar: ['M6 4h12q3 0 3 3v12q0 3-3 3H6q-3 0-3-3V7q0-3 3-3Z', 'M7 2v5m10-5v5M3 10h18M8 15h2m4 0h2m-8 4h2'],
    hours: ['M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z', 'M12 6v6l4 3'],
    languages: [
      'M5 3h14q3 0 3 3v12q0 3-3 3H5q-3 0-3-3V6q0-3 3-3Z',
      'M5 8h8M9 6v2m-3 0q1 5 6 6m-1-6q-1 5-6 7m9 3 3-8 3 8m-5-3h4',
    ],
    org: ['M6 2h8q2 0 2 2v6h3q2 0 2 2v10H3V5q0-3 3-3Z', 'M7 7h3m-3 4h3m-3 4h3m6-1h2m-2 4h2M8 22v-3h3v3'],
    blog: ['M5 22l1-6L17 3q2-2 4 0t0 4L10 20Z', 'M6 16l4 4M15 6l5 4M4 23h17'],
  },
  geometric: {
    phone: ['M7 2h10l2 2v16l-2 2H7l-2-2V4Z', 'M9 5h6M10 18h4'],
    office: ['M3 2h5l3 6-4 3 6 6 3-4 6 3v5l-4 1-7-4-5-5-4-7Z', 'M14 3h7v7M14 7h3v3'],
    mail: ['M2 5h20v14H2Z', 'M2 5l10 9L22 5M2 19l7-7m13 7-7-7'],
    web: ['M8 2h8l6 6v8l-6 6H8l-6-6V8Z', 'M2 12h20M12 2l-4 6v8l4 6 4-6V8Z'],
    location: ['M8 2h8l5 6v5l-9 10-9-10V8Z', 'M9 7h6v6H9Z'],
    calendar: ['M3 4h18v18H3Z', 'M7 2v5m10-5v5M3 10h18M7 14h3v3H7Zm7 0h3v3h-3Z'],
    hours: ['M8 2h8l6 6v8l-6 6H8l-6-6V8Z', 'M12 5v8h6'],
    languages: ['M2 3h20v18H2Z', 'M5 8h8M9 5v3m-3 0 6 7m-1-7-6 7m9 3 3-9 3 9m-5-3h4'],
    org: ['M3 2h12v8h6v12H3Z', 'M7 6h4m-4 4h4m-4 4h4m4 0h3m-3 4h3M7 22v-4h4v4'],
    blog: ['M3 21l2-7L17 2l5 5-12 12Z', 'M5 14l5 5M14 5l5 5M3 23h19'],
  },
  handdrawn: {
    phone: ['M7 2q5-1 10 1l1 17q-5 3-12 1L5 5q0-3 2-3Z', 'M9 5l5-.4M10 18l3 .3'],
    office: ['M4 3l4-1 3 6-3 3q2 4 5 6l3-3 5 2q1 5-3 6Q5 18 2 7q-1-3 2-4Z', 'M15 3q6 1 6 7M14 7q3 0 3 4'],
    mail: ['M3 5q9-2 18 0l1 14q-10 2-20 0Z', 'M3 6q5 3 9 8l9-8M3 18l5-5m13 5-5-5'],
    web: ['M12 2q10 0 10 10t-10 10Q1 21 2 11 3 1 12 2Z', 'M3 12q9-2 18 0M12 3q-7 9 0 18 7-9 0-18Z'],
    location: ['M12 22Q3 14 4 9 5 1 12 2q8-1 8 8-1 6-8 12Z', 'M15 10q0 3-3 3-4-1-3-4 1-3 4-2 2 0 2 3Z'],
    calendar: ['M4 4l16 1 1 16q-10 2-18 0Z', 'M7 2l.5 5M17 2l-.5 5M4 10l16 .6M8 14l2 .3m4-.3 2 .3m-8 4 2 .3'],
    hours: ['M12 2q10 0 10 10t-10 10Q1 21 2 11 3 1 12 2Z', 'M12 6l-.5 7 5 2'],
    languages: ['M3 3l18 1-.5 17L2 20Z', 'M5 8l8-.3M9 6v2m-3 0q1 4 6 6m-1-6q-1 4-6 7m9 3 3-8 3 8m-5-3 4 .3'],
    org: ['M4 3l11-1 .5 9 5 .4L21 22 3 21Z', 'M7 7l4-.3m-4 4 4-.3m-4 4 4-.3m5 .3h2m-2 4h2M7 21l.3-3 4 .3V22'],
    blog: ['M4 21l2-7L17 3q2-2 4 1l1 3L10 20Z', 'M6 14l4 6M15 6l5 4M4 23q9-1 17 0'],
  },
};

function familyGlyphs(): Record<string, GlyphIcon> {
  const result: Record<string, GlyphIcon> = {};
  for (const [family, kinds] of Object.entries(PATHS)) {
    for (const [kind, [outline, detail]] of Object.entries(kinds)) {
      for (const weight of ['line', 'bold', 'solid', 'duotone']) {
        const id = `${kind}-${family}-${weight}`;
        const width = weight === 'bold' ? 2.6 : 1.8;
        const joins =
          family === 'geometric'
            ? 'stroke-linecap="square" stroke-linejoin="miter"'
            : 'stroke-linecap="round" stroke-linejoin="round"';
        const inner =
          weight === 'solid'
            ? `<defs><mask id="${id}" maskUnits="userSpaceOnUse" x="0" y="0" width="24" height="24"><path d="${outline}" fill="white"/><path d="${detail}" fill="none" stroke="black" stroke-width="1.6" ${joins}/></mask></defs><path d="${outline}" mask="url(#${id})"/>`
            : `${weight === 'duotone' ? `<path d="${outline}" opacity=".18"/>` : ''}<g fill="none" stroke="currentColor" stroke-width="${width}" ${joins}><path d="${outline}"/><path d="${detail}"/></g>`;
        result[id] = { vb: '0 0 24 24', inner };
      }
    }
  }
  return result;
}

export const FAMILY_GLYPHS = familyGlyphs();
