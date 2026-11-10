/* The Check section: signature health for both versions, and what each Outlook client keeps. */
import { cn } from 'cn';
import { CircleCheckIcon, InfoIcon, RefreshCwIcon, TriangleAlertIcon } from 'lucide-react';
import { useState } from 'react';
import { Badge } from '../components/ui/badge.tsx';
import { Button } from '../components/ui/button.tsx';
import { NativeSelect, NativeSelectOption } from '../components/ui/native-select.tsx';
import {
  CLIENT_PROFILES,
  COMPATIBILITY_REVIEWED,
  COMPATIBILITY_SOURCES,
  EMAIL_PROFILE_OPTIONS,
  SIGNATURE_REQUIREMENTS,
} from '../engine.ts';
import type { CheckStatus, Version } from '../engine.ts';
import { useCurrentSignature, useSignatureHealth } from '../hooks.tsx';
import { Note, Pane, Section, Segmented } from '../ui.tsx';
import { useSignatureStore } from '../store.ts';
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
  const { result, building } = useCurrentSignature();
  const profile = useSignatureStore((st) => st.state.emailProfile);
  const profileInfo = EMAIL_PROFILE_OPTIONS.find((p) => p.id === profile);
  const { report, error, checking, recheck } = useSignatureHealth(building ? null : result);
  const [version, setVersion] = useState<Version>('new');
  const [clientId, setClientId] = useState<string>('outlook-new-web');
  const client = CLIENT_PROFILES.find((p) => p.id === clientId);
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
          every email app version. Current profile: {profileInfo?.label}. Manual checks remain even when everything
          passes.
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
      <Section title={`${profileInfo?.label} compatibility profile`}>
        <Note>
          Reviewed {COMPATIBILITY_REVIEWED}. Published guidance, project observations and Studio policies are
          distinguished below. Gmail and other clients are not assessed yet.
        </Note>
        <NativeSelect
          aria-label="Outlook client"
          className="w-full"
          value={clientId}
          onChange={(e) => setClientId(e.currentTarget.value)}
        >
          {CLIENT_PROFILES.map((p) => (
            <NativeSelectOption key={p.id} value={p.id}>
              {p.name}
            </NativeSelectOption>
          ))}
        </NativeSelect>
        {client ? (
          <ul className={LIST} data-testid="client-profile">
            {(['layout', 'fonts', 'images', 'motion', 'validation'] as const).map((key) => (
              <li key={key} className={TEXT}>
                {client[key]}
              </li>
            ))}
          </ul>
        ) : null}
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
