/* The Reply section: the six short versions for replies and forwards, each previewed with your details. */
import { cn } from 'cn';
import { useId, useMemo } from 'react';
import { Label } from '../components/ui/label.tsx';
import { RadioGroup, RadioGroupItem } from '../components/ui/radio-group.tsx';
import { REPLY_STYLES } from '../engine.ts';
import type { Choice, ReplyStyle, SignatureState } from '../engine.ts';
import { useDebouncedValue, useQueuedBuild } from '../hooks.tsx';
import { useSignatureStore, useUiStore } from '../store.ts';
import { Note, Pane, Section, ShadowHtml } from '../ui.tsx';

const REPLY = { version: 'reply', static: true } as const;

interface ReplyCardProps {
  option: Choice<ReplyStyle>;
  state: SignatureState;
  checked: boolean;
  dark: boolean;
}

/** One reply style: its radio button, what it holds, and a still preview with your details. */
function ReplyCard({ option, state, checked, dark }: ReplyCardProps) {
  const id = useId();
  const input = useMemo(() => ({ ...state, replyStyle: option.id }), [state, option.id]);
  const { result } = useQueuedBuild(input, REPLY);
  const html = result ? (dark ? result.darkHtml() : result.html('embed')) : '';
  return (
    <div
      className={cn(
        'flex min-w-0 flex-col gap-1 rounded-lg border bg-card p-2.5 transition-colors',
        checked && 'border-primary ring-1 ring-primary',
      )}
      data-reply={option.id}
    >
      <div className="flex items-center gap-2">
        <RadioGroupItem value={option.id} id={id} />
        <Label htmlFor={id} className="cursor-pointer font-semibold">
          {option.label}
        </Label>
      </div>
      <p className="ml-6 text-xs text-muted-foreground">{option.note}</p>
      {/* Signature colours, not Studio colours: the preview shows the email as it will look. */}
      <div
        className="mt-1 ml-6 min-h-10 overflow-x-auto rounded-md border p-2.5"
        style={{ backgroundColor: dark ? '#1F1F1F' : '#FFFFFF' }}
        aria-hidden="true"
        inert
        data-testid={`reply-preview-${option.id}`}
      >
        {html ? <ShadowHtml html={html} color={dark ? '#FFFFFF' : '#242424'} /> : null}
      </div>
    </div>
  );
}

export function ReplyPane() {
  const state = useSignatureStore((st) => st.state);
  const update = useSignatureStore((st) => st.update);
  const dark = useUiStore((u) => u.dark);
  const setVersion = useUiStore((u) => u.setVersion);
  const previewState = useDebouncedValue(state, 400);

  return (
    <Pane id="reply">
      <Section title="Reply version" hint="short, for replies and forwards">
        <Note>
          Replies and forwards get a short signature so a thread stays easy to read. The previews below use your details
          and colours at this panel’s narrow width, as on a phone, where One line wraps between items; the main preview
          shows your pick at full width.
        </Note>
        <RadioGroup
          aria-label="Reply version"
          className="gap-2"
          value={state.replyStyle}
          onValueChange={(v: unknown) => {
            const picked = REPLY_STYLES.find((r) => r.id === v);
            if (!picked) return;
            update({ replyStyle: picked.id });
            setVersion('reply');
          }}
          data-testid="reply-picker"
        >
          {REPLY_STYLES.map((r) => (
            <ReplyCard key={r.id} option={r} state={previewState} checked={r.id === state.replyStyle} dark={dark} />
          ))}
        </RadioGroup>
      </Section>
    </Pane>
  );
}
