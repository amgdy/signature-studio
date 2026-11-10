/*
 * Shared building blocks for the settings panes: section cards and notes, grouped buttons and tiles, switches and
 * a colour picker, text fields bound to the store, file buttons, engine-drawn pictures, roving focus for keyboard
 * users, and the shadow root every signature preview renders in. They are thin layers over the shadcn components
 * in components/ui.
 */
import { cn } from 'cn';
import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import type { ComponentProps, CSSProperties, KeyboardEvent, ReactElement, ReactNode } from 'react';
import { Button } from './components/ui/button.tsx';
import { Card, CardAction, CardContent, CardHeader, CardTitle } from './components/ui/card.tsx';
import { Input } from './components/ui/input.tsx';
import { Label } from './components/ui/label.tsx';
import { Popover, PopoverContent, PopoverTrigger } from './components/ui/popover.tsx';
import { RadioGroup, RadioGroupItem } from './components/ui/radio-group.tsx';
import { Switch } from './components/ui/switch.tsx';
import { Textarea } from './components/ui/textarea.tsx';
import { ToggleGroup, ToggleGroupItem } from './components/ui/toggle-group.tsx';
import type { RenderedImage, ShowFlags } from './engine.ts';
import type { FieldSpec } from './fields.ts';
import { useAsyncValue } from './hooks.tsx';
import { PANES, stepForPane, useSignatureStore } from './store.ts';
import type { PaneId } from './store.ts';

/* ---------- Roving focus ---------- */

const NEXT = new Set(['ArrowRight', 'ArrowDown']);
const PREV = new Set(['ArrowLeft', 'ArrowUp']);

export interface RovingItemProps {
  ref: (el: HTMLElement | null) => void;
  tabIndex: number;
  onKeyDown: (e: KeyboardEvent<HTMLElement>) => void;
}

/**
 * Roving focus for a group of items: one Tab stop for the whole group, and the arrow keys, Home and End to move
 * within it. With `select`, moving also picks the item (radio groups, tabs); without it, Enter or Space picks.
 */
export function useRoving<T extends string>(
  ids: readonly T[],
  current: T | null,
  onSelect: (id: T) => void,
  select = true,
): (id: T) => RovingItemProps {
  const els = useRef(new Map<T, HTMLElement>());
  const stop = current !== null && ids.includes(current) ? current : ids[0];

  const move = useCallback(
    (from: T, e: KeyboardEvent<HTMLElement>) => {
      const i = ids.indexOf(from);
      let n: number | null = null;
      if (NEXT.has(e.key)) n = (i + 1) % ids.length;
      else if (PREV.has(e.key)) n = (i - 1 + ids.length) % ids.length;
      else if (e.key === 'Home') n = 0;
      else if (e.key === 'End') n = ids.length - 1;
      const to = n === null ? undefined : ids[n];
      if (to === undefined) return;
      e.preventDefault();
      els.current.get(to)?.focus();
      if (select) onSelect(to);
    },
    [ids, onSelect, select],
  );

  return (id: T) => ({
    ref: (el: HTMLElement | null) => {
      if (el) els.current.set(id, el);
      else els.current.delete(id);
    },
    tabIndex: id === stop ? 0 : -1,
    onKeyDown: (e: KeyboardEvent<HTMLElement>) => move(id, e),
  });
}

/* ---------- Panes, sections and notes ---------- */

/** A settings section: the tab panel that belongs to a tab in the section rail. */
export function Pane({ id, children }: { id: PaneId; children: ReactNode }) {
  const pane = PANES.find((p) => p.id === id);
  const nested = stepForPane(id).panes.length > 1;
  return (
    <div
      role={nested ? 'tabpanel' : 'group'}
      id={`pane-${id}`}
      aria-labelledby={nested ? `tab-${id}` : `title-${id}`}
      tabIndex={0}
      className="flex flex-col gap-3 rounded-lg outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      data-testid={`pane-${id}`}
    >
      <div className="flex flex-col gap-0.5 px-0.5">
        {/* A tab above already shows the name of a nested pane, so its heading is for screen readers only. */}
        <h2 className={cn('font-heading text-lg font-semibold tracking-tight', nested && 'sr-only')} id={`title-${id}`}>
          {pane?.label}
        </h2>
        <p className="text-sm text-muted-foreground">{pane?.title}</p>
      </div>
      {children}
    </div>
  );
}

