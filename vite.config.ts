import {defineConfig, type Plugin} from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import obfuscatorPlugin from 'vite-plugin-javascript-obfuscator';
import type {ObfuscatorOptions} from 'javascript-obfuscator';

const skipObfuscate =
    process.env.TICKUP_SKIP_OBFUSCATE === '1' ||
    process.env.TICKUP_SKIP_OBFUSCATE === 'true';

const tickUpObfuscatorOptions: ObfuscatorOptions = {
    compact: true,
    deadCodeInjection: true,
    deadCodeInjectionThreshold: 0.2,
    identifierNamesGenerator: 'hexadecimal',
    log: false,
    renameGlobals: true,
    splitStrings: true,
    splitStringsChunkLength: 4,
    stringArray: true,
    stringArrayEncoding: ['base64'],
    stringArrayRotate: true,
    stringArrayShuffle: true,
    stringArrayThreshold: 1,
};

const libEntry = process.env.TICKUP_LIB_ENTRY;

export default defineConfig(({command}) => {
    const plugins: Plugin[] = [react()];
    if (command === 'build' && !skipObfuscate) {
        plugins.push(
            obfuscatorPlugin({
                apply: 'build',
                include: [/src\/.*\.(t|j)sx?$/],
                // Keep vendor/peer code readable for interoperability; obfuscate internal modules only.
                exclude: [/node_modules/, /\.nuxt/, /example\//],
                options: tickUpObfuscatorOptions,
            }) as unknown as Plugin,
        );
    }
    const resolve = {extensions: ['.tsx', '.ts', '.js'] as const};

    if (command === 'build') {
        if (libEntry !== 'index' && libEntry !== 'full') {
            throw new Error(
                'Set TICKUP_LIB_ENTRY=index or TICKUP_LIB_ENTRY=full when running vite build (use npm run build).',
            );
        }
        const entryPath =
            libEntry === 'full'
                ? path.resolve(__dirname, 'src/full.ts')
                : path.resolve(__dirname, 'src/index.ts');
        const fileBase = libEntry === 'full' ? 'tickup-full' : 'tickup';
        return {
            plugins,
            resolve,
            build: {
                /** First entry (`index`) clears `dist/`; `full` appends so both bundles ship on npm. */
                emptyOutDir: libEntry !== 'full',
                sourcemap: skipObfuscate,
                cssCodeSplit: false,
                assetsInlineLimit: 0,
                lib: {
                    entry: entryPath,
                    name: 'TickUp',
                    fileName: (format) => `${fileBase}.${format}.js`,
                    formats: ['es', 'cjs'],
                },
                rollupOptions: {
                    external: ['react', 'react-dom', 'react/jsx-runtime', 'styled-components', 'tickup'],
                    output: {
                        inlineDynamicImports: true,
                        globals: {
                            react: 'React',
                            'react-dom': 'ReactDOM',
                            'react/jsx-runtime': 'jsxRuntime',
                            'styled-components': 'styled',
                            tickup: 'TickUp',
                        },
                    },
                },
            },
        };
    }

    return {
        plugins,
        resolve,
    };
});
