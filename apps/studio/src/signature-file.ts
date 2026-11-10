/*
 * The signature file: one YAML file with your details, which of them show, the look, and your photo and logo as
 * base64. It opens in any browser's Studio.
 */
import { Document, Scalar, isMap, isScalar, parse } from 'yaml';
import { DEFAULTS, EMAIL_PROFILE_OPTIONS, STYLE_KEY_LIST, designById, isRecord, toState } from './engine.ts';
import type { SignatureState } from './engine.ts';
import { DETAIL_GROUPS, DETAIL_KEYS } from './fields.ts';
import { emptyDetails } from './sample.ts';

const SIGNATURE_FILE_VERSION = 2;
export const NOT_A_SIGNATURE_FILE = 'That file is not a Signature Studio signature file.';
export const NEWER_SIGNATURE_FILE =
  'That signature file is from a newer Signature Studio. Update this page and try again.';

const HEADER = [
  ' Signature Studio signature file.',
  ' Open it in Signature Studio: Use > Open signature file.',
  ' Keep it private: it holds your details and photo.',
].join('\n');

const GROUP_NOTES = new Map([
  ['details', ' Who you are'],
  ['contact', ' How to reach you'],
  ['extras', ' Message, sign-off, featured content and developer prompts'],
  ['show', ' What shows in the signature'],
  ['style', ' The look: design, colours and options'],
  ['images', ' Your photo and logo, as base64'],
]);

/** The style keys in the engine's order, with the animation setting. */
const STYLE_KEYS: readonly (keyof SignatureState)[] = Object.keys(DEFAULTS).filter(
  (k): k is keyof SignatureState => (STYLE_KEY_LIST as readonly string[]).includes(k) || k === 'motion',
);

export interface CurrentSignature {
  state: SignatureState;
  optimize: boolean;
  activeStyleId: string | null;
}

const DATA_URL = /^data:(image\/(?:png|jpeg|gif|webp));base64,([A-Za-z0-9+/=]+)$/;
const BASE64 = /^[A-Za-z0-9+/=]+$/;

/** Base64 in lines of 76 characters, as in email. */
export function wrapBase64(b64: string, width = 76): string {
  const lines: string[] = [];
  for (let i = 0; i < b64.length; i += width) lines.push(b64.slice(i, i + width));
  return lines.join('\n');
}

function block(text: string): Scalar {
  const s = new Scalar(text);
  s.type = Scalar.BLOCK_LITERAL;
  return s;
}

/** An image as `type` and wrapped base64 `data`, or as `src` when there is none. */
function imageOf(src: string): Record<string, unknown> {
  const m = DATA_URL.exec(src);
  return m ? { type: m[1], data: block(wrapBase64(m[2] ?? '')) } : { src };
}

function pickKeys<K extends string>(src: Readonly<Record<K, unknown>>, keys: readonly K[]): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const k of keys) out[k] = src[k];
  return out;
}

/** The signature file's content. The photo is left out when there is none or `withPhoto` is off. */
export function signatureYaml(cur: CurrentSignature, withPhoto: boolean, now = new Date()): string {
  const s = cur.state;
  const images: Record<string, unknown> = {};
  if (withPhoto && s.photo.src) {
    const { type, data, src } = imageOf(s.photo.src);
    images['photo'] = {
      ...(src === undefined ? { type } : { src }),
      zoom: s.photo.zoom,
      x: s.photo.dx,
      y: s.photo.dy,
      ...(data === undefined ? {} : { data }),
    };
  }
  images['logo'] = imageOf(s.logo.src);
  const doc = new Document({
    signature: SIGNATURE_FILE_VERSION,
    emailProfile: s.emailProfile,
    saved: now.toISOString(),
    details: pickKeys(s, DETAIL_GROUPS.details),
    contact: pickKeys(s, DETAIL_GROUPS.contact),
    extras: pickKeys(s, DETAIL_GROUPS.extras),
    show: { ...s.show },
    style: {
      ...pickKeys(s, STYLE_KEYS),
      place: { ...s.place },
      hosting: { ...s.hosting },
      optimize: cur.optimize,
      ...(cur.activeStyleId ? { activeStyle: cur.activeStyleId } : {}),
    },
    images,
  });
  doc.commentBefore = HEADER;
  if (isMap(doc.contents)) {
    for (const { key } of doc.contents.items) {
      const note = isScalar(key) ? GROUP_NOTES.get(String(key.value)) : undefined;
      if (!isScalar(key) || !note) continue;
      key.commentBefore = note;
      key.spaceBefore = true;
    }
  }
  return doc.toString({ lineWidth: 0 });
}

/** `sam-taylor.signature.yaml`, or `signature.yaml` without a name. */
export function signatureFileName(state: Pick<SignatureState, 'fullName'>): string {
  const slug = state.fullName
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
    .replace(/-+$/, '');
  return slug ? `${slug}.signature.yaml` : 'signature.yaml';
}

