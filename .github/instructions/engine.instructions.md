---
applyTo: 'packages/engine/**'
---

# Engine code (packages/engine)

- **Strict TypeScript ES modules.** No UI code and no React. The engine runs in a browser (it draws on canvas), never in Node, except the generators in `scripts/`.
  - `src/types.ts` holds the shared types. `src/options.ts` holds every option list (designs use these, the Studio shows them).
  - Import with the `.ts` extension. Export named functions; no default exports, no classes for plain data.
  - Avoid `as` casts and `!`. When one is needed, add a comment that says why it is safe.
- **Never write a literal HTML comment opener** (`<` `!` `-` `-`) anywhere. Outlook-bound markers are built in two parts in `html.ts`.
- **Output HTML follows the [Outlook rules](../../docs/DEVELOPMENT.md#outlook-rules):**
  - layout with `tbl()`, `tr()` and `td()` from `html.ts`, inline styles only;
  - `white-space:nowrap` only on a `<td>`; short items through `cgrid({one:true})` or `shortText()`, spaces in short labels through `nb()`;
  - images through `img()`, rasterised at 2x as PNG, GIF or JPEG, never SVG;
  - the only float is on an `<img>` (`withPhoto()` adds the spacer that lets phones stack);
  - alt text on every image (`alt=""` plus `role="presentation"` for decoration).
- **Colour:** `P` on the page and `DP` inside dark windows; `th.accent` on light and `th.accentDark` on dark; `deep()` before white text on a colour; `tint()` for soft fills. Text keeps 4.5:1 (3:1 when large) in light and dark mode.
- **Text** is at least 11 px. Everything fits a 343 px phone in 1, 2 and 3 columns, new message and reply.
- **Animated images:** play once (`plays: 1` or `playsFor()`), stop moving within 5 s, end on a finished frame, and set `defaultImage` to the finished look for older clients, unsupported formats and disabled animation. Current classic Outlook can play GIFs; do not infer APNG support. Never use APNG dispose op 2 (iPhone Outlook flickers).
- **Designs** are one file each in `src/designs/`, declared with `defineDesign()` from `kit.ts` and listed in `src/designs/index.ts`. Reuse the kit's `card()` where it fits; put helpers in the design's own file unless several designs use them (`shared.ts`, `dev.ts`). Per-render facts live in `build.ts`.
- **New state keys** need a default and validation in `state.ts`. When you rename a key or value, map the old one there so saved signature files keep opening.
- **New image kinds** need a type and render case in `raster/`. Specs must be JSON-serialisable: they are the cache key.
- **Specs named `ic_*`, `so_*` or `m_*`** are re-created for the chosen icon style. Use other names for marks that must keep their look.
- **Data files** in `src/data/` are generated (`hwfonts.json`, `sample-photo.ts`) or hand-edited (`themes.json`, `icons.json`). Don't reformat them. Regenerate with `pnpm --filter @signature-studio/engine data:handwriting` or `data:photo`; `data:check` confirms they match.
- After a change: `pnpm --filter @signature-studio/engine test`. When you touch layout, a design, icons, palettes, fonts or text sizes, also run `pnpm test:audit`. If the HTML output changes on purpose, update the single golden snapshot (`test:golden -u`) and review the diff.
