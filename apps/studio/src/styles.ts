/*
 * Looks: the gallery of designs, built-in styles and saved styles, applying a style, styles files, and the shuffle.
 * Plain functions over a state, so they are easy to test. The built-in styles live in styles.yaml, a styles file
 * like the ones you export, so adding one needs no code.
 */
import { Document, parse } from 'yaml';
import {
  ANIMS,
  BACKGROUNDS,
  DESIGNS,
  DESIGN_CATEGORIES,
  ICON_STYLES,
  SHAPES,
  STYLE_KEY_LIST,
  THEME_LIST,
  designById,
  isRecord,
  pickStyle,
  themeSettings,
  toState,
} from './engine.ts';
import type {
  ColumnsSetting,
  DesignCategory,
  DesignInfo,
  PhotoLook,
  PhotoSize,
  SignatureState,
  StyleValues,
} from './engine.ts';
import { pick } from './sample.ts';
import type { Rng } from './sample.ts';
import BUILT_IN_STYLES_FILE from './styles.yaml?raw';

/** A look the user saved under My styles. */
export interface SavedStyle {
  id: string;
  name: string;
  s: StyleValues;
  created?: string;
}

/** The gallery filters: all designs, each design category, the built-in styles and your saved ones. */
export type GalleryFilter = 'all' | DesignCategory | 'presets' | 'mine';

export const FILTERS: readonly { id: GalleryFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  ...DESIGN_CATEGORIES.map((c) => ({ id: c.id, label: c.label })),
  { id: 'presets', label: 'Styles' },
  { id: 'mine', label: 'My styles' },
];

export function isGalleryFilter(v: unknown): v is GalleryFilter {
  return FILTERS.some((f) => f.id === v);
}

interface EntryBase {
  id: string;
  name: string;
  tag: string;
  blurb: string;
  badge: string;
  cats: readonly GalleryFilter[];
}
interface DesignEntry extends EntryBase {
  kind: 'tpl';
  design: DesignInfo;
}
interface StyleEntry extends EntryBase {
  kind: 'preset' | 'mine';
  s: StyleValues;
  design: DesignInfo | undefined;
}
export type GalleryEntry = DesignEntry | StyleEntry;

/** Style keys whose change makes the look no longer the picked preset or saved style. */
export const STYLE_BREAKING_KEYS: readonly (keyof SignatureState)[] = [
  'template',
  'iconStyle',
  'iconFamily',
  'photoShape',
  'photoLook',
  'photoAnim',
  'nameStyle',
  'font',
  'textSize',
  'cols',
  'photoSize',
  'replyStyle',
  'colors',
  'gradient',
];

/** The look of a state: every style key plus the flourish, logo and animation switches. */
export function styleOf(state: SignatureState): StyleValues {
  const s: StyleValues = {};
  for (const k of STYLE_KEY_LIST) Object.assign(s, { [k]: state[k] });
  s.show = { flourish: state.show.flourish, logo: state.show.logo, animate: state.show.animate };
  return s;
}

/** The state with a style applied. Details are never touched. */
export function applyStyle(state: SignatureState, style: StyleValues): SignatureState {
  const next: Record<string, unknown> = { ...state, show: { ...state.show, ...style.show } };
  for (const k of STYLE_KEY_LIST) if (style[k] !== undefined) next[k] = style[k];
  return toState(next);
}

/** A built-in style sets only what it names; everything else returns to the design's own. */
export function presetState(p: Pick<StyleItem, 's'>): StyleValues {
  return {
    cols: 'auto',
    iconStyle: 'auto',
    iconFamily: 'standard',
    photoShape: 'auto',
    photoLook: 'natural',
    photoAnim: 'auto',
    photoSize: 'M',
    font: 'auto',
    textSize: 'standard',
    bgMode: 'transparent',
    ...p.s,
  };
}

