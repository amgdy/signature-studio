/*
 * The Studio's hooks: building signatures, the accessibility check, toasts, and the actions behind the buttons
 * (copy and save, images, styles and signature files).
 */
import { toast } from 'sonner';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import type { RefObject } from 'react';
import {
  CancelledError,
  ResultCache,
  backgroundBuilds,
  build,
  checkSignatureHealth,
  copyRich,
  copyText,
  download,
  downloadHtml,
  fingerprint,
  imagesPackage,
  isOptimized,
  outlookPackage,
} from './engine.ts';
import type { BuildOptions, BuildResult, SignatureHealthReport, SignatureState, Version } from './engine.ts';
import {
  PhotoError,
  YAML_FILES,
  errorText,
  hostingMode,
  pickFile,
  plural,
  readLogo,
  readPhoto,
  saveYaml,
} from './fields.ts';
import { blankState, sampleState } from './sample.ts';
import { NOT_A_SIGNATURE_FILE, readSignatureFile, saveSignature } from './signature-file.ts';
import { resetEverything, useSignatureStore, useStylesStore, useUiStore } from './store.ts';
import type { StartOver } from './store.ts';
import {
  STYLES_FILE_NAME,
  applyStyle,
  exportStyles,
  importStyles,
  newStyle,
  pickDesign,
  shuffleState,
  styleOf,
} from './styles.ts';
import type { GalleryEntry } from './styles.ts';

/* ---------- Small helpers ---------- */

/** The value, once it has stopped changing for `delay` ms. */
export function useDebouncedValue<T>(value: T, delay: number): T {
  const [settled, setSettled] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setSettled(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return settled;
}

/**
 * The value an async function resolves to, for picker previews (icons, photo shapes, handwriting).
 * Pass a memoised function: it runs again only when it changes, and results of older runs are dropped.
 * While a new run is on its way the last value stays, so previews do not flash empty.
 */
export function useAsyncValue<T>(make: () => Promise<T>): T | null {
  const [out, setOut] = useState<{ make: () => Promise<T>; value: T | null } | null>(null);
  useEffect(() => {
    let live = true;
    const run = async (): Promise<void> => {
      try {
        const value = await make();
        if (live) setOut({ make, value });
      } catch {
        if (live) setOut({ make, value: null });
      }
    };
    void run();
    return () => {
      live = false;
    };
  }, [make]);
  return out?.value ?? null;
}

/** True once the element has scrolled near the viewport. It stays true, so work started for it is kept. */
export function useInView(ref: RefObject<Element | null>, margin = '200px'): boolean {
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || seen) return undefined;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) setSeen(true);
      },
      { rootMargin: margin },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [ref, margin, seen]);
  return seen;
}

export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const mq = window.matchMedia(query);
      mq.addEventListener('change', onChange);
      return () => mq.removeEventListener('change', onChange);
    },
    [query],
  );
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false,
  );
}

/* ---------- Toasts ---------- */

type NotifyIntent = 'success' | 'warning' | 'error' | 'info';
export type Notify = (text: string, intent?: NotifyIntent) => void;

const showToast: Notify = (text, intent = 'success') => {
  toast[intent](text, { testId: 'toast', duration: 8000 });
};

/** Shows a short message in a toast. The Toaster announces it to screen readers. */
export const useNotify = (): Notify => showToast;

/* ---------- Builds ---------- */

export interface SignatureBuild {
  result: BuildResult | null;
  error: string | null;
  building: boolean;
}

/** The current build, made once in App and shared by the preview, the actions and the Check section. */
export const SignatureContext = createContext<SignatureBuild>({ result: null, error: null, building: true });

export function useCurrentSignature(): SignatureBuild {
  return useContext(SignatureContext);
}

/** Wait this long after a change before building, so typing does not build on every key. */
const BUILD_DELAY = 120;

interface Built {
  input: object | null;
  result: BuildResult | null;
  error: string | null;
}

/**
 * Builds the signature for the preview. Builds are debounced, and each one carries a sequence number, so an older
 * build that finishes late never replaces a newer one.
 */
