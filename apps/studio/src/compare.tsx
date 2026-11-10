/*
 * Compare: designs and styles side by side, each with its new-message and reply versions. With picks it shows only
 * the picked ones; without, everything in the gallery filter.
 */
import { cn } from 'cn';
import { XIcon } from 'lucide-react';
import { useCallback, useMemo, useRef } from 'react';
import { Button } from './components/ui/button.tsx';
import { Checkbox } from './components/ui/checkbox.tsx';
import { Label } from './components/ui/label.tsx';
import { themeSettings, weight } from './engine.ts';
import type { BuildResult, SignatureState } from './engine.ts';
import { kb } from './fields.ts';
import { useDebouncedValue, useInView, useNotify, useQueuedBuild } from './hooks.tsx';
import { useSignatureStore, useStylesStore, useUiStore } from './store.ts';
import type { CompareTheme, Device } from './store.ts';
import { applyStyle, entryState, filterEntries, galleryEntries, isActiveEntry, pickedEntries } from './styles.ts';
import type { GalleryEntry } from './styles.ts';
import { Segmented, ShadowHtml } from './ui.tsx';
const THEMES = [
  {
    id: 'suggested',
    label: 'Suggested colours',
  },
  {
    id: 'mine',
    label: 'My colour',
  },
] as const satisfies readonly {
  id: CompareTheme;
  label: string;
}[];
const PANE_MAX: Record<Device, number | undefined> = {
  desktop: undefined,
  tablet: 600,
  phone: 340,
};
const NEW = {
  version: 'new',
} as const;
const REPLY = {
  version: 'reply',
} as const;
function weightLine(n: BuildResult | null, r: BuildResult | null): string {
  if (!n || !r) return 'Building…';
  const a = weight(n, 'embed');
  const b = weight(r, 'embed');
  return `New ${kb(a.imageBytes + a.htmlBytes)} · Reply ${kb(b.imageBytes + b.htmlBytes)}${a.animated ? ` · ${a.animated} animated` : ''}`;
}
interface CompareCardProps {
  entry: GalleryEntry;
  state: SignatureState;
  current: boolean;
  picked: boolean;
  dark: boolean;
  device: Device;
  onUse: (e: GalleryEntry) => void;
  onPick: (id: string) => void;
}

/** One design or style in Compare: its new-message and reply versions side by side. */
function CompareCard({ entry, state, current, picked, dark, device, onUse, onPick }: CompareCardProps) {
  const ref = useRef<HTMLElement>(null);
  const seen = useInView(ref);
  const n = useQueuedBuild(seen ? state : null, NEW);
  const r = useQueuedBuild(seen ? state : null, REPLY);
  const paneStyle = useMemo(
    () => ({
      maxWidth: PANE_MAX[device],
      backgroundColor: dark ? '#1F1F1F' : '#FFFFFF',
    }),
    [device, dark],
  );
  const color = dark ? '#E0E0E0' : '#242424';
  const panes: readonly [string, BuildResult | null][] = [
    ['New message', n.result],
    ['Reply', r.result],
  ];
  return (
    <article
      ref={ref}
      className={cn(
        'flex min-h-40 flex-col gap-2.5 rounded-xl bg-card p-3 ring-1 ring-foreground/10',
        current && 'ring-2 ring-primary',
      )}
      data-testid={`compare-${entry.id}`}
      aria-current={current || undefined}
    >
      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
        <span className="text-sm font-semibold">{entry.name}</span>
        <span className="text-xs text-muted-foreground">{entry.tag}</span>
        <span className="ml-auto text-xs text-muted-foreground">{n.error ?? weightLine(n.result, r.result)}</span>
        <Label className="font-normal">
          <Checkbox
            aria-label={`Compare ${entry.name}`}
            checked={picked}
            onCheckedChange={() => onPick(entry.id)}
            data-testid={`compare-pick-${entry.id}`}
          />
          Compare
        </Label>
        <Button variant="outline" size="sm" onClick={() => onUse(entry)} aria-label={`Use ${entry.name}`}>
          Use this
        </Button>
      </div>
      <div className="flex flex-wrap items-start gap-2.5">
        {panes.map(([label, res]) => (
          <div
            key={label}
            className="min-w-0 flex-[1_1_300px] overflow-x-auto rounded-lg border px-3 py-2.5"
            style={paneStyle}
          >
            <span
              className="mb-1.5 block text-xs"
              style={{
                color: dark ? '#ADADAD' : '#616161',
              }}
            >
              {label}
            </span>
            {res ? <ShadowHtml html={dark ? res.darkHtml() : res.html('embed')} color={color} /> : null}
          </div>
        ))}
      </div>
    </article>
  );
}

