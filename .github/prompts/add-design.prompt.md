---
agent: 'agent'
description: 'Add a new signature design, Outlook-safe and fully tested'
---

# Add a new signature design

Add the design described by the user: ${input:design:Describe the design, who it suits and what makes it distinct}

Follow [AGENTS.md](../../AGENTS.md) and the [Outlook rules](../../docs/DEVELOPMENT.md#outlook-rules). Steps:

1. **Pick an id and name**, a default palette from `packages/engine/src/data/themes.json`, default icons, and gallery filters (`DESIGN_CATEGORY_OPTIONS` in `src/options.ts`).
2. **Write it** in its own file, `packages/engine/src/designs/<id>.ts`, and add it to `src/designs/index.ts`.
   - For a card layout, copy `classic.ts` and change the `card({ ... })` settings from `kit.ts` (photo size, shape, ring, name size, gap). The kit already does everything below.
   - For a layout of your own, write `assets()` and `html()` inside `defineDesign({...})`. Keep helpers in the file unless another design uses them.
   - `assets(s, th, v, o)` returns image specs keyed by name.
   - `html(s, A, th, P, v, D)` returns table markup that uses `A[name]` for images and `D[name]` for their sizes.
   - Support:
     - `v === 'reply'` (the design's own reply);
     - `s.colsEff === 2` (two columns with `twoCol()` or the design's own split);
     - `s.cols3`, a third column of link icons: `twoCol()` adds it, or the design places `renderContext.col3` itself and sets `renderContext.col3used = true`;
     - the photo with `photoImg(A, base, s)` (scaled by photo size);
     - the handwritten name (`nameAsset`, `nameRow`), pronouns and the second-language name (`altRow`, `altSpan`);
     - every icon style (contacts named `ic_<kind>`, links `so_<kind>`), banner, sign-off and disclaimer;
     - `extras: [...]` if it shows focus areas, featured items, highlights or a quote itself.
   - On dark backgrounds use the dark palette (`DP`) and `th.accentDark`, and set `darkCol3: true`.
3. **Keep it phone-safe:** short items in `nowrap` cells, no more than about 317 px of content, text at least 11 px.
4. **Optionally add a built-in style** to `apps/studio/src/styles.yaml`.
5. **Update the docs:** add the design to the tables in `docs/FEATURES.md`, and update the design counts in `docs/FEATURES.md`, `README.md` and `AGENTS.md`.
6. **Update the tests:** the design count in `test/unit/data.test.ts`; add the id to `DESIGNS` in `test/fixtures.ts` (the golden matrix).
7. **Run:**
   - `pnpm --filter @signature-studio/engine test` (then `test:golden -u` for the new case, and review it)
   - `pnpm test:audit`
8. **Look at it** in the Studio (`pnpm dev`) in 1, 2 and 3 columns, light and dark, at phone width.
