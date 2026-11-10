---
applyTo: 'packages/engine/test/**,packages/engine/scripts/**,apps/studio/e2e/**,apps/studio/src/**/*.test.*'
---

# Tests and scripts

- **Engine tests run in real Chromium** (Vitest browser mode with Playwright), because the engine draws on canvas and measures text. Projects in `packages/engine/vitest.config.ts`:
  - `unit`: helpers, data contracts, `normalize()`, and the Outlook rules for every design in 1, 2 and 3 columns, new message and reply. Fast; runs in `pnpm check`.
  - `golden`: the hosted HTML, dark preview and plain text of fixed cases, compared with one snapshot file in `test/golden/__snapshots__/`. Text width is stubbed so results don't depend on the fonts of your computer.
  - `audit`: slow checks that mirror what Outlook keeps (phone fit, one-line contacts, paste survival, contrast).
- **Fixtures** live in `test/fixtures.ts` and the test folders. Use made-up sample data, never real personal details.
- **Studio tests:** component tests with Vitest next to the code, and end-to-end tests with Playwright in `apps/studio/e2e/`. Select controls by role and accessible name, or by `data-testid` where there is no stable name; never by CSS class.
- **The Outlook emulation** in the audits is the paste model in `src/compatibility.ts`, and it mirrors the editor table in the [Outlook rules](../../docs/DEVELOPMENT.md#outlook-rules). If you learn a new Outlook behaviour, add it to both.
- **A clean run must check something.** Audits report how many layouts or items they checked, and fail on zero.
- **Fix the design when a check fails.** Change a test only when its expectation is outdated (such as a count of designs) and say why in the commit. Update golden files only when the output change is intended, and review the diff.
- **Generators in `scripts/`** run in Node with no dependencies (`node scripts/<name>.ts`). They must be deterministic and support `--check`.
- Never write a literal HTML comment opener in test code either.
