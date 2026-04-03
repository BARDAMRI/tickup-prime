import type {Interval} from '../../../types/Interval';

/**
 * Prime-only magnetic snapping: anchor to nearest candle OHLC.
 */
export function snapPriceToNearestOHLC(
    mouseTime: number,
    rawPrice: number,
    intervals: Interval[],
): number {
    if (!intervals.length || !Number.isFinite(rawPrice)) return rawPrice;

    let nearest: Interval | null = null;
    let nearestDist = Number.POSITIVE_INFINITY;
    for (const candle of intervals) {
        const dist = Math.abs(candle.t - mouseTime);
        if (dist < nearestDist) {
            nearest = candle;
            nearestDist = dist;
        }
    }
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