/** A card in a settings pane, with a heading and an optional hint beside it. */
export function Section({
  title,
  hint,
  children,
  testId,
}: {
  title: string;
  hint?: ReactNode;
  children: ReactNode;
  testId?: string;
}) {
  return (
    <Card size="sm" className="overflow-visible" data-testid={testId}>
      <CardHeader>
        <CardTitle>
          <h3>{title}</h3>
        </CardTitle>
        {hint ? (
          <CardAction className="text-xs text-muted-foreground" aria-live="polite">
            {hint}
          </CardAction>
        ) : null}
      </CardHeader>
      <CardContent className="flex min-w-0 flex-col gap-3.5">{children}</CardContent>
    </Card>
  );
}

/** A short explanatory line under a control. Notes that change with the setting are announced politely. */
export function Note({
  children,
  warn,
  live,
  id,
}: {
  children: ReactNode;
  warn?: boolean;
  live?: boolean;
  id?: string;
}) {
  return (
    <p
      id={id}
      className={cn(
        'text-xs leading-relaxed text-muted-foreground',
        warn && 'font-semibold text-amber-700 dark:text-amber-400',
      )}
      aria-live={live ? 'polite' : undefined}
    >
      {children}
    </p>
  );
}

/** A labelled block of controls (a segmented control, a picker) with an optional note. */
export function ControlGroup({
  label,
  note,
  warn,
  children,
}: {
  label: string;
  note?: ReactNode;
  warn?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <span className="text-sm font-medium">{label}</span>
      {children}
      {note ? (
        <Note live warn={warn}>
          {note}
        </Note>
      ) : null}
    </div>
  );
}

/** A heading inside a section card, with a line above it. */
export function SubHeading({ children }: { children: ReactNode }) {
  return <h4 className="mt-1.5 border-t pt-3 text-sm font-semibold">{children}</h4>;
}

export interface GroupProps {
  /** Names the group for screen readers. */
  label: string;
  className?: string;
  style?: CSSProperties;
  testId?: string;
  children: ReactNode;
}

/** A fieldset without the browser's frame: the native way to group related buttons. */
export function Group({ label, className, style, testId, children }: GroupProps) {
  return (
    <fieldset aria-label={label} className={cn('min-w-0', className)} style={style} data-testid={testId}>
      {children}
    </fieldset>
  );
}

/* ---------- Segmented control ---------- */

interface SegmentOption<T extends string> {
  id: T;
  label: string;
  title?: string;
  disabled?: boolean;
  icon?: ReactElement;
}

export interface SegmentedProps<T extends string> {
  /** Names the group for screen readers. */
  label: string;
  value: T | null;
  options: readonly SegmentOption<T>[];
  onChange: (id: T) => void;
  wide?: boolean;
  size?: 'small' | 'medium';
  testId?: string;
}

