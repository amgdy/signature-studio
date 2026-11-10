# Development

This guide covers setup, how the code fits together, the rules signature HTML must follow, and how to test and publish. For what the app does, see [FEATURES.md](FEATURES.md).

## Setup

You need Node 24.11 or later and pnpm (run `corepack enable` once).

```bash
pnpm install
pnpm exec playwright install chromium   # once, for the browser tests
pnpm dev                                # the Studio at http://localhost:5173
```

| Command                                             | What it does                                                             |
| --------------------------------------------------- | ------------------------------------------------------------------------ |
| `pnpm dev`                                          | Runs the Studio with hot reload                                          |
| `pnpm build`                                        | Builds `apps/studio/dist/index.html`, one file that also opens from disk |
| `pnpm check`                                        | Format check, lint, type check, and the unit and golden tests            |
| `pnpm test:e2e`                                     | Studio end-to-end tests against the built page                           |
| `pnpm test:audit`                                   | Slow audits: phone fit, one-line items, paste survival and contrast      |
| `pnpm --filter @signature-studio/engine data:check` | Checks that the generated data files match their generators              |
| `pnpm format` / `pnpm lint:fix`                     | Fixes formatting and lint problems                                       |

## Project layout

```
packages/engine/          the signature engine (TypeScript, no UI)
  src/index.ts            public API; check.ts is the signature health report
  src/state.ts            DEFAULT_STATE and normalize()
  src/build.ts            build(), view state and finalize()
  src/options.ts          every option list
  src/compatibility.ts    Outlook client profiles and the paste model
  src/designs/            one file per design; kit.ts has defineDesign() and card()
  src/html.ts layout.ts   markup and table layout helpers
  src/color.ts icons.ts   palettes, contrast and icons
  src/raster/ png.ts      canvas drawing and PNG/APNG encoding
  src/export.ts           clipboard, downloads and the classic Outlook package
  src/data/               palettes, icons, handwriting fonts and sample photo
  scripts/                generators for the data files
  test/                   unit, golden and audit tests
apps/studio/              the Studio (React 19, shadcn/ui, Tailwind CSS 4, Zustand, Vite 8)
  src/engine.ts           the engine facade and build queue
  src/store.ts            signature, UI and saved-style state
  src/styles.yaml         the built-in styles
  src/panes/              one file per section pane
  src/components/ui/      shadcn components
  e2e/                    Playwright tests
```

The Studio imports the engine as source through `src/engine.ts`. There is no separate engine build.

| Tool                                   | Used for                                                       |
| -------------------------------------- | -------------------------------------------------------------- |
| TypeScript 7                           | Strict types (`tsc --build`)                                   |
| React 19, shadcn/ui and Tailwind CSS 4 | The Studio, styled by shadcn preset `b6no21zDOK`               |
| Vite 8 and `vite-plugin-singlefile`    | Dev server and the one-file build                              |
| Vitest browser mode and Playwright     | Tests in real Chromium, where canvas and fonts behave normally |
| oxlint and Prettier                    | Type-aware lint and formatting                                 |

## How a signature is built

1. **`normalize()`** (`state.ts`) turns any input, from the Studio or a signature file, into a full state. Unknown values fall back to `DEFAULT_STATE`.
2. **`build()`** (`build.ts`) works out the view: columns, the third column, photo size and background.
3. **The design's `assets()`** returns image specs, plain JSON such as `{ kind: 'photo', size: 96, shape: 'circle' }`.
4. **`restyle()`** (`icons.ts`) swaps every spec named `ic_*`, `so_*` or `m_*` for the chosen icon style.
5. **`renderSpec()`** (`raster/`) draws each spec on a canvas at 2x and encodes it as PNG, palette PNG or APNG. Results are cached by spec.
6. **The design's `html()`** writes table markup with image tokens. It runs once with the light palette and once with the dark one.
7. **`compose()`** adds the shared parts: the third column, extras, banner, sign-off, disclaimer, typography and the wrapper.
8. **`finalize()`** swaps the tokens for embedded data URLs, hosted URLs or files in a folder.

