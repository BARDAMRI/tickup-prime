import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
import {resolve} from 'node:path';

const primeRepoRoot = resolve(__dirname, '..');
/** Sibling checkout: …/tickup-prime-final and …/tickup-core-final */
const coreRepoRoot = resolve(primeRepoRoot, '..', 'tickup-core-final');

export default defineConfig({
  plugins: [react()],
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
    alias: {
      '@local-core/full': resolve(coreRepoRoot, 'src/full.ts'),
      '@local-prime/full': resolve(primeRepoRoot, 'src/full.ts'),
    },
  },
  server: {
    fs: {
      allow: [primeRepoRoot, coreRepoRoot],
    },
  },
  build: {
    /** styled-components + esbuild minify can emit invalid `function(A2)` in bundled CSS-in-JS. */
    minify: false,
    target: 'esnext',
  },
});
