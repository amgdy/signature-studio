---
agent: 'agent'
description: 'Add a colour palette that stays readable everywhere'
---

# Add a colour palette

Add the palette: ${input:palette:Name, group (tech, calm, nature, warm or rich) and the colours you want}

1. **Add an entry** to `packages/engine/src/data/themes.json`: `{ "name", "colors": [...], "gradient", "group" }`.
   - `colors`: 1 to 4 uppercase six-digit hex values. These are the editable swatches, not pre-adjusted text shades.
   - `gradient`: true to blend the colours; false for solid decorations using the first colour. A one-colour preset must use false.
   - `color.ts` derives readable light/dark text shades and gradient stops with the same recipe for every preset and edit. Do not add accent overrides or a separate render path.
   - `group`: where the picker lists it. Check it is not a near copy of a palette already in that group.
   - The shimmer line and sparkle are drawn from these settings, so there is nothing to generate.
2. **Run** `pnpm --filter @signature-studio/engine test` (the palette contrast contract and counts) and `pnpm test:audit`.
3. **Update** the palette count in `test/unit/data.test.ts`, `docs/FEATURES.md` and `README.md`.
