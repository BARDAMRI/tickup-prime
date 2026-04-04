import type {Interval} from '../../../types/Interval';

/** Last bar whose open time is ≤ `mouseTime` (sorted `t`); ties drawing snaps to the candle under the crosshair. */
function intervalAtOrBefore(intervals: Interval[], mouseTime: number): Interval | null {
    if (!intervals.length || !Number.isFinite(mouseTime)) return null;
    const first = intervals[0]!;
    const last = intervals[intervals.length - 1]!;
    if (mouseTime <= first.t) return first;
    if (mouseTime >= last.t) return last;

    let lo = 0;
    let hi = intervals.length - 1;
    let best = 0;
    while (lo <= hi) {
        const mid = (lo + hi) >>> 1;
        const t = intervals[mid]!.t;
        if (t <= mouseTime) {
            best = mid;
            lo = mid + 1;
        } else {
            hi = mid - 1;
        }
    }
    return intervals[best] ?? null;
}

/**
 * Prime-only magnetic snapping: use the OHLC of the bar anchored to crosshair time, then snap Y to the closest level.
 */
export function snapPriceToNearestOHLC(
    mouseTime: number,
    rawPrice: number,
    intervals: Interval[],
): number {
    if (!intervals.length || !Number.isFinite(rawPrice)) return rawPrice;

    const nearest = intervalAtOrBefore(intervals, mouseTime);
    if (!nearest) return rawPrice;

    const ohlc = [nearest.o, nearest.h, nearest.l, nearest.c];
    let snapped = rawPrice;
    let priceDist = Number.POSITIVE_INFINITY;
    for (const p of ohlc) {
        const d = Math.abs(p - rawPrice);
        if (d < priceDist) {
            priceDist = d;
            snapped = p;
        }
    }
    return snapped;
}