Facts that apply to a whole render, such as the label mode, accent, photo position and third column, are set on `renderContext` (`html.ts`) by `build()`. Designs read them.

## Outlook rules

A signature is only useful if it survives being pasted into Outlook. Each Outlook editor keeps a narrow, different subset of HTML and CSS: RoosterJS in new Outlook, Outlook on the web and mobile; Word in classic Outlook for Windows; and the Outlook for Mac editor.

### What each editor keeps

These are project observations from real pastes, not an official support matrix.

|                                           | New Outlook and web              | Outlook for Mac                      | Classic Outlook (Word)    |
| ----------------------------------------- | -------------------------------- | ------------------------------------ | ------------------------- |
| Tables, padding, borders, backgrounds     | Kept                             | Kept                                 | Kept (no rounded corners) |
| `white-space:nowrap` on `<td>`            | Kept                             | Kept                                 | Kept                      |
| `white-space:nowrap` on `<span>` or `<a>` | **Dropped**                      | Kept                                 | Mostly kept               |
| `display:inline-block`                    | **Dropped**                      | Kept                                 | Ignored                   |
| `min-width` and `max-width`               | **Dropped**                      | `min` kept, **`max` dropped**        | Ignored                   |
| `float` or `align` on `<table>`           | **Dropped**                      | Unreliable                           | Partly                    |
| `float` on `<img>`                        | Kept                             | Kept                                 | Kept                      |
| Image `width` and `height`                | Kept, capped at the editor width | **May shrink in width only** (ovals) | Kept                      |
| Animated GIF and APNG                     | Plays; verify app and settings   | Plays; verify app and settings       | GIF may play; verify APNG |
| SVG, `<style>`, classes, flexbox, grid    | Stripped                         | Stripped                             | Stripped                  |

Fluent-based Outlook apps also apply `box-sizing:border-box` to everything, so cell padding eats into a fixed width. Content that must not break needs `nowrap` on its cell, not a wider cell.

### The rules

1. **Lay out with table cells only.** Use `tbl()`, `tr()` and `td()`. Never use `float` or `align` on tables, `display:inline-block`, `min-width`, `max-width`, flexbox, grid, positioning, `<style>` blocks or classes. Use inline styles only.
2. **`white-space:nowrap` works only on a `<td>`.** A short item that must stay on one line needs its own cell. `cgrid({ one: true })` and `shortText()` do this for items of 24 characters or fewer. Spaces in short labels go through `nb()`.
3. **Draw every image with `img()`.** It sets fixed sizes so no editor can squash an image. Images are 2x PNG, GIF or APNG data URLs. **No SVG in the output.**
4. **Only an `<img>` may float.** `withPhoto()` floats the photo for the photo column and large photos, with a spacer row so phones put the content under the photo.
5. **Every image has alt text.** Decoration gets `alt=""` and `role="presentation"` (`img()` adds the role). An icon-only link needs a named image or a `title`.
6. **The wrapper is `<div lang="en" dir="ltr">`** with `text-size-adjust:100%`. A name in another script uses `altSpan()`, which sets `lang` and `dir`.
7. **Contrast is at least 4.5:1** (3:1 for large text) in light **and** dark mode. Use `P` on the page and `DP` inside dark windows, `th.accent` on light and `th.accentDark` on dark, `deep()` before white text on a colour, and `tint()` for soft fills.
8. **Text is at least 11 px and fits a 343 px phone** in 1, 2 and 3 columns, new message and reply, typed and handwritten name.
9. **Motion plays once and stops within 5 seconds** on a finished frame, unless the user picks "Keep looping". The still frame must look finished for clients that don't animate. APNG frames never use dispose op 2, because iPhone Outlook flickers.
10. **Never write a literal HTML comment opener in code.** The Studio is one HTML file with its code inlined in a `<script>`, and the marker breaks the page. `html.ts` builds its markers in two parts.

### Layout helpers