export interface SavedSignature {
  text: string;
  fileName: string;
  message: string;
}

export function saveSignature(cur: CurrentSignature, includePhoto: boolean, now = new Date()): SavedSignature {
  const withPhoto = !!(cur.state.photo.src && includePhoto);
  const fileName = signatureFileName(cur.state);
  const photoNote = cur.state.photo.src ? (withPhoto ? ', with your photo.' : ', without your photo.') : '.';
  return {
    text: signatureYaml(cur, withPhoto, now),
    fileName,
    message: `Saved ${fileName}${photoNote}`,
  };
}

export type OpenedSignature = ({ ok: true } & CurrentSignature & { message: string }) | { ok: false; message: string };

const TYPES: readonly (readonly [prefix: string, type: string])[] = [
  ['/9j/', 'image/jpeg'],
  ['iVBOR', 'image/png'],
  ['R0lGOD', 'image/gif'],
  ['UklGR', 'image/webp'],
];

function imageType(type: unknown, b64: string): string {
  const t = typeof type === 'string' ? type.trim().toLowerCase().replace('image/jpg', 'image/jpeg') : '';
  if (/^image\/(?:png|jpeg|gif|webp)$/.test(t)) return t;
  return TYPES.find(([p]) => b64.startsWith(p))?.[1] ?? 'image/png';
}

/** An image from the file: `undefined` when the file leaves it out, so the current one stays. */
function readImage(v: unknown): { src: string; zoom?: unknown; dx?: unknown; dy?: unknown } | undefined {
  if (v === undefined) return undefined;
  if (!isRecord(v)) return { src: '' };
  const data = typeof v['data'] === 'string' ? v['data'].replace(/\s+/g, '') : '';
  const src = data
    ? BASE64.test(data)
      ? `data:${imageType(v['type'], data)};base64,${data}`
      : ''
    : typeof v['src'] === 'string'
      ? v['src'].trim()
      : '';
  return { src, zoom: v['zoom'], dx: v['x'], dy: v['y'] };
}

function photoMessage(name: string, state: SignatureState, kept: boolean): string {
  return `Opened ${name}: ${designById(state.template)?.name ?? state.template}${
    kept ? ', keeping your current photo.' : '.'
  }`;
}

/** Reads the grouped signature file. Missing text is empty; missing switches and style settings get the defaults. */
function readGrouped(data: Record<string, unknown>, current: SignatureState, fileName: string): OpenedSignature {
  const version = data['signature'];
  if (typeof version === 'number' && version > SIGNATURE_FILE_VERSION)
    return { ok: false, message: NEWER_SIGNATURE_FILE };
  if (version !== 1 && version !== SIGNATURE_FILE_VERSION) return { ok: false, message: NOT_A_SIGNATURE_FILE };
  if (data['emailProfile'] !== undefined && !EMAIL_PROFILE_OPTIONS.some((p) => p.id === data['emailProfile']))
    return { ok: false, message: 'This email profile is not supported by this version of Signature Studio.' };
  const known = new Set<string>(DETAIL_KEYS);
  const text: Record<string, unknown> = {};
  for (const group of ['details', 'contact', 'extras'] as const) {
    const g = data[group];
    if (!isRecord(g)) continue;
    for (const [k, v] of Object.entries(g)) if (known.has(k)) text[k] = v ?? '';
  }
  const style = isRecord(data['style']) ? data['style'] : {};
  const look: Record<string, unknown> = {};
  for (const k of [...STYLE_KEYS, 'theme', 'customColors'])
    if (style[k] !== undefined && style[k] !== null) look[k] = style[k];
  if (isRecord(style['place'])) look['place'] = style['place'];
  if (isRecord(style['hosting'])) look['hosting'] = style['hosting'];
  const images = isRecord(data['images']) ? data['images'] : {};
  const photo = readImage(images['photo']);
  const logo = readImage(images['logo']);
  const kept = !photo && !!current.photo.src;
  const state = toState({
    emailProfile: data['emailProfile'] ?? 'outlook',
    ...emptyDetails(),
    ...text,
    ...look,
    show: isRecord(data['show']) ? data['show'] : {},
    photo: photo ?? current.photo,
    logo: { src: logo ? logo.src : current.logo.src },
  });
  const active = style['activeStyle'];
  return {
    ok: true,
    state,
    optimize: style['optimize'] !== false,
    activeStyleId: typeof active === 'string' && active ? active : null,
    message: photoMessage(fileName || 'the signature file', state, kept),
  };
}

/** Opens a signature file. */
export function readSignatureFile(text: string, current: SignatureState, fileName = ''): OpenedSignature {
  let data: unknown;
  try {
    data = parse(text, { prettyErrors: false });
  } catch {
    return { ok: false, message: NOT_A_SIGNATURE_FILE };
  }
  if (isRecord(data) && 'signature' in data) return readGrouped(data, current, fileName);
  return { ok: false, message: NOT_A_SIGNATURE_FILE };
}
