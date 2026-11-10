/*
 * The three stores, each kept in the browser: the signature (details and look), the Studio's view settings, and the
 * styles saved under My styles.
 */
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { isRecord, setOptimize, toState } from './engine.ts';
import type {
  ExtraKind,
  HostingSettings,
  PhotoSettings,
  Placement,
  ShowFlags,
  SignatureState,
  Version,
} from './engine.ts';
import type { TextKey } from './fields.ts';
import { sampleState } from './sample.ts';
import { STYLE_BREAKING_KEYS, STYLE_NAME_MAX, isGalleryFilter, sanitizeSaved } from './styles.ts';
import type { GalleryFilter, SavedStyle } from './styles.ts';

const STATE_KEY = 'signature-studio.state.v5';
export const UI_KEY = 'signature-studio.ui.v5';
const STYLES_KEY = 'signature-studio.styles.v5';

/** localStorage, or null when the browser blocks it (some private modes do). */
function safeStorage(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

const storage = createJSONStorage(() => safeStorage() ?? sessionStorage);

/* ---------- Signature ---------- */

interface SignatureData {
  /** Always a full, valid state: every write goes through normalize. */
  state: SignatureState;
  /** Smaller images (8-bit PNG and GIF) where they look the same. */
  optimize: boolean;
  /** The preset or saved style the look came from, until a style setting changes. */
  activeStyleId: string | null;
}

interface SignatureActions {
  /** Changes settings or details. Changing a style setting such as icons or columns ends the active style. */
  update: (patch: Partial<SignatureState>) => void;
  /** Sets a text field such as the job title. */
  setText: (key: TextKey, value: string) => void;
  setShow: (key: keyof ShowFlags, on: boolean) => void;
  setPlace: (key: ExtraKind, place: Placement) => void;
  setPhoto: (patch: Partial<PhotoSettings>) => void;
  setHosting: (patch: Partial<HostingSettings>) => void;
  setOptimize: (on: boolean) => void;
  setActiveStyle: (id: string | null) => void;
  setLogo: (src: string) => void;
  /** Replaces everything: a picked style, a shuffle, an opened file, a sample or a blank signature. */
  replace: (state: SignatureState, opts?: { activeStyleId?: string | null; optimize?: boolean }) => void;
}

function breaksStyle(state: SignatureState, patch: Partial<SignatureState>): boolean {
  return STYLE_BREAKING_KEYS.some((k) => k in patch && patch[k] !== state[k]);
}

export const useSignatureStore = create<SignatureData & SignatureActions>()(
  persist(
    (set) => ({
      state: sampleState(),
      optimize: true,
      activeStyleId: null,
      update: (patch) =>
        set((s) => ({
          state: toState({ ...s.state, ...patch }),
          activeStyleId: breaksStyle(s.state, patch) ? null : s.activeStyleId,
        })),
      setText: (key, value) => set((s) => ({ state: toState({ ...s.state, [key]: value }) })),
      setShow: (key, on) => set((s) => ({ state: { ...s.state, show: { ...s.state.show, [key]: on } } })),
      setPlace: (key, place) => set((s) => ({ state: { ...s.state, place: { ...s.state.place, [key]: place } } })),
      setPhoto: (patch) => set((s) => ({ state: toState({ ...s.state, photo: { ...s.state.photo, ...patch } }) })),
      setHosting: (patch) => set((s) => ({ state: { ...s.state, hosting: { ...s.state.hosting, ...patch } } })),
      setOptimize: (on) => set({ optimize: on }),
      setActiveStyle: (id) => set({ activeStyleId: id }),
      setLogo: (src) => set((s) => ({ state: toState({ ...s.state, logo: { src } }) })),
      replace: (state, opts = {}) =>
        set((s) => ({
          state: toState(state),
          activeStyleId: opts.activeStyleId === undefined ? null : opts.activeStyleId,
          optimize: opts.optimize ?? s.optimize,
        })),
    }),
    {
      name: STATE_KEY,
      storage,
      partialize: (s): SignatureData => ({ state: s.state, optimize: s.optimize, activeStyleId: s.activeStyleId }),
      merge: (persisted, current) => {
        if (!isRecord(persisted)) return current;
        const style = persisted['activeStyleId'];
        return {
          ...current,
          state: toState(persisted['state']),
          optimize: persisted['optimize'] !== false,
          activeStyleId: typeof style === 'string' && style ? style : null,
        };
      },
    },
  ),
);

/* A first visit keeps its random sample person, so a reload shows the same one. */
if (safeStorage()?.getItem(STATE_KEY) === null) useSignatureStore.setState({});

/* The engine reads the optimise setting from a module-level switch, so keep it in step with the store. */
setOptimize(useSignatureStore.getState().optimize);
useSignatureStore.subscribe((s, prev) => {
  if (s.optimize !== prev.optimize) setOptimize(s.optimize);
});

/* ---------- Saved styles ---------- */

interface StylesStore {
  saved: SavedStyle[];
  add: (style: SavedStyle) => void;
  rename: (id: string, name: string) => void;
  update: (id: string, s: SavedStyle['s']) => void;
  remove: (id: string) => void;
  setAll: (saved: SavedStyle[]) => void;
}

export const useStylesStore = create<StylesStore>()(
  persist(
    (set) => ({
      saved: [],
      add: (style) => set((st) => ({ saved: [...st.saved, style] })),
      rename: (id, name) => {
        const clean = name.trim().slice(0, STYLE_NAME_MAX);
        if (!clean) return;
        set((st) => ({ saved: st.saved.map((m) => (m.id === id ? { ...m, name: clean } : m)) }));
      },
      update: (id, s) => set((st) => ({ saved: st.saved.map((m) => (m.id === id ? { ...m, s } : m)) })),
      remove: (id) => set((st) => ({ saved: st.saved.filter((m) => m.id !== id) })),
      setAll: (saved) => set({ saved }),
    }),
    {
      name: STYLES_KEY,
      storage,
      partialize: (st) => ({ saved: st.saved }),
      merge: (persisted, current) => ({
        ...current,
        saved: isRecord(persisted) ? sanitizeSaved(persisted['saved']) : current.saved,
      }),
    },
  ),
);

/* ---------- Studio view ---------- */

export const PANES = [
  { id: 'design', label: 'Design', title: 'Pick a design or a saved style' },
  { id: 'layout', label: 'Layout & colour', title: 'Columns, placement, colours and background' },
  { id: 'photo', label: 'Photo & logo', title: 'Your images, their size and appearance' },
  { id: 'name', label: 'Typography', title: 'Fonts, readable sizes and handwritten names' },
  { id: 'icons', label: 'Icons', title: 'Drawing family, style, weight and colour' },
  { id: 'details', label: 'Profile', title: 'Who you are' },
  { id: 'contact', label: 'Contact', title: 'Phone, email and links' },
  {
    id: 'extras',
    label: 'Extras',
    title: 'Tagline, banner, sign-off, focus areas, featured items, highlights and quote',
  },
  { id: 'reply', label: 'Reply', title: 'The short version for replies and forwards' },
  { id: 'check', label: 'Check', title: 'Signature health and email compatibility' },
  { id: 'files', label: 'Use', title: 'Copy, install and save your signature' },
] as const;
export type PaneId = (typeof PANES)[number]['id'];

export const FLOW = [
  { id: 'details', label: 'Details', panes: ['details', 'contact', 'photo', 'extras'] },
  { id: 'design', label: 'Design', panes: ['design'] },
  { id: 'style', label: 'Style', panes: ['layout', 'name', 'icons', 'reply'] },
  { id: 'check', label: 'Check', panes: ['check'] },
  { id: 'use', label: 'Use', panes: ['files'] },
] as const satisfies readonly { id: string; label: string; panes: readonly PaneId[] }[];
export type StepId = (typeof FLOW)[number]['id'];

export function stepForPane(pane: PaneId) {
  const step = FLOW.find((s) => s.panes.some((p) => p === pane));
  if (!step) throw new Error(`No editor section for ${pane}`);
  return step;
}

export const APP_THEMES = [
  { id: 'auto', label: 'Auto' },
  { id: 'light', label: 'Light' },
  { id: 'dark', label: 'Dark' },
] as const;
export type AppTheme = (typeof APP_THEMES)[number]['id'];
export const isAppTheme = (v: unknown): v is AppTheme => APP_THEMES.some((t) => t.id === v);

export type Device = 'desktop' | 'tablet' | 'phone';
export type ViewMode = 'single' | 'compare';
export type CompareTheme = 'suggested' | 'mine';
/** On a narrow screen, whether the settings or the preview show. */
export type NarrowView = 'edit' | 'preview';
/** Which start-over dialog is open. */
export type StartOver = 'blank' | 'sample' | 'reset';

function isPane(v: unknown): v is PaneId {
  return PANES.some((p) => p.id === v);
}
const isDevice = (v: unknown): v is Device => v === 'desktop' || v === 'tablet' || v === 'phone';

/** Most entries Compare can be asked to show side by side. */
export const MAX_PICKS = 60;

function sanitizePicks(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  const out = new Set<string>();
  for (const x of v) if (typeof x === 'string' && x) out.add(x);
  return [...out].slice(0, MAX_PICKS);
}

interface UiData {
  pane: PaneId;
  appTheme: AppTheme;
  version: Version;
  mode: ViewMode;
  dark: boolean;
  device: Device;
  filter: GalleryFilter;
  compareTheme: CompareTheme;
  /** Designs and styles picked to compare, by gallery entry id. */
  picks: string[];
  /** Compare shows everything in the filter even when some are picked. Not kept between visits. */
  compareShowAll: boolean;
  /** "Include my uploaded photo" when saving a signature file. */
  includePhoto: boolean;
  /** What the last file save or open did, shown in the Files section. Not kept between visits. */
  fileNote: string;
  startOver: StartOver | null;
  /** On a narrow screen, the settings or the preview. Not kept between visits. */
  narrowView: NarrowView;
}

interface UiActions {
  /** Back to the view a first visit opens on. Your work and your view settings stay. */
  goHome: () => void;
  setPane: (pane: PaneId) => void;
  setAppTheme: (theme: AppTheme) => void;
  setVersion: (version: Version) => void;
  setMode: (mode: ViewMode) => void;
  setDark: (dark: boolean) => void;
  setDevice: (device: Device) => void;
  setFilter: (filter: GalleryFilter) => void;
  setCompareTheme: (theme: CompareTheme) => void;
  togglePick: (id: string) => void;
  unpick: (id: string) => void;
  clearPicks: () => void;
  setCompareShowAll: (on: boolean) => void;
  setIncludePhoto: (on: boolean) => void;
  setFileNote: (note: string) => void;
  setStartOver: (which: StartOver | null) => void;
  setNarrowView: (view: NarrowView) => void;
}

/** The Studio view on a first visit, and after Reset everything. */
const UI_DEFAULTS: UiData = {
  pane: 'details',
  appTheme: 'auto',
  version: 'new',
  mode: 'single',
  dark: false,
  device: 'desktop',
  filter: 'all',
  compareTheme: 'suggested',
  picks: [],
  compareShowAll: false,
  includePhoto: true,
  fileNote: '',
  startOver: null,
  narrowView: 'edit',
};

export const useUiStore = create<UiData & UiActions>()(
  persist(
    (set) => ({
      ...UI_DEFAULTS,
      goHome: () =>
        set({
          pane: UI_DEFAULTS.pane,
          version: UI_DEFAULTS.version,
          mode: UI_DEFAULTS.mode,
          narrowView: UI_DEFAULTS.narrowView,
        }),
      // The Reply section is about the reply version, so it shows that version. Picking a section on a narrow screen
      // goes back to editing.
      setPane: (pane) =>
        set(pane === 'reply' ? { pane, version: 'reply', narrowView: 'edit' } : { pane, narrowView: 'edit' }),
      setVersion: (version) => set({ version }),
      setAppTheme: (appTheme) => set({ appTheme }),
      setMode: (mode) => set({ mode }),
      setDark: (dark) => set({ dark }),
      setDevice: (device) => set({ device }),
      setFilter: (filter) => set({ filter }),
      setCompareTheme: (compareTheme) => set({ compareTheme }),
      togglePick: (id) =>
        set((u) => ({
          picks: u.picks.includes(id) ? u.picks.filter((p) => p !== id) : [...u.picks, id].slice(0, MAX_PICKS),
        })),
      unpick: (id) => set((u) => ({ picks: u.picks.filter((p) => p !== id) })),
      clearPicks: () => set({ picks: [], compareShowAll: false }),
      setCompareShowAll: (compareShowAll) => set({ compareShowAll }),
      setIncludePhoto: (includePhoto) => set({ includePhoto }),
      setFileNote: (fileNote) => set({ fileNote }),
      setStartOver: (startOver) => set({ startOver }),
      setNarrowView: (narrowView) => set({ narrowView }),
    }),
    {
      name: UI_KEY,
      storage,
      partialize: (u) => ({
        pane: u.pane,
        appTheme: u.appTheme,
        dark: u.dark,
        device: u.device,
        filter: u.filter,
        compareTheme: u.compareTheme,
        picks: u.picks,
      }),
      merge: (persisted, current) => {
        if (!isRecord(persisted)) return current;
        const { pane, appTheme, dark, device, filter, compareTheme, picks } = persisted;
        return {
          ...current,
          pane: isPane(pane) ? pane : current.pane,
          appTheme: isAppTheme(appTheme) ? appTheme : 'auto',
          version: pane === 'reply' ? 'reply' : current.version,
          dark: typeof dark === 'boolean' ? dark : current.dark,
          device: isDevice(device) ? device : current.device,
          filter: isGalleryFilter(filter) ? filter : current.filter,
          compareTheme: compareTheme === 'mine' ? 'mine' : 'suggested',
          picks: sanitizePicks(picks),
        };
      },
    },
  ),
);

/** Back to a first visit: a new sample person with default settings, no saved styles and the default Studio view. */
export function resetEverything(): void {
  useSignatureStore.setState({ state: sampleState(), optimize: true, activeStyleId: null });
  useStylesStore.setState({ saved: [] });
  useUiStore.setState(UI_DEFAULTS);
}
