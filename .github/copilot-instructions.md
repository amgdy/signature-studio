# Copilot instructions: Signature Studio

Signature Studio makes **HTML email signatures that look right in every Outlook**. Pick a design, fill in your details and copy the signature into Outlook. Everything runs in the browser; nothing is uploaded.

The hardest constraint is not the browser. It is **what Outlook's editors keep when a signature is pasted**: RoosterJS in new Outlook, Outlook on the web and Outlook mobile; Word in classic Outlook for Windows; and the Outlook for Mac editor. Read the [Outlook rules](../docs/DEVELOPMENT.md#outlook-rules) before you change any layout code.

Other references: [docs/FEATURES.md](../docs/FEATURES.md) (every feature and the 36 designs) and [docs/DEVELOPMENT.md](../docs/DEVELOPMENT.md) (code map, how a build works, tests, debugging and publishing).

## Commands

Node 24 or later and pnpm (`corepack enable`). Run from the repository root.

```bash
pnpm install
pnpm dev              # the Studio at http://localhost:5173
pnpm build            # apps/studio/dist/index.html, one file that also opens from disk
pnpm check            # format check, lint, type check, unit and golden tests
pnpm test:e2e         # Studio end-to-end tests (Playwright)
pnpm test:audit       # slow audits: phone fit, one-line contacts, paste survival, contrast
pnpm --filter @signature-studio/engine test:golden -u   # update golden files after an intended output change
pnpm --filter @signature-studio/engine data:check       # data files match their generators
```

- Tests need Playwright's Chromium (`pnpm exec playwright install chromium`).
- **Never finish with a failing check.** Fix the design, not the test, unless the test's expectation is outdated (such as a count of designs).

## Project map

```
packages/engine/          the signature engine (TypeScript, no UI)
  src/index.ts            public API; src/check.ts is the both-version signature health report
  src/types.ts            shared types; src/options.ts every option list and the unions derived from them
  src/state.ts            DEFAULT_STATE and normalize()
  src/build.ts             build(), view state and finalization
  src/designs/            one file per design (36); kit.ts has defineDesign() and the ready-made card()
  src/content.ts layout.ts html.ts color.ts icons.ts export.ts
  src/raster/ png.ts       raster drawing and PNG/APNG encoding
  src/data/               palettes, icons, handwriting fonts, sample photo
  scripts/                deterministic data generators with --check
  test/                   unit, one-file golden snapshot and audit tests (Vitest browser mode)
apps/studio/              the Studio (React 19, shadcn/ui, Tailwind CSS 4, Zustand, Vite 8)
  src/                    app shell, shared UI, store, hooks and section panes
  e2e/                    Playwright tests
docs/                     FEATURES.md (what the app does) and DEVELOPMENT.md (how to work on it)
```

The Studio starts with a made-up sample person. Use **New blank signature** to clear the details. Save personal data in a private `.signature.yaml` file; it is not baked into the build.

## Hard rules for the signature HTML

Every design must follow these. Each one prevents a known Outlook paste problem.

1. **Layout is table cells only.** Use `tbl()`, `tr()` and `td()` from `html.ts`. Never rely on `float` or `align` on tables, `display:inline-block`, `min-width`, `max-width`, flexbox, grid, positioning, `<style>` blocks or classes. Inline styles only.
2. **`white-space:nowrap` only works on a `<td>`.** Outlook strips it from spans and links. Short items that must stay on one line need their own cell: `cgrid({one:true})` and `shortText()` do this. Spaces in short labels go through `nb()`.
3. **Images go through `img()`**, rasterised at 2x as PNG, APNG or GIF data URLs. **No SVG in the output.**
4. **The only float is on an `<img>`.** `withPhoto()` uses it for the photo column, with a spacer row so phones drop the content under the photo.
5. **Every image has alt text.** Decoration gets `alt=""` and `role="presentation"` (`img()` adds the role). Icon-only links need a named image or a `title`.
6. **The wrapper is `<div lang="en" dir="ltr">`** with `text-size-adjust:100%`. The name in another language uses `altSpan()`, which sets `lang` and `dir`.
7. **Contrast is at least 4.5:1** (3:1 for large text) in light **and** dark mode. Use `P` on the page and `DP` inside dark windows, `th.accent` on light and `th.accentDark` on dark, `deep()` before white text on a colour, and `tint()` for soft fills.
8. **Text is at least 11 px** and fits a **343 px phone** in 1, 2 and 3 columns, new message and reply, typed and handwritten name.
9. **Animation** plays once and stops within 5 seconds, ending on a finished frame, unless the user picks "Keep looping". The static frame must look finished for older clients, unsupported formats and disabled animation. Current classic Outlook can play GIFs when enabled; this does not establish APNG support. APNG frames never use dispose op 2 (iPhone Outlook flickers).
10. **No literal HTML comment opener** (`<` `!` `-` `-`) anywhere in code. Markers are built in two parts in `html.ts`.

