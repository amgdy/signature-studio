import { describe, expect, test } from 'vitest';
import pkg from './package.json' with { type: 'json' };
import { buildInfo } from './vite.config.ts';

const now = new Date('2026-01-02T03:04:05.000Z');
const github = {
  GITHUB_ACTIONS: 'true',
  GITHUB_SERVER_URL: 'https://github.com',
  GITHUB_REPOSITORY: 'sample/signature-studio',
  GITHUB_RUN_ID: '123456789',
  GITHUB_RUN_NUMBER: '42',
};

describe('build metadata', () => {
  test('local builds have the package version and build time, but no invented run', () => {
    expect(buildInfo({}, now)).toEqual({ version: pkg.version, builtAt: now.toISOString(), run: null });
  });

  test('CI and manual Pages builds link the run ID, not the display number', () => {
    expect(buildInfo(github, now)).toEqual({
      version: pkg.version,
      builtAt: now.toISOString(),
      run: { number: '42', url: 'https://github.com/sample/signature-studio/actions/runs/123456789' },
    });
  });

  test('automatic Pages builds keep the triggering CI run, not the deployment run', () => {
    expect(buildInfo({ ...github, STUDIO_BUILD_RUN_ID: '987654321', STUDIO_BUILD_RUN_NUMBER: '17' }, now).run).toEqual({
      number: '17',
      url: 'https://github.com/sample/signature-studio/actions/runs/987654321',
    });
  });

  test('forks and other GitHub hosts use their own run URL', () => {
    expect(
      buildInfo({ ...github, GITHUB_SERVER_URL: 'https://github.example.com', GITHUB_REPOSITORY: 'example/fork' }, now)
        .run?.url,
    ).toBe('https://github.example.com/example/fork/actions/runs/123456789');
  });

  test.each([
    { GITHUB_ACTIONS: 'true' },
    { ...github, GITHUB_RUN_ID: '' },
    { ...github, GITHUB_RUN_NUMBER: 'not-a-number' },
    { ...github, GITHUB_SERVER_URL: '' },
    { ...github, GITHUB_REPOSITORY: '' },
    { ...github, STUDIO_BUILD_RUN_ID: '987654321' },
    { ...github, STUDIO_BUILD_RUN_NUMBER: '17' },
    { ...github, STUDIO_BUILD_RUN_ID: '', STUDIO_BUILD_RUN_NUMBER: '' },
  ])('incomplete run metadata fails the build instead of linking a different run (%j)', (env) => {
    expect(() => buildInfo(env, now)).toThrow('Build metadata needs a valid GitHub run');
  });
});
