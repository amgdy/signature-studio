/*
 * The app shell: header, section rail, the active settings pane, the preview, and the start-over dialog.
 * Wide screens keep everything in view and scroll the settings and the preview on their own. Narrow screens scroll the
 * page, keep the section tabs at the top, and switch between editing and the preview in a bottom bar.
 */
import { cn } from 'cn';
import {
  AccessibilityIcon,
  AtSignIcon,
  ContactRoundIcon,
  FileIcon,
  FolderOpenIcon,
  ImageIcon,
  LaptopIcon,
  LayoutPanelLeftIcon,
  LayoutTemplateIcon,
  MailIcon,
  MoonIcon,
  PaletteIcon,
  ReplyIcon,
  RotateCcwIcon,
  SaveIcon,
  ShapesIcon,
  SignatureIcon,
  SparklesIcon,
  SunIcon,
  TriangleAlertIcon,
  TypeIcon,
  UserRoundIcon,
} from 'lucide-react';
import { useEffect, useId, useRef } from 'react';
import type { ComponentType, MouseEvent, ReactElement, RefObject } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from './components/ui/alert-dialog.tsx';
import { Button, buttonVariants } from './components/ui/button.tsx';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './components/ui/dropdown-menu.tsx';
import { Label } from './components/ui/label.tsx';
import { NativeSelect, NativeSelectOption } from './components/ui/native-select.tsx';
import { Tabs, TabsList, TabsTrigger } from './components/ui/tabs.tsx';
import { Tooltip, TooltipContent, TooltipTrigger } from './components/ui/tooltip.tsx';
import { SignatureContext, useFileActions, useMediaQuery, useSignatureBuild } from './hooks.tsx';
import { EMAIL_PROFILE_OPTIONS } from './engine.ts';
import type { FileActions } from './hooks.tsx';
import { CheckPane } from './panes/check.tsx';
import { DesignPane } from './panes/design.tsx';
import { ContactPane, DetailsPane } from './panes/details.tsx';
import { ExtrasPane } from './panes/extras.tsx';
import { FilesPane } from './panes/files.tsx';
import { IconsPane, LayoutPane } from './panes/layout.tsx';
import { NamePane } from './panes/name.tsx';
import { PhotoPane } from './panes/photo.tsx';
import { ReplyPane } from './panes/reply.tsx';
import { BottomBar, PreviewPanel } from './preview.tsx';
import {
  APP_THEMES,
  FLOW,
  PANES,
  isAppTheme,
  stepForPane,
  useSignatureStore,
  useStylesStore,
  useUiStore,
} from './store.ts';
import type { PaneId, StartOver, StepId } from './store.ts';

declare const STUDIO_BUILD_INFO: {
  version: string;
  builtAt: string;
  run: { number: string; url: string } | null;
};

/** One column below this width or height. A laptop zoomed to 150% or more lands here too. */
const NARROW_QUERY = '(max-width: 1099px), (max-height: 599px)';
const SECTIONS: Record<PaneId, ComponentType> = {
  design: DesignPane,
  layout: LayoutPane,
  icons: IconsPane,
  photo: PhotoPane,
  name: NamePane,
  details: DetailsPane,
  contact: ContactPane,
  extras: ExtrasPane,
  reply: ReplyPane,
  check: CheckPane,
  files: FilesPane,
};
const STEP_ICONS: Record<StepId, ReactElement> = {
  details: <ContactRoundIcon />,
  design: <LayoutTemplateIcon />,
  style: <PaletteIcon />,
  check: <AccessibilityIcon />,
  use: <MailIcon />,
};
/** The sub-tabs of the Details and Style sections. */
const PANE_ICONS: Partial<Record<PaneId, ReactElement>> = {
  details: <UserRoundIcon />,
  contact: <AtSignIcon />,
  photo: <ImageIcon />,
  extras: <SparklesIcon />,
  layout: <LayoutPanelLeftIcon />,
  name: <TypeIcon />,
  icons: <ShapesIcon />,
  reply: <ReplyIcon />,
};
const KEEP_FILE = 'Save a signature file first if you want to keep your details.';
function startOverCopy(which: StartOver, savedStyles: number) {
  if (which === 'blank')
    return {
      title: 'Start a blank signature?',
      body: `This clears your details, photo and logo, and puts every design setting back to its default. Your saved styles stay. ${KEEP_FILE}`,
      confirm: 'Start blank',
    };
  if (which === 'sample')
    return {
      title: 'Try a random sample?',
      body: `This fills in a made-up person and puts every design setting back to its default. Your saved styles stay. ${KEEP_FILE}`,
      confirm: 'Use a sample',
    };
  const styles =
    savedStyles === 0
      ? ''
      : ` It also deletes your ${savedStyles === 1 ? 'saved style' : `${savedStyles} saved styles`}; export them in Design first to keep them.`;
  return {
    title: 'Reset everything?',
    body: `This puts the Studio back to how it was on your first visit: a sample person, default settings, no picks for Compare and the default view.${styles} ${KEEP_FILE}`,
    confirm: 'Reset everything',
  };
}
const SIGNATURE_FILE = /\.ya?ml$/i;
const MODE_ICONS = {
  auto: <LaptopIcon />,
  light: <SunIcon />,
  dark: <MoonIcon />,
} as const;
// On a phone the header buttons show only their icons; the words stay for screen readers.
const BUTTON_LABEL = 'max-[800px]:sr-only';
const ICON_ON_PHONE = 'max-[800px]:size-8 max-[800px]:px-0';

