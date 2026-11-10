# Third-party notices

## Handwriting fonts

Files: `packages/engine/src/data/hwfonts.json` (generated) and `packages/engine/assets-src/fonts/*.svg` (sources).

The ten handwriting styles are single-line (stroke) versions of open-licensed fonts. They were created as EMS fonts by Sheldon B. Michaels, with SVG font conversion by Windell H. Oskay (Evil Mad Scientist Laboratories). They are licensed under the **SIL Open Font License, Version 1.1** (https://openfontlicense.org). Each SVG file carries its own licence metadata. Sources: [SVG Fonts](https://gitlab.com/oskay/svg-fonts/-/tree/master/fonts/EMS); the full licence is in `packages/engine/assets-src/fonts/OFL.txt`.

| Style in the Studio | EMS font            | Derived from          | Original designer                |
| ------------------- | ------------------- | --------------------- | -------------------------------- |
| Signature           | EMS Allure          | Allura                | Rob Leuschke, TypeSETit          |
| Flowing             | EMS Swiss           | Italianno             | Rob Leuschke, TypeSETit          |
| Autograph           | EMS Society         | Mrs Saint Delafield   | Alejandro Paul, Sudtipos         |
| Brush script        | EMS Brush           | Alex Brush            | Rob Leuschke, TypeSETit          |
| Classic cursive     | EMS Decorous Script | Petit Formal Script   | Impallari Type                   |
| Casual              | EMS Neato           | Bad Script            | Roman Shchyukin, Gaslight        |
| Calligraphic        | EMS Bird            | Bilbo                 | Rob Leuschke, TypeSETit          |
| Looped              | EMS Capitol         | Sacramento            | Brian J. Bonislawsky, Astigmatic |
| Loose print         | EMS Casual Hand     | Covered By Your Grace | Kimberly Geswein                 |
| Neat print          | EMS Readability     | Source Sans Pro-Light | Paul D. Hunt, Adobe              |

In `hwfonts.json` the glyph strokes are simplified and re-encoded. The same notice is embedded in the Studio (`packages/engine/src/data/handwriting-notice.txt`).

## Icons

File: `packages/engine/src/data/icons.json`.

| Icons                                                                                                                                                                                | Source                                                                                                                             | Licence    |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| 256-unit glyphs: phone, mobile, mail, globe, pin, calendar, teams, buildings and others, plus the line, bold, solid and duotone weights (`*-line`, `*-bold`, `*-solid`, `*-duotone`) | [Phosphor Icons](https://github.com/phosphor-icons/core)                                                                           | MIT        |
| `oct*` glyphs                                                                                                                                                                        | [GitHub Octicons](https://github.com/primer/octicons)                                                                              | MIT        |
| `github` mark                                                                                                                                                                        | [Simple Icons](https://github.com/simple-icons/simple-icons)                                                                       | CC0 1.0    |
| 24-unit glyphs `clock`, `translate`, `youtube`, `learn` and `blog`                                                                                                                   | Simplified shapes; `blog` and `learn` follow [Material Icons](https://github.com/google/material-design-icons) `edit` and `school` | Apache 2.0 |
| `linkedin` (448 × 512) and `x` (512 × 512) brand marks                                                                                                                               | [Font Awesome Free](https://fontawesome.com/license/free), brands                                                                  | CC BY 4.0  |

Font Awesome Free icons are by Fonticons, Inc., licensed under CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/). The paths were not changed.

## Studio interface

The built Studio page bundles these libraries. Their licences ship with each package in `node_modules`.

| Library                                                                                                      | Use                                                            | Licence |
| ------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------- | ------- |
| [shadcn/ui](https://ui.shadcn.com)                                                                           | Component source, copied into `apps/studio/src/components/ui/` | MIT     |
| [Base UI](https://base-ui.com)                                                                               | Accessible component behaviour under the shadcn components     | MIT     |
| [Tailwind CSS](https://tailwindcss.com) and [tw-animate-css](https://github.com/Wombosvideo/tw-animate-css)  | Styling and animations                                         | MIT     |
| [Lucide](https://lucide.dev)                                                                                 | Interface icons                                                | ISC     |
| [Sonner](https://sonner.emilkowal.ski)                                                                       | Toasts                                                         | MIT     |
| [Manrope](https://github.com/sharanda/manrope) by the Manrope Project Authors, through Fontsource            | Studio body text, embedded in the page                         | OFL 1.1 |
| [Montserrat](https://github.com/JulietaUla/Montserrat) by the Montserrat Project Authors, through Fontsource | Studio headings, embedded in the page                          | OFL 1.1 |

The full Manrope and Montserrat font licences are also embedded in the offline page under **Style → Typography → App font licences**.

## Trademarks

LinkedIn, GitHub, X, YouTube, Microsoft, Microsoft Teams, Microsoft Learn, Azure and Copilot names and logos are trademarks of their owners. They are used only to link to a person's own profiles. This project is not affiliated with or endorsed by any of them.
