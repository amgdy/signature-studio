# Agent guide

Read [.github/copilot-instructions.md](.github/copilot-instructions.md) first. It is the full brief for this repository. In short:

- **Product:** Signature Studio makes HTML email signatures that look right in every Outlook. The Studio builds into one HTML file that works offline.
- **Layout:** `packages/engine` (TypeScript signature engine, no UI) and `apps/studio` (React 19, shadcn/ui, Tailwind CSS 4, Vite 8).
- **Commands:** `pnpm install`, `pnpm dev`, `pnpm build`, `pnpm check` (format, lint, types, unit and golden tests), `pnpm test:e2e`, `pnpm test:audit`. Node 24+ and Playwright's Chromium.
- **Output HTML must survive Outlook's editors:** tables only, inline styles, `nowrap` only on table cells, images through `img()` as 2x rasters (no SVG), alt text on every image, WCAG AA contrast in light and dark mode, text at least 11 px, a 343 px phone fit, and motion that stops within 5 seconds. See the [Outlook rules](docs/DEVELOPMENT.md#outlook-rules).
- **Never** write a literal HTML comment opener in code, put real personal details in the repository, or finish with a failing check.
- **Docs:** [FEATURES](docs/FEATURES.md) (what the app does, including the 36 designs) and [DEVELOPMENT](docs/DEVELOPMENT.md) (code, Outlook rules, tests and publishing).