export function useSignatureBuild(state: SignatureState, version: Version, optimize: boolean): SignatureBuild {
  // `optimize` is read by the engine itself (setOptimize); it is part of the input so a change rebuilds.
  const input = useMemo(() => ({ state, version, optimize }), [state, version, optimize]);
  const [built, setBuilt] = useState<Built>({ input: null, result: null, error: null });
  const seq = useRef(0);

  useEffect(() => {
    const my = ++seq.current;
    const run = async (): Promise<void> => {
      try {
        const result = await build(input.state, { version: input.version });
        if (my === seq.current) setBuilt({ input, result, error: null });
      } catch (e) {
        if (my === seq.current) setBuilt((b) => ({ input, result: b.result, error: errorText(e) }));
      }
    };
    const timer = setTimeout(() => void run(), my === 1 ? 0 : BUILD_DELAY);
    return () => clearTimeout(timer);
  }, [input]);

  return { result: built.result, error: built.error, building: built.input !== input };
}

const cache = new ResultCache<BuildResult>(90);

function keyOf(state: SignatureState, opts: BuildOptions): string {
  return JSON.stringify([
    {
      ...state,
      photo: { ...state.photo, src: fingerprint(state.photo.src) },
      logo: { src: fingerprint(state.logo.src) },
    },
    opts,
    isOptimized(),
  ]);
}

interface Job {
  key: string;
  state: SignatureState;
  opts: BuildOptions;
}

/**
 * Builds a signature in the background queue: for thumbnails and side-by-side previews. Pass null to skip.
 * Changing the inputs cancels the waiting build. The last result stays on show while the next one builds,
 * so cards do not flash empty; `building` says it is out of date.
 */
export function useQueuedBuild(state: SignatureState | null, opts: BuildOptions): SignatureBuild {
  const key = state ? keyOf(state, opts) : '';
  // oxlint-disable-next-line react/exhaustive-deps -- the key covers state and opts, so equal inputs never rebuild
  const job = useMemo<Job | null>(() => (state ? { key, state, opts } : null), [key]);
  const [out, setOut] = useState<{ key: string; result: BuildResult | null; error: string | null }>({
    key: '',
    result: null,
    error: null,
  });
  const hit = key ? cache.get(key) : undefined;

  useEffect(() => {
    if (!job || cache.get(job.key)) return undefined;
    const queued = backgroundBuilds.enqueue(() => build(job.state, job.opts));
    const wait = async (): Promise<void> => {
      try {
        const result = await queued.promise;
        cache.set(job.key, result);
        setOut({ key: job.key, result, error: null });
      } catch (e) {
        if (!(e instanceof CancelledError)) setOut({ key: job.key, result: null, error: errorText(e) });
      }
    };
    void wait();
    return queued.cancel;
  }, [job]);

  return {
    result: hit ?? out.result,
    error: !hit && out.key === key ? out.error : null,
    building: Boolean(key) && !hit && out.key !== key,
  };
}

/* ---------- Signature health ---------- */

interface CheckOutput {
  report: SignatureHealthReport | null;
  error: string | null;
}

async function runCheck(results: BuildResult[], signal: AbortSignal): Promise<SignatureHealthReport> {
  const stage = document.createElement('div');
  stage.setAttribute('aria-hidden', 'true');
  stage.style.cssText = 'position:absolute;left:-10000px;top:0;width:680px;visibility:hidden;pointer-events:none';
  document.body.append(stage);
  try {
    return await checkSignatureHealth(results, stage, signal);
  } finally {
    stage.remove();
  }
}

