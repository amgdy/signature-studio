# Contributing

Thanks for helping. [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) has setup, the code layout, the Outlook rules and the tests.

## Before you open a pull request

- Run `pnpm check`. Also run `pnpm test:e2e` when you change the Studio, and `pnpm test:audit` when you change layout, designs, icons, palettes, fonts or text sizes.
- Fix the design, not the test, unless the test's expectation is out of date.
- If you change the signature output on purpose, update the golden file with `pnpm --filter @signature-studio/engine test:golden -u` and review the diff.
- Follow the [Outlook rules](docs/DEVELOPMENT.md#outlook-rules) for any signature HTML.
- Update [docs/FEATURES.md](docs/FEATURES.md) for any change people can see.

## Code style

- TypeScript in strict mode. No `any`. Keep casts rare and explain them.
- Prettier formats everything and oxlint checks it.
- Plain, short sentences in docs and UI text, in sentence case. UI text says what happens ("Copy signature").
- Never put real personal details in code, tests, docs or screenshots. Use the sample person (Sam Taylor, Contoso).

## Pull requests

Keep each pull request to one change, and say what changed and why. For an Outlook fix, name the symptom, the cause and the fix.

By contributing, you agree that your work is licensed under the [MIT License](LICENSE).