/** The Studio's Auto, Light or Dark mode. The signature never changes. */
function AppearanceMenu() {
  const appTheme = useUiStore((u) => u.appTheme);
  const setAppTheme = useUiStore((u) => u.setAppTheme);
  const mode = APP_THEMES.find((t) => t.id === appTheme)?.label;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            className="ml-auto"
            aria-label={`App appearance: ${mode}`}
            data-testid="app-appearance"
          />
        }
      >
        {MODE_ICONS[appTheme]}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuRadioGroup
          value={appTheme}
          onValueChange={(v) => {
            if (isAppTheme(v)) setAppTheme(v);
          }}
        >
          <DropdownMenuLabel>Mode</DropdownMenuLabel>
          {APP_THEMES.map((t) => (
            <DropdownMenuRadioItem key={t.id} value={t.id} data-testid={`appearance-${t.id}`}>
              {MODE_ICONS[t.id]}
              {t.label}
              {t.id === 'auto' ? <span className="text-muted-foreground">(device setting)</span> : null}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** A header button with a tooltip that says what it does. */
function ToolButton({
  tip,
  icon,
  label,
  onClick,
  testId,
}: {
  tip: string;
  icon: ReactElement;
  label: string;
  onClick: () => void;
  testId: string;
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={<Button variant="outline" className={ICON_ON_PHONE} onClick={onClick} data-testid={testId} />}
      >
        {icon}
        <span className={BUTTON_LABEL}>{label}</span>
      </TooltipTrigger>
      <TooltipContent>{tip}</TooltipContent>
    </Tooltip>
  );
}
function AppHeader({ files, onHome }: { files: FileActions; onHome: () => void }) {
  const setStartOver = useUiStore((u) => u.setStartOver);
  const profile = useSignatureStore((st) => st.state.emailProfile);
  const update = useSignatureStore((st) => st.update);
  const profileId = useId();
  return (
    <header className="flex shrink-0 flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b bg-card px-5 py-2.5 max-[800px]:px-3 max-[800px]:py-2">
      <div className="flex min-w-0 items-center gap-2 max-[800px]:gap-1">
        <h1 className="-ml-1.5 min-w-0">
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant="ghost"
                  className="h-auto max-w-full gap-2.5 px-1.5 py-1"
                  aria-label="Signature Studio, back to the start"
                  onClick={onHome}
                  data-testid="home"
                />
              }
            >
              <span
                className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground"
                aria-hidden="true"
              >
                <SignatureIcon className="size-5" />
              </span>
              <span className="truncate font-heading text-lg font-semibold tracking-tight">Signature Studio</span>
            </TooltipTrigger>
            <TooltipContent>Back to the start</TooltipContent>
          </Tooltip>
        </h1>
        <span className="text-xs whitespace-nowrap text-muted-foreground max-xl:hidden">
          Your signature. Your style.
        </span>
        <DropdownMenu>
          <DropdownMenuTrigger render={<Button variant="ghost" className={ICON_ON_PHONE} data-testid="start-over" />}>
            <RotateCcwIcon />
            <span className={BUTTON_LABEL}>Start over</span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            <DropdownMenuItem onClick={() => setStartOver('blank')} data-testid="new-blank">
              <FileIcon />
              New blank signature
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setStartOver('sample')} data-testid="random-sample">
              <UserRoundIcon />
              Try a random sample
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              onClick={() => setStartOver('reset')}
              data-testid="reset-everything"
            >
              <TriangleAlertIcon />
              Reset everything
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="flex flex-wrap items-center gap-2 max-[800px]:w-full max-[800px]:gap-1">
        <div className="flex items-center gap-1.5">
          <Label htmlFor={profileId} className="text-xs font-normal text-muted-foreground">
            Email profile
          </Label>
          <NativeSelect
            id={profileId}
            size="sm"
            value={profile}
            onChange={(e) => {
              const next = EMAIL_PROFILE_OPTIONS.find((p) => p.id === e.currentTarget.value);
              if (next)
                update({
                  emailProfile: next.id,
                });
            }}
          >
            {EMAIL_PROFILE_OPTIONS.map((p) => (
              <NativeSelectOption key={p.id} value={p.id}>
                {p.label}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </div>
        <AppearanceMenu />
        <ToolButton
          tip="Open a signature file you saved (.yaml)"
          icon={<FolderOpenIcon />}
          label="Open signature file"
          onClick={() => void files.open()}
          testId="open-file"
        />
        <ToolButton
          tip="Download your details, images and style as one file"
          icon={<SaveIcon />}
          label="Save signature file"
          onClick={files.save}
          testId="save-file"
        />
      </div>
    </header>
  );
}

function AppFooter() {
  const { version, builtAt, run } = STUDIO_BUILD_INFO;
  const date = `${builtAt.slice(0, 10)} UTC`;
  const details = (
    <>
      <span>v{version}</span>
      <span aria-hidden="true">·</span>
      <span>{run ? `Build #${run.number}` : 'Local build'}</span>
      <span aria-hidden="true">·</span>
      <time dateTime={builtAt} title={builtAt}>
        {date}
      </time>
    </>
  );
  return (
    <footer
      className="shrink-0 border-t px-3 py-1 text-center text-xs text-muted-foreground"
      aria-label="Build information"
    >
      {run ? (
        <a
          className={cn(
            buttonVariants({ variant: 'link', size: 'xs' }),
            'h-auto min-h-6 max-w-full flex-wrap gap-x-1.5 gap-y-0 font-normal text-muted-foreground',
          )}
          href={run.url}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Version ${version}, build ${run.number}, ${date}. View GitHub Actions run (opens in a new tab)`}
        >
          {details}
        </a>
      ) : (
        <span className="inline-flex min-h-6 flex-wrap items-center justify-center gap-x-1.5">{details}</span>
      )}
    </footer>
  );
}

/** The settings sections, as shadcn tabs: arrow keys, Home and End move between them and open them. */
function SectionRail({ horizontal, controls }: { horizontal: boolean; controls: boolean }) {
  const pane = useUiStore((u) => u.pane);
  const setPane = useUiStore((u) => u.setPane);
  const current = stepForPane(pane);
  const select = (id: StepId) => {
    const step = FLOW.find((p) => p.id === id);
    if (step && step.id !== current.id) setPane(step.panes[0]);
    else useUiStore.getState().setNarrowView('edit');
  };
  return (
    <Tabs
      value={current.id}
      orientation={horizontal ? 'horizontal' : 'vertical'}
      onValueChange={(v) => {
        const step = FLOW.find((p) => p.id === v);
        if (step) select(step.id);
      }}
    >
      <TabsList
        variant="line"
        activateOnFocus
        aria-label="Settings sections"
        className={cn('w-full p-1', horizontal ? 'group-data-horizontal/tabs:h-auto' : 'gap-0.5')}
        data-testid="section-rail"
      >
        {FLOW.map((p) => (
          <TabsTrigger
            key={p.id}
            value={p.id}
            id={`step-${p.id}`}
            aria-controls={controls ? 'workflow-panel' : undefined}
            className={cn(
              'h-auto min-w-0 flex-col gap-0.5 px-1 py-2 text-xs data-active:font-semibold [&_svg:not([class*=size-])]:size-5.5 [@media(max-height:760px)]:py-1.5',
              horizontal ? 'flex-1' : 'min-w-18 group-data-vertical/tabs:justify-center',
            )}
            data-testid={`step-${p.id}`}
            onClick={() => {
              if (p.id === current.id) select(p.id);
            }}
          >
            {STEP_ICONS[p.id]}
            <span>{p.label}</span>
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
function Subsections() {
  const pane = useUiStore((u) => u.pane);
  const setPane = useUiStore((u) => u.setPane);
  const step = stepForPane(pane);
  if (step.panes.length === 1) return null;
  return (
    <Tabs
      value={pane}
      onValueChange={(v) => {
        const next = PANES.find((p) => p.id === v);
        if (next) setPane(next.id);
      }}
      className="mb-3"
    >
      <TabsList
        activateOnFocus
        aria-label={`${step.label} sections`}
        className="w-full group-data-horizontal/tabs:h-auto"
      >
        {step.panes.map((id) => (
          <TabsTrigger
            key={id}
            value={id}
            id={`tab-${id}`}
            data-testid={`tab-${id}`}
            aria-controls={`pane-${id}`}
            className="h-auto min-w-0 flex-auto py-1 max-[480px]:flex-col max-[480px]:gap-0.5 max-[480px]:text-xs"
          >
            {PANE_ICONS[id]}
            <span className="truncate">{PANES.find((p) => p.id === id)?.label}</span>
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}

/** Asks before a blank signature, a random sample or a full reset replaces your work. */
function StartOverDialog({ files }: { files: FileActions }) {
  const which = useUiStore((u) => u.startOver);
  const setStartOver = useUiStore((u) => u.setStartOver);
  const savedStyles = useStylesStore((st) => st.saved.length);
  const copy = which ? startOverCopy(which, savedStyles) : null;
  const close = () => setStartOver(null);
  return (
    <AlertDialog
      open={!!copy}
      onOpenChange={(open) => {
        if (!open) close();
      }}
    >
      <AlertDialogContent data-testid="start-over-dialog">
        <AlertDialogHeader>
          <AlertDialogTitle>{copy?.title}</AlertDialogTitle>
          <AlertDialogDescription>{copy?.body}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant={which === 'reset' ? 'destructive' : 'default'}
            onClick={() => {
              if (which) files.startOver(which);
              close();
            }}
            data-testid="confirm-start"
          >
            {copy?.confirm}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/** Dropping a signature file anywhere on the Studio opens it. The photo area handles its own drops first. */
function useFileDrop(files: FileActions): void {
  useEffect(() => {
    const hasFiles = (e: DragEvent) => !!e.dataTransfer?.types.includes('Files');
    const over = (e: DragEvent) => {
      if (hasFiles(e)) e.preventDefault();
    };
    const drop = (e: DragEvent) => {
      if (!hasFiles(e) || e.defaultPrevented) return;
      // Keep the browser from leaving the Studio to show the file.
      e.preventDefault();
      const file = e.dataTransfer?.files[0];
      if (file && SIGNATURE_FILE.test(file.name)) void files.openFile(file);
    };
    window.addEventListener('dragover', over);
    window.addEventListener('drop', drop);
    return () => {
      window.removeEventListener('dragover', over);
      window.removeEventListener('drop', drop);
    };
  }, [files]);
}

/**
 * On a narrow screen the page scrolls: a new section or view starts at its top, under the section tabs, and a focused
 * field scrolls clear of the tabs and the bottom bar.
 */
function useNarrowPage(narrow: boolean, main: RefObject<HTMLElement | null>): void {
  useEffect(() => {
    if (!narrow) return undefined;
    const root = document.documentElement.style;
    root.scrollPaddingTop = '80px';
    root.scrollPaddingBottom = '72px';
    const stop = useUiStore.subscribe((u, was) => {
      const top = main.current?.offsetTop ?? 0;
      if ((u.pane !== was.pane || u.narrowView !== was.narrowView) && window.scrollY > top) window.scrollTo(0, top);
    });
    return () => {
      stop();
      root.scrollPaddingTop = '';
      root.scrollPaddingBottom = '';
    };
  }, [narrow, main]);
}
export function App() {
  const narrow = useMediaQuery(NARROW_QUERY);
  const state = useSignatureStore((st) => st.state);
  const optimize = useSignatureStore((st) => st.optimize);
  const version = useUiStore((u) => u.version);
  const pane = useUiStore((u) => u.pane);
  const narrowView = useUiStore((u) => u.narrowView);
  const setNarrowView = useUiStore((u) => u.setNarrowView);
  const build = useSignatureBuild(state, version, optimize);
  const files = useFileActions();
  const main = useRef<HTMLElement>(null);
  const settings = useRef<HTMLDivElement>(null);
  useEffect(
    () =>
      useUiStore.subscribe((current, previous) => {
        if (current.pane !== previous.pane) settings.current?.scrollTo(0, 0);
      }),
    [],
  );
  useFileDrop(files);
  useNarrowPage(narrow, main);
  const View = SECTIONS[pane];
  const step = stepForPane(pane);
  const editing = !narrow || narrowView === 'edit';
  const previewing = !narrow || narrowView === 'preview';

  // The first view, from the top. A click while already there still scrolls back up.
  const goHome = () => {
    useUiStore.getState().goHome();
    settings.current?.scrollTo(0, 0);
    window.scrollTo(0, 0);
  };

  // On a narrow screen the preview may be hidden, so the skip link shows it first.
  const skipToPreview = (e: MouseEvent<HTMLAnchorElement>) => {
    if (!narrow) return;
    e.preventDefault();
    setNarrowView('preview');
    requestAnimationFrame(() => document.getElementById('preview')?.focus());
  };
  return (
    <SignatureContext.Provider value={build}>
      <div
        className={cn('min-h-screen bg-background text-foreground', !narrow && 'flex h-dvh flex-col overflow-hidden')}
      >
        <a
          className="absolute -top-12 left-2 z-50 rounded-md bg-popover px-3 py-2 text-sm font-medium text-popover-foreground shadow-md ring-1 ring-foreground/10 focus:top-2"
          href="#preview"
          onClick={skipToPreview}
        >
          Skip to the preview
        </a>
        <AppHeader files={files} onHome={goHome} />
        <main
          ref={main}
          className={cn(
            'mx-auto grid w-full max-w-[1680px]',
            narrow
              ? 'grid-cols-[minmax(0,1fr)] gap-3 px-3 pb-4'
              : 'min-h-0 grow grid-cols-[92px_minmax(380px,460px)_minmax(0,1fr)] grid-rows-[minmax(0,1fr)] gap-5 px-5',
          )}
        >
          <nav
            className={cn(
              'bg-card',
              narrow
                ? 'sticky top-0 z-20 -mx-3 border-b'
                : 'my-5 max-h-[calc(100%-40px)] self-start overflow-y-auto rounded-xl ring-1 ring-foreground/10',
            )}
            aria-label="Sections"
          >
            <SectionRail horizontal={narrow} controls={editing} />
          </nav>
          {editing ? (
            <div
              ref={settings}
              // Room for focus rings, which the scroll box would otherwise cut off.
              className={cn(
                'min-w-0',
                !narrow && '-mx-2 overflow-y-auto overscroll-contain px-2 py-5 [scrollbar-gutter:stable]',
              )}
              data-testid="settings"
              role="tabpanel"
              id="workflow-panel"
              aria-labelledby={`step-${step.id}`}
            >
              <Subsections />
              <View key={pane} />
            </div>
          ) : null}
          {previewing ? (
            <div className={cn('flex min-h-0 min-w-0 flex-col', !narrow && 'py-5')}>
              <PreviewPanel narrow={narrow} />
            </div>
          ) : null}
        </main>
        <AppFooter />
        {narrow ? <BottomBar /> : null}
        <StartOverDialog files={files} />
      </div>
    </SignatureContext.Provider>
  );
}
