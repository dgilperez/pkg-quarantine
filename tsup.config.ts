import { defineConfig } from 'tsup';

export default defineConfig([
  {
    entry: ['src/index.ts'],
    format: ['esm'],
    dts: true,
    clean: true,
    splitting: false,
    sourcemap: true,
    banner: {
      js: '#!/usr/bin/env node',
    },
  },
  {
    entry: ['src/index.ts'],
    format: ['cjs'],
    splitting: false,
    sourcemap: true,
  },
]);
