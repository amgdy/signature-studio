import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';
import pkg from './package.json' with { type: 'json' };

export function buildInfo(env: Record<string, string | undefined>, now = new Date()) {
  const info = { version: pkg.version, builtAt: now.toISOString() };
  // Pages is a separate workflow; keep the run number and link from the CI run that triggered it.
  const sourceRun = env['STUDIO_BUILD_RUN_ID'] !== undefined || env['STUDIO_BUILD_RUN_NUMBER'] !== undefined;
  const id = sourceRun ? env['STUDIO_BUILD_RUN_ID'] : env['GITHUB_RUN_ID'];
  const number = sourceRun ? env['STUDIO_BUILD_RUN_NUMBER'] : env['GITHUB_RUN_NUMBER'];
  if (!sourceRun && !id && !number && env['GITHUB_ACTIONS'] !== 'true') return { ...info, run: null };
  const server = env['GITHUB_SERVER_URL'];
  const repository = env['GITHUB_REPOSITORY'];
  if (!id || !number || !/^[1-9]\d*$/.test(id) || !/^[1-9]\d*$/.test(number) || !server || !repository) {
    throw new Error('Build metadata needs a valid GitHub run ID, run number, server URL and repository.');
  }
  return { ...info, run: { number, url: `${server}/${repository}/actions/runs/${id}` } };
}

// One self-contained HTML file: it opens from disk with no server and works offline.
export default defineConfig({
  base: './',
  define: { STUDIO_BUILD_INFO: JSON.stringify(buildInfo(process.env)) },
  plugins: [react(), tailwindcss(), viteSingleFile({ removeViteModuleLoader: true })],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  build: {
    target: 'es2023',
    assetsInlineLimit: Number.POSITIVE_INFINITY,
    chunkSizeWarningLimit: 4096,
    reportCompressedSize: false,
  },
  server: { port: 5173 },
  preview: { port: 4173 },
});
