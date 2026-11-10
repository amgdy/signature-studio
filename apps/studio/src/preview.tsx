/*
 * The preview column: the switches above it, the signature at the end of a sample email (or Compare), the copy and
 * save buttons, a one-line accessibility summary and the Outlook guide. On narrow screens, the bottom bar switches
 * between editing and the preview.
 */
import { cn } from 'cn';
import {
  AccessibilityIcon,
  CodeIcon,
  CopyIcon,
  FileArchiveIcon,
  FileDownIcon,
  RotateCcwIcon,
  TextIcon,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { ReactElement, RefObject } from 'react';
import { CompareView } from './compare.tsx';
import { Alert, AlertAction, AlertDescription } from './components/ui/alert.tsx';
import { Button } from './components/ui/button.tsx';
import { Card } from './components/ui/card.tsx';
import { Spinner } from './components/ui/spinner.tsx';
import { Tooltip, TooltipContent, TooltipTrigger } from './components/ui/tooltip.tsx';
import { weight } from './engine.ts';
import type { BuildResult, Version } from './engine.ts';
import { hostingMode, readoutParts, replayLabel, weightText } from './fields.ts';
import { useCopyActions, useCurrentSignature, type SignatureBuild } from './hooks.tsx';
import { useSignatureStore, useUiStore } from './store.ts';
import type { Device, NarrowView, ViewMode } from './store.ts';
import { Group, Segmented, ShadowHtml } from './ui.tsx';

/* ---------- The signature in a sample email ---------- */

/** How wide the mail window is on each screen. The phone frame leaves 343 px for the signature, as on an iPhone. */
const DEVICE_WIDTH: Record<Device, number> = {
  desktop: 760,
  tablet: 600,
  phone: 375,
};
const LIGHT = {
  bg: '#FFFFFF',
  fg: '#242424',
  muted: '#616161',
  line: '#E0E0E0',
};
const DARK = {
  bg: '#1F1F1F',
  fg: '#E0E0E0',
  muted: '#ADADAD',
  line: '#3D3D3D',
};

/**
 * The mail is never narrower than the phone frame, so the signature wraps as it does in Outlook on a phone.
 * On a smaller screen it is zoomed out to fit, so the whole signature shows; pinch to zoom in.
 */
function useFitZoom(stage: RefObject<HTMLElement | null>, width: number): number {
  const [zoom, setZoom] = useState(1);
  useEffect(() => {
    const el = stage.current;
    if (!el) return undefined;
    const fit = (): void => {
      const cs = getComputedStyle(el);
      const room = el.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
      setZoom(room > 0 ? Math.min(1, Math.floor((room / width) * 100) / 100) : 1);
    };
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, [stage, width]);
  return zoom;
}
interface SignaturePreviewProps {
  result: BuildResult | null;
  error: string | null;
  /** True from a change until the signature for it is built. */
  building: boolean;
  dark: boolean;
  device: Device;
  replay: number;
}

/** The signature at the end of a sample email, in the chosen colour mode and screen width. */
function SignaturePreview({ result, error, building, dark, device, replay }: SignaturePreviewProps) {
  const fullName = useSignatureStore((st) => st.state.fullName);
  const email = useSignatureStore((st) => st.state.email);
  const photo = useSignatureStore((st) => st.state.photo.src);
  const c = dark ? DARK : LIGHT;
  const reply = result?.version === 'reply';
  const avatar = photo || result?.images['photo']?.dataURL || '';
  const stage = useRef<HTMLDivElement>(null);
  const minWidth = DEVICE_WIDTH.phone + (device === 'phone' ? 12 : 0);
  const zoom = useFitZoom(stage, minWidth);
  return (
    <div
      ref={stage}
      className="flex justify-[safe_center] overflow-x-auto rounded-xl bg-muted p-4 max-[500px]:p-2"
      data-testid="preview-stage"
      data-device={device}
      data-scheme={dark ? 'dark' : 'light'}
    >
      <div
        // The sample email is drawn like a mail client, in its own fixed colours and font, in either app theme.
        className={cn(
          "w-full shrink-0 overflow-hidden rounded-xl font-['Segoe_UI',system-ui,-apple-system,sans-serif] text-sm leading-[1.45] shadow-md",
          device === 'phone' && 'rounded-[28px] border-6 border-border',
        )}
        style={{
          maxWidth: DEVICE_WIDTH[device] + (device === 'phone' ? 12 : 0),
          minWidth,
          zoom: zoom < 1 ? zoom : undefined,
          backgroundColor: c.bg,
          color: c.fg,
        }}
        data-testid="mail"
      >
        <div
          className="mb-2.5 flex items-center gap-2.5 px-4 pt-3.5 pb-2.5"
          style={{
            borderBottom: `1px solid ${c.line}`,
          }}
        >
          {avatar ? <img className="size-9 shrink-0 rounded-full object-cover" src={avatar} alt="" /> : null}
          <div className="flex min-w-0 flex-col text-[13px]">
            <b>{fullName || 'Your name'}</b>
            <span
              className="truncate whitespace-pre"
              style={{
                color: c.muted,
              }}
            >
              {email ? `${email}  →  Contoso digital team` : 'To: Contoso digital team'}
            </span>
          </div>
        </div>
        <div className="px-4 pb-2.5 text-[15px] font-semibold">Re: Project roadmap – next steps</div>
        <div className="px-4 pt-1.5 pb-1 [&_p]:mb-2.5">
          {reply ? (
            <p>Thanks, all. Agreed on the next steps. I’ll send the updated plan by Tuesday.</p>
          ) : (
            <>
              <p>Hi team,</p>
              <p>
                Thanks for a great working session today. As promised, I have shared the plan and the next steps we
                agreed on. Happy to walk your team through it next week.
              </p>
            </>
          )}
        </div>
        <div className="min-h-20 px-4 pt-2 pb-4" aria-live="polite" aria-busy={building} data-testid="signature">
          {error ? (
            <p className="text-destructive">The signature could not be built: {error}</p>
          ) : result ? (
            <ShadowHtml html={dark ? result.darkHtml() : result.html('embed')} color={c.fg} replay={replay} />
          ) : (
            <div className="flex justify-center p-6">
              <Spinner aria-label="Building the signature" />
            </div>
          )}
        </div>
        {reply ? (
          <div
            className="mx-4 mb-4 pt-2.5 text-[13px]"
            style={{
              borderTop: `1px solid ${c.line}`,
              color: c.muted,
            }}
          >
            <b>From:</b> Contoso digital team
            <br />
            <b>Sent:</b> Thursday
            <br />
            <b>Subject:</b> Project roadmap – next steps
            <br />
            <br />
            Thanks for the session today. Could you share the plan?
          </div>
        ) : null}
      </div>
    </div>
  );
}

/* ---------- Toolbar ---------- */

const VERSIONS = [
  {
    id: 'new',
    label: 'New message',
  },
  {
    id: 'reply',
    label: 'Reply',
  },
] as const satisfies readonly {
  id: Version;
  label: string;
}[];
const MODES = [
  {
    id: 'single',
    label: 'Preview',
  },
  {
    id: 'compare',
    label: 'Compare',
  },
] as const satisfies readonly {
  id: ViewMode;
  label: string;
}[];
const SCHEMES = [
  {
    id: 'light',
    label: 'Light',
  },
  {
    id: 'dark',
    label: 'Dark',
  },
] as const;
const DEVICES = [
  {
    id: 'desktop',
    label: 'Desktop',
  },
  {
    id: 'tablet',
    label: 'Tablet',
  },
  {
    id: 'phone',
    label: 'Phone',
  },
] as const satisfies readonly {
  id: Device;
  label: string;
}[];
/** The switches above the preview. They change how you view the signature; the settings change the signature. */
function PreviewToolbar({ replay, onReplay }: { replay: string | null; onReplay: () => void }) {
  const ui = useUiStore();
  return (
    <div className="flex flex-wrap items-center gap-2" data-testid="preview-toolbar">
      <Segmented label="Version" value={ui.version} options={VERSIONS} onChange={ui.setVersion} testId="seg-version" />
      <Segmented label="View" value={ui.mode} options={MODES} onChange={ui.setMode} testId="seg-mode" />
      <Segmented
        label="Colour mode"
        value={ui.dark ? 'dark' : 'light'}
        options={SCHEMES}
        onChange={(v) => ui.setDark(v === 'dark')}
        testId="seg-scheme"
      />
      <Segmented label="Screen width" value={ui.device} options={DEVICES} onChange={ui.setDevice} testId="seg-device" />
      {replay ? (
        <Button variant="outline" size="sm" onClick={onReplay} data-testid="replay">
          <RotateCcwIcon />
          {replay}
        </Button>
      ) : null}
    </div>
  );
}

/* ---------- Copy and save ---------- */

function Secondary(props: {
  title: string;
  icon: ReactElement;
  testId: string;
  disabled: boolean;
  onClick: () => void;
  children: string;
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button variant="outline" disabled={props.disabled} onClick={props.onClick} data-testid={props.testId} />
        }
      >
        {props.icon}
        {props.children}
      </TooltipTrigger>
      <TooltipContent>{props.title}</TooltipContent>
    </Tooltip>
  );
}

/** The main action. On a narrow screen it is in the bottom bar instead. */
function CopyButton({ shown }: { shown: SignatureBuild }) {
  const a = useCopyActions(shown);
  const { result } = shown;
  return (
    <Button
      size="lg"
      disabled={!result || Boolean(shown.error)}
      onClick={() => void a.copy()}
      data-testid="copy-signature"
    >
      <CopyIcon />
      {result?.version === 'reply' ? 'Copy reply signature' : 'Copy signature'}
    </Button>
  );
}

/** Other ways to copy the signature, or save it as files. */
export function MoreActions({ shown }: { shown: SignatureBuild }) {
  const a = useCopyActions(shown);
  const none = !shown.result || Boolean(shown.error);
  return (
    <Group label="More ways to copy and save" className="flex flex-wrap items-center gap-2">
      <Secondary
        title="Copy the HTML code"
        icon={<CodeIcon />}
        testId="copy-html"
        disabled={none}
        onClick={() => void a.copyHtml()}
      >
        HTML code
      </Secondary>
      <Secondary
        title="Copy a plain-text version for a plain-text signature editor"
        icon={<TextIcon />}
        testId="copy-text"
        disabled={none}
        onClick={() => void a.copyText()}
      >
        Plain text
      </Secondary>
      <Secondary
        title="Both versions as signature files for classic Outlook for Windows"
        icon={<FileArchiveIcon />}
        testId="save-zip"
        disabled={none}
        onClick={() => void a.outlookPackage()}
      >
        Classic Outlook (.zip)
      </Secondary>
      <Secondary
        title="Save the signature as an HTML file"
        icon={<FileDownIcon />}
        testId="save-html"
        disabled={none}
        onClick={a.saveHtmlFile}
      >
        Save .html
      </Secondary>
    </Group>
  );
}

/** A one-line summary of what makes the current signature accessible. */
function AccessibilityReadout({ result }: { result: BuildResult | null }) {
  const motion = useSignatureStore((st) => st.state.motion);
  const altName = useSignatureStore((st) => st.state.altName);
  const showAlt = useSignatureStore((st) => st.state.show.altName);
  const parts = useMemo(
    () =>
      result
        ? readoutParts({
            html: result.html('embed'),
            animated: weight(result, 'embed').animated,
            cols: result.cols,
            state: {
              motion,
              altName,
              show: {
                altName: showAlt,
              },
            },
          })
        : null,
    [result, motion, altName, showAlt],
  );
  if (!parts) return null;
  return (
    <p
      className="flex items-start gap-2 rounded-lg border bg-muted/40 px-3 py-2 text-xs leading-5 text-muted-foreground"
      data-testid="a11y-readout"
    >
      <AccessibilityIcon className="size-4.5 shrink-0 text-primary" aria-hidden="true" />
      <span>
        <b>Accessibility</b> {parts.join(' · ')}
      </span>
    </p>
  );
}

/** Shown while the name is empty, for example after New blank signature. */
function EmptyNameHint() {
  const setPane = useUiStore((u) => u.setPane);
  return (
    <Alert className="border-primary/30 bg-primary/5" data-testid="empty-hint">
      <AlertDescription className="text-foreground">Add your name in Details to see your signature.</AlertDescription>
      <AlertAction>
        <Button variant="outline" size="xs" onClick={() => setPane('details')}>
          Open Details
        </Button>
      </AlertAction>
    </Alert>
  );
}

/**
 * The preview column: the switches, the signature in a sample email (or Compare), the actions and the Outlook guide.
 * On a wide screen the switches stay at the top and Copy signature at the bottom, and the middle scrolls on its own.
 * On a narrow screen the signature comes first and the switches follow it, so the preview is in view straight away.
 */
export function PreviewPanel({ narrow }: { narrow: boolean }) {
  const shown = useCurrentSignature();
  const { result, error, building } = shown;
  const hosting = useSignatureStore((st) => st.state.hosting);
  const noName = useSignatureStore((st) => !st.state.fullName.trim());
  const { mode, dark, device } = useUiStore();
  const [replay, setReplay] = useState(0);
  const weightLine = result
    ? `${result.template.name} · ${result.version === 'reply' ? 'Reply' : 'New message'} · ${weightText(
        result,
        hostingMode({
          hosting,
        }),
      )}`
    : '';
  const toolbar = (
    <PreviewToolbar replay={mode === 'single' ? replayLabel(result) : null} onReplay={() => setReplay((n) => n + 1)} />
  );
  const weightCaption = (
    <span className="text-xs text-muted-foreground" data-testid="weight">
      {weightLine}
    </span>
  );
  return (
    <section
      id="preview"
      className={cn('flex min-w-0 flex-col', !narrow && 'min-h-0 grow')}
      aria-label="Preview"
      tabIndex={-1}
      data-testid="preview"
    >
      <Card className={cn('gap-0 py-0', !narrow && 'min-h-0 grow')}>
        {narrow ? null : <div className="border-b px-4 pt-3.5 pb-3">{toolbar}</div>}
        {/* Children keep their height, so on a wide screen the body scrolls instead of squashing the preview. */}
        <div
          className={cn(
            'flex flex-col gap-3.5 p-4 *:shrink-0 max-[500px]:p-3',
            !narrow &&
              'min-h-0 grow overflow-y-auto overscroll-contain focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring',
          )}
          role={narrow ? undefined : 'region'}
          aria-label={narrow ? undefined : 'Signature preview'}
          tabIndex={narrow ? undefined : 0}
          data-testid="preview-body"
        >
          {noName ? <EmptyNameHint /> : null}
          {mode === 'compare' ? (
            <CompareView />
          ) : (
            <SignaturePreview
              result={result}
              error={error}
              building={building}
              dark={dark}
              device={device}
              replay={replay}
            />
          )}
          {narrow ? toolbar : null}
          {narrow ? weightCaption : null}
          <AccessibilityReadout result={result} />
        </div>
        {narrow ? null : (
          <div className="flex items-center gap-3 border-t px-4 py-3 *:[button]:shrink-0">
            <CopyButton shown={shown} />
            {weightCaption}
          </div>
        )}
      </Card>
    </section>
  );
}
const SHOW = [
  {
    id: 'edit',
    label: 'Edit',
  },
  {
    id: 'preview',
    label: 'Preview',
  },
] as const satisfies readonly {
  id: NarrowView;
  label: string;
}[];

/** On a narrow screen: switch between the settings and the preview, and copy the signature from either. */
export function BottomBar() {
  const view = useUiStore((u) => u.narrowView);
  const setView = useUiStore((u) => u.setNarrowView);
  const shown = useCurrentSignature();
  const { result } = shown;
  const a = useCopyActions(shown);
  return (
    <div
      className="sticky bottom-0 z-20 flex items-center justify-between gap-2 border-t bg-card px-3 py-2 whitespace-nowrap shadow-[0_-4px_12px_rgb(0_0_0/0.08)] *:shrink-0"
      data-testid="bottom-bar"
    >
      <Segmented
        label="Edit or preview"
        value={view}
        options={SHOW}
        onChange={setView}
        size="medium"
        testId="seg-show"
      />
      <Button disabled={!result || Boolean(shown.error)} onClick={() => void a.copy()} data-testid="copy-signature-bar">
        <CopyIcon />
        {result?.version === 'reply' ? 'Copy reply' : 'Copy signature'}
      </Button>
    </div>
  );
}