## Code conventions

- **TypeScript 7, strict.** ES modules with `.ts` import extensions. Named exports only. No `any`; avoid `as` and `!`, and when one is needed, say why in a comment.
- **Option lists live in `src/options.ts`** as `as const` arrays. Unions such as `IconStyle` and `DesignCategory` are derived from them, and the Studio shows the same lists.
- **Designs** are declared with `defineDesign({ id, name, theme, anim, cols, icons, cats, badge, tag, blurb, extras?, darkCol3?, handAlways?, assets(s, th, v, o), html(s, A, th, P, v, D) })` and listed in `designs/index.ts`. Start a new one from `classic.ts`, which is the kit's `card()` with its settings.
  - `assets` returns image specs keyed by name; `html` writes table markup with `A[name]` tokens and `D[name]` sizes.
  - `v` is `'new'` or `'reply'`; `s.colsEff` is 1 or 2, and `s.cols3` adds the third column.
  - Use `psz(s, n)` and `photoImg(A, n, s)` so the photo size applies.
- **Per-render facts** (label mode, accent, photo position, third column, large photo) are in `renderContext`, set by `build()`.
- **Icons** go through `iconFor()`. `restyle()` re-creates every spec named `ic_*`, `so_*` or `m_*`; use other names for marks that must keep their look.
- **Every state key** has a default and validation in `state.ts`. Saved signature files must keep opening: when you rename a key or value, map the old one in `normalize()`.
- **The Studio** imports the engine through `src/engine.ts`. Use the shadcn components in `src/components/ui/` and Tailwind theme tokens, not custom CSS, wherever one fits. Every control has an accessible name.

## Adding or changing things

Use the prompt files in `.github/prompts/`: `add-design`, `add-palette`, `fix-outlook-render` and `release`.

- **New design:** copy `src/designs/classic.ts` to `<id>.ts` (see "Add a design, style or palette" in `docs/DEVELOPMENT.md`), support 1, 2 and 3 columns and a reply version, give its own photo placement a phone fallback, add it to `docs/FEATURES.md` and the design count in tests, then run `pnpm check` and `pnpm test:audit`.
- **New palette:** add a preset to `src/data/themes.json` with `name`, `colors` (1–4 uppercase six-digit hex values), `gradient` (false for one colour) and `group` (`tech`, `calm`, `nature`, `warm` or `rich`). `color.ts` derives readable text shades and gradient stops for every preset and edit; do not add hand-tuned overrides. State stores colours and gradient, not a theme id. The shimmer is drawn from those colours, so there is nothing to generate.
- **New Studio control:** state goes through `DEFAULT_STATE`; e2e tests find controls by role and accessible name.

## Product direction

- 1, 2 or 3 columns in every design. In 2 columns the photo is its own column by default; "Beside name" is the option.
- Replies are short. The default reply is one line.
- Transparent background by default, with an optional solid colour.
- Modern Fluent looks with clear vector icons. Object-style designs (passport, badge, postcard) and developer looks (terminal, editor, agent).
- Focus areas, featured items, highlights and a quote can show in any design.
- Accessible by default: alt text, WCAG AA contrast, motion under 5 seconds, and a phone fit in every Outlook.
- Users upload their own photo and company logo. No company logo is built in.

## Writing

Docs and UI text use plain, short sentences in sentence case, with no jargon. UI text says what happens ("Copy signature", not "Execute copy").

## Don'ts

- Don't load fonts, images or scripts from the network, in the signature or the Studio. Everything is embedded, so it works offline and in Outlook.
- Don't put real personal details in code, tests, docs or screenshots. Use the sample person (Sam Taylor, Contoso).
- Don't reformat `src/data/*.json` by hand or with a formatter. Regenerate them with their scripts.
- Don't update golden files to make a test pass unless the output change is intended. Review the diff.
- Don't add a dependency without a clear reason. Prefer the platform and what is already installed.
