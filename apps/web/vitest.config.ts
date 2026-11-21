// SPDX-License-Identifier: MIT
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: { alias: { '@core': fileURLToPath(new URL('../../packages/einvoice/src', import.meta.url)) } },
  test: { include: ['src/**/*.test.ts'], environment: 'node' },
});
