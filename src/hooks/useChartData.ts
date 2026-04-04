import {useEffect, useMemo, useRef, useState} from 'react';
import {IndexRangePair, PriceRange, TimeRange} from "../types/Graph";
import {Interval} from "../types/Interval";
import {ChartRenderContext} from "../types/chartOptions";
import {TickUpRenderEngine} from "../types/chartOptions";
import {getBarIntervalSeconds} from "../components/Canvas/utils/helpers";

type VisibleRangeInput = TimeRange & Partial<{startIndex: number; endIndex: number}>;
/** Core tier: hard cap on candles kept in the render pipeline. */
export const MAX_CORE_CANDLES = 5000;
/** Core tier: max rate at which full chart data is committed to canvas context (≈1 Hz). */
export const CORE_RENDER_THROTTLE_MS = 1000;

/**
 * Feeds {@link ChartRenderContext} for {@link ChartCanvas}.
 *
 * **Prime commercial unlock** (`primePerformanceUnlocked === true`, i.e. licensed Prime + WebGL2):
 * - No candle truncation — full `intervalsArray` is rendered (100k+ bars supported by the WebGL path).
 * - No Core throttle — every prop update commits immediately (60fps with host-driven data).
 *
 * **Core / evaluation Prime** (`TickUpRenderEngine.standard` or locked Prime): last {@link MAX_CORE_CANDLES}
 * bars and {@link CORE_RENDER_THROTTLE_MS} batching apply.
 */
export function useChartData(
    intervalsArray: Interval[],
    visibleRange: VisibleRangeInput,
    currentPoint: { x: number; y: number } | null,
    canvasWidth: number,
    canvasHeight: number,
    engine?: TickUpRenderEngine,
    primePerformanceUnlocked?: boolean,
): { renderContext: ChartRenderContext | null; intervalSeconds: number } {
    const isCoreMode = engine !== TickUpRenderEngine.prime || !primePerformanceUnlocked;
    const cappedIntervals = useMemo(() => {
        if (!isCoreMode) return intervalsArray;
        if (intervalsArray.length <= MAX_CORE_CANDLES) return intervalsArray;
        return intervalsArray.slice(-MAX_CORE_CANDLES);
    }, [intervalsArray, isCoreMode]);

    const [renderIntervals, setRenderIntervals] = useState<Interval[]>(cappedIntervals);
    const latestIntervalsRef = useRef<Interval[]>(cappedIntervals);
    const lastCoreCommitRef = useRef<number>(0);
    const coreTimerRef = useRef<number | null>(null);

    useEffect(() => {
        latestIntervalsRef.current = cappedIntervals;
        if (!isCoreMode) {
            if (coreTimerRef.current != null) {
                window.clearTimeout(coreTimerRef.current);
                coreTimerRef.current = null;
            }
            setRenderIntervals(cappedIntervals);
            return;
        }
        const now = Date.now();
        const elapsed = now - lastCoreCommitRef.current;
        if (elapsed >= CORE_RENDER_THROTTLE_MS) {
            lastCoreCommitRef.current = now;
            setRenderIntervals(cappedIntervals);
            return;
        }
        if (coreTimerRef.current != null) {
            window.clearTimeout(coreTimerRef.current);
        }
        coreTimerRef.current = window.setTimeout(() => {
            lastCoreCommitRef.current = Date.now();
            setRenderIntervals(latestIntervalsRef.current);
            coreTimerRef.current = null;
        }, CORE_RENDER_THROTTLE_MS - elapsed);
    }, [cappedIntervals, isCoreMode]);

    useEffect(() => () => {
        if (coreTimerRef.current != null) {
            window.clearTimeout(coreTimerRef.current);
        }
    }, []);

    const intervalSeconds = useMemo(
        () => getBarIntervalSeconds(renderIntervals, 3600),
        [renderIntervals]
    );

    const visibleCandles = useMemo<IndexRangePair>(() => {
        const n = renderIntervals.length;
        if (!n || intervalSeconds <= 0 || visibleRange == null) {
            return {startIndex: 0, endIndex: 0};
        }
        const {start, end} = visibleRange;
        if (start == null || end == null) {
            return {startIndex: 0, endIndex: 0};
        }
        const si = visibleRange.startIndex;
        const ei = visibleRange.endIndex;
        if (
            typeof si === 'number' &&
            typeof ei === 'number' &&
            si >= 0 &&
            ei >= 0 &&
            si <= ei &&
            si < n &&
            ei < n
        ) {
            return {startIndex: si, endIndex: ei};
        }
        const firstTime = renderIntervals[0]!.t;
        const startIndex = Math.floor((start - firstTime) / intervalSeconds);
        const endIndex = Math.ceil((end - firstTime) / intervalSeconds);
        return {
            startIndex: Math.max(0, startIndex),
            endIndex: Math.min(n - 1, endIndex),
        };
    }, [
        renderIntervals,
        intervalSeconds,
        visibleRange.start,
        visibleRange.end,
        visibleRange.startIndex,
        visibleRange.endIndex,
    ]);

    const visiblePriceRange: PriceRange = (() => {
        const { startIndex, endIndex } = visibleCandles;
        if (startIndex >= endIndex || !renderIntervals.length) {
            return { min: 0, max: 100, range: 100 };
        }
        let min = Infinity;
        let max = -Infinity;
        for (let i = startIndex; i <= endIndex; i++) {
            const c = renderIntervals[i];
            if (!c) continue;
            if (c.l < min) min = c.l;
            if (c.h > max) max = c.h;
        }
        if (!Number.isFinite(min) || !Number.isFinite(max)) {
            return { min: 0, max: 100, range: 100 };
        }
        const paddingBase = Math.max(0, max - min);
        const padding = paddingBase * 0.1;
        const finalMin = min - padding;
        const finalMax = max + padding;
        return { min: finalMin, max: finalMax, range: finalMax - finalMin };
    })();

    const renderContext = useMemo<ChartRenderContext | null>(() => {
        if (canvasWidth === 0 || canvasHeight === 0) {
            return null;
        }
        return {
            allIntervals: renderIntervals,
            visibleStartIndex: visibleCandles.startIndex,
            visibleEndIndex: visibleCandles.endIndex,
            visiblePriceRange,
            visibleRange,
            intervalSeconds,
            canvasWidth,
            canvasHeight,
        };
    }, [
        renderIntervals,
        visibleCandles.startIndex,
        visibleCandles.endIndex,
        visiblePriceRange.min,
        visiblePriceRange.max,
        visiblePriceRange.range,
        visibleRange.start,
        visibleRange.end,
        visibleRange.startIndex,
        visibleRange.endIndex,
        intervalSeconds,
        canvasWidth,
        canvasHeight,
    ]);

    return {renderContext, intervalSeconds};
}