/** A shadcn toggle group where one button is on, like a segmented control. Each button reports aria-pressed. */
export function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
  wide,
  size = 'small',
  testId,
}: SegmentedProps<T>) {
  return (
    <ToggleGroup
      aria-label={label}
      value={value === null ? [] : [value]}
      // A pressed button stays pressed: one option is always on.
      onValueChange={(next) => {
        const picked = options.find((o) => o.id === next[0]);
        if (picked) onChange(picked.id);
      }}
      size={size === 'small' ? 'sm' : 'default'}
      spacing={0}
      className={cn('flex-wrap gap-0.5 rounded-lg bg-muted p-0.5', wide && 'flex w-full')}
      data-testid={testId}
    >
      {options.map((o) => (
        <ToggleGroupItem
          key={o.id}
          value={o.id}
          disabled={o.disabled}
          title={o.title}
          data-value={o.id}
          className={cn(
            'rounded-md! font-normal text-muted-foreground hover:bg-background/60 aria-pressed:bg-background aria-pressed:font-semibold aria-pressed:text-foreground aria-pressed:shadow-sm dark:aria-pressed:bg-input/50',
            wide && 'flex-1',
          )}
        >
          {o.icon}
          {o.label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}

/* ---------- Picker tiles and colour swatches ---------- */

interface PickerItem<T extends string> {
  id: T;
  label: string;
  title?: string;
  disabled?: boolean;
  preview: ReactNode;
}

// The radio button covers its whole tile, unseen, so a click anywhere picks it and keyboards and screen readers
// get a real radio. The tile shows the state.
const COVER = 'absolute inset-0 size-full rounded-[inherit] border-0 opacity-0 after:hidden';
const TILE =
  'relative flex min-w-0 cursor-pointer items-center border bg-card text-xs text-card-foreground transition-colors hover:border-ring hover:bg-muted/60 has-focus-visible:ring-3 has-focus-visible:ring-ring/50 has-data-checked:border-primary has-data-checked:bg-primary/5 has-data-checked:font-semibold has-data-checked:ring-1 has-data-checked:ring-primary has-data-disabled:cursor-not-allowed has-data-disabled:opacity-50 dark:has-data-checked:bg-primary/15';

export interface PickerGridProps<T extends string> {
  label: string;
  items: readonly PickerItem<T>[];
  value: T;
  onChange: (id: T) => void;
  /** Smallest tile width. */
  min?: number;
  testId?: string;
}

/** A radio group drawn as tiles, each with a small live preview. Arrow keys move and pick. */
export function PickerGrid<T extends string>({ label, items, value, onChange, min = 88, testId }: PickerGridProps<T>) {
  return (
    <RadioGroup
      aria-label={label}
      value={value}
      onValueChange={(v) => {
        const it = items.find((i) => i.id === v);
        if (it) onChange(it.id);
      }}
      className="gap-1.5"
      style={{ gridTemplateColumns: `repeat(auto-fill, minmax(${min}px, 1fr))` }}
      data-testid={testId}
    >
      {items.map((it) => (
        <label
          key={it.id}
          title={it.title}
          data-value={it.id}
          className={cn(TILE, 'flex-col gap-1 rounded-lg px-1 pt-2 pb-1.5')}
        >
          <RadioGroupItem value={it.id} disabled={it.disabled} aria-label={it.label} className={COVER} />
          <span className="flex min-h-10 items-center justify-center gap-0.5" aria-hidden="true">
            {it.preview}
          </span>
          <span className="text-center [overflow-wrap:anywhere]">{it.label}</span>
        </label>
      ))}
    </RadioGroup>
  );
}

export interface SwatchProps {
  value: string;
  /** A CSS background for the colour dot. */
  fill: string;
  label: string;
  /** A longer name for screen readers, when the visible label needs context. */
  ariaLabel?: string;
  title?: string;
}

/** A colour choice in a shadcn RadioGroup: a radio button drawn as a dot and its name. */
export function Swatch({ value, fill, label, ariaLabel, title }: SwatchProps) {
  return (
    <label className={cn(TILE, 'gap-2 rounded-full py-1 pr-2.5 pl-1')} title={title} data-value={value}>
      <RadioGroupItem value={value} aria-label={ariaLabel ?? label} className={COVER} />
      <span
        className="size-5.5 shrink-0 rounded-full shadow-[inset_0_0_0_1px_var(--border)]"
        style={{ background: fill }}
        aria-hidden="true"
      />
      <span className="truncate">{label}</span>
    </label>
  );
}

/* ---------- Colour picker ---------- */

/** `#abc`, `abc`, `#aabbcc` or `aabbcc` as `#AABBCC`, or null. */
function readHex(text: string): string | null {
  const t = text.trim().replace(/^#/, '');
  if (/^[0-9a-f]{3}$/i.test(t)) return `#${t.replace(/./g, '$&$&')}`.toUpperCase();
  return /^[0-9a-f]{6}$/i.test(t) ? `#${t}`.toUpperCase() : null;
}

interface ColourChoice {
  name: string;
  hex: string;
}

export interface ColourGroup {
  label: string;
  colors: readonly ColourChoice[];
}

const NO_GROUPS: readonly ColourGroup[] = [];

export interface ColourPickerProps {
  /** The colour, as `#RRGGBB`. */
  value: string;
  onChange: (hex: string) => void;
  /** What the colour is for, such as "Colour 1". Screen readers hear it with the colour's name. */
  label: string;
  /** Named colours to pick with one click, shown above the full picker. */
  groups?: readonly ColourGroup[];
  /** Columns in each swatch grid. */
  columns?: number;
  big?: boolean;
  /** Classes for the button, and text shown beside its colour dot. */
  className?: string;
  children?: ReactNode;
  testId?: string;
}

/**
 * A colour button that opens a popover: named swatches to pick with one click, then the browser's own colour
 * picker and a hex field for any colour. Changes apply as you pick, so the preview follows along.
 */
export function ColourPicker({
  value,
  onChange,
  label,
  groups = NO_GROUPS,
  columns = 8,
  big,
  className,
  children,
  testId,
}: ColourPickerProps) {
  const [typed, setTyped] = useState<string | null>(null);
  const hexId = useId();
  const anyId = useId();
  const named = groups.flatMap((g) => g.colors).find((c) => c.hex === value);
  return (
    <Popover onOpenChange={() => setTyped(null)}>
      <PopoverTrigger
        className={cn(
          'inline-flex cursor-pointer items-center gap-2 rounded-full outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
          className,
        )}
        aria-label={`${label}: ${named ? `${named.name}, ` : ''}${value}`}
        title={`${label}: ${named?.name ?? value}`}
        data-testid={testId}
      >
        <span
          className={cn('size-6.5 shrink-0 rounded-full shadow-[inset_0_0_0_1px_var(--border)]', big && 'size-9')}
          style={{ backgroundColor: value }}
          aria-hidden="true"
        />
        {children}
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-68 gap-3"
        aria-label={label}
        data-testid={testId && `${testId}-popover`}
      >
        {groups
          .filter((g) => g.colors.length)
          .map((g) => (
            <div key={g.label} className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-muted-foreground" aria-hidden="true">
                {g.label}
              </span>
              <RadioGroup
                aria-label={g.label}
                value={value}
                onValueChange={(v) => {
                  const c = g.colors.find((x) => x.hex === v);
                  if (c) onChange(c.hex);
                }}
                className="gap-1.5"
                style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
              >
                {g.colors.map((c) => (
                  <RadioGroupItem
                    key={c.hex}
                    value={c.hex}
                    aria-label={`${c.name}, ${c.hex}`}
                    title={c.name}
                    style={{ backgroundColor: c.hex }}
                    className="size-6 border-foreground/15 data-checked:border-foreground/15 data-checked:ring-2 data-checked:ring-ring data-checked:ring-offset-2 data-checked:ring-offset-popover [&_[data-slot=radio-group-indicator]]:hidden"
                  />
                ))}
              </RadioGroup>
            </div>
          ))}
        <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-2 gap-y-2">
          <Label htmlFor={anyId} className="text-xs text-muted-foreground">
            Any colour
          </Label>
          <input
            id={anyId}
            type="color"
            value={value.toLowerCase()}
            onChange={(e) => onChange(e.currentTarget.value.toUpperCase())}
            className="h-8 w-full cursor-pointer rounded-md border bg-transparent p-0.5"
          />
          <Label htmlFor={hexId} className="text-xs text-muted-foreground">
            Hex code
          </Label>
          <Input
            id={hexId}
            className="h-8 font-mono"
            value={typed ?? value}
            spellCheck={false}
            onChange={(e) => {
              setTyped(e.currentTarget.value);
              const hex = readHex(e.currentTarget.value);
              if (hex) onChange(hex);
            }}
            onBlur={() => setTyped(null)}
            data-testid={testId && `${testId}-hex`}
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}

/* ---------- Switches and fields bound to the signature ---------- */

export interface SwitchFieldProps extends Omit<ComponentProps<typeof Switch>, 'children'> {
  label: ReactNode;
}

/** A shadcn switch with its label beside it. The label wraps the switch, which names it. */
export function SwitchField({ label, className, ...props }: SwitchFieldProps) {
  return (
    <Label className={cn('w-fit cursor-pointer font-normal has-data-disabled:cursor-not-allowed', className)}>
      <Switch {...props} />
      {label}
    </Label>
  );
}

/** A switch bound to one of the signature's show flags. */
export function ShowSwitch({ flag, label }: { flag: keyof ShowFlags; label: string }) {
  const on = useSignatureStore((s) => s.state.show[flag] === true);
  const setShow = useSignatureStore((s) => s.setShow);
  return <SwitchField label={label} checked={on} onCheckedChange={(v) => setShow(flag, v)} data-show={flag} />;
}

/** A text field with the switch that shows or hides it in the signature beside it. */
function FieldRow({ spec }: { spec: FieldSpec }) {
  const id = useId();
  const value = useSignatureStore((st) => st.state[spec.key]);
  const shown = useSignatureStore((st) => (spec.show ? st.state.show[spec.show] : true));
  const setText = useSignatureStore((st) => st.setText);
  const setShow = useSignatureStore((st) => st.setShow);
  const show = spec.show;
  const common = {
    id,
    value,
    placeholder: spec.placeholder,
    dir: spec.dir,
    'data-field': spec.key,
  };

  return (
    <div
      className={cn(
        'grid grid-cols-[40px_minmax(0,1fr)] items-end gap-x-1.5',
        !shown && '[&_input]:text-muted-foreground [&_textarea]:text-muted-foreground',
      )}
      data-row={spec.key}
    >
      {show ? (
        <Switch
          className="mb-2.5"
          checked={shown}
          onCheckedChange={(v) => setShow(show, v)}
          aria-label={`Show ${spec.label.toLowerCase()} in the signature`}
          title="Show in the signature"
          data-show={show}
        />
      ) : (
        <span aria-hidden="true" />
      )}
      <div className="flex min-w-0 flex-col gap-1.5">
        <Label htmlFor={id}>
          {spec.label}
          {spec.note ? <span className="text-xs font-normal text-muted-foreground">{spec.note}</span> : null}
        </Label>
        {spec.multiline ? (
          <Textarea {...common} onChange={(e) => setText(spec.key, e.currentTarget.value)} />
        ) : (
          <Input
            {...common}
            type={spec.type ?? 'text'}
            autoComplete={spec.autoComplete ?? 'off'}
            onChange={(e) => setText(spec.key, e.currentTarget.value)}
          />
        )}
      </div>
    </div>
  );
}

export function FieldList({ fields }: { fields: readonly FieldSpec[] }) {
  return (
    <div className="flex flex-col gap-2.5">
      {fields.map((f) => (
        <FieldRow key={f.key} spec={f} />
      ))}
    </div>
  );
}

/* ---------- Files and pictures ---------- */

export interface FileButtonProps {
  accept: string;
  onFile: (file: File) => void;
  children: ReactNode;
  /** A Lucide icon shown before the text. */
  icon?: ReactNode;
  variant?: ComponentProps<typeof Button>['variant'];
  size?: ComponentProps<typeof Button>['size'];
  testId?: string;
  /** Test id of the hidden file input. */
  inputTestId?: string;
}

/** A button that opens the file picker. The real input stays hidden and out of the tab order. */
export function FileButton({
  accept,
  onFile,
  children,
  icon,
  variant = 'outline',
  size,
  testId,
  inputTestId,
}: FileButtonProps) {
  const input = useRef<HTMLInputElement>(null);
  return (
    <>
      <Button variant={variant} size={size} data-testid={testId} onClick={() => input.current?.click()}>
        {icon}
        {children}
      </Button>
      <input
        ref={input}
        type="file"
        accept={accept}
        hidden
        tabIndex={-1}
        aria-hidden="true"
        data-testid={inputTestId}
        onChange={(e) => {
          const file = e.currentTarget.files?.[0];
          e.currentTarget.value = '';
          if (file) onFile(file);
        }}
      />
    </>
  );
}

export interface AsyncImageProps {
  /** A memoised function that draws the image. */
  make: () => Promise<RenderedImage | null>;
  width?: number;
  height: number;
  style?: CSSProperties;
}

/** A small picture drawn by the engine, such as a picker preview. It is decoration: the picker item has the name. */
export function AsyncImage({ make, width, height, style }: AsyncImageProps) {
  const img = useAsyncValue(make);
  if (!img) return <span className="inline-block" style={{ width: width ?? height, height }} />;
  return <img src={img.url} alt="" width={width} height={height} className="max-w-full object-contain" style={style} />;
}

/* ---------- Signature HTML in a shadow root ---------- */

export interface ShadowHtmlProps {
  html: string;
  /** Text colour of the email around the signature, which the signature inherits. */
  color?: string;
  /** Size the box to the signature's own width, for scaled thumbnails. */
  fit?: boolean;
  /** Change it to restart the animated images. */
  replay?: number;
  className?: string;
  style?: CSSProperties;
  /** Runs after the HTML is in place, with the element that holds it. */
  onRender?: (host: HTMLElement) => void;
}

/*
 * The signature is shown inside a shadow root. The Studio's own styles never reach it, and its HTML (which is made
 * for Outlook, with inline styles only) never affects the Studio, so the preview shows exactly what gets pasted.
 */
export function ShadowHtml({ html, color = '#242424', fit, replay = 0, className, style, onRender }: ShadowHtmlProps) {
  const host = useRef<HTMLSpanElement>(null);
  const urls = useRef<string[]>([]);

  useLayoutEffect(() => {
    const el = host.current;
    if (!el) return;
    const root = el.shadowRoot ?? el.attachShadow({ mode: 'open' });
    root.innerHTML =
      `<style>:host{all:initial;display:block;${fit ? 'width:max-content;' : ''}color:${color};` +
      "font-family:'Segoe UI',system-ui,-apple-system,sans-serif;font-size:14px;line-height:normal;text-align:left}</style>" +
      html;
    onRender?.(el);
  }, [html, color, fit, onRender]);

  useLayoutEffect(() => {
    const root = host.current?.shadowRoot;
    if (!replay || !root) return undefined;
    // Browsers share one animation clock per image address, so each animated image gets a fresh blob address.
    for (const u of urls.current) URL.revokeObjectURL(u);
    urls.current = [];
    for (const img of root.querySelectorAll('img')) {
      const orig = img.dataset['orig'] ?? img.getAttribute('src') ?? '';
      const blob = dataUrlBlob(orig);
      if (!blob) continue;
      img.dataset['orig'] = orig;
      const u = URL.createObjectURL(blob);
      urls.current.push(u);
      img.src = u;
    }
    return undefined;
  }, [replay]);

  useLayoutEffect(
    () => () => {
      for (const u of urls.current) URL.revokeObjectURL(u);
    },
    [],
  );

  return <span ref={host} className={className} style={{ display: 'block', ...style }} />;
}

function dataUrlBlob(src: string): Blob | null {
  const m = /^data:(image\/(?:png|gif));base64,(.*)$/.exec(src);
  if (!m?.[1] || m[2] === undefined) return null;
  const bin = atob(m[2]);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: m[1] });
}

/** The largest a thumbnail is drawn, so small signatures do not look blown up. */
const MAX_SCALE = 0.62;

/** A signature scaled down to fit its box, for gallery thumbnails. */
export function ScaledHtml({ html, height, className }: { html: string; height: number; className?: string }) {
  const box = useRef<HTMLSpanElement>(null);
  const inner = useRef<HTMLElement | null>(null);

  const fit = useCallback(() => {
    const b = box.current;
    const el = inner.current;
    if (!b || !el) return;
    el.style.transform = 'none';
    const w = el.offsetWidth;
    const h = el.offsetHeight;
    if (!w || !h) return;
    const k = Math.min((b.clientWidth - 16) / w, (b.clientHeight - 16) / h, MAX_SCALE);
    el.style.transform = `scale(${k.toFixed(3)})`;
  }, []);

  const onRender = useCallback(
    (host: HTMLElement) => {
      inner.current = host;
      fit();
    },
    [fit],
  );

  useEffect(() => {
    const b = box.current;
    if (!b) return undefined;
    const ro = new ResizeObserver(fit);
    ro.observe(b);
    return () => ro.disconnect();
  }, [fit]);

  return (
    <span
      ref={box}
      className={cn('relative block overflow-hidden bg-white p-2', className)}
      style={{ height }}
      aria-hidden="true"
    >
      <ShadowHtml html={html} fit className="pointer-events-none origin-top-left" onRender={onRender} />
    </span>
  );
}
