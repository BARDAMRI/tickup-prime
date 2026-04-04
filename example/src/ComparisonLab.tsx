import {useEffect, useMemo, useRef, useState} from 'react';
/**
 * Left: sibling Core checkout — same physical path as `example/package.json` → `"tickup": "file:../../tickup-core-final"`
 * (`../../tickup-core-final/src` from `example/`; from `example/src/` use `../../../tickup-core-final/src/full`).
 */
import {
    AxesPosition as CoreAxesPosition,
    ChartTheme as CoreChartTheme,
    ChartType as CoreChartType,
    OverlayKind as CoreOverlayKind,
    TickUpHost as CoreTickUpHost,
    TickUpRenderEngine as CoreEngine,
    TimeDetailLevel as CoreTimeDetailLevel,
} from '@tickup-core-src/full';
/** Right: Prime engine from this repository (`src/full.ts`), not the `tickup/full` dist alias. */
import {
    AxesPosition as PrimeAxesPosition,
    ChartTheme as PrimeChartTheme,
    ChartType as PrimeChartType,
    OverlayKind as PrimeOverlayKind,
    TickUpHost as PrimeTickUpHost,
    TickUpRenderEngine as PrimeEngine,
    TimeDetailLevel as PrimeTimeDetailLevel,
} from '@tickup-prime-src/full';

type CoreIndicatorKey = 'ema' | 'sma' | 'wma' | 'bbands';

type IntervalBar = {
    t: number;
    o: number;
    h: number;
    l: number;
    c: number;
    v?: number;
};

type StreamEvent = {
    append: boolean;
    closeDelta: number;
    wickUp: number;
    wickDown: number;
    volDelta: number;
};

function formatHmsMs(d: Date): string {
    const p2 = (n: number) => String(n).padStart(2, '0');
    const p3 = (n: number) => String(n).padStart(3, '0');
    return `${p2(d.getHours())}:${p2(d.getMinutes())}:${p2(d.getSeconds())}.${p3(d.getMilliseconds())}`;
}

function PrimeTelemetryStrip({streamTotal}: {streamTotal: number}) {
    const [lastPaint, setLastPaint] = useState(() => formatHmsMs(new Date()));
    const [fps, setFps] = useState(0);
    const [pulse, setPulse] = useState(0);

    useEffect(() => {
        let raf = 0;
        let frames = 0;
        let fpsT0 = performance.now();
        const loop = (now: number) => {
            frames += 1;
            const dt = now - fpsT0;
            if (dt >= 1000) {
                setFps(Math.round((frames * 1000) / dt));
                frames = 0;
                fpsT0 = now;
            }
            setLastPaint(formatHmsMs(new Date()));
            setPulse((p) => (p + 1) % 256);
            raf = requestAnimationFrame(loop);
        };
        raf = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(raf);
    }, []);

    const st = streamTotal.toLocaleString();
    return (
        <div className="flex flex-col gap-1.5 border-b border-[#3EC5FF]/25 bg-[#0c121e]/95 px-3 py-2 text-[11px]">
            <div className="flex flex-wrap items-center gap-2">
                <span className="font-bold uppercase tracking-wider text-slate-100">Prime</span>
                <span
                    className="inline-block h-2.5 w-2.5 shrink-0 rounded-full bg-[#3EC5FF]"
                    style={{
                        opacity: pulse % 2 === 0 ? 1 : 0.35,
                        boxShadow: pulse % 2 === 0 ? '0 0 10px #3EC5FF' : 'none',
                    }}
                    title="High-rate pulse"
                />
                <span className="rounded-full bg-[#3EC5FF]/15 px-2 py-0.5 font-mono text-[10px] font-semibold text-[#3EC5FF]">
                    ~{fps} FPS
                </span>
                <span className="ml-auto font-mono text-slate-400">
                    Last render <span className="text-[#7ddbff]">{lastPaint}</span>
                </span>
            </div>
            <div className="font-mono text-[10px] text-[#7dd3fc]">
                Prime: {st} / {st}{' '}
                <span className="text-emerald-400/90">(Unlimited)</span>
            </div>
        </div>
    );
}