/** Designs, then presets, then saved styles, in gallery order. */
export function galleryEntries(saved: readonly SavedStyle[]): GalleryEntry[] {
  const out: GalleryEntry[] = DESIGNS.map((d) => ({
    kind: 'tpl',
    id: d.id,
    name: d.name,
    tag: d.tag,
    blurb: d.blurb,
    badge: d.badge,
    cats: d.cats,
    design: d,
  }));
  for (const p of BUILT_IN_STYLES) {
    out.push({
      kind: 'preset',
      id: p.id,
      name: p.name,
      tag: p.tag,
      blurb: p.tag,
      badge: 'Style',
      cats: ['presets'],
      s: presetState(p),
      design: designById(p.s.template ?? ''),
    });
  }
  for (const m of saved) {
    const design = designById(m.s.template ?? '');
    out.push({
      kind: 'mine',
      id: m.id,
      name: m.name,
      tag: `${design?.name ?? 'Unknown'} · your style`,
      blurb: 'Your saved style',
      badge: 'Mine',
      cats: ['mine'],
      s: m.s,
      design,
    });
  }
  return out;
}

/** "All" shows the designs only; other filters match a category. */
export function filterEntries(entries: readonly GalleryEntry[], filter: GalleryFilter): GalleryEntry[] {
  return entries.filter((e) => (filter === 'all' ? e.kind === 'tpl' : e.cats.includes(filter)));
}

/** The picked entries, in gallery order. Picks of deleted styles are skipped. */
export function pickedEntries(entries: readonly GalleryEntry[], picks: readonly string[]): GalleryEntry[] {
  const set = new Set(picks);
  return entries.filter((e) => set.has(e.id));
}

export function countText(n: number, filter: GalleryFilter): string {
  if (filter === 'mine') return `${n} saved`;
  if (filter === 'presets') return `${n} styles`;
  return `${n} of ${DESIGNS.length} designs`;
}

/** A design is active when no style is; a style when it is the active one. */
export function isActiveEntry(e: GalleryEntry, state: SignatureState, activeStyleId: string | null): boolean {
  return e.kind === 'tpl' ? !activeStyleId && state.template === e.id : activeStyleId === e.id;
}

/** The state a gallery card shows: your details in that design or style. */
export function entryState(e: GalleryEntry, state: SignatureState, activeStyleId: string | null): SignatureState {
  if (e.kind === 'tpl') {
    const keepTheme = e.id === state.template && !activeStyleId;
    return { ...state, template: e.id, ...(keepTheme ? {} : themeSettings(e.design.theme)) };
  }
  return applyStyle(state, e.s);
}

/** Picking a design: its suggested colours, and no style. */
export function pickDesign(state: SignatureState, design: DesignInfo): SignatureState {
  return { ...state, template: design.id, ...themeSettings(design.theme) };
}

export const STYLE_NAME_MAX = 40;

export function newStyle(state: SignatureState, name: string, count: number, now = new Date()): SavedStyle {
  const fallback = `${designById(state.template)?.name ?? 'My'} style ${count + 1}`;
  return {
    id: `my-${now.getTime().toString(36)}`,
    name: (name.trim() || fallback).slice(0, STYLE_NAME_MAX),
    s: styleOf(state),
    created: now.toISOString(),
  };
}

function textOf(v: unknown): string {
  return typeof v === 'string' ? v : typeof v === 'number' ? String(v) : '';
}

/** Saved styles from storage, keeping only entries that look like styles. */
export function sanitizeSaved(raw: unknown): SavedStyle[] {
  if (!Array.isArray(raw)) return [];
  const out: SavedStyle[] = [];
  for (const x of raw) {
    if (!isRecord(x) || !isRecord(x['s'])) continue;
    const id = textOf(x['id']);
    const name = textOf(x['name']);
    if (!id || !name) continue;
    const created = x['created'];
    out.push({ id, name, s: pickStyle(x['s']), ...(typeof created === 'string' ? { created } : {}) });
  }
  return out;
}

/** A style in a styles file. Only built-in styles have an id and a tag. */
export interface StyleItem {
  id: string;
  name: string;
  tag: string;
  s: StyleValues;
}

/** The first key of a styles file, with its format version. */
const STYLES_MARKER = 'signature-styles';
export const STYLES_FILE_NAME = 'signature-styles.yaml';

