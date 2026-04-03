import type {Interval} from '../../../types/Interval';

/**
 * Prime VWAP (daily reset, UTC session boundaries).
 */
export function computePrimeVWAP(intervals: Interval[]): (number | null)[] {
    const out: (number | null)[] = Array(intervals.length).fill(null);
    let cumPV = 0;
    let cumV = 0;
    let currentDayKey = '';

    for (let i = 0; i < intervals.length; i++) {
        const it: any = intervals[i];
        const t = Number(it?.t);
        if (Number.isFinite(t)) {
            const d = new Date(t * 1000);
            const dayKey = `${d.getUTCFullYear()}-${d.getUTCMonth()}-${d.getUTCDate()}`;
            if (dayKey !== currentDayKey) {
                currentDayKey = dayKey;
                cumPV = 0;
                cumV = 0;
            }
        }

        const v = it?.v;
        if (v == null || !Number.isFinite(Number(v))) {
            out[i] = null;
            continue;
        }
        const typical = (it.h + it.l + it.c) / 3;
        cumPV += typical * v;
        cumV += v;
        out[i] = cumV === 0 ? null : (cumPV / cumV);
    }

    return out;
}
