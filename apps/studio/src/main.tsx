import { Component, StrictMode, useEffect, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { App } from './App.tsx';
import { Alert, AlertDescription, AlertTitle } from './components/ui/alert.tsx';
import { Button } from './components/ui/button.tsx';
import { Toaster } from './components/ui/sonner.tsx';
import { TooltipProvider } from './components/ui/tooltip.tsx';
import { useMediaQuery } from './hooks.tsx';
import { resetEverything, useUiStore } from './store.ts';

/** Keeps a crash from leaving a blank page, and offers a way out if saved data causes it. */
class CrashScreen extends Component<{ children: ReactNode }, { error: string | null }> {
  override state: { error: string | null } = { error: null };

  static getDerivedStateFromError(error: unknown): { error: string } {
    return { error: error instanceof Error ? error.message : String(error) };
  }

  override render(): ReactNode {
    if (this.state.error === null) return this.props.children;
    return (
      <main className="mx-auto grid min-h-dvh max-w-lg content-center gap-4 p-6">
        <Alert variant="destructive" role="alert">
          <AlertTitle>Something went wrong</AlertTitle>
          <AlertDescription>
            <p>The Studio stopped because of an error: {this.state.error}</p>
            <p>
              Reload to try again. If it happens again, reset everything. This clears your details, saved styles and
              settings in this browser.
            </p>
          </AlertDescription>
        </Alert>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => location.reload()}>Reload</Button>
          <Button
            variant="outline"
            onClick={() => {
              resetEverything();
              location.reload();
            }}
          >
            Reset everything
          </Button>
        </div>
      </main>
    );
  }
}

function Root() {
  const systemDark = useMediaQuery('(prefers-color-scheme: dark)');
  const appTheme = useUiStore((u) => u.appTheme);
  const dark = appTheme === 'dark' || (appTheme === 'auto' && systemDark);
  useEffect(() => {
    const html = document.documentElement;
    html.classList.toggle('dark', dark);
    html.style.colorScheme = dark ? 'dark' : 'light';
    html.dataset.appTheme = dark ? 'dark' : 'light';
  }, [dark]);
  return (
    <TooltipProvider>
      <App />
      <Toaster theme={dark ? 'dark' : 'light'} position="bottom-right" />
    </TooltipProvider>
  );
}

const root = document.getElementById('root');
if (!root) throw new Error('Missing #root element');
createRoot(root).render(
  <StrictMode>
    <CrashScreen>
      <Root />
    </CrashScreen>
  </StrictMode>,
);
