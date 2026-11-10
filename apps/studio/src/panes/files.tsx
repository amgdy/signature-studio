/* The Use section: copy both versions, install them, save and open a signature file, start over, and image hosting. */
import {
  CopyIcon,
  DownloadIcon,
  FileIcon,
  FolderOpenIcon,
  ReplyIcon,
  SaveIcon,
  TriangleAlertIcon,
  UserIcon,
} from 'lucide-react';
import { useId } from 'react';
import { Button } from '../components/ui/button.tsx';
import { Input } from '../components/ui/input.tsx';
import { Label } from '../components/ui/label.tsx';
import { RadioGroup, RadioGroupItem } from '../components/ui/radio-group.tsx';
import { useCopyActions, useCurrentSignature, useFileActions, useQueuedBuild } from '../hooks.tsx';
import { OutlookGuide } from '../guide.tsx';
import { MoreActions } from '../preview.tsx';
import { EMAIL_PROFILE_OPTIONS } from '../engine.ts';
import type { Version } from '../engine.ts';
import { useSignatureStore, useUiStore } from '../store.ts';
import { Note, Pane, Section, SwitchField } from '../ui.tsx';
const ACTIONS = 'flex flex-wrap gap-2';
const HOSTING = [
  {
    id: 'embed',
    label: 'Embedded (recommended)',
  },
  {
    id: 'hosted',
    label: 'Hosted on my site',
  },
] as const;
const NEW_MESSAGE = { version: 'new' } as const;
const REPLY = { version: 'reply' } as const;

/** Copies one version of the signature, built on its own so it does not depend on the preview. */
function CopyVersion({ version }: { version: Version }) {
  const state = useSignatureStore((st) => st.state);
  const shown = useQueuedBuild(state, version === 'reply' ? REPLY : NEW_MESSAGE);
  const { copy } = useCopyActions(shown);
  const reply = version === 'reply';
  return (
    <Button
      variant={reply ? 'outline' : 'default'}
      disabled={!shown.result || Boolean(shown.error)}
      onClick={() => void copy()}
      data-testid={reply ? 'files-copy-reply' : 'files-copy-new'}
    >
      {reply ? <ReplyIcon /> : <CopyIcon />}
      {reply ? 'Copy reply signature' : 'Copy signature'}
    </Button>
  );
}

export function FilesPane() {
  const files = useFileActions();
  const baseId = useId();
  const hostingId = useId();
  const shown = useCurrentSignature();
  const { imagesPackage } = useCopyActions(shown);
  const includePhoto = useUiStore((u) => u.includePhoto);
  const setIncludePhoto = useUiStore((u) => u.setIncludePhoto);
  const setStartOver = useUiStore((u) => u.setStartOver);
  const fileNote = useUiStore((u) => u.fileNote);
  const hosting = useSignatureStore((st) => st.state.hosting);
  const setHosting = useSignatureStore((st) => st.setHosting);
  const profile = useSignatureStore((st) => st.state.emailProfile);
  const profileInfo = EMAIL_PROFILE_OPTIONS.find((p) => p.id === profile);
  return (
    <Pane id="files">
      <Section title="Use your signature" hint={`Email profile: ${profileInfo?.label}`}>
        <Note>
          Copy the signature for new messages, then the short reply version, and paste each into your email settings.
          This profile covers {profileInfo?.note} Other email profiles are not supported yet.
        </Note>
        <div className={ACTIONS}>
          <CopyVersion version="new" />
          <CopyVersion version="reply" />
        </div>
        <MoreActions shown={shown} />
        {profile === 'outlook' ? <OutlookGuide /> : null}
      </Section>
      <Section title="Signature file" hint="details, images and style">
        <Note>
          Save everything in one file: your details, your photo and logo, the template and its style. Open it later, on
          another computer or in another browser, to carry on where you left off. Keep it private: it holds your
          details.
        </Note>
        <SwitchField
          label="Include my uploaded photo"
          checked={includePhoto}
          onCheckedChange={(on) => setIncludePhoto(on)}
          data-testid="include-photo"
        />
        <div className={ACTIONS}>
          <Button onClick={files.save} data-testid="files-save-file">
            <SaveIcon />
            Save signature file
          </Button>
          <Button variant="outline" onClick={() => void files.open()} data-testid="files-open-file">
            <FolderOpenIcon />
            Open signature file
          </Button>
        </div>
        {fileNote ? (
          <Note live id="file-note">
            {fileNote}
          </Note>
        ) : null}
      </Section>
      <Section title="Start over">
        <Note>
          Start blank, or try the designs with a made-up person. Both put every setting back to its default and keep
          your saved styles. Reset everything also deletes your saved styles and Studio settings.
        </Note>
        <div className={ACTIONS}>
          <Button variant="outline" onClick={() => setStartOver('blank')} data-testid="files-new-blank">
            <FileIcon />
            New blank signature
          </Button>
          <Button variant="outline" onClick={() => setStartOver('sample')} data-testid="files-random-sample">
            <UserIcon />
            Try a random sample
          </Button>
          <Button variant="destructive" onClick={() => setStartOver('reset')} data-testid="files-reset-everything">
            <TriangleAlertIcon />
            Reset everything
          </Button>
        </div>
      </Section>
      <Section title="Image hosting" hint="advanced">
        <RadioGroup
          aria-label="Image hosting"
          value={hosting.mode === 'hosted' ? 'hosted' : 'embed'}
          onValueChange={(v: unknown) =>
            setHosting({
              mode: v === 'hosted' ? 'hosted' : 'embed',
            })
          }
          data-testid="hosting"
        >
          {HOSTING.map((h) => (
            <div key={h.id} className="flex items-center gap-2">
              <RadioGroupItem value={h.id} id={`${hostingId}-${h.id}`} />
              <Label htmlFor={`${hostingId}-${h.id}`} className="font-normal">
                {h.label}
              </Label>
            </div>
          ))}
        </RadioGroup>
        <div className="grid gap-1.5">
          <Label htmlFor={baseId}>Image folder URL</Label>
          <Input
            id={baseId}
            type="url"
            value={hosting.base}
            placeholder="https://example.com/signature/"
            onChange={(e) =>
              setHosting({
                base: e.currentTarget.value.trim(),
              })
            }
            data-testid="host-base"
          />
        </div>
        <div className={ACTIONS}>
          <Button
            variant="outline"
            onClick={() => void imagesPackage()}
            disabled={!shown.result}
            data-testid="download-images"
          >
            <DownloadIcon />
            Download images
          </Button>
        </div>
        <Note>
          Embedded images need no hosting, but your email app may block or remove them. Hosted images make each email
          lighter: upload the downloaded images (new and reply versions) to the folder above, then copy the signature
          again.
        </Note>
      </Section>
    </Pane>
  );
}