/** Checks a matched pair of builds, and never shows an older report for newer settings. */
export function useSignatureHealth(
  result: BuildResult | null,
): CheckOutput & { checking: boolean; recheck: () => void } {
  const [revision, setRevision] = useState(0);
  const [out, setOut] = useState<CheckOutput & { result: BuildResult | null; revision: number }>({
    report: null,
    error: null,
    result: null,
    revision: -1,
  });

  useEffect(() => {
    if (!result) return undefined;
    const controller = new AbortController();
    const queued = backgroundBuilds.enqueue(() =>
      build(result.state, { version: result.version === 'new' ? 'reply' : 'new' }),
    );
    const run = async (): Promise<void> => {
      try {
        const other = await queued.promise;
        controller.signal.throwIfAborted();
        const results = result.version === 'new' ? [result, other] : [other, result];
        const report = await runCheck(results, controller.signal);
        if (!controller.signal.aborted) setOut({ report, error: null, result, revision });
      } catch (e) {
        if (!controller.signal.aborted && !(e instanceof CancelledError))
          setOut({ report: null, error: errorText(e), result, revision });
      }
    };
    void run();
    return () => {
      controller.abort();
      queued.cancel();
    };
  }, [result, revision]);

  const current = !!result && out.result === result && out.revision === revision;
  const recheck = useCallback(() => setRevision((n) => n + 1), []);
  return {
    report: current ? out.report : null,
    error: current ? out.error : null,
    checking: !!result && !current,
    recheck,
  };
}

/* ---------- Copy and save the signature ---------- */

export interface CopyActions {
  copy: () => Promise<void>;
  copyHtml: () => Promise<void>;
  copyText: () => Promise<void>;
  saveHtmlFile: () => void;
  outlookPackage: () => Promise<void>;
  imagesPackage: () => Promise<void>;
}

const PROFILE_HINTS = {
  outlook: 'In Outlook open Settings › Signatures, click into the editor and press Ctrl+V.',
};

async function bothVersions(): Promise<BuildResult[]> {
  const { state } = useSignatureStore.getState();
  return Promise.all([build(state, { version: 'new' }), build(state, { version: 'reply' })]);
}

/**
 * Copying and saving the signature shown in the preview. Nothing is copied while the shown signature is out of
 * date (a change is still building) or could not be built, so Copy never hands over an older signature.
 */
export function useCopyActions({ result, error, building }: SignatureBuild): CopyActions {
  const notify = useNotify();

  const ready = useCallback((): BuildResult | null => {
    if (!result) return null;
    if (error) {
      notify(
        'The signature could not be built, so nothing was copied or saved. See the message in the preview.',
        'warning',
      );
      return null;
    }
    if (building) {
      notify('Your latest change is still being built. Try again in a moment.', 'warning');
      return null;
    }
    return result;
  }, [notify, result, error, building]);

  const copy = useCallback(async () => {
    const shown = ready();
    if (!shown) return;
    const { hosting } = useSignatureStore.getState().state;
    const mode = hostingMode({ hosting });
    if (hosting.mode === 'hosted' && mode !== 'hosted') {
      notify('Add the image folder URL first, or switch back to embedded images.', 'warning');
    }
    const which = shown.version === 'reply' ? 'Reply signature' : 'Signature';
    try {
      await copyRich(shown.html(mode, hosting.base), shown.text);
      notify(`${which} copied. ${PROFILE_HINTS[shown.state.emailProfile]}`);
    } catch {
      notify('This view blocks the clipboard. Open the file in Edge or Chrome, or use Save .html.', 'warning');
    }
  }, [notify, ready]);

  const copyHtml = useCallback(async () => {
    const shown = ready();
    if (!shown) return;
    const { hosting } = useSignatureStore.getState().state;
    try {
      await copyText(shown.html(hostingMode({ hosting }), hosting.base));
      notify('HTML code copied.');
    } catch {
      notify('This view blocks the clipboard. Use Save .html instead.', 'warning');
    }
  }, [notify, ready]);

  const copyPlain = useCallback(async () => {
    const shown = ready();
    if (!shown) return;
    try {
      await copyText(shown.text);
      notify('Plain-text version copied.');
    } catch {
      notify('This view blocks the clipboard.', 'warning');
    }
  }, [notify, ready]);

  const saveHtmlFile = useCallback(() => {
    const shown = ready();
    if (!shown) return;
    const { hosting } = useSignatureStore.getState().state;
    downloadHtml(shown, hostingMode({ hosting }), hosting.base);
    notify('HTML file saved.');
  }, [notify, ready]);

  const saveOutlook = useCallback(async () => {
    try {
      const p = outlookPackage(await bothVersions());
      download(p.blob, p.filename);
      notify(
        `Saved ${p.filename} with the new-message and reply signatures. Extract it into %APPDATA%\\Microsoft\\Signatures with Outlook closed.`,
      );
    } catch (e) {
      notify(`The package could not be built: ${errorText(e)}`, 'warning');
    }
  }, [notify]);

  const saveImages = useCallback(async () => {
    try {
      const p = imagesPackage(await bothVersions());
      download(p.blob, p.filename);
      notify(`Saved ${p.filename}. Upload these files to your image folder.`);
    } catch (e) {
      notify(`The images could not be saved: ${errorText(e)}`, 'warning');
    }
  }, [notify]);

  return {
    copy,
    copyHtml,
    copyText: copyPlain,
    saveHtmlFile,
    outlookPackage: saveOutlook,
    imagesPackage: saveImages,
  };
}