/**
 * Reads a styles file (versions 1 and 2), then a `styles` list. Each style has a `name`, optionally an `id` and
 * a `tag`, and the same style keys as the style section of a signature file. Styles without a name or a known
 * design are skipped. Returns null when the text is not a styles file.
 */
export function readStylesFile(text: string): StyleItem[] | null {
  let data: unknown;
  try {
    data = parse(text, { prettyErrors: false });
  } catch {
    return null;
  }
  if (!isRecord(data) || (data[STYLES_MARKER] !== 1 && data[STYLES_MARKER] !== 2) || !Array.isArray(data['styles']))
    return null;
  const out: StyleItem[] = [];
  for (const x of data['styles']) {
    if (!isRecord(x) || !designById(textOf(x['template']))) continue;
    const name = textOf(x['name']).trim().slice(0, STYLE_NAME_MAX);
    if (name) out.push({ id: textOf(x['id']), name, tag: textOf(x['tag']), s: pickStyle(x) });
  }
  return out;
}

/** The built-in styles, in gallery order. */
export const BUILT_IN_STYLES: readonly StyleItem[] = readStylesFile(BUILT_IN_STYLES_FILE) ?? [];

/** Your saved styles as a styles file. */
export function exportStyles(saved: readonly SavedStyle[]): string {
  const doc = new Document({ [STYLES_MARKER]: 2, styles: saved.map((m) => ({ name: m.name, ...m.s })) });
  doc.commentBefore = [
    ' Signature Studio styles file.',
    ' Import it in Signature Studio: Design > Import.',
    ' Each style is a look: a design, colours and options. It never holds your details.',
  ].join('\n');
  return doc.toString({ lineWidth: 0 });
}

export type ImportResult =
  { ok: true; styles: SavedStyle[]; added: number; message: string } | { ok: false; message: string };

/** Adds the styles in a styles file, skipping ones already saved. */
export function importStyles(text: string, existing: readonly SavedStyle[], now = new Date()): ImportResult {
  const list = readStylesFile(text);
  if (!list) return { ok: false, message: 'That file is not a Signature Studio styles file.' };
  const styles = [...existing];
  let added = 0;
  for (const { name, s } of list) {
    const json = JSON.stringify(s);
    if (styles.some((x) => x.name === name && JSON.stringify(x.s) === json)) continue;
    styles.push({ id: `my-${now.getTime().toString(36)}${added}`, name, s, created: now.toISOString() });
    added++;
  }
  return {
    ok: true,
    styles,
    added,
    message: added ? `Imported ${added} style${added > 1 ? 's' : ''}.` : 'No new styles in that file.',
  };
}

const COLS: readonly ColumnsSetting[] = ['auto', 1, 2, 3];
/* weighted towards the sizes that read best */
const SIZES: readonly PhotoSize[] = ['M', 'M', 'L', 'XL', 'S'];
const LOOKS: readonly PhotoLook[] = ['natural', 'natural', 'mono', 'duotone', 'sepia'];

/** A random, readable mix of design, colours and options. Your details stay as they are. */
export function shuffleState(
  state: SignatureState,
  rng: Rng = Math.random,
): { state: SignatureState; design: DesignInfo } {
  const design = pick(DESIGNS, rng);
  const next: SignatureState = {
    ...state,
    template: design.id,
    ...themeSettings(rng() < 0.5 ? design.theme : pick(THEME_LIST, rng).id),
    cols: pick(COLS, rng),
    photoSize: pick(SIZES, rng),
    iconStyle: pick(ICON_STYLES, rng).id,
    photoShape: pick(SHAPES, rng).id,
    photoLook: pick(LOOKS, rng),
    photoAnim: pick(
      ANIMS.filter((a) => a.id !== 'none'),
      rng,
    ).id,
    nameStyle: rng() < 0.35 ? 'hand' : 'typed',
    bgMode: rng() < 0.55 ? 'transparent' : 'solid',
    bgColor: pick(BACKGROUNDS, rng).id,
  };
  return { state: toState(next), design };
}
