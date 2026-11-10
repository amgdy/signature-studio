---
applyTo: 'apps/studio/**'
---

# Studio code (apps/studio)

- **React 19 with shadcn/ui (Base UI) and Tailwind CSS 4**, strict TypeScript, function components and hooks. No class components, no default exports.
  - Use the shadcn components in `src/components/ui/` before building your own. Add new ones with `pnpm dlx shadcn@latest add <name>` from `apps/studio`, and only when a screen uses them. They are generated code: change them only when a screen needs it.
  - Style with Tailwind classes and the theme tokens (`bg-card`, `text-muted-foreground`, `border`, `ring-ring`, `bg-primary`). Never hardcode UI colours; real signature colours and the sample email are the exception.
  - The Studio has one look: the shadcn preset [`b6no21zDOK`](https://ui.shadcn.com/create?preset=b6no21zDOK) (Nova style, Olive base, Sky theme, Emerald charts, Manrope body, Montserrat headings, Lucide icons). Its light and dark tokens and fonts live in `src/index.css`, and `components.json` matches it. Don't add other app themes.
  - Components follow the official `base-nova` registry output. Keep the small accessibility fixes (Select chevron, Tabs orientation, Accordion heading level, Slider value text) when you update one, and preview registry changes before overwriting a file.
  - Base UI uses the `render` prop, not `asChild`. Radio groups and selects report `unknown` values: find the matching option instead of casting.
  - Import app icons from `lucide-react`. Don't change signature icons. Toasts use Sonner through `useNotify()`.
- **The engine is reached through `src/engine.ts`.** Keep the typed facade there; the app imports `@signature-studio/engine` through it.
- **Keep the app compact and grouped by purpose.** Shared controls live in `ui.tsx`, hooks and actions in `hooks.tsx`, and section panes stay together under `panes/`. Details and Contact share a file. Avoid splitting out one-control wrappers or adding extra layers.
- **State lives in the Zustand stores** in `src/store.ts`, with style helpers in `src/styles.ts`. Keep the storage keys `signature-studio.state.v5`, `signature-studio.styles.v5` and `signature-studio.ui.v5`. Compare picks are part of UI state.
  - Every state value goes through `toState()`, which runs the engine's `normalize()`. Never write raw objects into the signature store.
- **Builds are asynchronous.** The main preview and queued thumbnail, compare and reply builds use the helpers in `engine.ts` and `hooks.tsx`. Keep the preview's `aria-busy` contract and cancel queued work when its inputs change.
- **The signature preview renders in a shadow root** (`ui.tsx`), so Studio styles never touch the signature and the signature never touches the Studio.
- **Personal details never go in code or the build.** The Studio starts with a made-up random sample. Personal details belong in a user's private `.signature.yaml` file.
- **Saved styles carry the look only** (`STYLE_KEY_LIST` plus `STYLE_SHOW_LIST`): never details, the photo or the logo image. Signature files carry everything. Built-in styles live in `src/styles.yaml`. Signature and styles exports use YAML version 2 with `colors` and `gradient`; readers still accept version 1 theme ids. Expand legacy input before applying defaults.
- **The build is one offline HTML file** (`vite-plugin-singlefile`). Don't load fonts, images or scripts from the network, and don't add code that needs a server. The page must work from `file://`.
- **Accessibility:** every control has a visible label or an `aria-label`; images have alt text; keyboard users can reach everything (the section rail uses roving focus with the arrow keys); motion respects `prefers-reduced-motion`; the layout works at 343 px.
- **UI text** is plain and short, in sentence case, and says what happens ("Copy signature", "Remove logo").
- **Test hooks:** e2e tests select controls by role and accessible name, or by `data-testid` where there is no stable name. Keep existing `data-testid` values; if you rename one, update `e2e/`.
- After a change: `pnpm --filter @signature-studio/studio test`, then `pnpm --filter @signature-studio/studio build` and `pnpm --filter @signature-studio/studio test:e2e`. For a visible change, check the page in light and dark mode and at phone width.