/** The picked designs and styles, or everything in the gallery filter, side by side. */
export function CompareView() {
  const notify = useNotify();
  const live = useSignatureStore((st) => st.state);
  const activeStyleId = useSignatureStore((st) => st.activeStyleId);
  const saved = useStylesStore((st) => st.saved);
  const ui = useUiStore();
  const { compareTheme, setMode, setCompareShowAll, togglePick } = ui;
  // Typing in a field should not rebuild two dozen designs on every key.
  const state = useDebouncedValue(live, 600);
  const all = useMemo(() => galleryEntries(saved), [saved]);
  const picked = useMemo(() => pickedEntries(all, ui.picks), [all, ui.picks]);
  const pickedIds = useMemo(() => new Set(picked.map((e) => e.id)), [picked]);
  const showPicked = picked.length > 0 && !ui.compareShowAll;
  const entries = useMemo(
    () => (showPicked ? picked : filterEntries(all, ui.filter)),
    [showPicked, picked, all, ui.filter],
  );
  const stateFor = useCallback(
    (e: GalleryEntry) => {
      const st = entryState(e, state, activeStyleId);
      return e.kind === 'tpl' && compareTheme === 'mine'
        ? {
            ...st,
            colors: state.colors,
            gradient: state.gradient,
          }
        : st;
    },
    [state, activeStyleId, compareTheme],
  );
  const use = useCallback(
    (e: GalleryEntry) => {
      const sig = useSignatureStore.getState();
      if (e.kind === 'tpl') {
        const colors = compareTheme === 'suggested' ? themeSettings(e.design.theme) : {};
        sig.replace(
          {
            ...sig.state,
            template: e.id,
            ...colors,
          },
          {
            activeStyleId: null,
          },
        );
      } else {
        sig.replace(applyStyle(sig.state, e.s), {
          activeStyleId: e.id,
        });
      }
      setMode('single');
      notify(`${e.name} selected.`);
    },
    [compareTheme, notify, setMode],
  );

  // Ticking a card while everything shows keeps everything on show, so the list does not jump.
  const pick = useCallback(
    (id: string) => {
      if (!showPicked) setCompareShowAll(true);
      togglePick(id);
    },
    [showPicked, setCompareShowAll, togglePick],
  );
  return (
    <div className="flex flex-col gap-3" data-testid="compare-view">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 text-sm text-muted-foreground">
        {picked.length ? (
          <div className="flex flex-wrap items-center gap-2" data-testid="compare-picks">
            <span className="text-foreground" aria-live="polite" data-testid="compare-count">
              {showPicked ? `Comparing ${picked.length}` : `${picked.length} picked`}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCompareShowAll(showPicked)}
              data-testid={showPicked ? 'compare-show-all' : 'compare-show-picked'}
            >
              {showPicked ? 'Show all' : 'Show picked'}
            </Button>
            <Button variant="ghost" size="sm" onClick={ui.clearPicks} data-testid="compare-clear">
              <XIcon />
              Clear picks
            </Button>
          </div>
        ) : (
          <p>
            Every design side by side, new message and reply. Tick Compare on the ones you like to see just those. The
            switches above apply to all of them.
          </p>
        )}
        <Segmented label="Compare colours" value={compareTheme} options={THEMES} onChange={ui.setCompareTheme} />
      </div>
      <div className="flex flex-col gap-3">
        {entries.map((e) => (
          <CompareCard
            key={e.id}
            entry={e}
            state={stateFor(e)}
            current={isActiveEntry(e, live, activeStyleId)}
            picked={pickedIds.has(e.id)}
            dark={ui.dark}
            device={ui.device}
            onUse={use}
            onPick={pick}
          />
        ))}
      </div>
    </div>
  );
}
