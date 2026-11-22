/* The Check section: signature health for both versions, and what each Outlook client keeps. */
import { cn } from 'cn';
import {
  CircleCheckIcon,
  FileArchiveIcon,
  FileTextIcon,
  FolderOpenIcon,
  InfoIcon,
  RefreshCwIcon,
  TriangleAlertIcon,
} from 'lucide-react';
import { useState } from 'react';
import { Badge } from '../components/ui/badge.tsx';
import { Button } from '../components/ui/button.tsx';
import {
  CLIENT_PROFILES,
  COMPATIBILITY_REVIEWED,
  COMPATIBILITY_SOURCES,
  EMAIL_PROFILE_OPTIONS,
  SIGNATURE_REQUIREMENTS,
} from '../engine.ts';
import type { CheckStatus, Version } from '../engine.ts';
import { useCopyActions, useCurrentSignature, useQueuedBuild, useSignatureHealth } from '../hooks.tsx';
import { Note, Pane, Section, Segmented } from '../ui.tsx';
import { useSignatureStore, useUiStore } from '../store.ts';
const LIST = 'm-0 flex list-none flex-col gap-2.5 p-0';
const ITEM = 'grid grid-cols-[20px_minmax(0,1fr)] items-start gap-2.5';
const TITLE = 'block text-sm font-semibold';
const TEXT = 'text-xs leading-5 text-muted-foreground';
const DETAILS = '[&>summary]:cursor-pointer [&>summary]:py-2 [&>summary]:text-sm [&>summary]:font-semibold';
// Status colours carry meaning, so they stay green and amber in both themes.
const PASS = 'text-emerald-700 dark:text-emerald-400';
const WARN = 'text-amber-700 dark:text-amber-400';
const VERSIONS = [
  {
    id: 'new',
    label: 'New message',
  },
  {
    id: 'reply',
    label: 'Reply',
  },
] as const;
const NATIVE_TESTS: Readonly<Record<string, readonly { id: string; label: string }[]>> = {
  'outlook-new-web': [
    { id: 'paste-save', label: 'Paste and save both versions' },
    { id: 'send-receive', label: 'Send and receive a test message' },
    { id: 'reply-forward', label: 'Reply and forward' },
    { id: 'display', label: 'Check dark mode, phone width and blocked images' },
  ],
  'outlook-classic': [
    { id: 'install', label: 'Install the package and select the new signature' },
    { id: 'word', label: 'Check spacing and tables in the Word editor' },
    { id: 'send-receive', label: 'Send, receive, reply and forward' },
    { id: 'images-motion', label: 'Check blocked images and the final animation frame' },
  ],
  'outlook-mac': [
    { id: 'paste-save', label: 'Paste and save both versions' },
    { id: 'send-receive', label: 'Send and receive a test message' },
    { id: 'reply-forward', label: 'Reply and forward' },
    { id: 'display', label: 'Check dark mode, links and image delivery' },
  ],
  'outlook-mobile': [
    { id: 'paste-save', label: 'Set the signature in the mobile app' },
    { id: 'send-receive', label: 'Send from the phone and check it on a second device' },
    { id: 'reply-forward', label: 'Reply and forward from the phone' },
    { id: 'display', label: 'Check phone width, dark mode and blocked images' },
  ],
  'apple-mail-mac': [
    { id: 'font-setting', label: 'Turn off “Always match my default message font”' },
    { id: 'paste-save', label: 'Paste and save in Mail settings' },
    { id: 'send-receive', label: 'Send rich text and check the received message' },
    { id: 'reply-display', label: 'Check replies, links, images and dark mode' },
  ],
  'apple-mail-mobile': [
    { id: 'plain-text', label: 'Use plain text in the device signature editor' },
    { id: 'send', label: 'Send a test from the iPhone or iPad' },
    { id: 'links', label: 'Check addresses and URLs in the received message' },
    { id: 'reply', label: 'Reply and verify the text signature' },
  ],
};
const STATUS_LABELS: Record<CheckStatus, string> = {
  pass: 'Passes',
  warning: 'To review',
  manual: 'Manual check',
  na: 'Not applicable',
};
function StatusIcon({ status }: { status: CheckStatus }) {
  const label = STATUS_LABELS[status];
  const icon = 'size-5';
  return status === 'pass' ? (
    <CircleCheckIcon className={cn(icon, PASS)} aria-label={label} />
  ) : status === 'warning' ? (
    <TriangleAlertIcon className={cn(icon, WARN)} aria-label={label} />
  ) : (
    <InfoIcon className={cn(icon, 'text-muted-foreground')} aria-label={label} />
  );
}
export function CheckPane() {
  const [version, setVersion] = useState<Version>('new');
  const { result, building } = useCurrentSignature();
  const profiles = useSignatureStore((st) => st.state.emailProfiles);
  const signatureState = useSignatureStore((st) => st.state);
  const clientChecks = useUiStore((st) => st.clientChecks);
  const toggleClientCheck = useUiStore((st) => st.toggleClientCheck);
  const selectedBuild = useQueuedBuild(signatureState, version === 'reply' ? { version: 'reply' } : { version: 'new' });
  const actions = useCopyActions(selectedBuild);
  const selected = EMAIL_PROFILE_OPTIONS.filter((p) => profiles.includes(p.id));
  const { report, error, checking, recheck } = useSignatureHealth(building ? null : result);
  const current = report?.versions.find((r) => r.version === version);
  const busy = building || checking;
  const hint = report ? (
    <Badge
      variant="outline"
      className={
        report.issues
          ? 'border-amber-600/30 bg-amber-500/10 text-amber-800 dark:text-amber-300'
          : 'border-emerald-600/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300'
      }
      data-testid="a11y-score"
    >
      {report.summary}
    </Badge>
  ) : null;
  return (
    <Pane id="check">
      <Section title="Signature health" hint={hint}>
        <Note>
          Checks both your new-message and reply signatures in light and dark mode. Automated checks cannot certify
          every email app version. Manual checks remain even when everything passes.
        </Note>
        {busy ? <Note>Checking both versions…</Note> : null}
        {error ? <Note warn>The check could not run: {error}</Note> : null}
        <Segmented
          label="Checked version"
          value={version}
          options={VERSIONS}
          onChange={setVersion}
          testId="check-version"
        />
        {current ? <Note>{current.subject}</Note> : null}
        <ul className={LIST} data-testid="a11y-list" aria-busy={busy}>
          {current?.items.map((it) => (
            <li key={it.id} className={ITEM} data-check={it.id} data-ok={it.ok} data-status={it.status}>
              <StatusIcon status={it.status} />
              <span>
                <span className={TITLE}>{it.title}</span>
                <span className={TEXT}>{it.text}</span>
              </span>
            </li>
          ))}
        </ul>
        <div className="flex justify-start">
          <Button variant="outline" onClick={recheck} disabled={!result || busy} data-testid="check-again">
            <RefreshCwIcon />
            Check again
          </Button>
        </div>
        {current ? (
          <details className={DETAILS} data-testid="feature-coverage">
            <summary>Feature coverage</summary>
            <Note>
              Shown, absent, switched off or not used by this design or reply. Visual settings still need a preview
              check.
            </Note>
            <ul className={cn(LIST, 'mt-2.5')}>
              {current.features.map((f) => (
                <li key={f.id} className={ITEM}>
                  <StatusIcon status={f.status} />
                  <span>
                    <span className={TITLE}>{f.title}</span>
                    <span className={TEXT}>{f.text}</span>
                  </span>
                </li>
              ))}
            </ul>
          </details>
        ) : null}
      </Section>
      <Section title="Email compatibility">
        <Note>
          Choose your target apps in Email profiles. Advice below is for the selected message version. The same HTML is
          exported for all profiles.
        </Note>
        <ul className={LIST} data-testid="compatibility-advice" aria-busy={busy}>
          {current?.compatibility.map((advice) => (
            <li key={advice.profile} className={ITEM}>
              <StatusIcon status={advice.status} />
              <div>
                <span className={TITLE}>{selected.find((p) => p.id === advice.profile)?.label}</span>
                <span className={TEXT}>{advice.text}</span>
                <div className="mt-2 flex flex-wrap gap-2">
                  {advice.text.toLowerCase().includes('animat') ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => useSignatureStore.getState().setShow('animate', false)}
                    >
                      Turn off animation
                    </Button>
                  ) : null}
                  {advice.profile === 'apple-mail' ? (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={!selectedBuild.result || selectedBuild.building || Boolean(selectedBuild.error)}
                      onClick={() => void actions.copyText()}
                    >
                      <FileTextIcon />
                      Copy plain text
                    </Button>
                  ) : advice.profile === 'outlook-classic' ? (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={!selectedBuild.result || selectedBuild.building || Boolean(selectedBuild.error)}
                      onClick={() => void actions.outlookPackage()}
                    >
                      <FileArchiveIcon />
                      Download Classic Outlook package
                    </Button>
                  ) : (
                    <Button size="sm" variant="outline" onClick={() => useUiStore.getState().setPane('files')}>
                      <FolderOpenIcon />
                      Open copy and install options
                    </Button>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
        <div data-testid="client-profile">
          {CLIENT_PROFILES.filter((p) => profiles.includes(p.profile)).map((client) => {
            const tests = NATIVE_TESTS[client.id] ?? [];
            const completed = tests.filter((test) => clientChecks[`${client.id}:${test.id}`]).length;
            return (
              <details key={client.id} className={DETAILS}>
                <summary>
                  {client.name} · {completed}/{tests.length} manual checks
                </summary>
                <Note>These are your native-app checks. The browser cannot mark them complete.</Note>
                <ul className={LIST}>
                  {(['layout', 'fonts', 'images', 'motion', 'validation'] as const).map((key) => (
                    <li key={key} className={TEXT}>
                      {client[key]}
                    </li>
                  ))}
                  {tests.map((test) => {
                    const id = `${client.id}:${test.id}`;
                    return (
                      <li key={id} className="list-none">
                        <label className="flex items-start gap-2">
                          <input
                            type="checkbox"
                            checked={clientChecks[id] ?? false}
                            onChange={() => toggleClientCheck(id)}
                            data-testid={`native-test-${id}`}
                          />
                          <span>{test.label}</span>
                        </label>
                      </li>
                    );
                  })}
                </ul>
              </details>
            );
          })}
        </div>
        <details className={DETAILS}>
          <summary>Signature requirements</summary>
          <ul className={LIST}>
            {SIGNATURE_REQUIREMENTS.map((r) => (
              <li key={r.title}>
                <span className={TITLE}>{r.title}</span>
                <span className={TEXT}>{r.text}</span>
              </li>
            ))}
          </ul>
        </details>
        <details className={DETAILS}>
          <summary>Sources</summary>
          <Note>
            Reviewed {COMPATIBILITY_REVIEWED}. Native paste and delivery behavior still need real-client tests.
          </Note>
          <ul className="list-disc space-y-1 pl-5 text-sm">
            {COMPATIBILITY_SOURCES.map((source) => (
              <li key={source.url}>
                <a
                  className="text-primary underline-offset-4 hover:underline"
                  href={source.url}
                  target="_blank"
                  rel="noreferrer"
                >
                  {source.title}
                </a>
              </li>
            ))}
          </ul>
        </details>
      </Section>
    </Pane>
  );
}
