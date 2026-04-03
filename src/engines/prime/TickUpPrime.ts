import {
    ChartTheme,
    TickUpStandardEngine as CoreStandardEngine,
    type TickUpRenderEngine,
    type TickUpChartEngine,
} from 'tickup';
import {isWebGL2Supported} from './webgl2';

type EnginePatch = ReturnType<TickUpChartEngine['getChartOptionsPatch']>;
const PRIME_ENGINE_ID = 'prime' as unknown as TickUpRenderEngine;
const STANDARD_ENGINE_ID = 'standard' as unknown as TickUpChartEngine['id'];

/** Prime “Neon Future” palette */
export const TICKUP_PRIME_PRIMARY = '#3EC5FF';
export const TICKUP_PRIME_SECONDARY = '#5A48DE';
export const TICKUP_PRIME_TEXT = '#E7EBFF';

const PRIME_PATCH: EnginePatch = {
    base: {
        engine: PRIME_ENGINE_ID,
        theme: ChartTheme.dark,
        style: {
            backgroundColor: '#0b0e14',
            showGrid: true,
            grid: {
                lineColor: 'rgba(62, 197, 255, 0.14)',
                lineWidth: 1,
                gridSpacing: 48,
                lineDash: [],
                color: 'rgba(62, 197, 255, 0.14)',
            },
            axes: {
                textColor: TICKUP_PRIME_TEXT,
                lineColor: 'rgba(231, 235, 255, 0.22)',
                font: '12px system-ui, -apple-system, sans-serif',
            },
            candles: {
                bullColor: TICKUP_PRIME_PRIMARY,
                bearColor: TICKUP_PRIME_SECONDARY,
                upColor: TICKUP_PRIME_PRIMARY,
                downColor: TICKUP_PRIME_SECONDARY,
                borderColor: 'rgba(231, 235, 255, 0.35)',
                borderWidth: 1,
            },
            histogram: {
                bullColor: 'rgba(62, 197, 255, 0.55)',
                bearColor: 'rgba(90, 72, 222, 0.55)',
                opacity: 0.65,
            },
            bar: {
                bullColor: TICKUP_PRIME_PRIMARY,
                bearColor: TICKUP_PRIME_SECONDARY,
                opacity: 0.85,
            },
            line: {
                color: TICKUP_PRIME_PRIMARY,
                lineWidth: 2,
            },
            area: {
                fillColor: 'rgba(62, 197, 255, 0.18)',
                strokeColor: TICKUP_PRIME_PRIMARY,
                lineWidth: 2,
            },
        },
    },
};

/** Prime renderer on a **light** plot (toolbar + canvas follow `base.theme: ChartTheme.light`). */
const PRIME_PATCH_LIGHT: EnginePatch = {
    base: {
        engine: PRIME_ENGINE_ID,
        theme: ChartTheme.light,
        style: {
            backgroundColor: '#ffffff',
            showGrid: true,
            grid: {
                lineColor: 'rgba(62, 197, 255, 0.16)',
                lineWidth: 1,
                gridSpacing: 48,
                lineDash: [],
                color: 'rgba(62, 197, 255, 0.16)',
            },
            axes: {
                textColor: '#0f172a',
                lineColor: 'rgba(15, 23, 42, 0.14)',
                font: '12px system-ui, -apple-system, sans-serif',
            },
            candles: {
                bullColor: TICKUP_PRIME_PRIMARY,
                bearColor: TICKUP_PRIME_SECONDARY,
                upColor: TICKUP_PRIME_PRIMARY,
                downColor: TICKUP_PRIME_SECONDARY,
                borderColor: 'rgba(15, 23, 42, 0.22)',
                borderWidth: 1,
            },
            histogram: {
                bullColor: 'rgba(62, 197, 255, 0.5)',
                bearColor: 'rgba(90, 72, 222, 0.5)',
                opacity: 0.58,
                heightRatio: 0.24,
            },
            bar: {
                bullColor: TICKUP_PRIME_PRIMARY,
                bearColor: TICKUP_PRIME_SECONDARY,
                opacity: 0.85,
            },
            line: {
                color: '#0284c7',
                lineWidth: 2,
            },
            area: {
                fillColor: 'rgba(62, 197, 255, 0.14)',
                strokeColor: '#0284c7',
                lineWidth: 2,
            },
        },
    },
};

/** Chart options patch for Prime, matching host light / dark chrome. */
export function getTickUpPrimeThemePatch(theme: ChartTheme): EnginePatch {
    return theme === ChartTheme.light ? PRIME_PATCH_LIGHT : PRIME_PATCH;
}

/** Use with `ref.setEngine(...)` so Prime stays aligned when toggling shell theme. */
export function createTickUpPrimeEngine(theme: ChartTheme = ChartTheme.dark): TickUpChartEngine {
    if (typeof window !== 'undefined' && !isWebGL2Supported()) {
        throw new Error('TickUp Prime requires WebGL 2.0 support in the active browser/runtime.');
    }
    return {
        id: PRIME_ENGINE_ID,
        getChartOptionsPatch: () => getTickUpPrimeThemePatch(theme),
    };
}

function standardPatch(): EnginePatch {
    return CoreStandardEngine.getChartOptionsPatch();
}

/** Prime engine profile — dark plot; use {@link createTickUpPrimeEngine} when the host is light. */
export const TickUpPrime: TickUpChartEngine = {
    id: PRIME_ENGINE_ID,
    getChartOptionsPatch: () => PRIME_PATCH,
};

/** Default canvas look — reverses Prime styling to library defaults (light). */
export const TickUpStandardEngine: TickUpChartEngine = {
    id: STANDARD_ENGINE_ID,
    getChartOptionsPatch: () => standardPatch(),
};