function CoreTelemetryStrip({
    coreTick,
    streamTotal,
    coreCap,
}: {
    coreTick: number;
    streamTotal: number;
    coreCap: number;
}) {
    const [lit, setLit] = useState(true);
    const [lastRender, setLastRender] = useState(() => formatHmsMs(new Date()));

    useEffect(() => {
        setLastRender(formatHmsMs(new Date()));
        setLit((v) => !v);
    }, [coreTick]);

    const effective = Math.min(streamTotal, coreCap);
    const st = streamTotal.toLocaleString();
    const eff = effective.toLocaleString();
    const capped = streamTotal > coreCap;

    return (
        <div className="flex flex-col gap-1.5 border-b border-white/10 bg-black/50 px-3 py-2 text-[11px]">
            <div className="flex flex-wrap items-center gap-2">
                <span className="font-bold uppercase tracking-wider text-slate-200">Core</span>
                <span
                    className="inline-block h-2.5 w-2.5 shrink-0 rounded-full bg-emerald-500 transition-opacity duration-75"
                    style={{opacity: lit ? 1 : 0.25}}
                    title="1 Hz heartbeat"
                />
                <span className="text-slate-500">1 Hz data</span>
                <span className="ml-auto font-mono text-slate-400">
                    Last render <span className="text-emerald-300">{lastRender}</span>
                </span>
            </div>
            <div className="font-mono text-[10px] text-slate-400">
                Core: {eff} / {st}{' '}
                {capped ? <span className="text-amber-400/95">(Capped)</span> : <span className="text-slate-500">(no cap)</span>}
            </div>
        </div>
    );
}

function makeInitialBars(count: number, intervalSec: number): IntervalBar[] {
    const out: IntervalBar[] = [];
    let t = 1_700_000_000 - count * intervalSec;
    let price = 118.7;
    for (let i = 0; i < count; i++) {
        const drift = Math.sin(i / 180) * 0.05 + 0.02;
        const noise = (Math.random() - 0.5) * 0.55;
        const o = price;
        const c = o + drift + noise;
        const h = Math.max(o, c) + Math.random() * 0.35;
        const l = Math.min(o, c) - Math.random() * 0.35;
        out.push({
            t,
            o: +o.toFixed(2),
            h: +h.toFixed(2),
            l: +l.toFixed(2),
            c: +c.toFixed(2),
            v: Math.max(1, Math.round(700 + Math.random() * 1200)),
        });
        t += intervalSec;
        price = c;
    }
    return out;
}

function nextBar(last: IntervalBar, intervalSec: number, event: StreamEvent): IntervalBar {
    const o = last.c;
    const c = o + event.closeDelta;
    const h = Math.max(o, c) + event.wickUp;
    const l = Math.min(o, c) - event.wickDown;
    return {
        t: last.t + intervalSec,
        o: +o.toFixed(2),
        h: +h.toFixed(2),
        l: +l.toFixed(2),
        c: +c.toFixed(2),
        v: Math.max(1, Math.round((last.v ?? 1000) + event.volDelta)),
    };
}

function jitterBar(last: IntervalBar, event: StreamEvent): IntervalBar {
    const c = +(last.c + event.closeDelta).toFixed(2);
    return {
        ...last,
        c,
        h: +Math.max(last.h, c, last.o).toFixed(2),
        l: +Math.min(last.l, c, last.o).toFixed(2),
        v: Math.max(1, Math.round((last.v ?? 1000) + event.volDelta)),
    };
}

function applyStreamEvent(prev: IntervalBar[], event: StreamEvent, intervalSec: number): IntervalBar[] {
    if (!prev.length) return prev;
    const last = prev[prev.length - 1];
    if (event.append) {
        return [...prev, nextBar(last, intervalSec, event)];
    }
    const next = [...prev];
    next[next.length - 1] = jitterBar(last, event);
    return next;
}

function randomStreamEvent(): StreamEvent {
    return {
        append: Math.random() > 0.92,
        closeDelta: (Math.random() - 0.5) * 0.45 + 0.02,
        wickUp: Math.random() * 0.35,
        wickDown: Math.random() * 0.35,
        volDelta: (Math.random() - 0.5) * 80,
    };
}

function capTail<T>(arr: T[], max: number): T[] {
    if (arr.length <= max) return arr;
    return arr.slice(arr.length - max);
}

/** Stress test: full stream length (Prime renders all; Core engine keeps last CORE_RENDER_CAP in the render path). */
const INITIAL_BARS = 10_000;
/** Must match `MAX_CORE_CANDLES` in `src/hooks/useChartData.ts` (sync `tickup-core-final` for the left pane). */
const CORE_RENDER_CAP = 5_000;
const MAX_PRIME_BARS = 50_000;
const CORE_THROTTLE_MS = 1_000;
const PRIME_TICK_MS = 1000 / 60;

