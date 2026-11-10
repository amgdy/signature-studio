/* The Design section: the gallery of designs and styles, picks for Compare, and saving, sharing and shuffling styles. */
import { cn } from 'cn';
import {
  DownloadIcon,
  LayoutGridIcon,
  PencilIcon,
  RefreshCwIcon,
  SaveIcon,
  ShuffleIcon,
  Trash2Icon,
  UploadIcon,
} from 'lucide-react';
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { Badge } from '../components/ui/badge.tsx';
import { Button } from '../components/ui/button.tsx';
import { Checkbox } from '../components/ui/checkbox.tsx';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../components/ui/dialog.tsx';
import { Input } from '../components/ui/input.tsx';
import { Label } from '../components/ui/label.tsx';
import { NativeSelect, NativeSelectOptGroup, NativeSelectOption } from '../components/ui/native-select.tsx';
import { Tooltip, TooltipContent, TooltipTrigger } from '../components/ui/tooltip.tsx';
import { designById } from '../engine.ts';
import type { SignatureState } from '../engine.ts';
import { useDebouncedValue, useInView, useQueuedBuild, useStyleActions } from '../hooks.tsx';
import type { StyleActions } from '../hooks.tsx';
import { useSignatureStore, useStylesStore, useUiStore } from '../store.ts';
import {
  FILTERS,
  STYLE_NAME_MAX,
  countText,
  entryState,
  filterEntries,
  galleryEntries,
  isActiveEntry,
  isGalleryFilter,
  pickedEntries,
} from '../styles.ts';
import type { GalleryEntry, GalleryFilter } from '../styles.ts';
import { Note, Pane, ScaledHtml, Section, useRoving } from '../ui.tsx';
import type { RovingItemProps } from '../ui.tsx';
const NEW = {
  version: 'new',
} as const;
const THUMB_HEIGHT = 92;
const COLLECTIONS: ReadonlySet<GalleryFilter> = new Set(['all', 'featured', 'presets', 'mine']);
const INDUSTRIES: ReadonlySet<GalleryFilter> = new Set([
  'finance',
  'legal',
  'healthcare',
  'education',
  'property',
  'creative',
  'hospitality',
  'nonprofit',
  'technology',
]);
/** The gallery filter, in three groups: collections, roles and industries. */
const FILTER_GROUPS: readonly { label: string; has: (id: GalleryFilter) => boolean }[] = [
  { label: 'Collections', has: (id) => COLLECTIONS.has(id) },
  { label: 'Roles', has: (id) => !COLLECTIONS.has(id) && !INDUSTRIES.has(id) },
  { label: 'Industries', has: (id) => INDUSTRIES.has(id) },
];