| Helper                                    | File        | What it does                                                                          |
| ----------------------------------------- | ----------- | ------------------------------------------------------------------------------------- |
| `tbl()`, `tr()`, `td()`                   | `html.ts`   | Presentation tables with inline styles                                                |
| `img(token, w, h, alt, o)`                | `html.ts`   | A fixed-size image; decorative when `alt` is empty                                    |
| `spacer(w)`                               | `html.ts`   | A transparent spacer that sets how narrow content may get beside a floating photo     |
| `withPhoto(photo, body, gap, o)`          | `layout.ts` | Places the photo: in a cell, as a floating column, beside the name or above on phones |
| `twoCol(L, R, P, o)`                      | `layout.ts` | Who you are on the left, how to reach you on the right, plus the link-icon column     |
| `cgrid(cells, o)`                         | `layout.ts` | Contact items, one per row or in rows of two                                          |
| `flowLine()`, `lineRows()`, `shortText()` | `layout.ts` | Lines that wrap between items, measured rows, and the one-line test                   |

### Sources and limits

- [Microsoft: fonts and fallback stacks](https://learn.microsoft.com/dynamics365/customer-insights/journeys/use-custom-fonts). The Studio uses local font stacks only.
- [Microsoft: animated graphics in Outlook](https://support.microsoft.com/en-au/outlook/the-animated-graphic-in-my-e-mail-message-doesn-t-work). GIFs can play when animation is on. That doesn't prove APNG support.
- [Microsoft: picture blocking in classic Outlook](https://support.microsoft.com/en-us/outlook/block-or-unblock-automatic-picture-downloads-in-classic-outlook-email-messages). Hosted images may be blocked.

The 11 px minimum, the 343 px phone width and the 400,000-byte size budget are Studio policies, not Outlook limits. The client profiles and the paste model are plain data in `src/compatibility.ts`. To add another email client, extend that data and its tests. Browser checks don't run Word or native Outlook, so paste, send, reply and forward a real test when you change layout.

## Add a design, style or palette

### A design

1. Copy `packages/engine/src/designs/classic.ts` to `<id>.ts`. Change the id, name, palette, categories (from `DESIGN_CATEGORY_OPTIONS`), tag and blurb.
2. Change the `card({ ... })` settings (`photo`, `shape`, `ring`, `nameSize`, `gap`), or write your own `assets()` and `html()`. Your own layout must support 1 and 2 columns (`s.colsEff`), a reply version (`v === 'reply'`), and a phone fallback for its photo. Use `psz(s, n)` and `photoImg(A, n, s)` so the photo size applies.
3. Add it to `TEMPLATES` in `designs/index.ts`, to `DESIGNS` in `test/fixtures.ts`, to the design count in `test/unit/data.test.ts`, and to [FEATURES.md](FEATURES.md#designs).
4. Run `pnpm check`, review and update the golden file, then run `VITE_AUDIT_DESIGNS=<id> pnpm test:audit`.

### A style

A style is a design plus settings. No code is needed. Add an entry to `apps/studio/src/styles.yaml`:

```yaml
- id: p-sage-card # unique, starts with p-
  name: Sage Card
  tag: Calm serif card
  template: editorial # a design id
  theme: sage # a palette id from themes.json
  cols: 2
  iconStyle: soft
  nameStyle: hand
  bgMode: solid
  bgColor: tint
```

Keys you leave out keep their defaults. `pnpm test` checks every built-in style.

### A palette

Add a preset to `packages/engine/src/data/themes.json` with `name`, `colors` (1 to 4 uppercase six-digit hex values), `gradient` (false for one colour) and `group` (`tech`, `calm`, `nature`, `warm` or `rich`). `color.ts` derives readable text shades and gradient stops for every palette, so don't add hand-tuned overrides. Update the palette count in `test/unit/data.test.ts` and in [FEATURES.md](FEATURES.md#layout-and-colour), then run `pnpm check` and `VITE_AUDIT_ALL=1 pnpm test:audit`.

### Options and state

- Option lists live in `src/options.ts` as `as const` arrays. Types derive from them, and the Studio shows the same lists.
- Every state key has a default and validation in `state.ts`. If you rename a key or value, map the old one in `normalize()` so saved files keep opening.

## Tests

Never finish with a failing check. Fix the design, not the test, unless the test's expectation is out of date, such as a count.

| You changed                                            | Run                                                 |
| ------------------------------------------------------ | --------------------------------------------------- |
| Anything                                               | `pnpm check`                                        |
| The Studio                                             | `pnpm test:e2e` too                                 |
| Layout, a design, icons, palettes, fonts or text sizes | `pnpm test:audit` too                               |
| The signature HTML on purpose                          | Update the golden file and review the diff          |
| A generator or a file in `src/data/`                   | `pnpm --filter @signature-studio/engine data:check` |

**Engine unit, golden and audit tests** run in real Chromium (Vitest browser mode), because the engine draws on canvas.

- **Unit** (`test/unit/`): data contracts and counts, state validation, the Outlook rules for every design in every column count and version, photo sizing, typography and signature health.
- **Golden** (`test/golden/`): one snapshot file with the HTML, dark HTML, plain text and image list for a fixed matrix of cases. After an intended output change, run `pnpm --filter @signature-studio/engine test:golden -u` and review the diff.
- **Audits** (`test/audit/`): `phone` (nothing spills past 343 to 680 px), `oneline` (short items stay on one line), `paste` (images keep their size) and `contrast` (AA and 11 px in light, dark and on cards). They run real signatures through the paste model in `src/compatibility.ts`. Results can differ slightly between machines, because they measure real fonts.

```bash
VITE_AUDIT_DESIGNS=executive,terminal pnpm test:audit   # only these designs
VITE_AUDIT_ALL=1 pnpm test:audit                        # contrast in every palette and card
```

**Studio tests:**

- **Unit** (`apps/studio/src/*.test.ts`, Node): the engine facade, styles, signature files, samples and the build queue.
- **End-to-end** (`apps/studio/e2e/`, Playwright): runs against the production build. Tests find controls by role and accessible name, and seed a fixed state rather than a random sample. On failure, open the trace with `pnpm --filter @signature-studio/studio exec playwright show-trace <file>`.

**Data files:** `hwfonts.json` and `sample-photo.ts` are generated by the scripts in `packages/engine/scripts/`. Don't edit them, or format `src/data/*.json`, by hand.

The photo check compares the source and decompressed PNG content. Different zlib versions may compress the same pixels differently. Generator tests (`test/generators/`, Node) check this comparison and ensure changed pixels or damaged images still fail.

## Debug in VS Code

Open the folder in VS Code, set a breakpoint and pick a configuration in Run and Debug.

| Configuration                   | What it debugs                                                     |
| ------------------------------- | ------------------------------------------------------------------ |
| Studio in Chrome / Edge         | The Studio and the engine in the browser. Starts `pnpm dev` first. |
| Studio unit test (current file) | A Studio unit test in Node                                         |
| Engine test (current file)      | An engine unit, golden or audit test, attached to the test browser |
| E2E test (current file)         | A Playwright test, headed, with no timeout                         |
| Data script (current file)      | A data generator, run with `--check`                               |

`.vscode/tasks.json` adds the dev server, Check (the default test task) and Build (the default build task).

## Publish

- **CI** (`.github/workflows/ci.yml`) runs on every push and pull request: format, lint, type check, `data:check`, unit and golden tests, the build and the end-to-end tests. Started by hand, it can also run the audits.
- **GitHub Pages** (`.github/workflows/pages.yml`) publishes the Studio after CI passes on `main`. Turn it on once in **Settings > Pages > Source: GitHub Actions**.
- **Build footer:** Vite embeds the Studio package version, build time and GitHub run details in the HTML. No network request is needed. CI builds use the current run. Automatic Pages builds pass `STUDIO_BUILD_RUN_ID` and `STUDIO_BUILD_RUN_NUMBER` from the triggering CI run; manual deployments link to their own run. Local builds show **Local build** with no run link.
- **Custom domain:** add it in **Settings > Pages > Custom domain**, then add a DNS `CNAME` record for the subdomain that points to `<your-user>.github.io`. When the certificate is ready, tick **Enforce HTTPS**. No `CNAME` file is needed, and the build uses relative paths, so it works at a domain root or in a folder.
