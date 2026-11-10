---
agent: 'agent'
description: 'Diagnose and fix a signature that looks different after pasting into Outlook'
---

# Fix a signature that renders differently in Outlook

The problem: ${input:problem:Which Outlook (new, web, Mac, iPhone, Android, classic Windows), which design and settings, and what looks wrong. Attach screenshots of the Studio and of Outlook.}

1. **Compare** the Studio preview with the Outlook screenshot. Name the exact difference: a wrapped line, stacked columns, a squashed photo, a missing colour, flicker, or a signature taller or wider than the preview.
2. **Match it** against the editor table in the [Outlook rules](../../docs/DEVELOPMENT.md#outlook-rules). Usual causes:
   - a style Outlook drops (`nowrap` on a span, inline-block, min or max width, a table float);
   - border-box sizing shrinking a cell;
   - images allowed to shrink;
   - an APNG frame using dispose op 2.
3. **Reproduce it** before fixing: extend the matching audit in `packages/engine/test/audit/`, or the Outlook rules tests in `test/unit/output.test.ts`, so it fails for this design and setting.
4. **Fix the engine** with the layout helpers: table cells, `nowrap` on the cell, `nb()`, `img()` sizes, and floats only on images with a spacer. Keep the 343 px phone fit.
5. **Run** `pnpm check` and `pnpm test:audit`. Everything must pass, including the new check. Update golden files only for the intended change.
6. **Record it:** if you found a new Outlook behaviour, add it to the editor table in `docs/DEVELOPMENT.md` and to the paste model in `packages/engine/src/compatibility.ts`. Name the symptom, the cause and the fix in the pull request.