/** A small icon button on a saved style card, named by its tooltip text. */
function IconAction({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger render={<Button size="icon-sm" variant="ghost" aria-label={label} onClick={onClick} />}>
        {children}
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}
interface GalleryCardProps {
  entry: GalleryEntry;
  state: SignatureState;
  active: boolean;
  picked: boolean;
  roving: RovingItemProps;
  actions: StyleActions;
  onRename: (e: GalleryEntry) => void;
}

/** A design or style in the gallery, with a live thumbnail of your signature in it. */
function GalleryCard({ entry, state, active, picked, roving, actions, onRename }: GalleryCardProps) {
  const ref = useRef<HTMLLIElement>(null);
  const seen = useInView(ref);
  const { result } = useQueuedBuild(seen ? state : null, NEW);
  const togglePick = useUiStore((u) => u.togglePick);
  return (
    <li
      ref={ref}
      className={cn(
        'relative flex flex-col overflow-hidden rounded-lg border bg-card text-card-foreground transition-shadow hover:shadow-md',
        active && 'border-primary shadow-md ring-1 ring-primary',
      )}
    >
      <button
        type="button"
        className="flex w-full cursor-pointer flex-col border-0 bg-transparent p-0 text-left text-inherit outline-none focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:ring-inset"
        aria-pressed={active}
        aria-label={`${entry.name}: ${entry.tag}`}
        title={entry.blurb}
        data-testid={`design-${entry.id}`}
        data-kind={entry.kind}
        onClick={() => actions.pick(entry)}
        {...roving}
      >
        {result ? (
          <ScaledHtml html={result.html('embed')} height={THUMB_HEIGHT} className="w-full border-b" />
        ) : (
          // The thumbnail stays white like an email body, in light and dark mode.
          <span
            className="block w-full border-b bg-white"
            style={{
              height: THUMB_HEIGHT,
            }}
            aria-hidden="true"
          />
        )}
        <span className="flex flex-col gap-0.5 px-2.5 pt-2 pb-1">
          <span className="flex items-center gap-1.5 text-sm font-semibold">
            {entry.name}
            {entry.badge ? (
              <Badge variant="secondary" className={cn(entry.kind === 'tpl' && 'bg-primary/10 text-primary')}>
                {entry.badge}
              </Badge>
            ) : null}
          </span>
          <span className="text-xs text-muted-foreground">{entry.tag}</span>
        </span>
      </button>
      <div className="mt-auto flex items-center gap-0.5 pr-1 pb-1 pl-0.5">
        <Label className="cursor-pointer px-2 py-1.5 font-normal">
          <Checkbox
            aria-label={`Compare ${entry.name}`}
            checked={picked}
            onCheckedChange={() => togglePick(entry.id)}
            data-testid={`pick-${entry.id}`}
          />
          Compare
        </Label>
        <span className="grow" />
        {entry.kind === 'mine' ? (
          <>
            <IconAction label={`Rename ${entry.name}`} onClick={() => onRename(entry)}>
              <PencilIcon />
            </IconAction>
            <IconAction
              label={`Update ${entry.name} with the current look`}
              onClick={() => actions.updateWithCurrent(entry.id)}
            >
              <RefreshCwIcon />
            </IconAction>
            <IconAction label={`Delete ${entry.name}`} onClick={() => actions.remove(entry.id)}>
              <Trash2Icon />
            </IconAction>
          </>
        ) : null}
      </div>
    </li>
  );
}

/** Asks for a new name for a saved style. Mount it only while it is open, so it starts with the current name. */
function RenameDialog({
  name,
  onRename,
  onClose,
}: {
  name: string;
  onRename: (name: string) => void;
  onClose: () => void;
}) {
  const [value, setValue] = useState(name);
  const id = useId();
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (value.trim()) onRename(value);
    onClose();
  };
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent>
        <form className="grid gap-4" onSubmit={submit}>
          <DialogHeader>
            <DialogTitle>Rename this style</DialogTitle>
          </DialogHeader>
          <div className="grid gap-1.5">
            <Label htmlFor={id}>Style name</Label>
            <Input
              id={id}
              value={value}
              maxLength={STYLE_NAME_MAX}
              onChange={(e) => setValue(e.currentTarget.value)}
              data-testid="rename-input"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" type="button" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">Rename</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** The filter and the grid of designs and styles. */
function Gallery({ actions }: { actions: StyleActions }) {
  const live = useSignatureStore((st) => st.state);
  const activeStyleId = useSignatureStore((st) => st.activeStyleId);
  const saved = useStylesStore((st) => st.saved);
  const filter = useUiStore((u) => u.filter);
  const setFilter = useUiStore((u) => u.setFilter);
  const picks = useUiStore((u) => u.picks);
  const [renaming, setRenaming] = useState<GalleryEntry | null>(null);
  const filterId = useId();
  // Thumbnails follow your details, but only once typing pauses.
  const thumbState = useDebouncedValue(live, 600);
  const entries = useMemo(() => filterEntries(galleryEntries(saved), filter), [saved, filter]);
  const ids = useMemo(() => entries.map((e) => e.id), [entries]);
  const active = entries.find((e) => isActiveEntry(e, live, activeStyleId))?.id ?? null;
  const roving = useRoving(ids, active, () => undefined, false);
  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <Label htmlFor={filterId}>Show</Label>
        <NativeSelect
          id={filterId}
          className="w-full sm:w-64"
          value={filter}
          onChange={(e) => {
            const v = e.currentTarget.value;
            if (isGalleryFilter(v)) setFilter(v);
          }}
          data-testid="gallery-filter"
        >
          {FILTER_GROUPS.map((g) => (
            <NativeSelectOptGroup key={g.label} label={g.label}>
              {FILTERS.filter((f) => g.has(f.id)).map((f) => (
                <NativeSelectOption key={f.id} value={f.id}>
                  {f.id === 'mine' ? `${f.label} (${saved.length})` : f.id === 'all' ? 'All designs' : f.label}
                </NativeSelectOption>
              ))}
            </NativeSelectOptGroup>
          ))}
        </NativeSelect>
      </div>
      <ul
        className="m-0 grid list-none grid-cols-[repeat(auto-fill,minmax(168px,1fr))] gap-2.5 p-0"
        aria-label="Templates and styles"
        data-testid="gallery"
      >
        {entries.map((e) => (
          <GalleryCard
            key={e.id}
            entry={e}
            state={entryState(e, thumbState, activeStyleId)}
            active={e.id === active}
            picked={picks.includes(e.id)}
            roving={roving(e.id)}
            actions={actions}
            onRename={setRenaming}
          />
        ))}
      </ul>
      {filter === 'mine' && !entries.length ? (
        <Note>
          No saved styles yet. Set up a look you like, then select <b>Save as my style</b>.
        </Note>
      ) : null}
      {renaming ? (
        <RenameDialog
          name={renaming.name}
          onRename={(name) => actions.rename(renaming.id, name)}
          onClose={() => setRenaming(null)}
        />
      ) : null}
    </>
  );
}