/* ---------- Photo and logo ---------- */

type Upload = (file: File | null | undefined) => Promise<boolean>;

function useUpload(read: (file: File) => Promise<string>, apply: (src: string) => void, done: string): Upload {
  const notify = useNotify();
  return useCallback(
    async (file) => {
      if (!file) return false;
      try {
        apply(await read(file));
        notify(done);
        return true;
      } catch (e) {
        notify(e instanceof PhotoError ? e.message : errorText(e), 'warning');
        return false;
      }
    },
    [notify, read, apply, done],
  );
}

/** Puts an uploaded photo in the signature, scaled down, and switches the photo on. Resolves true when it worked. */
export function usePhotoUpload(): Upload {
  return useUpload(readPhoto, setUploadedPhoto, 'Photo updated.');
}

function setUploadedPhoto(src: string): void {
  const sig = useSignatureStore.getState();
  sig.setPhoto({ src });
  sig.setShow('photo', true);
}

/** Puts an uploaded logo in the signature, scaled down to fit a 128 px square, as a PNG, and switches the logo on. */
export function useLogoUpload(): Upload {
  return useUpload(readLogo, setUploadedLogo, 'Logo updated.');
}

function setUploadedLogo(src: string): void {
  const sig = useSignatureStore.getState();
  sig.setLogo(src);
  sig.setShow('logo', true);
}

/** Reads an image only to find its colours; it is not added to the signature. `apply` must be stable. */
export function useColourImage(apply: (src: string) => void): Upload {
  return useUpload(readLogo, apply, 'Colours found in the image.');
}

/* ---------- Styles ---------- */

export interface StyleActions {
  pick: (e: GalleryEntry) => void;
  save: (name: string) => void;
  updateWithCurrent: (id: string) => void;
  rename: (id: string, name: string) => void;
  remove: (id: string) => void;
  exportAll: () => void;
  importFile: () => Promise<void>;
  shuffle: () => void;
}

