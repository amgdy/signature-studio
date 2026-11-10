---
agent: 'agent'
description: 'Verify and record a release'
---

# Release

1. Run `pnpm check`, `pnpm build`, `pnpm test:e2e` and `pnpm test:audit`. All must pass.
2. Bump `version` in the root `package.json`, `packages/engine/package.json` and `apps/studio/package.json`, following semver: new features are minor, fixes are patch.
3. Make sure `docs/FEATURES.md`, `docs/DEVELOPMENT.md`, `README.md` and the counts in `AGENTS.md` match the code.
4. Merge to `main`. The Pages workflow publishes the Studio. Tag the release (`git tag v<version>`) and create a GitHub release whose notes say what changed and why.
5. If the signature output changed, tell users to copy their signature (and reply version) into Outlook again.
