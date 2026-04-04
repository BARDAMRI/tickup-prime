import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

const repoRoot = path.resolve(__dirname, '..');
const tickupCoreFinalRoot = path.resolve(__dirname, '../../tickup-core-final');

/** Prebuilt library entry points (run `npm run build` at repo root). Resolves when `node_modules/tickup` is missing or broken. */
const tickupFullEntry = path.join(repoRoot, 'dist/tickup-full.es.js');
const tickupEntry = path.join(repoRoot, 'dist/tickup.es.js');

export default defineConfig({
    publicDir: path.resolve(repoRoot, 'public'),
    plugins: [react()],
    resolve: {
        extensions: ['.tsx', '.ts', '.js'],
        // Simulate customer usage by consuming the built dist bundle.
        alias: [
            {find: '@tickup-core-src/full', replacement: path.join(tickupCoreFinalRoot, 'src/full.ts')},
            {find: '@tickup-prime-src/full', replacement: path.join(repoRoot, 'src/full.ts')},
            {find: 'tickup/full', replacement: tickupFullEntry},
            {find: 'tickup', replacement: tickupEntry},
            {find: '@brand', replacement: path.join(repoRoot, 'src/assets/brand')},
        ],
    },
    server: {
        fs: {
            allow: [repoRoot, tickupCoreFinalRoot],
        },
    },
    /** Default entry: project `index.html` → `/src/main.tsx` (do not override `rollupOptions.input`). */
});