/** Picking designs and styles, and managing saved styles. */
export function useStyleActions(): StyleActions {
  const notify = useNotify();

  const pick = useCallback(
    (e: GalleryEntry) => {
      const sig = useSignatureStore.getState();
      useUiStore.getState().setMode('single');
      if (e.kind === 'tpl') {
        sig.replace(pickDesign(sig.state, e.design), { activeStyleId: null });
        return;
      }
      sig.replace(applyStyle(sig.state, e.s), { activeStyleId: e.id });
      notify(`${e.name} applied. Your details stay as they are.`);
    },
    [notify],
  );

  const save = useCallback(
    (name: string) => {
      const sig = useSignatureStore.getState();
      const styles = useStylesStore.getState();
      const m = newStyle(sig.state, name, styles.saved.length);
      styles.add(m);
      sig.setActiveStyle(m.id);
      useUiStore.getState().setFilter('mine');
      notify(`Saved “${m.name}” under My styles.`);
    },
    [notify],
  );

  const updateWithCurrent = useCallback(
    (id: string) => {
      const sig = useSignatureStore.getState();
      const styles = useStylesStore.getState();
      const m = styles.saved.find((x) => x.id === id);
      if (!m) return;
      styles.update(id, styleOf(sig.state));
      sig.setActiveStyle(id);
      notify(`Updated “${m.name}” with the current look.`);
    },
    [notify],
  );

  const rename = useCallback((id: string, name: string) => useStylesStore.getState().rename(id, name), []);

  const remove = useCallback(
    (id: string) => {
      const styles = useStylesStore.getState();
      const m = styles.saved.find((x) => x.id === id);
      if (!m) return;
      styles.remove(id);
      useUiStore.getState().unpick(id);
      const sig = useSignatureStore.getState();
      if (sig.activeStyleId === id) sig.setActiveStyle(null);
      notify(`Deleted “${m.name}”.`);
    },
    [notify],
  );

  const exportAll = useCallback(() => {
    const { saved } = useStylesStore.getState();
    if (!saved.length) {
      notify('No saved styles to export yet. Save one first.', 'warning');
      return;
    }
    saveYaml(exportStyles(saved), STYLES_FILE_NAME);
    notify(`Exported ${plural(saved.length, 'style')} to ${STYLES_FILE_NAME}.`);
  }, [notify]);

  const importFile = useCallback(async () => {
    const file = await pickFile(YAML_FILES);
    if (!file) return;
    const styles = useStylesStore.getState();
    const r = importStyles(await file.text(), styles.saved);
    if (!r.ok) {
      notify(r.message, 'warning');
      return;
    }
    styles.setAll(r.styles);
    useUiStore.getState().setFilter('mine');
    notify(r.message, r.added ? 'success' : 'info');
  }, [notify]);

  const shuffle = useCallback(() => {
    const sig = useSignatureStore.getState();
    const next = shuffleState(sig.state);
    sig.replace(next.state, { activeStyleId: null });
    useUiStore.getState().setMode('single');
    notify(`New mix: ${next.design.name}. Shuffle again, or keep it with Save as my style.`);
  }, [notify]);

  return { pick, save, updateWithCurrent, rename, remove, exportAll, importFile, shuffle };
}

/* ---------- Signature files and starting over ---------- */

export interface FileActions {
  save: () => void;
  open: () => Promise<void>;
  /** Opens a dropped or picked file. */
  openFile: (file: File) => Promise<boolean>;
  /** Opens a signature file from its text. */
  openText: (text: string, fileName?: string) => boolean;
  /** A blank signature or a random sample person, both with default settings, or a full reset. */
  startOver: (which: StartOver) => void;
}

/** Saving and opening signature files, and starting again with a blank signature or a random sample. */
export function useFileActions(): FileActions {
  const notify = useNotify();

  const save = useCallback(() => {
    const { state, optimize, activeStyleId } = useSignatureStore.getState();
    const ui = useUiStore.getState();
    const out = saveSignature({ state, optimize, activeStyleId }, ui.includePhoto);
    saveYaml(out.text, out.fileName);
    ui.setFileNote(out.message);
    notify(out.message);
  }, [notify]);

  const openText = useCallback(
    (text: string, fileName?: string) => {
      const sig = useSignatureStore.getState();
      const r = readSignatureFile(text, sig.state, fileName);
      if (!r.ok) {
        notify(r.message, 'warning');
        return false;
      }
      sig.replace(r.state, { activeStyleId: r.activeStyleId, optimize: r.optimize });
      useUiStore.getState().setFileNote(r.message);
      notify(r.message);
      return true;
    },
    [notify],
  );

  const openFile = useCallback(
    async (file: File) => {
      try {
        return openText(await file.text(), file.name);
      } catch {
        notify(NOT_A_SIGNATURE_FILE, 'warning');
        return false;
      }
    },
    [notify, openText],
  );

  const open = useCallback(async () => {
    const file = await pickFile(YAML_FILES);
    if (file) await openFile(file);
  }, [openFile]);

  const startOver = useCallback(
    (which: StartOver) => {
      let message: string;
      if (which === 'reset') {
        resetEverything();
        message = 'Everything is reset. The Studio is back to how it was on your first visit.';
      } else {
        const next = which === 'blank' ? blankState() : sampleState();
        useSignatureStore.getState().replace(next, { activeStyleId: null, optimize: true });
        if (which === 'blank') useUiStore.getState().setPane('details');
        message =
          which === 'blank'
            ? 'Blank signature ready. Add your name in Details.'
            : `Sample person: ${next.fullName}. Every setting is back to its default.`;
      }
      useUiStore.getState().setFileNote(message);
      notify(message);
    },
    [notify],
  );

  return { save, open, openFile, openText, startOver };
}