/** Shows Compare: every entry in the filter, or only the picked ones. */
function openCompare(showAll: boolean): void {
  const ui = useUiStore.getState();
  ui.setCompareShowAll(showAll);
  ui.setMode('compare');
}

/** Save, shuffle, compare, export and import styles. */
function StyleBar({ actions }: { actions: StyleActions }) {
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');
  const nameId = useId();
  const design = useSignatureStore((st) => designById(st.state.template)?.name ?? 'My');
  const saved = useStylesStore((st) => st.saved);
  const picks = useUiStore((u) => u.picks);
  const picked = useMemo(() => pickedEntries(galleryEntries(saved), picks).length, [saved, picks]);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (saving) input.current?.focus();
  }, [saving]);
  const submit = (e: FormEvent) => {
    e.preventDefault();
    actions.save(name);
    setSaving(false);
    setName('');
  };
  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" onClick={() => setSaving(true)} aria-expanded={saving} data-testid="save-style">
          <SaveIcon />
          Save as my style
        </Button>
        <Button variant="outline" onClick={actions.shuffle} data-testid="shuffle">
          <ShuffleIcon />
          Shuffle a new mix
        </Button>
        {picked ? (
          <Button onClick={() => openCompare(false)} data-testid="compare-picked">
            <LayoutGridIcon />
            {`Compare ${picked} picked`}
          </Button>
        ) : null}
        <Button variant="outline" onClick={() => openCompare(true)} data-testid="compare-all">
          <LayoutGridIcon />
          Compare all
        </Button>
        <span className="ml-auto flex gap-1">
          <Tooltip>
            <TooltipTrigger
              render={<Button size="sm" variant="ghost" onClick={actions.exportAll} data-testid="export-styles" />}
            >
              <DownloadIcon />
              Export
            </TooltipTrigger>
            <TooltipContent>Download your saved styles to share or move to another browser</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => void actions.importFile()}
                  data-testid="import-styles"
                />
              }
            >
              <UploadIcon />
              Import
            </TooltipTrigger>
            <TooltipContent>Add styles from an exported file</TooltipContent>
          </Tooltip>
        </span>
      </div>
      {saving ? (
        <form
          className="flex flex-col gap-2 rounded-lg border bg-background p-3"
          onSubmit={submit}
          data-testid="save-style-form"
        >
          <div className="flex flex-wrap items-end gap-2">
            <div className="grid min-w-0 grow gap-1.5">
              <Label htmlFor={nameId}>Name your style</Label>
              <Input
                id={nameId}
                value={name}
                maxLength={STYLE_NAME_MAX}
                placeholder={`e.g. ${design} for customers`}
                onChange={(e) => setName(e.currentTarget.value)}
                ref={input}
                data-testid="style-name"
              />
            </div>
            <Button type="submit">Save</Button>
            <Button variant="outline" type="button" onClick={() => setSaving(false)}>
              Cancel
            </Button>
          </div>
          <Note>
            Saves the look (template, colours, columns, icons, photo, name style and background), never your details.
            Kept in this browser; use Export to keep or share them.
          </Note>
        </form>
      ) : null}
    </>
  );
}
export function DesignPane() {
  const actions = useStyleActions();
  const filter = useUiStore((u) => u.filter);
  const count = useStylesStore((st) => filterEntries(galleryEntries(st.saved), filter).length);
  return (
    <Pane id="design">
      <Section title="Choose a template or style" hint={countText(count, filter)}>
        <StyleBar actions={actions} />
        <Gallery actions={actions} />
      </Section>
    </Pane>
  );
}