export default function ComparisonLab() {
    const intervalSec = 60;
    const intervalSecRef = useRef(intervalSec);
    intervalSecRef.current = intervalSec;

    const [primeBars, setPrimeBars] = useState<IntervalBar[]>(() => makeInitialBars(INITIAL_BARS, intervalSec));
    const primeBarsRef = useRef(primeBars);
    primeBarsRef.current = primeBars;

    const [coreBars, setCoreBars] = useState<IntervalBar[]>(() => makeInitialBars(INITIAL_BARS, intervalSec));
    const [coreTick, setCoreTick] = useState(0);

    const [toast, setToast] = useState<string | null>(null);
    const [coreIndicators, setCoreIndicators] = useState<Record<CoreIndicatorKey, boolean>>({
        ema: true,
        sma: true,
        wma: true,
        bbands: false,
    });

    useEffect(() => {
        const id = window.setInterval(() => {
            const sec = intervalSecRef.current;
            setPrimeBars((prev) => capTail(applyStreamEvent(prev, randomStreamEvent(), sec), MAX_PRIME_BARS));
        }, PRIME_TICK_MS);
        return () => window.clearInterval(id);
    }, []);

    useEffect(() => {
        const id = window.setInterval(() => {
            const snap = primeBarsRef.current;
            setCoreBars(snap.length ? snap.map((b) => ({...b})) : snap);
            setCoreTick((t) => t + 1);
        }, CORE_THROTTLE_MS);
        return () => window.clearInterval(id);
    }, []);

    useEffect(() => {
        if (!toast) return;
        const tid = window.setTimeout(() => setToast(null), 2600);
        return () => window.clearTimeout(tid);
    }, [toast]);

    const incomingBarCount = primeBars.length;
    const showCoreCapBadge = incomingBarCount > CORE_RENDER_CAP;

    const coreOverlayKinds = useMemo(() => {
        const kinds: any[] = [];
        if (coreIndicators.ema) kinds.push({kind: CoreOverlayKind.ema, period: 21});
        if (coreIndicators.sma) kinds.push({kind: CoreOverlayKind.sma, period: 50});
        if (coreIndicators.wma) kinds.push({kind: CoreOverlayKind.wma, period: 20});
        if (coreIndicators.bbands) kinds.push({kind: CoreOverlayKind.bbands_mid, period: 20});
        return kinds;
    }, [coreIndicators]);

    const tryToggleCoreIndicator = (k: CoreIndicatorKey) => {
        setCoreIndicators((prev) => {
            if (prev[k]) {
                return {...prev, [k]: false};
            }
            const active = Object.values(prev).filter(Boolean).length;
            if (active >= 3) {
                setToast('Core tier is limited to 3 indicators. Prime unlocks unlimited overlays.');
                return prev;
            }
            return {...prev, [k]: true};
        });
    };

    const baseStyle = {
        showOverlayLine: true,
        showHistogram: false,
        showCrosshair: true,
        showCrosshairValues: true,
    };

    const coreChartOptions = useMemo(
        () => ({
            base: {
                ...baseStyle,
                engine: CoreEngine.standard,
                theme: CoreChartTheme.dark,
                chartType: CoreChartType.Candlestick,
                overlayKinds: coreOverlayKinds,
            },
            axes: {yAxisPosition: CoreAxesPosition.right, numberOfYTicks: 8},
        }),
        [coreOverlayKinds]
    );

    const primeChartOptions = useMemo(
        () => ({
            base: {
                ...baseStyle,
                engine: PrimeEngine.prime,
                theme: PrimeChartTheme.dark,
                chartType: PrimeChartType.Candlestick,
                overlayKinds: [
                    {kind: PrimeOverlayKind.ema, period: 21},
                    {kind: PrimeOverlayKind.sma, period: 50},
                    {kind: PrimeOverlayKind.wma, period: 20},
                    {kind: PrimeOverlayKind.bbands_mid, period: 20},
                    {kind: PrimeOverlayKind.vwap},
                ],
            },
            axes: {yAxisPosition: PrimeAxesPosition.right, numberOfYTicks: 8},
        }),
        []
    );

    const coreInitialRange = useMemo(() => {
        if (!coreBars.length) return {start: 0, end: 1};
        const last = coreBars[coreBars.length - 1].t + intervalSec;
        return {start: last - 6 * 3600, end: last};
    }, [coreBars, intervalSec]);

    const primeInitialRange = useMemo(() => {
        if (!primeBars.length) return {start: 0, end: 1};
        const last = primeBars[primeBars.length - 1].t + intervalSec;
        return {start: last - 6 * 3600, end: last};
    }, [primeBars, intervalSec]);

    return (
        <div className="min-h-screen bg-[#050608] pb-12 text-slate-200">
            <div className="mx-auto max-w-[1700px] space-y-4 p-4 lg:p-8">
                <header className="rounded-2xl border border-white/10 bg-[#0f121c]/90 p-5">
                    <h1 className="text-xl font-extrabold text-white">Core vs Prime — local telemetry</h1>
                    <p className="mt-2 text-sm text-slate-400">
                        Left: <code className="rounded bg-black/40 px-1 text-[#3EC5FF]">@tickup-core-src/full</code> →{' '}
                        <code className="rounded bg-black/40 px-1">../../tickup-core-final/src</code> from{' '}
                        <code className="rounded bg-black/40 px-1">example/</code>. Right:{' '}
                        <code className="rounded bg-black/40 px-1 text-[#3EC5FF]">@tickup-prime-src/full</code> (this repo). Prime
                        uses <code className="rounded bg-black/40 px-1">licenseValidationOverride</code> for a clean commercial
                        unlock in the demo.
                    </p>
                    <p className="mt-2 text-xs text-slate-500">
                        Core feed: 1 Hz snapshot · Prime feed: ~60 Hz · Initial pump: {INITIAL_BARS.toLocaleString()} candles · Core
                        render cap: {CORE_RENDER_CAP.toLocaleString()} (see red banner + telemetry).
                    </p>
                    <div className="mt-3 flex flex-wrap gap-3 rounded-lg border border-white/10 bg-black/30 px-3 py-2 font-mono text-[10px] text-slate-300">
                        <span>
                            <span className="text-slate-500">Diagnostics — </span>
                            Core: {Math.min(incomingBarCount, CORE_RENDER_CAP).toLocaleString()} /{' '}
                            {incomingBarCount.toLocaleString()}{' '}
                            {incomingBarCount > CORE_RENDER_CAP ? (
                                <span className="text-amber-400">(Capped)</span>
                            ) : (
                                <span className="text-slate-500">(no cap)</span>
                            )}
                        </span>
                        <span className="text-slate-600">|</span>
                        <span>
                            Prime: {incomingBarCount.toLocaleString()} / {incomingBarCount.toLocaleString()}{' '}
                            <span className="text-emerald-400/90">(Unlimited)</span>
                        </span>
                    </div>
                </header>

                <div className="flex flex-wrap gap-2">
                    <button
                        type="button"
                        className="rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-semibold"
                        onClick={() => tryToggleCoreIndicator('ema')}
                    >
                        Core EMA
                    </button>
                    <button
                        type="button"
                        className="rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-semibold"
                        onClick={() => tryToggleCoreIndicator('sma')}
                    >
                        Core SMA
                    </button>
                    <button
                        type="button"
                        className="rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-semibold"
                        onClick={() => tryToggleCoreIndicator('wma')}
                    >
                        Core WMA
                    </button>
                    <button
                        type="button"
                        className="rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-semibold"
                        onClick={() => tryToggleCoreIndicator('bbands')}
                    >
                        Core BBands
                    </button>
                </div>

                <div className="grid min-h-[560px] gap-4 lg:grid-cols-2 lg:gap-6">
                    <section className="flex min-h-[520px] flex-col overflow-hidden rounded-2xl border border-white/10 bg-black/40">
                        <CoreTelemetryStrip
                            coreTick={coreTick}
                            streamTotal={incomingBarCount}
                            coreCap={CORE_RENDER_CAP}
                        />
                        {showCoreCapBadge ? (
                            <div className="border-b border-red-500/30 bg-red-950/45 px-3 py-2 text-[11px]">
                                <span className="font-bold uppercase text-red-400">Data Capped at 5,000 bars</span>
                                <span className="ml-2 text-red-200/80">
                                    Stream: {incomingBarCount.toLocaleString()} bars — engine renders latest{' '}
                                    {CORE_RENDER_CAP.toLocaleString()}
                                </span>
                            </div>
                        ) : null}
                        <div className="min-h-0 flex-1">
                            <CoreTickUpHost
                                intervalsArray={coreBars as never}
                                chartOptions={coreChartOptions as never}
                                themeVariant={CoreChartTheme.dark}
                                showSidebar
                                showTopBar
                                showSettingsBar
                                initialTimeDetailLevel={CoreTimeDetailLevel.Medium}
                                initialVisibleTimeRange={coreInitialRange}
                            />
                        </div>
                    </section>

                    <section className="flex min-h-[520px] flex-col overflow-hidden rounded-2xl border border-[#3EC5FF]/25 bg-[#0c121e]/90 shadow-[0_0_40px_-12px_rgba(62,197,255,0.3)]">
                        <PrimeTelemetryStrip streamTotal={incomingBarCount} />
                        <div className="min-h-0 flex-1">
                            <PrimeTickUpHost
                                intervalsArray={primeBars as never}
                                chartOptions={primeChartOptions as never}
                                themeVariant={PrimeChartTheme.dark}
                                showSidebar
                                showTopBar
                                showSettingsBar
                                licenseValidationOverride
                                licenseUserIdentifier="comparison@example.dev"
                                licenseKey="TICKUP-PRO-2026-BETA"
                                initialTimeDetailLevel={PrimeTimeDetailLevel.Medium}
                                initialVisibleTimeRange={primeInitialRange}
                            />
                        </div>
                    </section>
                </div>
            </div>

            {toast ? (
                <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-xl border border-red-400/40 bg-red-950/90 px-4 py-2 text-sm text-red-100">
                    {toast}
                </div>
            ) : null}
        </div>
    );
}
